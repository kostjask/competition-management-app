import { z } from "zod";
import { AuthoredContentSchema, resolveAuthoredContent } from "./content.schema.js";
import { EntrySettingsSchema } from "./entry.schema.js";

export const CmsLocaleSchema = z.enum(["et", "en", "ru"]);
export const CmsIdSchema = z.uuid().toLowerCase();
export const CmsKindSchema = z.enum(["STUDIO_SITE", "FESTIVAL_PORTAL", "FESTIVAL_EDITION"]);
const Name = z.string().trim().min(1).max(160);
export const CmsSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
export const CmsHttpsSchema = z.url().max(2048).refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use an HTTPS URL without credentials");
const Text = AuthoredContentSchema;
const OptionalText = Text.nullable();
const Day = z.iso.date();
const Time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const Zone = z.string().max(80).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } });
export const CmsImageSchema = z.strictObject({ assetId: CmsIdSchema, alt: OptionalText, decorative: z.boolean() })
  .refine(value => value.decorative ? value.alt === null : value.alt !== null, { path: ["alt"], message: "Provide alternative text or mark decorative" });
const Profile = z.strictObject({ id: CmsIdSchema, name: Name, biography: OptionalText, portrait: CmsImageSchema.nullable() });
const Link = z.strictObject({ id: CmsIdSchema, title: Text, url: CmsHttpsSchema });
const Contact = z.strictObject({ email: z.email().max(254).nullable(), phone: z.string().regex(/^\+?[\d ()-]{5,30}$/).refine(value => value.replace(/\D/g, "").length >= 5, "Provide a usable phone number").nullable(), address: OptionalText, links: z.array(Link).max(12) });
// Semantic pairs only: no author-controlled CSS. Consumers use this same palette.
export const CMS_BRAND_PALETTE = {
  cobalt: { background: "#2359b8", foreground: "#ffffff" },
  forest: { background: "#246044", foreground: "#ffffff" },
  brick: { background: "#913d31", foreground: "#ffffff" },
} as const;
export function cmsContrast(background: string, foreground: string) {
  const luminance = (hex: string) => {
    const channels = [1,3,5].map(index => parseInt(hex.slice(index,index+2),16)/255).map(channel => channel <= .04045 ? channel/12.92 : ((channel+.055)/1.055)**2.4);
    return channels[0]!*.2126+channels[1]!*.7152+channels[2]!*.0722;
  };
  const a = luminance(background); const b = luminance(foreground); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
const Brand = z.strictObject({ accent: z.enum(["cobalt", "forest", "brick"]), artwork: CmsImageSchema.nullable() }).refine(value => {
  const pair = CMS_BRAND_PALETTE[value.accent]; return cmsContrast(pair.background,pair.foreground) >= 4.5;
}, { path: ["accent"], message: "Brand controls must meet contrast requirements" });
const Common = { primaryLocale: CmsLocaleSchema, title: OptionalText, introduction: OptionalText, metadata: OptionalText, contact: Contact };
export const CmsStudioSchema = z.strictObject({ kind: z.literal("STUDIO_SITE"), ...Common, about: OptionalText,
  teachers: z.array(Profile).max(30),
  classes: z.array(z.strictObject({ id: CmsIdSchema, title: Text, style: OptionalText, ages: OptionalText, teacherIds: z.array(CmsIdSchema).max(30), joining: OptionalText })).max(60),
  timetable: z.array(z.strictObject({ id: CmsIdSchema, classId: CmsIdSchema, weekday: z.int().min(1).max(7), start: Time, end: Time, timeZone: Zone, location: Name, validFrom: Day.nullable(), validUntil: Day.nullable() })).max(150),
  joining: OptionalText, media: z.array(CmsImageSchema).max(30),
}).superRefine((value, ctx) => {
  const teachers = new Set(value.teachers.map(row => row.id)); const classes = new Set(value.classes.map(row => row.id));
  value.classes.forEach((row, index) => { if (row.teacherIds.some(id => !teachers.has(id)) || new Set(row.teacherIds).size !== row.teacherIds.length) ctx.addIssue({ code: "custom", path: ["classes", index, "teacherIds"], message: "Select teachers in this document" }); });
  value.timetable.forEach((row, index) => { if (!classes.has(row.classId) || row.start >= row.end || (row.validFrom && row.validUntil && row.validFrom > row.validUntil)) ctx.addIssue({ code: "custom", path: ["timetable", index], message: "Check class, time and dates" }); });
});
export const CmsPortalSchema = z.strictObject({ kind: z.literal("FESTIVAL_PORTAL"), ...Common, brand: Brand,
  festivals: z.array(z.strictObject({ festivalId: CmsIdSchema, summary: Text })).max(20), studioUrl: CmsHttpsSchema.nullable() });
const Handoff = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("contact") }),
  z.strictObject({ kind: z.literal("external"), url: CmsHttpsSchema, availableFrom: z.iso.datetime(), availableUntil: z.iso.datetime(), reviewed: z.boolean() }).refine(row => Date.parse(row.availableFrom) < Date.parse(row.availableUntil)),
  z.strictObject({ kind: z.literal("internal") }),
]);
export const CmsEditionSchema = z.strictObject({ kind: z.literal("FESTIVAL_EDITION"), ...Common, brand: Brand,
  startsOn: Day.nullable(), endsOn: Day.nullable(), location: OptionalText,
  rules: z.array(z.strictObject({ id: CmsIdSchema, heading: Text, paragraphs: z.array(Text).max(50) })).max(30),
  judges: z.array(Profile).max(30), handoff: Handoff,
  results: z.array(z.strictObject({ id: CmsIdSchema, title: Text, url: CmsHttpsSchema, editionLabel: Name, date: Day, locale: CmsLocaleSchema, reviewed: z.boolean() })).max(50),
}).refine(row => !row.startsOn || !row.endsOn || row.startsOn <= row.endsOn, { path: ["endsOn"], message: "End must follow start" });
export const CmsPayloadSchema = z.discriminatedUnion("kind", [CmsStudioSchema, CmsPortalSchema, CmsEditionSchema]).superRefine((value, ctx) => {
  if (new TextEncoder().encode(JSON.stringify(value)).length > 90000) ctx.addIssue({ code: "custom", message: "Content exceeds 90 KB" });
  for (const field of ["title", "introduction", "metadata"] as const) if (value[field] && value[field].sourceLocale !== value.primaryLocale) ctx.addIssue({ code: "custom", path: [field], message: "Use the document source language" });
  const walk = (node: unknown, path: (string | number)[]) => {
    if (Array.isArray(node)) {
      const ids = node.filter((row): row is { id: string } => typeof row === "object" && row !== null && "id" in row && typeof row.id === "string").map(row => row.id);
      if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path, message: "Duplicate local identity" });
      node.forEach((row, index) => walk(row, [...path, index]));
    } else if (node && typeof node === "object") for (const [key, row] of Object.entries(node)) walk(row, [...path, key]);
  }; walk(value, []);
});
export type CmsPayload = z.infer<typeof CmsPayloadSchema>;
export type CmsLocale = z.infer<typeof CmsLocaleSchema>;
export function emptyCmsPayload(kind: CmsPayload["kind"]): CmsPayload {
  const common = { primaryLocale: "et" as const, title: null, introduction: null, metadata: null, contact: { email: null, phone: null, address: null, links: [] } };
  if (kind === "STUDIO_SITE") return { kind, ...common, about: null, teachers: [], classes: [], timetable: [], joining: null, media: [] };
  if (kind === "FESTIVAL_PORTAL") return { kind, ...common, brand: { accent: "cobalt", artwork: null }, festivals: [], studioUrl: null };
  return { kind, ...common, brand: { accent: "cobalt", artwork: null }, startsOn: null, endsOn: null, location: null, rules: [], judges: [], handoff: { kind: "contact" }, results: [] };
}
export const CmsCommandSchema = z.strictObject({ operationId: CmsIdSchema, expectedVersion: z.int().min(0).max(2147483646) });
export const CmsSaveSchema = CmsCommandSchema.extend({ payload: CmsPayloadSchema });
export const CmsInitializeSchema = CmsCommandSchema.extend({ kind: z.enum(["STUDIO_SITE", "FESTIVAL_PORTAL"]) });
export const CmsPolicyDigestSchema = z.string().regex(/^[0-9a-f]{64}$/);
export const CmsPublishSchema = CmsCommandSchema.extend({ revisionId: CmsIdSchema, reviewed: z.literal(true), policyDigest: CmsPolicyDigestSchema });
export const CmsFestivalCreateSchema = CmsCommandSchema.extend({ slug: CmsSlugSchema, name: Name });
export const CmsEditionCreateSchema = CmsCommandSchema.extend({ festivalId: CmsIdSchema, slug: CmsSlugSchema, copyDocumentId: CmsIdSchema.nullable(), sections: z.array(z.enum(["title", "introduction", "brand", "rules", "judges", "contact"])).max(6) });
export const CmsLinkSchema = CmsCommandSchema.extend({ eventId: z.string().min(1).max(128).nullable(), migrationReviewed: z.boolean() });
export const CmsReviewSchema = CmsCommandSchema.extend({ approved: z.boolean() });
export const CmsParamsSchema = z.object({ documentId: CmsIdSchema });
export const CmsLocaleQuerySchema = z.strictObject({ locale: CmsLocaleSchema.default("et") });
export const CmsPreviewQuerySchema = CmsLocaleQuerySchema.extend({ revisionId: CmsIdSchema });
export const CmsHistoryQuerySchema = z.strictObject({ before: z.coerce.number().int().positive().optional() });
export const CmsRevisionSchema = z.strictObject({ id: CmsIdSchema, number: z.int().positive(), createdAt: z.iso.datetime(), payload: CmsPayloadSchema });
export const CmsReceiptSchema = z.strictObject({ operationId: CmsIdSchema, documentId: CmsIdSchema, kind: z.string(), version: z.int().positive(), revisionId: CmsIdSchema.nullable(), createdAt: z.iso.datetime() });
export const CmsAssetSchema = z.strictObject({ id: CmsIdSchema, width: z.int().positive(), height: z.int().positive(), rights: z.enum(["PENDING", "APPROVED", "REVOKED"]), retired: z.boolean() });
export const CmsFactsSchema = z.strictObject({ eventId: z.string(), startsAt: z.iso.datetime(), endsAt: z.iso.datetime(), timeZone: z.string(), venue: z.string().nullable(), registrationDeadline: z.iso.datetime().nullable(), entrySettings: EntrySettingsSchema.nullable() });
export const CmsDocumentSchema = z.strictObject({ id: CmsIdSchema, kind: CmsKindSchema, version: z.int().positive(), editionId: CmsIdSchema.nullable(), label: z.string(), slug: z.string().nullable(), festivalSlug: z.string().nullable(), archived: z.boolean(), everPublished: z.boolean(),
  draft: CmsRevisionSchema, publishedRevisionId: CmsIdSchema.nullable(), assets: z.array(CmsAssetSchema), facts: CmsFactsSchema.nullable() });
export type CmsDocument = z.infer<typeof CmsDocumentSchema>;
export const CmsIndexSchema = z.strictObject({ documents: z.array(CmsDocumentSchema), festivals: z.array(z.strictObject({ id: CmsIdSchema, slug: CmsSlugSchema, name: Name })) });
export const CmsIssueSchema = z.strictObject({ path: z.string(), reason: z.enum(["required", "asset", "review", "internalDisabled"]) });
export type CmsIssue = z.infer<typeof CmsIssueSchema>;
export function cmsReadiness(payload: CmsPayload): CmsIssue[] {
  const issues: CmsIssue[] = [];
  for (const field of ["title", "introduction", "metadata"] as const) if (!payload[field]) issues.push({ path: field, reason: "required" });
  if (!payload.contact.email && !payload.contact.phone) issues.push({ path: "contact.email", reason: "required" });
  if (payload.kind === "FESTIVAL_EDITION") {
    if (payload.handoff.kind === "internal") issues.push({ path: "handoff", reason: "internalDisabled" });
    if (payload.handoff.kind === "external" && !payload.handoff.reviewed) issues.push({ path: "handoff", reason: "review" });
    payload.results.forEach((row, index) => { if (!row.reviewed) issues.push({ path: `results.${index}`, reason: "review" }); });
  }
  return issues;
}
const Resolved = z.strictObject({ text: z.string(), lang: CmsLocaleSchema, fallback: z.boolean() });
const PublicImage = z.strictObject({ id: CmsIdSchema, url: z.string(), width: z.int().positive(), height: z.int().positive(), alt: Resolved.nullable(), decorative: z.boolean() });
// Public output is a bounded allowlist of named, resolved fields, never the stored JSON.
export const CmsPublicSchema = z.strictObject({ kind: CmsKindSchema, revisionId: CmsIdSchema, publishedAt: z.iso.datetime(), requestedLocale: CmsLocaleSchema, primaryLocale: CmsLocaleSchema,
  identity: z.strictObject({ festivalSlug: CmsSlugSchema, editionSlug: CmsSlugSchema }).nullable(),
  fields: z.array(z.strictObject({ path: z.string(), value: Resolved })), images: z.array(z.strictObject({ path: z.string(), image: PublicImage })),
  links: z.array(z.strictObject({ path: z.string(), title: Resolved, url: CmsHttpsSchema, result: z.strictObject({ editionLabel: Name, date: Day, locale: CmsLocaleSchema }).optional() })),
  facts: CmsFactsSchema.omit({ eventId: true, entrySettings: true }).nullable(), policyChanged: z.boolean(),
  contact: z.strictObject({ email: z.email().nullable(), phone: z.string().nullable() }),
  action: z.discriminatedUnion("kind", [z.strictObject({ kind: z.literal("contact"), email: z.string().nullable(), phone: z.string().nullable() }), z.strictObject({ kind: z.literal("external"), url: CmsHttpsSchema })]),
  timetable: z.array(z.strictObject({ classId: CmsIdSchema, weekday: z.int(), start: Time, end: Time, timeZone: Zone, location: Name, validFrom: Day.nullable(), validUntil: Day.nullable() })),
  classes: z.array(z.strictObject({ id: CmsIdSchema, teacherIds: z.array(CmsIdSchema) })), profiles: z.array(z.strictObject({ id: CmsIdSchema, name: Name })),
  brand: z.enum(["cobalt", "forest", "brick"]).nullable(), startsOn: Day.nullable(), endsOn: Day.nullable(),
});
export type CmsPublic = z.infer<typeof CmsPublicSchema>;
export const CmsPublicPortalSchema = z.strictObject({ content: CmsPublicSchema,
  festivals: z.array(z.strictObject({ slug: CmsSlugSchema, name: Name, summary: Resolved.nullable() })),
  editions: z.array(z.strictObject({ festivalSlug: CmsSlugSchema, editionSlug: CmsSlugSchema, title: Resolved.nullable(), revisionId: CmsIdSchema,
    startsOn: Day.nullable(), endsOn: Day.nullable(), period: z.enum(["upcoming", "past", "undated"]) })) });
export type CmsPublicPortal = z.infer<typeof CmsPublicPortalSchema>;
export const CmsPreviewSchema = z.strictObject({ content: CmsPublicSchema, issues: z.array(CmsIssueSchema), policyDigest: CmsPolicyDigestSchema, facts: CmsFactsSchema.nullable() });
export function cmsText(content: z.infer<typeof AuthoredContentSchema>, locale: CmsLocale) { return resolveAuthoredContent(content, locale); }
