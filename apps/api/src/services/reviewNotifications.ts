import type { Prisma } from "@prisma/client";
import { ApplicationReviewSchema, AuditMetadataSchema } from "@dance/schemas";
import { config } from "../config/env";
import { queueEmail } from "./emailQueue";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";

function expiredDelivery(delivery: { state: string; expiresAt: Date }, now: Date) {
  return delivery.state === "CANCELLED" || (delivery.state === "PENDING" && delivery.expiresAt <= now);
}

export async function queueReviewNotice(tx: Prisma.TransactionClient, registration: { id: string; studioId: string; revision: number }, axis: "ORGANIZATION" | "EVENT") {
  // Contact fields are editable business details, never notification identity.
  const members = await tx.studioRepresentative.findMany({ where: { studioId: registration.studioId, active: true,
    user: { active: true, emailVerified: true } }, select: { user: { select: { id: true, email: true, preferredLocale: true } } } });
  const notice = await tx.reviewNotice.create({ data: { registrationId: registration.id, revision: registration.revision, axis,
    mode: !members.length ? "NO_RECIPIENT" : config.email.provider === "fake" ? "SIMULATED" : "QUEUED" } });
  for (const { user } of members) await queueEmail(tx, { kind: "reviewChanged", to: user.email, locale: user.preferredLocale ?? "et" }, notice.id, user.id);
}

export async function retryReviewNotice(tx: Prisma.TransactionClient, eventId: string, studioId: string, noticeId: string) {
  const notice = await tx.reviewNotice.findFirst({ where: { id: noticeId,
    registration: { eventId, studioId, studio: { eventId, deletedAt: null } } },
    include: { deliveries: { where: { supersededAt: null } } } });
  if (!notice) throw new NotFoundError("Notification");
  if (notice.mode !== "QUEUED") return;
  const now = new Date();
  const expired = notice.deliveries.filter(row => expiredDelivery(row, now));
  if (expired.length && config.email.provider !== "resend") throw new ConflictError("Email delivery is unavailable", undefined, "concurrentChange");
  for (const delivery of expired) {
    // Historical deliveries without a retained account binding cannot be retargeted.
    if (!delivery.reviewRecipientId) throw new ConflictError("Notification has no recipient binding", undefined, "concurrentChange");
    const member = await tx.studioRepresentative.findFirst({ where: { studioId, userId: delivery.reviewRecipientId,
      active: true, user: { active: true, emailVerified: true } },
      select: { user: { select: { id: true, email: true, preferredLocale: true } } } });
    if (!member) throw new ForbiddenError("Active verified owner required", "ownershipRequired");
    await tx.emailDelivery.update({ where: { id: delivery.id }, data: { state: "CANCELLED", ciphertext: null, supersededAt: now } });
    await queueEmail(tx, { kind: "reviewChanged", to: member.user.email, locale: member.user.preferredLocale ?? "et" }, notice.id, member.user.id);
  }
}

export async function readApplicationReview(tx: Prisma.TransactionClient, eventId: string, studioId: string, registrationId: string) {
  const history = await tx.auditLog.findMany({ where: { eventId, studioId, action: { in: ["STUDIO_APPROVAL_CHANGED", "REGISTRATION_APPROVAL_CHANGED", "REGISTRATION_CORRECTED", "REGISTRATION_CANCELLED", "REGISTRATION_REAPPLIED", "REGISTRATION_CREATED"] } },
    select: { action: true, metadata: true, createdAt: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const notices = await tx.reviewNotice.findMany({ where: { registrationId }, select: { id: true, revision: true, axis: true, mode: true, createdAt: true,
    deliveries: { where: { supersededAt: null }, select: { state: true, attempts: true, expiresAt: true, reviewRecipientId: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const now = new Date();
  return ApplicationReviewSchema.parse({ history: history.map(row => { const metadata = AuditMetadataSchema.parse(row.metadata); return {
    action: row.action, createdAt: row.createdAt.toISOString(), revision: metadata.revision ?? null,
    fromStatus: metadata.fromStatus ?? null, toStatus: metadata.toStatus ?? null, reason: metadata.reasonCode ?? null,
  }; }), notifications: notices.map(row => ({ id: row.id, revision: row.revision, axis: row.axis, createdAt: row.createdAt.toISOString(),
    retryable: config.email.provider === "resend" && row.mode === "QUEUED" && row.deliveries.some(d => expiredDelivery(d, now))
      && row.deliveries.filter(d => expiredDelivery(d, now)).every(d => d.reviewRecipientId !== null),
    state: row.mode !== "QUEUED" ? row.mode : row.deliveries.some(d => expiredDelivery(d, now)) ? "EXPIRED"
      : row.deliveries.length && row.deliveries.every(d => d.state === "ACCEPTED") ? "ACCEPTED"
      : row.deliveries.some(d => d.attempts > 0) ? "RETRYING" : "QUEUED",
  })) });
}
