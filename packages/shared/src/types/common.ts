export type AppEnvironment = "development" | "test" | "production";

export interface HealthSnapshot {
  status: "ok";
  service: "api";
  environment: AppEnvironment;
  timestamp: string;
  database: {
    status: "disconnected" | "connected" | "connecting" | "disconnecting";
    name?: string;
    host?: string;
  };
}
