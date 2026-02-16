import { Router } from "express";
import { PrismaClient } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";
import { asyncHandler } from "../errors/handler";
import { EventsController } from "../controllers";

export const eventsRouter = (prisma: PrismaClient) => {
  const router = Router();
  const eventsController = new EventsController(prisma);

  // GET all events (public)
  router.get(
    "/",
    asyncHandler((req, res) => eventsController.getAll(req, res)),
  );

  // GET single event (public)
  router.get(
    "/:id",
    asyncHandler((req, res) => eventsController.getById(req, res)),
  );

  // POST create event (Admin only)
  router.post(
    "/",
    requirePermission("event.manage"),
    asyncHandler((req, res) => eventsController.create(req, res)),
  );

  // PATCH update event (Admin only)
  router.patch(
    "/:id",
    requirePermission("event.manage"),
    asyncHandler((req, res) => eventsController.update(req, res)),
  );

  // POST register studio for event
  router.post(
    "/:eventId/studios",
    requirePermission("studio.manage", { eventParam: "eventId" }),
    asyncHandler((req, res) => eventsController.registerStudio(req, res)),
  );

  // GET list studios for event
  router.get(
    "/:eventId/studios",
    requirePermission("studio.manage", { eventParam: "eventId" }),
    asyncHandler((req, res) => eventsController.listStudios(req, res)),
  );

  // PATCH update registration status
  router.patch(
    "/:eventId/studios/:studioId/registration",
    requirePermission("event.register", { eventParam: "eventId" }),
    asyncHandler((req, res) => eventsController.updateRegistration(req, res)),
  );

  // DELETE cancel registration
  router.delete(
    "/:eventId/studios/:studioId/registration",
    requirePermission("event.register", { eventParam: "eventId" }),
    asyncHandler((req, res) => eventsController.cancelRegistration(req, res)),
  );

  return router;
};
