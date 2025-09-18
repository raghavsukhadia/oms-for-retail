# Multi-stage Docker build for OMSMS SaaS Platform

# Build stage for shared package
FROM node:18-alpine AS shared-builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --only=production

COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN npm run build

# Build stage for backend
FROM node:18-alpine AS backend-builder
WORKDIR /app

# Copy root package.json and shared package
COPY package*.json ./
COPY --from=shared-builder /app/packages/shared ./packages/shared
COPY packages/backend/package*.json ./packages/backend/

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY packages/backend ./packages/backend

# Build backend
WORKDIR /app/packages/backend
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    postgresql-client \
    curl \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S omsms -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

# Copy built applications
COPY --from=shared-builder --chown=omsms:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=shared-builder --chown=omsms:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=backend-builder --chown=omsms:nodejs /app/packages/backend/dist ./packages/backend/dist
COPY --from=backend-builder --chown=omsms:nodejs /app/node_modules ./node_modules

# Copy database files
COPY --chown=omsms:nodejs packages/database ./packages/database

# Create necessary directories
RUN mkdir -p /app/uploads /app/temp/reports /app/logs && \
    chown -R omsms:nodejs /app/uploads /app/temp /app/logs

# Switch to non-root user
USER omsms

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3001}/api/health || exit 1

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "packages/backend/dist/index.js"]

# Build arguments
ARG NODE_ENV=production
ARG BUILD_DATE
ARG VERSION
ARG COMMIT_HASH

# Labels
LABEL maintainer="OMSMS Team" \
      version="${VERSION}" \
      description="OMSMS SaaS Platform Backend" \
      build-date="${BUILD_DATE}" \
      commit-hash="${COMMIT_HASH}" \
      node-version="18"

# Environment variables
ENV NODE_ENV=${NODE_ENV} \
    PORT=3001 \
    NODE_OPTIONS="--max-old-space-size=2048"