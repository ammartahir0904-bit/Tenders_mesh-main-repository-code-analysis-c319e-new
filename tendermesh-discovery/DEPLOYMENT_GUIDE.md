# TenderMesh Cloud & Internet Deployment Guide

This guide provides step-by-step instructions for deploying TenderMesh to any Cloud VPS (DigitalOcean, Hetzner, AWS, Linode) or Cloud PaaS (Railway, Render).

---

## Method 1: Cloud VPS (Recommended for Production)

### 1. Provision a Server
- Provision an Ubuntu 22.04 or 24.04 LTS server (minimum 2GB RAM recommended for Playwright headless browser).

### 2. Install Docker & Docker Compose
Connect to your VPS via SSH and run:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git
sudo systemctl enable --now docker
```

### 3. Clone Repository & Run
```bash
git clone <your-repository-url>
cd tendermesh-discovery
```

Start all containers in background mode:
```bash
docker-compose up --build -d
```

### 4. Enable Nginx & SSL (Certbot)
To serve your web app over HTTPS (`https://yourdomain.com`):
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Configure Nginx site (`/etc/nginx/sites-available/tendermesh`):
```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site & get SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/tendermesh /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Method 2: One-Click Cloud PaaS (Railway / Render)

1. **Connect GitHub Repo**: Connect your GitHub repository to Railway/Render.
2. **Database**: Provision a managed PostgreSQL instance or use the included `docker-compose.yml`.
3. **Set Environment Variables**:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `GROQ_API_KEY`: Your Groq API Key
   - `SUPPLIER_ENDPOINT`: Endpoint of supplier agent (`http://<supplier-ip>:8000/tenders/receive`)
4. **Deploy**: Select `Docker Compose` or `Dockerfile` deployment mode.

---

## Useful Docker Commands

- **Check container status**: `docker-compose ps`
- **View live logs**: `docker-compose logs -f`
- **Restart containers**: `docker-compose restart`
- **Stop all containers**: `docker-compose down`
- **Reset database data**: `docker-compose down -v`

---

## Troubleshooting

### Scan Returns Zero Tenders

If scans complete but no tenders are stored, check the following:

#### 1. Groq API Key Not Set or Invalid
```bash
# Check if the key is set in the container
docker exec tendermesh-app printenv GROQ_API_KEY
```
If empty, set it in `docker-1/.env.docker` and rebuild:
```bash
cd docker-1 && sudo docker compose up --build -d
```

#### 2. AI Models Rate-Limited (HTTP 429)
Free models on Groq (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`) have strict rate limits. If you see `⚠️ All models failed or rate-limited` in scan logs:

- **Option A**: Wait a few minutes and retry (rate limits reset periodically).
- **Option B**: Add a payment method on Groq Cloud to increase your rate limits or use a smaller, faster model. Set `LLM_MODEL` in `.env.docker`:
  ```
  LLM_MODEL=llama-3.1-8b-instant
  ```
  Smaller models are faster and less prone to strict limits.
- **Option C**: Use the default HTML fallback parser if you just want to avoid AI scraping altogether.

The system has an automatic retry and exponential backoff. If models are rate-limited, the **HTML fallback parser** will still attempt to extract tenders without AI.

#### 3. "Invalid time value" Error
This was a bug where `new Date(invalidString).toISOString()` would crash. It has been fixed — all date parsing is now wrapped in try-catch with `isNaN()` validation. If you still see this error, ensure you're running the latest code:
```bash
cd docker-1 && sudo docker compose up --build -d
```

#### 4. Playwright Browser Issues
If you see `Failed to render` or `Browser unavailable` errors:
```bash
# Check if Playwright/Chromium is installed in the container
docker exec tendermesh-app npx playwright install --with-deps chromium
```

#### 5. Database Connection Issues
```bash
# Check PostgreSQL is running
docker exec tendermesh-postgres pg_isready -U postgres

# Check the app can connect
docker exec tendermesh-app printenv DATABASE_URL
```

#### 6. Changing the AI Model at Runtime
You can change the model without rebuilding via the Settings API:
```bash
curl -X POST http://localhost:3001/api/settings/env \
  -H "Content-Type: application/json" \
  -d '{"LLM_MODEL": "llama-3.3-70b-versatile"}'
```

### Recommended Production Configuration

For reliable production deployments, use a **paid model** instead of free-tier models:

```env
# .env.docker
LLM_MODEL=deepseek/deepseek-chat
```

Free models are rate-limited and may fail during concurrent scans. Paid models like `deepseek/deepseek-chat` are extremely affordable (~$0.14/M tokens) and provide 99.9% uptime with no rate limits.
