# Autorepost Dashboard Implementation Roadmap

## 1. Objectives
- Deliver the multi-tenant TikTok → Instagram/YouTube/Twitter auto-reposting platform defined in `autoreposting-socialmedia-spec.pdf`.
- Reuse the existing production-ready TikTok ingestion service where practical, while evolving the codebase into a horizontally scalable platform.
- Prioritise security, data isolation, observability, and operational excellence from the first milestone to support production usage.

> Legacy note: the original Vercel function now lives in `drafts/legacy-vercel-api/api/tiktok.js`; treat it as a reference implementation while migrating code into typed packages.

## 2. Guiding Principles
- **Separation of concerns:** Isolate customer-facing API, background workers, and web dashboard into independently deployable services sharing a common domain layer.
- **Infrastructure-as-code first:** Every new service should ship with container definitions, declarative environment configuration, and CI hooks.
- **Security by default:** Enforce RBAC, encrypted secrets/token storage, audit trails, and least-privilege access on third-party APIs.
- **Extensibility:** Design data models and service contracts so new social destinations or automation rules can be added without breaking clients.
- **Operational visibility:** Ship logging, metrics, health checks, and alerting as integral components, not afterthoughts.

## 3. Target Architecture Overview

### 3.1 Backend Platform (Node.js + Fastify/Nest Hybrid)
- **Framework:** NestJS (Fastify adapter) for structured modules, DI, and declarative validation.
- **API Gateway Service:** Hosts REST + WebSocket endpoints for admin/user clients, RBAC enforcement, and webhooks.
- **Worker Service:** Dedicated NestJS application running BullMQ processors for TikTok polling, media handling, and repost orchestration.
- **Shared Libraries:** `libs/domain`, `libs/integrations`, `libs/common` packages (TypeScript) for models, DTOs, and reusable utilities.
- **Authentication:** Password-based login with bcrypt + JWT (access/refresh) and optional SSO hooks. Session revocation backed by Redis.
- **Persistence:** PostgreSQL via Prisma ORM. Database schema aligned with spec tables (`users`, `connections`, `autopost_rules`, etc.).
- **Caching & Queues:** Redis for job queues, rate limiting, and ephemeral caches.
- **Object Storage:** S3-compatible bucket (AWS S3 or MinIO) for temporary media storage.
- **Secrets:** All access/refresh tokens AES-256 encrypted with KMS-managed data keys before persistence.

### 3.2 Frontend (Next.js 15 + Tailwind + shadcn/ui)
- **App Router with RSC** for streaming dashboards.
- **State Management:** React Query + Zustand for client-side caches and optimistic updates.
- **Auth Integration:** NextAuth custom provider hitting backend login endpoints, storing httpOnly cookies.
- **Realtime:** WebSockets (Socket.IO) or Server-Sent Events for activity feed updates and job status.
- **Component Libraries:** shadcn/ui for admin tables, forms, wizards; Recharts for metrics.

### 3.3 Infrastructure & DevOps
- **Containerisation:** Turbo monorepo with per-service Dockerfiles; Docker Compose for local dev (API, Worker, Next.js, Postgres, Redis, MinIO).
- **CI/CD:** GitHub Actions pipeline covering lint → test → build → deploy (staging/prod) with environment promotion gates.
- **Observability:** OpenTelemetry traces, pino logging, Prometheus metrics, Grafana dashboards, Sentry for error tracking.
- **Secrets Management:** Doppler/Vercel/Render environment variables referencing encrypted secrets.

## 4. Deliverable Phases

### Phase 0 – Repository Restructure & Tooling
1. Convert repo into a Turborepo monorepo (`apps/api`, `apps/worker`, `apps/web`, `packages/*`).
2. Integrate ESLint, Prettier, TypeScript project references, Husky + lint-staged.
3. Establish `.env.example` for shared configs; extend Docker Compose to include Postgres, Redis, MinIO.
4. Migrate existing TikTok HTTP/Puppeteer logic into `packages/integrations-tiktok`.

### Phase 1 – Identity, Tenancy, and Admin Foundation
1. Prisma schema + migrations for `users`, `user_sessions`, `tenants` (if needed), `roles`, audit tables.
2. Auth module with login, refresh, password reset, and admin-controlled user provisioning.
3. RBAC middleware to scope all API requests; enforce per-user record ownership.
4. Admin UI skeleton: user list, invite flow, account status toggles.

### Phase 2 – Connection & OAuth Management
1. Unified OAuth orchestration service (TikTok, Instagram Graph, YouTube Data, Twitter v2) with PKCE/state & encrypted token storage.
2. Connection CRUD APIs + UI, including status, last refreshed, and reconnect flows.
3. Background job to refresh tokens pre-expiry and flag degraded connections.
4. Admin dashboards to observe connections by user/platform.

### Phase 3 – Auto-Post Rule Engine
1. Schema for `autopost_rules`, `autopost_destinations`, validation, and scheduling metadata.
2. Rule creation wizard in UI with source/destination selection and real-time validation.
3. Worker pipeline for TikTok monitoring (webhooks if available, polling fallback), dedupe tracking, and rule evaluation.
4. Retry logic, dead-letter queues, and notification hooks for failures.

### Phase 4 – Reposting Execution & Content Pipeline
1. Media processing service: download, format validation, transcoding, caption normalisation per platform.
2. Platform-specific upload handlers (Instagram Reels, YouTube Shorts, Twitter video tweets) with quota awareness.
3. Post completion tracking with per-destination statuses, URLs, and error messages logged to `repost_activities`.
4. User notifications (email/web push/in-app toasts) for successes/failures.

### Phase 5 – Activity Dashboards & Reporting
1. User-facing “Recent Posts” view with filtering, pagination, and retry actions.
2. Admin global activity dashboard: statistics cards, heatmaps, failure insights.
3. Export endpoints (CSV/JSON) and audit trail access.
4. SLA monitoring, alerts, and rate-limit analytics surfaced in UI.

### Phase 6 – Hardening & Launch Readiness
1. End-to-end test suite (Playwright/Cypress) covering critical flows.
2. Load/performance testing scripts for TikTok polling and repost bursts.
3. Chaos testing for token expiry, queue backlogs, and storage outages.
4. Production deployment checklists, runbooks, and on-call documentation.

## 5. Immediate Work Queue
1. Scaffold monorepo baseline (Phase 0 tasks 1–3).
2. Port existing `api/tiktok.js` logic into new integration package with unit coverage.
3. Stand up NestJS API skeleton with health/auth placeholder endpoints and Prisma setup.

## 6. Dependencies & Open Questions
- Confirm target cloud provider (AWS, GCP, Vercel + workers) to align storage/KMS decisions.
- Verify availability of TikTok webhooks for business accounts; otherwise plan long-polling cadence and rate limits.
- Determine notification channels (email provider, in-app only, SMS) for failure alerts.
- Clarify multi-tenant model: single organisation admin or hierarchical reseller/tenant layering.

## 7. Next Status Update
- After completing Phase 0 scaffolding, deliver: repository layout, base services running via `docker compose up`, Prisma migration applied, and CI pipeline stub.
- Provide progress report with initial backlog for Phase 1 workstreams.
