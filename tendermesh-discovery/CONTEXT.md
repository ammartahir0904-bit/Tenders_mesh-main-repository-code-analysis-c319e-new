# Workspace Context

**IMPORTANT FOR AI AGENTS:** You must read this file before taking any significant action in this workspace to understand recent changes, known architectural quirks, and pending tasks.

## What Has Been Done (Recent Fixes)

1. **Stale Tenders & Cache Fix (`src/routes/tenders.routes.ts`)**
   - **Issue:** The server persistently showed old tenders instead of newly scraped ones.
   - **Fix:** The `tenders-cache.json` file is now cleared on fresh startup, and the `getVisibleTenders` logic was relaxed to ensure newly scraped tenders appear immediately in the UI without overly strict threshold requirements.

2. **Scanner Lock Eviction (`src/utils/deduplication.ts`)**
   - **Issue:** The scanner could get permanently stuck if a previous scan crashed, leaving the lock in the DB.
   - **Fix:** `ScanLock.acquire()` now includes a stale lock eviction query that automatically releases any `RUNNING` locks older than 5 minutes.

3. **Supplier Dispatch Resolution (`src/server.ts` & `src/routes/tenders.routes.ts`)**
   - **Issue:** Approved tenders were not successfully dispatching to the supplier endpoint (`192.168.1.41`). 
   - **Fix:** Modified `attemptDispatchToSupplier` in the legacy `server.ts` to check the actual `discoveredTenders` memory map alongside `fallbackTenders`. Re-enabled the A2A dispatch flow.

4. **Bulk Approval UUID Crash (`src/routes/tenders.routes.ts`)**
   - **Issue:** Hitting "Approve All" crashed the database (500 Error) when fallback tenders (`fallback-1`) were mixed with real ones, due to Postgres rejecting non-UUID strings for `uuid` columns.
   - **Fix:** Implemented UUID regex validation. Valid UUIDs are routed to the Postgres database, while fallback IDs are updated gracefully in-memory without crashing the application.

5. **Restored Fallback Helpers (`src/server.ts`)**
   - Restored `applyApprovalToFallback` in the legacy entry point to prevent crashes when the DB is unavailable.

## What Has NOT Been Done (Pending Tasks)

1. **Complete Server Migration (Legacy vs. Modern)**
   - The codebase currently has a split personality. It relies on `server.ts` (legacy) for some runs and `app.ts` + `routes/tenders.routes.ts` (modern) for others. A full refactor to unify these endpoints and drop legacy fallback data entirely is pending.

2. **A2A (Agent-to-Agent) Retry Mechanisms**
   - While dispatching to `192.168.1.41` now correctly looks up the tender, we still lack robust queueing/retry logic if the supplier agent is temporarily down.

3. **Frontend Cache Synchronization**
   - The frontend might still hold onto stale data in React Query/state if the backend clears its cache on restart. Better WebSocket sync logic is needed for seamless UI updates.

## Guidelines for Future Work
- **Avoid Duplicate Endpoints:** If adding a new feature, check if it exists in both `server.ts` and `tenders.routes.ts`. Apply fixes to both until the legacy migration is complete.
- **UUID Validation:** Always validate ID strings before querying Postgres, as the UI heavily mixes `fallback-*` string IDs with real UUIDs.
- **Test Build First:** Always run `npm run build` after making changes to ensure TypeScript compiler consistency, especially regarding duplicate implementations between the modern and legacy setups.
