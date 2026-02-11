import { Router } from "express";
import { PrismaClient } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";
import { isActionAllowed } from "../utils/stageChecks";
import {
  CreateDancerBodySchema,
  UpdateDancerBodySchema,
  IdSchema,
} from "../../../../packages/schemas/src";

export function dancersRouter(prisma: PrismaClient) {
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

  // Create dancer (Admin or approved representative)
  router.post(
    "/studios/:studioId/dancers",
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
        if (!studio || !approved || !isRep) return res.sendStatus(403);

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

  // List dancers (Admin or approved representative)
  router.get(
    "/studios/:studioId/dancers",
    requirePermission("dancer.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const studioId = IdSchema.parse(req.params.studioId);

      if (!auth.isAdmin) {
        const { approved, isRep } = await requireApprovedStudioAccess(
          auth.userId,
          studioId,
        );
        if (!approved || !isRep) return res.sendStatus(403);
      }

      const dancers = await prisma.dancer.findMany({
        where: { studioId, deletedAt: null },
        orderBy: { lastName: "asc" },
      });

      return res.json(dancers);
    },
  );

  // Update dancer (Admin or approved representative)
  router.patch(
    "/dancers/:dancerId",
    requirePermission("dancer.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const dancerId = IdSchema.parse(req.params.dancerId);
      const body = UpdateDancerBodySchema.parse(req.body);
      const birthDate = body.birthDate
        ? body.birthDate instanceof Date
          ? body.birthDate
          : new Date(body.birthDate)
        : undefined;

      const dancer = await prisma.dancer.findFirst({
        where: { id: dancerId, deletedAt: null },
      });

      if (!dancer) return res.sendStatus(404);

      if (!auth.isAdmin) {
        const { studio, approved, isRep, canEditDuringReview } =
          await requireApprovedStudioAccess(auth.userId, dancer.studioId);
        if (!studio || !approved || !isRep) return res.sendStatus(403);

        if (!isActionAllowed(studio.event.stage, "dancer.manage", canEditDuringReview)) {
          return res.status(403).json({
            error: "Dancer management not allowed in current event stage",
          });
        }
      }

      const updated = await prisma.dancer.update({
        where: { id: dancerId },
        data: {
          ...(body.firstName !== undefined
            ? { firstName: body.firstName.trim() }
            : {}),
          ...(body.lastName !== undefined
            ? { lastName: body.lastName.trim() }
            : {}),
          ...(birthDate !== undefined ? { birthDate } : {}),
        },
      });

      return res.json(updated);
    },
  );

  // Soft delete dancer (Admin or approved representative)
  router.delete(
    "/dancers/:dancerId",
    requirePermission("dancer.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const dancerId = IdSchema.parse(req.params.dancerId);

      const dancer = await prisma.dancer.findFirst({
        where: { id: dancerId, deletedAt: null },
      });

      if (!dancer) return res.sendStatus(404);

      if (!auth.isAdmin) {
        const { studio, approved, isRep, canEditDuringReview } =
          await requireApprovedStudioAccess(auth.userId, dancer.studioId);
        if (!studio || !approved || !isRep) return res.sendStatus(403);

        if (!isActionAllowed(studio.event.stage, "dancer.manage", canEditDuringReview)) {
          return res.status(403).json({
            error: "Dancer management not allowed in current event stage",
          });
        }
      }

      const deleted = await prisma.dancer.update({
        where: { id: dancerId },
        data: { deletedAt: new Date() },
      });

      return res.json(deleted);
    },
  );

  return router;
}