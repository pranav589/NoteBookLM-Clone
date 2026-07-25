import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import { podcastsDir } from "./middleware/upload.middleware";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  // Static path for served podcasts
  app.use("/podcasts", express.static(podcastsDir));

  // Mount API routes
  app.use("/api", apiRoutes);

  // Global error handler middleware
  app.use(errorHandler);

  return app;
}
