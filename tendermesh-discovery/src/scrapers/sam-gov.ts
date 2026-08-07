import type { RawScrapedTender } from '../types.js';
import { fetchWithTimeout } from '../services/http-client.js';
import { withRetry } from '../services/retry.js';
import { config } from '../config/env.js';

export async function scrapeSAMGov(): Promise<RawScrapedTender[]> {
  console.log('[Scraper] Fetching SAM.gov (Free Federal API)...');
  const apiKey = config.samGovApiKey || 'DEMO_KEY';

  const response = await withRetry(() => fetchWithTimeout(`https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: 'IT Services',
      limit: 5,
      offset: 0,
      postedFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Last 30 days
    }),
  }, 20000), { retries: 2, delayMs: 1000 });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      console.warn('[Scraper] SAM.gov API requires a valid API key or the endpoint structure has changed. Returning empty array.');
      return [];
    }
    throw new Error(`SAM.gov API failed: ${response.status}`);
  }
  
  const data = await response.json();
  const results: RawScrapedTender[] = [];

  for (const opp of data.opportunities || []) {
    // Convert SAM.gov JSON into text so our AI Parser can extract it uniformly
    const textRepresentation = `
      <h1>${opp.title}</h1>
      <p><strong>Organization:</strong> ${opp.department || 'Unknown'}</p>
      <p><strong>Category:</strong> ${opp.productServiceCode?.code || 'IT Services'}</p>
      <p><strong>Location:</strong> ${opp.placeOfPerformance?.city || 'Remote'}</p>
      <p><strong>Estimated Value:</strong> ${opp.estimatedValue || 'Not specified'} USD</p>
      <p><strong>Last Date:</strong> ${opp.responseDeadline || 'Not specified'}</p>
      <p><strong>Description:</strong> ${opp.description || ''}</p>
    `;

    const directUrl = opp?.links?.[0]?.href || `https://sam.gov/opp/${opp.id}`;
    results.push({
      source_url: directUrl,
      source_id: opp.id || `sam-${Math.random().toString(36).substring(7)}`,
      raw_html: textRepresentation,
      direct_url: directUrl,
      details: {
        specs: opp.description || '',
        eligibility: opp.eligibility || undefined,
        submission_process: opp.submissionProcess || undefined,
        contact_info: opp.contactInfo || undefined,
        evaluation_criteria: opp.evaluationCriteria || undefined,
      },
    });
  }

  console.log(`[Scraper] Found ${results.length} SAM.gov tenders.`);
  return results;
}