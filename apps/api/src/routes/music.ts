import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { MusicController } from "../controllers/MusicController";
import { asyncHandler } from "../errors/handler";
import { requestLimit } from "../middleware/authRecoveryLimit";
import { musicUploadMiddleware } from "../middleware/music-upload";

export function musicRouter(db: PrismaClient) {
  const router = Router(); const controller = new MusicController(db);
  const base = "/:eventId/studios/:studioId/music";
  router.put("/:eventId/music-configuration", asyncHandler((req, res) => controller.configure(req, res)));
  router.get(base, asyncHandler((req, res) => controller.read(req, res)));
  router.post(base, asyncHandler((req, res) => controller.create(req, res)));
  router.post(base + "/:trackId/commands", asyncHandler((req, res) => controller.command(req, res)));
  router.get(base + "/:trackId/versions/:versionId/bytes", asyncHandler((req, res) => controller.bytes(req, res)));
  router.post(base + "/:trackId/versions", requestLimit(), musicUploadMiddleware(req => controller.prepare(req)), asyncHandler((req, res) => controller.upload(req, res)));
  return router;
}
