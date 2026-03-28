import { Router } from "express";
import { getHealthSnapshot, getReadinessSnapshot } from "./health.service";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.json(getHealthSnapshot());
});

healthRouter.get("/ready", (_request, response) => {
  const snapshot = getReadinessSnapshot();

  response.status(snapshot.ready ? 200 : 503).json(snapshot);
});
