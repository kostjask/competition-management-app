import { Router } from "express";
import { PrismaClient, Prisma } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";
import { isActionAllowed } from "../utils/stageChecks";
import {
  UpdateStudioBodySchema,
  UpdateRepresentativeBodySchema,
  CreateDancerBodySchema,
  ParamsWithStudioIdSchema,
  ParamsWithStudioAndPerformanceIdSchema,
  CreatePerformanceBodySchema,
  UpdatePerformanceBodySchema,
  IdSchema,
} from "@dance/schemas";

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

  async function requireApprovedStudioAccess(userId: string, studioId: string) {
    const studio = await prisma.studio.findFirst({
      where: { id: studioId, deletedAt: null },
      include: {
        registrations: true,
        representatives: true,
        event: { select: { stage: true } },
      },
    });

    if (!studio)
      return { studio: null, approved: false, isRep: false, canEditDuringReview: false };

    const isRep = studio.representatives.some(
      (r) => r.userId === userId && r.active,
    );

    const registration = studio.registrations.find(
      (r) => r.eventId === studio.eventId,
    );

    const approved = registration?.status === "APPROVED";
    const canEditDuringReview = registration?.canEditDuringReview ?? false;

    return { studio, approved, isRep, canEditDuringReview };
  }

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

    return res.json(studios);
  });

  // Get studio details (Admin or representative)
  router.get(
    "/:studioId",
    requirePermission("studio.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const studioId = IdSchema.parse(req.params.studioId);

      if (auth.isAdmin) {
        const studio = await prisma.studio.findFirst({
          where: { id: studioId, deletedAt: null },
          include: { registrations: true, representatives: true, event: true },
        });
        if (!studio) return res.status(404).json({ error: "Studio not found" });
        return res.json(studio);
      }

      const { studio, isRep } = await requireStudioAccess(
        auth.userId,
        studioId,
      );

      if (!studio || !isRep) return res.status(403).json({ error: "Access denied" });

      return res.json(studio);
    },
  );

  // Update studio (Admin or representative with stage check)
  router.patch(
    "/:studioId",
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
          return res.status(403).json({ error: "Access denied" });
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
    "/:studioId",
    requirePermission("studio.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const studioId = IdSchema.parse(req.params.studioId);
      if (!auth.isAdmin) return res.status(403).json({ error: "Access denied" });

      const deleted = await prisma.studio.update({
        where: { id: studioId },
        data: { deletedAt: new Date() },
      });

      return res.json(deleted);
    },
  );

  // Create dancer for studio (Admin or approved representative)
  router.post(
    "/:studioId/dancers",
    requirePermission("dancer.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const studioId = IdSchema.parse(req.params.studioId);
      const body = CreateDancerBodySchema.parse(req.body);
      const birthDate =
        body.birthDate instanceof Date
          ? body.birthDate
          : new Date(body.birthDate);

      if (!auth.isAdmin) {
        const { studio, approved, isRep, canEditDuringReview } =
          await requireApprovedStudioAccess(auth.userId, studioId);
        if (!studio || !approved || !isRep) return res.status(403).json({ error: "Access denied" });

        if (!isActionAllowed(studio.event.stage, "dancer.manage", canEditDuringReview)) {
          return res.status(403).json({
            error: "Dancer management not allowed in current event stage",
          });
        }
      }

      const dancer = await prisma.dancer.create({
        data: {
          studioId,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          birthDate,
        },
      });

      return res.status(201).json(dancer);
    },
  );

  // List dancers for studio (Admin or approved representative)
  router.get(
    "/:studioId/dancers",
    requirePermission("dancer.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const studioId = IdSchema.parse(req.params.studioId);

      if (!auth.isAdmin) {
        const { approved, isRep } = await requireApprovedStudioAccess(
          auth.userId,
          studioId,
        );
        if (!approved || !isRep) return res.status(403).json({ error: "Access denied" });
      }

      const dancers = await prisma.dancer.findMany({
        where: { studioId, deletedAt: null },
        orderBy: { lastName: "asc" },
      });

      return res.json(dancers);
    },
  );

  // Create performance for studio (Admin or approved representative)
  router.post(
    "/:studioId/performances",
    requirePermission("performance.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const params = ParamsWithStudioIdSchema.safeParse(req.params);
      if (!params.success) return res.status(400).json(params.error);

      const { studioId } = params.data;

      const body = CreatePerformanceBodySchema.safeParse(req.body);
      if (!body.success) return res.status(400).json(body.error);

      if (!auth.isAdmin) {
        const { studio, approved, isRep, canEditDuringReview } =
          await requireApprovedStudioAccess(auth.userId, studioId);
        if (!studio || !approved || !isRep) return res.status(403).json({ error: "Access denied" });

        if (
          !isActionAllowed(
            studio.event.stage,
            "performance.manage",
            canEditDuringReview,
          )
        ) {
          return res.status(403).json({
            error: "Performance management not allowed in current event stage",
          });
        }
      }

      const studio = await prisma.studio.findUnique({
        where: { id: studioId },
        include: { event: true },
      });

      if (!studio) return res.status(404).json({ error: "Studio not found" });

      // Validate category/ageGroup/format belong to the same event
      const [category, ageGroup, format] = await Promise.all([
        prisma.danceCategory.findFirst({
          where: { id: body.data.categoryId, eventId: studio.eventId },
        }),
        prisma.ageGroup.findFirst({
          where: { id: body.data.ageGroupId, eventId: studio.eventId },
        }),
        prisma.danceFormat.findFirst({
          where: { id: body.data.formatId, eventId: studio.eventId },
        }),
      ]);

      if (!category || !ageGroup || !format) {
        return res.status(400).json({ error: "Invalid event configuration" });
      }

      // Validate dancers belong to studio
      const dancers = await prisma.dancer.findMany({
        where: { id: { in: body.data.dancerIds }, studioId, deletedAt: null },
        select: { id: true },
      });

      if (dancers.length !== body.data.dancerIds.length) {
        return res.status(400).json({ error: "Invalid dancer list" });
      }

      const performance = await prisma.performance.create({
        data: {
          eventId: studio.eventId,
          title: body.data.title,
          durationSec: body.data.durationSec,
          orderOnStage: body.data.orderOnStage,
          categoryId: body.data.categoryId,
          ageGroupId: body.data.ageGroupId,
          formatId: body.data.formatId,
          participants: {
            createMany: {
              data: body.data.dancerIds.map((dancerId) => ({ dancerId })),
            },
          },
        },
        include: {
          participants: { include: { dancer: true } },
        },
      });

      return res.status(201).json(performance);
    },
  );

  // List performances for studio (Admin or approved representative)
  router.get(
    "/:studioId/performances",
    requirePermission("performance.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const params = ParamsWithStudioIdSchema.safeParse(req.params);
      if (!params.success) return res.status(400).json(params.error);

      const { studioId } = params.data;

      if (!auth.isAdmin) {
        const { approved, isRep } = await requireApprovedStudioAccess(
          auth.userId,
          studioId,
        );
        if (!approved || !isRep) return res.status(403).json({ error: "Access denied" });
      }

      const performances = await prisma.performance.findMany({
        where: {
          participants: {
            some: {
              dancer: { studioId },
            },
          },
        },
        include: {
          participants: { include: { dancer: true } },
          category: true,
          ageGroup: true,
          format: true,
        },
        orderBy: { orderOnStage: "asc" },
      });

      return res.json(performances);
    },
  );

  // Update performance (Admin or approved representative)
  router.patch(
    "/:studioId/performances/:performanceId",
    requirePermission("performance.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const params = ParamsWithStudioAndPerformanceIdSchema.safeParse(req.params);
      if (!params.success) return res.status(400).json(params.error);

      const { studioId, performanceId } = params.data;

      const body = UpdatePerformanceBodySchema.safeParse(req.body);
      if (!body.success) return res.status(400).json(body.error);

      const performance = await prisma.performance.findUnique({
        where: { id: performanceId },
        include: {
          participants: { include: { dancer: true } },
        },
      });

      if (!performance) return res.status(404).json({ error: "Performance not found" });

      if (!auth.isAdmin) {
        const { studio, approved, isRep, canEditDuringReview } =
          await requireApprovedStudioAccess(auth.userId, studioId);
        if (!studio || !approved || !isRep) return res.status(403).json({ error: "Access denied" });

        if (studio.eventId !== performance.eventId) return res.status(403).json({ error: "Access denied" });

        if (
          !isActionAllowed(
            studio.event.stage,
            "performance.manage",
            canEditDuringReview,
          )
        ) {
          return res.status(403).json({
            error: "Performance management not allowed in current event stage",
          });
        }
      }

      // If dancerIds provided, validate they belong to this studio
      if (body.data.dancerIds) {
        const dancers = await prisma.dancer.findMany({
          where: { id: { in: body.data.dancerIds }, studioId, deletedAt: null },
          select: { id: true },
        });

        if (dancers.length !== body.data.dancerIds.length) {
          return res.status(400).json({ error: "Invalid dancer list" });
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (body.data.dancerIds) {
          await tx.performanceParticipant.deleteMany({
            where: { performanceId },
          });

          await tx.performanceParticipant.createMany({
            data: body.data.dancerIds.map((dancerId) => ({
              performanceId,
              dancerId,
            })),
          });
        }

        const updateData: any = {};
        if (body.data.title) updateData.title = body.data.title;
        if (body.data.durationSec) updateData.durationSec = body.data.durationSec;
        if (body.data.orderOnStage) updateData.orderOnStage = body.data.orderOnStage;
        if (body.data.categoryId) updateData.categoryId = body.data.categoryId;
        if (body.data.ageGroupId) updateData.ageGroupId = body.data.ageGroupId;
        if (body.data.formatId) updateData.formatId = body.data.formatId;

        return tx.performance.update({
          where: { id: performanceId },
          data: updateData,
          include: { participants: { include: { dancer: true } } },
        });
      });

      return res.json(updated);
    },
  );

  // Delete performance (Admin or approved representative)
  router.delete(
    "/:studioId/performances/:performanceId",
    requirePermission("performance.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const params = ParamsWithStudioAndPerformanceIdSchema.safeParse(req.params);
      if (!params.success) return res.status(400).json(params.error);

      const { studioId, performanceId } = params.data;

      const performance = await prisma.performance.findUnique({
        where: { id: performanceId },
      });

      if (!performance) return res.status(404).json({ error: "Performance not found" });

      if (!auth.isAdmin) {
        const { studio, approved, isRep, canEditDuringReview } =
          await requireApprovedStudioAccess(auth.userId, studioId);
        if (!studio || !approved || !isRep) return res.status(403).json({ error: "Access denied" });

        if (studio.eventId !== performance.eventId) return res.status(403).json({ error: "Access denied" });

        if (
          !isActionAllowed(
            studio.event.stage,
            "performance.manage",
            canEditDuringReview,
          )
        ) {
          return res.status(403).json({
            error: "Performance management not allowed in current event stage",
          });
        }
      }

      await prisma.performanceParticipant.deleteMany({
        where: { performanceId },
      });

      await prisma.performance.delete({
        where: { id: performanceId },
      });

      return res.sendStatus(204);
    },
  );

  // Update representative info (name/email)
  router.patch(
    "/:studioId/representatives/:representativeId",
    requirePermission("studio.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const studioId = IdSchema.parse(req.params.studioId);
      const representativeId = IdSchema.parse(req.params.representativeId);
      const body = UpdateRepresentativeBodySchema.parse(req.body);

      const rep = await prisma.studioRepresentative.findUnique({
        where: { id: representativeId },
      });

      if (!rep || rep.studioId !== studioId) return res.status(404).json({ error: "Representative not found" });

      // Only the rep themselves or admin can edit
      if (!auth.isAdmin && rep.userId !== auth.userId) {
        return res.status(403).json({ error: "Access denied" });
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
