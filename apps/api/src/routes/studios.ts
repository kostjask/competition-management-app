import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requirePermission } from "../auth/requirePermission";
import { StudiosController } from "../controllers/StudiosController";
import { asyncHandler } from "../errors/handler";

export function studiosRouter(prisma: PrismaClient) {
  const router = Router();
  const studiosController = new StudiosController(prisma);

  // GET list of all active studios (Admin sees all, reps see their studios)
  router.get(
    "/",
    requirePermission("studio.manage"),
    asyncHandler((req, res) => studiosController.getAll(req, res))
  );

  // GET studio details (Admin or representative)
  router.get(
    "/:studioId",
    requirePermission("studio.manage"),
    asyncHandler((req, res) => studiosController.getById(req, res))
  )

  // PATCH update studio (Admin or representative)
  router.patch(
    "/:studioId",
    requirePermission("studio.manage"),
    asyncHandler((req, res) => studiosController.update(req, res))
  )

  // DELETE soft delete studio (Admin only for now)
  router.delete(
    "/:studioId",
    requirePermission("studio.manage"),
    asyncHandler((req, res) => studiosController.delete(req, res))
  )

  // PATCH update studio approval status (Admin only)
  router.patch(
    "/:studioId/approval",
    requirePermission("event.manage", { eventParam: "eventId" }),
    asyncHandler((req, res) => studiosController.updateStudioApproval(req, res)),
  );

  // Update representative info (name/email)
  router.patch(
    "/:studioId/representatives/:representativeId",
    requirePermission("studio.manage"),
    asyncHandler((req, res) => studiosController.updateRepresentative(req, res))
  );

  return router;
}
