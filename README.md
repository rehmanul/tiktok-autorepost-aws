## Autorepost Dashboard Monorepo

This repository houses the multi-service TikTok autoreposting platform. The active codebase is organised as a Turborepo monorepo with discrete services for the API, background workers, and the Next.js dashboard. Legacy artefacts and research notes have been archived under `drafts/` to keep the working tree focused.

### Repository Layout
- `apps/api` – NestJS REST API with tenant-aware connection, rule, queue, storage, and security modules.
- `apps/worker` – NestJS worker service prepared for BullMQ processors.
- `apps/web` – Next.js 15 dashboard using the App Router and Tailwind.
- `packages/common` – Shared utilities and cross-service helpers.
- `packages/domain` – Domain models, DTOs, and validation schemas.
- `packages/integrations-tiktok` – TikTok integration contracts slated to absorb the legacy scraper.
- `prisma` – Database schema and migrations.
- `docs` – Living documentation and implementation roadmap.
- `drafts` – Archived legacy Vercel API, research files, and experimental code.

### Getting Started
1. Install dependencies at the repo root: `npm install`.
2. Copy `env.production.example` (or your own secrets) into a `.env` file for local development.
3. Run all services via Turborepo: `npm run dev`.
   - You can target individual apps with `npm run dev -- --filter=@autorepost/api`, etc.

### Additional Notes
- The legacy single-function Vercel deployment now lives in `drafts/legacy-vercel-api`. Port any still-relevant scraping logic into `packages/integrations-tiktok` before deletion.
- Reference specifications, diagrams, and historical notes sit in `drafts/reference-materials`.
- Set `TOKEN_ENCRYPTION_KEY` (base64 AES-256 key) before booting the API so OAuth tokens are stored encrypted.
- Follow the roadmap in `docs/implementation-roadmap.md` to continue development phases.
- Prometheus metrics are exposed at `/metrics` on the API and via the worker `METRICS_PORT` (default disabled). See `docs/observability.md`.
- Run `npm run smoke:test` after deploys to verify `/health` and `/metrics` endpoints.
- Render/Vercel deployment guidance lives in `docs/deployments/render.md`.
# autorepost-dash
