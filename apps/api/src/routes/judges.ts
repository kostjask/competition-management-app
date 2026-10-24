import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { JudgesController } from "../controllers/JudgesController";
import { asyncHandler } from "../errors/handler";

export function judgesRouter(prisma: PrismaClient) {
  const router = Router();
  const controller = new JudgesController(prisma);
  router.get("/:eventId/judges", asyncHandler((req, res) => controller.list(req, res)));
  router.post("/:eventId/judges", asyncHandler((req, res) => controller.create(req, res)));
  router.get("/:eventId/judges/:judgeId", asyncHandler((req, res) => controller.getById(req, res)));
  router.patch("/:eventId/judges/:judgeId", asyncHandler((req, res) => controller.update(req, res)));
  router.delete("/:eventId/judges/:judgeId", asyncHandler((req, res) => controller.delete(req, res)));
  return router;
}
