import { Router } from "express";
import { PrismaClient } from "../../generated/prisma";
import { requirePermission } from "../auth/requirePermission";
import { isActionAllowed } from "../utils/stageChecks";

export function studiosRouter(prisma: PrismaClient) {
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

    if (!studio) return { studio: null, isRep: false, status: null, canEditDuringReview: false };

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

  // Create studio + registration request (Representative)
  router.post(
    "/events/:eventId/studios",
    requirePermission("studio.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      const { eventId } = req.params;
      const {
        name,
        country,
        city,
        directorName,
        directorPhone,
        invoiceDetails,
        representativeName,
        representativeEmail,
      } = req.body as {
        name?: string;
        country?: string;
        city?: string;
        directorName?: string;
        directorPhone?: string;
        invoiceDetails?: unknown;
        representativeName?: string;
        representativeEmail?: string;
      };

      if (!name?.trim()) {
        return res.status(400).json({ error: "Studio name is required" });
      }

      // Check event stage
      if (!auth.isAdmin) {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { stage: true },
        });

        if (!event || !isActionAllowed(event.stage, "studio.register")) {
          return res.status(403).json({ error: "Registration not allowed in current event stage" });
        }

        if (!representativeName?.trim() || !representativeEmail?.trim()) {
          return res.status(400).json({ error: "Representative name and email are required" });
        }
      }

      // Admin can create directly
      if (auth.isAdmin) {
        const studio = await prisma.studio.create({
          data: {
            eventId,
            name: name.trim(),
            country: country?.trim(),
            city: city?.trim(),
            directorName: directorName?.trim(),
            directorPhone: directorPhone?.trim(),
            invoiceDetails,
            registrations: {
              create: { eventId, status: "APPROVED" },
            },
          },
          include: { representatives: true, registrations: true },
        });

        return res.status(201).json(studio);
      }

      // Representative flow: create studio + registration request
      const studio = await prisma.studio.create({
        data: {
          eventId,
          name: name.trim(),
          country: country?.trim(),
          city: city?.trim(),
          directorName: directorName?.trim(),
          directorPhone: directorPhone?.trim(),
          invoiceDetails,
          representatives: {
            create: {
              userId: auth.userId,
              name: representativeName!.trim(),
              email: representativeEmail!.trim(),
            },
          },
          registrations: {
            create: { eventId, status: "PENDING" },
          },
        },
        include: { representatives: true, registrations: true },
      });

      return res.status(201).json(studio);
    },
  );

  // List studios for an event (Admin sees all, reps only approved own)
  router.get(
    "/events/:eventId/studios",
    requirePermission("studio.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      const { eventId } = req.params;

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

  // Get studio details (Admin or representative)
  router.get(
    "/studios/:studioId",
    requirePermission("studio.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const { studioId } = req.params;

      if (auth.isAdmin) {
        const studio = await prisma.studio.findFirst({
          where: { id: studioId, deletedAt: null },
          include: { registrations: true, representatives: true, event: true },
        });
        if (!studio) return res.sendStatus(404);
        return res.json(studio);
      }

      const { studio, isRep } = await requireStudioAccess(
        auth.userId,
        studioId,
      );

      if (!studio || !isRep) return res.sendStatus(403);

      return res.json(studio);
    },
  );

  // Update studio (Admin or representative with stage check)
  router.patch(
    "/studios/:studioId",
    requirePermission("studio.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const { studioId } = req.params;
      const {
        name,
        country,
        city,
        directorName,
        directorPhone,
        invoiceDetails,
      } = req.body as {
        name?: string;
        country?: string;
        city?: string;
        directorName?: string;
        directorPhone?: string;
        invoiceDetails?: unknown;
      };

      if (!auth.isAdmin) {
        const { studio, isRep, status } = await requireStudioAccess(
          auth.userId,
          studioId,
        );
        if (!studio || !isRep || status === "REJECTED") {
          return res.sendStatus(403);
        }

        // Check stage
        if (!isActionAllowed(studio.event.stage, "studio.edit")) {
          return res.status(403).json({ error: "Studio edits not allowed in current event stage" });
        }
      }

      const updated = await prisma.studio.update({
        where: { id: studioId },
        data: {
          name: name?.trim() ?? undefined,
          country: country?.trim() ?? undefined,
          city: city?.trim() ?? undefined,
          directorName: directorName?.trim() ?? undefined,
          directorPhone: directorPhone?.trim() ?? undefined,
          invoiceDetails,
        },
        include: { representatives: true, registrations: true },
      });

      return res.json(updated);
    },
  );

  // Soft delete studio (Admin only)
  router.delete(
    "/studios/:studioId",
    requirePermission("studio.manage"),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const { studioId } = req.params;
      const deleted = await prisma.studio.update({
        where: { id: studioId },
        data: { deletedAt: new Date() },
      });

      return res.json(deleted);
    },
  );

  // Approve or reject registration (Admin only)
  router.patch(
    "/events/:eventId/studios/:studioId/registration",
    requirePermission("event.register", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const { eventId, studioId } = req.params;
      const { status, canEditDuringReview } = req.body as {
        status?: "PENDING" | "APPROVED" | "REJECTED";
        canEditDuringReview?: boolean;
      };

      if (!status) return res.status(400).json({ error: "Status is required" });

      const updated = await prisma.studioEventRegistration.upsert({
        where: { studioId_eventId: { studioId, eventId } },
        update: { 
          status,
          canEditDuringReview: canEditDuringReview ?? undefined,
        },
        create: { 
          studioId, 
          eventId, 
          status,
          canEditDuringReview: canEditDuringReview ?? false,
        },
      });

      return res.json(updated);
    },
  );

  // Cancel registration request (Representative, PENDING only)
  router.delete(
    "/events/:eventId/studios/:studioId/registration",
    requirePermission("event.register", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      const { eventId, studioId } = req.params;

      if (!auth.isAdmin) {
        const { studio, isRep, status } = await requireStudioAccess(
          auth.userId,
          studioId,
        );
        if (!studio || !isRep || status !== "PENDING") {
          return res.sendStatus(403);
        }
      }

      const registration = await prisma.studioEventRegistration.findUnique({
        where: { studioId_eventId: { studioId, eventId } },
      });

      if (!registration) return res.sendStatus(404);
      if (registration.status !== "PENDING") return res.sendStatus(400);

      await prisma.studioEventRegistration.delete({
        where: { studioId_eventId: { studioId, eventId } },
      });

      return res.sendStatus(204);
    },
  );

  // Update representative info (name/email)
  router.patch(
    "/studios/:studioId/representatives/:representativeId",
    requirePermission("studio.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const { studioId, representativeId } = req.params;
      const { name, email } = req.body as { name?: string; email?: string };

      const rep = await prisma.studioRepresentative.findUnique({
        where: { id: representativeId },
      });

      if (!rep || rep.studioId !== studioId) return res.sendStatus(404);

      // Only the rep themselves or admin can edit
      if (!auth.isAdmin && rep.userId !== auth.userId) {
        return res.sendStatus(403);
      }

      const updated = await prisma.studioRepresentative.update({
        where: { id: representativeId },
        data: {
          name: name?.trim() ?? undefined,
          email: email?.trim() ?? undefined,
        },
      });

      return res.json(updated);
    },
  );

  return router;
}