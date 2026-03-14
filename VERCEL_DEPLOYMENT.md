# Vercel Deployment Guide

You can easily deploy the frontend dashboard to Vercel while keeping the backend services (NestJS API and background Worker) on Render. Vercel is highly optimized for Next.js applications, making it the perfect platform for `apps/web`.

## Pre-requisites
- The `API` and `Worker` services must remain on Render.com, because Vercel Serverless Functions are not designed to run background processes (like the BullMQ jobs or video processing that Autorepost does).

## Steps to deploy the Frontend on Vercel

1. Push your latest code changes to your GitHub repository.
2. Log in to [Vercel](https://vercel.com/) and click **Add New** -> **Project**.
3. Import your Autorepost repository from GitHub.
4. On the configuration page, configure the following settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Select `apps/web` (Important!)
5. Expand the **Environment Variables** section and add the following keys from your `.env.production` file:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (Set this to your deployed Render API URL, e.g. `https://your-api.onrender.com/api`)
6. Click **Deploy**.

Vercel will automatically read the `vercel.json` file inside `apps/web` and configure the build settings correctly for the Turborepo workspace.

## Database Connection Error Fix
If you are running into `PrismaClientInitializationError: Server has closed the connection (P1017)` on Render, the backend now automatically corrects the Supabase Pooler URL (if you copy the IPv4 or IPv6 transaction pooler on port 6543) by appending `?pgbouncer=true`. So your backend on Render will now work reliably.
