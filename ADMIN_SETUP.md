# Admin User Setup - Quick Guide

## Step 1: Make sure Supabase is configured

Your `.env` file needs these variables:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://...
```

## Step 2: Run the setup script

```bash
npm run setup:supabase
```

This will prompt you for:

- **Admin email** (e.g., `admin@example.com`)
- **Admin password** (choose a strong password)
- **Display name** (e.g., `Admin`)

## Step 3: Login

Use the credentials you just created at:

- <http://localhost:4000/login> (or your frontend URL)

---

## What "Other Portals" Need to Be Opened?

For **full functionality**, you'll need accounts/credentials from:

### ✅ Required Now (for basic auth)

1. **Supabase** (for authentication)
   - Get from: <https://supabase.com>
   - Need: Project URL, Service Role Key, JWT Secret

### 🔄 Required Later (for OAuth connections)

2. **Facebook/Instagram Developer Portal**
   - Get from: <https://developers.facebook.com>
   - Need: App ID, App Secret
   - For: Instagram connections

3. **Google Cloud Console**
   - Get from: <https://console.cloud.google.com>
   - Need: Client ID, Client Secret
   - For: YouTube connections

4. **Twitter Developer Portal**
   - Get from: <https://developer.twitter.com>
   - Need: Consumer Key, Consumer Secret
   - For: Twitter connections

### 💾 Optional but Recommended

5. **Upstash Redis** (free tier works)
   - Get from: <https://upstash.com>
   - Need: Redis connection URL
   - For: Job queue and OAuth state

6. **S3-Compatible Storage**
   - Options: Supabase Storage (free tier), AWS S3, Backblaze B2
   - For: Media file storage

---

## Current Status Checklist

- ✅ Frontend running (login page visible)
- ✅ API compiled successfully
- ✅ Worker compiled successfully
- ⏳ Admin user needs to be created (run `npm run setup:supabase`)
- ⏳ OAuth apps can be configured later when needed

---

## Quick Test After Creating Admin

1. Run: `npm run setup:supabase`
2. Login at <http://localhost:4000/login>
3. You should see the dashboard! 🎉
