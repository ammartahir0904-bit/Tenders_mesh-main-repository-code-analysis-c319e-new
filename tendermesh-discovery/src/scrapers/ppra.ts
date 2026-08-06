import type { RawScrapedTender } from '../types.js';
import { fetchWithTimeout } from '../services/http-client.js';
import { withRetry } from '../services/retry.js';
import { logger } from '../utils/logger.js';

export async function scrapePPRA(): Promise<RawScrapedTender[]> {
  // Use Pipeline PPRA_AI source which uses AI for extraction.
  return [];
}
