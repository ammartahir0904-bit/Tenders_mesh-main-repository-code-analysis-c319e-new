-- ─── Deduplication Enhancements Migration ───
-- Run this migration to add all deduplication infrastructure

-- 1. Add content_hash for stable content-based deduplication (PRIMARY KEY)
ALTER TABLE discovered_tenders 
ADD COLUMN IF NOT EXISTS content_hash CHAR(64);

-- Unique index for content-based deduplication - this is the PRIMARY dedup mechanism
CREATE UNIQUE INDEX IF NOT EXISTS uq_discovered_tenders_content_hash 
ON discovered_tenders(content_hash) 
WHERE content_hash IS NOT NULL;

-- 2. Add similarity_hash prefix for fast fuzzy candidate lookup
ALTER TABLE discovered_tenders 
ADD COLUMN IF NOT EXISTS similarity_hash CHAR(20);

CREATE INDEX IF NOT EXISTS idx_discovered_tenders_similarity_hash 
ON discovered_tenders(similarity_hash);

-- 3. Add updated_by_scan_id for audit trail
ALTER TABLE discovered_tenders 
ADD COLUMN IF NOT EXISTS updated_by_scan_id UUID;

-- 4. Create scan_runs table for audit/race condition tracking
CREATE TABLE IF NOT EXISTS scan_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name     VARCHAR(50) NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED
    tenders_found   INTEGER DEFAULT 0,
    tenders_new     INTEGER DEFAULT 0,
    tenders_skipped INTEGER DEFAULT 0,
    tenders_updated INTEGER DEFAULT 0,
    error_message   TEXT,
    lock_token      UUID  -- For distributed locking
);

CREATE INDEX IF NOT EXISTS idx_scan_runs_status ON scan_runs(status);
CREATE INDEX IF NOT EXISTS idx_scan_runs_source ON scan_runs(source_name);
CREATE INDEX IF NOT EXISTS idx_scan_runs_started ON scan_runs(started_at DESC);

-- 5. Create tender_similarities for cross-source duplicate detection
CREATE TABLE IF NOT EXISTS tender_similarities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id_1         UUID NOT NULL REFERENCES discovered_tenders(id) ON DELETE CASCADE,
    tender_id_2         UUID NOT NULL REFERENCES discovered_tenders(id) ON DELETE CASCADE,
    similarity_score    DECIMAL(5,4) NOT NULL,  -- 0.0000 to 1.0000
    match_type          VARCHAR(30) NOT NULL,   -- 'EXACT_CONTENT', 'FUZZY_TITLE', 'FUZZY_ORG_DATE'
    detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed            BOOLEAN DEFAULT FALSE,
    is_duplicate        BOOLEAN DEFAULT NULL,   -- NULL=unreviewed, TRUE=confirmed dup, FALSE=false positive
    notes               TEXT,
    reviewed_at         TIMESTAMPTZ,
    UNIQUE(tender_id_1, tender_id_2)
);

CREATE INDEX IF NOT EXISTS idx_tender_similarities_score ON tender_similarities(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_tender_similarities_unreviewed ON tender_similarities(reviewed) WHERE reviewed = FALSE;
CREATE INDEX IF NOT EXISTS idx_tender_similarities_tender1 ON tender_similarities(tender_id_1);
CREATE INDEX IF NOT EXISTS idx_tender_similarities_tender2 ON tender_similarities(tender_id_2);

-- 6. Enable pg_trgm extension for better fuzzy matching (optional but recommended)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 7. Add GIN index for trigram similarity if pg_trgm is enabled
-- CREATE INDEX IF NOT EXISTS idx_discovered_tenders_title_trgm ON discovered_tenders USING GIN (title gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_discovered_tenders_buying_org_trgm ON discovered_tenders USING GIN (buying_org gin_trgm_ops);