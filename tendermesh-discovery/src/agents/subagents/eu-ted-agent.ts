import { RawScrapedTender } from '../../types.js';
import { AgentResult } from '../boss-agent.js';
import { scrapeWithAI } from '../../scrapers/ai-scraper.js';
import { ENABLED_SOURCES } from '../../scrapers/sources.registry.js';

export class EuTedAgent {
  private allowedSources: string[];

  constructor(allowedSources: string[]) {
    this.allowedSources = allowedSources;
  }

  public async execute(): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    const keywords = [
      'IT', 'software', 'cloud', 'AI', 'digital', 'cybersecurity', 'data', 'telecom', 'R&D'
    ];
    const sourceDef = ENABLED_SOURCES.find(s => s.name === 'TED_EU');
    
    try {
      if (sourceDef && this.allowedSources.includes('TED_EU')) {
        const tenders = await scrapeWithAI(sourceDef.urls, 'TED_EU', {
          usePlaywright: sourceDef.usePlaywright,
          keywords
        });
        results.push({ sourceName: 'TED_EU', tenders, errors: (tenders as any).__errors || [] });
      }
    } catch (e: any) {
      results.push({ sourceName: 'TED_EU', tenders: [], errors: [e.message] });
    }

    return results;
  }
}
