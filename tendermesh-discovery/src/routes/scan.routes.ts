/**
 * Scan Routes
 * 
 * Handles tender discovery scan operations using the real Pipeline.
 */

import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { configService } from '../config/config.service.js';
import { sseManager } from './events.routes.js';
import { Pipeline } from '../pipeline.js';
import { config } from '../config/env.js';
import { ENABLED_SOURCE_NAMES, ENABLED_SOURCES } from '../scrapers/sources.registry.js';
import { BossAgent } from '../agents/boss-agent.js';

const router = Router();
const scanLogger = logger.child('scan');

/**
 * POST /api/scan - Trigger real discovery scan
 */
const ALL_SCAN_SOURCES = ENABLED_SOURCE_NAMES;

router.post('/', async (req, res) => {

  try {
    const { targetCountry = 'Worldwide' } = req.body;

    // Map target country to actual source names
    const getSourcesByTarget = (target: string) => {
      const all = ENABLED_SOURCES;
      if (target === 'Worldwide') return ENABLED_SOURCE_NAMES;
      if (target === 'Pakistan') return all.filter((s: any) => s.region.startsWith('PAKISTAN')).map((s: any) => s.name);
      if (target === 'United States') {
        const usSources = all.filter((s: any) => s.region === 'UNITED_STATES').map((s: any) => s.name);
        if (all.some((s: any) => s.name === 'SAM_GOV') && !usSources.includes('SAM_GOV')) {
          usSources.push('SAM_GOV');
        }
        return usSources;
      }
      if (target === 'Gulf Region') return all.filter((s: any) => s.region === 'GULF').map((s: any) => s.name);
      if (target === 'European Union') return ['TED_EU'];
      if (target === 'International') return all.filter((s: any) => s.region === 'INTERNATIONAL' && s.name !== 'TED_EU').map((s: any) => s.name);
      return [target]; // Fallback
    };

    let scanSources = getSourcesByTarget(targetCountry);

    // Enforce limits for non-Worldwide targets to control cost/memory
    if (targetCountry !== 'Worldwide' && scanSources.length > config.maxSourcesPerScan) {
      scanLogger.info(`Limiting scan from ${scanSources.length} sources to ${config.maxSourcesPerScan} sources`);
      scanSources = scanSources.slice(0, config.maxSourcesPerScan);
    }

    const dbUrl = configService.getConfig().database.url;

    if (!dbUrl) {
      scanLogger.warn('DATABASE_URL not configured — scan will parse tenders but cannot store them');
    }

    // Warn early if AI extraction is unavailable
    if (!config.groqApiKey) {
      const warnMsg = 'GROQ_API_KEY is not set. Internet scraping is disabled — scans will return only fallback/sample tenders.';
      scanLogger.warn(warnMsg);
      sseManager.broadcast('SCAN_ERROR', {
        type: 'SCAN_ERROR',
        source: 'CONFIG',
        errors: [warnMsg],
        timestamp: new Date().toISOString(),
        message: warnMsg,
      });
    }

    // Broadcast scan start event
    sseManager.broadcast('SCAN_STARTED', {
      type: 'SCAN_STARTED',
      sources: scanSources,
      timestamp: new Date().toISOString(),
      message: `Scan started for ${targetCountry}`,
    });

    scanLogger.info(`Scan started for target country: ${targetCountry}`);

    // Respond immediately — scan runs async
    res.json({
      started: true,
      targetCountry,
      message: 'Scan started in background',
      timestamp: new Date().toISOString(),
    });

    // Process scan sources in sequential batches to ensure 100% source coverage for Worldwide scans
    const batchSize = config.maxSourcesPerScan || 5;
    const sourceBatches: string[][] = [];
    for (let i = 0; i < scanSources.length; i += batchSize) {
      sourceBatches.push(scanSources.slice(i, i + batchSize));
    }

    const results = [];
    const pipeline = new Pipeline(dbUrl);

    for (const batch of sourceBatches) {
      const bossAgent = new BossAgent(targetCountry, batch);
      const agentResults = await bossAgent.orchestrate();

      for (const ar of agentResults) {
        const res = await pipeline.runSource(ar.sourceName, async () => ar.tenders);
        if (ar.errors.length > 0) {
          res.errors.push(...ar.errors);
        }
        results.push(res);
      }
    }

    await pipeline.close();

    // Broadcast per-source results
    for (const result of results) {
      const totalProcessed = result.inserted + result.updated + result.skippedDuplicate;
      if (result.skippedDuplicate > 0) {
        sseManager.broadcast('DUPLICATE_TENDER', {
          type: 'DUPLICATE_TENDER',
          source: result.source,
          skippedDuplicate: result.skippedDuplicate,
          timestamp: new Date().toISOString(),
          message: `${result.source}: ${result.skippedDuplicate} tender(s) already exist in PostgreSQL database and were skipped.`,
        });
      }

      if (result.parsed > 0 || totalProcessed > 0) {
        sseManager.broadcast('NEW_TENDER', {
          type: 'NEW_TENDER',
          source: result.source,
          count: Math.max(result.inserted + result.updated, result.parsed),
          scraped: result.scraped,
          parsed: result.parsed,
          stored: result.inserted + result.updated,
          inserted: result.inserted,
          updated: result.updated,
          skippedDuplicate: result.skippedDuplicate,
          errors: result.errors.length > 0 ? result.errors : undefined,
          timestamp: new Date().toISOString(),
          message: `${result.source}: scraped ${result.scraped}, parsed ${result.parsed}, stored ${result.inserted + result.updated}${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`,
        });
      } else if (result.errors.length > 0) {
        const cleanErrs = result.errors.map((e: any) => typeof e === 'object' ? (e.error || e.message || JSON.stringify(e)) : String(e));
        sseManager.broadcast('SCAN_ERROR', {
          type: 'SCAN_ERROR',
          source: result.source,
          scraped: result.scraped,
          errors: cleanErrs,
          timestamp: new Date().toISOString(),
          message: `${result.source}: ${cleanErrs.join(' | ')}`,
        });
      } else {
        // Scraped 0 results — no tenders found, not an error
        sseManager.broadcast('SCAN_INFO', {
          type: 'SCAN_INFO',
          source: result.source,
          scraped: 0,
          timestamp: new Date().toISOString(),
          message: `${result.source}: no tenders found (page may be empty or blocking)`,
        });
      }
    }

    // Broadcast scan completion
    sseManager.broadcast('SCAN_COMPLETED', {
      type: 'SCAN_COMPLETED',
      results,
      timestamp: new Date().toISOString(),
      message: 'Scan completed',
    });

    scanLogger.info('Scan completed', { results });

  } catch (error: any) {
    scanLogger.error('Background scan failed', { error: error.message });

    sseManager.broadcast('SCAN_COMPLETED', {
      type: 'SCAN_COMPLETED',
      error: error.message,
      timestamp: new Date().toISOString(),
      message: 'Scan failed',
    });
  }
});

/**
 * GET /api/scan/status - Get current scan status
 */
router.get('/status', (req, res) => {
  // TODO: Implement actual scan status tracking
  res.json({
    status: 'idle',
    lastScan: null,
    nextScan: null,
    message: 'Scan service is idle',
  });
});

export const scanRouter = router;