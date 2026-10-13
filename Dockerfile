# ==============================================================================
# MediCloud — Production Dockerfile
# Multi-arch compatible, non-root user, built-in health checks
# Requires Node.js >= 22.5.0 for native node:sqlite
# ==============================================================================

FROM node:22-bookworm-slim AS base

# Install curl for optional container diagnostic checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Ensure storage directories exist with write permissions for non-root 'node' user
RUN mkdir -p /app/database /app/data/backups && \
    chown -R node:node /app

# Switch to unprivileged user for security compliance (Principle of Least Privilege)
USER node

# Expose HTTP port
EXPOSE 3000

# Environment Defaults
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_TYPE=sqlite \
    DATABASE_PATH=/app/database/medicloud.sqlite \
    BACKUP_DIRECTORY=/app/data/backups \
    TRUST_PROXY=true

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the MediCloud application
CMD ["node", "server.js"]
