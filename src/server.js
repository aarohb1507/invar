import { app } from "./app.js";
import { connectRedis } from "./redis/redis.client.js";
import { startRealtime } from "./realtime/realtime.service.js";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const PORT = process.env.PORT || 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Validate critical env vars at startup
if (!process.env.INVAR_API_KEY) {
  console.error("FATAL: INVAR_API_KEY not set in environment");
  process.exit(1);
}

// Connect to Redis (non-blocking - server starts even if Redis is down)
console.log("[server] connecting to Redis...");
await connectRedis();

// Start realtime Redis subscriber (SSE broadcaster)
await startRealtime();

// In production, start worker as a child process
if (process.env.NODE_ENV === "production") {
  console.log("[server] starting embedded worker...");
  const workerPath = join(__dirname, "workers", "ingest.worker.js");
  const worker = spawn("node", [workerPath], {
    stdio: "inherit",
    env: process.env,
  });

  worker.on("error", (err) => {
    console.error("[server] worker error:", err.message);
  });

  worker.on("exit", (code) => {
    console.error(`[server] worker exited with code ${code}`);
    // Optionally restart the worker
    if (code !== 0) {
      console.log("[server] restarting worker in 5s...");
      setTimeout(() => {
        spawn("node", [workerPath], { stdio: "inherit", env: process.env });
      }, 5000);
    }
  });
}

app.listen(PORT, () => {
  console.log(`Invar server listening on port ${PORT}`);
});
