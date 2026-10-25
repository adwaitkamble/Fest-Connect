# =====================================================================
# FestConnect API — Multi-Stage Production Dockerfile
# Node.js 22 LTS Alpine Runtime
# =====================================================================

# ---------------------------------------------------------------------
# Stage 1: Build & Assets Preparation
# ---------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy monorepo manifests
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install build dependencies
RUN npm ci --workspace=@festconnect/api

# Copy API source code and build scripts
COPY apps/api/ ./apps/api/

# Compile TypeScript and copy migration assets
RUN npm run build --workspace=@festconnect/api

# ---------------------------------------------------------------------
# Stage 2: Minimal Production Runtime
# ---------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Install curl for container health check probes
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=4000

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install only production dependencies
RUN npm ci --omit=dev --workspace=@festconnect/api && npm cache clean --force

# Copy compiled artifacts and entrypoint from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh

# Ensure executable permissions on entrypoint script
RUN chmod +x ./apps/api/docker-entrypoint.sh

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=5s --timeout=3s --retries=5 --start-period=5s \
  CMD curl -f http://localhost:4000/api/health || exit 1

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
