# Device Requirements

Use this file when moving the project to another computer.

## Prerequisites
- Node.js installed
- npm available in PATH
- PostgreSQL running locally
- A `.env` file in `tendermesh-discovery` with the required database settings

## Install dependencies
Run [install-deps.bat](install-deps.bat) from the workspace root.

It installs:
- root dependencies
- backend dependencies in `tendermesh-discovery`
- frontend dependencies in `tendermesh-discovery/frontend`

## Run the app
After installation, run [start-local.bat](start-local.bat) from the workspace root.

That starts:
- backend on `http://localhost:3001`
- frontend on `http://localhost:5173`
- browser open to `http://localhost:5173`

## Notes
- Stop any old processes using ports `3001` and `5173` before starting.
- If `API_PORT` is set in `.env`, use that backend port instead of `3001`.