import { Router } from "express";
import { z } from "zod";
import type { PrismaClient } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";

export const eventsRouter = (prisma: PrismaClient) => {
  const router = Router();

  const CreateEventBody = z.object({
    name: z.string().min(1),
    startsAt: z.string(),
    endsAt: z.string(),
    stage: z
      .enum([
        "PRE_REGISTRATION",
        "REGISTRATION_OPEN",
        "DATA_REVIEW",
        "FINALIZED",
      ])
      .optional(),
  });

  const UpdateEventBody = z.object({
    name: z.string().min(1).optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    stage: z
      .enum([
        "PRE_REGISTRATION",
        "REGISTRATION_OPEN",
        "DATA_REVIEW",
        "FINALIZED",
      ])
      .optional(),
  });

  // GET all events
  router.get("/", async (_req, res) => {
    const events = await prisma.event.findMany({
      orderBy: { startsAt: "asc" },
    });
    res.json(events);
  });

  // GET single event
  router.get("/:id", async (req, res) => {
    const params = z.object({ id: z.string() }).parse(req.params);
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

    const body = CreateEventBody.parse(req.body);
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

    const params = z.object({ id: z.string() }).parse(req.params);
    const body = UpdateEventBody.parse(req.body);

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