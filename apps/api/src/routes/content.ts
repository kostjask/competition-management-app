import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors";
import { ContentController } from "../controllers/ContentController";
import { ContentAssetsController } from "../controllers/ContentAssetsController";
import { createFileUploadMiddleware } from "../middleware/file-upload";
import { asyncHandler } from "../errors/handler";
export function contentRouter(db: PrismaClient) {
  const router = Router(); const c = new ContentController(db); const a = new ContentAssetsController(db);
  router.use((_req, res, next) => { res.set({ "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" }); next(); });
  router.use(asyncHandler(async (req, _res, next) => { await a.authorize(req); next(); }));
  router.get("/documents", asyncHandler((req, res) => c.index(req, res)));
  router.post("/documents", asyncHandler((req, res) => c.initialize(req, res)));
  router.post("/festivals", asyncHandler((req, res) => c.festival(req, res)));
  router.post("/editions", asyncHandler((req, res) => c.edition(req, res)));
  router.post("/editions/:editionId/link", asyncHandler((req, res) => c.link(req, res)));
  router.get("/documents/:documentId", asyncHandler((req, res) => c.detail(req, res)));
  router.post("/documents/:documentId/revisions", asyncHandler((req, res) => c.save(req, res)));
  router.get("/documents/:documentId/revisions", asyncHandler((req, res) => c.history(req, res)));
  router.get("/documents/:documentId/preview", asyncHandler((req, res) => c.preview(req, res)));
  router.get("/documents/:documentId/operations/:operationId", asyncHandler((req, res) => c.operation(req, res)));
  router.post("/documents/:documentId/publish", asyncHandler((req, res) => c.publish(req, res)));
  router.post("/documents/:documentId/unpublish", asyncHandler((req, res) => c.unpublish(req, res)));
  router.post("/documents/:documentId/archive", asyncHandler((req, res) => c.archive(req, res)));
  router.post("/documents/:documentId/assets", createFileUploadMiddleware({ fieldName: "image" }), asyncHandler((req, res) => a.upload(req, res)));
  router.post("/documents/:documentId/assets/:assetId/review", asyncHandler((req, res) => a.review(req, res)));
  router.post("/documents/:documentId/assets/:assetId/retire", asyncHandler((req, res) => a.review(req, res, true)));
  router.get("/documents/:documentId/assets/:assetId", asyncHandler((req, res) => a.retrieve(req, res, true)));
  return router;
}
export function publicContentRouter(db: PrismaClient) {
  const router = Router(); const c = new ContentController(db); const a = new ContentAssetsController(db);
  router.use((_req, res, next) => { res.set({ "Cache-Control": "no-store" }); next(); });
  router.get("/studio", asyncHandler((req, res) => c.publicRead(req, res, "STUDIO_SITE")));
  router.get("/festivals", asyncHandler((req, res) => c.publicRead(req, res, "FESTIVAL_PORTAL")));
  router.get("/festivals/:festivalSlug/editions/:editionSlug", asyncHandler((req, res) => c.publicRead(req, res, "FESTIVAL_EDITION")));
  router.get("/assets/:assetId", asyncHandler((req, res) => a.retrieve(req, res)));
  router.use((error: unknown, _req: Request, _res: Response, next: NextFunction) => {
    if (error instanceof Prisma.PrismaClientInitializationError || (error instanceof Prisma.PrismaClientKnownRequestError && ["P1001", "P1002", "P1008", "P1017"].includes(error.code))) return next(new AppError("Public content is unavailable", 503, "SERVICE_UNAVAILABLE"));
    next(error);
  });
  return router;
}
