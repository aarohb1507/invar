#!/usr/bin/env node
/**
 * Initialize database schema on remote PostgreSQL
 */

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
    console.error('Usage: node scripts/init-db.js <DATABASE_URL>');
    console.error('   or: DATABASE_URL=... node scripts/init-db.js');
    process.exit(1);
}

const schema = `
-- Metrics table (cold storage)
CREATE TABLE IF NOT EXISTS metrics (
  id BIGSERIAL PRIMARY KEY,
  stream_id TEXT UNIQUE,
  payload JSONB NOT NULL,
  timestamp BIGINT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT metrics_timestamp_check CHECK (timestamp > 0)
);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics (timestamp DESC);

-- Index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_metrics_payload_gin ON metrics USING GIN (payload);
`;

async function initDatabase() {
    console.log('🔌 Connecting to PostgreSQL...');

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected!');

        console.log('📝 Creating schema...');
        await client.query(schema);
        console.log('✅ Schema created!');

        // Verify
        const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'metrics'
    `);

        if (result.rows.length > 0) {
            console.log('✅ Verified: metrics table exists!');
        }

        console.log('\n🎉 Database initialized successfully!');

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

initDatabase();
