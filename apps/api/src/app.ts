import express from "express";
import cors from "cors";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { apiRouter } from "./routes/api";
import { errorHandler } from "./errors/handler";
import { NotFoundError } from "./errors";

// Construction has no listener, process handlers, or database/storage initialization.
export function createApp(prisma: PrismaClient) {
  const app = express();
  app.use(cors({ origin: "*" }));
  app.use(express.json());
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok" });
    } catch {
      res.status(500).json({ status: "error" });
    }
  });

  app.use("/api/v1", apiRouter(prisma));
  app.use((_req, _res, next) => next(new NotFoundError("Route")));
  app.use(errorHandler);
  return app;
}
