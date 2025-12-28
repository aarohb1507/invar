import Redis from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.redisUrl);

redis.on("connect", () => {
  console.log("[redis] connected");
});

redis.on("error", (err) => {
  console.error("[redis] error", err);
});
