# Deploy Invar to Fly.io (100% FREE)

**Time to Deploy**: 10 minutes  
**Cost**: $0/month (stays within free tier)

---

## Prerequisites

1. GitHub account (to store your code)
2. Fly.io account (free): https://fly.io/app/sign-up
3. flyctl CLI installed

---

## Step 1: Install Fly CLI (2 min)

```bash
# macOS
brew install flyctl

# Or using curl
curl -L https://fly.io/install.sh | sh

# Verify installation
flyctl version
```

---

## Step 2: Authenticate (1 min)

```bash
flyctl auth login
# Opens browser for authentication
```

---

## Step 3: Prepare Your App (2 min)

```bash
cd /Users/z0diac/Desktop/invar

# Create .dockerignore if not exists
cat > .dockerignore << 'EOF'
node_modules
.git
.env
.env.local
dump.rdb
*.log
.DS_Store
EOF

# Initialize Fly.io config
flyctl launch --no-deploy
```

**What this does**:
- Detects your Dockerfile ✅
- Creates `fly.toml` config file
- Asks questions (answer below)

**Questions to Answer**:
```
? App name: invar-dashboard (or choose your own)
? Region: [Choose closest to you]
? Would you like to set up a PostgreSQL database? YES
? Select configuration: Development (free)
? Scale single node pg to zero after one hour? NO
? Would you like to set up an Upstash Redis database? YES
? Select an Upstash Redis plan: Free (free)
```

---

## Step 4: Configure Environment (2 min)

```bash
# Set secrets (environment variables)
flyctl secrets set \
  NODE_ENV=production \
  INVAR_API_KEY=$(openssl rand -base64 32) \
  SIMULATION_RATE_MS=500

# Fly automatically sets these:
# - DATABASE_URL (from PostgreSQL)
# - REDIS_URL (from Upstash)
```

---

## Step 5: Update fly.toml (1 min)

Fly.io created `fly.toml`. Let's optimize it:

```bash
# Open fly.toml
nano fly.toml
```

**Replace contents with**:

```toml
app = "invar-dashboard"  # Your app name
primary_region = "sin"   # Change to your region

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"
  NODE_ENV = "production"

# Web Service
[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 100
    soft_limit = 80

  [[services.tcp_checks]]
    interval = "15s"
    timeout = "10s"
    grace_period = "5s"

# Health Check
[[services.http_checks]]
  interval = "30s"
  timeout = "5s"
  grace_period = "10s"
  method = "GET"
  path = "/health"

# Resource Allocation (Free Tier)
[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

---

## Step 6: Deploy Web Service (1 min)

```bash
# Deploy!
flyctl deploy

# Watch logs
flyctl logs
```

**Wait for**: "Invar server listening on port 3000"

---

## Step 7: Deploy Worker (2 min)

Fly.io needs a separate app for the worker:

```bash
# Create worker app
flyctl apps create invar-worker

# Deploy worker
flyctl deploy \
  --app invar-worker \
  --config fly.worker.toml
```

But first, create `fly.worker.toml`:

```bash
cat > fly.worker.toml << 'EOF'
app = "invar-worker"
primary_region = "sin"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1

[processes]
  worker = "node src/workers/ingest.worker.js"
EOF

# Deploy worker
flyctl deploy --app invar-worker --config fly.worker.toml

# Set worker secrets
flyctl secrets set \
  --app invar-worker \
  DATABASE_URL=$(flyctl secrets list | grep DATABASE_URL | awk '{print $3}') \
  REDIS_URL=$(flyctl secrets list | grep REDIS_URL | awk '{print $3}')
```

---

## Step 8: Initialize Database (1 min)

```bash
# Connect to Postgres and run schema
flyctl postgres connect -a <your-postgres-app-name>

# Inside psql:
\i /path/to/schema.sql
\q
```

**OR manually**:

```bash
# Get database URL
flyctl secrets list | grep DATABASE_URL

# Connect with psql
psql <DATABASE_URL>

# Paste your schema.sql content
CREATE TABLE metrics (...);
\q
```

---

## Step 9: Verify Deployment ✅

```bash
# Get your app URL
flyctl info

# Test endpoints
curl https://invar-dashboard.fly.dev/health
curl https://invar-dashboard.fly.dev/

# Open in browser
flyctl open
```

**Your dashboard is live!** 🎉

---

## Step 10: Monitor (Optional)

```bash
# View logs
flyctl logs

# Check status
flyctl status

# SSH into app
flyctl ssh console

# Monitor resources
flyctl dashboard
```

---

## Free Tier Breakdown

| Resource | Usage | Free Tier Limit | Status |
|----------|-------|-----------------|--------|
| Web VM | 256MB | 256MB × 3 VMs | ✅ Within |
| Worker VM | 256MB | 256MB × 3 VMs | ✅ Within |
| Postgres | 256MB | 256MB × 1 DB | ✅ Within |
| Redis | Upstash Free | 100MB | ✅ Within |
| Bandwidth | ~1GB/mo | 160GB | ✅ Within |

**Total Monthly Cost**: $0 🎊

---

## Updating Your App

```bash
# Make changes to code
git add .
git commit -m "Update dashboard"

# Deploy updates
flyctl deploy                           # Web service
flyctl deploy --app invar-worker        # Worker
```

---

## Troubleshooting

**Issue**: "App crashed"
```bash
flyctl logs
# Check error messages
```

**Issue**: "Database connection failed"
```bash
flyctl secrets list  # Verify DATABASE_URL
```

**Issue**: "Redis connection failed"
```bash
flyctl redis status  # Check Upstash Redis
```

---

## Custom Domain (Optional)

```bash
# Add your domain
flyctl certs add yourdomain.com

# Add DNS records (shown in output)
# Wait for SSL provisioning (5-10 min)
```

---

## Useful Commands

```bash
# View all apps
flyctl apps list

# Scale (stay in free tier)
flyctl scale count 1

# Restart app
flyctl apps restart

# Destroy app (if needed)
flyctl apps destroy invar-dashboard
```

---

## What You Get

✅ **Live URL**: `https://invar-dashboard.fly.dev`  
✅ **Auto HTTPS**: Free SSL certificate  
✅ **24/7 Uptime**: No sleep mode  
✅ **Auto Restart**: If crashes  
✅ **Health Checks**: Automatic monitoring  
✅ **Global CDN**: Fast everywhere  
✅ **Zero Cost**: Stays in free tier  

---

**Status**: Ready to deploy! 🚀  
**Total Time**: ~10 minutes  
**Total Cost**: $0/month forever

Happy deploying! 🎉
