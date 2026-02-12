import { Router } from "express";
import { PrismaClient, Prisma } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";
import { isActionAllowed } from "../utils/stageChecks";
import {
  CreateStudioBodySchema,
  UpdateStudioBodySchema,
  UpdateRegistrationBodySchema,
  UpdateRepresentativeBodySchema,
  IdSchema,
} from "../../../../packages/schemas/src";

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

  router.post(
    "/events/:eventId/studios",
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

  // GET all studio
  router.get("/", async (_req, res) => {
    const studios = await prisma.studio.findMany({
      where: { deletedAt: null },
      include: { registrations: true, representatives: true },
      orderBy: { name: "asc" },
    });
    res.json(studios);
  });

  // List of all available studios
  router.get("/s", requirePermission("studio.manage"), async (req, res) => {
    const auth = req.auth!;

    console.log("studios");

    if (auth.isAdmin) {
      const studios = await prisma.studio.findMany({
        where: { deletedAt: null },
        include: { registrations: true, representatives: true },
        orderBy: { name: "asc" },
      });
      return res.json(studios);
    }

    const studios = await prisma.studio.findMany({
      where: {
        deletedAt: null,
        representatives: {
          some: { userId: auth.userId, active: true },
        },
      },
      include: { registrations: true, representatives: true },
      orderBy: { name: "asc" },
    });
  });

  //todo: move to events router?
  // List studios for an event (Admin sees all, reps only approved own)
  router.get(
    "/events/:eventId/studios",
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

  // Get studio details (Admin or representative)
  router.get(
    "/studios/:studioId",
    requirePermission("studio.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const studioId = IdSchema.parse(req.params.studioId);

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
      const studioId = IdSchema.parse(req.params.studioId);
      const body = UpdateStudioBodySchema.parse(req.body);

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
          return res
            .status(403)
            .json({ error: "Studio edits not allowed in current event stage" });
        }
      }

      const data: Prisma.StudioUpdateInput = {};

      if (body.name !== undefined) data.name = body.name.trim();
      if (body.country !== undefined) data.country = body.country.trim();
      if (body.city !== undefined) data.city = body.city.trim();
      if (body.directorName !== undefined) data.directorName = body.directorName.trim();
      if (body.directorPhone !== undefined) data.directorPhone = body.directorPhone.trim();
      if (body.invoiceDetails !== undefined) data.invoiceDetails = body.invoiceDetails as Prisma.InputJsonValue;

      const updated = await prisma.studio.update({
        where: { id: studioId },
        data,
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
      const studioId = IdSchema.parse(req.params.studioId);
      if (!auth.isAdmin) return res.sendStatus(403);

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
    "/events/:eventId/studios/:studioId/registration",
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
      const studioId = IdSchema.parse(req.params.studioId);
      const representativeId = IdSchema.parse(req.params.representativeId);
      const body = UpdateRepresentativeBodySchema.parse(req.body);

      const rep = await prisma.studioRepresentative.findUnique({
        where: { id: representativeId },
      });

      if (!rep || rep.studioId !== studioId) return res.sendStatus(404);

      // Only the rep themselves or admin can edit
      if (!auth.isAdmin && rep.userId !== auth.userId) {
        return res.sendStatus(403);
      }

      const repData: Prisma.StudioRepresentativeUpdateInput = {};

      if (body.name !== undefined) repData.name = body.name.trim();
      if (body.email !== undefined) repData.email = body.email.trim();

      const updated = await prisma.studioRepresentative.update({
        where: { id: representativeId },
        data: repData,
      });

      return res.json(updated);
    },
  );

  return router;
}
