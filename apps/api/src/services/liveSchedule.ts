import type { Prisma } from "@prisma/client";
import {
  LiveScheduleActionSchema, LiveScheduleWorkspaceSchema, ScheduleReceiptSchema, ScoringCommandSchema,
  type LiveScheduleAcknowledgement, type LiveScheduleQuery,
} from "@dance/schemas";
import { ForbiddenError, NotFoundError } from "../errors";
import { moderatorCanRun, scheduleAuthority, type ScheduleActor } from "./schedule";
import { activeScoringJudge, hasScoringReadiness } from "./scoring";

type DB = Prisma.TransactionClient;
const performanceIdentity = { title: true, studio: { select: { name: true } } } satisfies Prisma.PerformanceSelect;
const slotIdentity = { id: true, position: true, performance: { select: performanceIdentity } } satisfies Prisma.ScheduleSlotSelect;
const slotOrder = [{ position: "asc" }, { id: "asc" }] satisfies Prisma.ScheduleSlotOrderByWithRelationInput[];

function performance(slot: { id: string; position: number | null; performance: { title: string | null; studio: { name: string } } }) {
  if (slot.position === null) throw new Error("Active schedule slot has no position");
  return { slotId: slot.id, position: slot.position, title: slot.performance.title, studioName: slot.performance.studio.name };
}

async function readAcknowledgement(db: DB, actorId: string, eventId: string, sessionId: string, operationId: string, organizer: boolean): Promise<LiveScheduleAcknowledgement | null> {
  const [schedule, scoring] = await Promise.all([
    db.scheduleOperation.findFirst({ where: { operationId, eventId, actorId }, select: { response: true, createdAt: true } }),
    organizer ? db.scoringOperation.findFirst({ where: { operationId, eventId, actorId, action: "REOPEN" }, select: { request: true, createdAt: true } }) : null,
  ]);
  if (schedule) {
    const receipt = ScheduleReceiptSchema.parse(schedule.response);
    const action = LiveScheduleActionSchema.safeParse(receipt.action);
    if (action.success && (organizer || moderatorCanRun(action.data) && !receipt.workspace.organizer) && receipt.live?.sessionId === sessionId) return {
      ...receipt.live, kind: "schedule", action: action.data, operationId, revision: receipt.revision, createdAt: schedule.createdAt.toISOString(),
    };
  }
  if (scoring) {
    const command = ScoringCommandSchema.parse(scoring.request);
    if (command.action === "REOPEN" && await db.scoringSheet.findFirst({
      where: { id: command.sheetId, eventId, record: { sessionId, performance: { deletedAt: null } } }, select: { id: true },
    })) return {
      kind: "sheet", action: "REOPEN", sessionId, sheetId: command.sheetId,
      operationId, revision: command.expectedRevision + 1, createdAt: scoring.createdAt.toISOString(),
    };
  }
  return null;
}

export async function readLiveSchedule(db: DB, actor: ScheduleActor, eventId: string, query: LiveScheduleQuery) {
  const organizer = await scheduleAuthority(db, actor, eventId);
  const [event, sessions] = await Promise.all([
    db.event.findUnique({ where: { id: eventId }, select: { name: true, stage: true, timeZone: true, schedule: { select: { revision: true } } } }),
    db.competitionSession.findMany({
      where: { eventId, ...(!organizer && { moderatorId: actor.id }) },
      select: { id: true, name: true, startsAt: true, state: true, stage: { select: { name: true } } },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    }),
  ]);
  if (!event) throw new NotFoundError("Event");
  const selected = query.sessionId ? sessions.find(row => row.id === query.sessionId) : sessions[0];
  if (query.sessionId && !selected) throw new ForbiddenError();
  const summarize = (row: NonNullable<typeof selected>) => ({ id: row.id, name: row.name, startsAt: row.startsAt.toISOString(), stageName: row.stage.name });
  const base = {
    eventId, eventName: event.name, eventStage: event.stage, timeZone: event.timeZone, organizer,
    revision: event.schedule?.revision ?? 0, sessions: sessions.map(summarize),
  };
  if (!selected) return LiveScheduleWorkspaceSchema.parse({ ...base, scoringReady: false, session: null, acknowledgement: null });
  const sessionId = selected.id;
  const where = { eventId, sessionId };
  const [current, waiting, skipped, hasQueue, scoringReady, correctionSheets, acknowledgement] = await Promise.all([
    db.scheduleSlot.findFirst({
      where: { ...where, state: "CURRENT" },
      select: { ...slotIdentity, performanceId: true },
    }),
    db.scheduleSlot.findMany({ where: { ...where, state: "WAITING" }, orderBy: slotOrder, select: slotIdentity, take: 4 }),
    organizer && event.stage === "LIVE" && selected.state === "PAUSED"
      ? db.scheduleSlot.findMany({ where: { ...where, state: "SKIPPED", performance: { deletedAt: null } }, orderBy: slotOrder, select: slotIdentity })
      : [],
    db.scheduleSlot.findFirst({ where: { ...where, state: { not: "REMOVED" } }, select: { id: true } }),
    event.stage === "LIVE" ? hasScoringReadiness(db, eventId) : false,
    organizer && event.stage === "LIVE" && selected.state === "PAUSED" ? db.scoringSheet.findMany({
      where: { eventId, record: { sessionId, performance: { deletedAt: null } } },
      select: { id: true, revision: true, state: true, judge: { select: { name: true } }, record: { select: { performance: { select: {
        ...performanceIdentity,
        scheduleSlots: { where: { ...where, state: { in: ["CURRENT", "DONE", "SKIPPED", "WAITING"] } }, select: { id: true, position: true }, take: 1 },
      } } } } },
      orderBy: [{ recordId: "asc" }, { judgeId: "asc" }],
    }) : [],
    query.operationId ? readAcknowledgement(db, actor.id, eventId, sessionId, query.operationId, organizer) : null,
  ]);
  const record = current ? await db.scoringRecord.findFirst({
    where: { ...where, performanceId: current.performanceId },
    select: { _count: { select: { sheets: true } } },
  }) : null;
  const [locked, unavailable] = record && current ? await Promise.all([
    db.scoringSheet.count({ where: { eventId, record: { sessionId, performanceId: current.performanceId }, state: "LOCKED" } }),
    db.scoringSheet.count({ where: { eventId, record: { sessionId, performanceId: current.performanceId }, state: "DRAFT",
      judge: { isNot: activeScoringJudge(eventId) } } }),
  ]) : [0, 0];
  const [next, ...following] = waiting.map(performance);
  return LiveScheduleWorkspaceSchema.parse({
    ...base, scoringReady, acknowledgement,
    session: {
      ...summarize(selected), state: selected.state, hasQueue: !!hasQueue,
      current: current && { ...performance(current), completion: record ? { required: record._count.sheets, locked, unavailable } : null },
      next: next ?? null, following, skipped: skipped.map(performance),
      correctionSheets: correctionSheets.flatMap(sheet => {
        const slot = sheet.record.performance.scheduleSlots[0];
        return slot ? [{ id: sheet.id, revision: sheet.revision, state: sheet.state, judgeName: sheet.judge.name,
          performance: performance({ ...slot, performance: sheet.record.performance }),
        }] : [];
      }),
    },
  });
}
