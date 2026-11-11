import type { Prisma } from "@prisma/client";
import { ApplicationReviewSchema, AuditMetadataSchema } from "@dance/schemas";
import { config } from "../config/env";
import { queueEmail } from "./emailQueue";

export async function queueReviewNotice(tx: Prisma.TransactionClient, registration: { id: string; studioId: string; revision: number }, axis: "ORGANIZATION" | "EVENT") {
  // Contact fields are editable business details, never notification identity.
  const members = await tx.studioRepresentative.findMany({ where: { studioId: registration.studioId, active: true,
    user: { active: true, emailVerified: true } }, select: { user: { select: { id: true, email: true, preferredLocale: true } } } });
  const notice = await tx.reviewNotice.create({ data: { registrationId: registration.id, revision: registration.revision, axis,
    mode: !members.length ? "NO_RECIPIENT" : config.email.provider === "fake" ? "SIMULATED" : "QUEUED" } });
  for (const { user } of members) await queueEmail(tx, { kind: "reviewChanged", to: user.email, locale: user.preferredLocale ?? "et" }, notice.id);
}

export async function readApplicationReview(tx: Prisma.TransactionClient, eventId: string, studioId: string, registrationId: string) {
  const history = await tx.auditLog.findMany({ where: { eventId, studioId, action: { in: ["STUDIO_APPROVAL_CHANGED", "REGISTRATION_APPROVAL_CHANGED", "REGISTRATION_CORRECTED", "REGISTRATION_CANCELLED", "REGISTRATION_REAPPLIED", "REGISTRATION_CREATED"] } },
    select: { action: true, metadata: true, createdAt: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const notices = await tx.reviewNotice.findMany({ where: { registrationId }, select: { id: true, revision: true, axis: true, mode: true, createdAt: true,
    deliveries: { select: { state: true, attempts: true, expiresAt: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  return ApplicationReviewSchema.parse({ history: history.map(row => { const metadata = AuditMetadataSchema.parse(row.metadata); return {
    action: row.action, createdAt: row.createdAt.toISOString(), revision: metadata.revision ?? null,
    fromStatus: metadata.fromStatus ?? null, toStatus: metadata.toStatus ?? null, reason: metadata.reasonCode ?? null,
  }; }), notifications: notices.map(row => ({ id: row.id, revision: row.revision, axis: row.axis, createdAt: row.createdAt.toISOString(),
    state: row.mode !== "QUEUED" ? row.mode : row.deliveries.some(d => d.state === "CANCELLED" || (d.state === "PENDING" && d.expiresAt <= new Date())) ? "EXPIRED"
      : row.deliveries.length && row.deliveries.every(d => d.state === "ACCEPTED") ? "ACCEPTED"
      : row.deliveries.some(d => d.attempts > 0) ? "RETRYING" : "QUEUED",
  })) });
}
