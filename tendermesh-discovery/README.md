# TenderMesh Discovery

A tender discovery and review platform with a React dashboard and Node.js backend.

## Features
- Scrape tenders from PPRA, SAM.gov, and UNDP
- Parse and score tenders
- Store tender data and approvals in PostgreSQL
- Review tenders via a dashboard
- Stream live updates through Server-Sent Events

## Run locally
1. Copy `.env.example` to `.env` and adjust values.
2. Set `SUPPLIER_ENDPOINT` and `A2A_API_KEY` in `.env` to match your supplier agent endpoint and shared A2A secret.
3. Start PostgreSQL and create the database referenced in `DATABASE_URL`.
4. Install dependencies:
   - `npm install`
   - `cd frontend && npm install`
5. Start backend:
   - `npm run dev`
6. Start frontend:
   - `cd frontend && npm run dev`

## Notes
- The system now includes config validation, structured logging, timeout/retry support for external scrapers, and graceful fallback parsing.
- Existing UI routes and API behavior remain intact.
