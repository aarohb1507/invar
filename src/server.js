import app from "./app.js";
import { connectRedis } from "./redis/redis.client.js";

const PORT = process.env.PORT || 3000;

// Validate critical env vars at startup
if (!process.env.INVAR_API_KEY) {
  console.error("FATAL: INVAR_API_KEY not set in environment");
  process.exit(1);
}

// Connect to Redis (non-blocking - server starts even if Redis is down)
console.log("[server] connecting to Redis...");
await connectRedis();

app.listen(PORT, () => {
  console.log(`Invar server listening on port ${PORT}`);
});
