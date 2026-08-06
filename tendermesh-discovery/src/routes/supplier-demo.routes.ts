import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

const router = Router();

/**
 * POST /api/supplier-demo/receive
 *
 * Built-in demo supplier receiver for local E2E testing.
 * Accepts `tender.invitation` payloads and (optionally) auto-replies
 * with a synthetic `fit.assessment` back to the buyer's A2A endpoint.
 */
router.post('/receive', async (req, res) => {
  const payload = req.body;
  const providedKey = req.header('A2A-Api-Key');
  const expectedKey = config.a2aApiKey;

  if (expectedKey && expectedKey !== providedKey) {
    logger.warn('[SupplierDemo] Rejected invitation: invalid A2A key');
    return res.status(401).json({ error: 'Invalid A2A API key' });
  }

  if (!payload || payload.type !== 'tender.invitation') {
    return res.status(400).json({ error: 'Expected payload type: tender.invitation' });
  }

  const tender = payload.tender || {};
  const taskId = payload.a2a_task_id;

  logger.info('[SupplierDemo] Received tender invitation', {
    a2a_task_id: taskId,
    tender_id: tender.tender_id,
    title: tender.title,
    category: tender.category,
  });

  // Soft-disable auto-assessment unless explicitly enabled. This keeps the
  // demo receiver a passive echo by default; operators can turn it on via
  // SUPPLIER_DEMO_AUTO_ASSESS=true in .env.
  const autoAssess = String(process.env.SUPPLIER_DEMO_AUTO_ASSESS || '').toLowerCase() === 'true';

  if (autoAssess && payload.reply_to) {
    const assessment = {
      type: 'fit.assessment',
      a2a_task_id: taskId,
      from_agent: 'tendermesh-supplier-agent',
      to_agent: 'tendermesh-buyer-agent',
      tender_id: tender.tender_id,
      assessment: {
        fit_score: 0.9,
        intends_to_bid: true,
        met_requirements: ['NTN', 'Registered Vendor'],
        gaps: [],
      },
    };

    try {
      const response = await fetch(payload.reply_to, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'A2A-Api-Key': providedKey || expectedKey || '',
        },
        body: JSON.stringify(assessment),
      });

      logger.info('[SupplierDemo] Sent fit.assessment', {
        a2a_task_id: taskId,
        status: response.status,
      });
    } catch (err: any) {
      logger.warn('[SupplierDemo] Failed to send fit.assessment', {
        a2a_task_id: taskId,
        error: err.message,
      });
    }
  }

  return res.json({
    status: 'received',
    a2a_task_id: taskId,
    tender_id: tender.tender_id,
    autoAssessed: autoAssess,
  });
});

export const supplierDemoRouter = router;