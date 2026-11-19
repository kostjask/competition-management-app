import { randomUUID } from "node:crypto";
import type { Prisma, ApplicationEstimateRevision, Event } from "@prisma/client";
import { ApplicationEstimateCountsSchema, ApplicationEstimateRevisionSchema, eventCalendarDays } from "@dance/schemas";
import { z } from "zod";
import { ConflictError } from "../errors";
import { appendAudit } from "./audit";

export function validateEstimateDays(event: Pick<Event, "startsAt" | "endsAt" | "timeZone" | "revision">, counts: z.infer<typeof ApplicationEstimateCountsSchema>, revision?: number, path = "counts") {
  if (revision !== event.revision) throw new ConflictError("Reload event days", undefined, "concurrentChange");
  const days = eventCalendarDays(event.startsAt.toISOString(), event.endsAt.toISOString(), event.timeZone);
  const dates = counts.map(row => row.date).sort();
  if (JSON.stringify(days) !== JSON.stringify(dates)) throw new z.ZodError([{ code: "custom", path: [path], message: "Supply every current event day exactly once", params: { reason: "calendarDate" } }]);
}

export function serializeEstimate(row: ApplicationEstimateRevision) {
  return ApplicationEstimateRevisionSchema.parse({ revision: row.revision, eventRevision: row.eventRevision,
    timeZone: row.timeZone, counts: row.counts, source: row.source, reason: row.reason, createdAt: row.createdAt.toISOString() });
}

export async function recordEstimates(tx: Prisma.TransactionClient, input: {
  registrationId: string; eventId: string; studioId: string; revision: number; eventRevision: number;
  timeZone: string; counts: z.infer<typeof ApplicationEstimateCountsSchema>; actorId: string;
  source: "APPLICANT" | "ORGANIZER"; reason?: string | undefined; operationId?: string | undefined; digest: string;
}) {
  const row = await tx.applicationEstimateRevision.create({ data: {
    registrationId: input.registrationId, revision: input.revision, eventRevision: input.eventRevision,
    timeZone: input.timeZone, counts: [...input.counts].sort((a, b) => a.date.localeCompare(b.date)),
    actorId: input.actorId, source: input.source, reason: input.reason ?? null,
    operationId: input.operationId ?? randomUUID(), digest: input.digest,
  } });
  // Reuse the established safe revision audit; full counts/reason live in private immutable history.
  await appendAudit(tx, { action: "REGISTRATION_CORRECTED", actor: { kind: "USER", userId: input.actorId },
    targetType: "REGISTRATION", targetId: input.registrationId, eventId: input.eventId, studioId: input.studioId,
    metadata: { revision: input.revision } });
  return serializeEstimate(row);
}
