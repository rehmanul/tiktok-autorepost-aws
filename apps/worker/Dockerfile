# Multi-stage build for NestJS Worker
FROM node:20-alpine AS builder

# Install dependencies for node-gyp
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/worker/package*.json ./apps/worker/
COPY packages/common/package*.json ./packages/common/
COPY packages/domain/package*.json ./packages/domain/
COPY packages/integrations-tiktok/package*.json ./packages/integrations-tiktok/

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/worker ./apps/worker
COPY packages ./packages
COPY prisma ./prisma
COPY tsconfig.json ./

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build the Worker
RUN npm run build --workspace=@autorepost/worker

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files for production dependencies
COPY package*.json ./
COPY apps/worker/package*.json ./apps/worker/
COPY packages/common/package*.json ./packages/common/
COPY packages/domain/package*.json ./packages/domain/
COPY packages/integrations-tiktok/package*.json ./packages/integrations-tiktok/

# Install production dependencies only
RUN npm ci --only=production --workspace=@autorepost/worker

# Copy built assets from builder
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set NODE_ENV
ENV NODE_ENV=production

# Health check (worker doesn't have HTTP endpoint, just check if process is running)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD ps aux | grep -q '[n]ode.*worker' || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the Worker
CMD ["node", "apps/worker/dist/main.js"]
