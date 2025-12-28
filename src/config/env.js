import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT,
  redisUrl: process.env.REDIS_URL,
  apiKey: process.env.INVAR_API_KEY
};
