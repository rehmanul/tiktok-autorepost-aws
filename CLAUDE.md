# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Codebase Context

This file provides essential context about the autorepost-dash codebase to help Claude understand the project structure, architecture, and common workflows.

## Project Overview

This is a **TikTok autoreposting platform** - a multi-service system for automated content distribution from TikTok to Instagram, YouTube, and Twitter/X. The system is **85% production-ready** with core authentication, OAuth flows, job processing, and publishing integrations operational.

**Key characteristics:**
- Turborepo monorepo with 3 services + shared packages
- Tenant-aware multi-user architecture
- OAuth-based social media connections
- BullMQ job queue for background processing
- Prometheus metrics and structured logging
- Encrypted token storage (AES-256-GCM)

## Architecture

### High-Level Structure

```
autorepost-dash/
├── apps/
│   ├── api/          # NestJS REST API (port 4000)
│   │                 # - Tenant-aware connection management
│   │                 # - Rule engine for autopost scheduling
│   │                 # - Job queue coordination
│   │                 # - S3 storage integration
│   │                 # - Security & authentication
│   ├── worker/       # NestJS background worker
│   │                 # - BullMQ job processors
│   │                 # - TikTok content ingestion
│   │                 # - Media downloading & processing
│   │                 # - Multi-platform publishing
│   └── web/          # Next.js 15 dashboard (port 3000)
│                     # - App Router architecture
│                     # - Tailwind CSS styling
│                     # - OAuth connection flows
│                     # - Rule management UI
├── packages/
│   ├── common/       # Shared utilities & cross-service helpers
│   ├── domain/       # Domain models, DTOs, validation schemas
│   └── integrations-tiktok/  # TikTok integration contracts
├── prisma/           # Database schema & migrations
└── docs/             # Living documentation & roadmap
```

### Technology Stack

- **Backend**: NestJS 10.x with TypeScript
- **Frontend**: Next.js 15 (App Router) + Tailwind CSS
- **Database**: PostgreSQL via Supabase + Prisma ORM 5.x
- **Authentication**: Supabase Auth + JWT (@nestjs/jwt, passport-jwt)
- **Queue**: BullMQ 5.x + Redis (IORedis)
- **Storage**: S3-compatible (@aws-sdk/client-s3) - Supabase Storage, AWS S3, or Backblaze B2
- **Metrics**: Prometheus (@willsoto/nestjs-prometheus, prom-client)
- **Logging**: Pino structured logging
- **Security**: bcryptjs, @nestjs/throttler (rate limiting), AES-256-GCM token encryption

### OAuth Integrations

- **Instagram**: OAuth 2.0 via Facebook Graph API, token refresh support, encrypted storage
- **YouTube**: OAuth 2.0 via Google Cloud Console, Data API v3, refresh tokens
- **Twitter/X**: OAuth 1.0a via Twitter Developer Portal, API v2 publishing
- **TikTok**: Cookie-based connection (legacy scraper being migrated to packages/integrations-tiktok)

### Data Flow

1. **Ingestion**: Worker polls TikTok or receives webhooks → downloads media to S3 → creates job records
2. **Job Queue**: BullMQ manages job processing with retry logic and status tracking
3. **Publishing**: Worker processes jobs → publishes to connected platforms (Instagram, YouTube, Twitter) → updates job status
4. **Monitoring**: Prometheus metrics track job completion/failure rates, queue depth, API response times

## Commonly Used Commands

### Development
```bash
npm run dev                  # Start all services (API + Worker + Web) via Turbo
npm run dev:services         # Start only backend services (API + Worker) in parallel
```

### Setup & Configuration
```bash
npm run generate:token-key   # Generate AES-256 encryption key for TOKEN_ENCRYPTION_KEY
npm run setup:supabase       # Create admin user (prompts for email, password, name)
npm run verify:setup         # Verify all environment variables and connections
npm run db:migrate           # Apply Prisma migrations to database
npm run db:seed              # Seed database with initial data
npm run db:studio            # Open Prisma Studio GUI for database inspection
```

### Build & Test
```bash
npm run build                # Build all workspaces via Turbo
npm run build:render         # Production build for Render.com deployment
npm run lint                 # Lint all workspaces
npm run test                 # Run Jest tests across all workspaces
npm run format               # Format code with Prettier
npm run smoke:test           # Post-deploy smoke tests (/health, /metrics endpoints)
```

### Individual Service Commands
```bash
# API service (from apps/api)
cd apps/api
npm run dev                  # Start API in dev mode (ts-node with hot reload)
npm run build                # Build API (TypeScript → dist/)
npm start                    # Run production build (node dist/main.js)
npm test                     # Run API tests

# Worker service (from apps/worker)
cd apps/worker
npm run dev                  # Start worker in dev mode
npm run build                # Build worker
npm start                    # Run production worker

# Web dashboard (from apps/web)
cd apps/web
npm run dev                  # Start Next.js dev server
npm run build                # Build static export
npm start                    # Serve production build
npm run typecheck            # Run TypeScript type checking
```

### Deployment
```bash
npm run render:start         # Start services on Render.com (script handles routing)
```

## Quick Start Workflow

**Time estimate: 15 minutes**

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate encryption key**:
   ```bash
   npm run generate:token-key
   ```
   Copy the output to your `.env` file as `TOKEN_ENCRYPTION_KEY`

3. **Configure environment**:
   ```bash
   cp env.production.example .env
   ```
   Edit `.env` with minimum required variables:
   - `DATABASE_URL` - PostgreSQL connection string from Supabase
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (NOT anon key!)
   - `SUPABASE_JWT_SECRET` - JWT secret from Supabase project settings
   - `TOKEN_ENCRYPTION_KEY` - From generate:token-key command
   - `REDIS_URL` - Redis connection string (Upstash free tier recommended)
   - S3 credentials (if using external storage)

4. **Initialize database**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Create admin user**:
   ```bash
   npm run setup:supabase
   ```
   Follow prompts to set email, password, and display name.

6. **Verify setup**:
   ```bash
   npm run verify:setup
   ```
   All checks should pass before proceeding.

7. **Start development**:
   ```bash
   npm run dev
   ```
   - API will be available at http://localhost:4000
   - Web dashboard at http://localhost:3000
   - Worker runs automatically in background

8. **Login**:
   Navigate to http://localhost:3000 and login with your admin credentials.

## Critical Setup Information

### Environment Configuration Files

The project has **three** environment configuration files:
- **`.env.example`** - Complete template for local development with detailed comments
- **`env.production.example`** - Production deployment template (Render.com, Vercel, etc.)
- **`.env.oauth.example`** - Legacy file, use `.env.example` instead
- **`.env`** - Your local configuration (gitignored, create from .env.example)

**First-time setup:**
```bash
cp .env.example .env
npm run generate:token-key  # Copy output to .env
# Fill in Supabase credentials in .env
npm run verify:setup  # Verify all checks pass
```

### Common Setup Mistakes

1. **Missing Supabase variables** - The API requires ALL of these:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Using wrong database connection string** - Must use **Direct** connection, not pooled

3. **TOKEN_ENCRYPTION_KEY not set** - API will fail to start. Run `npm run generate:token-key` first

4. **Redis TLS mismatch** - Local dev: `REDIS_TLS=false`, Upstash/production: `REDIS_TLS=true`

5. **OAuth callback URL mismatches** - Must match exactly in OAuth provider settings (no trailing slashes)

6. **S3 configuration** - MinIO (local dev) requires `S3_FORCE_PATH_STYLE=true`, AWS S3 requires `false`

### Environment Variables Reference

Complete documentation: [`docs/ENVIRONMENT_VARIABLES.md`](docs/ENVIRONMENT_VARIABLES.md)

## Important Project Context

### Security Critical
- **TOKEN_ENCRYPTION_KEY** must be set before first API boot - all OAuth tokens are encrypted at rest using AES-256-GCM
- Admin users have elevated privileges for managing connections and rules across all tenants
- Rate limiting is active on all auth endpoints via @nestjs/throttler
- Activity audit logging captures all user actions via Pino

### External Services Required

**Required now (for authentication)**:
- Supabase account - https://supabase.com

**Required later (for OAuth connections)**:
- Facebook/Instagram Developer Portal - https://developers.facebook.com - Need App ID + Secret
- Google Cloud Console - https://console.cloud.google.com - Need Client ID + Secret
- Twitter Developer Portal - https://developer.twitter.com - Need Consumer Key + Secret

**Optional but recommended**:
- Upstash Redis (free tier works) - https://upstash.com - For job queue and OAuth state
- S3-compatible storage - Supabase Storage (free tier), AWS S3, or Backblaze B2

### Development Workflow

1. **Database changes**: Edit `prisma/schema.prisma` → run `npm run db:migrate` → Prisma generates client
2. **API changes**: Edit files in `apps/api/src/` → hot reload via ts-node → test endpoints
3. **Worker changes**: Edit files in `apps/worker/src/` → restart worker to pick up changes
4. **Frontend changes**: Edit files in `apps/web/` → Next.js hot reload
5. **Shared code**: Edit packages (common, domain, integrations-tiktok) → Turbo rebuilds dependents

### Key Architecture Patterns

**NestJS API Module Structure** (`apps/api/src/modules/`):
- Each module is self-contained with its own controller, service, DTOs
- `AuthModule` handles JWT authentication with Supabase integration
- `OAuthModule` contains platform-specific OAuth strategies (Instagram, YouTube, Twitter, TikTok)
- `ConnectionsModule` manages social media account connections with token encryption
- `RulesModule` handles autopost rule configuration
- `QueueModule` coordinates BullMQ job queue
- `SecurityModule` provides token encryption/decryption services
- Guards: `JwtAuthGuard` (authentication), `RolesGuard` (authorization), `TenantScopeGuard` (multi-tenancy)

**Worker Architecture** (`apps/worker/src/main.ts`):
- Single-file worker with all job processors inline (TikTok sync, repost prep, publishing, token refresh)
- BullMQ workers process jobs from REPOST_DISPATCH queue
- Job types: `TIKTOK_SYNC`, `REPOST_PREP`, `REPOST_PUBLISH`, `TOKEN_REFRESH`
- Platform-specific publishers: `publishInstagramReel()`, `publishYouTubeShort()`, `publishTwitterVideo()`
- Token refresh handlers: `refreshInstagramToken()`, `refreshYouTubeToken()`

**Frontend Structure** (`apps/web/app/`):
- Next.js 15 App Router with route groups: `(auth)` for login, `(console)` for dashboard, `(legacy)` for old pages
- API client in `apps/web/lib/api/` with typed HTTP client and per-resource modules
- Supabase SSR integration via `apps/web/lib/auth/session.ts`
- OAuth connection flow managed by `apps/web/lib/hooks/use-oauth.ts`

**Database Schema** (`prisma/schema.prisma`):
- Multi-tenant architecture: All entities belong to `Tenant`
- `User` → `Connection` (social accounts) → `AutoPostRule` → `AutoPostDestination`
- Job processing: `ProcessingJob` tracks queue jobs, `RepostActivity` tracks publishing status
- `PostLog` stores TikTok posts with S3 media references
- Encrypted fields: `accessTokenEncrypted`, `refreshTokenEncrypted` (AES-256-GCM via `TokenCipherService`)

### Common Coding Patterns

**Adding a new OAuth platform**:
1. Create strategy in `apps/api/src/modules/oauth/strategies/[platform].strategy.ts`
2. Add platform enum to `SocialPlatform` in `prisma/schema.prisma`
3. Implement publisher function in `apps/worker/src/main.ts` (e.g., `publishPlatformVideo()`)
4. Add token refresh handler if applicable (e.g., `refreshPlatformToken()`)
5. Register strategy in `OAuthModule` imports

**Adding a new job type**:
1. Add enum value to `JobKind` in `prisma/schema.prisma`
2. Create handler function in `apps/worker/src/main.ts`
3. Register handler in `jobProcessors` object
4. Schedule jobs via `scheduleProcessingJob()` helper

**Creating a new API endpoint**:
1. Create DTO in `apps/api/src/modules/[module]/dto/`
2. Add method to controller with decorators (`@UseGuards(JwtAuthGuard)`, `@Roles()`, etc.)
3. Implement business logic in service
4. Use `@CurrentUser()` decorator to access authenticated user context

**Accessing encrypted tokens**:
- API: Inject `TokenCipherService` from `SecurityModule`
- Worker: Use module-level `tokenCipher` instance created by `createTokenCipher()`
- Always use `decrypt()` for optional tokens, `decryptStrict()` for required tokens

**Multi-tenancy enforcement**:
- All queries MUST filter by `tenantId` from authenticated user
- Use `TenantScopeGuard` for automatic tenant scoping in controllers
- Admin users can access cross-tenant data when explicitly required

### Production Deployment (Render.com)

**API Service** (Node.js):
- Build: `npm run build -- --filter=@autorepost/api`
- Start: `cd apps/api && npm start`
- Environment: All .env variables required

**Worker Service** (Node.js):
- Build: `npm run build -- --filter=@autorepost/worker`
- Start: `cd apps/worker && npm start`
- Environment: All .env variables required

**Web Service** (Static Site):
- Build: `npm run build -- --filter=@autorepost/web`
- Publish Directory: `apps/web/out`
- Environment: NEXT_PUBLIC_* variables only

### Observability

- **Prometheus metrics**: Exposed at `/metrics` on API (default port 4000)
- **Worker metrics**: Exposed on METRICS_PORT if enabled (disabled by default)
- **Smoke tests**: Run `npm run smoke:test` after deployment to verify `/health` and `/metrics` endpoints
- **Structured logging**: All services use Pino for JSON-formatted logs
- **Audit trail**: Activity logs track user actions for compliance

### Production Status (85% Complete)

**Fully Operational**:
- Identity & authentication (Supabase + JWT) - 100%
- OAuth connections (Instagram, YouTube, Twitter, TikTok) - 95%
- Job queue & ingestion (BullMQ + TikTok sync) - 90%
- Multi-platform publishing (Instagram, YouTube, Twitter) - 85%

**In Progress**:
- Observability dashboard aggregation - 75%
- OAuth token refresh background jobs - needs scheduling
- Rate limiting per platform - needs enhancement
- Alerting integration - needs Slack/email hooks
- Unit & integration tests - 60%

**Estimated time to full production**: 1-2 weeks

### Legacy & Migration Notes

- **Legacy code location**: `drafts/legacy-vercel-api` - Single-function Vercel deployment from earlier iteration
- **Migration plan**: Port relevant scraping logic from legacy into `packages/integrations-tiktok` before deletion
- **Reference materials**: Historical notes and specifications in `drafts/reference-materials`
- **Roadmap**: Follow `docs/implementation-roadmap.md` to continue development phases

### Troubleshooting Quick Reference

**Database connection failed?**
- Check DATABASE_URL format: `postgresql://user:pass@host:port/dbname`
- Verify Supabase project is active

**Supabase errors?**
- Verify SUPABASE_SERVICE_ROLE_KEY (must be service role, not anon key!)
- Check JWT secret matches Supabase project settings exactly

**OAuth not working?**
- Verify redirect URIs match exactly (no trailing slashes, correct protocol)
- Check OAuth apps are in production mode (not development/sandbox)
- Ensure TOKEN_ENCRYPTION_KEY is set before first OAuth flow

**Redis connection issues?**
- Verify REDIS_URL format includes credentials if required
- Check Upstash database is active and not paused

**Build failures?**
- Run `npm install` to ensure all dependencies installed
- Check Node version compatibility (project uses npm@11.5.2)
- Try cleaning: `rm -rf node_modules apps/*/node_modules packages/*/node_modules && npm install`

## Documentation References

### Getting Started
- **Quick Start**: `docs/QUICK_START.md` - 15-minute setup guide
- **Setup Guide**: `docs/SETUP.md` - Complete production setup
- **Environment Variables**: `docs/ENVIRONMENT_VARIABLES.md` - Complete configuration reference with examples

### Deployment & Operations
- **Deployment**: `DEPLOYMENT.md` - Deploy to Render.com or Vercel
- **Admin Setup**: `ADMIN_SETUP.md` - Create admin user and configure OAuth
- **Production Status**: `docs/PRODUCTION_STATUS.md` - Feature completion status (85% complete)
- **Render Deployment**: `docs/deployments/render.md` - Render-specific guidance

### Security & Monitoring
- **Security Checklist**: `docs/SECURITY_CHECKLIST.md` - Pre-deployment security verification
- **Security Hardening**: `docs/security-hardening.md` - Advanced security configuration
- **Secrets Management**: `docs/secrets-management.md` - Managing secrets and encryption keys
- **Observability**: `docs/observability.md` - Prometheus metrics, Pino logging, health checks

### Development
- **OAuth Setup**: `docs/oauth-setup.md` - Configure Instagram, YouTube, Twitter OAuth apps
- **Implementation Roadmap**: `docs/implementation-roadmap.md` - Development phases and TODO items
- **Production Infrastructure**: `docs/production-infrastructure.md` - Infrastructure architecture

---

**Note**: No Cursor rules or GitHub Copilot instructions files exist in this codebase.
