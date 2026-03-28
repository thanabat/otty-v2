import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler } from "./middlewares/error-handler";
import { notFoundHandler } from "./middlewares/not-found";
import { authRouter } from "./modules/auth/auth.router";
import { healthRouter } from "./modules/health/health.router";
import { usersRouter } from "./modules/users/users.router";

export function createApp() {
  const app = express();
  const allowedOrigins = Array.from(
    new Set(
      [
        env.WEB_URL,
        ...env.WEB_URLS.split(",").map((origin) => origin.trim()).filter(Boolean),
        ...(env.NODE_ENV === "development"
          ? ["http://localhost:3000", "https://localhost:9000"]
          : [])
      ].filter(Boolean)
    )
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      }
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

  app.use(authRouter);
  app.use(healthRouter);
  app.use(usersRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
