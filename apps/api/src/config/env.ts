import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/otty-v2"),
  JWT_SECRET: z.string().min(1).default("replace-me"),
  LINE_CHANNEL_ID: z.string().default(""),
  LINE_CHANNEL_SECRET: z.string().default(""),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().default(""),
  WEB_URL: z.string().url().default("http://localhost:3000")
});

export const env = envSchema.parse(process.env);

