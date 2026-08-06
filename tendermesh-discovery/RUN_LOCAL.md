# Run Locally

## Windows one-click start
Run [start-local.bat](../start-local.bat) from the repo root.

It starts:
- backend on `http://localhost:3001`
- frontend on `http://localhost:5173`
- browser at `http://localhost:5173`

## Manual start
Open two terminals:

Backend:

```bash
cd tendermesh-discovery
npm run dev
```

Frontend:

```bash
cd tendermesh-discovery/frontend
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Notes
- If `API_PORT` is set in `.env`, use that backend port instead of `3001`.
- The frontend proxies `/api` requests to the backend.
- Close any already running backend or frontend instances first, or the fixed ports `3001` and `5173` will be blocked.