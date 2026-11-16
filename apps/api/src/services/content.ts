import { createHash } from "node:crypto";
import { Prisma, type PrismaClient, type ContentDocument, type ContentOperation } from "@prisma/client";
import { CmsPayloadSchema, CmsDocumentSchema, CmsReceiptSchema, CmsPublicSchema, CmsIdSchema, cmsReadiness, cmsText,
  type CmsPayload, type CmsLocale, type CmsPublic, type CmsIssue, type AuthoredContent, type AuditRecord } from "@dance/schemas";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import type { AuthContext } from "../middleware/auth";
import { appendAudit } from "./audit";
import { assertApplicationWindow } from "./registrationPolicy";

type Db = Prisma.TransactionClient;
export function contentDigest(value: unknown): string {
  const normalize = (node: unknown): unknown => Array.isArray(node) ? node.map(normalize) : node && typeof node === "object"
    ? Object.fromEntries(Object.entries(node).sort(([a], [b]) => a.localeCompare(b)).map(([key, row]) => [key, normalize(row)])) : node;
  return createHash("sha256").update(JSON.stringify(normalize(value))).digest("hex");
}
export async function contentAdmin(db: Db, auth: AuthContext) {
  const account = await db.user.findFirst({ where: { id: auth.userId, active: true, emailVerified: true, sessionVersion: auth.sessionVersion,
    roles: { some: { eventId: null, removedAt: null, role: { key: "admin" } } } }, select: { id: true } });
  if (!account) throw new ForbiddenError();
}
export async function contentTransaction<T>(db: PrismaClient, work: (tx: Db) => Promise<T>) {
  try { return await db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002", "P2025"].includes(error.code)) throw new ConflictError("Content changed; compare before retrying", undefined, "concurrentChange"); throw error; }
}
export const receipt = (row: ContentOperation) => CmsReceiptSchema.parse({ operationId: row.operationId, documentId: row.documentId, kind: row.kind, version: row.version, revisionId: row.revisionId, createdAt: row.createdAt.toISOString() });
export const contentRequestDigest = (auth: AuthContext, documentId: string, kind: string, body: unknown) => contentDigest({ actorId: auth.userId, documentId, kind, body });
export async function replayContentOperation(db: Db, auth: AuthContext, documentId: string, kind: string, body: { operationId: string }) {
  const prior = await db.contentOperation.findUnique({ where: { operationId: body.operationId } });
  if (!prior) return null;
  if (prior.digest !== contentRequestDigest(auth, documentId, kind, body)) throw new ConflictError("Operation identity changed", undefined, "concurrentChange");
  return receipt(prior);
}
export async function documentRow(db: Db, id: string) {
  const row = await db.contentDocument.findUnique({ where: { id } });
  if (!row?.draftRevisionId) throw new NotFoundError("Content"); return row;
}
export function assetReferences(payload: CmsPayload) {
  const refs: { assetId: string; fieldPath: string }[] = [];
  const walk = (node: unknown, path: string) => {
    if (node && typeof node === "object" && "assetId" in node && typeof node.assetId === "string") refs.push({ assetId: node.assetId, fieldPath: path });
    else if (Array.isArray(node)) node.forEach((row, index) => walk(row, path ? `${path}.${index}` : String(index)));
    else if (node && typeof node === "object") Object.entries(node).forEach(([key, row]) => walk(row, path ? `${path}.${key}` : key));
  }; walk(payload, ""); return refs;
}
export async function validateContentReferences(db: Db, documentId: string, payload: CmsPayload, publishing = false): Promise<CmsIssue[]> {
  const issues = publishing ? cmsReadiness(payload) : [];
  for (const ref of assetReferences(payload)) {
    const asset = await db.publicAsset.findFirst({ where: { id: ref.assetId, documentId, ready: true, retiredAt: null, rights: { not: "REVOKED" } } });
    if (!asset) throw new ConflictError("Asset does not belong to this document or is unavailable", { field: ref.fieldPath }, "invalidConfiguration");
    if (publishing && asset.rights !== "APPROVED") issues.push({ path: ref.fieldPath, reason: "asset" });
  }
  if (payload.kind === "FESTIVAL_PORTAL") for (const row of payload.festivals) {
    if (!await db.festival.findFirst({ where: { id: row.festivalId, archivedAt: null } })) throw new ConflictError("Unknown festival", undefined, "invalidConfiguration");
  }
  return issues;
}
export async function saveRevision(db: Db, document: ContentDocument, payload: CmsPayload, actorId: string, increment = true) {
  if (document.kind !== payload.kind) throw new ConflictError("Wrong document kind", undefined, "invalidConfiguration");
  await validateContentReferences(db, document.id, payload);
  const previous = await db.contentRevision.aggregate({ where: { documentId: document.id }, _max: { number: true } });
  const revision = await db.contentRevision.create({ data: { documentId: document.id, actorId, number: (previous._max.number ?? 0) + 1, payload } });
  const refs = assetReferences(payload); if (refs.length) await db.contentRevisionAsset.createMany({ data: refs.map(ref => ({ ...ref, revisionId: revision.id })) });
  await db.contentDocument.update({ where: { id: document.id, version: document.version }, data: { draftRevisionId: revision.id, ...(increment && { version: { increment: 1 } }) } });
  return revision;
}
export async function canonicalFacts(db: Db, document: ContentDocument) {
  const edition = document.editionId ? await db.festivalEdition.findUnique({ where: { id: document.editionId }, include: { event: { include: { entryConfiguration: true, categories: true, ageGroups: true, formats: true } }, festival: true } }) : null;
  const event = edition?.event;
  const facts = event ? { eventId: event.id, startsAt: event.startsAt.toISOString(), endsAt: event.endsAt.toISOString(), timeZone: event.timeZone, venue: event.venue,
    registrationDeadline: event.registrationDeadline?.toISOString() ?? null, entrySettings: event.entryConfiguration?.settings ?? null } : null;
  const digest = contentDigest({ facts, categories: event?.categories.map(({ id, name }) => ({ id, name })).sort((a,b) => a.id.localeCompare(b.id)),
    ages: event?.ageGroups.map(({ id, name, minAge, maxAge }) => ({ id, name, minAge, maxAge })).sort((a,b) => a.id.localeCompare(b.id)),
    formats: event?.formats.map(({ id, name, minParticipants, maxParticipants, maxDurationSeconds }) => ({ id, name, minParticipants, maxParticipants, maxDurationSeconds })).sort((a,b) => a.id.localeCompare(b.id)) });
  let applicationAvailable = false;
  if (event) { try { assertApplicationWindow(event); applicationAvailable = true; } catch (error) { if (!(error instanceof ForbiddenError)) throw error; } }
  return { edition, facts, digest, applicationAvailable };
}
export async function contentDetail(db: Db, document: ContentDocument) {
  const draft = await db.contentRevision.findUniqueOrThrow({ where: { id: document.draftRevisionId! } });
  const { edition, facts } = await canonicalFacts(db, document);
  const assets = await db.publicAsset.findMany({ where: { documentId: document.id, OR: [{ ready: true }, { retiredAt: { not: null } }] }, orderBy: { createdAt: "desc" } });
  return CmsDocumentSchema.parse({ id: document.id, kind: document.kind, version: document.version, editionId: document.editionId, label: edition ? `${edition.festival.name} / ${edition.slug}` : document.kind,
    slug: edition?.slug ?? null, festivalSlug: edition?.festival.slug ?? null, archived: !!edition?.archivedAt, everPublished: edition?.everPublished ?? false,
    draft: { id: draft.id, number: draft.number, createdAt: draft.createdAt.toISOString(), payload: draft.payload }, publishedRevisionId: document.publishedRevisionId, assets: assets.map(row => ({ id: row.id, width: row.width, height: row.height, rights: row.rights, retired: !!row.retiredAt })), facts });
}
export async function contentOperation<B extends { operationId: string; expectedVersion: number }>(db: PrismaClient, auth: AuthContext, documentId: string, kind: string,
  body: B, action: AuditRecord["action"], work: (tx: Db, document: ContentDocument) => Promise<string | null>) {
  return contentTransaction(db, async tx => {
    await contentAdmin(tx, auth);
    const digest = contentRequestDigest(auth, documentId, kind, body);
    const prior = await replayContentOperation(tx, auth, documentId, kind, body); if (prior) return prior;
    const document = await documentRow(tx, documentId);
    if (document.version !== body.expectedVersion || document.version >= 2147483646) throw new ConflictError("Content version changed", undefined, "concurrentChange");
    if (document.editionId && (await canonicalFacts(tx, document)).edition?.archivedAt) throw new ConflictError("Edition is archived");
    const revisionId = await work(tx, document);
    // Each command increments exactly once; revision writes may already have done it.
    const current = await tx.contentDocument.findUniqueOrThrow({ where: { id: documentId } });
    const version = current.version === document.version ? (await tx.contentDocument.update({ where: { id: documentId, version: document.version }, data: { version: { increment: 1 } } })).version : current.version;
    await appendAudit(tx, { action, actor: { kind: "USER", userId: auth.userId }, targetType: "CONTENT_DOCUMENT", targetId: documentId,
      metadata: { documentId, operationId: body.operationId, revisionId, revision: version, ...("assetId" in body && { assetId: CmsIdSchema.parse(body.assetId) }) } });
    return receipt(await tx.contentOperation.create({ data: { operationId: body.operationId, actorId: auth.userId, documentId, kind, digest, version, revisionId } }));
  });
}
export async function projectContent(db: Db, document: ContentDocument, revisionId: string, locale: CmsLocale, preview = false): Promise<CmsPublic> {
  const revision = await db.contentRevision.findFirst({ where: { id: revisionId, documentId: document.id } });
  if (!revision) throw new NotFoundError("Content");
  const payload = CmsPayloadSchema.parse(revision.payload); const { edition, facts, digest, applicationAvailable } = await canonicalFacts(db, document);
  const policyChanged = !preview && !!facts && digest !== document.policyDigest;
  const fields: CmsPublic["fields"] = []; const links: CmsPublic["links"] = []; const images: CmsPublic["images"] = [];
  const text = (path: string, value: AuthoredContent | null) => { if (value) fields.push({ path, value: cmsText(value, locale) }); };
  const image = async (path: string, value: { assetId: string; alt: AuthoredContent | null; decorative: boolean } | null) => {
    if (!value) return;
    const row = await db.publicAsset.findFirst({ where: { id: value.assetId, documentId: document.id, ready: true, retiredAt: null, rights: preview ? { not: "REVOKED" } : "APPROVED" } });
    if (!row) throw new NotFoundError("Content");
    images.push({ path, image: { id: row.id, url: preview ? `/api/v1/content/documents/${document.id}/assets/${row.id}` : `/api/v1/public/assets/${row.id}`, width: row.width, height: row.height, alt: value.alt ? cmsText(value.alt, locale) : null, decorative: value.decorative } });
  };
  text("title", payload.title); text("introduction", payload.introduction); text("metadata", payload.metadata); text("contact.address", payload.contact.address);
  for (const row of payload.contact.links) links.push({ path: `contact.links.${row.id}`, title: cmsText(row.title, locale), url: row.url });
  const profiles: CmsPublic["profiles"] = []; const classes: CmsPublic["classes"] = []; const timetable: CmsPublic["timetable"] = [];
  if (payload.kind === "STUDIO_SITE") {
    text("about", payload.about); text("joining", payload.joining);
    for (const row of payload.teachers) { profiles.push({ id: row.id, name: row.name }); text(`teachers.${row.id}.biography`, row.biography); await image(`teachers.${row.id}.portrait`, row.portrait); }
    for (const row of payload.classes) { classes.push({ id: row.id, teacherIds: row.teacherIds }); for (const key of ["title", "style", "ages", "joining"] as const) text(`classes.${row.id}.${key}`, row[key]); }
    timetable.push(...payload.timetable.map(({ id: _id, ...row }) => row));
    for (const [index, row] of payload.media.entries()) await image(`media.${index}`, row);
  } else {
    await image("brand.artwork", payload.brand.artwork);
    if (payload.kind === "FESTIVAL_PORTAL") {
      for (const row of payload.festivals) text(`festivals.${row.festivalId}.summary`, row.summary);
      if (payload.studioUrl) links.push({ path: "studioUrl", title: cmsText(payload.title ?? { sourceLocale: payload.primaryLocale, sourceText: "Neposedõ", translations: {} }, locale), url: payload.studioUrl });
    } else {
      if (!facts) text("location", payload.location);
      if (!policyChanged) for (const row of payload.rules) { text(`rules.${row.id}.heading`, row.heading); row.paragraphs.forEach((paragraph, index) => text(`rules.${row.id}.${index}`, paragraph)); }
      for (const row of payload.judges) { profiles.push({ id: row.id, name: row.name }); text(`judges.${row.id}.biography`, row.biography); await image(`judges.${row.id}.portrait`, row.portrait); }
      for (const row of payload.results) if (row.reviewed) links.push({ path: `results.${row.id}`, title: cmsText(row.title, locale), url: row.url, result: { editionLabel: row.editionLabel, date: row.date, locale: row.locale } });
    }
  }
  let action: CmsPublic["action"] = { kind: "contact", email: payload.contact.email, phone: payload.contact.phone };
  if (payload.kind === "FESTIVAL_EDITION" && !policyChanged && (!facts || applicationAvailable) && payload.handoff.kind === "external" && payload.handoff.reviewed && Date.now() >= Date.parse(payload.handoff.availableFrom) && Date.now() < Date.parse(payload.handoff.availableUntil)) action = { kind: "external", url: payload.handoff.url };
  if (!preview && (edition?.archivedAt || edition?.festival.archivedAt)) throw new NotFoundError("Content");
  return CmsPublicSchema.parse({ kind: payload.kind, revisionId: revision.id, publishedAt: (document.publishedAt ?? revision.createdAt).toISOString(), requestedLocale: locale, primaryLocale: payload.primaryLocale,
    identity: edition ? { festivalSlug: edition.festival.slug, editionSlug: edition.slug } : null,
    fields, images, links, facts: facts ? { startsAt: facts.startsAt, endsAt: facts.endsAt, timeZone: facts.timeZone, venue: facts.venue, registrationDeadline: facts.registrationDeadline } : null,
    policyChanged, action, timetable, profiles, classes, brand: payload.kind === "STUDIO_SITE" ? null : payload.brand.accent,
    startsOn: payload.kind === "FESTIVAL_EDITION" && !facts ? payload.startsOn : null, endsOn: payload.kind === "FESTIVAL_EDITION" && !facts ? payload.endsOn : null });
}
