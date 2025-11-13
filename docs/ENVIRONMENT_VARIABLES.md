# Environment Variables Reference

Complete reference for all environment variables used in autorepost-dash.

## Quick Start

1. Copy the appropriate template:
   ```bash
   # For local development
   cp .env.example .env

   # For production
   cp env.production.example .env
   ```

2. Generate encryption key:
   ```bash
   npm run generate:token-key
   ```

3. Fill in required variables (marked with ⚠️ below)

4. Verify configuration:
   ```bash
   npm run verify:setup
   ```

## Core Configuration

### Node Environment

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ⚠️ Yes | `development` | Environment mode: `development`, `production`, or `test` |

### API Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4000` | Port for API server |
| `CORS_ORIGIN` | ⚠️ Yes | `http://localhost:3000` | Allowed CORS origin for frontend |
| `WEB_APP_URL` | ⚠️ Yes | `http://localhost:3000` | Full URL of frontend application |
| `API_VERSION` | No | `2.0.0` | API version string |

## Database & Authentication

### PostgreSQL Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ⚠️ Yes | - | PostgreSQL connection string from Supabase |

**Format:** `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[HOST]:5432/postgres`

**Get it from:** Supabase Dashboard → Settings → Database → Connection String (Direct connection)

⚠️ **Important:** Use the **Direct** connection string, not the pooled connection string.

### Supabase Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | ⚠️ Yes | - | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Yes | - | Service role key (backend only) |
| `SUPABASE_JWT_SECRET` | ⚠️ Yes | - | JWT secret for token validation |
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ Yes | - | Public Supabase URL (frontend) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ Yes | - | Anonymous key (frontend) |

**Get them from:** Supabase Dashboard → Settings → API

⚠️ **Security Notes:**
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security - keep it secret!
- `NEXT_PUBLIC_*` variables are exposed to the browser
- Never use the service role key in frontend code

## Job Queue & Caching

### Redis / BullMQ

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | ⚠️ Yes | `redis://localhost:6379` | Redis connection string |
| `REDIS_TLS` | No | `false` | Enable TLS for Redis connection |

**Development:**
```bash
REDIS_URL=redis://localhost:6379
REDIS_TLS=false
```

**Production (Upstash):**
```bash
REDIS_URL=rediss://default:[PASSWORD]@[HOST]:6379
REDIS_TLS=true
```

**Get Upstash Redis:** https://upstash.com (free tier available)

## Object Storage

### S3-Compatible Storage

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `S3_REGION` | ⚠️ Yes | `us-east-1` | AWS region or storage region |
| `S3_ENDPOINT` | Conditional | - | Custom S3 endpoint (empty for AWS S3) |
| `S3_FORCE_PATH_STYLE` | No | `false` | Use path-style URLs (required for MinIO/Supabase) |
| `S3_BUCKET` | ⚠️ Yes | - | Bucket name for media storage |
| `S3_ACCESS_KEY_ID` | ⚠️ Yes | - | S3 access key ID |
| `S3_SECRET_ACCESS_KEY` | ⚠️ Yes | - | S3 secret access key |

### Storage Backend Options

#### Option 1: AWS S3 (Recommended for Production)
```bash
S3_REGION=us-east-1
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=false
S3_BUCKET=autorepost-production
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
```

#### Option 2: Supabase Storage
```bash
S3_REGION=auto
S3_ENDPOINT=https://[PROJECT-REF].supabase.co/storage/v1/s3
S3_FORCE_PATH_STYLE=true
S3_BUCKET=autorepost-media
S3_ACCESS_KEY_ID=[from Supabase S3 access keys]
S3_SECRET_ACCESS_KEY=[from Supabase S3 access keys]
```

Get Supabase S3 keys: Dashboard → Settings → S3 Access Keys

#### Option 3: Backblaze B2
```bash
S3_REGION=us-west-004
S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
S3_FORCE_PATH_STYLE=false
S3_BUCKET=autorepost-media
S3_ACCESS_KEY_ID=[Application Key ID]
S3_SECRET_ACCESS_KEY=[Application Key]
```

#### Option 4: MinIO (Local Development)
```bash
S3_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true
S3_BUCKET=autorepost-dev
S3_ACCESS_KEY_ID=minio
S3_SECRET_ACCESS_KEY=minio123
```

## Security

### Token Encryption

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TOKEN_ENCRYPTION_KEY` | ⚠️ Yes | - | AES-256-GCM encryption key (base64) |

**Generate with:**
```bash
npm run generate:token-key
```

⚠️ **CRITICAL SECURITY NOTES:**
- Must be set **before first API boot**
- Changing this key will **invalidate all stored OAuth tokens**
- This encrypts Instagram, YouTube, and Twitter tokens at rest
- Keep this secret - never commit to version control
- Use different keys for dev/staging/production

## OAuth Platform Credentials

All OAuth variables are **optional** - only configure the platforms you want to support.

### Instagram (Facebook Graph API)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FACEBOOK_APP_ID` | Optional | - | Facebook App ID |
| `FACEBOOK_APP_SECRET` | Optional | - | Facebook App Secret |
| `FACEBOOK_REDIRECT_URI` | Optional | - | OAuth callback URL |

**Get credentials:**
1. Go to https://developers.facebook.com/apps
2. Create app → Instagram Basic Display
3. Configure OAuth redirect URIs
4. Get App ID and Secret from Settings → Basic

**Production redirect URI format:**
```
https://your-api-domain.com/oauth/instagram/callback
```

### YouTube (Google API)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | Optional | - | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | - | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | Optional | - | OAuth callback URL |

**Get credentials:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID → Web Application
3. Add authorized redirect URIs
4. Enable YouTube Data API v3

**Required OAuth scopes:**
- `https://www.googleapis.com/auth/youtube.upload`
- `https://www.googleapis.com/auth/youtube`

**Production redirect URI format:**
```
https://your-api-domain.com/oauth/youtube/callback
```

### Twitter/X (OAuth 1.0a)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TWITTER_CONSUMER_KEY` | Optional | - | Twitter API Key |
| `TWITTER_CONSUMER_SECRET` | Optional | - | Twitter API Secret |
| `TWITTER_CALLBACK_URL` | Optional | - | OAuth callback URL |

**Get credentials:**
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create Project → Create App
3. Go to Keys and Tokens
4. Generate Consumer Keys (API Key & Secret)

**Required permissions:**
- Read and Write access
- OAuth 1.0a (not OAuth 2.0)

**Production callback URL format:**
```
https://your-api-domain.com/oauth/twitter/callback
```

## TikTok Integration

### Cookie-Based Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TIKTOK_COOKIE` | Optional | - | JSON array of TikTok cookies |
| `TIKTOK_SESSION_ID` | Optional | - | TikTok session ID |
| `TIKTOK_WEBID` | Optional | - | TikTok web ID |

**How to get TikTok cookies:**
1. Login to TikTok in your browser
2. Open DevTools → Application → Cookies
3. Export cookies as JSON array (use browser extension like EditThisCookie)
4. Copy to `TIKTOK_COOKIE` variable

⚠️ **Note:** This is legacy scraper configuration. Future versions will use official TikTok API.

### TikTok Scraper Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | No | `60` | Max requests per minute |
| `RATE_LIMIT_REQUESTS_PER_HOUR` | No | `1000` | Max requests per hour |
| `CACHE_TTL` | No | `120` | Cache TTL in seconds |
| `CACHE_MAX_ENTRIES` | No | `100` | Max cache entries |
| `NAVIGATION_TIMEOUT_MS` | No | `30000` | Page load timeout (ms) |
| `CONTENT_WAIT_MS` | No | `5000` | Content wait time (ms) |
| `HTTP_FETCH_TIMEOUT_MS` | No | `12000` | HTTP fetch timeout (ms) |
| `HTTP_MAX_RETRIES` | No | `3` | Max HTTP retries |
| `TIKTOK_ITEM_LIST_PAGE_SIZE` | No | `30` | Items per page |
| `TIKTOK_ITEM_LIST_MAX_PAGES` | No | `40` | Max pages to fetch |
| `TIKTOK_ITEM_LIST_BUFFER_PAGES` | No | `2` | Buffer pages |

## Worker Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WORKER_CONCURRENCY` | No | `2` | Number of concurrent job processors |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `METRICS_PORT` | No | - | Port for worker metrics endpoint (optional) |
| `METRICS_HOST` | No | `0.0.0.0` | Host for metrics endpoint |
| `METRICS_POLL_INTERVAL` | No | `15000` | Metrics poll interval (ms) |

**Recommended concurrency:**
- Development: 2
- Production (1 vCPU): 2-4
- Production (2 vCPU): 4-8

## Observability

### Prometheus Metrics

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROMETHEUS_ENABLED` | No | `true` | Enable Prometheus metrics export |

**Metrics endpoints:**
- API: `http://localhost:4000/metrics`
- Worker: `http://localhost:METRICS_PORT/metrics` (if METRICS_PORT set)

## Environment Variable Priority

Variables are loaded in this order (later overrides earlier):

1. System environment variables
2. `.env` file (gitignored - for local secrets)
3. Default values in code

## Validation

Before starting services, validate your configuration:

```bash
npm run verify:setup
```

This checks:
- ✅ Database connection
- ✅ Supabase authentication
- ✅ Token encryption key format
- ✅ Redis connection
- ✅ S3 storage configuration
- ✅ OAuth credentials (optional)
- ✅ Database schema migrations

## Security Best Practices

1. **Never commit `.env` files** - they contain secrets
2. **Use different keys per environment** - dev/staging/production
3. **Rotate secrets regularly** - especially OAuth credentials
4. **Limit service role key access** - it bypasses security policies
5. **Use TLS in production** - set `REDIS_TLS=true` for Redis
6. **Monitor token usage** - check OAuth token expiration
7. **Encrypt backups** - if backing up database/Redis

## Troubleshooting

### "Database connection failed"
- Verify `DATABASE_URL` format
- Check Supabase project is active
- Ensure using **Direct** connection string (not pooled)

### "Supabase authentication failed"
- Verify `SUPABASE_SERVICE_ROLE_KEY` is the service role key (not anon key)
- Check `SUPABASE_JWT_SECRET` matches project settings exactly

### "Token encryption key invalid"
- Run `npm run generate:token-key` to generate a new key
- Ensure it's a base64-encoded 32-byte string
- Don't use quotes around the value

### "Redis connection refused"
- Check `REDIS_URL` format
- Verify Redis server is running
- For Upstash, ensure `REDIS_TLS=true`

### "S3 access denied"
- Verify bucket exists
- Check access key has proper permissions
- For Supabase Storage, verify S3 access keys are enabled

## Production Deployment

### Render.com

Set environment variables in Render dashboard for each service:
- **API Service**: All variables
- **Worker Service**: All variables except `NEXT_PUBLIC_*`
- **Web Service**: Only `NEXT_PUBLIC_*` variables

### Vercel

For Next.js app, only set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Backend variables go in your API/Worker services (Render, Railway, etc.)

## Reference

- [Quick Start Guide](./QUICK_START.md)
- [Setup Guide](./SETUP.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [OAuth Setup Guide](./oauth-setup.md)
