import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";
import {
  CreateEventBodySchema,
  UpdateEventBodySchema,
  EventIdParamsSchema,
} from "../../../../packages/schemas/src";

export const eventsRouter = (prisma: PrismaClient) => {
  const router = Router();

  // GET all events
  router.get("/", async (_req, res) => {
    const events = await prisma.event.findMany({
      orderBy: { startsAt: "asc" },
    });
    res.json(events);
  });

  // GET single event
  router.get("/:id", async (req, res) => {
    const params = EventIdParamsSchema.parse(req.params);
    const event = await prisma.event.findUnique({
      where: { id: params.id },
    });
    if (!event) return res.sendStatus(404);
    res.json(event);
  });

  // POST create event (Admin only)
  router.post("/", requirePermission("event.manage"), async (req, res) => {
    const auth = req.auth!;
    if (!auth.isAdmin) return res.sendStatus(403);

    const body = CreateEventBodySchema.parse(req.body);
    const event = await prisma.event.create({
      data: {
        name: body.name,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        stage: body.stage ?? undefined,
      },
    });
    res.status(201).json(event);
  });

  // PATCH update event (Admin only)
  router.patch("/:id", requirePermission("event.manage"), async (req, res) => {
    const auth = req.auth!;
    if (!auth.isAdmin) return res.sendStatus(403);

    const params = EventIdParamsSchema.parse(req.params);
    const body = UpdateEventBodySchema.parse(req.body);

    const event = await prisma.event.update({
      where: { id: params.id },
      data: {
        name: body.name ?? undefined,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        stage: body.stage ?? undefined,
      },
    });

    res.json(event);
  });

  return router;
};