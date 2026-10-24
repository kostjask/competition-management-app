import { Router, type RequestHandler } from "express";
import type { PrismaClient } from "@prisma/client";
import { InvitationsController } from "../controllers/InvitationsController";
import { asyncHandler } from "../errors/handler";
export function invitationsRouter(prisma: PrismaClient, authenticate: RequestHandler) {
  const router = Router();
  const controller = new InvitationsController(prisma);
  router.get("/", authenticate, asyncHandler((req, res) => controller.list(req, res)));
  router.post("/", authenticate, asyncHandler((req, res) => controller.create(req, res)));
  router.get("/:token", asyncHandler((req, res) => controller.inspect(req, res)));
  router.post("/accept", asyncHandler((req, res) => controller.accept(req, res)));
  return router;
}
