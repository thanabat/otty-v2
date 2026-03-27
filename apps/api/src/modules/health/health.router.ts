import { Router } from "express";
import { getHealthSnapshot } from "./health.service";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.json(getHealthSnapshot());
});

healthRouter.get("/ready", (_request, response) => {
  response.json({
    ready: true
  });
});

