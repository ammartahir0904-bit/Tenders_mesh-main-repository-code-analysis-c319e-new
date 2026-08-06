// ─── Core Deduplication Utilities ───
// Provides content hashing, similarity detection, and distributed locking

import { createHash, randomUUID } from 'crypto';
import { Pool } from 'pg';
import { configService } from '../config/config.service.js';
import { logger } from './logger.js';
import type { Tender } from '../types.js';

export interface ContentHashInput {
  title: string;
  buying_org: string | null | undefined;
  deadline: string | null | undefined;
  estimated_value: number | null | undefined;
}

export interface SimilarityResult {
  id: string;
  score: number;
  matchType: 'EXACT_CONTENT' | 'FUZZY_TITLE' | 'FUZZY_ORG_DATE';
}

/**
 * Generate stable content hash from tender identifying fields
 * This is the PRIMARY deduplication key - survives URL/source_id changes
 */
export function generateContentHash(input: ContentHashInput): string {
  const normalized = [
    input.title?.toLowerCase().trim() || '',
    input.buying_org?.toLowerCase().trim() || '',
    input.deadline?.split('T')[0] || '', // Date only
    input.estimated_value?.toString() || ''
  ].join('|');
  
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Generate similarity hash (prefix) for fast fuzzy candidate lookup
 */
export function generateSimilarityHash(contentHash: string): string {
  return contentHash.substring(0, 20);
}

/**
 * Distributed lock for preventing concurrent scans of same source
 */
export class ScanLock {
  private pool: Pool | null = null;
  private lockToken: string;
  private sourceName: string;
  private acquired = false;

  constructor(sourceName: string) {
    this.sourceName = sourceName;
    this.lockToken = randomUUID();
  }

  private ensurePool(): Pool | null {
    if (!this.pool) {
      try {
        const dbUrl = configService.getConfig().database.url;
        this.pool = new Pool({ connectionString: dbUrl });
      } catch {
        this.pool = null;
      }
    }
    return this.pool;
  }

  async acquire(timeoutMs = 30000): Promise<boolean> {
    const pool = this.ensurePool();
    if (!pool) {
      // No database available � skip locking, allow scan to proceed
      return true;
    }

    let client;
    try {
      client = await pool.connect();

      // Try to insert lock record
      const result = await client.query(`
        INSERT INTO scan_runs (source_name, status, lock_token)
        VALUES ($1, 'RUNNING', $2)
        ON CONFLICT (source_name) 
        DO UPDATE SET status = 'RUNNING', lock_token = $2, started_at = NOW(), completed_at = NULL, error_message = NULL
        WHERE scan_runs.status != 'RUNNING' OR scan_runs.lock_token IS NULL OR (scan_runs.status = 'RUNNING' AND scan_runs.started_at < NOW() - INTERVAL '5 minutes')
        RETURNING id
      `, [this.sourceName, this.lockToken]);

      if (result.rows.length > 0) {
        this.acquired = true;
        return true;
      }

      return false;
    } catch (err: any) {
      // If the scan_runs table doesn't exist or DB connection fails,
      // skip locking so scans can proceed in in-memory mode.
      console.warn(`[ScanLock] Database lock unavailable for ${this.sourceName}: ${err.message}`);
      return true;
    } finally {
      if (client) client.release();
    }
  }

  async release(status: 'COMPLETED' | 'FAILED', stats: {
    tendersFound: number;
    tendersNew: number;
    tendersSkipped: number;
    tendersUpdated: number;
  }, errorMessage?: string): Promise<void> {
    if (!this.acquired) return;

    const pool = this.pool;
    if (!pool) return;

    let client;
    try {
      client = await pool.connect();
      await client.query(`
        UPDATE scan_runs 
        SET status = $1, completed_at = NOW(), 
            tenders_found = $2, tenders_new = $3, 
            tenders_skipped = $4, tenders_updated = $5,
            error_message = $6,
            lock_token = NULL
        WHERE lock_token = $7
      `, [status, stats.tendersFound, stats.tendersNew, stats.tendersSkipped, stats.tendersUpdated, errorMessage || null, this.lockToken]);
    } catch (err: any) {
      console.warn(`[ScanLock] Failed to release lock for ${this.sourceName}: ${err.message}`);
    } finally {
      if (client) client.release();
    }
  }
}

/**
 * Check for existing tender by content hash (PRIMARY CHECK)
 */
export async function findByContentHash(pool: Pool, contentHash: string): Promise<{ id: string; source: string; source_id: string } | null> {
  const result = await pool.query(`
    SELECT id, source, source_id 
    FROM discovered_tenders 
    WHERE content_hash = $1 
    LIMIT 1
  `, [contentHash]);
  return result.rows[0] || null;
}

/**
 * Check for existing tender by source + source_id (BUSINESS KEY CHECK)
 */
export async function findBySourceKey(pool: Pool, source: string, sourceId: string): Promise<{ id: string; content_hash: string } | null> {
  const result = await pool.query(`
    SELECT id, content_hash 
    FROM discovered_tenders 
    WHERE source = $1 AND source_id = $2 
    LIMIT 1
  `, [source, sourceId]);
  return result.rows[0] || null;
}

/**
 * Find similar tenders for cross-source deduplication (FUZZY CHECK)
 * Uses similarity_hash prefix + title trigram similarity
 */
export async function findSimilarTenders(pool: Pool, tender: Tender, threshold = 0.85): Promise<SimilarityResult[]> {
  const contentHash = generateContentHash({
    title: tender.title,
    buying_org: tender.buying_org,
    deadline: tender.deadline,
    estimated_value: tender.estimated_value
  });
  const similarityHash = generateSimilarityHash(contentHash);

  // First: exact content hash match (different source)
  const exactMatch = await pool.query(`
    SELECT id, 1.0 as score, 'EXACT_CONTENT' as match_type
    FROM discovered_tenders 
    WHERE content_hash = $1 AND source != $2
    LIMIT 1
  `, [contentHash, tender.source]);

  if (exactMatch.rows.length > 0) {
    return exactMatch.rows.map(r => ({ id: r.id as string, score: r.score as number, matchType: r.match_type as 'EXACT_CONTENT' | 'FUZZY_TITLE' | 'FUZZY_ORG_DATE' }));
  }

  // Second: similarity hash prefix match (candidates for fuzzy)
  const candidates = await pool.query(`
    SELECT id, title, buying_org, deadline, estimated_value
    FROM discovered_tenders 
    WHERE similarity_hash = $1 AND source != $2
    LIMIT 50
  `, [similarityHash, tender.source]);

  // Third: calculate similarity for each candidate
  const fuzzyMatches: SimilarityResult[] = [];
  for (const candidate of candidates.rows) {
    const titleSim = await calculateTitleSimilarity(pool, tender.title, candidate.title);
    const orgSim = tender.buying_org && candidate.buying_org 
      ? await calculateTitleSimilarity(pool, tender.buying_org, candidate.buying_org)
      : 0;
    const dateMatch = tender.deadline && candidate.deadline 
      && tender.deadline.split('T')[0] === candidate.deadline.split('T')[0] ? 1 : 0;

    // Weighted score: 50% title, 30% org, 20% date
    const weightedScore = (titleSim * 0.5) + (orgSim * 0.3) + (dateMatch * 0.2);

    if (weightedScore >= threshold) {
      fuzzyMatches.push({
        id: candidate.id,
        score: weightedScore,
        matchType: weightedScore > 0.95 ? 'EXACT_CONTENT' : 
                   titleSim > 0.9 ? 'FUZZY_TITLE' : 'FUZZY_ORG_DATE'
      });
    }
  }

  return fuzzyMatches.sort((a, b) => b.score - a.score).slice(0, 5);
}

async function calculateTitleSimilarity(pool: Pool, title1: string, title2: string): Promise<number> {
  // Use pg_trgm similarity if available, fallback to simple Jaccard
  try {
    const result = await pool.query(`SELECT similarity($1, $2) as sim`, [title1, title2]);
    return parseFloat(result.rows[0]?.sim || '0');
  } catch {
    // Fallback: word-based Jaccard similarity
    const words1 = new Set(title1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(title2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

/**
 * Record similarity match for review
 */
export async function recordSimilarity(pool: Pool, tenderId1: string, tenderId2: string, score: number, matchType: string): Promise<void> {
  // Ensure consistent ordering for unique constraint
  const [id1, id2] = tenderId1 < tenderId2 ? [tenderId1, tenderId2] : [tenderId2, tenderId1];
  
  await pool.query(`
    INSERT INTO tender_similarities (tender_id_1, tender_id_2, similarity_score, match_type)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (tender_id_1, tender_id_2) DO NOTHING
  `, [id1, id2, score, matchType]);
}
