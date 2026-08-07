import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const tools = [
  {
    name: 'get_approved_tenders',
    description: 'Get tenders approved by the dashboard reviewer.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'search_tenders',
    description: 'Search tenders by keyword, source, score, and approval status.',
    inputSchema: {
      type: 'object',
      properties: {
        keywords: { type: 'string' },
        source: { type: 'string' },
        min_score: { type: 'number' },
        approved: { type: 'boolean' },
      },
      required: [],
    },
  },
];

const server = new Server(
  { name: 'tender-discovery-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

const listRequestMatch: any = { method: 'tools/list' };
const callRequestMatch: any = { method: 'tools/call' };

server.setRequestHandler(
  listRequestMatch,
  async () => ({ tools })
);

server.setRequestHandler(
  callRequestMatch,
  async (request: any) => {
    const name = request.params?.name;
    const input = request.params?.input ?? {};

    if (name === 'get_approved_tenders') {
      const result = await pool.query(`
        SELECT t.title, t.buying_org, t.category, t.location, t.estimated_value, t.currency, t.deadline, t.source_url,
               t.direct_url, t.details, s.overall_score, s.recommendation
        FROM discovered_tenders t
        JOIN tender_scores s ON t.id = s.tender_id
        JOIN tender_approvals a ON t.id = a.tender_id
        WHERE a.status = 'APPROVED'
        ORDER BY s.overall_score DESC
        LIMIT 50
      `);
      return { content: [{ type: 'application/json', text: JSON.stringify(result.rows) }] };
    }

    if (name === 'search_tenders') {
      const conditions: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (typeof input.keywords === 'string' && input.keywords.trim()) {
        conditions.push(`(t.title ILIKE $${idx} OR t.buying_org ILIKE $${idx})`);
        params.push(`%${input.keywords.trim()}%`);
        idx++;
      }
      if (typeof input.source === 'string' && input.source.trim()) {
        conditions.push(`t.source = $${idx}`);
        params.push(input.source.trim());
        idx++;
      }
      if (typeof input.min_score === 'number') {
        conditions.push(`s.overall_score >= $${idx}`);
        params.push(input.min_score);
        idx++;
      }
      if (typeof input.approved === 'boolean') {
        conditions.push(`a.status = $${idx}`);
        params.push(input.approved ? 'APPROVED' : 'PENDING');
        idx++;
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await pool.query(`
        SELECT t.id, t.title, t.buying_org, t.category, t.location, t.estimated_value, t.currency, t.deadline,
               t.source_url, t.direct_url, t.details, s.overall_score, s.recommendation, a.status as approval_status
        FROM discovered_tenders t
        LEFT JOIN tender_scores s ON t.id = s.tender_id
        LEFT JOIN tender_approvals a ON t.id = a.tender_id
        ${where}
        ORDER BY s.overall_score DESC
        LIMIT 50
      `, params);

      return { content: [{ type: 'application/json', text: JSON.stringify(result.rows) }] };
    }

    return { content: [{ type: 'text', text: 'Error: Unknown tool' }], isError: true };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);