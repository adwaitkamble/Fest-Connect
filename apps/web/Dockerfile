# =====================================================================
# FestConnect Web — Multi-Stage Production Dockerfile
# React SPA with Nginx Alpine
# =====================================================================

# ---------------------------------------------------------------------
# Stage 1: Build React Production SPA Bundle
# ---------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy monorepo manifests
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

# Install build dependencies
RUN npm ci --workspace=@festconnect/web

# Copy web source code and configuration
COPY apps/web/ ./apps/web/

# Compile TypeScript and bundle via Vite
RUN npm run build --workspace=@festconnect/web

# ---------------------------------------------------------------------
# Stage 2: Nginx Web Server & Reverse Proxy
# ---------------------------------------------------------------------
FROM nginx:1.25-alpine AS runner

# Remove default nginx boilerplate
RUN rm -rf /usr/share/nginx/html/*

# Copy built SPA distributable assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy production Nginx reverse proxy configuration
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
