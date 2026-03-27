export type AppEnvironment = "development" | "test" | "production";

export interface HealthSnapshot {
  status: "ok";
  service: "api";
  environment: AppEnvironment;
  timestamp: string;
}

