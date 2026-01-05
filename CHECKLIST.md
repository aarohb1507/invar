# Invar Deployment Checklist

## Pre-Deployment (Do Once)

- [ ] Docker & Docker Compose installed on target server
- [ ] Clone repository: `git clone <repo> invar && cd invar`
- [ ] Create `.env.production` from template: `cp .env.production.example .env.production`
- [ ] Edit `.env.production` with secure values:
  - [ ] `POSTGRES_PASSWORD` - Use strong password (min 16 chars)
  - [ ] `INVAR_API_KEY` - Generate new: `openssl rand -base64 32`
  - [ ] `DATABASE_URL` - Verify matches postgres credentials
- [ ] Build Docker images: `docker-compose build`
- [ ] ⚠️ DO NOT commit `.env.production` to git!

## Deployment

### Quick Command (All-in-One)
```bash
bash deploy.sh deploy
```

### Or Step-by-Step
1. [ ] **Verify prerequisites**: `bash deploy.sh status`
2. [ ] **Start services**: `docker-compose up -d`
3. [ ] **Wait for services to stabilize**: `sleep 5`
4. [ ] **Check service status**: `docker-compose ps`
5. [ ] **View logs**: `docker-compose logs --tail=20`

## Post-Deployment Verification

- [ ] **Health check**: `curl http://localhost:3000/health`
  - Expected: `{"status":"ok"}`
  
- [ ] **Send test metric**:
  ```bash
  API_KEY=$(grep INVAR_API_KEY .env.production | cut -d= -f2)
  curl -X POST http://localhost:3000/v1/ingest \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"metric":"test","value":42,"server":"test","timestamp":'$(date +%s)'}'
  ```
  - Expected: `200 OK`

- [ ] **Query metrics**: `curl http://localhost:3000/v1/metrics?metric=test`
  - Expected: JSON array with your test metric

- [ ] **Dashboard loads**: Open `http://localhost:3000` in browser
  - Check console for any errors
  - Verify "Live Stream" section is empty (no data yet)

- [ ] **Realtime works**:
  - Keep dashboard open
  - Send another test metric: `bash deploy.sh test`
  - Check dashboard "Live Stream" updates in real-time

## Production Deployment Notes

### Security
- [ ] Configure firewall to only allow port 3000 from approved IPs
- [ ] Consider hiding Redis (6379) and Postgres (5432) ports in docker-compose.yml
- [ ] Rotate `INVAR_API_KEY` every 90 days
- [ ] Set up SSL/TLS (add nginx reverse proxy)

### Monitoring
- [ ] Set up log aggregation (optional but recommended)
- [ ] Monitor disk space for PostgreSQL volume
- [ ] Monitor Redis memory usage
- [ ] Set up alerts for service crashes

### Backup
- [ ] Create a backup job for PostgreSQL: `docker-compose exec postgres pg_dump -U invar invar > backup_$(date +%Y%m%d).sql`
- [ ] Store backups securely (separate from server)
- [ ] Test restore process

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Common causes:
# - Ports in use: lsof -i :3000
# - Database already running: docker-compose down -v
# - Permission issues: sudo docker-compose up -d
```

### Metrics not showing in dashboard
```bash
# 1. Check web service
docker-compose logs web | tail -20

# 2. Check Redis
docker-compose exec redis redis-cli ping

# 3. Check PostgreSQL
docker-compose exec postgres psql -U invar -d invar -c "SELECT COUNT(*) FROM metrics;"

# 4. Send test metric again
bash deploy.sh test
```

### High CPU/Memory usage
```bash
# Check which service is consuming resources
docker stats

# Restart a specific service
docker-compose restart web  # or worker, redis, postgres
```

## Daily Operations

### View real-time logs
```bash
docker-compose logs -f
```

### Monitor services
```bash
docker-compose ps
```

### Restart services (if stuck)
```bash
docker-compose restart
```

### Stop services (maintenance)
```bash
docker-compose down
# Later...
docker-compose up -d
```

### Backup metrics
```bash
docker-compose exec postgres pg_dump -U invar invar > metrics_backup_$(date +%Y%m%d_%H%M%S).sql
```

## Integration with External Systems

Your Invar instance is now ready to receive metrics. Example requests:

### Send metrics from application
```bash
API_KEY="your-key-from-.env.production"
curl -X POST https://your-domain.com/v1/ingest \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "metric": "request_latency_ms",
    "value": 125.5,
    "server": "api-01",
    "timestamp": '$(date +%s)'
  }'
```

### Query historical data
```bash
HOUR_AGO=$(($(date +%s) - 3600))
NOW=$(date +%s)

curl "http://localhost:3000/v1/metrics?startTime=$HOUR_AGO&endTime=$NOW&metric=request_latency_ms"
```

## Success Indicators ✓

- [ ] All services running: `docker-compose ps` shows 4 healthy services
- [ ] Health endpoint responds: `curl http://localhost:3000/health` → `{"status":"ok"}`
- [ ] PostgreSQL initialized: `docker-compose exec postgres psql -U invar -c "\\dt"`
- [ ] Redis working: `docker-compose exec redis redis-cli ping` → `PONG`
- [ ] Metrics being ingested: Dashboard shows data in "Live Stream"
- [ ] Realtime updates working: New metrics appear instantly in dashboard

## Support Resources

- **Architecture**: See `README.md`
- **Deployment Details**: See `DEPLOYMENT.md`
- **Helper Script**: `bash deploy.sh help`
- **Logs**: `docker-compose logs [service-name]`

---

**Deployment Date**: _______________  
**Deployed By**: _______________  
**API Key Rotation Date**: _______________  
**Last Backup**: _______________
