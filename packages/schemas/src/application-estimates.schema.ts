import { z } from "zod";
import { eventAgeDate } from "./calendar.js";

/** Inclusive local calendar days, advanced as dates rather than 24-hour instants. */
export function eventCalendarDays(startsAt: string, endsAt: string, timeZone: string): string[] {
  const first = eventAgeDate(startsAt, timeZone);
  const last = eventAgeDate(endsAt, timeZone);
  if (first > last) throw new RangeError("Event dates are reversed");
  const days: string[] = [];
  for (let cursor = Date.parse(`${first}T00:00:00Z`); cursor <= Date.parse(`${last}T00:00:00Z`); cursor += 86400000) {
    days.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return days;
}

export const ApplicationEstimateCountsSchema = z.array(z.strictObject({
  date: z.iso.date(), count: z.int().min(0).max(10000),
})).min(1).max(366).superRefine((rows, ctx) => {
  if (new Set(rows.map(row => row.date)).size !== rows.length) ctx.addIssue({ code: "custom", path: [], message: "Duplicate day", params: { reason: "duplicate" } });
});
export const SaveApplicationEstimatesSchema = z.strictObject({
  operationId: z.uuid(), revision: z.int().positive(), eventRevision: z.int().positive(),
  counts: ApplicationEstimateCountsSchema,
  reason: z.string().trim().min(1).max(500).optional(),
});
export const ApplicationEstimateRevisionSchema = z.strictObject({
  revision: z.int().positive(), eventRevision: z.int().positive(), timeZone: z.string(),
  counts: ApplicationEstimateCountsSchema, source: z.enum(["APPLICANT", "ORGANIZER"]),
  reason: z.string().nullable(), createdAt: z.iso.datetime(),
});
export type ApplicationEstimateRevision = z.infer<typeof ApplicationEstimateRevisionSchema>;
export type SaveApplicationEstimates = z.infer<typeof SaveApplicationEstimatesSchema>;
