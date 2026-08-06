// ─── Pipeline Orchestrator: Scrape → Parse → Score → Store ───

import 'dotenv/config';
import { TenderStore } from './db/store.js';
import { PPRANodeParser } from './parsers/ppra-node.js';
import { AIParser } from './parsers/ai-parser.js';
import { parseHtmlList } from './parsers/html-list-parser.js';
import { scoreTender } from './scorers/fit-scorer.js';
import { scrapeWithAI } from './scrapers/ai-scraper.js';
import { ENABLED_SOURCES, type SourceDefinition } from './scrapers/sources.registry.js';
import { scrapeUNDP } from './scrapers/undp.js';
import { scrapeWorldBank } from './scrapers/world-bank.js';
import { scrapeSAMGov } from './scrapers/sam-gov.js';
import { closeBrowser } from './services/playwright-renderer.js';
import { logger } from './utils/logger.js';
import { createTenderRecordId } from './utils/tender-utils.js';
import { ScanLock } from './utils/deduplication.js';
import type { RawScrapedTender, Tender } from './types.js';

export interface PipelineResult {
  source: string;
  scraped: number;
  parsed: number;
  inserted: number;
  updated: number;
  skippedDuplicate: number;
  skippedSimilar: number;
  errors: string[];
}

export class Pipeline {
  private store: TenderStore;
  private ppraParser: PPRANodeParser;
  private aiParser: AIParser;

  constructor(dbUrl: string) {
    this.store = new TenderStore(dbUrl);
    this.ppraParser = new PPRANodeParser();
    this.aiParser = new AIParser();
  }

  async runFullScan(): Promise<PipelineResult[]> {
    const scrapers: Array<{ name: string; fn: () => Promise<RawScrapedTender[]> }> =
      ENABLED_SOURCES.map((source) => ({
        name: source.name,
        fn: this.getScraperFn(source),
      }));

    // Run sources SEQUENTIALLY to avoid overwhelming target sites
    // and to respect the distributed lock per source
    const results: PipelineResult[] = [];
    for (const scraper of scrapers) {
      try {
        const result = await this.runSource(scraper.name, scraper.fn);
        results.push(result);
      } catch (error: any) {
        logger.error(`[Pipeline] ${scraper.name} failed`, { message: error?.message ?? error });
        results.push({
          source: scraper.name,
          scraped: 0, parsed: 0, inserted: 0, updated: 0,
          skippedDuplicate: 0, skippedSimilar: 0,
          errors: [error?.message ?? 'Unknown error'],
        });
      }
    }
    return results;
  }

  private getScraperFn(source: SourceDefinition): () => Promise<RawScrapedTender[]> {
    switch (source.name) {
      case 'UNDP': return async () => scrapeUNDP();
      case 'WORLD_BANK': return async () => scrapeWorldBank();
      case 'SAM_GOV': return async () => scrapeSAMGov();
      default: return async () => scrapeWithAI(source.urls, source.name);
    }
  }

  async runSource(
    sourceName: string,
    scrapeFn: () => Promise<RawScrapedTender[]>
  ): Promise<PipelineResult> {
    const result: PipelineResult = {
      source: sourceName,
      scraped: 0,
      parsed: 0,
      inserted: 0,
      updated: 0,
      skippedDuplicate: 0,
      skippedSimilar: 0,
      errors: [],
    };

    // ─── VERIFY DB CONNECTION ───
    const isDbAlive = await this.store.ping();
    if (!isDbAlive) {
      const msg = `Database connection failed. Aborting scan for ${sourceName} to prevent phantom data saves.`;
      result.errors.push(msg);
      logger.error(`[Pipeline] ${msg}`);
      return result;
    }

    // ─── ACQUIRE DISTRIBUTED LOCK ───
    const lock = new ScanLock(sourceName);
    const lockAcquired = await lock.acquire(30000);
    
    if (!lockAcquired) {
      result.errors.push(`Could not acquire lock for ${sourceName} (another scan running)`);
      logger.warn(`[Pipeline] ${sourceName}: Lock not acquired, skipping`);
      return result;
    }

    const scanStats = { tendersFound: 0, tendersNew: 0, tendersSkipped: 0, tendersUpdated: 0 };

    try {
      console.log(`[Pipeline] Scraping ${sourceName}...`);
      const rawTenders = await scrapeFn();
      result.scraped = rawTenders.length;
      scanStats.tendersFound = rawTenders.length;
      console.log(`[Pipeline] ${sourceName}: scraped ${rawTenders.length} tenders`);

      const tendersToProcess: Tender[] = [];

      for (const raw of rawTenders) {
        if (raw.extracted) {
          const tender = raw.extracted as Tender;
          tender.source = sourceName;
          tendersToProcess.push(tender);
        } else {
          // AI list extraction failed, try HTML list parser fallback
          const htmlListTenders = parseHtmlList(raw, sourceName);
          
          if (htmlListTenders.length > 0) {
            console.log(`[Pipeline] HTML List Parser extracted ${htmlListTenders.length} tenders as fallback for ${raw.source_id}`);
            tendersToProcess.push(...htmlListTenders);
          } else {
            // Ultimate fallback to single tender parsers
            if (sourceName === 'PPRA_AI') {
              const t = await this.ppraParser.parse(raw, sourceName);
              if (t) {
                tendersToProcess.push(t);
              } else {
                console.log(`[Pipeline] PPRANodeParser failed for ${raw.source_id}, falling back to AIParser`);
                const t2 = await this.aiParser.parse(raw, sourceName);
                if (t2) tendersToProcess.push(t2);
              }
            } else {
              const t = await this.aiParser.parse(raw, sourceName);
              if (t) tendersToProcess.push(t);
            }
          }
        }
      }

      for (const tender of tendersToProcess) {
        if (!tender || !tender.title || tender.title === 'Untitled' || tender.title === 'Untitled Tender') {
          result.errors.push(`Skipped invalid/empty tender: ${tender.source_id || 'unknown'}`);
          continue;
        }
        result.parsed++;

        const score = scoreTender(tender);

        // ─── COMPREHENSIVE DEDUPLICATION CHECK ───
        const saveResult = await this.store.save(tender, score);

        switch (saveResult.action) {
          case 'INSERTED':
            result.inserted++;
            scanStats.tendersNew++;
            break;
          case 'UPDATED':
            result.updated++;
            scanStats.tendersUpdated++;
            break;
          case 'SKIPPED_DUPLICATE':
            result.skippedDuplicate++;
            scanStats.tendersSkipped++;
            console.log(`[Pipeline] ${sourceName}: Skipped duplicate ${tender.source_id} (content hash match)`);
            break;
          case 'SIMILAR_FOUND':
            result.skippedSimilar++;
            console.log(`[Pipeline] ${sourceName}: Similar tender found for ${tender.source_id} (${saveResult.similarTenders?.length} matches)`);
            break;
        }


      }

      console.log(`[Pipeline] ${sourceName}: parsed=${result.parsed} inserted=${result.inserted} updated=${result.updated} skippedDup=${result.skippedDuplicate} skippedSim=${result.skippedSimilar} errors=${result.errors.length}`);

    } catch (err: any) {
      result.errors.push(`Pipeline error for ${sourceName}: ${err.message}`);
      console.error(`[Pipeline] Error processing ${sourceName}:`, err.message);
    } finally {
      // ─── RELEASE LOCK ───
      await lock.release(
        result.errors.length > 0 ? 'FAILED' : 'COMPLETED',
        scanStats,
        result.errors.length > 0 ? result.errors.join('; ') : undefined
      );
    }

    return result;
  }

  async close() {
    await this.store.close();
    await closeBrowser();
  }
}