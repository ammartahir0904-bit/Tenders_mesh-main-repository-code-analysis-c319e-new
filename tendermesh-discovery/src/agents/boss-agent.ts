import { RawScrapedTender } from '../types.js';
import { logger } from '../utils/logger.js';
import { PakistanPpraAgent } from './subagents/pakistan-ppra-agent.js';
import { UsaSamGovAgent } from './subagents/usa-samgov-agent.js';
import { UaeEsupplyAgent } from './subagents/uae-esupply-agent.js';
import { InternationalWbAgent } from './subagents/international-wb-agent.js';
import { EuTedAgent } from './subagents/eu-ted-agent.js';

export interface AgentResult {
  sourceName: string;
  tenders: RawScrapedTender[];
  errors: string[];
}

export class BossAgent {
  private targetCountry: string;
  private scanSources: string[];

  constructor(targetCountry: string, scanSources: string[]) {
    this.targetCountry = targetCountry;
    this.scanSources = scanSources;
  }

  public async orchestrate(): Promise<AgentResult[]> {
    logger.info(`[BossAgent] Orchestrating scan for target country: ${this.targetCountry}`);
    const results: AgentResult[] = [];
    
    const agentPromises: Promise<AgentResult[]>[] = [];

    // Depending on the selected country, activate the corresponding agent
    if (this.targetCountry === 'Worldwide' || this.targetCountry === 'Pakistan') {
      agentPromises.push(new PakistanPpraAgent(this.scanSources).execute());
    }
    
    if (this.targetCountry === 'Worldwide' || this.targetCountry === 'United States') {
      agentPromises.push(new UsaSamGovAgent(this.scanSources).execute());
    }

    if (this.targetCountry === 'Worldwide' || this.targetCountry === 'Gulf Region') {
      agentPromises.push(new UaeEsupplyAgent(this.scanSources).execute());
    }

    if (this.targetCountry === 'Worldwide' || this.targetCountry === 'European Union') {
      agentPromises.push(new EuTedAgent(this.scanSources).execute());
    }
    
    if (this.targetCountry === 'Worldwide' || this.targetCountry === 'International') {
      agentPromises.push(new InternationalWbAgent(this.scanSources).execute());
    }

    const settled = await Promise.allSettled(agentPromises);
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.push(...outcome.value);
      } else {
        logger.error(`[BossAgent] Subagent failed: ${outcome.reason}`);
      }
    }

    logger.info(`[BossAgent] Completed orchestration for ${this.targetCountry}`);
    return results;
  }
}
