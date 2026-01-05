# Invar Docker Compose Deployment Guide

A single-tenant production deployment of the Invar metrics ingestion & realtime delivery system using Docker Compose.

## Prerequisites

- Docker & Docker Compose installed
- A Linux VM or server (tested on Ubuntu 20.04+)
- Port 3000, 5432, 6379 available (or modify `docker-compose.yml`)

## Quick Start (Local Testing)

```bash
cd /path/to/invar

# 1. Create .env.production from example
cp .env.production.example .env.production

# 2. Generate a secure API key (recommended)
# Edit .env.production and replace INVAR_API_KEY with:
openssl rand -base64 32

# 3. Build images
docker-compose build

# 4. Start services (will auto-create PostgreSQL schema)
docker-compose up -d

# 5. Verify services are running
docker-compose ps

# 6. Check health
curl http://localhost:3000/health

# 7. (Optional) Send sample metrics
node scripts/publish-sample.js
```

## Production Deployment (VM/Server)

### Step 1: Prepare Server

```bash
# SSH into your server
ssh user@your-server-ip

# Clone repository
git clone <your-repo-url> invar
cd invar

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Configure Environment

```bash
# Copy example and customize
cp .env.production.example .env.production

# Edit with your secure values
nano .env.production
# ✓ Change POSTGRES_PASSWORD to a strong password
# ✓ Change INVAR_API_KEY to a new one: openssl rand -base64 32
# ✓ Verify DATABASE_URL matches POSTGRES_USER:POSTGRES_PASSWORD
```

### Step 3: Build & Deploy

```bash
# Build images (one-time, ~1-2 min)
docker-compose build

# Start all services in background
docker-compose up -d

# Verify services
docker-compose ps

# Check logs
docker-compose logs -f web    # App logs
docker-compose logs -f worker # Worker logs
docker-compose logs -f postgres # DB logs
```

### Step 4: Verify Deployment

```bash
# Health check
curl http://localhost:3000/health

# Send a test metric
curl -X POST http://localhost:3000/v1/ingest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $(grep INVAR_API_KEY .env.production | cut -d= -f2)" \
  -d '{
    "metric": "cpu",
    "value": 42.5,
    "server": "web-01",
    "timestamp": '$(date +%s)'
  }'

# Query metrics
curl "http://localhost:3000/v1/metrics?startTime=$(($(date +%s)-3600))&endTime=$(date +%s)&metric=cpu"

# Open dashboard in browser
open http://localhost:3000
# or from CLI:
curl http://localhost:3000/index.html | head -20
```

## File Structure

```
invar/
├── Dockerfile              # Multi-stage build
├── docker-compose.yml      # Service definitions
├── .env.production         # ← CREATE THIS (from .env.production.example)
├── .env.production.example # Template with docs
├── src/
│   ├── server.js          # Main app entry
│   ├── app.js             # Express app
│   ├── ingest/            # Hot path
│   ├── query/             # Read layer
│   ├── realtime/          # SSE broadcaster
│   ├── workers/           # Cold path worker
│   ├── redis/             # Redis client
│   └── db/                # PostgreSQL client
├── db/init/
│   └── schema.sql         # Auto-runs on first Postgres start
├── demo/                  # Dashboard frontend
└── scripts/
    └── publish-sample.js  # Test data generator
```

## Service Details

| Service   | Image          | Port | Purpose                              |
|-----------|----------------|------|--------------------------------------|
| `web`     | invar/web      | 3000 | Main app + dashboard                 |
| `worker`  | invar/worker   | N/A  | Background processor (cold path)     |
| `redis`   | redis:7        | 6379 | Streams + Pub/Sub                    |
| `postgres`| postgres:15    | 5432 | Historical metrics storage           |

## Managing Services

```bash
# View running services
docker-compose ps

# View logs (follow mode)
docker-compose logs -f

# Restart specific service
docker-compose restart web

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data!)
docker-compose down -v

# Pull latest images
docker-compose pull

# Rebuild without cache
docker-compose build --no-cache
```

## Data Persistence

- **PostgreSQL**: Stored in `pgdata` volume (persists between restarts)
- **Redis**: Stored in `redis-data` volume (persists Streams)
- **Remove volumes**: `docker-compose down -v` (⚠️ deletes all data)

## Backup Strategy

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump \
  -U invar invar > backup_$(date +%Y%m%d).sql

# Restore PostgreSQL
docker-compose exec -T postgres psql \
  -U invar invar < backup_20260105.sql
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Common issues:
# - Ports already in use: Change in docker-compose.yml
# - Permission denied: Add user to docker group
# - Database won't initialize: Check schema.sql in db/init/
```

### Metrics not appearing in dashboard
```bash
# 1. Check web service
docker-compose logs web | tail -20

# 2. Verify Redis connection
docker-compose exec redis redis-cli ping

# 3. Verify Postgres connection
docker-compose exec postgres psql -U invar -d invar -c "SELECT COUNT(*) FROM metrics;"

# 4. Send test metric and check
curl -X POST http://localhost:3000/v1/ingest \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"metric":"test","value":1,"server":"test","timestamp":'$(date +%s)'}'
```

### Worker not processing
```bash
# Check worker logs
docker-compose logs worker

# Verify Redis Stream has data
docker-compose exec redis redis-cli XLEN invar:ingest

# Check consumer group status
docker-compose exec redis redis-cli XINFO GROUPS invar:ingest
```

## Security Notes

⚠️ **Do NOT commit `.env.production` to version control**

- Use strong passwords for `POSTGRES_PASSWORD`
- Rotate `INVAR_API_KEY` periodically
- Run on a firewall-protected network
- Use HTTPS in production (add nginx reverse proxy)
- Limit Redis/Postgres ports to localhost only (remove port mappings if not needed)

## Next Steps

### For HTTPS in Production
Add nginx reverse proxy in docker-compose.yml:
```yaml
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - web
```

### For Scaling
- Horizontal scaling: Multiple `web` instances + load balancer
- Realtime sync: Add Redis adapter or switch to WebSocket
- See `README.md` for architecture details

### For Monitoring
- Add Prometheus + Grafana for metrics visualization
- Use `docker-compose logs` → centralized log aggregation (ELK, Datadog, etc.)

## Support

For issues, check:
1. README.md (architecture overview)
2. src/ folder (service implementations)
3. docker-compose logs (service-specific errors)
