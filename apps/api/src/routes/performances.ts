import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { PerformancesController } from "../controllers";
import { asyncHandler } from "../errors/handler";

export function performancesRouter(prisma: PrismaClient) {
  const router = Router();
  const controller = new PerformancesController(prisma);
  router.get("/:eventId/performances", asyncHandler((req, res) => controller.list(req, res)));
  router.post("/:eventId/performances", asyncHandler((req, res) => controller.create(req, res)));
  router.get("/:eventId/performances/:performanceId", asyncHandler((req, res) => controller.getById(req, res)));
  router.patch("/:eventId/performances/:performanceId", asyncHandler((req, res) => controller.update(req, res)));
  router.delete("/:eventId/performances/:performanceId", asyncHandler((req, res) => controller.delete(req, res)));
  return router;
}
