#!/usr/bin/env bash

if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run with sudo: sudo bash start-online.sh"
  exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🐳 Starting Docker..."
docker compose -f docker-1/docker-compose.yml up --build -d

echo "⏳ Waiting for backend (port 3001)..."
READY=0
for i in $(seq 1 45); do
  if (exec 3<>/dev/tcp/127.0.0.1/3001) 2>/dev/null; then
    exec 3>&- 3<&- 2>/dev/null
    echo "✅ Backend is ready on port 3001"
    READY=1
    break
  fi
  echo "  [Attempt $i/45] port 3001 not open yet..." >&2
  sleep 2
done

if [ "$READY" -eq 0 ]; then
  echo "❌ Backend did not open port 3001 within 90s." >&2
  echo "📋 Check logs: docker compose -f docker-1/docker-compose.yml logs tendermesh-app" >&2
  exit 1
fi

echo ""
echo "============================================================"
echo "⚠️  Localtunnel is known to be unreliable and often shows '502 Bad Gateway'."
echo "If Localtunnel is down, open a NEW terminal and run this backup command for a stable tunnel:"
echo "👉 ssh -p 443 -R0:localhost:3001 a.pinggy.io"
echo "============================================================"
echo ""

echo "🔑 Fetching your Localtunnel bypass password (your Public IP)..."
TUNNEL_PASS=$(node -e "require('https').get('https://loca.lt/mytunnelpassword', r => { let d=''; r.on('data', c=>d+=c); r.on('end', ()=>console.log(d.trim())) }).on('error', ()=>console.log('Unknown'))")
echo "👉 Localtunnel Bypass Password (if requested in browser): $TUNNEL_PASS"

echo "🌐 Launching fixed-subdomain LocalTunnel (https://tendermesh-discovery.loca.lt)..."
echo "Press Ctrl+C to stop."
if [ -n "$SUDO_USER" ]; then
  sudo -u "$SUDO_USER" npx -y localtunnel --host https://localtunnel.me --local-host 127.0.0.1 --port 3001 --subdomain tendermesh-discovery
else
  npx -y localtunnel --host https://localtunnel.me --local-host 127.0.0.1 --port 3001 --subdomain tendermesh-discovery
fi
