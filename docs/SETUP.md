# Production Setup Guide

Complete guide for setting up the Autorepost platform in production.

## Prerequisites

1. **Supabase Account** - Create a project at https://supabase.com
2. **PostgreSQL Database** - Supabase provides this, or use your own (Render, AWS RDS, etc.)
3. **Redis Instance** - Upstash (free tier) or your own Redis server
4. **S3-Compatible Storage** - AWS S3, Backblaze B2, or Supabase Storage (free tier)
5. **OAuth App Credentials**:
   - Instagram (Meta Developers)
   - YouTube (Google Cloud Console)
   - Twitter/X (Twitter Developer Portal)

## Step 1: Supabase Setup

1. Create a new Supabase project
2. Go to **Settings > API** and copy:
   - Project URL → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - JWT Secret → `SUPABASE_JWT_SECRET` (Settings > API > JWT Secret)

3. Enable Email Auth in Supabase:
   - Go to **Authentication > Providers**
   - Enable Email provider
   - Configure email templates if desired

## Step 2: Database Setup

1. Get your database connection string:
   ```bash
   # From Supabase: Settings > Database > Connection string (URI)
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   ```

2. Run migrations:
   ```bash
   npm run db:migrate
   ```

3. Run seed script (creates default tenant):
   ```bash
   npm run db:seed
   ```

## Step 3: Generate Encryption Key

```bash
npm run generate:token-key
```

Copy the output to your `.env` file as `TOKEN_ENCRYPTION_KEY`.

⚠️ **CRITICAL**: Store this key securely. If lost, all encrypted OAuth tokens become unrecoverable.

## Step 4: Create Admin User

```bash
npm run setup:supabase
```

Follow the prompts to:
1. Create/select a tenant
2. Create admin user in Supabase
3. Link admin user to database

## Step 5: Configure OAuth Apps

### Instagram/Facebook

1. Go to https://developers.facebook.com/
2. Create an app → Add Instagram Basic Display or Instagram Graph API
3. Add redirect URI: `https://your-domain.com/api/oauth/instagram/callback`
4. Get credentials:
   ```
   FACEBOOK_APP_ID=your_app_id
   FACEBOOK_APP_SECRET=your_app_secret
   FACEBOOK_REDIRECT_URI=https://your-domain.com/api/oauth/instagram/callback
   ```

### YouTube

1. Go to https://console.cloud.google.com/
2. Create project → Enable YouTube Data API v3
3. Create OAuth 2.0 credentials → Web application
4. Add redirect URI: `https://your-domain.com/api/oauth/youtube/callback`
5. Get credentials:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=https://your-domain.com/api/oauth/youtube/callback
   ```

### Twitter/X

1. Go to https://developer.twitter.com/
2. Create app → Enable OAuth 1.0a
3. Add callback URL: `https://your-domain.com/api/oauth/twitter/callback`
4. Get credentials:
   ```
   TWITTER_CONSUMER_KEY=your_consumer_key
   TWITTER_CONSUMER_SECRET=your_consumer_secret
   TWITTER_CALLBACK_URL=https://your-domain.com/api/oauth/twitter/callback
   ```

## Step 6: Configure Storage (S3-Compatible)

### Option A: Supabase Storage (Free Tier)

```
S3_ENDPOINT=https://[PROJECT_REF].supabase.co/storage/v1/s3
S3_REGION=us-east-1
S3_BUCKET=autorepost-media
S3_ACCESS_KEY_ID=[Your Supabase Service Role Key]
S3_SECRET_ACCESS_KEY=[Your Supabase Service Role Key]
S3_FORCE_PATH_STYLE=true
```

### Option B: AWS S3

```
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_FORCE_PATH_STYLE=false
```

### Option C: Backblaze B2

```
S3_ENDPOINT=https://s3.us-west-000.backblazeb2.com
S3_REGION=us-west-000
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your_key_id
S3_SECRET_ACCESS_KEY=your_application_key
S3_FORCE_PATH_STYLE=true
```

## Step 7: Configure Redis

### Option A: Upstash (Free Tier)

1. Create database at https://upstash.com/
2. Get connection string:
   ```
   REDIS_URL=rediss://default:[PASSWORD]@[ENDPOINT]:6379
   REDIS_TLS=true
   ```

### Option B: Your Own Redis

```
REDIS_URL=redis://localhost:6379
REDIS_TLS=false
```

## Step 8: Complete Environment Variables

Create `.env` file in the project root with all variables:

```bash
# Base
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-domain.com

# Database
DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_JWT_SECRET=xxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Redis
REDIS_URL=rediss://...
REDIS_TLS=true

# Storage
S3_ENDPOINT=https://...
S3_REGION=us-east-1
S3_BUCKET=autorepost-media
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
S3_FORCE_PATH_STYLE=true

# Encryption
TOKEN_ENCRYPTION_KEY=[from generate:token-key]

# OAuth - Instagram
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
FACEBOOK_REDIRECT_URI=https://your-domain.com/api/oauth/instagram/callback

# OAuth - YouTube
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://your-domain.com/api/oauth/youtube/callback

# OAuth - Twitter
TWITTER_CONSUMER_KEY=xxx
TWITTER_CONSUMER_SECRET=xxx
TWITTER_CALLBACK_URL=https://your-domain.com/api/oauth/twitter/callback

# Worker
WORKER_CONCURRENCY=2
LOG_LEVEL=info
```

For the web app, also set:

```bash
# In apps/web/.env.local
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com/api
```

## Step 9: Verify Setup

```bash
npm run verify:setup
```

This will check:
- ✅ Database connection
- ✅ Supabase configuration
- ✅ Token encryption key
- ✅ Redis connection
- ✅ S3/Storage configuration
- ✅ OAuth credentials
- ✅ Database schema

## Step 10: Deploy

### Render.com (Recommended for Free Tier)

1. Connect your GitHub repository
2. Create services:
   - **Web Service** (Next.js)
   - **API Service** (Node.js)
   - **Worker Service** (Node.js)
3. Add environment variables to each service
4. Deploy!

### Other Platforms

- **Vercel** (for web app)
- **Railway** (for API/Worker)
- **AWS ECS** (for production scale)
- **DigitalOcean App Platform**

## Step 11: First Login

1. Visit `https://your-domain.com/login`
2. Use the admin credentials created in Step 4
3. Create additional users via Admin panel
4. Connect social accounts and create auto-post rules!

## Troubleshooting

### Database Migration Issues

If migrations fail due to permissions:
```sql
-- Run manually in Supabase SQL Editor
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supabaseUserId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseUserId_key" ON "User"("supabaseUserId");
CREATE INDEX IF NOT EXISTS "User_supabaseUserId_idx" ON "User"("supabaseUserId");
```

### Token Refresh Failures

Check connection status in the dashboard. Expired tokens will show "EXPIRED" status. Reconnect the account.

### OAuth Callback Errors

Verify:
- Redirect URIs match exactly (including https/http)
- OAuth apps are in production mode (not development)
- Required scopes are enabled

## Next Steps

- Review [SECURITY.md](./SECURITY.md) for hardening
- Set up monitoring (see [OBSERVABILITY.md](./OBSERVABILITY.md))
- Configure automated backups
- Set up CI/CD pipeline

