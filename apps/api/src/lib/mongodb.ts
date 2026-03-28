import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "./logger";

type DatabaseStatus =
  | "disconnected"
  | "connected"
  | "connecting"
  | "disconnecting";

const readyStateLabels: Record<number, DatabaseStatus> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

let connectionPromise: Promise<typeof mongoose> | null = null;

mongoose.connection.on("connected", () => {
  logger.info(
    {
      database: mongoose.connection.name,
      host: mongoose.connection.host
    },
    "MongoDB connected"
  );
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});

mongoose.connection.on("error", (error) => {
  logger.error({ err: error }, "MongoDB connection error");
});

export async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}

export async function disconnectFromDatabase() {
  connectionPromise = null;

  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}

export function getDatabaseSnapshot() {
  return {
    status: readyStateLabels[mongoose.connection.readyState] ?? "disconnected",
    name: mongoose.connection.name || getDatabaseNameFromUri(env.MONGODB_URI),
    host: mongoose.connection.host || undefined
  } as const;
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

function getDatabaseNameFromUri(uri: string) {
  try {
    const parsed = new URL(uri);
    return parsed.pathname.replace(/^\//, "") || undefined;
  } catch {
    return undefined;
  }
}
