import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { StaffController } from "../controllers/StaffController";
import { asyncHandler } from "../errors/handler";
export function staffRouter(prisma: PrismaClient) {
  const router = Router();
  const controller = new StaffController(prisma);
  router.get("/:eventId/staff", asyncHandler((req, res) => controller.list(req, res)));
  router.post("/:eventId/staff/:assignmentId/remove", asyncHandler((req, res) => controller.remove(req, res)));
  return router;
}
