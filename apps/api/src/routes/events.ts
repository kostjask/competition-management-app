import { Router } from "express";
import { PrismaClient, Prisma } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";
import { isActionAllowed } from "../utils/stageChecks";
import {
  CreateEventBodySchema,
  UpdateEventBodySchema,
  EventIdParamsSchema,
  CreateStudioBodySchema,
  UpdateRegistrationBodySchema,
  IdSchema,
} from "@dance/schemas";

export const eventsRouter = (prisma: PrismaClient) => {
  const router = Router();

  async function requireStudioAccess(userId: string, studioId: string) {
    const studio = await prisma.studio.findFirst({
      where: { id: studioId, deletedAt: null },
      include: {
        registrations: true,
        representatives: true,
        event: { select: { stage: true } },
      },
    });

    if (!studio)
      return {
        studio: null,
        isRep: false,
        status: null,
        canEditDuringReview: false,
      };

    const isRep = studio.representatives.some(
      (r) => r.userId === userId && r.active,
    );

    const registration = studio.registrations.find(
      (r) => r.eventId === studio.eventId,
    );

    const status = registration?.status ?? null;
    const canEditDuringReview = registration?.canEditDuringReview ?? false;

    return { studio, isRep, status, canEditDuringReview };
  }

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

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.startsAt) updateData.startsAt = body.startsAt;
    if (body.endsAt) updateData.endsAt = body.endsAt;
    if (body.stage) updateData.stage = body.stage;

    const event = await prisma.event.create({
      data: updateData,
    });
    res.status(201).json(event);
  });

  // PATCH update event (Admin only)
  router.patch("/:id", requirePermission("event.manage"), async (req, res) => {
    const auth = req.auth!;
    if (!auth.isAdmin) return res.sendStatus(403);

    const params = EventIdParamsSchema.parse(req.params);
    const body = UpdateEventBodySchema.parse(req.body);

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.startsAt) updateData.startsAt = body.startsAt;
    if (body.endsAt) updateData.endsAt = body.endsAt;
    if (body.stage) updateData.stage = body.stage;

    const event = await prisma.event.update({
      where: { id: params.id },
      data: updateData,
    });

    res.json(event);
  });

  // Register studio for event (Admin creates directly, Representative requests)
  router.post(
    "/:eventId/studios",
    requirePermission("studio.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      const eventId = IdSchema.parse(req.params.eventId);
      const body = CreateStudioBodySchema.parse(req.body);

      // Check event stage
      if (!auth.isAdmin) {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { stage: true },
        });

        if (!event || !isActionAllowed(event.stage, "studio.register")) {
          return res
            .status(403)
            .json({ error: "Registration not allowed in current event stage" });
        }

        if (!body.representativeName?.trim() || !body.representativeEmail?.trim()) {
          return res
            .status(400)
            .json({ error: "Representative name and email are required" });
        }
      }

      // Admin can create directly
      if (auth.isAdmin) {
        const data: Prisma.StudioUncheckedCreateInput = {
          eventId,
          name: body.name.trim(),
          registrations: {
            create: { eventId, status: "APPROVED" },
          },
        };

        if (body.country !== undefined) data.country = body.country.trim();
        if (body.city !== undefined) data.city = body.city.trim();
        if (body.directorName !== undefined) data.directorName = body.directorName.trim();
        if (body.directorPhone !== undefined) data.directorPhone = body.directorPhone.trim();
        if (body.invoiceDetails !== undefined) data.invoiceDetails = body.invoiceDetails as Prisma.InputJsonValue;

        const studio = await prisma.studio.create({
          data,
          include: { representatives: true, registrations: true },
        });

        return res.status(201).json(studio);
      }

      // Representative flow: create studio + registration request
      const data: Prisma.StudioUncheckedCreateInput = {
        eventId,
        name: body.name.trim(),
        representatives: {
          create: {
            userId: auth.userId,
            name: body.representativeName!.trim(),
            email: body.representativeEmail!.trim(),
          },
        },
        registrations: {
          create: { eventId, status: "PENDING" },
        },
      };

      if (body.country !== undefined) data.country = body.country.trim();
      if (body.city !== undefined) data.city = body.city.trim();
      if (body.directorName !== undefined)
        data.directorName = body.directorName.trim();
      if (body.directorPhone !== undefined)
        data.directorPhone = body.directorPhone.trim();
      if (body.invoiceDetails !== undefined)
        data.invoiceDetails = body.invoiceDetails as Prisma.InputJsonValue;

      const studio = await prisma.studio.create({
        data,
        include: { representatives: true, registrations: true },
      });

      return res.status(201).json(studio);
    },
  );

  // List studios for an event (Admin sees all, reps only approved own)
  router.get(
    "/:eventId/studios",
    requirePermission("studio.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      const eventId = IdSchema.parse(req.params.eventId);

      if (auth.isAdmin) {
        const studios = await prisma.studio.findMany({
          where: { eventId, deletedAt: null },
          include: { registrations: true, representatives: true },
          orderBy: { name: "asc" },
        });
        return res.json(studios);
      }

      const studios = await prisma.studio.findMany({
        where: {
          eventId,
          deletedAt: null,
          representatives: {
            some: { userId: auth.userId, active: true },
          },
        },
        include: { registrations: true, representatives: true },
        orderBy: { name: "asc" },
      });

      return res.json(studios);
    },
  );

  // Approve or reject registration (Admin only)
  router.patch(
    "/:eventId/studios/:studioId/registration",
    requirePermission("event.register", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      const eventId = IdSchema.parse(req.params.eventId);
      const studioId = IdSchema.parse(req.params.studioId);
      const body = UpdateRegistrationBodySchema.parse(req.body);

      const updateData: Prisma.StudioEventRegistrationUpdateInput = {
        status: body.status,
      };

      if (body.canEditDuringReview !== undefined) {
        updateData.canEditDuringReview = body.canEditDuringReview;
      }

      const result = await prisma.$transaction(async (tx) => {
        // Update or create registration
        const updated = await tx.studioEventRegistration.upsert({
          where: { studioId_eventId: { studioId, eventId } },
          update: updateData,
          create: {
            studioId,
            eventId,
            status: body.status,
            canEditDuringReview: body.canEditDuringReview ?? false,
          },
        });

        // If approved, assign representative role to all active studio representatives
        if (body.status === "APPROVED") {
          const studio = await tx.studio.findUnique({
            where: { id: studioId },
            include: { representatives: { where: { active: true } } },
          });

          if (studio) {
            const representativeRole = await tx.role.findUnique({
              where: { key: "representative" },
            });

            if (representativeRole) {
              // Assign role to each representative
              for (const rep of studio.representatives) {
                await tx.userRole.upsert({
                  where: {
                    userId_roleId_eventId: {
                      userId: rep.userId,
                      roleId: representativeRole.id,
                      eventId: eventId ?? null,
                    } as any,
                  },
                  create: {
                    userId: rep.userId,
                    roleId: representativeRole.id,
                    eventId: eventId ?? null,
                  },
                  update: {}, // Already has role, do nothing
                });
              }
            }
          }
        }

        return updated;
      });

      return res.json(result);
    },
  );

  // Cancel registration request (Representative, PENDING only)
  router.delete(
    "/:eventId/studios/:studioId/registration",
    requirePermission("event.register", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      const eventId = IdSchema.parse(req.params.eventId);
      const studioId = IdSchema.parse(req.params.studioId);

      if (!auth.isAdmin) {
        const { studio, isRep, status } = await requireStudioAccess(
          auth.userId,
          studioId,
        );
        if (!studio || !isRep || status !== "PENDING") {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const registration = await prisma.studioEventRegistration.findUnique({
        where: { studioId_eventId: { studioId, eventId } },
      });

      if (!registration) return res.status(404).json({ error: "Registration not found" });
      if (registration.status !== "PENDING") return res.status(400).json({ error: "Can only cancel pending registrations" });

      await prisma.studioEventRegistration.delete({
        where: { studioId_eventId: { studioId, eventId } },
      });

      return res.sendStatus(204);
    },
  );

  return router;
};