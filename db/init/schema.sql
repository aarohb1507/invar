-- Invar Database Schema
-- PostgreSQL cold storage for metrics

-- Drop existing table (for development only)
-- DROP TABLE IF EXISTS metrics;

-- Metrics table (cold storage)
CREATE TABLE IF NOT EXISTS metrics (
  id BIGSERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  timestamp BIGINT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT metrics_timestamp_check CHECK (timestamp > 0)
);

-- Index for time-range queries (most common)
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics (timestamp DESC);

-- Index for JSONB queries (e.g., WHERE payload->>'metric' = 'cpu')
CREATE INDEX IF NOT EXISTS idx_metrics_payload_gin ON metrics USING GIN (payload);

-- Optional: Partitioning by month (for high-volume production)
-- Uncomment and modify dates as needed:

-- CREATE TABLE metrics_2025_01 PARTITION OF metrics
--   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- CREATE TABLE metrics_2025_02 PARTITION OF metrics
--   FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Verify schema
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'metrics'
ORDER BY ordinal_position;
