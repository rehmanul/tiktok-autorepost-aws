# Deploying to Render (Free Tier)

This guide walks through deploying the autot repost monorepo to Render using the included `render.yaml`.

## Overview

- **API + Worker combo service** (`@autorepost/api` + `@autorepost/worker`): Render Web Service (free plan). Runs both processes together via `scripts/start-render.sh`.
- **Web dashboard** (`@autorepost/web`): Render Static Site (free plan). Builds the Next.js app to static output (`apps/web/out`). If you prefer SSR or edge features, Vercel is a better fit.

## Prerequisites

1. Render account (free tier).
2. External Postgres (Render managed Postgres free tier) and Redis (Render Redis free tier) or use your existing databases.
3. S3-compatible storage (Render does not provide object storage; use AWS S3, Backblaze, or Wasabi).
4. TikTok cookie/session values and OAuth credentials stored securely.

## Steps

1. **Create Repo Connection**
   - Push the repo to GitHub.
   - On Render → "New +", select "Blueprint" and point to your repository. Render detects `render.yaml`.

2. **Configure Secrets**
   - Render will prompt for environment variables for the combined API/worker service and the static site.
   - Provide values for all `sync: false` keys (DATABASE_URL, REDIS_URL, TOKEN_ENCRYPTION_KEY, TIKTOK_COOKIE, etc.).
   - If you do not yet have S3 credentials, create an IAM access key pair with limited permissions.

3. **Database**
   - Render free Postgres and Redis instances use connection strings in `DATABASE_URL` / `REDIS_URL`. Make sure to include SSL parameters if required.
   - Run migrations after the first deploy: open a shell (`render.com -> console -> web service -> shell`) and execute `npx prisma migrate deploy`.

4. **Build & Deploy**
   - Render will run the `buildCommand` from `render.yaml`. Ensure commands succeed locally:
     ```bash
     npm install
     npm run build -- --filter=@autorepost/api --filter=@autorepost/worker
     npm run build -- --filter=@autorepost/web
     ```
   - After the build, Render runs the `startCommand` (`bash scripts/start-render.sh`) which launches both API and worker.

5. **Verify**
   - Visit the API service URL `/health` and `/metrics`.
   - Check worker logs for successful startup.
   - The static dashboard is accessible via the static site URL.
   - Run `npm run smoke:test` locally pointing to the Render URLs to confirm basic health.

## Limitations & Notes

- Render free tier sleeps web services after inactivity; expect cold starts.
- The combined service shares CPU/RAM; for sustained background throughput consider upgrading to a paid plan or moving the worker to a dedicated service.
- Render static sites serve pre-generated HTML. If you require Next.js API routes or SSR, deploy web app to Vercel instead.
- Object storage must be external (S3). Update `S3_ENDPOINT` and `S3_BUCKET` accordingly.
- Prometheus metrics and open telemetry won’t be scraped automatically on Render’s free tier. Use a third-party monitor or disable metrics if not needed (`PROMETHEUS_ENABLED=false`).

## Vercel Alternative

- For the Next.js dashboard with server components, Vercel offers the best developer experience and zero-config deploys.
- You can keep API + worker on Render and deploy `apps/web` to Vercel:
  1. Create a new Vercel project pointing to the repo.
  2. Set `root directory` to `apps/web`.
  3. Build command: `npm install && npm run build -- --filter=@autorepost/web`.
  4. Output directory: `.next` (Vercel handles SSR).
  5. Provide API base URL via environment variable (e.g., `NEXT_PUBLIC_API_URL=https://autorepost-api.onrender.com`).

## Maintenance

- Keep `render.yaml` in sync with environment variable changes.
- Use Render cron jobs for scheduled tasks (e.g., cookie rotation scripts).
- For production reliability, consider paid plans to avoid sleeping services and to gain better resource allocations.
