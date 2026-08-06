import { RawScrapedTender } from '../../types.js';
import { AgentResult } from '../boss-agent.js';
import { scrapeWithAI } from '../../scrapers/ai-scraper.js';
import { scrapeWorldBank } from '../../scrapers/world-bank.js';
import { ENABLED_SOURCES } from '../../scrapers/sources.registry.js';

export class InternationalWbAgent {
  private allowedSources: string[];

  constructor(allowedSources: string[]) {
    this.allowedSources = allowedSources;
  }

  public async execute(): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    const keywords = [
      'IT', 'software', 'digital', 'e-governance', 'telecom', 'data', 'AI', 'cloud'
    ];

    const promises: Promise<AgentResult | null>[] = [];

    // 1. World Bank (API)
    if (this.allowedSources.includes('WORLD_BANK')) {
      promises.push((async () => {
        try {
          const tenders = await scrapeWorldBank();
          return { sourceName: 'WORLD_BANK', tenders, errors: (tenders as any).__errors || [] };
        } catch (e: any) {
          return { sourceName: 'WORLD_BANK', tenders: [], errors: [e.message] };
        }
      })());
    }

    // 2. UNGM, ADB, ISDB
    const sourceNames = ['UNGM', 'ADB', 'ISDB'].filter(name => this.allowedSources.includes(name));
    for (const sourceName of sourceNames) {
      promises.push((async () => {
        const sourceDef = ENABLED_SOURCES.find(s => s.name === sourceName);
        if (!sourceDef) return null;
        
        try {
          const tenders = await scrapeWithAI(sourceDef.urls, sourceName, {
            usePlaywright: sourceDef.usePlaywright,
            keywords
          });
          return { sourceName, tenders, errors: (tenders as any).__errors || [] };
        } catch (e: any) {
          return { sourceName, tenders: [], errors: [e.message] };
        }
      })());
    }

    const settled = await Promise.allSettled(promises);
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled' && outcome.value) {
        results.push(outcome.value);
      }
    }

    return results;
  }
}
