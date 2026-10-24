import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../errors/handler";
import { EventsController } from "../controllers";

export const eventsRouter = (prisma: PrismaClient) => {
  const router = Router();
  const eventsController = new EventsController(prisma);

  // GET all events (authenticated)
  router.get(
    "/",
    asyncHandler((req, res) => eventsController.getAll(req, res)),
  );

  // GET single event (authenticated)
  router.get(
    "/:eventId",
    asyncHandler((req, res) => eventsController.getById(req, res)),
  );

  // POST create event (Admin only)
  router.post(
    "/",
    asyncHandler((req, res) => eventsController.create(req, res)),
  );

  // PATCH update event (Admin only)
  router.patch(
    "/:eventId",
    asyncHandler((req, res) => eventsController.update(req, res)),
  );

  return router;
};
