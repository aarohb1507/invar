import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT,
  redisUrl: process.env.REDIS_URL,
  databaseUrl: process.env.DATABASE_URL || "postgresql://localhost:5432/invar",
  apiKey: process.env.INVAR_API_KEY
};
