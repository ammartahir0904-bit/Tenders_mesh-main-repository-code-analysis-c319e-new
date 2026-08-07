import type { RawScrapedTender } from '../types.js';
import { fetchWithTimeout } from '../services/http-client.js';
import { withRetry } from '../services/retry.js';
import { logger } from '../utils/logger.js';

export async function scrapeWorldBank(): Promise<RawScrapedTender[]> {
  console.log('[Scraper] Fetching World Bank Procurement (Free API)...');

  const response = await withRetry(() => fetchWithTimeout('https://search.worldbank.org/api/v2/projects?format=json', {}, 20000), { retries: 2, delayMs: 1000 });
  
  if (!response.ok) throw new Error(`World Bank API failed: ${response.status}`);
  
  const data = await response.json();
  const results: RawScrapedTender[] = [];

  const projects = data.projects || {};
  for (const key of Object.keys(projects)) {
    const notice = projects[key];
    const textRepresentation = `
      <h1>${notice.project_name || 'World Bank Tender'}</h1>
      <p><strong>Organization:</strong> ${notice.borrower || 'World Bank'}</p>
      <p><strong>Category:</strong> ${notice.sector1?.Name || 'Consulting/Goods'}</p>
      <p><strong>Location:</strong> ${notice.countryname?.[0] || notice.regionname || 'Global'}</p>
      ${notice.closingdate ? `<p><strong>Deadline:</strong> ${notice.closingdate}</p>` : ''}
      <p><strong>Value:</strong> ${notice.totalamt ? `USD ${notice.totalamt}` : 'Not specified'}</p>
      <p><strong>Description:</strong> ${notice.project_name || ''}</p>
    `;

    const directUrl = notice.url || `https://projects.worldbank.org`;
    results.push({
      source_url: directUrl,
      source_id: `wb-${notice.id || Math.random().toString(36).substring(7)}`,
      raw_html: textRepresentation,
      direct_url: directUrl,
      details: {
        specs: notice.project_name || '',
        eligibility: notice.borrower || undefined,
        submission_process: notice.closingdate || undefined,
        contact_info: notice.contact || undefined,
        evaluation_criteria: notice.sector1?.Name || undefined,
      },
    });
  }

  console.log(`[Scraper] Found ${results.length} World Bank tenders.`);
  return results;
}