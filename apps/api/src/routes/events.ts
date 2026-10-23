import { Router } from "express";
import { PrismaClient } from "@prisma/client";
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
    "/:eventId",
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
    "/:eventId",
    requirePermission("event.manage"),
    asyncHandler((req, res) => eventsController.update(req, res)),
  );

  // GET list studios for event
  router.get(
    "/:eventId/studios",
    requirePermission("studio.manage", { eventParam: "eventId" }),
    asyncHandler((req, res) => eventsController.listStudios(req, res)),
  );

  // POST register studio for event
  router.post(
    "/:eventId/studios/:studioId/registration",
    requirePermission("studio.manage", { eventParam: "eventId" }),
    asyncHandler((req, res) => eventsController.registerStudio(req, res)),
  );

  // PATCH update studio registration status for event (Admin only)
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
