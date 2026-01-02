# Invar — Metrics Ingestion & Realtime Delivery

One line
A lightweight system to accept high‑volume metrics instantly, persist them reliably, and stream live updates to dashboards.

Problem solved
- Fast, non‑blocking ingestion (hot path)
- Durable storage for historical queries (cold path)
- Low‑latency live updates for UIs

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
- Cons: no client→server channel on same stream, cannot set custom headers (use cookie/session)

Quick start
1. Set env: DATABASE_URL, REDIS_URL, INVAR_API_KEY, NODE_ENV
2. npm ci
3. npm run dev (app) and run worker for cold path
4. Use `/v1/auth/session` to set browser cookie, then open `/v1/metrics/live` via EventSource

Next steps
- Seed data & integration tests
- Dashboard demo and monitoring
- Scaling plan (Redis adapter or WebSocket if bidirectional needed)

Contact
Repo owner for implementation details and demo.
