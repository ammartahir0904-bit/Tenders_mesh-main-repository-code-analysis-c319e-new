import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { Pool } from 'pg';
import { configService } from '../config/config.service.js';

const router = Router();
const a2aLogger = logger.child('a2a');
const expectedA2AKey = configService.getA2AConfig().apiKey;

// Database pool injected from app.ts (same pattern as admin.routes.ts)
let pool: Pool | null = null;

export function setA2aPool(p: Pool) {
  pool = p;
}

/**
 * POST /api/a2a/assessment - Receive fit.assessment from supplier
 */
router.post('/assessment', async (req, res) => {
  try {
    const payload = req.body;
    const providedKey = req.header('A2A-Api-Key');

    if (expectedA2AKey && expectedA2AKey !== providedKey) {
      a2aLogger.warn('Rejected fit.assessment due to invalid A2A key', {
        providedKey: providedKey ?? 'none',
      });
      return res.status(401).json({ error: 'Invalid A2A API key' });
    }

    a2aLogger.info('Received fit.assessment', { payload });

    if (payload.type !== 'fit.assessment') {
      return res.status(400).json({ error: 'Invalid payload type' });
    }

    if (pool) {
      await pool.query(`
        INSERT INTO supplier_assessments 
        (tender_id, supplier_name, a2a_task_id, fit_score, intends_to_bid, met_requirements, gaps)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        payload.tender_id,
        payload.from_agent,
        payload.a2a_task_id,
        payload.assessment.fit_score,
        payload.assessment.intends_to_bid,
        JSON.stringify(payload.assessment.met_requirements),
        JSON.stringify(payload.assessment.gaps)
      ]);
      a2aLogger.info('Stored supplier assessment in DB');
    }

    res.status(202).json({ status: 'received' });
  } catch (err: any) {
    a2aLogger.error('Failed to process assessment', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const a2aRouter = router;