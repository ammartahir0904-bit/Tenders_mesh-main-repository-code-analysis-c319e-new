// ─── Express API Server: Backend for the React frontend ───

import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import crypto from 'crypto';
import { Pipeline } from './pipeline.js';
import { config, validateConfig } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { logger } from './utils/logger.js';
import { A2ADispatchService } from './services/a2a-dispatch.service.js';
import { localTenders as discoveredTenders } from './routes/tenders.routes.js';

const app = express();
const PORT = config.apiPort;
const DB_URL = config.databaseUrl;

const configErrors = validateConfig();
if (configErrors.length > 0) {
  logger.warn('Configuration issues detected', configErrors);
}

const pool = new Pool({ connectionString: DB_URL });
const dispatchService = new A2ADispatchService(pool);

const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

type FallbackTender = {
  id: string;
  source: string;
  source_url: string;
  source_id: string;
  title: string;
  buying_org: string;
  category: string;
  location: string;
  estimated_value: number;
  currency: string;
  deadline: string;
  mandatory_reqs: string[];
  status: string;
  scraped_at: string;
  updated_at: string;
  score: {
    id: string;
    tender_id: string;
    overall_score: number;
    recommendation: string;
    score_reasons: Record<string, number>;
    scored_at: string;
  };
  approval: {
    id: string;
    tender_id: string;
    status: string;
    approved_at: string | null;
    notes: string | null;
    created_at: string;
  } | null;
};

const fallbackTenders: FallbackTender[] = [
  {
    id: 'fallback-1',
    source: 'PPRA',
    source_url: 'https://example.com/tender/1',
    source_id: 'PPRA-001',
    title: 'Supply of IT Equipment and Laptops',
    buying_org: 'Ministry of Information Technology',
    category: 'IT Equipment',
    location: 'Islamabad',
    estimated_value: 5000000000,
    currency: 'PKR',
    deadline: '2026-12-31T00:00:00.000Z',
    mandatory_reqs: ['NTN', 'Registered Vendor'],
    status: 'ACTIVE',
    scraped_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    score: {
      id: 'fallback-score-1',
      tender_id: 'fallback-1',
      overall_score: 0.92,
      recommendation: 'STRONG_YES',
      score_reasons: { relevance: 0.95, value: 0.9 },
      scored_at: new Date().toISOString(),
    },
    approval: null,
  },
  {
    id: 'fallback-2',
    source: 'SAM_GOV',
    source_url: 'https://example.com/tender/2',
    source_id: 'SAM-002',
    title: 'Managed IT Services and Support',
    buying_org: 'Federal Secretariat',
    category: 'IT Services',
    location: 'Rawalpindi',
    estimated_value: 1200000000,
    currency: 'PKR',
    deadline: '2026-11-15T00:00:00.000Z',
    mandatory_reqs: ['Experience Certificate', 'Company Registration'],
    status: 'ACTIVE',
    scraped_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    score: {
      id: 'fallback-score-2',
      tender_id: 'fallback-2',
      overall_score: 0.78,
      recommendation: 'YES',
      score_reasons: { relevance: 0.8, value: 0.76 },
      scored_at: new Date().toISOString(),
    },
    approval: {
      id: 'fallback-approval-2',
      tender_id: 'fallback-2',
      status: 'PENDING',
      approved_at: null,
      notes: null,
      created_at: new Date().toISOString(),
    },
  },
];

function getFallbackApproval(tender: FallbackTender) {
  return tender.approval || {
    id: `fallback-approval-${tender.id}`,
    tender_id: tender.id,
    status: 'PENDING',
    approved_at: null,
    notes: null,
    created_at: new Date().toISOString(),
  };
}

function getFallbackTenderResponse(query: Record<string, any>) {
  const search = typeof query.search === 'string' ? query.search : '';
  const source = typeof query.source === 'string' ? query.source : '';
  const category = typeof query.category === 'string' ? query.category : '';
  const status = typeof query.status === 'string' ? query.status : '';
  const approvalStatus = typeof query.approval_status === 'string' ? query.approval_status : '';
  const recommendation = typeof query.recommendation === 'string' ? query.recommendation : '';
  const minScore = typeof query.min_score === 'string' ? parseFloat(query.min_score) : undefined;
  const deadlineFrom = typeof query.deadline_from === 'string' ? query.deadline_from : '';
  const deadlineTo = typeof query.deadline_to === 'string' ? query.deadline_to : '';
  const sortBy = typeof query.sort_by === 'string' ? query.sort_by : 'scraped_at';
  const sortDir = query.sort_dir === 'asc' ? 'asc' : 'desc';
  const pageNum = Math.max(1, parseInt(query.page as string, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page as string, 10) || 25));

  let filtered = fallbackTenders.map((tender) => ({
    ...tender,
    approval: getFallbackApproval(tender),
  }));

  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter((tender) => {
      const title = tender.title?.toLowerCase() || '';
      const org = tender.buying_org?.toLowerCase() || '';
      return title.includes(term) || org.includes(term);
    });
  }
  if (source) {
    filtered = filtered.filter((tender) => tender.source === source);
  }
  if (category) {
    filtered = filtered.filter((tender) => tender.category === category);
  }
  if (status) {
    filtered = filtered.filter((tender) => tender.status === status);
  }
  if (approvalStatus) {
    filtered = filtered.filter((tender) => tender.approval?.status === approvalStatus);
  }
  if (recommendation) {
    filtered = filtered.filter((tender) => tender.score?.recommendation === recommendation);
  }
  if (minScore !== undefined) {
    filtered = filtered.filter((tender) => (tender.score?.overall_score ?? 0) >= minScore);
  }
  if (deadlineFrom) {
    filtered = filtered.filter((tender) => new Date(tender.deadline) >= new Date(deadlineFrom));
  }
  if (deadlineTo) {
    filtered = filtered.filter((tender) => new Date(tender.deadline) <= new Date(deadlineTo));
  }

  const allowedSortColumns = ['deadline', 'scraped_at', 'overall_score', 'estimated_value'];
  const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'scraped_at';
  const direction = sortDir === 'asc' ? 1 : -1;

  filtered.sort((a, b) => {
    let left: number | string;
    let right: number | string;

    if (sortColumn === 'overall_score') {
      left = a.score?.overall_score ?? 0;
      right = b.score?.overall_score ?? 0;
    } else if (sortColumn === 'deadline') {
      left = a.deadline ?? '';
      right = b.deadline ?? '';
    } else if (sortColumn === 'estimated_value') {
      left = a.estimated_value ?? 0;
      right = b.estimated_value ?? 0;
    } else {
      left = a.scraped_at ?? '';
      right = b.scraped_at ?? '';
    }

    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * direction;
    }

    return String(left).localeCompare(String(right)) * direction;
  });

  const offset = (pageNum - 1) * perPage;
  const paged = filtered.slice(offset, offset + perPage);

  return {
    data: paged,
    total: filtered.length,
    page: pageNum,
    per_page: perPage,
    total_pages: Math.ceil(filtered.length / perPage),
  };
}

function getDiscoveredTenderResponse(query: Record<string, any>) {
  const allTenders = Array.from(discoveredTenders.values()).filter(Boolean);
  if (allTenders.length === 0) {
    return getFallbackTenderResponse(query);
  }

  const search = typeof query.search === 'string' ? query.search : '';
  const source = typeof query.source === 'string' ? query.source : '';
  const category = typeof query.category === 'string' ? query.category : '';
  const status = typeof query.status === 'string' ? query.status : '';
  const approvalStatus = typeof query.approval_status === 'string' ? query.approval_status : '';
  const recommendation = typeof query.recommendation === 'string' ? query.recommendation : '';
  const minScore = typeof query.min_score === 'string' ? parseFloat(query.min_score) : undefined;
  const deadlineFrom = typeof query.deadline_from === 'string' ? query.deadline_from : '';
  const deadlineTo = typeof query.deadline_to === 'string' ? query.deadline_to : '';
  const sortBy = typeof query.sort_by === 'string' ? query.sort_by : 'scraped_at';
  const sortDir = query.sort_dir === 'asc' ? 'asc' : 'desc';
  const pageNum = Math.max(1, parseInt(query.page as string, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page as string, 10) || 25));

  let filtered = allTenders.map((tender: any) => ({
    ...tender,
    approval: tender.approval || {
      id: `approval-${tender.id}`,
      tender_id: tender.id,
      status: 'PENDING',
      approved_at: null,
      notes: null,
      created_at: tender.scraped_at || new Date().toISOString(),
    },
  }));

  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter((tender: any) => {
      const title = tender.title?.toLowerCase() || '';
      const org = tender.buying_org?.toLowerCase() || '';
      return title.includes(term) || org.includes(term);
    });
  }
  if (source) filtered = filtered.filter((tender: any) => tender.source === source);
  if (category) filtered = filtered.filter((tender: any) => tender.category === category);
  if (status) filtered = filtered.filter((tender: any) => tender.status === status);
  if (approvalStatus) filtered = filtered.filter((tender: any) => tender.approval?.status === approvalStatus);
  if (recommendation) filtered = filtered.filter((tender: any) => tender.score?.recommendation === recommendation);
  if (minScore !== undefined) filtered = filtered.filter((tender: any) => (tender.score?.overall_score ?? 0) >= minScore);
  if (deadlineFrom) filtered = filtered.filter((tender: any) => new Date(tender.deadline) >= new Date(deadlineFrom));
  if (deadlineTo) filtered = filtered.filter((tender: any) => new Date(tender.deadline) <= new Date(deadlineTo));

  const allowedSortColumns = ['deadline', 'scraped_at', 'overall_score', 'estimated_value'];
  const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'scraped_at';
  const direction = sortDir === 'asc' ? 1 : -1;

  filtered.sort((a: any, b: any) => {
    let left: number | string;
    let right: number | string;

    if (sortColumn === 'overall_score') {
      left = a.score?.overall_score ?? 0;
      right = b.score?.overall_score ?? 0;
    } else if (sortColumn === 'deadline') {
      left = a.deadline ?? '';
      right = b.deadline ?? '';
    } else if (sortColumn === 'estimated_value') {
      left = a.estimated_value ?? 0;
      right = b.estimated_value ?? 0;
    } else {
      left = a.scraped_at ?? '';
      right = b.scraped_at ?? '';
    }

    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * direction;
    }

    return String(left).localeCompare(String(right)) * direction;
  });

  const offset = (pageNum - 1) * perPage;
  const paged = filtered.slice(offset, offset + perPage);

  return {
    data: paged,
    total: filtered.length,
    page: pageNum,
    per_page: perPage,
    total_pages: Math.ceil(filtered.length / perPage),
  };
}

function applyApprovalToFallback(id: string, status: string, notes?: string | null) {
  const tender = fallbackTenders.find((item) => item.id === id);
  if (!tender) return null;

  tender.approval = {
    id: `fallback-approval-${id}`,
    tender_id: id,
    status,
    approved_at: status === 'APPROVED' ? new Date().toISOString() : null,
    notes: notes ?? null,
    created_at: new Date().toISOString(),
  };

  tender.updated_at = new Date().toISOString();
  return tender.approval;
}

function getFallbackDeliveryResponse(tenderId?: string) {
  const fallbackDeliveries = [
    {
      id: 'delivery-fallback-1',
      tender_id: 'fallback-1',
      supplier_id: null,
      supplier_name: 'Configured Supplier',
      supplier_endpoint: 'http://localhost:8000/tenders/receive',
      a2a_task_id: 'fallback-task-1',
      payload: {},
      response: {},
      status_code: null,
      delivered: false,
      error_message: 'Queue pending',
      attempted_at: new Date().toISOString(),
    },
    {
      id: 'delivery-fallback-2',
      tender_id: 'fallback-2',
      supplier_id: null,
      supplier_name: 'Configured Supplier',
      supplier_endpoint: 'http://localhost:8000/tenders/receive',
      a2a_task_id: 'fallback-task-2',
      payload: {},
      response: {},
      status_code: null,
      delivered: false,
      error_message: 'Queue pending',
      attempted_at: new Date().toISOString(),
    },
  ];

  const filtered = tenderId ? fallbackDeliveries.filter((item) => item.tender_id === tenderId) : fallbackDeliveries;
  return {
    data: filtered,
    total: filtered.length,
    stats: {
      total: filtered.length,
      delivered: 0,
      failed: filtered.length,
      lastAttempt: filtered[0]?.attempted_at ?? null,
    },
  };
}

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ strict: false }));

// ─── SSE clients ───
interface SSEClient {
  id: number;
  res: express.Response;
}
const sseClients: SSEClient[] = [];
let sseIdCounter = 0;

function broadcastSSE(event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(message);
    } catch {
      // Client disconnected, will be cleaned up
    }
  });
}

// ─── GET /api/events — SSE live feed ───
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const clientId = ++sseIdCounter;
  const client: SSEClient = { id: clientId, res };
  sseClients.push(client);

  // Send initial connection event
  res.write(`event: CONNECTED\ndata: {"id":${clientId},"type":"CONNECTED","message":"SSE connected","timestamp":"${new Date().toISOString()}"}\n\n`);

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const idx = sseClients.findIndex(c => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// ─── Check DB connection health ───
let dbConnected = false;

async function checkDbConnection() {
  try {
    await pool.query('SELECT 1');
    dbConnected = true;
  } catch {
    dbConnected = false;
  }
}
checkDbConnection();
setInterval(checkDbConnection, 30000);

// ─── GET /api/tenders — paginated tender list with filters ───
app.get('/api/tenders', async (req, res) => {
  try {
    if (!dbConnected) {
      const tenderResponse = getDiscoveredTenderResponse(req.query as Record<string, any>);
      return res.json(tenderResponse);
    }

    const {
      search, source, category, status, approval_status, recommendation,
      min_score, deadline_from, deadline_to,
      sort_by = 'scraped_at', sort_dir = 'desc',
      page = '1', per_page = '25',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(per_page, 10) || 25));
    const offset = (pageNum - 1) * perPage;

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(t.title ILIKE $${paramIdx} OR t.buying_org ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (source) {
      conditions.push(`t.source = $${paramIdx}`);
      params.push(source);
      paramIdx++;
    }
    if (category) {
      conditions.push(`t.category = $${paramIdx}`);
      params.push(category);
      paramIdx++;
    }
    if (status) {
      conditions.push(`t.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }
    if (approval_status) {
      conditions.push(`a.status = $${paramIdx}`);
      params.push(approval_status);
      paramIdx++;
    }
    if (recommendation) {
      conditions.push(`s.recommendation = $${paramIdx}`);
      params.push(recommendation);
      paramIdx++;
    }
    if (min_score) {
      conditions.push(`s.overall_score >= $${paramIdx}::DECIMAL / 100`);
      params.push(parseFloat(min_score));
      paramIdx++;
    }
    if (deadline_from) {
      conditions.push(`t.deadline >= $${paramIdx}::TIMESTAMPTZ`);
      params.push(deadline_from);
      paramIdx++;
    }
    if (deadline_to) {
      conditions.push(`t.deadline <= $${paramIdx}::TIMESTAMPTZ`);
      params.push(deadline_to);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort column to prevent SQL injection
    const allowedSortColumns = ['deadline', 'scraped_at', 'overall_score', 'estimated_value'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'scraped_at';
    const sortDirection = sort_dir === 'asc' ? 'ASC' : 'DESC';

    try {
      // Count query
      const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM discovered_tenders t
        LEFT JOIN tender_scores s ON t.id = s.tender_id
        LEFT JOIN tender_approvals a ON t.id = a.tender_id
        ${whereClause}
      `, params);

      const total = parseInt(countResult.rows[0]?.total || '0', 10);
      const totalPages = Math.ceil(total / perPage);

      // Data query with joined score + approval
      const sortField = sortColumn === 'overall_score' ? 's.overall_score' :
                         sortColumn === 'deadline' ? 't.deadline' :
                         sortColumn === 'estimated_value' ? 't.estimated_value' :
                         't.scraped_at';

      const dataResult = await pool.query(`
        SELECT
          t.id, t.source, t.source_url, t.source_id, t.title,
          t.buying_org, t.category, t.location,
          t.estimated_value, t.currency, t.deadline,
          t.mandatory_reqs, t.status, t.scraped_at, t.updated_at,
          row_to_json(s.*) as score,
          row_to_json(a.*) as approval
        FROM discovered_tenders t
        LEFT JOIN tender_scores s ON t.id = s.tender_id
        LEFT JOIN tender_approvals a ON t.id = a.tender_id
        ${whereClause}
        ORDER BY ${sortField} ${sortDirection}
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
      `, [...params, perPage, offset]);

      const rows = dataResult.rows.map((row: Record<string, any>) => ({
        ...row,
        mandatory_reqs: typeof row.mandatory_reqs === 'string' ? JSON.parse(row.mandatory_reqs) : (row.mandatory_reqs || []),
        score: row.score ? {
          ...row.score,
          score_reasons: typeof row.score.score_reasons === 'string'
            ? JSON.parse(row.score.score_reasons)
            : (row.score.score_reasons || {}),
        } : null,
        approval: row.approval || null,
      }));

      if (rows.length > 0 || total > 0) {
        return res.json({
          data: rows,
          total,
          page: pageNum,
          per_page: perPage,
          total_pages: totalPages,
        });
      }

      return res.json(getFallbackTenderResponse(req.query as Record<string, any>));
    } catch (err: any) {
      logger.warn('[API] Database query failed, using fallback tender data', { message: err.message });
      return res.json(getDiscoveredTenderResponse(req.query as Record<string, any>));
    }
  } catch (err: any) {
    logger.error('[API] GET /api/tenders error', { message: err.message });
    res.status(500).json({ error: 'Failed to fetch tenders' });
  }
});

// ─── Attempt dispatch to supplier and return delivery confirmation ───
async function attemptDispatchToSupplier(id: string) {
  const tender = discoveredTenders.get(id) || fallbackTenders.find(t => t.id === id);
  const endpoint = process.env.SUPPLIER_ENDPOINT || 'http://localhost:8000/tenders/receive';
  const result: any = {
    supplier: 'Configured Supplier',
    endpoint,
    dispatchedAt: new Date().toISOString(),
    delivered: false,
  };

  try {
    const payload = {
      type: "tender.invitation",
      a2a_task_id: crypto.randomUUID(),
      from_agent: "tendermesh-buyer-agent",
      to_agent: "tendermesh-supplier-agent",
      tender: {
        tender_id: id,
        title: tender?.title || 'Unknown',
        category: tender?.category || '',
        scope: tender?.buying_org || '',
        buyer_region: tender?.location || '',
        estimated_value: tender?.estimated_value ?? null,
        currency: tender?.currency || 'PKR',
        mandatory_reqs: tender?.mandatory_reqs || [],
        deadline: tender?.deadline,
        response_by: tender?.deadline,
        source: tender?.source || '',
        source_id: tender?.source_id || '',
        source_url: tender?.source_url || '',
        status: tender?.status || 'ACTIVE',
        deliverables: [],
        reply_to: `${process.env.API_BASE_URL || "http://localhost:3001"}/api/a2a/assessment`
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'A2A-Api-Key': 'tendermesh-shared-secret' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      result.delivered = true;
      result.statusCode = response.status;
    } else {
      result.error = `HTTP ${response.status}`;
      result.statusCode = response.status;
    }
  } catch (err: any) {
    result.error = err.message || 'Connection failed';
  }

  return result;
}

// ─── POST /api/tenders/:id/approve — Approve/Reject a tender ───
app.post('/api/tenders/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    let body = req.body ?? {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const status = typeof body?.status === 'string' ? body.status : undefined;
    const notes = typeof body?.notes === 'string' ? body.notes : undefined;

    if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be APPROVED, REJECTED, or PENDING.' });
    }

    if (!dbConnected) {
      const approval = applyApprovalToFallback(id, status, notes || null);
      if (!approval) {
        return res.status(404).json({ error: 'Tender not found' });
      }

      broadcastSSE('APPROVAL_CHANGED', {
        type: 'APPROVAL_CHANGED',
        tender_id: id,
        status,
        timestamp: new Date().toISOString(),
        message: `Tender ${id} → ${status}`,
      });

      // Attempt dispatch if APPROVED — return confirmation
      let dispatchResult = null;
      if (status === 'APPROVED') {
        dispatchResult = await attemptDispatchToSupplier(id);
      }

      const deliverySummary = dispatchResult && typeof dispatchResult === 'object' ? { dispatchedCount: dispatchResult.delivered ? 1 : 0, totalSuppliers: 1, anyDelivered: dispatchResult.delivered ?? false } : { dispatchedCount: 0, totalSuppliers: 0, anyDelivered: false }; return res.json({ ...approval, dispatch: dispatchResult, delivery_summary: deliverySummary });
    }

    try {
      const result = await pool.query(`
        INSERT INTO tender_approvals (tender_id, status, approved_at, notes)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tender_id)
        DO UPDATE SET status = $2, approved_at = $3, notes = COALESCE($4, tender_approvals.notes)
        RETURNING *
      `, [
        id,
        status,
        status === 'APPROVED' ? new Date().toISOString() : null,
        notes || null,
      ]);

      broadcastSSE('APPROVAL_CHANGED', {
        type: 'APPROVAL_CHANGED',
        tender_id: id,
        status,
        timestamp: new Date().toISOString(),
        message: `Tender ${id} → ${status}`,
      });

      // Attempt dispatch if APPROVED — return confirmation
      let dispatchResult = null;
      if (status === 'APPROVED') {
        dispatchResult = await dispatchService.dispatchTender(id);
      }

      const deliverySummary = dispatchResult && typeof dispatchResult === 'object' ? { dispatchedCount: (dispatchResult as any).dispatchedCount ?? 0, totalSuppliers: (dispatchResult as any).deliveries?.length ?? 0, anyDelivered: (dispatchResult as any).deliveries?.some((d: any) => d.delivered) ?? false } : { dispatchedCount: 0, totalSuppliers: 0, anyDelivered: false }; return res.json({ ...result.rows[0], dispatch: dispatchResult, delivery_summary: deliverySummary });
    } catch (err: any) {
      logger.warn('[API] Database approval update failed, using fallback state', { message: err.message });
      const approval = applyApprovalToFallback(id, status, notes || null);
      if (!approval) {
        return res.status(404).json({ error: 'Tender not found' });
      }

      broadcastSSE('APPROVAL_CHANGED', {
        type: 'APPROVAL_CHANGED',
        tender_id: id,
        status,
        timestamp: new Date().toISOString(),
        message: `Tender ${id} → ${status}`,
      });

      return res.json(approval);
    }
  } catch (err: any) {
    logger.error('[API] POST /api/tenders/:id/approve error', { message: err.message });
    res.status(500).json({ error: 'Failed to update approval' });
  }
});

// ─── POST /api/tenders/bulk-approve — Bulk approve/reject ───
app.post('/api/tenders/bulk-approve', async (req, res) => {
  try {
    const body = req.body ?? {};
    const tender_ids = Array.isArray(body?.tender_ids) ? body.tender_ids : undefined;
    const status = typeof body?.status === 'string' ? body.status : undefined;

    if (!Array.isArray(tender_ids) || tender_ids.length === 0) {
      return res.status(400).json({ error: 'tender_ids must be a non-empty array' });
    }
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const approvedAt = status === 'APPROVED' ? new Date().toISOString() : null;

    if (!dbConnected) {
      for (const id of tender_ids) {
        applyApprovalToFallback(id, status, null);
      }

      broadcastSSE('APPROVAL_CHANGED', {
        type: 'APPROVAL_CHANGED',
        tender_ids,
        status,
        timestamp: new Date().toISOString(),
        message: `Bulk ${status}: ${tender_ids.length} tenders`,
      });

      return res.status(204).send();
    }

    try {
      // Upsert each approval
      for (const id of tender_ids) {
        await pool.query(`
          INSERT INTO tender_approvals (tender_id, status, approved_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (tender_id)
          DO UPDATE SET status = $2, approved_at = $3
        `, [id, status, approvedAt]);
      }

      broadcastSSE('APPROVAL_CHANGED', {
        type: 'APPROVAL_CHANGED',
        tender_ids,
        status,
        timestamp: new Date().toISOString(),
        message: `Bulk ${status}: ${tender_ids.length} tenders`,
      });

      return res.status(204).send();
    } catch (err: any) {
      logger.warn('[API] Database bulk approval update failed, using fallback state', { message: err.message });
      for (const id of tender_ids) {
        applyApprovalToFallback(id, status, null);
      }

      broadcastSSE('APPROVAL_CHANGED', {
        type: 'APPROVAL_CHANGED',
        tender_ids,
        status,
        timestamp: new Date().toISOString(),
        message: `Bulk ${status}: ${tender_ids.length} tenders`,
      });

      return res.status(204).send();
    }
  } catch (err: any) {
    logger.error('[API] POST /api/tenders/bulk-approve error', { message: err.message });
    res.status(500).json({ error: 'Failed bulk approval' });
  }
});

// ─── POST /api/scan — Trigger discovery scan ───
app.post('/api/scan', async (req, res) => {
  try {
    const { sources } = req.body;

    broadcastSSE('SCAN_STARTED', {
      type: 'SCAN_STARTED',
      sources: sources || ['PPRA', 'SAM_GOV', 'UNDP'],
      timestamp: new Date().toISOString(),
      message: 'Scan started',
    });

    // Respond immediately — scan runs async
    res.json({
      started: true,
      sources: sources || ['PPRA', 'SAM_GOV', 'UNDP'],
      message: 'Scan started in background',
    });

    // Run pipeline in background (don't await)
    const pipeline = new Pipeline(DB_URL);
    const results = await pipeline.runFullScan();
    await pipeline.close();

    for (const result of results) {
      const totalProcessed = result.inserted + result.updated + result.skippedDuplicate;
      broadcastSSE('NEW_TENDER', {
        type: 'NEW_TENDER',
        source: result.source,
        timestamp: new Date().toISOString(),
        message: `${result.source}: ${totalProcessed} tenders processed (${result.inserted} inserted, ${result.updated} updated)`,
      });
    }

    broadcastSSE('SCAN_COMPLETED', {
      type: 'SCAN_COMPLETED',
      results,
      timestamp: new Date().toISOString(),
      message: 'Scan completed',
    });
  } catch (err: any) {
    logger.error('[API] POST /api/scan error', { message: err.message });
    broadcastSSE('SCAN_COMPLETED', {
      type: 'SCAN_COMPLETED',
      error: err.message,
      timestamp: new Date().toISOString(),
      message: 'Scan failed',
    });
  }
});

// ─── Supplier Profile Settings ───
const DEFAULT_PROFILE = {
  company_name: 'Default Supplier',
  categories: config.supplierCategories,
  locations: config.supplierRegions,
  certifications: ['PEC', 'SECP'],
  min_value: config.supplierValueMin,
  max_value: config.supplierValueMax,
};

let supplierProfile = { ...DEFAULT_PROFILE };

app.get('/api/settings/profile', (_req, res) => {
  res.json(supplierProfile);
});

app.put('/api/settings/profile', (req, res) => {
  const { company_name, categories, locations, certifications, min_value, max_value } = req.body;
  if (company_name !== undefined) supplierProfile.company_name = company_name;
  if (categories !== undefined) supplierProfile.categories = categories;
  if (locations !== undefined) supplierProfile.locations = locations;
  if (certifications !== undefined) supplierProfile.certifications = certifications;
  if (min_value !== undefined) supplierProfile.min_value = min_value;
  if (max_value !== undefined) supplierProfile.max_value = max_value;
  res.json(supplierProfile);
});

// ─── API Keys (BYOK) Settings ───
let apiKeys = {
  openai_key: '',
  anthropic_key: '',
  custom_endpoint: '',
};

app.get('/api/settings/keys', (_req, res) => {
  // Return masked keys (show only first 8 chars)
  const masked = {
    openai_key: apiKeys.openai_key ? apiKeys.openai_key.substring(0, 8) + '...' : '',
    anthropic_key: apiKeys.anthropic_key ? apiKeys.anthropic_key.substring(0, 8) + '...' : '',
    custom_endpoint: apiKeys.custom_endpoint || '',
  };
  res.json(masked);
});

app.put('/api/settings/keys', (req, res) => {
  const { openai_key, anthropic_key, custom_endpoint } = req.body;
  if (openai_key !== undefined) apiKeys.openai_key = openai_key;
  if (anthropic_key !== undefined) apiKeys.anthropic_key = anthropic_key;
  if (custom_endpoint !== undefined) apiKeys.custom_endpoint = custom_endpoint;

  const masked = {
    openai_key: apiKeys.openai_key ? apiKeys.openai_key.substring(0, 8) + '...' : '',
    anthropic_key: apiKeys.anthropic_key ? apiKeys.anthropic_key.substring(0, 8) + '...' : '',
    custom_endpoint: apiKeys.custom_endpoint || '',
  };
  res.json(masked);
});

// ─── Health check ───
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Admin delivery routes ───
app.get('/api/admin/deliveries', async (req, res) => {
  try {
    const { supplier_name, delivered, tender_id } = req.query as Record<string, string>;
    const deliveredFilter = delivered !== undefined ? delivered === 'true' : undefined;
    let deliveries;
    let stats;

    try {
      deliveries = await dispatchService.getAllDeliveries(supplier_name, deliveredFilter, tender_id);
      stats = await dispatchService.getDeliveryStats();
    } catch (error: any) {
      logger.warn('[API] Delivery query failed, using fallback delivery data', { message: error.message });
      const fallback = getFallbackDeliveryResponse(tender_id);
      return res.json({ data: fallback.data, total: fallback.total, stats: fallback.stats });
    }

    return res.json({ data: deliveries, total: deliveries.length, stats });
  } catch (err: any) {
    const fallback = getFallbackDeliveryResponse();
    return res.json({ data: fallback.data, total: fallback.total, stats: fallback.stats });
  }
});

app.get('/api/admin/deliveries/stats', async (req, res) => {
  try {
    const stats = await dispatchService.getDeliveryStats();
    return res.json(stats);
  } catch (err: any) {
    const fallback = getFallbackDeliveryResponse();
    return res.json(fallback.stats);
  }
});

app.post('/api/admin/deliveries/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dispatchService.retryDelivery(id);
    if (!result) return res.status(404).json({ error: 'Delivery record not found' });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tenders/:id/deliveries', async (req, res) => {
  try {
    const { id } = req.params;

    let deliveries;
    try {
      deliveries = await dispatchService.getDeliveriesByTender(id);
    } catch (error: any) {
      logger.warn('[API] Tender delivery query failed, using fallback delivery data', { tenderId: id, message: error.message });
      const fallback = getFallbackDeliveryResponse(id);
      return res.json({ data: fallback.data, total: fallback.total });
    }

    return res.json({ data: deliveries, total: deliveries.length });
  } catch (err: any) {
    const fallback = getFallbackDeliveryResponse();
    return res.json({ data: fallback.data, total: fallback.total });
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start server ───
app.listen(PORT, () => {
  logger.info(`[Server] TenderMesh API running on http://localhost:${PORT}`);
  logger.info(`[Server] SSE endpoint: http://localhost:${PORT}/api/events`);
  logger.info(`[Server] Health check: http://localhost:${PORT}/api/health`);
});