import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { StudioRegistrationsController } from "../controllers/StudioRegistrationsController";
import { asyncHandler } from "../errors/handler";

// Authentication is applied by the parent event router. New representatives have
// no event role yet; controllers enforce ownership and admin approval explicitly.
export function studioRegistrationsRouter(prisma: PrismaClient) {
  const router = Router();
  const controller = new StudioRegistrationsController(prisma);
  router.get("/:eventId/studio-registrations", asyncHandler((req, res) => controller.list(req, res)));
  router.post("/:eventId/studio-registrations", asyncHandler((req, res) => controller.create(req, res)));
  router.patch("/:eventId/studio-registrations/:studioId", asyncHandler((req, res) => controller.update(req, res)));
  router.delete("/:eventId/studio-registrations/:studioId", asyncHandler((req, res) => controller.cancel(req, res)));
  return router;
}
