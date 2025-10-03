# -------- Base build image --------
FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production
# Install system deps for Prisma eng/openssl
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# -------- Install & build --------
FROM base AS build

# Copy package manifests
COPY package.json ./
COPY ../../package.json ../../package.json
COPY ../../packages/shared/package.json ../../packages/shared/package.json
COPY ../../packages/database/package.json ../../packages/database/package.json

# Install dependencies
RUN npm install

# Ensure TypeScript is available globally
RUN npm install -g typescript

# Copy source files
COPY . .
COPY ../../packages/shared ../../packages/shared
COPY ../../packages/database ../../packages/database

# Generate Prisma clients
RUN npx prisma generate --schema ../../packages/database/prisma/master-schema.prisma && \
    npx prisma generate --schema ../../packages/database/prisma/tenant-schema.prisma

# Build shared package first
RUN cd ../../packages/shared && npm run build

# Build backend
RUN npm run build

# -------- Runtime image --------
FROM base AS runtime
WORKDIR /app

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/../../packages/database/generated ./packages/database/generated
COPY --from=build /app/../../packages/shared/dist ./packages/shared/dist

# Expose the backend port
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]
