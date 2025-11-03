# Quick Start Guide

Get up and running in 15 minutes.

## 1. Clone & Install

```bash
git clone <your-repo>
cd tiktok-youtube-dashboard
npm install
```

## 2. Set Up Supabase

1. Create account at https://supabase.com
2. Create new project
3. Copy credentials from Settings > API

## 3. Configure Environment

```bash
# Generate encryption key
npm run generate:token-key

# Copy to .env
cp env.production.example .env

# Edit .env with your credentials
```

Minimum required variables:
- `DATABASE_URL` (from Supabase)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `TOKEN_ENCRYPTION_KEY` (from step above)
- `REDIS_URL` (Upstash free tier works)
- `S3_*` (Supabase Storage or your S3)

## 4. Initialize Database

```bash
npm run db:migrate
npm run db:seed
```

## 5. Create Admin User

```bash
npm run setup:supabase
```

Follow prompts to create your admin account.

## 6. Verify Setup

```bash
npm run verify:setup
```

All checks should pass ✅

## 7. Start Development

```bash
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:3000
- Worker: runs automatically

## 8. Login & Test

1. Visit http://localhost:3000/login
2. Login with admin credentials
3. Connect a social account
4. Create an auto-post rule

## Next Steps

- Read [SETUP.md](./SETUP.md) for production deployment
- Review [PRODUCTION_STATUS.md](./PRODUCTION_STATUS.md) for feature status
- Configure OAuth apps (see SETUP.md)

## Troubleshooting

**Database connection failed?**
- Check `DATABASE_URL` format
- Verify Supabase project is active
- Check network/firewall

**Supabase errors?**
- Verify `SUPABASE_SERVICE_ROLE_KEY` (not anon key!)
- Check JWT secret matches

**OAuth not working?**
- Verify redirect URIs match exactly
- Check OAuth apps are in production mode
- Review OAuth scopes

**Need help?**
- Check [SETUP.md](./SETUP.md) for detailed instructions
- Review error logs in console
- Verify all environment variables

