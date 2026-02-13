import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";
import { isActionAllowed } from "../utils/stageChecks";
import {
  ParamsWithStudioIdSchema,
  ParamsWithStudioAndPerformanceIdSchema,
  CreatePerformanceBodySchema,
  UpdatePerformanceBodySchema,
} from "@dance/schemas";

export const performancesRouter = (prisma: PrismaClient) => {
  const router = Router();

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

  // Create performance (Admin or approved representative with stage check)
  router.post(
    "/studios/:studioId/performances",
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
        if (!studio || !approved || !isRep) return res.sendStatus(403);

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

      if (!studio) return res.sendStatus(404);

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
    "/studios/:studioId/performances",
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
        if (!approved || !isRep) return res.sendStatus(403);
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

  // Update performance (Admin or approved representative with stage check)
  router.patch(
    "/studios/:studioId/performances/:performanceId",
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

      if (!performance) return res.sendStatus(404);

      if (!auth.isAdmin) {
        const { studio, approved, isRep, canEditDuringReview } =
          await requireApprovedStudioAccess(auth.userId, studioId);
        if (!studio || !approved || !isRep) return res.sendStatus(403);

        if (studio.eventId !== performance.eventId) return res.sendStatus(403);

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

  // Delete performance (Admin or approved representative with stage check)
  router.delete(
    "/studios/:studioId/performances/:performanceId",
    requirePermission("performance.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const params = ParamsWithStudioAndPerformanceIdSchema.safeParse(req.params);
      if (!params.success) return res.status(400).json(params.error);

      const { studioId, performanceId } = params.data;

      const performance = await prisma.performance.findUnique({
        where: { id: performanceId },
      });

      if (!performance) return res.sendStatus(404);

      if (!auth.isAdmin) {
        const { studio, approved, isRep, canEditDuringReview } =
          await requireApprovedStudioAccess(auth.userId, studioId);
        if (!studio || !approved || !isRep) return res.sendStatus(403);

        if (studio.eventId !== performance.eventId) return res.sendStatus(403);

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

  return router;
};