import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler } from "./middlewares/error-handler";
import { notFoundHandler } from "./middlewares/not-found";
import { healthRouter } from "./modules/health/health.router";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.WEB_URL
    })
  );
  app.use(express.json());
  app.use(
    pinoHttp({
      logger
    })
  );

  app.get("/", (_request, response) => {
    response.json({
      message: "otty-v2 api bootstrap"
    });
  });

  app.use(healthRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

