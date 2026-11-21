import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { EntryManifestSchema, ScheduleWorkspaceSchema, SchedulePreviewSchema, ScheduleReceiptSchema, type ScheduleCommand, type ScheduleQueues, type SchedulePreview, type ScheduleWorkspace } from "@dance/schemas";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../errors";
import { appendAudit } from "./audit";
import { currentEntryManifest, entryIssues, entrySettings } from "./entryWorkflow";
import { freezeScoring, scoringReady, scoringComplete } from "./scoring";

export type ScheduleActor = { id: string; sessionVersion: number };
const conflict = () => new ConflictError("Compare the current schedule before retrying", undefined, "concurrentChange");
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

// Current authority is read in the committing transaction, also before replay.
export async function scheduleAuthority(db: Prisma.TransactionClient, actor: ScheduleActor, eventId: string) {
  if (!await db.user.findFirst({ where: { id: actor.id, sessionVersion: actor.sessionVersion, active: true, emailVerified: true }, select: { id: true } })) throw new UnauthorizedError();
  const roles = await db.userRole.findMany({ where: { userId: actor.id, removedAt: null }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
  const admin = roles.some(row => row.eventId === null && row.role.key === "admin");
  const moderator = roles.some(row => row.eventId === eventId && row.role.key !== "admin" && row.role.permissions.some(p => p.permission.key === "stage.manage"));
  if (!admin && !moderator) throw new ForbiddenError();
  return admin;
}

async function sources(db: Prisma.TransactionClient, eventId: string) {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError("Event");
  const [schedule, stages, sessions, performances, settings, roles, operations] = await Promise.all([
    db.eventSchedule.findUnique({ where: { eventId } }),
    db.competitionStage.findMany({ where: { eventId }, orderBy: { id: "asc" } }),
    db.competitionSession.findMany({ where: { eventId }, orderBy: [{ startsAt: "asc" }, { id: "asc" }], include: { slots: { orderBy: [{ position: "asc" }, { id: "asc" }] } } }),
    db.performance.findMany({ where: { eventId }, orderBy: [{ orderOnStage: "asc" }, { title: "asc" }, { id: "asc" }], include: {
      studio: true, registration: { include: { entryCheckpoints: { include: { receipts: { orderBy: { revision: "desc" }, take: 1 } } } } }, participants: { include: { dancer: true }, orderBy: { dancerId: "asc" } },
    } }),
    entrySettings(db, eventId),
    db.userRole.findMany({ where: { eventId, removedAt: null, user: { active: true, emailVerified: true }, role: { key: { not: "admin" }, permissions: { some: { permission: { key: "stage.manage" } } } } }, include: { user: { select: { id: true, name: true } } } }),
    db.scheduleOperation.findMany({ where: { eventId }, select: { operationId: true, revision: true, action: true, createdAt: true }, orderBy: { revision: "desc" }, take: 20 }),
  ]);
  const manifests = new Map<string, Awaited<ReturnType<typeof currentEntryManifest>>>();
  if (settings) for (const p of performances) if (!manifests.has(p.studioId)) manifests.set(p.studioId, await currentEntryManifest(db, eventId, p.studioId, settings.settings));
  const entries = performances.map(p => {
    const checkpoint = p.registration.entryCheckpoints.find(c => c.kind === "FINAL");
    const manifest = manifests.get(p.studioId);
    const submitted = EntryManifestSchema.safeParse(checkpoint?.receipts[0]?.manifest);
    const eligible = !p.deletedAt && !p.studio.deletedAt && p.studio.approvalStatus === "APPROVED" && p.registration.status === "APPROVED" &&
      !!checkpoint && ["REVIEW_PENDING", "ACCEPTED"].includes(checkpoint.status) && submitted.success && submitted.data.entries.some(e => e.id === p.id && e.revision === p.revision && JSON.stringify(e.snapshot) === JSON.stringify(manifest?.entries.find(current => current.id === p.id)?.snapshot)) && !!manifest && !entryIssues(manifest, "FINAL").length;
    return { id: p.id, title: p.title, studioName: p.studio.name, revision: p.revision, durationSec: p.durationSec, legacyOrder: p.orderOnStage, eligible,
      dancers: p.participants.filter(row => !row.dancer.deletedAt).map(row => row.dancerId) };
  });
  // Include private source values only in the digest, never in the DTO/receipt.
  const fingerprint = hash([event, schedule, stages, sessions, performances, settings, [...manifests]]);
  return { event, revision: schedule?.revision ?? 0, stages, sessions, entries, roles, operations, fingerprint };
}
type Sources = Awaited<ReturnType<typeof sources>>;

function workspace(data: Sources, actor: ScheduleActor, organizer: boolean): ScheduleWorkspace {
  const sessions = data.sessions.filter(row => organizer || row.moderatorId === actor.id);
  const ids = new Set(sessions.flatMap(row => row.slots.map(slot => slot.performanceId)));
  return ScheduleWorkspaceSchema.parse({ eventId: data.event.id, eventName: data.event.name, eventStage: data.event.stage, timeZone: data.event.timeZone, revision: data.revision, organizer,
    stages: data.stages.filter(row => organizer || sessions.some(session => session.stageId === row.id)).map(row => ({ id: row.id, name: row.name })),
    sessions: sessions.map(row => ({ id: row.id, stageId: row.stageId, name: row.name, startsAt: row.startsAt.toISOString(), bufferSec: row.bufferSec, restSec: row.restSec, moderatorId: row.moderatorId, state: row.state,
      slots: row.slots.map(slot => ({ id: slot.id, performanceId: slot.performanceId, position: slot.position, state: slot.state, reason: slot.reason })) })),
    performances: data.entries.filter(row => organizer || ids.has(row.id)).map(({ dancers: _dancers, ...entry }) => entry),
    moderators: organizer ? [...new Map(data.roles.map(row => [row.user.id, row.user])).values()] : [],
    receipts: organizer ? data.operations.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })) : [],
  });
}

export const savedQueues = (value: Pick<ScheduleWorkspace, "sessions">): ScheduleQueues => value.sessions.map(session => ({ sessionId: session.id,
  performanceIds: session.slots.filter(slot => slot.state !== "REMOVED").sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(slot => slot.performanceId) }));

/** Pure interval validation: no personal information leaves the service. */
export function scheduleConflicts(data: { event: { startsAt: Date; endsAt: Date }; sessions: Pick<Sources["sessions"][number], "id" | "stageId" | "startsAt" | "bufferSec" | "restSec" | "state" | "slots">[]; entries: Sources["entries"] }, queues: ScheduleQueues) {
  const conflicts: SchedulePreview["conflicts"] = [];
  const times: SchedulePreview["times"] = [];
  const seen = new Set<string>();
  if (queues.length !== data.sessions.length || new Set(queues.map(row => row.sessionId)).size !== queues.length || queues.some(row => !data.sessions.some(s => s.id === row.sessionId))) throw conflict();
  for (const session of data.sessions) {
    const ids = queues.find(row => row.sessionId === session.id)?.performanceIds ?? [];
    const prior = session.slots.filter(s => s.state !== "REMOVED").sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const prefix = prior.filter(s => s.state !== "WAITING");
    if ((session.state !== "PAUSED" && JSON.stringify(ids) !== JSON.stringify(prior.map(s => s.performanceId))) || prefix.some((slot, i) => ids[i] !== slot.performanceId)) conflicts.push({ kind: "LOCKED", performanceIds: prefix.map(s => s.performanceId), sessionIds: [session.id] });
    let start = session.startsAt.getTime();
    for (const id of ids) {
      const entry = data.entries.find(row => row.id === id);
      if (!entry?.eligible || seen.has(id)) conflicts.push({ kind: "ENTRY", performanceIds: [id], sessionIds: [session.id] });
      seen.add(id);
      const end = start + (entry?.durationSec ?? 0) * 1000;
      times.push({ performanceId: id, sessionId: session.id, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() });
      if (start < data.event.startsAt.getTime() || end > data.event.endsAt.getTime()) conflicts.push({ kind: "WINDOW", performanceIds: [id], sessionIds: [session.id] });
      start = end + session.bufferSec * 1000;
    }
  }
  for (let i = 0; i < times.length; i++) for (let j = i + 1; j < times.length; j++) {
    const a = times[i]!; const b = times[j]!;
    const first = data.sessions.find(s => s.id === a.sessionId)!; const second = data.sessions.find(s => s.id === b.sessionId)!;
    const gap = Math.max(first.restSec, second.restSec) * 1000;
    const overlaps = Date.parse(a.startsAt) < Date.parse(b.endsAt) + gap && Date.parse(b.startsAt) < Date.parse(a.endsAt) + gap;
    const ae = data.entries.find(e => e.id === a.performanceId); const be = data.entries.find(e => e.id === b.performanceId);
    if (overlaps && ae?.dancers.some(id => be?.dancers.includes(id))) conflicts.push({ kind: "DANCER", performanceIds: [a.performanceId, b.performanceId], sessionIds: [a.sessionId, b.sessionId] });
  }
  for (let i = 0; i < data.sessions.length; i++) for (let j = i + 1; j < data.sessions.length; j++) {
    const a = data.sessions[i]!; const b = data.sessions[j]!;
    if (a.stageId !== b.stageId) continue;
    const at = times.filter(t => t.sessionId === a.id); const bt = times.filter(t => t.sessionId === b.id);
    const ae = at.at(-1); const be = bt.at(-1);
    if (ae && be && a.startsAt.getTime() < Date.parse(be.endsAt) + b.bufferSec * 1000 && b.startsAt.getTime() < Date.parse(ae.endsAt) + a.bufferSec * 1000) conflicts.push({ kind: "STAGE", performanceIds: [], sessionIds: [a.id, b.id] });
  }
  return { conflicts, times };
}

export async function readSchedule(db: Prisma.TransactionClient, actor: ScheduleActor, eventId: string) {
  const admin = await scheduleAuthority(db, actor, eventId);
  return workspace(await sources(db, eventId), actor, admin);
}
export async function previewSchedule(db: Prisma.TransactionClient, actor: ScheduleActor, eventId: string, revision: number, queues: ScheduleQueues) {
  if (!await scheduleAuthority(db, actor, eventId)) throw new ForbiddenError();
  const data = await sources(db, eventId);
  if (revision !== data.revision) throw conflict();
  return SchedulePreviewSchema.parse({ revision, queues, previewToken: hash([data.fingerprint, queues]), ...scheduleConflicts(data, queues) });
}

export async function scheduleTransition(db: Prisma.TransactionClient, eventId: string, from: string, to: string) {
  if (from === to) return;
  if (["LIVE", "FINALIZED"].includes(to)) await scoringReady(db, eventId, to === "FINALIZED");
  if (["SCHEDULED", "LIVE"].includes(to) || from === "SCHEDULED" && to === "DATA_REVIEW") {
    const data = await sources(db, eventId);
    if (!data.sessions.length || data.sessions.some(s => s.state !== "PAUSED" || s.slots.some(slot => !["WAITING", "REMOVED"].includes(slot.state)))) throw conflict();
    const queues = data.sessions.map(s => ({ sessionId: s.id, performanceIds: s.slots.filter(slot => slot.state !== "REMOVED").map(slot => slot.performanceId) }));
    if (["SCHEDULED", "LIVE"].includes(to) && (!queues.some(q => q.performanceIds.length) || scheduleConflicts(data, queues).conflicts.length || data.entries.some(e => e.eligible && !queues.some(q => q.performanceIds.includes(e.id))))) throw new ConflictError("Complete and validate the schedule first", undefined, "invalidConfiguration");
  }
}

export async function commandSchedule(db: Prisma.TransactionClient, actor: ScheduleActor, eventId: string, command: ScheduleCommand) {
  const admin = await scheduleAuthority(db, actor, eventId);
  const isLive = "sessionId" in command;
  if (!admin && !isLive) throw new ForbiddenError();
  if (isLive) {
    const session = await db.competitionSession.findFirst({ where: { id: command.sessionId, eventId } });
    if (!session) throw new NotFoundError("Session");
    if (!admin && (session.moderatorId !== actor.id || ["REQUEUE", "REOPEN", "ADVANCE_OVERRIDE"].includes(command.action))) throw new ForbiddenError();
  }
  const digest = hash([actor.id, eventId, command]);
  const replay = await db.scheduleOperation.findUnique({ where: { operationId: command.operationId } });
  if (replay) {
    if (replay.digest !== digest || replay.eventId !== eventId || replay.actorId !== actor.id) throw conflict();
    const receipt = ScheduleReceiptSchema.parse(replay.response);
    if (receipt.workspace.organizer && !admin) throw new ForbiddenError();
    return receipt;
  }
  const data = await sources(db, eventId);
  if (data.revision !== command.expectedRevision) throw conflict();
  if (!["DATA_REVIEW", "SCHEDULED", "LIVE"].includes(data.event.stage)) throw new ForbiddenError("Scheduling is closed", "stageLocked");
  if (!isLive && data.event.stage === "SCHEDULED") throw new ForbiddenError("Return to data review before editing", "stageLocked");
  if (command.action === "CREATE_STAGE") {
    if (data.stages.length >= 100) throw conflict();
    await db.competitionStage.create({ data: { id: command.id, eventId, name: command.name } });
  } else if (command.action === "CREATE_SESSION" || command.action === "UPDATE_SESSION") {
    if (!data.stages.some(s => s.id === command.stageId)) throw new NotFoundError("Stage");
    if (command.moderatorId && !data.roles.some(row => row.userId === command.moderatorId)) throw new ForbiddenError();
    if (Date.parse(command.startsAt) < data.event.startsAt.getTime() || Date.parse(command.startsAt) >= data.event.endsAt.getTime()) throw new ConflictError("Session is outside the event", undefined, "invalidConfiguration");
    const fields = { stageId: command.stageId, name: command.name, startsAt: new Date(command.startsAt), bufferSec: command.bufferSec, restSec: command.restSec, moderatorId: command.moderatorId };
    if (command.action === "CREATE_SESSION") {
      if (data.sessions.length >= 100) throw conflict();
      await db.competitionSession.create({ data: { id: command.id, eventId, ...fields } });
    } else {
      const session = data.sessions.find(s => s.id === command.id);
      if (!session) throw new NotFoundError("Session");
      if (session.state !== "PAUSED" || session.slots.some(slot => !["WAITING", "REMOVED"].includes(slot.state)) && (session.stageId !== command.stageId || session.startsAt.getTime() !== Date.parse(command.startsAt) || session.bufferSec !== command.bufferSec || session.restSec !== command.restSec)) throw new ForbiddenError("Started session timing is locked", "stageLocked");
      await db.competitionSession.update({ where: { id: session.id }, data: fields });
      const changed = await sources(db, eventId);
      if (scheduleConflicts(changed, savedQueues(workspace(changed, actor, true))).conflicts.length) throw new ConflictError("Session creates scheduling conflicts", undefined, "invalidConfiguration");
    }
  } else if (command.action === "SAVE") {
    const preview = await previewSchedule(db, actor, eventId, command.expectedRevision, command.queues);
    if (preview.previewToken !== command.previewToken) throw conflict();
    if (preview.conflicts.length) throw new ConflictError("Resolve preview conflicts before saving", undefined, "invalidConfiguration");
    // Release every waiting position before assigning replacements: swaps/moves are atomic.
    await db.scheduleSlot.updateMany({ where: { eventId, state: "WAITING" }, data: { state: "REMOVED", position: null } });
    for (const queue of command.queues) for (const [index, performanceId] of queue.performanceIds.entries()) {
      const prior = data.sessions.flatMap(s => s.slots).find(slot => slot.performanceId === performanceId);
      if (prior && !["WAITING", "REMOVED"].includes(prior.state)) continue;
      await db.scheduleSlot.upsert({ where: { eventId_performanceId: { eventId, performanceId } },
        create: { eventId, sessionId: queue.sessionId, performanceId, position: index + 1 },
        update: { sessionId: queue.sessionId, position: index + 1, state: "WAITING", reason: null } });
    }
  } else if ("sessionId" in command) {
    if (data.event.stage !== "LIVE") throw new ForbiddenError("Event is not live", "stageLocked");
    const session = data.sessions.find(s => s.id === command.sessionId)!;
    const current = session.slots.find(slot => slot.state === "CURRENT");
    if ((current?.id ?? null) !== command.expectedSlotId) throw conflict();
    if (["START", "ADVANCE", "ADVANCE_OVERRIDE"].includes(command.action)) {
      await scoringReady(db, eventId);
      if (command.action === "START" ? session.state !== "PAUSED" : session.state !== "RUNNING" || !current) throw conflict();
      if (current && command.action !== "START") {
        if (command.action !== "ADVANCE_OVERRIDE" && !await scoringComplete(db, eventId, current.performanceId)) throw new ConflictError("Assigned sheets are incomplete", undefined, "invalidConfiguration");
        await db.scheduleSlot.update({ where: { id: current.id }, data: { state: "DONE", reason: "reason" in command ? command.reason : null } });
      }
      const next = command.action === "START" && current ? current : session.slots.filter(s => s.state === "WAITING").sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
      if (next) {
        if (!data.entries.some(e => e.id === next.performanceId && e.eligible)) throw conflict();
        await freezeScoring(db, eventId, session.id, next.performanceId, actor.id);
        await db.scheduleSlot.update({ where: { id: next.id }, data: { state: "CURRENT" } });
      }
      await db.competitionSession.update({ where: { id: session.id }, data: { state: next ? "RUNNING" : "FINISHED" } });
    } else if (command.action === "PAUSE") {
      if (session.state !== "RUNNING") throw conflict();
      await db.competitionSession.update({ where: { id: session.id }, data: { state: "PAUSED" } });
    } else if (command.action === "SKIP") {
      if (session.state !== "RUNNING" || !current) throw conflict();
      await db.scheduleSlot.update({ where: { id: current.id }, data: { state: "SKIPPED", reason: command.reason } });
      // Stop on a skip; selecting a new current still consumes scoring readiness.
      await db.competitionSession.update({ where: { id: session.id }, data: { state: "PAUSED" } });
    } else if (command.action === "REOPEN") {
      if (session.state !== "FINISHED") throw conflict();
      await db.competitionSession.update({ where: { id: session.id }, data: { state: "PAUSED" } });
    } else if (command.action === "REQUEUE") {
      if (session.state !== "PAUSED" || current) throw conflict();
      const skipped = session.slots.find(slot => slot.id === command.targetSlotId && slot.state === "SKIPPED");
      if (!skipped || !data.entries.some(entry => entry.id === skipped.performanceId && entry.eligible)) throw conflict();
      // Requeue the named skipped slot, preserving its identity and prior receipt.
      const ordered = [...session.slots.filter(s => s.state !== "REMOVED" && s.id !== skipped.id), skipped];
      await db.scheduleSlot.updateMany({ where: { sessionId: session.id }, data: { state: "REMOVED", position: null } });
      for (const [i, slot] of ordered.entries()) await db.scheduleSlot.update({ where: { id: slot.id }, data: { position: i + 1, state: slot.id === skipped.id ? "WAITING" : slot.state, reason: slot.id === skipped.id ? command.reason : slot.reason } });
    }
  }
  const head = await db.eventSchedule.upsert({ where: { eventId }, create: { eventId, revision: 1 }, update: { revision: { increment: 1 } } });
  const acknowledged = workspace(await sources(db, eventId), actor, admin);
  const createdAt = new Date();
  if (admin) acknowledged.receipts.unshift({ operationId: command.operationId, action: command.action, revision: head.revision, createdAt: createdAt.toISOString() });
  const response = ScheduleReceiptSchema.parse({ operationId: command.operationId, action: command.action, revision: head.revision, workspace: acknowledged });
  await db.scheduleOperation.create({ data: { operationId: command.operationId, eventId, actorId: actor.id, revision: head.revision, action: command.action, digest, reason: "reason" in command ? command.reason : null, response, createdAt } });
  await appendAudit(db, { action: "SCHEDULE_CHANGED", actor: { kind: "USER", userId: actor.id }, targetType: "SCHEDULE", targetId: eventId, eventId, metadata: { operationId: command.operationId, revision: head.revision } });
  return response;
}
