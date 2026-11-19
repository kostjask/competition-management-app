import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const MusicStateSchema = z.enum(["DRAFT", "CONFIRMED", "ACCEPTED"]);
export const MusicMimeSchema = z.enum(["audio/mpeg", "audio/wav"]);
export const MusicPolicySchema = z.strictObject({
  allowedMime: z.array(MusicMimeSchema).min(1).max(2).refine(value => new Set(value).size === value.length),
  maxBytes: z.int().positive().max(134217728), maxDurationMs: z.int().positive().max(86400000),
  deadline: z.iso.datetime(), exceptionUntil: z.iso.datetime(),
}).refine(value => Date.parse(value.exceptionUntil) >= Date.parse(value.deadline), { path: ["exceptionUntil"] });
export const MusicConfigurationSchema = z.strictObject({ revision: z.int().nonnegative(), policy: MusicPolicySchema.nullable(), providerReady: z.boolean() });
export const MusicConfigureSchema = z.strictObject({ expectedRevision: z.int().nonnegative(), policy: MusicPolicySchema });
export const MusicCreateSchema = z.strictObject({ operationId: z.uuid(), trackId: z.uuid(), performanceId: IdSchema.optional() });
export const MusicUploadSchema = z.strictObject({ operationId: z.uuid(), expectedRevision: z.coerce.number().int().positive(), policyRevision: z.coerce.number().int().positive() });
export const MusicActionSchema = z.enum(["ATTACH", "REPLACE", "CONFIRM", "ACCEPT", "REOPEN"]);
/** Private storage keys/digests and uploader identities never cross this DTO boundary. */
export const MusicVersionSchema = z.strictObject({
  id: z.uuid(), displayName: z.string().min(1).max(255).regex(/^[^\u0000-\u001f\u007f/\\]+$/u),
  detectedMime: z.string().regex(/^audio\/[a-z0-9.+-]+$/),
  byteLength: z.int().positive().max(2147483647), durationMs: z.int().positive().max(2147483647), createdAt: z.iso.datetime(),
});
export const MusicTrackSchema = z.strictObject({
  id: z.uuid(), registrationId: IdSchema, studioId: IdSchema, eventId: IdSchema,
  performanceId: IdSchema.nullable(), revision: z.int().positive(), state: MusicStateSchema,
  currentVersion: MusicVersionSchema.nullable(),
  correctionUntil: z.iso.datetime().nullable().default(null),
}).refine(value => value.state === "DRAFT" || value.currentVersion !== null);
export const MusicCommandSchema = z.strictObject({
  operationId: z.uuid(), expectedRevision: z.int().positive(),
  action: MusicActionSchema, versionId: z.uuid().optional(), performanceId: IdSchema.optional(),
  reason: z.string().trim().min(1).max(500).optional(),
  until: z.iso.datetime().optional(),
}).superRefine((value, ctx) => {
  const invalid = (path: string) => ctx.addIssue({ code: "custom", path: [path], message: "Invalid music command" });
  if (["REPLACE", "CONFIRM", "ACCEPT"].includes(value.action) !== (value.versionId !== undefined)) invalid("versionId");
  if ((value.action === "ATTACH") !== (value.performanceId !== undefined)) invalid("performanceId");
  if ((value.action === "REOPEN") !== (value.reason !== undefined)) invalid("reason");
  if ((value.action === "REOPEN") !== (value.until !== undefined)) invalid("until");
});
export const MusicReceiptSchema = z.strictObject({ operationId: z.uuid(), track: MusicTrackSchema });
export const MusicWorkspaceSchema = z.strictObject({ eventName: z.string(), studioName: z.string(), configuration: MusicConfigurationSchema, tracks: z.array(MusicTrackSchema), organizer: z.boolean() });
export type MusicPolicy = z.infer<typeof MusicPolicySchema>;
export type MusicTrack = z.infer<typeof MusicTrackSchema>;
export type MusicCommand = z.infer<typeof MusicCommandSchema>;
export type MusicWorkspace = z.infer<typeof MusicWorkspaceSchema>;
export type MusicState = z.infer<typeof MusicStateSchema>;
export type MusicAction = z.infer<typeof MusicActionSchema>;

/** Domain transition only: callers still authorize, validate relationships and persist atomically. */
export function nextMusicState(state: MusicState, action: MusicAction, hasVersion: boolean, organizer: boolean): MusicState | null {
  if (action === "ATTACH" || action === "REPLACE") return state === "DRAFT" ? "DRAFT" : null;
  if (action === "CONFIRM") return state === "DRAFT" && hasVersion ? "CONFIRMED" : null;
  if (action === "ACCEPT") return organizer && state === "CONFIRMED" && hasVersion ? "ACCEPTED" : null;
  return organizer && state !== "DRAFT" && hasVersion ? "DRAFT" : null;
}
