import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redis = new Redis(redisUrl);
const STREAM = process.env.INVAR_STREAM || "invar:ingest";
const CHANNEL = process.env.INVAR_CHANNEL || "invar:live";

function samplePayload() {
  return {
    metric: "cpu",
    value: +(20 + Math.random() * 60).toFixed(2),
    server: `srv-${Math.ceil(Math.random() * 3)}`,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

async function publishOnce() {
  const payload = samplePayload();
  const data = JSON.stringify(payload);
  // XADD to stream (durable)
  await redis.xadd(STREAM, "*", "payload", data, "timestamp", String(payload.timestamp));
  // PUBLISH for realtime delivery
  await redis.publish(CHANNEL, data);
  console.log("published", payload);
}

async function loop(intervalMs = 1000) {
  try {
    while (true) {
      await publishOnce();
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  } catch (err) {
    console.error("publisher error:", err);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("publish-sample.js")) {
  const ms = parseInt(process.argv[2], 10) || 1000;
  console.log("Starting sample publisher (interval ms):", ms);
  loop(ms);
}

export default { publishOnce, loop };