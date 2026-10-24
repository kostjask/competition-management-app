import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { ImagesController } from "../controllers/ImagesController";
import { createFileUploadMiddleware } from "../middleware/file-upload";
import { asyncHandler } from "../errors/handler";
export function imagesRouter(prisma: PrismaClient) {
  const router = Router(); const controller = new ImagesController(prisma);
  router.post("/events/:eventId", createFileUploadMiddleware({ fieldName: "image" }), asyncHandler((req, res) => controller.event(req, res)));
  router.post("/users/:userId", createFileUploadMiddleware({ fieldName: "photo" }), asyncHandler((req, res) => controller.user(req, res)));
  router.post("/dancers/:dancerId", createFileUploadMiddleware({ fieldName: "photo" }), asyncHandler((req, res) => controller.dancer(req, res)));
  router.post("/studios/:studioId", createFileUploadMiddleware({ fieldName: "logo" }), asyncHandler((req, res) => controller.studio(req, res)));
  return router;
}
