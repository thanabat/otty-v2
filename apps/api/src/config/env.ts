import path from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

const cwd = process.cwd();
const rootDir = path.resolve(cwd, "../..");

for (const envPath of [
  path.join(rootDir, ".env"),
  path.join(rootDir, ".env.local"),
  path.join(cwd, ".env"),
  path.join(cwd, ".env.local")
]) {
  loadEnv({
    path: envPath,
    override: false
  });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/otty-v2"),
  JWT_SECRET: z.string().min(1).default("replace-me"),
  LINE_CHANNEL_ID: z.string().default(""),
  LINE_CHANNEL_SECRET: z.string().default(""),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().default(""),
  WEB_URL: z.string().url().default("http://localhost:3000"),
  WEB_URLS: z.string().default("")
});

export const env = envSchema.parse(process.env);
