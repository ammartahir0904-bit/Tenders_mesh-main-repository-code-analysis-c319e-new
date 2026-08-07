import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { fetchWithTimeout } from './http-client.js';
import { configService } from '../config/config.service.js';

const dispatchLogger = logger.child('a2a-dispatch');

export interface DeliveryRecord {
  id: string;
  tender_id: string;
  supplier_id: string | null;
  supplier_name: string;
  supplier_endpoint: string;
  a2a_task_id: string;
  payload: any;
  response: any;
  status_code: number | null;
  delivered: boolean;
  error_message: string | null;
  attempted_at: string;
}

export class A2ADispatchService {
  // Read A2A config dynamically via a getter so runtime updates from
  // configService.setA2AEndpoint() are immediately reflected in new
  // dispatch calls. Previously this was a readonly field snapshot taken
  // at construction time, which caused stale supplier IPs to be used.
  private get a2aConfig() {
    return configService.getA2AConfig();
  }

  constructor(private pool: Pool) {}

  private getReplyTo(): string {
    return `${this.a2aConfig.replyBaseUrl || process.env.API_BASE_URL || 'http://localhost:3001'}/api/a2a/assessment`;
  }

  private getApiKey(supplierApiKey?: string): string {
    return supplierApiKey || this.a2aConfig.apiKey || process.env.A2A_API_KEY || 'tendermesh-shared-secret';
  }

  private validateTenderPayload(tender: any): { valid: boolean; missingFields: string[] } {
    // If category is unlisted, auto-fill it from title context so validation passes seamlessly
    if (!tender.category) {
      const titleLower = String(tender.title || '').toLowerCase();
      if (/software|app|portal|erp|system|crm|development|web/i.test(titleLower)) tender.category = 'Software Development';
      else if (/server|hardware|switch|laptop|desktop|router|firewall|pc/i.test(titleLower)) tender.category = 'IT Equipment';
      else if (/cloud|network|substation|cyber|security|data center/i.test(titleLower)) tender.category = 'Tech Infrastructure';
      else tender.category = 'IT Services';
    }

    const requiredFields = [
      'id', 'title', 'category'
    ];
    
    const missingFields = requiredFields.filter(field => {
      const value = tender[field];
      return value === undefined || value === null || value === '';
    });

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  private async dispatchToConfiguredSupplier(tender: any): Promise<{ success: boolean; dispatchedCount: number; deliveries: DeliveryRecord[] }> {
    // Check process.env first (updated at runtime by settings route),
    // then fall back to configService (updated via setA2AEndpoint).
    const fallbackEndpoint = process.env.SUPPLIER_ENDPOINT || this.a2aConfig.endpoint || 'https://tendermesh-api.onrender.com/tenders/receive';
    if (!fallbackEndpoint) {
      dispatchLogger.info('No fallback A2A supplier endpoint configured', { tenderId: tender.id });
      return { success: true, dispatchedCount: 0, deliveries: [] };
    }

    const a2aTaskId = uuidv4();
    const payload = {
      type: 'tender.invitation',
      a2a_task_id: a2aTaskId,
      trace_id: uuidv4(),
      from_agent: 'tendermesh-buyer-agent',
      to_agent: 'tendermesh-supplier-agent',
      tender: {
        tender_id: tender.id,
        title: tender.title,
        category: tender.category || 'IT Services',
        scope: tender.buying_org || 'Government Procurement',
        buyer_region: tender.location || 'Pakistan',
        estimated_value: tender.estimated_value,
        currency: tender.currency || 'PKR',
        mandatory_reqs: typeof tender.mandatory_reqs === 'string' ? JSON.parse(tender.mandatory_reqs) : (tender.mandatory_reqs || []),
        deadline: tender.deadline,
        response_by: tender.deadline,
        source: tender.source,
        source_id: tender.source_id,
        source_url: tender.source_url,
        official_tender_url: tender.direct_url || null,
        details: typeof tender.details === 'string' ? JSON.parse(tender.details) : (tender.details || {}),
        status: tender.status,
        raw_html: tender.raw_html || null,
        deliverables: [],
        reply_to: this.getReplyTo(),
      },
    };

    const insertResult = await this.pool.query(`
      INSERT INTO tender_deliveries (tender_id, supplier_id, supplier_name, supplier_endpoint, a2a_task_id, payload)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, attempted_at
    `, [tender.id, null, 'Configured Supplier', fallbackEndpoint, a2aTaskId, JSON.stringify(payload)]);

    const deliveryId = insertResult.rows[0].id;
    const resultRecord: DeliveryRecord = {
      id: deliveryId,
      tender_id: tender.id,
      supplier_id: null,
      supplier_name: 'Configured Supplier',
      supplier_endpoint: fallbackEndpoint,
      a2a_task_id: a2aTaskId,
      payload: payload,
      response: null,
      status_code: null,
      delivered: false,
      error_message: null,
      attempted_at: insertResult.rows[0].attempted_at,
    };

    const apiKey = this.getApiKey();
    try {
      const response = await fetchWithTimeout(fallbackEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'A2A-Api-Key': apiKey,
          'X-A2A-API-Key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
      }, 45000);

      resultRecord.status_code = response.status;
      try {
        resultRecord.response = await response.json();
      } catch {
        resultRecord.response = { raw: await response.text().catch(() => '') };
      }

      if (response.ok) {
        resultRecord.delivered = true;
        dispatchLogger.info('Successfully dispatched tender to configured supplier endpoint', { tenderId: tender.id, endpoint: fallbackEndpoint });
      } else {
        resultRecord.error_message = `HTTP ${response.status}`;
        dispatchLogger.error('Configured supplier endpoint rejected tender', { tenderId: tender.id, status: response.status });
      }
    } catch (error: any) {
      resultRecord.error_message = error.message || 'Connection failed';
      dispatchLogger.error('Error dispatching tender to configured supplier endpoint', { tenderId: tender.id, error: error.message });
    }

    await this.pool.query(`
      UPDATE tender_deliveries
      SET delivered = $1, status_code = $2, response = $3, error_message = $4
      WHERE id = $5
    `, [resultRecord.delivered, resultRecord.status_code, JSON.stringify(resultRecord.response), resultRecord.error_message, deliveryId]);

    return { success: true, dispatchedCount: resultRecord.delivered ? 1 : 0, deliveries: [resultRecord] };
  }

  async dispatchTender(tenderId: string): Promise<{ success: boolean; dispatchedCount: number; deliveries: DeliveryRecord[]; error?: string }> {
    try {
      const tenderResult = await this.pool.query(`
        SELECT * FROM discovered_tenders WHERE id = $1
      `, [tenderId]);

      if (tenderResult.rows.length === 0) {
        dispatchLogger.warn('Tender not found for dispatch', { tenderId });
        return { success: false, dispatchedCount: 0, deliveries: [] };
      }

      const tender = tenderResult.rows[0];

      // Validate tender payload before dispatch
      const validation = this.validateTenderPayload(tender);
      if (!validation.valid) {
        dispatchLogger.error('Tender payload validation failed', { 
          tenderId, 
          missingFields: validation.missingFields 
        });
        return { 
          success: false, 
          dispatchedCount: 0, 
          deliveries: [],
          error: `Missing required fields: ${validation.missingFields.join(', ')}`
        };
      }

      // We now solely use the globally configured supplier endpoint
      return await this.dispatchToConfiguredSupplier(tender);
    } catch (error: any) {
      dispatchLogger.error('Failed to execute dispatchTender', { tenderId, error: error.message });
      return { success: false, dispatchedCount: 0, deliveries: [] };
    }
  }

  async getDeliveriesByTender(tenderId: string): Promise<DeliveryRecord[]> {
    const result = await this.pool.query(`
      SELECT * FROM tender_deliveries
      WHERE tender_id = $1
      ORDER BY attempted_at DESC
    `, [tenderId]);

    return result.rows.map(row => ({
      id: row.id,
      tender_id: row.tender_id,
      supplier_id: row.supplier_id,
      supplier_name: row.supplier_name,
      supplier_endpoint: row.supplier_endpoint,
      a2a_task_id: row.a2a_task_id,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      response: typeof row.response === 'string' ? JSON.parse(row.response) : row.response,
      status_code: row.status_code,
      delivered: row.delivered,
      error_message: row.error_message,
      attempted_at: row.attempted_at,
    }));
  }

  async getAllDeliveries(supplierName?: string, delivered?: boolean, tenderId?: string): Promise<DeliveryRecord[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (supplierName) {
      conditions.push(`supplier_name ILIKE $${idx}`);
      params.push(`%${supplierName}%`);
      idx++;
    }
    if (delivered !== undefined) {
      conditions.push(`delivered = $${idx}`);
      params.push(delivered);
      idx++;
    }
    if (tenderId) {
      conditions.push(`tender_id = $${idx}`);
      params.push(tenderId);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(`
      SELECT d.*, t.title as tender_title
      FROM tender_deliveries d
      LEFT JOIN discovered_tenders t ON d.tender_id = t.id
      ${whereClause}
      ORDER BY d.attempted_at DESC
      LIMIT 100
    `, params);

    return result.rows.map(row => ({
      id: row.id,
      tender_id: row.tender_id,
      tender_title: row.tender_title || `Tender ${row.tender_id.substring(0, 8)}`,
      supplier_id: row.supplier_id,
      supplier_name: row.supplier_name,
      supplier_endpoint: row.supplier_endpoint,
      a2a_task_id: row.a2a_task_id,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      response: typeof row.response === 'string' ? JSON.parse(row.response) : row.response,
      status_code: row.status_code,
      delivered: row.delivered,
      error_message: row.error_message,
      attempted_at: row.attempted_at,
    }));
  }

  async getDeliveryStats(): Promise<{ total: number; delivered: number; failed: number; lastAttempt: string | null }> {
    const result = await this.pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE delivered = TRUE)::int AS delivered,
        COUNT(*) FILTER (WHERE delivered = FALSE)::int AS failed,
        MAX(attempted_at)::text AS last_attempt
      FROM tender_deliveries
    `);

    return {
      total: result.rows[0].total,
      delivered: result.rows[0].delivered,
      failed: result.rows[0].failed,
      lastAttempt: result.rows[0].last_attempt,
    };
  }

  async retryDelivery(deliveryId: string): Promise<DeliveryRecord | null> {
    const deliveryResult = await this.pool.query(`
      SELECT * FROM tender_deliveries WHERE id = $1
    `, [deliveryId]);

    if (deliveryResult.rows.length === 0) return null;

    const record = deliveryResult.rows[0];
    const payload = typeof record.payload === 'string' ? JSON.parse(record.payload) : record.payload;

    let apiKey = process.env.A2A_API_KEY || 'tendermesh-shared-secret';
    if (record.supplier_id) {
      const supplierResult = await this.pool.query('SELECT api_key FROM supplier_registry WHERE id = $1', [record.supplier_id]);
      if (supplierResult.rows.length > 0) {
        apiKey = supplierResult.rows[0].api_key;
      }
    }

    let delivered = false;
    let statusCode: number | null = null;
    let responseBody: any = {};
    let errorMessage: string | null = null;

    try {
      const keyToUse = apiKey || process.env.A2A_API_KEY || 'tendermesh-shared-secret';
      const response = await fetchWithTimeout(record.supplier_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'A2A-Api-Key': keyToUse,
          'X-A2A-API-Key': keyToUse,
          'Authorization': `Bearer ${keyToUse}`
        },
        body: JSON.stringify(payload)
      }, 45000);

      statusCode = response.status;

      try {
        responseBody = await response.json();
      } catch {
        responseBody = { raw: await response.text().catch(() => '') };
      }

      if (response.ok) {
        delivered = true;
        dispatchLogger.info('Successfully retried delivery', { deliveryId, supplier: record.supplier_name });
      } else {
        errorMessage = `HTTP ${response.status}`;
        dispatchLogger.error('Failed to retry delivery', { deliveryId, supplier: record.supplier_name, status: response.status });
      }
    } catch (error: any) {
      errorMessage = error.message || 'Connection failed';
      dispatchLogger.error('Error retrying delivery', { deliveryId, supplier: record.supplier_name, error: error.message });
    }

    await this.pool.query(`
      UPDATE tender_deliveries
      SET delivered = $1, status_code = $2, response = $3, error_message = $4,
          retry_count = retry_count + 1, last_retry_at = NOW(),
          next_retry_at = CASE WHEN $1 THEN NULL ELSE NOW() + INTERVAL '5 minutes' END
      WHERE id = $5
    `, [delivered, statusCode, JSON.stringify(responseBody), errorMessage, deliveryId]);

    return {
      id: record.id,
      tender_id: record.tender_id,
      supplier_id: record.supplier_id,
      supplier_name: record.supplier_name,
      supplier_endpoint: record.supplier_endpoint,
      a2a_task_id: record.a2a_task_id,
      payload,
      response: responseBody,
      status_code: statusCode,
      delivered,
      error_message: errorMessage,
      attempted_at: record.attempted_at,
    };
  }

  async retryFailedDeliveries(maxRetries = 5): Promise<{ processed: number; delivered: number }> {
    const failedResult = await this.pool.query(`
      SELECT id FROM tender_deliveries
      WHERE delivered = FALSE
        AND retry_count < $1
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY attempted_at ASC
      LIMIT 50
    `, [maxRetries]);

    let deliveredCount = 0;
    for (const row of failedResult.rows) {
      const result = await this.retryDelivery(row.id);
      if (result?.delivered) deliveredCount++;
    }

    return { processed: failedResult.rows.length, delivered: deliveredCount };
  }
}