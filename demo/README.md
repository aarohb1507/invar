# Invar Dashboard - Quick Start Guide

## 🚀 Start the System

###1. Start Redis (if not already running)
```bash
redis-server
```

### 2. Start PostgreSQL (if not already running)
Make sure your database is ready with the schema from `schema.sql`.

### 3. Start the Invar Server
```bash
npm run dev
```

### 4. Start the Worker (in a separate terminal)
```bash
npm run worker:dev
```

### 5. Open the Dashboard
Navigate to: **http://localhost:3000**

---

## 🎯 How to Use the Dashboard

### Authentication
When you first open the dashboard, you'll be prompted for an API key.
- Use the key from your `.env` file (`INVAR_API_KEY`)
- It will be saved in localStorage for future visits

### Summary Cards (Top)
- **Ingestion Rate**: Events per second hitting Redis
- **Real-time Lag**: Pending messages in Redis Stream
- **Worker Status**: OK / RETRYING / ERROR
- **Cold Storage**: Rows written to Postgres per minute

### Charts
- **Left Chart (Hot Path)**: Real-time SSE streaming chart
  - Toggle between CPU, Memory, Disk using tabs
  - Updates live as events arrive
  
- **Right Chart (Cold Path)**: Worker backlog visualization
  - Shows pending message count over time
  - Turns red when backlog grows (>50 messages)

### Control Buttons

#### ▶️Start Simulation
- Generates mock CPU/Memory/Disk metrics at 10 events/sec
- Data flows through Redis → Worker → Postgres
- Click again to stop

#### ⚠️ Inject Error
- Simulates a worker failure by sending malformed data
- Watch the backlog chart grow
- Worker will retry and eventually move to DLQ

#### 🔍 Query History
- Fetches last 100 metrics from Postgres
- Shows collapsible table with timestamp, metric, value, server, stream ID
- Click X to close

### Event Feed (Bottom)
- Live stream of incoming events
- Colored dots:
  - 🟢 Green: Normal (value < 80%)
  - 🟡 Yellow: Warning (value 80-95%)
  - 🔴 Red: Critical (value > 95%)
- Max 25 events, auto-trims older ones
- Click "Clear" to reset

---

## 🐛 Troubleshooting

### "Authentication failed"
- Check that your `.env` file has `INVAR_API_KEY` set
- Make sure the server is running on port 3000
- Clear localStorage and refresh

### "Real-time connection lost"
- Check that Redis is running
- Restart the server

### Backlog not updating
- Make sure the worker is running (`npm run worker:dev`)
- Check worker logs for errors

### No data in charts
- Click "Start Simulation" to generate mock data
- Or send real metrics using the ingestion API

---

## 📊 Architecture Overview

```
┌──────────────┐
│   Browser    │
│  (Dashboard) │
└──────┬───────┘
       │
       │ HTTP (API calls)
       │ SSE (real-time events)
       │
┌──────▼───────┐     PUBLISH      ┌─────────────┐
│   Express    │─────────────────▶│Redis Channel│
│   Server     │                   │ invar:live  │
└──────┬───────┘                   └─────────────┘
       │                                  │
       │ XADD                             │ SUBSCRIBE
       │                                  │
┌──────▼───────┐                   ┌──────▼──────┐
│ Redis Stream │                   │ Realtime    │
│ invar:ingest │                   │ Service     │
└──────┬───────┘                   └─────────────┘
       │
       │ XREADGROUP
       │
┌──────▼───────┐
│   Worker     │
│   Process    │
└──────┬───────┘
       │
       │ INSERT
       │
┌──────▼───────┐
│  PostgreSQL  │
│ (Cold Store) │
└──────────────┘
```

**Hot Path**: Client → Express → Redis → SSE → Browser (real-time)
**Cold Path**: Redis Stream → Worker → Postgres (durable storage)

---

Enjoy your recruiter-impressive dashboard! 🎉
