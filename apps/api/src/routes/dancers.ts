import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requirePermission } from "../auth/requirePermission";
import { isActionAllowed } from "../utils/stageChecks";
import {
  CreateDancerBodySchema,
  UpdateDancerBodySchema,
  IdSchema,
} from "@dance/schemas";

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

  // Update dancer (Admin or approved representative)
  router.patch(
    "/:dancerId",
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

      if (!dancer) return res.status(404).json({ error: "Dancer not found" });

      if (!auth.isAdmin) {
        const { studio, approved, isRep, canEditDuringReview } =
          await requireApprovedStudioAccess(auth.userId, dancer.studioId);
        if (!studio || !approved || !isRep) return res.status(403).json({ error: "Access denied" });

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
  //todo: implement bulk delete
  router.delete(
    "/:dancerId",
    requirePermission("dancer.manage"),
    async (req, res) => {
      const auth = req.auth!;
      const dancerId = IdSchema.parse(req.params.dancerId);

      const dancer = await prisma.dancer.findFirst({
        where: { id: dancerId, deletedAt: null },
      });

      if (!dancer) return res.status(404).json({ error: "Dancer not found" });

      if (!auth.isAdmin) {
        const { studio, approved, isRep, canEditDuringReview } =
          await requireApprovedStudioAccess(auth.userId, dancer.studioId);
        if (!studio || !approved || !isRep) return res.status(403).json({ error: "Access denied" });

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



    //todo: move dancers logic to dancers route
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

  return router;
}