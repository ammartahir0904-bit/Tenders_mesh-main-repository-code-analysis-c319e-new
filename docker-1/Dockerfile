# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY tendermesh-discovery/frontend/package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY tendermesh-discovery/frontend ./
RUN npm run build

# ==========================================
# Stage 2: Build Node Backend & Production Bundle
# ==========================================
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=3001

COPY tendermesh-discovery/package*.json ./
RUN npm ci --include=dev --prefer-offline --no-audit

# Install Playwright dependencies for the AI Scraper rendering
RUN npx playwright install --with-deps chromium

COPY tendermesh-discovery ./

# Copy compiled frontend into backend's public static directory
COPY --from=frontend-builder /app/frontend/dist /app/public

EXPOSE 3001

CMD ["npm", "start"]
