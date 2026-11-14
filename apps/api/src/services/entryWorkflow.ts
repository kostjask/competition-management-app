import { Prisma, type PrismaClient } from "@prisma/client";
import { EntrySettingsSchema, EntryGrantSchema, EntryManifestSchema, PerformanceSnapshotSchema, ageOnDate, eventAgeDate,
  BASIC_ENTRY_FIELDS, FINAL_ENTRY_FIELDS, type EntryField, type EntryKind, type EntryIssue, type EntryManifest, type EntrySettings } from "@dance/schemas";
import { ConflictError, ForbiddenError } from "../errors";

export async function entrySettings(db: Prisma.TransactionClient, eventId: string) {
  const row = await db.entryConfiguration.findUnique({ where: { eventId } });
  return row ? { revision: row.revision, settings: EntrySettingsSchema.parse(row.settings) } : null;
}
export async function requireMutableEntryRules(db: Prisma.TransactionClient, eventId: string) {
  if (await entrySettings(db, eventId) && await db.studioEventRegistration.count({ where: { eventId } }) > 0) {
    throw new ConflictError("Competition rules are frozen after registration starts", undefined, "stageLocked");
  }
}

const relevant = (kind: EntryKind, fields: readonly EntryField[]) => fields.filter(field =>
  (kind === "BASIC" ? BASIC_ENTRY_FIELDS : [...BASIC_ENTRY_FIELDS, ...FINAL_ENTRY_FIELDS]).includes(field));

/** The same studio-wide guard applies to entry and roster writes, including indirect edits. */
export async function guardEntryWrite(db: Prisma.TransactionClient, eventId: string, studioId: string,
  fields: readonly EntryField[], admin: boolean, performanceId?: string) {
  const config = await entrySettings(db, eventId);
  if (!config || admin) return;
  const registration = await db.studioEventRegistration.findUniqueOrThrow({ where: { studioId_eventId: { studioId, eventId } } });
  const rows = await db.entryCheckpoint.findMany({ where: { registrationId: registration.id } });
  const now = Date.now();
  const allows = (value: Prisma.JsonValue | null, selected: readonly EntryField[]) => {
    const parsed = EntryGrantSchema.safeParse(value);
    return parsed.success && Date.parse(parsed.data.until) > now &&
      selected.every(field => parsed.data.fields.includes(field)) &&
      (parsed.data.performanceIds === null || (performanceId !== undefined && parsed.data.performanceIds.includes(performanceId) && !selected.includes("entries") && !selected.includes("roster")));
  };
  const finalGrant = rows.find(row => row.kind === "FINAL")?.grant ?? null;
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId }, select: { stage: true } });
  for (const kind of ["BASIC", "FINAL"] as const) {
    const selected = relevant(kind, fields);
    if (!selected.length || !config.settings[kind === "BASIC" ? "basic" : "final"].enabled) continue;
    const head = rows.find(row => row.kind === kind);
    const deadline = config.settings[kind === "BASIC" ? "basic" : "final"].deadline;
    const locked = head?.earlyLocked || (deadline !== null && Date.parse(deadline) <= now) || ["FINALIZED", "ENDED", "CANCELLED"].includes(event.stage);
    if (locked && !allows(head?.grant ?? null, selected) && !(kind === "BASIC" && allows(finalGrant, selected))) {
      throw new ForbiddenError("This part of the studio form is locked; contact the organizer", "stageLocked");
    }
  }
}

export async function markEntryChanged(db: Prisma.TransactionClient, eventId: string, studioId: string, fields: readonly EntryField[]) {
  if (!await entrySettings(db, eventId)) return;
  const registration = await db.studioEventRegistration.findUniqueOrThrow({ where: { studioId_eventId: { studioId, eventId } } });
  for (const kind of ["BASIC", "FINAL"] as const) if (relevant(kind, fields).length) {
    await db.entryCheckpoint.upsert({ where: { registrationId_kind: { registrationId: registration.id, kind } },
      create: { registrationId: registration.id, kind }, update: { revision: { increment: 1 }, status: "DRAFT" } });
  }
}

export async function currentEntryManifest(db: Prisma.TransactionClient, eventId: string, studioId: string, settings: EntrySettings): Promise<EntryManifest> {
  const entries = await db.performance.findMany({ where: { eventId, studioId, deletedAt: null }, orderBy: { id: "asc" },
    include: { studio: true, event: true, category: true, ageGroup: true, format: true,
      participants: { include: { dancer: true }, orderBy: { dancerId: "asc" } } } });
  const roster = await db.dancer.findMany({ where: { studioId, deletedAt: null }, orderBy: { id: "asc" } });
  return EntryManifestSchema.parse({ settings, roster: roster.map(d => ({ id: d.id, firstName: d.firstName, lastName: d.lastName, birthDate: d.birthDate.toISOString().slice(0, 10) })),
    entries: entries.map(p => ({ id: p.id, revision: p.revision, snapshot: PerformanceSnapshotSchema.parse({
      policyVersion: 3, eventId, studioId, registrationId: p.registrationId, studioName: p.studio.name,
      title: p.title, teacher: p.teacher, author: p.author, durationSec: p.durationSec, orderOnStage: p.orderOnStage,
      timeZone: p.event.timeZone, ageDate: eventAgeDate(p.event.startsAt.toISOString(), p.event.timeZone), archived: false,
      configuration: { category: p.category && { id: p.category.id, name: p.category.name },
        ageGroup: p.ageGroup && { id: p.ageGroup.id, name: p.ageGroup.name, minAge: p.ageGroup.minAge, maxAge: p.ageGroup.maxAge },
        format: p.format && { id: p.format.id, name: p.format.name, minParticipants: p.format.minParticipants, maxParticipants: p.format.maxParticipants, maxDurationSeconds: p.format.maxDurationSeconds } },
      participants: p.participants.map(({ dancer: d }) => ({ dancerId: d.id, firstName: d.firstName, lastName: d.lastName, birthDate: d.birthDate.toISOString().slice(0, 10) })),
    }) })) });
}

export function entryIssues(manifest: EntryManifest, kind: EntryKind): EntryIssue[] {
  const issues: EntryIssue[] = [];
  if (!manifest.entries.length) issues.push({ performanceId: null, field: "entries", reason: "required" });
  const activeDancers = new Set(manifest.roster.map(d => d.id));
  for (const { id, snapshot: p } of manifest.entries) {
    const add = (field: EntryField, reason: EntryIssue["reason"]) => issues.push({ performanceId: id, field, reason });
    if (!p.title) add("title", "required");
    for (const key of ["category", "ageGroup", "format"] as const) if (!p.configuration[key]) add(`${key}Id`, "required");
    const { category, ageGroup, format } = p.configuration;
    const nomination = manifest.settings.nominations.find(row => row.categoryId === category?.id && row.ageGroupId === ageGroup?.id && row.formatId === format?.id);
    if (manifest.settings.nominations.length && !nomination && category && ageGroup && format) add("categoryId", "configuration");
    if (kind === "BASIC") continue;
    if (p.durationSec === null) add("durationSec", "required");
    if (manifest.settings.requireTeacher && !p.teacher) add("teacher", "required");
    if (manifest.settings.requireAuthor && !p.author) add("author", "required");
    if (!p.participants.length) add("participants", "required");
    if (p.participants.some(d => !activeDancers.has(d.dancerId))) add("participants", "participants");
    if (format) {
      const maxCount = nomination ? nomination.maxParticipants : format.maxParticipants;
      if (p.participants.length < format.minParticipants || (maxCount !== null && p.participants.length > maxCount)) add("participants", "count");
      if (p.durationSec !== null && p.durationSec > (nomination?.maxDurationSeconds ?? format.maxDurationSeconds)) add("durationSec", "duration");
    }
    if (ageGroup) {
      let older = 0; let invalid = false; let invalidBirthDate = false;
      for (const dancer of p.participants) {
        try {
          const age = ageOnDate(dancer.birthDate, p.ageDate);
          if (!manifest.settings.allowYounger && age < ageGroup.minAge) invalid = true;
          if (ageGroup.maxAge !== null && age > ageGroup.maxAge) older++;
        } catch { invalidBirthDate = true; }
      }
      if (invalid || older * 100 > p.participants.length * manifest.settings.olderPercent) add("participants", "age");
      if (invalidBirthDate) add("participants", "birthDate");
    }
  }
  return issues;
}

export async function entryTransaction<T>(db: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  try { return await db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034", "P2025", "P2003"].includes(error.code)) {
      throw new ConflictError("Entry data changed; reload or reconcile the same operation", undefined, "concurrentChange");
    }
    throw error;
  }
}
