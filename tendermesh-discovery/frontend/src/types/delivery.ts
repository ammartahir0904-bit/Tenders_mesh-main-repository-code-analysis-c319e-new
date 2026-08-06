// ─── Delivery Status Types ───

export interface DeliveryRecord {
  id: string;
  tender_id: string;
  supplier_id: string | null;
  supplier_name: string;
  supplier_endpoint: string;
  a2a_task_id: string;
  payload: Record<string, unknown>;
  response: Record<string, unknown>;
  status_code: number | null;
  delivered: boolean;
  error_message: string | null;
  attempted_at: string;
}

export interface DeliveryStats {
  total: number;
  delivered: number;
  failed: number;
  lastAttempt: string | null;
}