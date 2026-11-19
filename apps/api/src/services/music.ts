import { createHash } from "node:crypto";
import { Prisma, type MusicTrack as Track, type MusicVersion } from "@prisma/client";
import { MusicTrackSchema, MusicPolicySchema, MusicReceiptSchema, type MusicPolicy } from "@dance/schemas";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../errors";
import { appendAudit } from "./audit";

export type MusicActor = { id: string; organizer: boolean; sessionVersion: number };
export type MusicOwner = { eventId: string; studioId: string };
export async function musicAuthority(db: Prisma.TransactionClient, actor: MusicActor) {
  // Multipart parsing can outlive an offboarding/logout. Recheck eligibility,
  // session and global-admin provenance in the transaction that commits effects.
  if (!await db.user.findFirst({ where: { id: actor.id, sessionVersion: actor.sessionVersion, active: true, emailVerified: true }, select: { id: true } })) throw new UnauthorizedError();
  if (actor.organizer && !await db.userRole.findFirst({ where: { userId: actor.id, eventId: null, removedAt: null, role: { key: "admin" } }, select: { id: true } })) throw new ForbiddenError();
}
export async function musicAccess(db: Prisma.TransactionClient, actor: MusicActor, owner: MusicOwner) {
  await musicAuthority(db, actor);
  const row = await db.studioEventRegistration.findUnique({ where: { studioId_eventId: owner }, include: { studio: { include: { representatives: { where: { userId: actor.id, active: true } } } }, event: true } });
  if (!row || row.studio.deletedAt) throw new NotFoundError("Application");
  if (!actor.organizer && !row.studio.representatives.length) throw new ForbiddenError();
  if (!["PENDING", "APPROVED"].includes(row.status) || !["PENDING", "APPROVED"].includes(row.studio.approvalStatus) || row.event.stage === "CANCELLED") throw new ForbiddenError("Application is unavailable", "stageLocked");
  return row;
}
export async function musicPolicy(db: Prisma.TransactionClient, eventId: string) {
  const row = await db.musicConfiguration.findUnique({ where: { eventId } });
  return row ? { revision: row.revision, policy: MusicPolicySchema.parse(row.policy) } : null;
}
export async function musicTrack(db: Prisma.TransactionClient, owner: MusicOwner, id: string) {
  const row = await db.musicTrack.findFirst({ where: { id, ...owner }, include: { currentVersion: true, performance: true } });
  if (!row || row.performance?.deletedAt) throw new NotFoundError("Music track"); return row;
}
export async function musicPerformance(db: Prisma.TransactionClient, owner: MusicOwner, registrationId: string, id: string) {
  if (!await db.performance.findFirst({ where: { id, ...owner, registrationId, deletedAt: null } })) throw new NotFoundError("Performance");
}
export function musicDto(row: Track & { currentVersion: MusicVersion | null }) {
  const version = row.currentVersion;
  return MusicTrackSchema.parse({ id: row.id, registrationId: row.registrationId, studioId: row.studioId, eventId: row.eventId, performanceId: row.performanceId,
    revision: row.revision, state: row.state, correctionUntil: row.correctionUntil?.toISOString() ?? null,
    currentVersion: version ? { id: version.id, displayName: version.displayName, detectedMime: version.detectedMime, byteLength: version.byteLength, durationMs: version.durationMs, createdAt: version.createdAt.toISOString() } : null });
}
export function musicWindow(stage: string, policy: MusicPolicy | undefined, correctionUntil: Date | null = null) {
  if (!policy) throw new ConflictError("Configure music first", undefined, "invalidConfiguration");
  const now = Date.now();
  if (["FINALIZED", "ENDED", "CANCELLED"].includes(stage) || (Date.parse(policy.deadline) <= now && !(correctionUntil && correctionUntil.getTime() > now && correctionUntil.getTime() <= Date.parse(policy.exceptionUntil)))) throw new ForbiddenError("Music deadline passed", "stageLocked");
}
export function musicDigest(actor: MusicActor, owner: MusicOwner, input: unknown) {
  return createHash("sha256").update(JSON.stringify([actor.id, owner, input])).digest("hex");
}
export async function musicReplay(db: Prisma.TransactionClient, operationId: string, digest: string, trackId: string) {
  const row = await db.musicOperation.findUnique({ where: { operationId } });
  if (!row) return null;
  if (row.digest !== digest || row.trackId !== trackId) throw new ConflictError("Operation body changed", undefined, "concurrentChange");
  return MusicReceiptSchema.parse(row.response);
}
export async function musicReceipt(db: Prisma.TransactionClient, actor: MusicActor, owner: MusicOwner, row: Track & { currentVersion: MusicVersion | null }, operationId: string, digest: string,
  action: "CREATE" | "ATTACH" | "REPLACE" | "CONFIRM" | "ACCEPT" | "REOPEN", reason: string | null = null) {
  const response = MusicReceiptSchema.parse({ operationId, track: musicDto(row) });
  await db.musicOperation.create({ data: { operationId, trackId: row.id, actorId: actor.id, revision: row.revision, action, reason, digest, response } });
  const actions = { CREATE: "MUSIC_CREATED", ATTACH: "MUSIC_ATTACHED", REPLACE: "MUSIC_REPLACED", CONFIRM: "MUSIC_CONFIRMED", ACCEPT: "MUSIC_ACCEPTED", REOPEN: "MUSIC_REOPENED" } as const;
  await appendAudit(db, { action: actions[action], actor: { kind: "USER", userId: actor.id }, targetType: "MUSIC_TRACK", targetId: row.id, ...owner, metadata: { operationId, revision: row.revision } });
  return response;
}
