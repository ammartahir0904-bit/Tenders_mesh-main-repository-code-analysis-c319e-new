// ─── Frontend TypeScript Interfaces (mirrors DB schema) ───

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DECIDED';
export type TenderStatus = 'ACTIVE' | 'CLOSED' | 'CANCELLED';
export type Recommendation = 'STRONG_YES' | 'YES' | 'MAYBE' | 'NO';

/** Mirrors `discovered_tenders` table */
export interface Tender {
  id: string;                   // UUID
  source: string;
  source_url: string;
  source_id: string;
  title: string;
  buying_org?: string;
  category?: string;
  location?: string;
  estimated_value: number | null;
  currency: string;             // default 'PKR'
  deadline: string | null;      // ISO-8601
  mandatory_reqs: string[];
  raw_html?: string;
  description?: string | null;
  status: TenderStatus;
  scraped_at: string;           // ISO-8601
  updated_at: string;           // ISO-8601
}

/** Mirrors `tender_scores` table */
export interface TenderScore {
  id: string;
  tender_id: string;
  overall_score: number;        // 0–1 (DECIMAL(5,4))
  recommendation: Recommendation;
  score_reasons: Record<string, number>; // e.g. { relevance: 0.8, capacity: 0.7, ... }
  scored_at: string;
}

/** Mirrors `tender_approvals` table */
export interface TenderApproval {
  id: string;
  tender_id: string;
  status: ApprovalStatus;
  approved_at: string | null;
  notes?: string;
  created_at: string;
}

export interface DeliveryRecord {
  id: string;
  tender_id: string;
  supplier_name?: string;
  delivered: boolean;
  attempted_at?: string;
  error_message?: string;
}

/** Composite type returned by GET /api/tenders (joined view) */
export interface TenderWithDetails extends Tender {
  score?: TenderScore;
  approval?: TenderApproval;
  deliveries?: DeliveryRecord[];
}

/** Filters used by the Discovery inbox */
export interface TenderFilters {
  search?: string;
  source?: string;
  category?: string;
  location?: string;
  status?: TenderStatus;
  approval_status?: ApprovalStatus;
  recommendation?: Recommendation;
  min_score?: number;
  deadline_from?: string;
  deadline_to?: string;
  sort_by?: 'deadline' | 'scraped_at' | 'overall_score' | 'estimated_value';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

/** Paginated response envelope */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Settings / Supplier profile */
export interface SupplierProfile {
  company_name: string;
  categories: string[];
  locations: string[];
  certifications: string[];
  min_value?: number;
  max_value?: number;
}

/** BYOK (Bring Your Own Key) configuration */
export interface ApiKeyConfig {
  openai_key?: string;
  anthropic_key?: string;
  custom_endpoint?: string;
}

export interface SupplierMachine {
  id: string;
  name: string;
  endpoint: string;
  api_key: string;
  categories: string[];
  regions: string[];
  is_active: boolean;
  created_at: string;
}

export interface SupplierTestResult {
  success: boolean;
  status?: number;
  error?: string;
}

export interface TenderSource {
  id: string;
  name: string;
  label: string;
  region: 'PAKISTAN_FEDERAL' | 'PAKISTAN_PROVINCIAL' | 'INTERNATIONAL';
  urls: string[];
  enabled: boolean;
  parser_type: 'ai' | 'ppra_ai';
  use_playwright: boolean;
  created_at: string;
}

/** SSE event types for live feed */
export interface LiveEvent {
  id: string;
  type: 'NEW_TENDER' | 'SCORE_UPDATED' | 'APPROVAL_CHANGED' | 'SCAN_STARTED' | 'SCAN_COMPLETED' | 'DUPLICATE_TENDER' | 'SCAN_INFO' | 'SCAN_ERROR';
  message: string;
  tender_id?: string;
  source?: string;
  error?: string;
  timestamp: string;
}
