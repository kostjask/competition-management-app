import { Router } from "express";
import { PrismaClient } from "../../generated/prisma";
import { requirePermission } from "../auth/requirePermission";
import { isActionAllowed } from "../utils/stageChecks";

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
      const { studioId } = req.params;
      const { firstName, lastName, birthDate } = req.body as {
        firstName?: string;
        lastName?: string;
        birthDate?: string;
      };

      if (!firstName?.trim() || !lastName?.trim() || !birthDate) {
        return res.status(400).json({ error: "Invalid dancer data" });
      }

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
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthDate: new Date(birthDate),
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
      const { studioId } = req.params;

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
      const { dancerId } = req.params;
      const { firstName, lastName, birthDate } = req.body as {
        firstName?: string;
        lastName?: string;
        birthDate?: string;
      };

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
          firstName: firstName?.trim() ?? undefined,
          lastName: lastName?.trim() ?? undefined,
          birthDate: birthDate ? new Date(birthDate) : undefined,
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
      const { dancerId } = req.params;

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