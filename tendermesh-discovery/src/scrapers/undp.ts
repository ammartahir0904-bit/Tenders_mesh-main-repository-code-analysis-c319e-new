import type { RawScrapedTender } from '../types.js';
import { fetchWithTimeout } from '../services/http-client.js';
import { withRetry } from '../services/retry.js';

export async function scrapeUNDP(): Promise<RawScrapedTender[]> {
  console.log('[Scraper] Fetching UNDP Procurement API (Free, No Key Required)...');

  console.log('[Scraper] UNDP Procurement API is deprecated (requires UNGM portal). Skipping.');
  return [];
}