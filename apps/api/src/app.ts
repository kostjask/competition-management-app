import express from "express";
import cors from "cors";
import type { PrismaClient } from "@prisma/client";
import { apiRouter } from "./routes/api";
import { errorHandler } from "./errors/handler";
import { NotFoundError } from "./errors";
import type { RecoveryDelivery } from "./services/authRecovery";
import { createAuthMiddleware } from "./middleware/auth";
import { ImagesController } from "./controllers/ImagesController";
import { asyncHandler } from "./errors/handler";

// Construction has no listener, process handlers, or database/storage initialization.
export function createApp(prisma: PrismaClient, recoveryDelivery?: RecoveryDelivery) {
  const app = express();
  app.set("trust proxy", false);
  app.use(cors({ origin: "*" }));
  app.use(express.json());
  const images = new ImagesController(prisma);
  app.get("/uploads/:resource/:filename", createAuthMiddleware(prisma), asyncHandler((req, res) => images.retrieve(req, res)));

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok" });
    } catch {
      res.status(500).json({ status: "error" });
    }
  });

  app.use("/api/v1", apiRouter(prisma, recoveryDelivery));
  app.use((_req, _res, next) => next(new NotFoundError("Route")));
  app.use(errorHandler);
  return app;
}
