import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { JudgeScoringCommandSchema, JudgeScoringWorkspaceSchema, ScoringSetupInputSchema, ScoringWorkspaceSchema, ScoringPreviewSchema, ScoringReceiptSchema, scoringUnits, scoringDecimal, scoreFitsRange, type ScoringSetupInput, type ScoringCommand, type ScoringWorkspace } from "@dance/schemas";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../errors";
import { appendAudit } from "./audit";
import { exactTotal } from "./scoringMath";

type DB = Prisma.TransactionClient;
export type ScoringActor = { id: string; sessionVersion: number };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const conflict = () => new ConflictError("Compare current scoring state before retrying", undefined, "concurrentChange");
const invalid = () => new ConflictError("Scoring prerequisites are incomplete", undefined, "invalidConfiguration");
const judgeEligible = (roles: Awaited<ReturnType<typeof roleSources>>, userId: string) => roles.some(r => r.userId === userId && r.role.key === "judge" && r.role.permissions.some(p => p.permission.key === "score.submit"));
const roleSources = (db: DB, eventId: string, userId?: string) => db.userRole.findMany({ where: { eventId, ...(userId !== undefined && { userId }), removedAt: null, user: { active: true, emailVerified: true } }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
const serializeCriterion = (c: { id: string; label: Prisma.JsonValue; instructions: Prisma.JsonValue; min: number; max: number; step: number; weightBps: number }) => ({
  id: c.id, label: c.label, instructions: c.instructions, min: scoringDecimal(c.min), max: scoringDecimal(c.max), step: scoringDecimal(c.step), weightBps: c.weightBps,
});
const serializeValue = (v: { criterionId: string; value: number; comment: string | null }) => ({ criterionId: v.criterionId, value: scoringDecimal(v.value), comment: v.comment });
const judgeCanEdit = (current: boolean, sessionState: string, reopenReason: string | null) => current || (sessionState === "PAUSED" && reopenReason !== null);
async function authority(db: DB, actor: ScoringActor, eventId: string) {
  if (!await db.user.findFirst({ where: { id: actor.id, sessionVersion: actor.sessionVersion, active: true, emailVerified: true }, select: { id: true } })) throw new UnauthorizedError();
  const admin = !!await db.userRole.findFirst({ where: { userId: actor.id, eventId: null, removedAt: null, role: { key: "admin" } } });
  const roles = await roleSources(db, eventId, actor.id);
  const judge = await db.judge.findUnique({ where: { userId_eventId: { userId: actor.id, eventId } } });
  const canJudge = !!judge && judgeEligible(roles, actor.id);
  const moderator = roles.some(r => r.userId === actor.id && r.role.key !== "admin" && r.role.permissions.some(p => p.permission.key === "stage.manage"));
  if (!admin && !canJudge && !moderator) throw new ForbiddenError();
  return { admin, judgeId: canJudge ? judge.id : null, moderator };
}
async function sources(db: DB, eventId: string) {
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true, name: true, stage: true } });
  if (!event) throw new NotFoundError("Event");
  const [head, templates, bindings, panels, categories, sessions, judges, roles, records] = await Promise.all([
    db.scoringSetup.findUnique({ where: { eventId } }),
    db.scoringTemplate.findMany({ where: { eventId }, include: { criteria: { orderBy: { position: "asc" } } }, orderBy: { id: "asc" } }),
    db.scoringBinding.findMany({ where: { eventId }, orderBy: { categoryId: "asc" } }),
    db.scoringPanel.findMany({ where: { eventId }, orderBy: [{ sessionId: "asc" }, { judgeId: "asc" }] }),
    db.danceCategory.findMany({ where: { eventId }, select: { id: true, name: true }, orderBy: { id: "asc" } }),
    db.competitionSession.findMany({ where: { eventId }, include: { slots: { where: { state: { not: "REMOVED" } }, include: { performance: { select: { categoryId: true, deletedAt: true } } } } }, orderBy: { id: "asc" } }),
    db.judge.findMany({ where: { eventId }, select: { id: true, userId: true, name: true }, orderBy: { id: "asc" } }),
    roleSources(db, eventId),
    db.scoringRecord.findMany({ where: { eventId }, include: { sheets: { include: { values: { orderBy: { criterionId: "asc" } } }, orderBy: { judgeId: "asc" } }, performance: { select: { title: true } } }, orderBy: { id: "asc" } }),
  ]);
  const setup = ScoringSetupInputSchema.parse({ templates: templates.map(t => ({ id: t.id, name: t.name, criteria: t.criteria.map(serializeCriterion) })),
    bindings: bindings.map(b => ({ categoryId: b.categoryId, templateId: b.templateId })),
    panels: sessions.filter(s => panels.some(p => p.sessionId === s.id)).map(s => ({ sessionId: s.id, judgeIds: panels.filter(p => p.sessionId === s.id).map(p => p.judgeId) })) });
  return { event, revision: head?.revision ?? 0, templates, setup, categories, sessions, judges, roles, records };
}
type Sources = Awaited<ReturnType<typeof sources>>;
function blockers(data: Sources, setup = data.setup): ScoringWorkspace["blockers"] {
  const issues: ScoringWorkspace["blockers"] = [];
  if (!data.sessions.some(s => s.slots.length)) issues.push({ kind: "NO_QUEUE", targetId: data.event.id });
  for (const session of data.sessions.filter(s => s.slots.length)) {
    const panel = setup.panels.find(p => p.sessionId === session.id);
    if (!panel?.judgeIds.length) issues.push({ kind: "PANEL", targetId: session.id });
    for (const id of panel?.judgeIds ?? []) if (!data.judges.some(j => j.id === id && judgeEligible(data.roles, j.userId))) issues.push({ kind: "JUDGE", targetId: id });
    for (const slot of session.slots) if (!slot.performance.categoryId || !setup.bindings.some(b => b.categoryId === slot.performance.categoryId && setup.templates.some(t => t.id === b.templateId))) issues.push({ kind: "TEMPLATE", targetId: slot.performance.categoryId ?? slot.performanceId });
  }
  return issues.filter((issue, i) => issues.findIndex(row => row.kind === issue.kind && row.targetId === issue.targetId) === i);
}
const complete = (r: Sources["records"][number]) => r.sheets.length > 0 && r.sheets.every(s => s.state === "LOCKED");
async function workspace(db: DB, data: Sources, actor: ScoringActor, access: Awaited<ReturnType<typeof authority>>): Promise<ScoringWorkspace> {
  const sessions = access.admin ? data.sessions : data.sessions.filter(s => access.moderator && s.moderatorId === actor.id || data.records.some(r => r.sessionId === s.id && r.sheets.some(sheet => sheet.judgeId === access.judgeId)));
  const records = data.records.filter(r => access.admin || sessions.some(s => s.id === r.sessionId));
  const templateIds = new Set(records.filter(r => r.sheets.some(s => s.judgeId === access.judgeId)).map(r => r.templateId));
  const receipts = await db.scoringOperation.findMany({ where: { eventId: data.event.id, ...(!access.admin && { actorId: actor.id }) }, select: { operationId: true, revision: true, action: true, createdAt: true }, orderBy: { revision: "desc" }, take: 20 });
  return ScoringWorkspaceSchema.parse({ eventId: data.event.id, eventName: data.event.name, eventStage: data.event.stage, revision: data.revision, organizer: access.admin,
    setup: access.admin ? data.setup : { templates: data.setup.templates.filter(t => templateIds.has(t.id)), bindings: [], panels: [] },
    categories: access.admin ? data.categories : [], sessions: sessions.map(s => ({ id: s.id, name: s.name, state: s.state })),
    judges: access.admin ? data.judges.map(j => ({ id: j.id, name: j.name, eligible: judgeEligible(data.roles, j.userId) })) : [],
    blockers: access.admin ? blockers(data) : [],
    sheets: records.flatMap(r => r.sheets.filter(s => access.admin || s.judgeId === access.judgeId).map(s => ({ id: s.id, recordId: r.id, performanceId: r.performanceId, title: r.performance.title,
      judgeId: s.judgeId, templateId: s.templateId, revision: s.revision, state: s.state, submittedAt: s.submittedAt?.toISOString() ?? null,
      values: s.values.map(serializeValue) }))),
    completion: records.filter(r => access.admin || access.moderator && data.sessions.some(s => s.id === r.sessionId && s.moderatorId === actor.id)).map(r => ({ recordId: r.id, performanceId: r.performanceId, required: r.sheets.length, submitted: r.sheets.filter(s => s.state === "LOCKED").length })),
    receipts: receipts.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })) });
}
export async function readScoring(db: DB, actor: ScoringActor, eventId: string) {
  const access = await authority(db, actor, eventId); return workspace(db, await sources(db, eventId), actor, access);
}
export async function readJudgeScoring(db: DB, actor: ScoringActor, eventId: string, operationId?: string) {
  const { judgeId } = await authority(db, actor, eventId);
  if (!judgeId) throw new ForbiddenError();
  const [event, sheets, currentSlots, operation] = await Promise.all([
    db.event.findUniqueOrThrow({ where: { id: eventId }, select: { name: true, stage: true } }),
    db.scoringSheet.findMany({ where: { eventId, judgeId, record: { performance: { deletedAt: null } } }, include: {
      record: { select: { performanceId: true, sessionId: true, performance: { select: { title: true } },
        session: { select: { name: true, state: true, stage: { select: { name: true } } } },
        template: { select: { id: true, name: true, criteria: { orderBy: { position: "asc" } } } },
      } },
      values: { orderBy: { criterionId: "asc" } },
      versions: { orderBy: { revision: "desc" }, take: 1, select: { createdAt: true } },
    }, orderBy: { id: "asc" } }),
    db.scheduleSlot.findMany({ where: { eventId, state: "CURRENT" }, select: { sessionId: true, performanceId: true } }),
    operationId ? db.scoringOperation.findFirst({ where: { operationId, eventId, actorId: actor.id, action: { in: ["DRAFT", "SUBMIT"] } }, select: { operationId: true, request: true, createdAt: true } }) : null,
  ]);
  const reopenVersions = await db.scoringSheetVersion.findMany({
    where: { reason: { not: null }, sheet: { judgeId, eventId, state: "DRAFT" } },
    orderBy: { revision: "desc" }, distinct: ["sheetId"], select: { sheetId: true, reason: true },
  });
  const command = operation ? JudgeScoringCommandSchema.parse(operation.request) : null;
  const acknowledgement = operation && command && sheets.some(s => s.id === command.sheetId) ? {
    operationId: operation.operationId, action: command.action, sheetId: command.sheetId, revision: command.expectedRevision + 1, createdAt: operation.createdAt.toISOString(),
  } : null;
  return JudgeScoringWorkspaceSchema.parse({ eventId, eventName: event.name, acknowledgement, sheets: sheets.map(sheet => {
    const { record } = sheet;
    const { template } = record;
    const current = currentSlots.some(slot => slot.sessionId === record.sessionId && slot.performanceId === record.performanceId);
    const reopenReason = reopenVersions.find(version => version.sheetId === sheet.id)?.reason ?? null;
    return { id: sheet.id, performanceId: record.performanceId, title: record.performance.title, revision: sheet.revision, state: sheet.state,
      current, writable: event.stage === "LIVE" && sheet.state === "DRAFT" && judgeCanEdit(current, record.session.state, reopenReason),
      sessionName: record.session.name, stageName: record.session.stage.name, reopenReason, submittedAt: sheet.submittedAt?.toISOString() ?? null,
      savedAt: sheet.versions[0]?.createdAt.toISOString(), rubric: { id: template.id, name: template.name, criteria: template.criteria.map(serializeCriterion) },
      values: sheet.values.map(serializeValue),
    };
  }) });
}
function validateSetup(data: Sources, setup: ScoringSetupInput) {
  if (!["PRE_REGISTRATION", "REGISTRATION_OPEN", "DATA_REVIEW", "SCHEDULED", "LIVE"].includes(data.event.stage) || data.sessions.some(s => s.state === "RUNNING")) throw new ForbiddenError("Pause queues before configuring scoring", "stageLocked");
  for (const old of data.setup.templates) if (JSON.stringify(setup.templates.find(t => t.id === old.id)) !== JSON.stringify(old)) throw conflict();
  for (const binding of setup.bindings) if (!data.categories.some(c => c.id === binding.categoryId) || !setup.templates.some(t => t.id === binding.templateId)) throw new NotFoundError("Scoring category or template");
  const criterionIds = setup.templates.flatMap(t => t.criteria.map(c => c.id));
  if (new Set(criterionIds).size !== criterionIds.length) throw conflict();
  for (const panel of setup.panels) {
    if (!data.sessions.some(s => s.id === panel.sessionId)) throw new NotFoundError("Session");
    for (const id of panel.judgeIds) if (!data.judges.some(j => j.id === id && judgeEligible(data.roles, j.userId))) throw new ForbiddenError();
  }
}
export async function previewScoring(db: DB, actor: ScoringActor, eventId: string, revision: number, setup: ScoringSetupInput) {
  if (!(await authority(db, actor, eventId)).admin) throw new ForbiddenError();
  const data = await sources(db, eventId); if (revision !== data.revision) throw conflict(); validateSetup(data, setup);
  return ScoringPreviewSchema.parse({ revision, setup, previewToken: hash([data, setup]), blockers: blockers(data, setup) });
}
export async function scoringReady(db: DB, eventId: string, final = false) {
  const data = await sources(db, eventId); if (blockers(data).length) throw invalid();
  if (final) for (const session of data.sessions) for (const slot of session.slots) {
    const record = data.records.find(r => r.performanceId === slot.performanceId);
    if (slot.state !== "DONE" || !record || !complete(record)) throw invalid();
  }
}
export async function freezeScoring(db: DB, eventId: string, sessionId: string, performanceId: string, actorId: string) {
  const data = await sources(db, eventId); if (blockers(data).length) throw invalid();
  const existing = data.records.find(r => r.performanceId === performanceId);
  if (existing) { if (existing.sessionId !== sessionId) throw conflict(); return; }
  const performance = await db.performance.findFirst({ where: { id: performanceId, eventId, deletedAt: null } });
  const templateId = data.setup.bindings.find(b => b.categoryId === performance?.categoryId)?.templateId;
  const panel = data.setup.panels.find(p => p.sessionId === sessionId);
  if (!templateId || !panel?.judgeIds.length) throw invalid();
  const record = await db.scoringRecord.create({ data: { eventId, performanceId, sessionId, templateId } });
  for (const judgeId of panel.judgeIds) {
    const sheet = await db.scoringSheet.create({ data: { recordId: record.id, eventId, templateId, judgeId } });
    await db.scoringSheetVersion.create({ data: { sheetId: sheet.id, revision: 1, actorId, snapshot: { state: "DRAFT", submittedAt: null, values: [] } } });
  }
}
export async function scoringComplete(db: DB, eventId: string, performanceId: string) {
  const record = await db.scoringRecord.findFirst({ where: { eventId, performanceId }, include: { sheets: true } });
  return !!record && record.sheets.length > 0 && record.sheets.every(s => s.state === "LOCKED");
}
export async function commandScoring(db: DB, actor: ScoringActor, eventId: string, command: ScoringCommand) {
  const access = await authority(db, actor, eventId);
  const sheet = "sheetId" in command ? await db.scoringSheet.findFirst({ where: { id: command.sheetId, eventId }, include: { record: { include: { session: true, performance: { select: { deletedAt: true } } } } } }) : null;
  if ("sheetId" in command && !sheet) throw new NotFoundError("Score sheet");
  if (command.action === "DRAFT" || command.action === "SUBMIT") { if (!sheet || sheet.judgeId !== access.judgeId || sheet.record.performance.deletedAt) throw new ForbiddenError(); }
  else if (!access.admin) throw new ForbiddenError();
  const digest = hash([actor.id, eventId, command]);
  const replay = await db.scoringOperation.findUnique({ where: { operationId: command.operationId } });
  if (replay) { if (replay.digest !== digest || replay.actorId !== actor.id || replay.eventId !== eventId) throw conflict(); return ScoringReceiptSchema.parse(replay.response); }
  const data = await sources(db, eventId);
  if (command.expectedRevision !== (sheet ? sheet.revision : data.revision)) throw conflict();
  if (command.action !== "CONFIGURE" && data.event.stage !== "LIVE") throw new ForbiddenError("Scoring is closed", "stageLocked");
  let calculation: { policy: "normalized-v1"; source: string; total: string | null; disqualified: boolean } | null = null;
  if (command.action === "CONFIGURE") {
    const preview = await previewScoring(db, actor, eventId, command.expectedRevision, command.setup);
    if (preview.previewToken !== command.previewToken) throw conflict();
    for (const template of command.setup.templates.filter(t => !data.templates.some(old => old.id === t.id))) {
      await db.scoringTemplate.create({ data: { id: template.id, eventId, name: template.name } });
      for (const [position, c] of template.criteria.entries()) await db.scoringCriterion.create({ data: { id: c.id, templateId: template.id, eventId, position: position + 1, label: c.label, instructions: c.instructions, min: scoringUnits(c.min), max: scoringUnits(c.max), step: scoringUnits(c.step), weightBps: c.weightBps } });
    }
    await db.scoringBinding.deleteMany({ where: { eventId } }); await db.scoringPanel.deleteMany({ where: { eventId } });
    for (const b of command.setup.bindings) await db.scoringBinding.create({ data: { ...b, eventId } });
    for (const p of command.setup.panels) for (const judgeId of p.judgeIds) await db.scoringPanel.create({ data: { eventId, sessionId: p.sessionId, judgeId } });
  } else if (command.action === "DRAFT" || command.action === "SUBMIT") {
    if (!sheet || sheet.state !== "DRAFT") throw new ForbiddenError("Submitted sheets are locked", "stageLocked");
    const current = await db.scheduleSlot.findFirst({ where: { eventId, sessionId: sheet.record.sessionId, performanceId: sheet.record.performanceId, state: "CURRENT" } });
    // A reopened historical sheet may be corrected while paused; ordinary drafts require current identity.
    const reopened = await db.scoringSheetVersion.findFirst({ where: { sheetId: sheet.id, reason: { not: null } }, select: { reason: true } });
    if (!judgeCanEdit(!!current, sheet.record.session.state, reopened?.reason ?? null)) throw new ForbiddenError();
    const criteria = data.templates.find(t => t.id === sheet.templateId)?.criteria ?? [];
    if (new Set(command.values.map(v => v.criterionId)).size !== command.values.length || command.action === "SUBMIT" && command.values.length !== criteria.length) throw invalid();
    for (const value of command.values) { const c = criteria.find(row => row.id === value.criterionId); if (!c || !scoreFitsRange(scoringUnits(value.value), c.min, c.max, c.step)) throw invalid(); }
    await db.scoringValue.deleteMany({ where: { sheetId: sheet.id } });
    for (const value of command.values) await db.scoringValue.create({ data: { sheetId: sheet.id, templateId: sheet.templateId, criterionId: value.criterionId, value: scoringUnits(value.value), comment: value.comment } });
    await db.scoringSheet.update({ where: { id: sheet.id }, data: { revision: { increment: 1 }, state: command.action === "SUBMIT" ? "LOCKED" : "DRAFT", submittedAt: command.action === "SUBMIT" ? new Date() : null } });
  } else if (command.action === "REOPEN") {
    if (!sheet || sheet.record.session.state !== "PAUSED") throw conflict();
    await db.scoringSheet.update({ where: { id: sheet.id }, data: { revision: { increment: 1 }, state: "DRAFT", submittedAt: null } });
  } else if ("recordId" in command) {
    const record = data.records.find(r => r.id === command.recordId); if (!record) throw new NotFoundError("Scoring record");
    if (command.action === "ADJUST") {
      if (!data.sessions.some(s => s.id === record.sessionId && s.state === "PAUSED")) throw conflict();
      await db.scoringRecord.update({ where: { id: record.id }, data: { penalty: scoringUnits(command.penalty), disqualified: command.disqualified, reason: command.reason } });
    } else {
      if (!complete(record)) throw invalid();
      const criteria = data.templates.find(t => t.id === record.templateId)!.criteria;
      const inputs = { policy: "normalized-v1", recordId: record.id, performanceId: record.performanceId, templateId: record.templateId,
        penalty: record.penalty, disqualified: record.disqualified, reason: record.reason,
        sheets: record.sheets.map(s => ({ id: s.id, judgeId: s.judgeId, revision: s.revision, values: s.values.map(v => ({ criterionId: v.criterionId, value: v.value })) })),
        criteria: criteria.map(c => ({ id: c.id, min: c.min, max: c.max, step: c.step, weightBps: c.weightBps })) };
      const source = hash(inputs);
      calculation = { policy: "normalized-v1", source, total: record.disqualified ? null : exactTotal(criteria, record.sheets.map(s => s.values), record.penalty), disqualified: record.disqualified };
      if (!await db.scoringCalculation.findUnique({ where: { recordId_source: { recordId: record.id, source } } })) await db.scoringCalculation.create({ data: { recordId: record.id, source, inputs, result: calculation } });
    }
  }
  if (sheet) {
    const updated = await db.scoringSheet.findUniqueOrThrow({ where: { id: sheet.id }, include: { values: { orderBy: { criterionId: "asc" } } } });
    await db.scoringSheetVersion.create({ data: { sheetId: sheet.id, revision: updated.revision, actorId: actor.id, reason: "reason" in command ? command.reason : null, snapshot: { state: updated.state, submittedAt: updated.submittedAt?.toISOString() ?? null, values: updated.values } } });
  }
  const head = await db.scoringSetup.upsert({ where: { eventId }, create: { eventId, revision: 1 }, update: { revision: { increment: 1 } } });
  // Judge-write receipts stay own-sheet-only, even for a simultaneous administrator
  // or moderator, so later loss of that other role cannot expose peers on replay.
  const receiptAccess = command.action === "DRAFT" || command.action === "SUBMIT" ? { admin: false, judgeId: access.judgeId, moderator: false } : access;
  const acknowledged = await workspace(db, await sources(db, eventId), actor, receiptAccess);
  const createdAt = new Date(); acknowledged.receipts.unshift({ operationId: command.operationId, revision: head.revision, action: command.action, createdAt: createdAt.toISOString() });
  const response = ScoringReceiptSchema.parse({ operationId: command.operationId, revision: head.revision, action: command.action, workspace: acknowledged, calculation });
  await db.scoringOperation.create({ data: { operationId: command.operationId, eventId, actorId: actor.id, revision: head.revision, action: command.action, digest, request: command, reason: "reason" in command ? command.reason : null, response, createdAt } });
  await appendAudit(db, { action: "SCORING_CHANGED", actor: { kind: "USER", userId: actor.id }, targetType: "SCORING", targetId: eventId, eventId, metadata: { revision: head.revision, operationId: command.operationId } });
  return response;
}
