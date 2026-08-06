import { RawScrapedTender } from '../../types.js';
import { AgentResult } from '../boss-agent.js';
import { scrapeWithAI } from '../../scrapers/ai-scraper.js';
import { ENABLED_SOURCES } from '../../scrapers/sources.registry.js';

export class PakistanPpraAgent {
  private allowedSources: string[];

  constructor(allowedSources: string[]) {
    this.allowedSources = allowedSources;
  }

  public async execute(): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    const sourceNames = [
      'PPRA_AI', 'PRA_PUNJAB', 'SPPRA', 'KPPRA', 'BPPRA',
      'FBR', 'NEPRA', 'NTDC', 'PIA',
      'PAK_RAILWAYS', 'PEC', 'PAKISTAN_GOV'
    ].filter(name => this.allowedSources.includes(name));

    const keywords = [
      'IT', 'software', 'development', 'network', 'cloud', 'AI', 'data',
      'cybersecurity', 'ERP', 'digital', 'telecom', 'hardware', 'systems', 'e-governance'
    ];

    const promises = sourceNames.map(async (sourceName) => {
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
    });

    const settled = await Promise.allSettled(promises);
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled' && outcome.value) {
        results.push(outcome.value);
      }
    }

    return results;
  }
}
