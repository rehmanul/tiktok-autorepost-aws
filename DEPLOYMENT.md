# Deployment Guide

## Quick Deploy to Production

### Prerequisites
1. **Supabase Account** - https://supabase.com
2. **Redis Instance** - Upstash (free tier recommended)
3. **S3 Storage** - Supabase Storage, AWS S3, or Backblaze B2
4. **OAuth Apps** - Instagram, YouTube, Twitter (optional, can be configured later)

### Step 1: Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Jkratz01/autorepost-dash.git
   cd autorepost-dash
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate encryption key:
   ```bash
   npm run generate:token-key
   ```

4. Create `.env` file from `env.production.example`:
   ```bash
   cp env.production.example .env
   ```

5. Configure environment variables (minimum required):
   ```env
   DATABASE_URL=postgresql://...
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=xxx
   SUPABASE_JWT_SECRET=xxx
   TOKEN_ENCRYPTION_KEY=<from generate:token-key>
   REDIS_URL=redis://...
   ```

### Step 2: Database Setup

```bash
npm run db:migrate
npm run db:seed
```

### Step 3: Create Admin User

```bash
npm run setup:supabase
```

Follow prompts to create your admin account.

### Step 4: Verify Setup

```bash
npm run verify:setup
```

All checks should pass ✅

### Step 5: Deploy

#### Option A: Render.com (Recommended for Free Tier)

1. Connect GitHub repository to Render
2. Create services:
   - **API Service** (Node.js)
     - Build Command: `npm run build -- --filter=@autorepost/api`
     - Start Command: `cd apps/api && npm start`
   - **Worker Service** (Node.js)
     - Build Command: `npm run build -- --filter=@autorepost/worker`
     - Start Command: `cd apps/worker && npm start`
   - **Web Service** (Static Site)
     - Build Command: `npm run build -- --filter=@autorepost/web`
     - Publish Directory: `apps/web/out`

3. Add all environment variables to each service

#### Option B: Vercel + Render

- **Frontend**: Deploy `apps/web` to Vercel
- **Backend**: Deploy API and Worker to Render

### Step 6: First Login

1. Visit your deployed frontend URL
2. Login with admin credentials created in Step 3
3. Configure OAuth apps (Instagram, YouTube, Twitter)
4. Connect social accounts and create auto-post rules!

## Production Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Admin user created
- [ ] Health checks passing (`/health`)
- [ ] Metrics accessible (`/metrics`)
- [ ] OAuth apps configured with production URLs
- [ ] S3 storage configured
- [ ] Redis connection tested
- [ ] SSL certificates configured (HTTPS)
- [ ] Domain names configured

## Support

- Full setup guide: `docs/SETUP.md`
- Quick start: `docs/QUICK_START.md`
- Production status: `docs/PRODUCTION_STATUS.md`
- Admin setup: `ADMIN_SETUP.md`

