import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { ScheduleController } from "../controllers/ScheduleController";
import { asyncHandler } from "../errors/handler";
export function scheduleRouter(prisma: PrismaClient) {
  const router = Router(); const controller = new ScheduleController(prisma);
  router.get("/:eventId/schedule", asyncHandler((req, res) => controller.read(req, res)));
  router.get("/:eventId/schedule/live", asyncHandler((req, res) => controller.live(req, res)));
  router.post("/:eventId/schedule/preview", asyncHandler((req, res) => controller.preview(req, res)));
  router.post("/:eventId/schedule/commands", asyncHandler((req, res) => controller.command(req, res)));
  return router;
}
