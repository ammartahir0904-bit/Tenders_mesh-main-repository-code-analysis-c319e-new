# 🌐 TenderMesh — Complete Project Architecture & Documentation

Welcome to the official **TenderMesh** documentation. This document is designed for both **executive stakeholders (Company Leadership & Bosses)** and **engineering teams / students**. It provides a end-to-end breakdown of how TenderMesh works, what technologies and libraries are used, how every file and function connects, and how data flows through the entire system.

---

## 🎯 Executive Overview & Purpose

### What is TenderMesh?
**TenderMesh** is an enterprise-grade, AI-powered autonomous procurement discovery and dispatch platform. Government and corporate tenders (requests for proposal) are scattered across dozens of different websites (e.g., PPRA Pakistan, SAM.gov US, NHA, CDA, UNDP). 

TenderMesh automates the entire procurement discovery lifecycle:
1. **Automated Web Scraping & Aggregation**: Periodically scans government and commercial portals using AI and headless browsers to find new tender opportunities.
2. **AI Fit Scoring & Matching**: Evaluates every discovered tender using LLMs (Large Language Models) against vendor profiles, generating fit scores (0–100%), recommendations (`STRONG_YES`, `YES`, `MAYBE`, `NO`), and rationale.
3. **Approval & Human-in-the-Loop Inbox**: Provides an interactive dashboard for procurement officers to review, approve, or reject tender opportunities.
4. **Agent-to-Agent (A2A) Autonomous Dispatch**: Once approved, tenders are automatically dispatched via standardized webhooks/A2A protocols to external supplier-side AI agents for automated bid preparation.
5. **Permanent Persistence & Delivery Tracking**: Stores all data in a relational PostgreSQL database with full audit logs and delivery delivery metrics.

---

## 🏗️ System Architecture & Technology Stack

```
                               ┌────────────────────────────────────────┐
                               │        React + Vite Frontend           │
                               │        (Port 5173 / Port 3001)         │
                               └──────────────────┬─────────────────────┘
                                                  │ REST APIs & SSE Stream
                                                  ▼
                               ┌────────────────────────────────────────┐
                               │       Node.js + Express Backend        │
                               │              (Port 3001)               │
                               └──────┬──────────────┬──────────────┬───┘
                                      │              │              │
                    SQL Queries & Pool│              │ AI Scrapes   │ Webhook Dispatch
                                      ▼              ▼              ▼
                     ┌──────────────────┐  ┌───────────┐  ┌──────────────────┐
                     │ PostgreSQL (5432)│  │ OpenRouter│  │ Supplier Agents  │
                     │ Permanent Store  │  │  DeepSeek │  │  (A2A Protocol)  │
                     └──────────────────┘  └───────────┘  └──────────────────┘
```

### 🧰 Frontend Tech Stack & Libraries Used
| Technology / Library | Version | Purpose in TenderMesh | How it connects to our code |
| :--- | :--- | :--- | :--- |
| **React** | 19.1.0 | Core UI Library | Renders all dynamic UI components, views, and pages. |
| **TypeScript** | 5.7.0 | Type Safety | Enforces strict interfaces (`Tender`, `TenderScore`, `DeliveryRecord`) across components. |
| **Vite** | 6.3.0 | Build Tool & Dev Server | Provides instant Hot Module Reloading (HMR) and bundles static dist files. |
| **@tanstack/react-query** | 5.62.0 | Async State & Data Fetching | Handles server state management, automated refetching, background updates, loading states, and caching. |
| **TailwindCSS** | 3.4.17 | CSS Framework | Provides utility classes for modern responsive glassmorphism design. |
| **Recharts** | 2.15.0 | Data Visualization | Renders interactive pie charts (Category distribution) and bar graphs (Status distribution) on the Dashboard. |
| **clsx / tailwind-merge** | 2.1.1 / 3.0.0 | Utility Class Merging | Merges dynamic conditional Tailwind classes without specificity conflicts (`cn()` function). |

### 🧰 Backend Tech Stack & Libraries Used
| Technology / Library | Version | Purpose in TenderMesh | How it connects to our code |
| :--- | :--- | :--- | :--- |
| **Node.js** | 20.x | JavaScript Runtime | Executes backend server logic and async asynchronous tasks. |
| **Express.js** | 4.21.2 | HTTP Server Framework | Handles routing (`/api/tenders`, `/api/admin`, `/api/scan`, etc.), middleware, and static asset serving. |
| **pg (node-postgres)** | 8.22.0 | PostgreSQL Client | Connects to PostgreSQL database via connection pooling for execute SQL queries & transactions. |
| **Playwright** | 1.61.1 | Headless Browser Scraper | Automates headless Chrome browser to render JavaScript-heavy government procurement portals. |
| **JSDOM** | 26.1.0 | HTML Parser | Parses raw HTML documents into DOM trees on the server for regex/selector extraction. |
| **Helmet** | 8.3.0 | HTTP Security Headers | Protects against XSS, clickjacking, and MIME sniffing attacks. |
| **express-rate-limit** | 7.5.1 | Rate Limiting | Throttles API requests to protect endpoints against abuse or DDoS. |
| **CORS** | 2.8.5 | Cross-Origin Policy | Allows secure browser requests between frontend and backend origins. |
| **Compression** | 1.8.1 | Gzip Compression | Compresses HTTP JSON responses for faster network transfer speeds. |
| **Zod** | 4.4.3 | Schema Validation | Validates incoming request payloads and data models. |

---

## 📁 Repository Directory Structure & File Map

Here is the exact file layout of the project and what every file does:

```
Tenders_mesh-main/
├── docker-1/
│   ├── docker-compose.yml       # Docker container orchestration (Postgres, Backend, Frontend)
│   ├── Dockerfile               # Multi-stage production container build definition
│   └── .env.docker              # Docker environment variables (DB credentials, API keys)
├── tendermesh-discovery/        # Primary codebase directory
│   ├── frontend/                # React Vite Frontend Application
│   │   ├── src/
│   │   │   ├── main.tsx         # React app entry point
│   │   │   ├── App.tsx          # Main React App shell (Providers setup)
│   │   │   ├── app/             # Application Pages/Screens
│   │   │   │   ├── Layout.tsx            # Main shell with sidebar, topbar, route switching
│   │   │   │   ├── Dashboard.tsx         # Executive dashboard with analytics & charts
│   │   │   │   ├── Discovery.tsx         # Tender discovery inbox & filters
│   │   │   │   ├── AdminDeliveries.tsx   # "My Tenders" supplier dispatch delivery log
│   │   │   │   ├── TenderArchive.tsx     # "Archive" permanent record of decided tenders
│   │   │   │   ├── Settings.tsx          # System settings, supplier webhooks & scraper sources
│   │   │   │   └── Profile.tsx           # User profile & entrance security settings
│   │   │   ├── components/      # UI & Feature Components
│   │   │   │   ├── layout/Sidebar.tsx    # Navigation menu
│   │   │   │   ├── ui/                   # Reusable buttons, icons, toasts, metrics
│   │   │   │   └── discovery/            # Tender detail side drawer & approval bars
│   │   │   ├── features/tenders/# React Query Custom Hooks
│   │   │   │   ├── useTenders.ts         # Query hook for GET /api/tenders
│   │   │   │   ├── useApproveTender.ts   # Mutation hook for approving/rejecting tenders
│   │   │   │   ├── useDeliveries.ts      # Query hook for delivery status logs
│   │   │   │   └── useTriggerScan.ts     # Mutation hook for starting scraper scans
│   │   │   ├── lib/             # Utility Libraries
│   │   │   │   ├── api.ts                # Fetch API wrapper for backend communication
│   │   │   │   ├── sse.ts                # Server-Sent Events client for real-time feed
│   │   │   │   └── utils.ts              # Classname merger helper
│   │   │   └── types/
│   │   │       └── tender.ts             # Global TypeScript interface definitions
│   │   ├── vite.config.ts       # Vite build configuration & API proxy setup
│   │   └── package.json         # Frontend dependencies
│   ├── src/                     # Node.js Express Backend Application
│   │   ├── main.ts              # Server execution entry point
│   │   ├── app.ts               # Core Application class, Express pipeline setup
│   │   ├── config/
│   │   │   └── config.service.js# Centralized env variable configuration manager
│   │   ├── db/                  # Database Layer
│   │   │   ├── schema.sql       # PostgreSQL DDL table definitions
│   │   │   ├── store.ts         # Data store abstraction (Postgres primary + in-memory fallback)
│   │   │   └── seed.ts          # Sample data seeder (checks DB before seeding)
│   │   ├── scrapers/            # Scraper Pipeline Engine
│   │   │   └── sources.registry.ts # Dynamic web source registry & AI scraper triggers
│   │   ├── services/            # Business Logic Services
│   │   │   ├── a2a-dispatch.service.ts # A2A dispatch protocol to supplier agents
│   │   │   └── http-client.js   # Robust HTTP client with timeout handling
│   │   ├── routes/              # Express API Route Handlers
│   │   │   ├── index.ts         # Router aggregation
│   │   │   ├── tenders.routes.ts# Tender listing, filtering, approval routes
│   │   │   ├── admin.routes.ts  # Admin delivery logs & retry routes
│   │   │   ├── scan.routes.ts   # Scraper scan triggers & status routes
│   │   │   ├── events.routes.ts # SSE real-time event streaming route
│   │   │   ├── settings.routes.ts # Settings, supplier machine & source management
│   │   │   ├── health.routes.ts # Healthcheck & readiness endpoints
│   │   │   ├── a2a.routes.ts    # Agent card & assessment endpoints
│   │   │   └── supplier-demo.routes.ts # Mock supplier agent webhook receiver
│   │   ├── middleware/
│   │   │   └── error-handler.ts # Global Express error handling middleware
│   │   └── utils/
│   │       └── logger.ts        # Structured logger
│   └── package.json             # Backend dependencies
```

---

## 🔍 Detailed Functionality & Interconnection Walkthrough

### 1. Database Schema & Persistence (`src/db/schema.sql` & `src/db/store.ts`)
TenderMesh uses PostgreSQL as its primary single source of truth:
* `discovered_tenders`: Stores core tender attributes (`id`, `source`, `source_url`, `source_id`, `title`, `buying_org`, `category`, `location`, `estimated_value`, `currency`, `deadline`, `mandatory_reqs`, `status`). Unique index on `(source, source_id)` prevents duplicate inserts during web scans.
* `tender_scores`: Stores AI evaluation scores (`overall_score`, `recommendation`, `score_reasons`).
* `tender_approvals`: Stores human decision status (`PENDING`, `APPROVED`, `REJECTED`, `approved_at`, `notes`).
* `tender_deliveries`: Stores dispatch attempts to external supplier AI endpoints (`delivered`, `attempted_at`, `error_message`, `status_code`, `payload`).
* **Seeding Logic (`src/db/seed.ts`)**: On server startup, `seedDatabaseIfEmpty(pool)` runs `SELECT COUNT(*) FROM discovered_tenders`. If count > 0, it **skips seeding**, ensuring existing real user data is never overwritten on server restart.

### 2. Frontend React Flow & API Interconnection

```
[User Action in Browser]
       │
       ▼
[Page / Component (e.g. Discovery.tsx / TenderArchive.tsx)]
       │
       ▼
[TanStack Query Hook (useTenders.ts / useApproveTender.ts)]
       │
       ▼
[API Wrapper Client (lib/api.ts)]
       │ HTTP Request (e.g. GET /api/tenders?approval_status=APPROVED)
       ▼
[Express Router (routes/tenders.routes.ts)]
       │ SQL SELECT with JOINs
       ▼
[PostgreSQL Database Pool]
```

#### Detailed Page Breakdown:
1. **`Dashboard.tsx`**:
   - Calls `useTenders({ per_page: 1000 })`.
   - Computes total metrics in memory (`total`, `totalValue`, `aiMatches`, `deadlineAlerts`).
   - Renders interactive SVG visual charts using `Recharts`:
     - `PieChart`: Categorical breakdown of tenders (IT Services, Construction, etc.).
     - `BarChart`: Status breakdown (Approved vs Rejected vs Pending).
   - Displays a summary table of recent discoveries with quick view drawers.

2. **`Discovery.tsx` (Tender Inbox)**:
   - Functions as the inbox for new opportunities (`approval_status: 'PENDING'`).
   - Provides filtering controls by country, city, category, and text search.
   - Clicking "Scan" calls `useTriggerScan()`, which posts to `/api/scan`. The backend triggers AI scrapers asynchronously.
   - Subscribes to real-time updates via `lib/sse.ts` listening to `/api/events` (e.g. `DUPLICATE_TENDER`, `SCAN_COMPLETED`).
   - Clicking a tender opens `TenderDetailDrawer.tsx` to view AI scoring details and mandatory requirements.
   - Clicking **Approve** or **Reject** triggers `useApproveTender()`.

3. **`AdminDeliveries.tsx` ("My Tenders")**:
   - Displays the dispatch logs for approved tenders.
   - Calls `useDeliveries()`, fetching from `/api/admin/deliveries`.
   - Shows whether the tender was successfully delivered (`Delivered` vs `Failed`) to the supplier agent's webhook URL, along with error messages and retry buttons.

4. **`TenderArchive.tsx` ("Archive")**:
   - Serves as the permanent historical log of decided tenders.
   - Tabs allow filtering by `ALL` (uses custom backend status `DECIDED`), `APPROVED`, or `REJECTED`.
   - Enables re-approving, rejecting, or re-dispatching any archived tender at any time.

5. **`Settings.tsx`**:
   - Manages company profile credentials, LLM API keys (OpenAI / OpenRouter), custom web scraper sources, and supplier machine endpoints (`/api/settings/*`).

---

## ⚡ Step-by-Step Data Flow: What happens when you approve a Tender?

To illustrate how backend and frontend functions connect seamlessly:

1. **User Action**: Procurement officer clicks **"Approve"** on Tender `#TM-1002` in `Discovery.tsx`.
2. **Frontend Hook**: `handleApprove()` calls `approveMutation.mutate({ tender_id: '1002', status: 'APPROVED' })` in `useApproveTender.ts`.
3. **HTTP Call**: `api.post('/tenders/1002/approve', { status: 'APPROVED' })` sends a POST request.
4. **Backend Route**: In `src/routes/tenders.routes.ts`, `router.post('/:id/approve')` executes:
   - Begins a PostgreSQL transaction.
   - Updates `tender_approvals` table setting `status = 'APPROVED'`, `approved_at = NOW()`.
   - Fetches configured supplier endpoints from database table `supplier_machines` (or fallback config).
   - Instantiates `A2ADispatchService` (`src/services/a2a-dispatch.service.ts`).
5. **A2A Dispatch Execution**: `dispatchService.dispatchTenderToSupplier(tenderId, supplier)` sends an HTTP POST payload with tender metadata to the supplier agent webhook URL (`/tenders/receive`).
6. **Audit Logging**: The HTTP response code (e.g. `200 OK` or `500 Error`) is inserted directly into the `tender_deliveries` table.
7. **Frontend State Refresh**: TanStack Query receives `200 OK`, invalidates the `tenders` query cache, displays a success Toast notification, and automatically refetches the updated list. The tender disappears from the Inbox and moves to the Archive and Delivery log!

---

## 🐳 Docker Deployment & Hot Reload Architecture

The project contains a complete production and development containerization setup in `docker-1/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: tendermesh-postgres
    ports:
      - '5433:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data # Permanent data volume

  tendermesh-backend:
    image: node:20
    container_name: tendermesh-backend
    working_dir: /app
    volumes:
      - ../tendermesh-discovery:/app
      - backend_modules:/app/node_modules
    command: sh -c "npm install && npm run dev"
    ports:
      - '3001:3001'

  tendermesh-frontend:
    image: node:20
    container_name: tendermesh-frontend
    working_dir: /app/frontend
    volumes:
      - ../tendermesh-discovery:/app
      - frontend_modules:/app/frontend/node_modules
    command: sh -c "npm install && npm run dev"
    ports:
      - '5173:5173'
```

### Key Advantages of this setup:
* **Permanent Data**: The `postgres_data` volume ensures all saved tenders, approvals, and settings persist across container restarts.
* **Instant Hot Reloading (HMR)**: Mounting `../tendermesh-discovery` into the containers allows developers to edit code in any editor, and changes immediately reflect in the browser on `http://localhost:5173` without rebuilding container images!

---

## 💡 User Operations & Data Lifecycle Guide

### 1. Discovery Inbox vs. Archive & Deliveries Lifecycle
- **Discovery Tab**: Acts as an **Inbox** specifically for unprocessed tenders (status = `PENDING`).
- **When Approving/Rejecting**: Clicking `✓ Approve` or `✕ Reject` changes the tender status to `APPROVED` or `REJECTED`. 
- **Data Movement**: Approved or rejected tenders move OUT of the Discovery Inbox and into **Archive** and **My Tenders (Deliveries)**. They are stored permanently in PostgreSQL and can be viewed at any time under those tabs.

### 2. Database Duplicate Prevention
- PostgreSQL enforces strict uniqueness via `UNIQUE(source, source_id)`.
- When running a scan (`POST /api/scan`), if a scraped tender already exists in PostgreSQL, the database skips duplicate insertion (`SKIPPED_DUPLICATE`) to prevent database flooding.

### 3. Docker Volume Persistence Rules
- **`docker compose stop` / `docker compose down`**: Preserves the `postgres_data` volume permanently on disk. All tenders, approvals, and logs are saved across restarts.
- **`docker compose down -v`**: Wipes the database hard drive volume. When Docker restarts, it initializes a fresh database with the seeder dataset.

---

## 🎓 Summary for Bosses & Technical Evaluators

TenderMesh is built with **enterprise standards**:
* **Scalable Architecture**: Clean separation between React UI presentation, Express REST APIs, and PostgreSQL database storage.
* **Resilient Operations**: Dual-mode storage (PostgreSQL primary with graceful in-memory fallback), structured logging, and healthcheck probes (`/health`).
* **Real-time & AI Integrated**: Features Server-Sent Events (SSE) for live activity streaming and OpenRouter LLM integration for automated tender scoring.
* **Developer Friendly**: Zero-downtime hot-reloading development environment powered by Vite and Docker.

---
*Documentation compiled and verified for TenderMesh v1.0.0 Release.*
