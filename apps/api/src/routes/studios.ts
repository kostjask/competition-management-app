import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { StudiosController } from "../controllers/StudiosController";
import { asyncHandler } from "../errors/handler";

export function studiosRouter(prisma: PrismaClient) {
  const router = Router();
  const controller = new StudiosController(prisma);
  router.get("/", asyncHandler((req, res) => controller.getAll(req, res)));
  router.get("/:studioId", asyncHandler((req, res) => controller.getById(req, res)));
  router.patch("/:studioId", asyncHandler((req, res) => controller.update(req, res)));
  router.delete("/:studioId", asyncHandler((req, res) => controller.delete(req, res)));
  router.patch("/:studioId/approval", asyncHandler((req, res) => controller.updateStudioApproval(req, res)));
  router.patch("/:studioId/representatives/:representativeId", asyncHandler((req, res) => controller.updateRepresentative(req, res)));
  return router;
}
