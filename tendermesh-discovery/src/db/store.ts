// ─── TenderStore with Full Deduplication ───

import { Pool } from 'pg';
import { configService } from '../config/config.service.js';
import { logger } from '../utils/logger.js';
import { sseManager } from '../routes/events.routes.js';
import { 
  generateContentHash, 
  generateSimilarityHash, 
  findByContentHash, 
  findBySourceKey, 
  findSimilarTenders, 
  recordSimilarity 
} from '../utils/deduplication.js';
import type { Tender } from '../types.js';

interface ScoreResult {
  overall: number;
  recommendation: string;
  reasons: string[];
}

interface StoredTender {
  id: string;
  tender: Tender;
  score: ScoreResult;
  scraped_at: string;
}

// In-memory stores (for in-memory mode and cache)
const memoryStore: Map<string, StoredTender> = new Map();
const memoryContentHashIndex: Map<string, string> = new Map(); // content_hash -> memory_id
const memorySourceKeyIndex: Map<string, string> = new Map();   // source:source_id -> memory_id

export class TenderStore {
  private pool: Pool;

  constructor(dbUrl: string) {
    if (!dbUrl || dbUrl === 'in-memory') {
      throw new Error('TenderStore requires a valid PostgreSQL connection string (DATABASE_URL)');
    }
    this.pool = new Pool({ connectionString: dbUrl });
  }

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // LAYER 1: PRIMARY EXISTENCE CHECK - Content Hash
  // ═══════════════════════════════════════════════════════════════
  async existsByContentHash(tender: Tender): Promise<{ exists: boolean; existingId?: string; existingSource?: string }> {
    const contentHash = this.computeContentHash(tender);
    const found = await findByContentHash(this.pool, contentHash);
    return { exists: !!found, existingId: found?.id, existingSource: found?.source };
  }

  // ═══════════════════════════════════════════════════════════════
  // LAYER 2: BUSINESS KEY CHECK - Source + Source_ID
  // ═══════════════════════════════════════════════════════════════
  async existsBySourceKey(source: string, sourceId: string): Promise<{ exists: boolean; existingId?: string; contentHash?: string }> {
    const found = await findBySourceKey(this.pool, source, sourceId);
    return { exists: !!found, existingId: found?.id, contentHash: found?.content_hash };
  }

  // ═══════════════════════════════════════════════════════════════
  // LAYER 3: FUZZY MATCH - Cross-Source Similarity
  // ══════════════════════════════════════════════════════════════
  async findSimilar(tender: Tender, threshold = 0.85): Promise<Array<{ id: string; score: number; matchType: string }>> {
    return await findSimilarTenders(this.pool, tender, threshold);
  }

  private simpleSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN SAVE - With Full Deduplication Logic
  // ═══════════════════════════════════════════════════════════════
  async save(tender: Tender, score: ScoreResult): Promise<{ 
    id: string; 
    action: 'INSERTED' | 'SKIPPED_DUPLICATE' | 'UPDATED' | 'SIMILAR_FOUND';
    similarTenders?: Array<{ id: string; score: number; matchType: string }>;
  }> {
    const contentHash = this.computeContentHash(tender);
    const similarityHash = generateSimilarityHash(contentHash);

    // ─── STEP 1: Check Content Hash (Primary) ───
    const contentCheck = await this.existsByContentHash(tender);
    if (contentCheck.exists) {
      await this.recordSimilarity(contentCheck.existingId!, `${tender.source}:${tender.source_id}`, 1.0, 'EXACT_CONTENT');
      return { 
        id: contentCheck.existingId!, 
        action: 'SKIPPED_DUPLICATE',
        similarTenders: [{ id: contentCheck.existingId!, score: 1.0, matchType: 'EXACT_CONTENT' }]
      };
    }

    // ─── STEP 2: Check Source Key (Business Key) ───
    const sourceCheck = await this.existsBySourceKey(tender.source, tender.source_id);
    if (sourceCheck.exists) {
      return await this.updateExisting(sourceCheck.existingId!, tender, score, contentHash, similarityHash);
    }

    // ─── STEP 3: Check Fuzzy Similarity (Cross-Source) ───
    const similar = await this.findSimilar(tender, 0.85);
    if (similar.length > 0) {
      for (const sim of similar) {
        await this.recordSimilarity(sim.id, `${tender.source}:${tender.source_id}`, sim.score, sim.matchType);
      }
    }

    // ─── STEP 4: Insert New ───
    return await this.insertNew(tender, score, contentHash, similarityHash, similar);
  }

  private async insertNew(
    tender: Tender, 
    score: ScoreResult, 
    contentHash: string, 
    similarityHash: string,
    similar: Array<{ id: string; score: number; matchType: string }>
  ): Promise<{ id: string; action: 'INSERTED'; similarTenders?: typeof similar }> {
    


    let client: any = null;
    try {
      if (!this.pool) throw new Error('No database connection');
      client = await this.pool.connect();
      await client.query('BEGIN');

      const tenderRes = await client.query(`
        INSERT INTO discovered_tenders 
        (source, source_url, source_id, title, buying_org, category, location, 
         estimated_value, currency, deadline, mandatory_reqs, raw_html, description, status,
         content_hash, similarity_hash, direct_url, details)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING id
      `, [
        tender.source,
        tender.source_url,
        tender.source_id,
        tender.title,
        tender.buying_org || null,
        tender.category || null,
        tender.location || null,
        tender.estimated_value || null,
        tender.currency || 'PKR',
        tender.deadline || null,
        JSON.stringify(tender.mandatory_reqs || []),
        tender.raw_html || null,
        tender.description || null,
        'ACTIVE',
        contentHash,
        similarityHash,
        tender.direct_url || null,
        JSON.stringify(tender.details || {})
      ]);

      const tenderId = tenderRes.rows[0].id;

      await client.query(`
        INSERT INTO tender_scores (tender_id, overall_score, recommendation, score_reasons)
        VALUES ($1, $2, $3, $4)
      `, [tenderId, score.overall, score.recommendation, JSON.stringify(score.reasons || [])]);

      await client.query(`
        INSERT INTO tender_approvals (tender_id, status)
        VALUES ($1, 'PENDING')
        ON CONFLICT (tender_id) DO NOTHING
      `, [tenderId]);

      await client.query('COMMIT');
      
      // Update memory store as well
      memoryStore.set(tenderId, {
        id: tenderId,
        tender,
        score,
        scraped_at: new Date().toISOString(),
      });
      memoryContentHashIndex.set(contentHash, tenderId);
      memorySourceKeyIndex.set(`${tender.source}:${tender.source_id}`, tenderId);
      
      return { id: tenderId, action: 'INSERTED', similarTenders: similar };

    } catch (err: any) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch {}
      }
      logger.error('DB Insert failed', { error: err.message });
      sseManager.broadcast('SCAN_ERROR', {
        type: 'SCAN_ERROR',
        source: tender.source,
        error: `Database Insert Error: ${err.message}`,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Database Insert Error: ${err.message}`);
    } finally {
      if (client) {
        try { client.release(); } catch {}
      }
    }
  }

  private async updateExisting(
    existingId: string,
    tender: Tender,
    score: ScoreResult,
    contentHash: string,
    similarityHash: string
  ): Promise<{ id: string; action: 'UPDATED' }> {
    


    let client: any = null;
    try {
      if (!this.pool) throw new Error('No database connection');
      client = await this.pool.connect();
      await client.query('BEGIN');

      await client.query(`
        UPDATE discovered_tenders 
        SET title = $2, buying_org = $3, category = $4, location = $5,
            estimated_value = $6, currency = $7, deadline = $8,
            mandatory_reqs = $9, raw_html = $10, updated_at = NOW(),
            content_hash = $11, similarity_hash = $12,
            direct_url = $13, details = $14
        WHERE id = $1
        AND (
          SELECT status FROM tender_approvals WHERE tender_id = $1
        ) = 'PENDING'
      `, [
        existingId,
        tender.title,
        tender.buying_org || null,
        tender.category || null,
        tender.location || null,
        tender.estimated_value || null,
        tender.currency || 'PKR',
        tender.deadline || null,
        JSON.stringify(tender.mandatory_reqs || []),
        tender.raw_html || null,
        contentHash,
        similarityHash,
        tender.direct_url || null,
        JSON.stringify(tender.details || {})
      ]);

      await client.query(`
        INSERT INTO tender_scores (tender_id, overall_score, recommendation, score_reasons)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tender_id)
        DO UPDATE SET 
          overall_score = EXCLUDED.overall_score,
          recommendation = EXCLUDED.recommendation,
          score_reasons = EXCLUDED.score_reasons
      `, [existingId, score.overall, score.recommendation, JSON.stringify(score.reasons || [])]);

      await client.query('COMMIT');
      
      // Update memory store as well
      const stored = memoryStore.get(existingId);
      if (stored) {
        stored.tender = { ...stored.tender, ...tender };
        stored.score = score;
        stored.scraped_at = new Date().toISOString();
        memoryContentHashIndex.set(contentHash, existingId);
      } else {
         memoryStore.set(existingId, {
           id: existingId,
           tender,
           score,
           scraped_at: new Date().toISOString()
         });
         memoryContentHashIndex.set(contentHash, existingId);
         memorySourceKeyIndex.set(`${tender.source}:${tender.source_id}`, existingId);
      }
      
      return { id: existingId, action: 'UPDATED' };

    } catch (err: any) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch {}
      }
      logger.error('DB Update failed', { error: err.message });
      throw new Error(`Database Update Error: ${err.message}`);
    } finally {
      if (client) {
        try { client.release(); } catch {}
      }
    }
  }

  private async recordSimilarity(tenderId1: string, tenderId2: string, score: number, matchType: string): Promise<void> {
    await recordSimilarity(this.pool, tenderId1, tenderId2, score, matchType);
  }

  private computeContentHash(tender: Tender): string {
    return generateContentHash({
      title: tender.title,
      buying_org: tender.buying_org ?? null,
      deadline: tender.deadline ?? null,
      estimated_value: tender.estimated_value ?? null
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERY METHODS (Optimized with batching)
  // ═══════════════════════════════════════════════════════════════
  async getAll(): Promise<StoredTender[]> {
    
    const res = await this.pool.query(`
      SELECT t.*, s.overall_score, s.recommendation, s.score_reasons 
      FROM discovered_tenders t
      LEFT JOIN tender_scores s ON t.id = s.tender_id
      ORDER BY t.scraped_at DESC
    `);
    return this.mapRows(res.rows);
  }

  async getBatch(offset: number, limit: number): Promise<StoredTender[]> {
    const res = await this.pool.query(`
      SELECT t.*, s.overall_score, s.recommendation, s.score_reasons 
      FROM discovered_tenders t
      LEFT JOIN tender_scores s ON t.id = s.tender_id
      ORDER BY t.scraped_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    return this.mapRows(res.rows);
  }

  async getCount(): Promise<number> {
    const res = await this.pool.query('SELECT COUNT(*) FROM discovered_tenders');
    return parseInt(res.rows[0].count, 10);
  }

  async getById(id: string): Promise<StoredTender | null> {
    const res = await this.pool.query(`
      SELECT t.*, s.overall_score, s.recommendation, s.score_reasons 
      FROM discovered_tenders t
      LEFT JOIN tender_scores s ON t.id = s.tender_id
      WHERE t.id = $1
    `, [id]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      tender: {
        source: row.source,
        source_url: row.source_url,
        source_id: row.source_id,
        title: row.title,
        buying_org: row.buying_org,
        category: row.category,
        location: row.location,
        estimated_value: row.estimated_value,
        currency: row.currency,
        deadline: row.deadline,
        mandatory_reqs: typeof row.mandatory_reqs === 'string' ? JSON.parse(row.mandatory_reqs) : row.mandatory_reqs,
        raw_html: row.raw_html,
        description: row.description,
        direct_url: row.direct_url,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {}),
      },
      score: {
        overall: parseFloat(row.overall_score),
        recommendation: row.recommendation,
        reasons: typeof row.score_reasons === 'string' ? JSON.parse(row.score_reasons) : (row.score_reasons || {}),
      },
      scraped_at: (row.scraped_at?.toISOString ? row.scraped_at.toISOString() : (row.scraped_at || new Date().toISOString())) as string,
    };
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM discovered_tenders WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  private mapRows(rows: any[]): StoredTender[] {
    return rows.map(row => ({
      id: row.id,
      tender: {
        source: row.source,
        source_url: row.source_url,
        source_id: row.source_id,
        title: row.title,
        buying_org: row.buying_org,
        category: row.category,
        location: row.location,
        estimated_value: row.estimated_value,
        currency: row.currency,
        deadline: row.deadline,
        mandatory_reqs: typeof row.mandatory_reqs === 'string' ? JSON.parse(row.mandatory_reqs) : row.mandatory_reqs,
        raw_html: row.raw_html,
        description: row.description,
        direct_url: row.direct_url,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {}),
      },
      score: {
        overall: parseFloat(row.overall_score),
        recommendation: row.recommendation,
        reasons: typeof row.score_reasons === 'string' ? JSON.parse(row.score_reasons) : row.score_reasons,
      },
      scraped_at: row.scraped_at.toISOString ? row.scraped_at.toISOString() : row.scraped_at,
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // LAYER 5: CACHE SYNC - Load from Database
  // ═══════════════════════════════════════════════════════════════
  async loadFromDatabase(): Promise<{ loaded: number; errors: string[] }> {
    if (!this.pool) {
      return { loaded: 0, errors: ['Not connected to database'] };
    }

    const errors: string[] = [];
    let loaded = 0;
    let offset = 0;
    const batchSize = 500;

    try {
      while (true) {
        try {
          const batch = await this.getBatch(offset, batchSize);
          if (batch.length === 0) break;

          for (const stored of batch) {
            const contentHash = this.computeContentHash(stored.tender);
            const similarityHash = generateSimilarityHash(contentHash);
            const id = stored.id;

            memoryStore.set(id, stored);
            memoryContentHashIndex.set(contentHash, id);
            memorySourceKeyIndex.set(`${stored.tender.source}:${stored.tender.source_id}`, id);
            loaded++;
          }

          console.log(`[TenderStore] Loaded ${loaded} tenders from database...`);
          offset += batchSize;
        } catch (err: any) {
          errors.push(`Batch error at offset ${offset}: ${err.message}`);
          break;
        }
      }

      console.log(`[TenderStore] Database load complete: ${loaded} tenders loaded, ${errors.length} errors`);
      return { loaded, errors };
    } catch (err: any) {
      errors.push(`Fatal error during database load: ${err.message}`);
      return { loaded, errors };
    }
  }

  async close() {
    if (this.pool) await this.pool.end();
  }
}
