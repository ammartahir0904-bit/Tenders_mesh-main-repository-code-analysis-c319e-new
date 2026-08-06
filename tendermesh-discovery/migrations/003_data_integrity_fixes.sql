-- ─── Phase 1: Critical Data Integrity & Architecture Fixes ───
-- Adds direct_url column and details JSONB column safely

-- FIX 2: Add direct_url column for exact tender detail links
ALTER TABLE discovered_tenders 
ADD COLUMN IF NOT EXISTS direct_url TEXT;

-- FIX 8: Add details JSONB column for deep tender information
ALTER TABLE discovered_tenders 
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';

-- Create a SAFE standard index for direct_url lookups (No extensions required)
CREATE INDEX IF NOT EXISTS idx_discovered_tenders_direct_url 
ON discovered_tenders (direct_url);

-- Add comment to document purpose
COMMENT ON COLUMN discovered_tenders.direct_url IS 'Exact URL to the tender detail page (not listing page)';
COMMENT ON COLUMN discovered_tenders.details IS 'Deep tender details: specs, eligibility, submission_process, contact_info, budget_breakdown, evaluation_criteria';