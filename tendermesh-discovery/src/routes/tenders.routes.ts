/**
 * Tenders Routes
 * 
 * Handles tender listing, filtering, and approval operations.
 * ALL data reads/writes go through PostgreSQL. No in-memory fallback.
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import { configService } from '../config/config.service.js';
import { A2ADispatchService, DeliveryRecord } from '../services/a2a-dispatch.service.js';
import { fetchWithTimeout } from '../services/http-client.js';
import { sseManager } from './events.routes.js';

const router = Router();

// Database pool (injected at startup)
let pool: Pool | null = null;

export function setTendersPool(p: Pool) {
  pool = p;
}

// Read A2A config dynamically at call time so runtime updates via
// configService.setA2AEndpoint() / process.env mutations are respected.
// Caching these at module load was the root cause of stale supplier IPs.
function getSupplierEndpoint() {
  return (
    process.env.SUPPLIER_ENDPOINT ||
    configService.getA2AConfig().endpoint ||
    'http://localhost:8000/tenders/receive'
  );
}
function getA2AApiKey() {
  return configService.getA2AConfig().apiKey || process.env.A2A_API_KEY || 'tendermesh-shared-secret';
}
function getApiBaseUrl() {
  return configService.getA2AConfig().replyBaseUrl || process.env.API_BASE_URL || 'http://localhost:3001';
}

// ─── In-memory maps kept only for pipeline compatibility ───
// The pipeline writes scanned tenders here AND to Postgres.
// These maps are NOT used by the GET /api/tenders route anymore.
const localTenders: Map<string, any> = new Map();
const localDeliveries: Map<string, any[]> = new Map();

async function persistTendersToFile() {
  // No-op: We no longer persist to JSON file. All data is in Postgres.
}

function createLocalTender(source: string) {
  // Legacy function — kept for pipeline compatibility
  const id = `local-${Date.now()}`;
  const tender = {
    id,
    source,
    source_url: '',
    source_id: `${source}-${Date.now()}`,
    title: `Tender from ${source}`,
    buying_org: 'Pending',
    category: 'IT Services',
    location: 'Islamabad',
    estimated_value: 5000000000,
    currency: 'PKR',
    deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
    mandatory_reqs: ['NTN', 'Registered Vendor'],
    status: 'ACTIVE',
    scraped_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    approval: null,
    score: null,
  };
  localTenders.set(id, tender);
  return tender;
}

async function attemptDispatch(
  tenderId: string,
  tender: any,
  endpoint: string
): Promise<DeliveryRecord> {
  const entry: DeliveryRecord = {
    id: `delivery-${tenderId}-${Date.now()}`,
    tender_id: tenderId,
    supplier_id: null,
    supplier_name: 'Configured Supplier',
    supplier_endpoint: endpoint,
    a2a_task_id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    payload: {},
    response: {},
    status_code: null,
    delivered: false,
    error_message: null,
    attempted_at: new Date().toISOString(),
  };

  try {
    const payload = {
      type: 'tender.invitation',
      a2a_task_id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      from_agent: 'tendermesh-buyer-agent',
      to_agent: 'tendermesh-supplier-agent',
      tender: {
        tender_id: tenderId,
        title: tender?.title || 'Unknown',
        category: tender?.category || '',
        scope: tender?.buying_org || '',
        buyer_region: tender?.location || '',
        estimated_value: tender?.estimated_value ?? null,
        currency: tender?.currency || 'PKR',
        mandatory_reqs: tender?.mandatory_reqs || [],
        deadline: tender?.deadline,
        response_by: tender?.deadline,
        source: tender?.source || '',
        source_id: tender?.source_id || '',
        source_url: tender?.source_url || '',
        status: tender?.status || 'ACTIVE',
        deliverables: [],
        reply_to: `${getApiBaseUrl()}/api/a2a/assessment`,
      },
    };

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'A2A-Api-Key': getA2AApiKey(),
      },
      body: JSON.stringify(payload),
    }, 15000);

    if (response.ok) {
      entry.delivered = true;
      entry.status_code = response.status;
      logger.info(`[Dispatch] Tender ${tenderId} dispatched to ${endpoint}`);
    } else {
      entry.error_message = `HTTP ${response.status}`;
      entry.status_code = response.status;
      logger.warn(`[Dispatch] Tender ${tenderId} rejected by supplier: ${response.status}`);
    }
  } catch (err: any) {
    entry.error_message = err.message || 'Connection failed';
    logger.warn(`[Dispatch] Failed to reach supplier at ${endpoint}: ${entry.error_message}`);
  }

  // Store delivery record in memory (for pipeline compatibility)
  if (!localDeliveries.has(tenderId)) localDeliveries.set(tenderId, []);
  localDeliveries.get(tenderId)!.push(entry);

  return entry;
}

/**
 * GET /api/tenders - List tenders with filtering and pagination
 * Uses PostgreSQL if available, otherwise seamlessly falls back to in-memory store.
 */
router.get('/', async (req, res) => {
  const dbLogger = logger.child('tenders');

  try {
    const search = (req.query.search as string) || '';
    const source = (req.query.source as string) || '';
    const category = (req.query.category as string) || '';
    const location = (req.query.location as string) || '';
    const status = (req.query.status as string) || '';
    const approvalStatus = (req.query.approval_status as string) || '';
    const pageNum = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string, 10) || 25));

    if (pool) {
      try {
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        if (search) {
          conditions.push(`(t.title ILIKE $${paramIdx} OR t.buying_org ILIKE $${paramIdx})`);
          params.push(`%${search}%`);
          paramIdx++;
        }
        if (source) {
          conditions.push(`t.source = $${paramIdx}`);
          params.push(source);
          paramIdx++;
        }
        if (category) {
          conditions.push(`t.category = $${paramIdx}`);
          params.push(category);
          paramIdx++;
        }
        if (location) {
          conditions.push(`(t.location ILIKE $${paramIdx} OR t.source ILIKE $${paramIdx})`);
          params.push(`%${location}%`);
          paramIdx++;
        }
        if (status) {
          conditions.push(`t.status = $${paramIdx}`);
          params.push(status);
          paramIdx++;
        }
        if (approvalStatus) {
          if (approvalStatus === 'DECIDED') {
            conditions.push(`COALESCE(a.status, 'PENDING') IN ('APPROVED', 'REJECTED')`);
          } else {
            conditions.push(`COALESCE(a.status, 'PENDING') = $${paramIdx}`);
            params.push(approvalStatus);
            paramIdx++;
          }
        }

        // Enforce minimum 50% (0.50) match score filter for Discovery feed
        conditions.push(`(s.overall_score IS NULL OR s.overall_score >= 0.50)`);

        // Rule 1: Default to active/future deadline tenders (or null deadline)
        conditions.push(`(t.deadline IS NULL OR t.deadline >= CURRENT_DATE - INTERVAL '1 day')`);

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await pool.query(`
          SELECT COUNT(*) as count 
          FROM discovered_tenders t
          LEFT JOIN tender_scores s ON t.id = s.tender_id
          LEFT JOIN tender_approvals a ON t.id = a.tender_id
          ${whereClause}
        `, params);
        const total = parseInt(countResult.rows[0].count, 10);

        const limit = perPage;
        const offset = (pageNum - 1) * perPage;
        const queryParams = [...params, limit, offset];
        
        const query = `
          SELECT 
            t.*,
            s.overall_score,
            s.recommendation,
            s.score_reasons,
            a.status as approval_status,
            a.approved_at as approval_approved_at,
            a.notes as approval_notes,
            COALESCE(
              (SELECT json_agg(d.*) FROM tender_deliveries d WHERE d.tender_id = t.id),
              '[]'::json
            ) as deliveries
          FROM discovered_tenders t
          LEFT JOIN tender_scores s ON t.id = s.tender_id
          LEFT JOIN tender_approvals a ON t.id = a.tender_id
          ${whereClause}
          ORDER BY t.scraped_at DESC
          LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
        `;
        const tendersResult = await pool.query(query, queryParams);

        const formatted = tendersResult.rows.map(row => ({
          id: row.id,
          source: row.source,
          source_url: row.source_url,
          source_id: row.source_id,
          title: row.title,
          buying_org: row.buying_org,
          category: row.category,
          location: row.location,
          estimated_value: row.estimated_value,
          currency: row.currency,
          deadline: row.deadline ? (row.deadline.toISOString ? row.deadline.toISOString() : row.deadline) : null,
          mandatory_reqs: typeof row.mandatory_reqs === 'string' ? JSON.parse(row.mandatory_reqs) : row.mandatory_reqs,
          description: row.description,
          status: row.status,
          scraped_at: row.scraped_at ? (row.scraped_at.toISOString ? row.scraped_at.toISOString() : row.scraped_at) : null,
          updated_at: row.updated_at ? (row.updated_at.toISOString ? row.updated_at.toISOString() : row.updated_at) : null,
          score: row.overall_score !== null ? {
            id: `score-${row.id}`,
            tender_id: row.id,
            overall_score: parseFloat(row.overall_score),
            recommendation: row.recommendation,
            score_reasons: typeof row.score_reasons === 'string' ? JSON.parse(row.score_reasons) : row.score_reasons,
            scored_at: row.scraped_at ? (row.scraped_at.toISOString ? row.scraped_at.toISOString() : row.scraped_at) : new Date().toISOString(),
          } : null,
          approval: row.approval_status ? {
            id: `approval-${row.id}`,
            tender_id: row.id,
            status: row.approval_status,
            approved_at: row.approval_approved_at ? (row.approval_approved_at.toISOString ? row.approval_approved_at.toISOString() : row.approval_approved_at) : null,
            notes: row.approval_notes,
            created_at: row.approval_approved_at ? (row.approval_approved_at.toISOString ? row.approval_approved_at.toISOString() : row.approval_approved_at) : new Date().toISOString(),
          } : {
            status: 'PENDING',
            approved_at: null,
            notes: null
          },
          deliveries: (typeof row.deliveries === 'string' ? JSON.parse(row.deliveries) : row.deliveries) || [],
        }));

        dbLogger.info('Fetched tenders from database', { count: formatted.length, total });

        return res.json({
          data: formatted,
          total,
          page: pageNum,
          per_page: perPage,
          total_pages: Math.ceil(total / perPage),
        });
      } catch (dbErr: any) {
        dbLogger.error('PostgreSQL query failed', { error: dbErr.message, stack: dbErr.stack });
        sseManager.broadcast('SCAN_ERROR', {
          type: 'SCAN_ERROR',
          error: `Database query error: ${dbErr.message}`,
          timestamp: new Date().toISOString(),
        });
        return res.status(500).json({ error: 'Database unavailable' });
      }
    }

    return res.status(500).json({ error: 'Database pool unavailable' });

  } catch (err: any) {
    logger.error('Failed to fetch tenders', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch tenders' });
  }
});

/**
 * POST /api/tenders/:id/approve - Approve or reject a tender
 * Uses PostgreSQL if available, falls back to in-memory.
 */
router.post('/:id/approve', async (req, res) => {
  const dbLogger = logger.child('approvals');

  try {
    const { id } = req.params;
    let body = req.body ?? {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const status = typeof body?.status === 'string' ? body.status : undefined;
    const notes = typeof body?.notes === 'string' ? body.notes : undefined;

    if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res
        .status(400)
        .json({ error: 'Invalid status. Must be APPROVED, REJECTED, or PENDING.' });
    }

    if (pool) {
      try {
        // Check if tender exists in DB
        const checkTender = await pool.query('SELECT * FROM discovered_tenders WHERE id = $1', [id]);
        if (checkTender.rows.length > 0) {
          await pool.query(`
            INSERT INTO tender_approvals (tender_id, status, approved_at, notes)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tender_id)
            DO UPDATE SET status = EXCLUDED.status, approved_at = EXCLUDED.approved_at, notes = EXCLUDED.notes
          `, [id, status, status === 'APPROVED' ? new Date().toISOString() : null, notes || null]);

          await pool.query(`
            UPDATE discovered_tenders SET status = $1, updated_at = NOW() WHERE id = $2
          `, [status === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'ACTIVE', id]);

          dbLogger.info('Tender approval updated in DB', { tenderId: id, status });

          let dispatchResult = null;
          if (status === 'APPROVED') {
            // Fire and forget dispatch to prevent UI blocking
            setTimeout(async () => {
              try {
                const dispatchService = new A2ADispatchService(pool!);
                await dispatchService.dispatchTender(id);
              } catch (dispatchErr: any) {
                dbLogger.warn('Dispatch failed after approval', { tenderId: id, error: dispatchErr.message });
                const tender = checkTender.rows[0];
                await attemptDispatch(id, tender, getSupplierEndpoint());
              }
            }, 0);
            dispatchResult = { delivered: true, _background: true };
          }

          const deliverySummary =
            dispatchResult && typeof dispatchResult === 'object'
              ? {
                  dispatchedCount: (dispatchResult as any).dispatchedCount ?? ((dispatchResult as any).delivered ? 1 : 0),
                  totalSuppliers: (dispatchResult as any).deliveries?.length ?? 1,
                  anyDelivered: (dispatchResult as any).deliveries?.some((d: any) => d.delivered) ?? (dispatchResult as any).delivered ?? false,
                }
              : { dispatchedCount: 0, totalSuppliers: 0, anyDelivered: false };

          return res.json({
            tender_id: id,
            status,
            approved_at: status === 'APPROVED' ? new Date().toISOString() : null,
            notes: notes || null,
            dispatch: dispatchResult,
            delivery_summary: deliverySummary,
          });
        }
      } catch (dbErr: any) {
        dbLogger.error('DB approval update failed', { error: dbErr.message, stack: dbErr.stack });
        return res.status(500).json({ error: 'Database query failed' });
      }
    }

    return res.status(500).json({ error: 'Database pool unavailable' });

  } catch (err: any) {
    logger.error('Failed to update approval', { error: err.message });
    res.status(500).json({ error: 'Failed to update approval' });
  }
});

/**
 * POST /api/tenders/bulk-approve - Bulk approve/reject tenders
 */
router.post('/bulk-approve', async (req, res) => {
  const dbLogger = logger.child('bulk-approvals');

  try {
    const body = req.body ?? {};
    const tender_ids = Array.isArray(body?.tender_ids) ? body.tender_ids : undefined;
    const status = typeof body?.status === 'string' ? body.status : undefined;

    if (!Array.isArray(tender_ids) || tender_ids.length === 0) {
      return res.status(400).json({ error: 'tender_ids must be a non-empty array' });
    }
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (pool) {
      try {
        await pool.query('BEGIN');
        const values: string[] = [];
        const params: any[] = [];
        let idx = 1;
        const approvedAt = status === 'APPROVED' ? new Date().toISOString() : null;
        const tenderStatus = status === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'ACTIVE';

        for (const id of tender_ids) {
          values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
          params.push(id, status, approvedAt, null);
        }

        if (values.length > 0) {
          await pool.query(`
            INSERT INTO tender_approvals (tender_id, status, approved_at, notes)
            VALUES ${values.join(', ')}
            ON CONFLICT (tender_id)
            DO UPDATE SET status = EXCLUDED.status, approved_at = EXCLUDED.approved_at, notes = EXCLUDED.notes
          `, params);

          await pool.query(`
            UPDATE discovered_tenders SET status = $1, updated_at = NOW()
            WHERE id = ANY($2::uuid[])
          `, [tenderStatus, tender_ids]);
        }

        await pool.query('COMMIT');
        dbLogger.info('Bulk approval completed in DB', { count: tender_ids.length, status });

        if (status === 'APPROVED') {
          const dispatchService = new A2ADispatchService(pool);
          for (const id of tender_ids) {
            dispatchService.dispatchTender(id).catch((err) => {
              logger.error('Bulk dispatch failed for tender', { id, error: err.message });
            });
          }
        }

        return res.status(204).send();
      } catch (dbErr: any) {
        dbLogger.warn('Bulk DB approval failed, using in-memory fallback', { error: dbErr.message });
      }
    }

    // In-memory fallback
    for (const id of tender_ids) {
      const localTender = localTenders.get(id);
      if (localTender) {
        localTender.status = status === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'ACTIVE';
        localTender.approval = {
          id: `approval-${id}`,
          tender_id: id,
          status,
          approved_at: status === 'APPROVED' ? new Date().toISOString() : null,
          notes: null,
          created_at: new Date().toISOString(),
        };
        localTenders.set(id, localTender);

        if (status === 'APPROVED') {
          attemptDispatch(id, localTender, getSupplierEndpoint()).catch(() => {});
        }
      }
    }

    return res.status(204).send();
  } catch (err: any) {
    logger.error('Failed bulk approval', { error: err.message });
    res.status(500).json({ error: 'Failed bulk approval' });
  }
});

/**
 * GET /api/tenders/:id/deliveries - Get delivery history for a tender
 */
router.get('/:id/deliveries', async (req, res) => {
  try {
    const { id } = req.params;

    if (pool) {
      const dispatchService = new A2ADispatchService(pool);
      const deliveries = await dispatchService.getDeliveriesByTender(id);
      return res.json({ data: deliveries, total: deliveries.length });
    }

    const deliveries = localDeliveries.get(id) || [];
    return res.json({ data: deliveries, total: deliveries.length });
  } catch (err: any) {
    logger.error('Failed to fetch deliveries', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

export { router as tendersRouter, localTenders, localDeliveries, createLocalTender, persistTendersToFile };
