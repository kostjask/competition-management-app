import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { EntryWorkflowController } from "../controllers/EntryWorkflowController";
import { asyncHandler } from "../errors/handler";
export function entryWorkflowRouter(prisma: PrismaClient) {
  const router = Router();
  const controller = new EntryWorkflowController(prisma);
  router.get("/:eventId/entry-configuration", asyncHandler((req, res) => controller.configuration(req, res)));
  router.put("/:eventId/entry-configuration", asyncHandler((req, res) => controller.configure(req, res)));
  router.get("/:eventId/studios/:studioId/entry-review", asyncHandler((req, res) => controller.read(req, res)));
  router.post("/:eventId/studios/:studioId/entry-review/:kind", asyncHandler((req, res) => controller.command(req, res)));
  return router;
}
