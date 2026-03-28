import { env } from "../../config/env";
import { getDatabaseSnapshot, isDatabaseReady } from "../../lib/mongodb";

export function getHealthSnapshot() {
  return {
    status: "ok",
    service: "api",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: getDatabaseSnapshot()
  } as const;
}

export function getReadinessSnapshot() {
  return {
    ready: isDatabaseReady()
  } as const;
}
