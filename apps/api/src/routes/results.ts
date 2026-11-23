import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { ResultsController } from "../controllers/ResultsController";
import { asyncHandler } from "../errors/handler";

export function resultsRouter(prisma: PrismaClient) {
  const router = Router();
  const controller = new ResultsController(prisma);
  router.use("/:eventId/results", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.get("/:eventId/results", asyncHandler((req, res) => controller.read(req, res)));
  router.post("/:eventId/results/commands", asyncHandler((req, res) => controller.command(req, res)));
  return router;
}
