# 📘 TenderMesh — Startup & PC Reboot Instructions

This document contains the exact commands to start, rebuild, and access your TenderMesh Discovery system online with a **stable free tunnel** (`https://<random>.trycloudflare.com`).

> **Note:** The tunnel URL is stable for the lifetime of the tunnel process, but it changes between restarts unless you configure a named Cloudflare Tunnel. This is normal for the free quick-tunnel mode.

---

## ⚡ Quickest Method (One-Command Script)

Whenever you restart your PC or update code, open your terminal and run:

```bash
sudo bash /home/ammar/Downloads/Tenders_mesh-main/start-online.sh
```

*(The script automatically waits for the backend to open port 3001 BEFORE launching the tunnel.)*

---

## 🌐 Your Online URL

After the script finishes, it prints a **working public URL** in the terminal. It will look like:

👉 **`https://<random-id>.trycloudflare.com`**

Open that URL in any browser. If you close the terminal or stop the script, the tunnel stops and the URL expires.

---

## 🛠️ Step-by-Step Manual Method

If you prefer to run the commands manually:

### Step 1: Rebuild & Start Docker Container
```bash
cd /home/ammar/Downloads/Tenders_mesh-main/docker-1
sudo docker compose up --build -d
```

### Step 2: Start Cloudflare Tunnel
```bash
cloudflared tunnel --url http://127.0.0.1:3001
```

### Step 3: (Fallback) Start pinggy SSH Tunnel
If `cloudflared` is not installed:
```bash
ssh -p 443 -R0:localhost:3001 a.pinggy.io
```

---

## 📊 How to Check Stored Tenders in PostgreSQL

To verify that your data is saved in PostgreSQL from the terminal at any time:

```bash
cd /home/ammar/Downloads/Tenders_mesh-main/tendermesh-discovery
node -e "const {Pool} = require('pg'); const pool = new Pool({connectionString: 'postgresql://postgres:postgres_pass@localhost:5433/tendermesh'}); pool.query('SELECT source, title, scraped_at FROM discovered_tenders ORDER BY scraped_at DESC LIMIT 10').then(r=>console.log(r.rows)).finally(()=>pool.end())"
```
