import type { Prisma } from "@prisma/client";
import type { AuthContext } from "../middleware/auth";
import { resolveRoleAccess } from "../middleware/auth";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../errors";
import { isActionAllowed } from "../utils/stageChecks";

export type ImageResource = "events" | "users" | "studios" | "dancers";
export type ImageTarget = { resource: ImageResource; id: string };

// Also used inside the replacement transaction: a middleware snapshot must not
// keep permissions after account/access/membership changes during file processing.
export async function imageAccess(db: Prisma.TransactionClient, session: AuthContext, target: ImageTarget, write: boolean) {
  const user = await db.user.findFirst({ where: { id: session.userId, sessionVersion: session.sessionVersion,
    active: true, emailVerified: true }, select: { id: true } });
  if (!user) throw new UnauthorizedError();
  const roles = await db.userRole.findMany({ where: { userId: user.id, removedAt: null },
    include: { role: { include: { permissions: { include: { permission: true } } } } } });
  const auth = resolveRoleAccess(roles);
  const permits = (permission: string, eventId: string) => auth.permissionsByEvent.get(eventId)?.has(permission) || auth.permissionsByEvent.get(null)?.has(permission);

  if (target.resource === "events") {
    const record = await db.event.findUnique({ where: { id: target.id }, select: { imagePath: true } });
    if (!record) throw new NotFoundError("Event");
    if (write && !auth.isAdmin) throw new ForbiddenError();
    return { path: record.imagePath, eventId: target.id, studioId: null, targetType: "EVENT" as const };
  }
  if (target.resource === "users") {
    const record = await db.user.findUnique({ where: { id: target.id }, select: { active: true, photoPath: true } });
    if (!record?.active) throw new NotFoundError("User");
    if (!auth.isAdmin && target.id !== user.id) throw new ForbiddenError("Account photo belongs to another user", "ownershipRequired");
    return { path: record.photoPath, eventId: null, studioId: null, targetType: "USER" as const };
  }
  let dancer: { studioId: string; photoPath: string | null } | null = null;
  if (target.resource === "dancers") {
    dancer = await db.dancer.findFirst({ where: { id: target.id, deletedAt: null }, select: { studioId: true, photoPath: true } });
    if (!dancer) throw new NotFoundError("Dancer");
  }
  const studioId = dancer?.studioId ?? target.id;
  const studio = await db.studio.findFirst({ where: { id: studioId, deletedAt: null }, select: {
    eventId: true, logoPath: true, approvalStatus: true, event: { select: { stage: true } },
    representatives: { where: { userId: user.id, active: true }, select: { id: true } },
    registrations: { select: { eventId: true, status: true, canEditDuringReview: true } },
  } });
  if (!studio?.event) throw new NotFoundError("Studio");
  if (!auth.isAdmin) {
    if (studio.representatives.length === 0) throw new ForbiddenError("Active studio membership required", "ownershipRequired");
    const registration = studio.registrations.find(row => row.eventId === studio.eventId);
    if (dancer && (!permits("dancer.manage", studio.eventId) || studio.approvalStatus !== "APPROVED" || registration?.status !== "APPROVED")) {
      throw new ForbiddenError("Approved roster access required", "ownershipRequired");
    }
    if (write) {
      if (!dancer && !permits("studio.manage", studio.eventId)) throw new ForbiddenError();
      if (!isActionAllowed(studio.event.stage, dancer ? "dancer.manage" : "studio.edit", dancer ? registration?.canEditDuringReview : false)) {
        throw new ForbiddenError("Image changes not allowed in this event stage", "stageLocked");
      }
    }
  }
  return { path: dancer ? dancer.photoPath : studio.logoPath, eventId: studio.eventId, studioId,
    targetType: dancer ? "DANCER" as const : "STUDIO" as const };
}
