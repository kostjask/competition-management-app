import express from "express";
import cors from "cors";
import type { PrismaClient } from "@prisma/client";
import { apiRouter } from "./routes/api";
import { errorHandler } from "./errors/handler";
import { AppError, NotFoundError } from "./errors";
import { config } from "./config/env";
import { authRecoveryLimit, requestLimit } from "./middleware/authRecoveryLimit";
import { securityHeaders } from "./middleware/securityHeaders";
import { checkBrowserCsrf } from "./services/browserSession";
import type { RecoveryDelivery } from "./services/authRecovery";
import { createAuthMiddleware } from "./middleware/auth";
import { ImagesController } from "./controllers/ImagesController";
import { asyncHandler } from "./errors/handler";

// Construction has no listener, process handlers, or database/storage initialization.
export function createApp(prisma: PrismaClient, recoveryDelivery?: RecoveryDelivery) {
  const app = express();
  app.set("trust proxy", false);
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(cors((req, callback) => {
    const origin = req.headers.origin;
    const exact = config.security.corsOrigin.some(allowed => allowed !== "*" && allowed === origin);
    if (origin && !exact && !config.security.corsOrigin.includes("*")) return callback(new AppError("Origin is not allowed", 403, "FORBIDDEN", undefined, "permissionDenied"));
    callback(null, { origin: origin ?? false, credentials: exact });
  }));
  app.use((req, _res, next) => { checkBrowserCsrf(req); next(); });
  app.use("/api/v1/auth/login", requestLimit({ ...config.security.rateLimit, maxRequests: config.security.loginMaxRequests }));
  app.use("/api/v1/auth/onboarding", requestLimit({ ...config.security.rateLimit, maxRequests: config.security.loginMaxRequests }));
  app.use(["/api/v1/auth/register", "/api/v1/auth/verify-email"], requestLimit());
  app.use(["/api/v1/auth/resend-verification", "/api/v1/auth/correct-email", "/api/v1/auth/request-password-reset", "/api/v1/auth/reset-password"], authRecoveryLimit());
  app.use("/api/v1/invitations", requestLimit());
  app.use("/api/v1/images", requestLimit());
  app.use(express.json({ limit: "100kb", inflate: false }));
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
