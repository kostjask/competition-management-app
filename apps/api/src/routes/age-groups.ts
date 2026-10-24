import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { AgeGroupsController } from "../controllers/AgeGroupsController";
import { asyncHandler } from "../errors/handler";

export function ageGroupsRouter(prisma: PrismaClient) {
  const router = Router();
  const controller = new AgeGroupsController(prisma);
  router.get("/:eventId/age-groups", asyncHandler((req, res) => controller.list(req, res)));
  router.post("/:eventId/age-groups", asyncHandler((req, res) => controller.create(req, res)));
  router.get("/:eventId/age-groups/:ageGroupId", asyncHandler((req, res) => controller.getById(req, res)));
  router.patch("/:eventId/age-groups/:ageGroupId", asyncHandler((req, res) => controller.update(req, res)));
  router.delete("/:eventId/age-groups/:ageGroupId", asyncHandler((req, res) => controller.delete(req, res)));
  return router;
}
