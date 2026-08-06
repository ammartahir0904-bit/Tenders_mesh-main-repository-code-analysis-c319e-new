import { RawScrapedTender } from '../../types.js';
import { AgentResult } from '../boss-agent.js';
import { scrapeWithAI } from '../../scrapers/ai-scraper.js';
import { scrapeSAMGov } from '../../scrapers/sam-gov.js';
import { ENABLED_SOURCES } from '../../scrapers/sources.registry.js';

export class UsaSamGovAgent {
  private allowedSources: string[];

  constructor(allowedSources: string[]) {
    this.allowedSources = allowedSources;
  }

  public async execute(): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    const keywords = [
      'IT', 'software', 'cloud', 'AI', 'cybersecurity', 'data', 'network', 'systems', 'digital services', 'R&D'
    ];

    const promises: Promise<AgentResult | null>[] = [];

    // 1. SAM.gov (API) -> Now converted to AI Scrape
    if (this.allowedSources.includes('SAM_GOV')) {
      promises.push((async () => {
        const sourceDef = ENABLED_SOURCES.find(s => s.name === 'SAM_GOV');
        if (!sourceDef) return null;
        
        try {
          const tenders = await scrapeWithAI(sourceDef.urls, 'SAM_GOV', {
            usePlaywright: sourceDef.usePlaywright,
            keywords
          });
          return { sourceName: 'SAM_GOV', tenders, errors: (tenders as any).__errors || [] };
        } catch (e: any) {
          return { sourceName: 'SAM_GOV', tenders: [], errors: [e.message] };
        }
      })());
    }

    // 2. GSA eBuy and others
    const sourceNames = ['GSA_EBUY'].filter(name => this.allowedSources.includes(name));
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
