# RAILWAY DEPLOYMENT GUIDE

## Prerequisites
- GitHub account
- Railway account (free): https://railway.app

## Step 1: Push to GitHub

```bash
cd /Users/z0diac/Desktop/invar
git add .
git commit -m "Ready for deployment"
git push origin main
```

## Step 2: Deploy to Railway

1. Go to https://railway.app
2. Click "Start a New Project"
3. Click "Deploy from GitHub repo"
4. Select your `invar` repository
5. Railway will auto-detect your Dockerfile

## Step 3: Add Dependencies

1. Click "+ New" → "Database" → "PostgreSQL"
2. Click "+ New" → "Database" → "Redis"
3. Railway will auto-configure DATABASE_URL and REDIS_URL

## Step 4: Add Environment Variables

In your web service settings, add:

```
INVAR_API_KEY=<generate with: openssl rand -base64 32>
SIMULATION_RATE_MS=500
NODE_ENV=production
```

Railway automatically provides:
- DATABASE_URL (PostgreSQL connection string)
- REDIS_URL (Redis connection string)

## Step 5: Deploy Worker

1. Click "+ New" → "Empty Service"
2. Connect same GitHub repo
3. In settings, change "Start Command" to:
   ```
   node src/workers/ingest.worker.js
   ```
4. Add same environment variables

## Step 6: Initialize Database

Railway auto-runs your `schema.sql` on first connection!

## Step 7: Access Your App

Railway provides a URL like: `https://invar-production.up.railway.app`

---

## Total Time: ~5 minutes
## Total Cost: $0/month (free tier)

## Alternative: One-Click Deploy

Add this to your README.md:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/YOUR_USERNAME/invar)
