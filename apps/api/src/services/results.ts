import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  ResultsSnapshotSchema, ResultsWorkspaceSchema, type ResultsCommand,
  type ResultsQuery, type ResultsReceipt, type ResultsSnapshot, type ResultsWorkspace, scoringDecimal,
} from "@dance/schemas";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../errors";
import { appendAudit } from "./audit";
import { calculateScoringRecord, completeScoringRecord, retainScoringCalculations } from "./scoringCalculation";
import { competitionRanks, InvalidScoringSourcesError } from "./scoringMath";

type DB = Prisma.TransactionClient;
type Actor = { id: string; sessionVersion: number };
type Group = ResultsSnapshot["groups"][number];
type Entry = Group["entries"][number];
type Blocker = ResultsSnapshot["blockers"][number]["kind"];
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const conflict = () => new ConflictError("Review the latest result sources", undefined, "concurrentChange");
const label = { select: { id: true, name: true } } satisfies Prisma.DanceCategoryDefaultArgs;

async function requireOrganizer(db: DB, actor: Actor) {
  const user = await db.user.findFirst({
    where: { id: actor.id, active: true, emailVerified: true, sessionVersion: actor.sessionVersion },
    select: { roles: { where: { eventId: null, removedAt: null, role: { key: "admin" } }, select: { id: true } } },
  });
  if (!user) throw new UnauthorizedError();
  if (!user.roles.length) throw new ForbiddenError();
}

async function findEvent(db: DB, eventId: string) {
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true, name: true, timeZone: true, stage: true } });
  if (!event) throw new NotFoundError("Event");
  return event;
}

async function review(db: DB, event: Awaited<ReturnType<typeof findEvent>>) {
  const slots = await db.scheduleSlot.findMany({
    where: { eventId: event.id, state: { not: "REMOVED" } },
    orderBy: { performanceId: "asc" },
    select: { sessionId: true, state: true, performance: { select: {
      id: true, title: true, deletedAt: true, category: label, ageGroup: label, format: label,
      scoringRecord: { include: {
        template: { select: { criteria: { orderBy: { position: "asc" } } } },
        sheets: { orderBy: { judgeId: "asc" }, include: { values: { orderBy: { criterionId: "asc" } } } },
      } },
    } } },
  });
  const groups = new Map<string, Group>();
  const ungrouped: Entry[] = [];
  const blockers: ResultsSnapshot["blockers"] = [];
  const calculations: ReturnType<typeof calculateScoringRecord>[] = [];
  if (!slots.some(slot => slot.performance.deletedAt === null)) {
    blockers.push({ kind: "EMPTY", performanceId: null, title: null });
  }
  for (const slot of slots) {
    const { id, title, deletedAt, category, ageGroup, format, scoringRecord: record } = slot.performance;
    const block = (kind: Blocker) => blockers.push({ kind, performanceId: id, title });
    const entry: Entry = {
      performanceId: id, title, state: deletedAt ? "WITHDRAWN" : "PENDING",
      submitted: record?.sheets.filter(sheet => sheet.state === "LOCKED").length ?? 0,
      required: record?.sheets.length ?? 0, calculationSource: null, total: null,
      deduction: null, rank: null,
    };
    if (deletedAt && slot.state === "CURRENT") block("QUEUE");
    if (!deletedAt) {
      if (!category || !ageGroup || !format) block("GROUP");
      if (slot.state !== "DONE") block("QUEUE");
      if (!record || !completeScoringRecord(record)) block("SHEETS");
      else if (record.sessionId !== slot.sessionId) block("SCORING");
      else if (slot.state === "DONE" && category && ageGroup && format) {
        try {
          const result = calculateScoringRecord(record, record.template.criteria);
          calculations.push(result);
          entry.calculationSource = result.calculation.source;
          entry.total = result.calculation.total;
          entry.deduction = scoringDecimal(record.penalty);
          entry.state = record.disqualified ? "DISQUALIFIED" : "RANKABLE";
        } catch (error) {
          if (!(error instanceof InvalidScoringSourcesError)) throw error;
          block("SCORING");
        }
      }
    }
    if (category && ageGroup && format) {
      const id = fingerprint([category.id, ageGroup.id, format.id]);
      const group = groups.get(id);
      if (group) group.entries.push(entry);
      else groups.set(id, { id, category, ageGroup, format, entries: [entry] });
    } else ungrouped.push(entry);
  }
  for (const group of groups.values()) {
    if (group.entries.some(entry => entry.state === "PENDING")) continue;
    group.entries = competitionRanks(group.entries.map(entry => ({ entry, total: entry.total, disqualified: entry.state === "DISQUALIFIED" })))
      .map(({ entry, rank }) => ({ ...entry, rank }));
  }
  const snapshot = ResultsSnapshotSchema.parse({
    policy: "normalized-v1", eventName: event.name, timeZone: event.timeZone,
    groups: [...groups.values()], ungrouped, blockers,
  });
  return { snapshot, source: fingerprint(snapshot), calculations };
}

function receipt(action: ResultsCommand["action"], row: { operationId: string; revision: number; createdAt: Date }): ResultsReceipt {
  return { action, operationId: row.operationId, revision: row.revision, createdAt: row.createdAt.toISOString() };
}

async function operation(db: DB, operationId: string) {
  const finalized = await db.resultFinalization.findUnique({ where: { operationId } });
  if (finalized) return { row: finalized, receipt: receipt("FINALIZE", finalized) };
  const calculated = await db.resultRevision.findUnique({
    where: { operationId }, select: { eventId: true, actorId: true, digest: true, operationId: true, revision: true, createdAt: true },
  });
  return calculated ? { row: calculated, receipt: receipt("CALCULATE", calculated) } : null;
}

export async function readResults(db: DB, actor: Actor, eventId: string, query: ResultsQuery): Promise<ResultsWorkspace> {
  await requireOrganizer(db, actor);
  const event = await findEvent(db, eventId);
  const [revisions, finalized, replay, current] = await Promise.all([
    db.resultRevision.findMany({ where: { eventId }, orderBy: { revision: "desc" }, select: { revision: true, source: true, createdAt: true } }),
    db.resultFinalization.findUnique({ where: { eventId }, select: { revision: true, createdAt: true } }),
    query.operationId ? operation(db, query.operationId) : null,
    event.stage === "LIVE" ? review(db, event) : null,
  ]);
  const revision = query.revision ?? revisions[0]?.revision;
  const saved = revision === undefined ? null : await db.resultRevision.findUnique({ where: { eventId_revision: { eventId, revision } } });
  if (query.revision !== undefined && !saved) throw new NotFoundError("Result revision");
  return ResultsWorkspaceSchema.parse({
    eventId, eventName: event.name, stage: event.stage,
    current: current && { source: current.source, snapshot: current.snapshot },
    saved: saved && { revision: saved.revision, source: saved.source, createdAt: saved.createdAt.toISOString(), snapshot: saved.snapshot },
    revisions: revisions.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
    finalized: finalized && { revision: finalized.revision, createdAt: finalized.createdAt.toISOString() },
    receipt: replay?.row.eventId === eventId && replay.row.actorId === actor.id ? replay.receipt : null,
  });
}

export async function commandResults(db: DB, actor: Actor, eventId: string, command: ResultsCommand): Promise<ResultsReceipt> {
  await requireOrganizer(db, actor);
  const digest = fingerprint([actor.id, eventId, command]);
  const previous = await operation(db, command.operationId);
  if (previous) {
    if (previous.row.eventId !== eventId || previous.row.actorId !== actor.id || previous.row.digest !== digest) throw conflict();
    return previous.receipt;
  }
  const event = await findEvent(db, eventId);
  if (event.stage !== "LIVE") throw new ForbiddenError("Results can only be changed while live", "stageLocked");
  const latest = await db.resultRevision.findFirst({
    where: { eventId }, orderBy: { revision: "desc" }, select: { revision: true, source: true },
  });
  if (command.expectedRevision !== (latest?.revision ?? 0)) throw conflict();
  const current = await review(db, event);
  if (current.source !== command.source) throw conflict();
  if (current.snapshot.blockers.length) throw new ConflictError("Resolve the outstanding result blockers", undefined, "invalidConfiguration");

  const identity = { eventId, operationId: command.operationId, actorId: actor.id, digest };
  let acknowledgement: ResultsReceipt;
  if (command.action === "CALCULATE") {
    if (latest?.source === current.source) throw conflict();
    await retainScoringCalculations(db, current.calculations);
    const row = await db.resultRevision.create({
      data: { ...identity, revision: command.expectedRevision + 1, source: current.source, snapshot: current.snapshot },
    });
    acknowledgement = receipt("CALCULATE", row);
  } else {
    if (!latest || latest.source !== current.source) throw conflict();
    const row = await db.resultFinalization.create({ data: { ...identity, revision: latest.revision } });
    await db.event.update({ where: { id: eventId, stage: "LIVE" }, data: { stage: "FINALIZED", revision: { increment: 1 } } });
    acknowledgement = receipt("FINALIZE", row);
  }
  await appendAudit(db, {
    action: command.action === "CALCULATE" ? "RESULTS_CALCULATED" : "RESULTS_FINALIZED",
    actor: { kind: "USER", userId: actor.id }, targetType: "RESULTS", targetId: eventId, eventId,
    metadata: { operationId: acknowledgement.operationId, revision: acknowledgement.revision },
  });
  return acknowledgement;
}
