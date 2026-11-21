import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { ScoringController } from "../controllers/ScoringController";
import { asyncHandler } from "../errors/handler";
export function scoringRouter(prisma: PrismaClient) {
  const router = Router(), controller = new ScoringController(prisma);
  router.get("/:eventId/scoring", asyncHandler((req, res) => controller.read(req, res)));
  router.get("/:eventId/scoring/judge", asyncHandler((req, res) => controller.judge(req, res)));
  router.post("/:eventId/scoring/preview", asyncHandler((req, res) => controller.preview(req, res)));
  router.post("/:eventId/scoring/commands", asyncHandler((req, res) => controller.command(req, res)));
  return router;
}
