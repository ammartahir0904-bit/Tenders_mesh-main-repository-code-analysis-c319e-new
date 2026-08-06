# Agent Documentation

## What this agent does
This workspace contains a TenderMesh discovery agent with a React frontend and a Node.js backend.

The agent's job in this task was to:
- inspect how the app starts
- identify why the backend and frontend were not starting cleanly together
- create a simple one-command launch path
- document the working startup flow

## Problem we faced
The original expectation was that the backend and frontend could be started from one command and opened in one browser URL.

That was not working reliably because:
- the backend and frontend are separate processes
- the frontend dev server can silently move to another port when `5173` is already in use
- the browser was being opened to `http://localhost:5173` even when Vite had moved to `5174`
- the backend could fail with `EADDRINUSE` if `3001` was already occupied

## What issue was solved
The real issue was not the launcher itself. The real issue was port drift and port conflicts.

The fix was to:
- keep the backend on `3001`
- force the frontend to stay on `5173`
- add a Windows launcher script at the repo root
- add a root npm script so the app can be started with one command

## Files added or changed
- [start-local.bat](start-local.bat)
- [install-deps.bat](install-deps.bat)
- [package.json](package.json)
- [tendermesh-discovery/frontend/vite.config.ts](tendermesh-discovery/frontend/vite.config.ts)
- [tendermesh-discovery/RUN_LOCAL.md](tendermesh-discovery/RUN_LOCAL.md)
- [DEVICE_REQUIREMENTS.md](DEVICE_REQUIREMENTS.md)

## How to run
From the workspace root:

```bash
npm run dev
```

Before that, on a new device, run [install-deps.bat](install-deps.bat).

That launches:
- backend on `http://localhost:3001`
- frontend on `http://localhost:5173`
- browser open to `http://localhost:5173`

## Important note
This one-command flow only works if nothing else is already using ports `3001` and `5173`.

If those ports are already taken, stop the existing processes first. Otherwise the backend or frontend will fail to start.

## Validation performed
- confirmed the root npm script points to the launcher
- confirmed the backend dev server fails with `EADDRINUSE` when `3001` is already in use
- confirmed the frontend previously drifted to `5174` when `5173` was occupied
- updated Vite to use `strictPort` so the browser URL and dev server stay aligned

## Summary
The app is not a single process app. It is a two-process app with a one-command launcher.

The actual fix was making the startup predictable and documenting the required ports and workflow.