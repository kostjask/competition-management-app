import { Prisma, type PrismaClient, type EventStage } from "@prisma/client";
import { ConflictError, ForbiddenError, InternalServerError } from "../errors";
import { eventStageTargets } from "@dance/schemas";
import { appendAudit } from "./audit";

export function assertApplicationWindow(event: { stage: EventStage; registrationDeadline: Date | null }, now = new Date()) {
  if (!["PRE_REGISTRATION", "REGISTRATION_OPEN"].includes(event.stage)
    || (event.registrationDeadline != null && now >= event.registrationDeadline)) {
    throw new ForbiddenError("Registration window is closed", "stageLocked");
  }
}

export function assertReviewWindow(stage: EventStage) {
  if (!["PRE_REGISTRATION", "REGISTRATION_OPEN", "DATA_REVIEW"].includes(stage)) {
    throw new ForbiddenError("Review is closed", "stageLocked");
  }
}

export function assertStageTransition(from: EventStage, to: EventStage, expected?: EventStage) {
  if (expected !== from) throw new ConflictError("Reload event before changing stage", undefined, "concurrentChange");
  if (from === to) return;
  if (eventStageTargets(from).includes(to)) return;
  throw new ForbiddenError("Unsupported event transition", "stageLocked");
}

export async function registrationTransaction<T>(prisma: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2025"].includes(error.code)) {
      throw new ConflictError("Reload before retrying", undefined, "concurrentChange");
    }
    throw error;
  }
}

// The role is shared by all qualifying studios in this event. Never revoke
// another studio's access, and retain removed assignment rows for history.
export async function reconcileRepresentativeAccess(tx: Prisma.TransactionClient, eventId: string, userIds: string[], actorId: string) {
  if (userIds.length === 0) return;
  const role = await tx.role.findUnique({ where: { key: "representative" }, select: { id: true } });
  if (!role) throw new InternalServerError("Representative role is not configured");
  for (const userId of new Set(userIds)) {
    const eligible = await tx.studioRepresentative.findFirst({ where: {
      userId, active: true, studio: { eventId, deletedAt: null, approvalStatus: "APPROVED",
        registrations: { some: { eventId, status: "APPROVED" } } },
    }, select: { id: true } });
    if (eligible) {
      const assignment = await tx.userRole.upsert({
        where: { userId_roleId_eventId: { userId, roleId: role.id, eventId } },
        create: { userId, roleId: role.id, eventId }, update: { removedAt: null },
      });
      await appendAudit(tx, { action: "ACCESS_RECONCILED", actor: { kind: "USER", userId: actorId },
        targetType: "USER_ROLE", targetId: assignment.id, eventId, metadata: { roleKey: "representative" } });
    } else {
      const assignments = await tx.userRole.findMany({ where: { userId, roleId: role.id, eventId, removedAt: null }, select: { id: true } });
      for (const assignment of assignments) {
        await tx.userRole.update({ where: { id: assignment.id }, data: { removedAt: new Date() } });
        await appendAudit(tx, { action: "ACCESS_REMOVED", actor: { kind: "USER", userId: actorId },
          targetType: "USER_ROLE", targetId: assignment.id, eventId, metadata: { roleKey: "representative" } });
      }
    }
  }
}
