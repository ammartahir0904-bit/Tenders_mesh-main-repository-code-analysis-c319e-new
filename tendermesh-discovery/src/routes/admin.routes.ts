/**
 * Admin Routes
 *
 * Admin-level routes for delivery monitoring and management.
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import { A2ADispatchService } from '../services/a2a-dispatch.service.js';
import { TenderStore } from '../db/store.js';
import { configService } from '../config/config.service.js';
import { localDeliveries } from './tenders.routes.js';

const router = Router();
let pool: Pool | null = null;

export function setAdminPool(p: Pool) {
  pool = p;
}

function aggregateInMemoryDeliveries() {
  const all: any[] = [];
  for (const entries of localDeliveries.values()) {
    all.push(...entries);
  }
  all.sort((a, b) => new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime());
  return all;
}

/**
 * GET /api/admin/deliveries - Global delivery log with filters
 */
router.get('/deliveries', async (req, res) => {
  const dbLogger = logger.child('admin-deliveries');
  try {
    if (pool) {
      const dispatchService = new A2ADispatchService(pool);
      const { supplier_name, delivered, tender_id } = req.query as Record<string, string>;
      const deliveredFilter = delivered !== undefined ? delivered === 'true' : undefined;

      const deliveries = await dispatchService.getAllDeliveries(supplier_name, deliveredFilter, tender_id);
      const stats = await dispatchService.getDeliveryStats();

      return res.json({ data: deliveries, total: deliveries.length, stats });
    }

    // In-memory fallback: surface local delivery records so the UI works
    // without PostgreSQL in local/dev mode.
    const deliveries = aggregateInMemoryDeliveries();
    const stats = {
      total: deliveries.length,
      delivered: deliveries.filter((d) => d.delivered).length,
      failed: deliveries.filter((d) => !d.delivered).length,
      lastAttempt: deliveries.length > 0 ? deliveries[0].attempted_at : null,
    };

    return res.json({ data: deliveries, total: deliveries.length, stats });
  } catch (err: any) {
    logger.error('Failed to fetch admin deliveries', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

/**
 * GET /api/admin/deliveries/stats - Delivery statistics
 */
router.get('/deliveries/stats', async (req, res) => {
  try {
    if (pool) {
      const dispatchService = new A2ADispatchService(pool);
      const stats = await dispatchService.getDeliveryStats();
      return res.json(stats);
    }

    // In-memory fallback
    const deliveries = aggregateInMemoryDeliveries();
    const stats = {
      total: deliveries.length,
      delivered: deliveries.filter((d) => d.delivered).length,
      failed: deliveries.filter((d) => !d.delivered).length,
      lastAttempt: deliveries.length > 0 ? deliveries[0].attempted_at : null,
    };
    return res.json(stats);
  } catch (err: any) {
    logger.error('Failed to fetch delivery stats', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch delivery stats' });
  }
});

/**
 * POST /api/admin/deliveries/:id/retry - Retry a failed delivery
 */
router.post('/deliveries/:id/retry', async (req, res) => {
  const dbLogger = logger.child('retry-delivery');
  try {
    const { id } = req.params;

    if (!pool) {
      return res.status(503).json({ error: 'A2A dispatch requires PostgreSQL. DATABASE_URL is not configured.' });
    }

    const dispatchService = new A2ADispatchService(pool);
    const result = await dispatchService.retryDelivery(id);

    if (!result) {
      return res.status(404).json({ error: 'Delivery record not found' });
    }

    dbLogger.info('Delivery retry completed', { deliveryId: id, delivered: result.delivered });
    return res.json(result);
  } catch (err: any) {
    logger.error('Failed to retry delivery', { error: err.message });
    res.status(500).json({ error: 'Failed to retry delivery' });
  }
});

/**
 * POST /api/admin/dispatch/:tenderId - Manually dispatch a tender to matching suppliers
 */
router.post('/dispatch/:tenderId', async (req, res) => {
  const dbLogger = logger.child('manual-dispatch');
  try {
    const { tenderId } = req.params;

    if (!pool) {
      return res.status(503).json({ error: 'A2A dispatch requires PostgreSQL. DATABASE_URL is not configured.' });
    }

    const dispatchService = new A2ADispatchService(pool);
    const result = await dispatchService.dispatchTender(tenderId);

    if (!result.success) {
      return res.status(404).json({ error: 'Tender not found or dispatch failed' });
    }

    dbLogger.info('Manual dispatch completed', { tenderId, dispatchedCount: result.dispatchedCount });
    return res.json({
      success: true,
      dispatchedCount: result.dispatchedCount,
      deliveries: result.deliveries,
    });
  } catch (err: any) {
    logger.error('Failed to manually dispatch tender', { error: err.message });
    res.status(500).json({ error: 'Failed to dispatch tender' });
  }
});

/**
 * POST /api/admin/reload-tenders - Reload all tenders from database into memory cache
 */
router.post('/reload-tenders', async (req, res) => {
  try {
    const dbUrl = configService.getConfig().database.url;
    if (!dbUrl) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const store = new TenderStore(dbUrl);
    const result = await store.loadFromDatabase();
    
    await store.close();

    return res.json({
      success: true,
      loaded: result.loaded,
      errors: result.errors,
      message: `Reloaded ${result.loaded} tenders from database`
    });
  } catch (err: any) {
    logger.error('Failed to reload tenders', { error: err.message });
    res.status(500).json({ error: 'Failed to reload tenders', details: err.message });
  }
});

/**
 * GET /api/admin/health - System health check and validation
 */
router.get('/health', async (req, res) => {
  try {
    const checks = {
      database: false,
      deduplication: {
        contentHashColumns: false,
        scanRunsTable: false,
        similaritiesTable: false
      },
      suppliers: {
        total: 0,
        active: 0
      },
      timestamp: new Date().toISOString()
    };

    if (pool) {
      checks.database = true;

      // Check deduplication columns exist
      try {
        const columns = await pool.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'discovered_tenders' 
          AND column_name IN ('content_hash', 'similarity_hash', 'updated_by_scan_id', 'direct_url', 'details')
        `);
        checks.deduplication.contentHashColumns = columns.rows.length === 5;
      } catch (err) {
        logger.error('Health check: failed to check columns', { error: err });
      }

      // Check audit tables exist
      try {
        const tables = await pool.query(`
          SELECT table_name FROM information_schema.tables
          WHERE table_name IN ('scan_runs', 'tender_similarities')
        `);
        checks.deduplication.scanRunsTable = tables.rows.some((t: any) => t.table_name === 'scan_runs');
        checks.deduplication.similaritiesTable = tables.rows.some((t: any) => t.table_name === 'tender_similarities');
      } catch (err) {
        logger.error('Health check: failed to check tables', { error: err });
      }

      // Check suppliers
      try {
        const suppliers = await pool.query('SELECT COUNT(*)::int as total, COUNT(*)::int FILTER (WHERE is_active = TRUE) as active FROM supplier_registry');
        checks.suppliers = {
          total: suppliers.rows[0]?.total || 0,
          active: suppliers.rows[0]?.active || 0
        };
      } catch (err) {
        logger.error('Health check: failed to check suppliers', { error: err });
      }
    }

    const allHealthy = checks.database && 
      checks.deduplication.contentHashColumns && 
      checks.deduplication.scanRunsTable && 
      checks.deduplication.similaritiesTable;

    const status = allHealthy ? 'healthy' : 'degraded';

    res.json({
      status,
      checks
    });
  } catch (err: any) {
    logger.error('Health check failed', { error: err.message });
    res.status(500).json({
      status: 'error',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

export const adminRouter = router;
