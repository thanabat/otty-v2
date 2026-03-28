import { createApp } from "./app";
import { env } from "./config/env";
import { connectToDatabase, disconnectFromDatabase } from "./lib/mongodb";
import { logger } from "./lib/logger";

async function bootstrap() {
  await connectToDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT
      },
      "API server is listening"
    );
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down API server");

    server.close(async () => {
      await disconnectFromDatabase();
      process.exit(0);
    });
  };

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      void shutdown(signal);
    });
  }
}

void bootstrap().catch((error) => {
  logger.error({ err: error }, "Failed to start API server");
  process.exit(1);
});
