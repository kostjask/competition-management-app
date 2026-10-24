import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { CategoriesController } from "../controllers/CategoriesController";
import { asyncHandler } from "../errors/handler";

export function categoriesRouter(prisma: PrismaClient) {
  const router = Router();
  const controller = new CategoriesController(prisma);
  router.get("/:eventId/categories", asyncHandler((req, res) => controller.list(req, res)));
  router.post("/:eventId/categories", asyncHandler((req, res) => controller.create(req, res)));
  router.get("/:eventId/categories/:categoryId", asyncHandler((req, res) => controller.getById(req, res)));
  router.patch("/:eventId/categories/:categoryId", asyncHandler((req, res) => controller.update(req, res)));
  router.delete("/:eventId/categories/:categoryId", asyncHandler((req, res) => controller.delete(req, res)));
  return router;
}
