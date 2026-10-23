import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { DancersController } from "../controllers/DancersController";
import { asyncHandler } from "../errors/handler";

// Authentication is applied once at the /studios mount; access is event-scoped in the controller.
export function dancersRouter(prisma: PrismaClient) {
  const router = Router();
  const controller = new DancersController(prisma);
  router.get("/:studioId/dancers", asyncHandler((req, res) => controller.list(req, res)));
  router.post("/:studioId/dancers", asyncHandler((req, res) => controller.create(req, res)));
  router.get("/:studioId/dancers/:dancerId", asyncHandler((req, res) => controller.getById(req, res)));
  router.patch("/:studioId/dancers/:dancerId", asyncHandler((req, res) => controller.update(req, res)));
  router.delete("/:studioId/dancers/:dancerId", asyncHandler((req, res) => controller.delete(req, res)));
  return router;
}
