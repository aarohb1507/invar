# Invar — Production-Grade Metrics Ingestion & Realtime Delivery System

**A high-performance, containerized metrics platform** that ingests metrics at scale, delivers real-time updates via Server-Sent Events (SSE), and provides a durable cold storage layer for historical analysis.

## 🎯 What This Project Demonstrates

- **Scalable System Design**: Dual-path architecture (hot + cold) optimized for performance
- **Real-time Technologies**: Redis Streams + Pub/Sub + Server-Sent Events (SSE)
- **Production-Ready Code**: Error handling, logging, graceful shutdown
- **DevOps & Infrastructure**: Docker, Docker Compose, containerization
- **Database Optimization**: PostgreSQL with JSONB, indexes for complex queries
- **Full-Stack Development**: Backend (Node.js/Express), Frontend (Vanilla JS), Infrastructure

## 🚀 Features

✅ **Hot Path (Sub-100ms latency)** - Redis XADD + PUBLISH for instant metric ingestion  
✅ **Cold Path (Durable Storage)** - Worker process persists metrics to PostgreSQL  
✅ **Real-time Dashboard** - SSE-based live metric updates with Chart.js visualization  
✅ **Query & Aggregation** - Time-range queries with avg/max/min/sum aggregations  
✅ **Authentication** - API Key validation + Session-based browser auth  
✅ **Containerized** - Multi-stage Dockerfile + Docker Compose orchestration  
✅ **Graceful Shutdown** - Batch processing with error handling & DLQ  
✅ **Health Monitoring** - /health endpoint for infrastructure checks

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT (Application sending metrics)                                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
                    POST /v1/ingest
                             │
┌────────────────────────────▼────────────────────────────────────────────┐
│  HOT PATH (Ingest API) — Accept instantly, never block                  │
│  ├─ XADD → Redis Stream (invar:ingest) — durable event log             │
│  └─ PUBLISH → Redis Pub/Sub (invar:live) — ephemeral live broadcast    │
└──────────────────┬──────────────────────────┬───────────────────────────┘
                   │                          │
                   │                          │
       ┌───────────▼──────────┐    ┌──────────▼─────────────┐
       │  COLD PATH           │    │  REALTIME DELIVERY     │
       │  (Ingest Worker)     │    │  (Realtime Service)    │
       │                      │    │                        │
       │  XREADGROUP          │    │  SUBSCRIBE(invar:live) │
       │  ↓                   │    │  ↓                     │
       │  PostgreSQL          │    │  sendEvent()           │
       │  (JSONB rows)        │    │  ↓                     │
       └──────────┬───────────┘    │  SSE broadcaster       │
                  │                │  ↓                     │
                  │                └────────┬───────────────┘
                  │                         │
                  │                         │
       ┌──────────▼─────────────┐  ┌───────▼────────────────┐
       │  QUERY PATH            │  │  BROWSER DASHBOARD     │
       │  (Query Service)       │  │                        │
       │                        │  │  EventSource           │
       │  GET /v1/metrics       │  │  (GET /v1/metrics/live)│
       │  - time range filters  │  │                        │
       │  - pagination          │  │  Receives live events  │
       │  - aggregations        │  │  (server → client)     │
       │  ↓                     │  └────────────────────────┘
       │  Returns historical    │
       │  data from PostgreSQL  │
       └────────────────────────┘

AUTH FLOW (for browser SSE)
Browser → POST /v1/auth/session (with API key) → Server sets HttpOnly cookie
       → Browser EventSource auto-sends cookie → SSE connection authenticated
```

**Key Points:**
- **Hot path**: Accepts metrics instantly via Redis XADD (durable) + PUBLISH (live)
- **Cold path**: Worker reads Redis Stream → writes to PostgreSQL for history
- **Realtime**: Pub/Sub subscriber → SSE → pushes live updates to browsers
- **Query**: REST API reads PostgreSQL for historical data & aggregations
- **Auth**: API key for services, HttpOnly cookie for browser SSE (EventSource can't set headers)

What's included
- Hot path: Redis XADD + PUBLISH (src/ingest)
- Cold path: Worker reads stream → PostgreSQL (src/workers/ingest.worker.js)
- Query layer: historical queries + aggregations (src/query)
- Realtime: Redis subscriber → SSE broadcaster (src/realtime)
- Auth: API key for services, HttpOnly cookie for browser SSE (src/auth)

Tech
- Node.js, Express
- Redis (Streams + Pub/Sub), ioredis
- PostgreSQL (JSONB)
- SSE (EventSource) for server→browser live updates

Tradeoffs — why SSE
- Pros: simple, browser-native, auto-reconnect, ideal for uni‑directional dashboard updates
## 🏗️ Project Status

| Component | Status | Details |
|-----------|--------|---------|
| Backend API | ✅ Complete | Ingest, Query, Realtime services |
| Worker Process | ✅ Complete | Stream consumer with batch processing |
| Database Schema | ✅ Complete | PostgreSQL with JSONB + indexes |
| Frontend Dashboard | ✅ Complete | Real-time updates, charts, stats |
| Docker Setup | ✅ Complete | Multi-stage build + Compose orchestration |
| Testing | ✅ Complete | Manual testing with live metrics |
| **Production Ready** | ✅ **YES** | Containerized and ready to deploy |

---

## 💼 For Hiring Managers

This project showcases:

**Backend Skills:**
- Express.js API design with proper error handling
- Redis Streams consumer groups for reliable processing
- PostgreSQL JSONB queries with complex filtering
- Async/await patterns and graceful error recovery
- Middleware architecture (authentication, logging)

**System Design:**
- Decoupled hot/cold path architecture for scale
- Consumer group pattern for distributed processing
- Time-bucketed aggregations for analytics
- Real-time pub/sub for dashboard updates

**DevOps & Infrastructure:**
- Docker multi-stage builds for optimized images
- Docker Compose for local and production setups
- Environment-based configuration management
- Health checks and service orchestration

**Frontend:**
- Vanilla JavaScript (no framework) with modular components
- Real-time SSE integration with auto-reconnect
- Chart.js for metric visualization
- Responsive dashboard UI

**Code Quality:**
- Clean separation of concerns (routes, services, controllers)
- Comprehensive logging throughout
- Error handling & retry logic
- Production-ready patterns

---

## 📦 Deployment Ready

**Infrastructure included:**
- Dockerfile (production-optimized)
- docker-compose.yml (4 services: web, worker, redis, postgres)
- Environment configuration (.env.production)
- Deployment helper script (bash deploy.sh)
- Complete documentation (DEPLOYMENT.md, CHECKLIST.md)

**To deploy to any VPS:**
```bash
git clone this-repo
cd invar
docker-compose up -d
```

**That's it.** Fully functional metrics system running.

---

## 🔗 Quick Links

- [Architecture Details](./README.md#architecture) - System design & data flow
- [Deployment Guide](./DEPLOYMENT.md) - Complete setup instructions
- [Configuration](./CHECKLIST.md) - Verification checklist
- [Codebase](./src/) - Well-structured source code

---

## 📋 Technologies Used

**Backend:** Node.js, Express.js, ioredis, pg  
**Database:** PostgreSQL (JSONB), Redis (Streams + Pub/Sub)  
**Frontend:** Vanilla JavaScript, Chart.js, Server-Sent Events  
**Infrastructure:** Docker, Docker Compose  
**Tools:** npm, nodemon, bash scripting  

---

## 🎓 What You Can Learn From This Project

1. **How to build scalable systems** - Hot/cold path separation
2. **Redis patterns** - Streams, consumer groups, pub/sub
3. **Real-time web** - SSE, event-driven architecture
4. **Docker mastery** - Containerization & orchestration
5. **API design** - RESTful endpoints with proper auth
6. **Database optimization** - Indexing & aggregation queries
- Dashboard demo and monitoring
- Deployment: docker-compose + CI/CD (see ./docker-compose.yml & .env.production.example)
- Scaling plan (Redis adapter or WebSocket if bidirectional needed)

Deployment (local / VM)
1. Copy `.env.production.example` to `.env.production` on your server and set secrets (DATABASE_URL, REDIS_URL, INVAR_API_KEY).
2. Ensure `./db/init/schema.sql` is present (it will auto-run on first Postgres startup).
3. Run: `docker compose up -d --build` to start services.
4. Verify: `docker compose ps` and `curl -f http://localhost:3000/health`.
5. To reinitialize DB: `docker compose down -v` then `docker compose up -d --build` (careful: this removes volumes).

Contact
Repo owner for implementation details and demo.
