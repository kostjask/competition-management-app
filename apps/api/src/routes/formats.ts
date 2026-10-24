import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { FormatsController } from "../controllers/FormatsController";
import { asyncHandler } from "../errors/handler";

export function formatsRouter(prisma: PrismaClient) {
  const router = Router();
  const controller = new FormatsController(prisma);
  router.get("/:eventId/formats", asyncHandler((req, res) => controller.list(req, res)));
  router.post("/:eventId/formats", asyncHandler((req, res) => controller.create(req, res)));
  router.get("/:eventId/formats/:formatId", asyncHandler((req, res) => controller.getById(req, res)));
  router.patch("/:eventId/formats/:formatId", asyncHandler((req, res) => controller.update(req, res)));
  router.delete("/:eventId/formats/:formatId", asyncHandler((req, res) => controller.delete(req, res)));
  return router;
}
