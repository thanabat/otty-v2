import { env } from "../../config/env";

export function getHealthSnapshot() {
  return {
    status: "ok",
    service: "api",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  } as const;
}

