import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../errors/handler";
import { EventsController } from "../controllers";
import { ReviewController } from "../controllers/ReviewController";

export const eventsRouter = (prisma: PrismaClient) => {
  const router = Router();
  const eventsController = new EventsController(prisma);
  const reviews = new ReviewController(prisma);
  router.get("/:eventId/review", asyncHandler((req, res) => reviews.overview(req, res)));
  router.post("/:eventId/review/:notificationId/retry", asyncHandler((req, res) => reviews.retry(req, res)));

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
