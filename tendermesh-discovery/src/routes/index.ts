/**
 * API Routes Index
 * 
 * Centralized route registration for TenderMesh Discovery API.
 */

import { Router } from 'express';
import { tendersRouter, setTendersPool, localTenders } from './tenders.routes.js';
import { eventsRouter } from './events.routes.js';
import { scanRouter } from './scan.routes.js';
import { settingsRouter, setSettingsPool } from './settings.routes.js';
import { healthRouter } from './health.routes.js';
import { a2aRouter, setA2aPool } from './a2a.routes.js';
import { adminRouter, setAdminPool } from './admin.routes.js';
import { supplierDemoRouter } from './supplier-demo.routes.js';

export { setAdminPool, setTendersPool, setA2aPool, setSettingsPool, localTenders };

export function createRouter(): Router {
  const router = Router();

  // API routes
  router.use('/tenders', tendersRouter);
  router.use('/events', eventsRouter);
  router.use('/scan', scanRouter);
  router.use('/settings', settingsRouter);
  router.use('/health', healthRouter);
  router.use('/a2a', a2aRouter);
  router.use('/admin', adminRouter);
  // Built-in demo supplier receiver for local E2E testing
  router.use('/supplier-demo', supplierDemoRouter);

  return router;
}
