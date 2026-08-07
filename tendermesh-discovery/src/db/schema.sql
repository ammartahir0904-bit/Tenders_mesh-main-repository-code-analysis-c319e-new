-- Schema initialization (safe for existing databases)

CREATE TABLE IF NOT EXISTS tender_sources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) UNIQUE NOT NULL,
    label           VARCHAR(255) NOT NULL,
    region          VARCHAR(50) NOT NULL,
    urls            JSONB NOT NULL DEFAULT '[]',
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    parser_type     VARCHAR(20) NOT NULL DEFAULT 'ai',
    use_playwright  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discovered_tenders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source          VARCHAR(50) NOT NULL,
    source_url      TEXT NOT NULL,
    source_id       VARCHAR(255) NOT NULL,
    title           TEXT NOT NULL,
    buying_org      TEXT,
    category        VARCHAR(255),
    location        VARCHAR(255),
    estimated_value BIGINT,       
    currency        VARCHAR(3) DEFAULT 'PKR',
    deadline        TIMESTAMPTZ,
    mandatory_reqs  JSONB DEFAULT '[]',
    raw_html        TEXT,
    description     TEXT,
    direct_url      TEXT,
    details         JSONB DEFAULT '{}',
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    scraped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source, source_id)
);

CREATE TABLE IF NOT EXISTS tender_scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id       UUID NOT NULL REFERENCES discovered_tenders(id) ON DELETE CASCADE,
    overall_score   DECIMAL(5,4) NOT NULL,
    recommendation  VARCHAR(20) NOT NULL,
    score_reasons   JSONB DEFAULT '{}',
    scored_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tender_id)
);

-- THE MISSING TABLE: Required for React UI and MCP Server
CREATE TABLE IF NOT EXISTS tender_approvals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id       UUID NOT NULL REFERENCES discovered_tenders(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    approved_at     TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tender_id)
);

CREATE TABLE IF NOT EXISTS supplier_registry (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    endpoint    TEXT NOT NULL,
    api_key     TEXT NOT NULL,
    categories  JSONB DEFAULT '[]',
    regions     JSONB DEFAULT '[]',
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tender_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id       UUID NOT NULL REFERENCES discovered_tenders(id) ON DELETE CASCADE,
    supplier_id     UUID REFERENCES supplier_registry(id) ON DELETE SET NULL,
    supplier_name   VARCHAR(255) NOT NULL,
    supplier_endpoint TEXT NOT NULL,
    a2a_task_id     VARCHAR(255),
    payload         JSONB DEFAULT '{}',
    response        JSONB DEFAULT '{}',
    status_code     SMALLINT,
    delivered       BOOLEAN NOT NULL DEFAULT FALSE,
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    next_retry_at   TIMESTAMPTZ,
    last_retry_at   TIMESTAMPTZ,
    attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_deliveries_tender_id ON tender_deliveries(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_deliveries_delivered ON tender_deliveries(delivered);
CREATE INDEX IF NOT EXISTS idx_tender_deliveries_next_retry ON tender_deliveries(next_retry_at) WHERE delivered = FALSE;

-- Safe additive migration for existing databases
ALTER TABLE tender_deliveries ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tender_deliveries ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
ALTER TABLE tender_deliveries ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_tender_deliveries_next_retry ON tender_deliveries(next_retry_at) WHERE delivered = FALSE;

-- Deduplication columns for stable content-based deduplication
ALTER TABLE discovered_tenders 
ADD COLUMN IF NOT EXISTS content_hash CHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS uq_discovered_tenders_content_hash 
ON discovered_tenders(content_hash) 
WHERE content_hash IS NOT NULL;

ALTER TABLE discovered_tenders 
ADD COLUMN IF NOT EXISTS similarity_hash CHAR(20);

CREATE INDEX IF NOT EXISTS idx_discovered_tenders_similarity_hash 
ON discovered_tenders(similarity_hash);

ALTER TABLE discovered_tenders 
ADD COLUMN IF NOT EXISTS updated_by_scan_id UUID;

ALTER TABLE discovered_tenders 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Data integrity columns (safe additive migration for existing databases)
ALTER TABLE discovered_tenders 
ADD COLUMN IF NOT EXISTS direct_url TEXT;

ALTER TABLE discovered_tenders 
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_discovered_tenders_direct_url 
ON discovered_tenders(direct_url);

-- Performance indexes for tender listing and filtering
CREATE INDEX IF NOT EXISTS idx_discovered_tenders_source ON discovered_tenders(source);
CREATE INDEX IF NOT EXISTS idx_discovered_tenders_category ON discovered_tenders(category);
CREATE INDEX IF NOT EXISTS idx_discovered_tenders_status ON discovered_tenders(status);
CREATE INDEX IF NOT EXISTS idx_discovered_tenders_scraped_at ON discovered_tenders(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovered_tenders_source_status ON discovered_tenders(source, status);

CREATE TABLE IF NOT EXISTS supplier_assessments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id       UUID REFERENCES discovered_tenders(id) ON DELETE CASCADE,
    supplier_name   VARCHAR(255),
    a2a_task_id     VARCHAR(255),
    fit_score       DECIMAL(4,3),
    intends_to_bid  BOOLEAN,
    met_requirements JSONB DEFAULT '[]',
    gaps            JSONB DEFAULT '[]',
    received_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Audit and distributed locking for scan operations
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
    lock_token      UUID,
    UNIQUE(source_name)
);

CREATE INDEX IF NOT EXISTS idx_scan_runs_status ON scan_runs(status);
CREATE INDEX IF NOT EXISTS idx_scan_runs_source ON scan_runs(source_name);
CREATE INDEX IF NOT EXISTS idx_scan_runs_started ON scan_runs(started_at DESC);

-- Cross-source duplicate tracking for manual review
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

-- Seed Supplier (update endpoint to match your supplier agent)
INSERT INTO supplier_registry (name, endpoint, api_key, categories, regions)
SELECT 
    'Acme IT Solutions',
    'http://localhost:8000/tenders/receive',
    'tendermesh-shared-secret',
    '["IT Equipment", "IT Services", "Software Development"]',
    '["Pakistan", "UAE"]'
WHERE NOT EXISTS (
    SELECT 1 FROM supplier_registry WHERE name = 'Acme IT Solutions'
);
