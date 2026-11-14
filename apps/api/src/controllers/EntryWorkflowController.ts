import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { EntrySettingsSchema, EntryConfigurationSchema, EntryConfigurationBodySchema, EventIdParamsSchema,
  EntryParamsSchema, EntryCheckpointParamsSchema, EntryCommandSchema, EntryReviewSchema, EntryReceiptSchema,
  EntryGrantSchema, BASIC_ENTRY_FIELDS, FINAL_ENTRY_FIELDS, type EntryKind } from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import { appendAudit } from "../services/audit";
import { entrySettings, entryTransaction, currentEntryManifest, entryIssues, guardEntryWrite } from "../services/entryWorkflow";

export class EntryWorkflowController extends BaseController {
  private admin(req: Request) { if (!this.isAdmin(req)) throw new ForbiddenError(); }
  private async access(req: Request, db: Prisma.TransactionClient, eventId: string, studioId: string) {
    if (!this.isAdmin(req) && !this.hasPermission(req, "performance.manage", eventId) && !this.hasPermission(req, "performance.manage", null)) throw new ForbiddenError();
    const studio = await db.studio.findFirst({ where: { id: studioId, eventId, deletedAt: null },
      include: { representatives: { where: { userId: this.getUserId(req), active: true } }, registrations: { where: { eventId } } } });
    if (!studio) throw new NotFoundError("Studio", studioId);
    const registration = studio.registrations[0];
    if (!registration) throw new NotFoundError("Registration");
    if (!this.isAdmin(req) && (studio.approvalStatus !== "APPROVED" || registration.status !== "APPROVED" || !studio.representatives.length)) throw new ForbiddenError();
    return registration;
  }

  async configuration(req: Request, res: Response) {
    this.admin(req);
    const { eventId } = EventIdParamsSchema.parse(req.params);
    if (!await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })) throw new NotFoundError("Event", eventId);
    const config = await entrySettings(this.prisma, eventId);
    res.json(EntryConfigurationSchema.parse({ revision: config?.revision ?? 0, settings: config?.settings ?? null,
      frozen: await this.prisma.studioEventRegistration.count({ where: { eventId } }) > 0 }));
  }

  async configure(req: Request, res: Response) {
    this.admin(req);
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const body = EntryConfigurationBodySchema.parse(req.body);
    const result = await entryTransaction(this.prisma, async db => {
      if (!await db.event.findUnique({ where: { id: eventId }, select: { id: true } })) throw new NotFoundError("Event", eventId);
      const current = await entrySettings(db, eventId);
      if ((current?.revision ?? 0) !== body.expectedRevision) throw new ConflictError("Entry setup changed", undefined, "concurrentChange");
      const frozen = await db.studioEventRegistration.count({ where: { eventId } }) > 0;
      // New options and their nomination references commit with the policy, never as partial setup.
      for (const row of body.options?.categories ?? []) {
        const existing = await db.danceCategory.findUnique({ where: { id: row.id } });
        if (existing ? existing.eventId !== eventId || existing.name !== row.name : frozen) throw new ConflictError("Option changed or rules are frozen", undefined, "invalidConfiguration");
        if (!existing) await db.danceCategory.create({ data: { ...row, eventId } });
      }
      for (const row of body.options?.ages ?? []) {
        const existing = await db.ageGroup.findUnique({ where: { id: row.id } });
        if (existing ? existing.eventId !== eventId || existing.name !== row.name || existing.minAge !== row.minAge || existing.maxAge !== (row.maxAge ?? null) : frozen) throw new ConflictError("Option changed or rules are frozen", undefined, "invalidConfiguration");
        if (!existing) await db.ageGroup.create({ data: { ...row, eventId, maxAge: row.maxAge ?? null } });
      }
      for (const row of body.options?.formats ?? []) {
        const existing = await db.danceFormat.findUnique({ where: { id: row.id } });
        if (existing ? existing.eventId !== eventId || existing.name !== row.name || existing.minParticipants !== row.minParticipants || existing.maxParticipants !== row.maxParticipants || existing.maxDurationSeconds !== row.maxDurationSeconds : frozen) throw new ConflictError("Option changed or rules are frozen", undefined, "invalidConfiguration");
        if (!existing) await db.danceFormat.create({ data: { ...row, eventId } });
      }
      const policy = (value: typeof body.settings) => JSON.stringify({ ...value,
        basic: { enabled: value.basic.enabled }, final: { enabled: value.final.enabled } });
      if (frozen && (!current || policy(current.settings) !== policy(body.settings))) throw new ConflictError("Configure competition rules before registration starts", undefined, "stageLocked");
      const categoryIds = [...new Set(body.settings.nominations.map(row => row.categoryId))];
      const ageIds = [...new Set(body.settings.nominations.map(row => row.ageGroupId))];
      const formatIds = [...new Set(body.settings.nominations.map(row => row.formatId))];
      const [categories, ages, formats] = await Promise.all([
        db.danceCategory.findMany({ where: { eventId, id: { in: categoryIds } }, select: { id: true } }),
        db.ageGroup.findMany({ where: { eventId, id: { in: ageIds } }, select: { id: true } }),
        db.danceFormat.findMany({ where: { eventId, id: { in: formatIds } }, select: { id: true, minParticipants: true } }),
      ]);
      const formatById = new Map(formats.map(row => [row.id, row]));
      if (categories.length !== categoryIds.length || ages.length !== ageIds.length || formats.length !== formatIds.length ||
        body.settings.nominations.some(row => row.maxParticipants !== null && row.maxParticipants < (formatById.get(row.formatId)?.minParticipants ?? Infinity))) {
        throw new ConflictError("Invalid nomination relationship", undefined, "invalidConfiguration");
      }
      const saved = current ? await db.entryConfiguration.update({ where: { eventId, revision: body.expectedRevision },
        data: { settings: body.settings, revision: { increment: 1 } } }) : await db.entryConfiguration.create({ data: { eventId, settings: body.settings } });
      await appendAudit(db, { action: "ENTRY_CONFIGURED", actor: { kind: "USER", userId: this.getUserId(req) }, targetType: "EVENT", targetId: eventId, eventId, metadata: { revision: saved.revision } });
      return EntryConfigurationSchema.parse({ revision: saved.revision, settings: body.settings, frozen });
    });
    res.json(result);
  }

  async read(req: Request, res: Response) {
    const { eventId, studioId } = EntryParamsSchema.parse(req.params);
    const result = await entryTransaction(this.prisma, async db => {
      const registration = await this.access(req, db, eventId, studioId);
      const config = await entrySettings(db, eventId);
      if (!config) return EntryReviewSchema.parse({ studioId, checkpoints: [] });
      const manifest = await currentEntryManifest(db, eventId, studioId, config.settings);
      const heads = await db.entryCheckpoint.findMany({ where: { registrationId: registration.id }, include: { receipts: { orderBy: { revision: "desc" } } } });
      const finalHead = heads.find(head => head.kind === "FINAL");
      const finalGrantResult = EntryGrantSchema.safeParse(finalHead?.grant);
      const finalGrant = finalGrantResult.success && Date.parse(finalGrantResult.data.until) > Date.now() ? finalGrantResult.data : null;
      const finalLocksBasic = config.settings.final.enabled && (finalHead?.earlyLocked === true || (config.settings.final.deadline !== null && Date.parse(config.settings.final.deadline) <= Date.now()));
      return EntryReviewSchema.parse({ studioId, checkpoints: (["BASIC", "FINAL"] as const).map(kind => {
        const row = heads.find(head => head.kind === kind);
        const window = config.settings[kind === "BASIC" ? "basic" : "final"];
        const grant = EntryGrantSchema.safeParse(row?.grant);
        const activeGrant = grant.success && Date.parse(grant.data.until) > Date.now() ? grant.data : null;
        const inheritedGrant = kind === "BASIC" && finalGrant && finalGrant.fields.some(field => BASIC_ENTRY_FIELDS.includes(field)) ? { ...finalGrant, fields: finalGrant.fields.filter(field => BASIC_ENTRY_FIELDS.includes(field)) } : null;
        const blockedByFinal = kind === "BASIC" && finalLocksBasic && inheritedGrant === null;
        return { kind, revision: row?.revision ?? 0, status: row?.status ?? "DRAFT", enabled: window.enabled,
          locked: blockedByFinal || ((row?.earlyLocked === true || (window.deadline !== null && Date.parse(window.deadline) <= Date.now())) && activeGrant === null && inheritedGrant === null),
          deadline: window.deadline, grant: blockedByFinal ? null : activeGrant ?? inheritedGrant, issues: entryIssues(manifest, kind),
          receipts: (row?.receipts ?? []).filter(receipt => this.isAdmin(req) || receipt.action !== "REOPEN" || receipt.visible)
            .map(receipt => this.receipt(receipt, kind, this.isAdmin(req))) };
      }) });
    });
    res.json(result);
  }

  private receipt(row: { id: string; revision: number; action: string; createdAt: Date; reason: string | null; visible: boolean; manifest: Prisma.JsonValue }, kind: EntryKind, admin: boolean) {
    return EntryReceiptSchema.parse({ id: row.id, revision: row.revision, action: row.action, kind, createdAt: row.createdAt.toISOString(),
      actorKind: "USER", reason: admin || row.visible ? row.reason : null, visible: row.visible, manifest: row.manifest });
  }

  async command(req: Request, res: Response) {
    const { eventId, studioId, kind } = EntryCheckpointParamsSchema.parse(req.params);
    const body = EntryCommandSchema.parse(req.body);
    if (body.action !== "SUBMIT" || body.exception) this.admin(req);
    const digest = createHash("sha256").update(JSON.stringify([this.getUserId(req), eventId, studioId, kind, body])).digest("hex");
    const result = await entryTransaction(this.prisma, async db => {
      const registration = await this.access(req, db, eventId, studioId);
      const existing = await db.entryReceipt.findUnique({ where: { operationId: body.operationId }, include: { checkpoint: true } });
      if (existing) {
        if (existing.digest !== digest || existing.checkpoint.registrationId !== registration.id || existing.checkpoint.kind !== kind) throw new ConflictError("Operation ID changed", undefined, "concurrentChange");
        return this.receipt(existing, kind, this.isAdmin(req));
      }
      const config = await entrySettings(db, eventId);
      if (!config) throw new ConflictError("Configure entry checkpoints first", undefined, "invalidConfiguration");
      if (!config.settings[kind === "BASIC" ? "basic" : "final"].enabled) throw new ConflictError("This checkpoint is disabled", undefined, "stageLocked");
      const head = await db.entryCheckpoint.findUnique({ where: { registrationId_kind: { registrationId: registration.id, kind } } });
      if ((head?.revision ?? 0) !== body.expectedRevision) throw new ConflictError("Studio form changed; refresh and compare", undefined, "concurrentChange");
      const manifest = await currentEntryManifest(db, eventId, studioId, config.settings);
      const fields = kind === "BASIC" ? BASIC_ENTRY_FIELDS : [...BASIC_ENTRY_FIELDS, ...FINAL_ENTRY_FIELDS];
      if (kind === "BASIC") manifest.roster = [];
      if (!this.isAdmin(req)) {
        // Submission consumes a grant but does not need permission for every field in a partial reopening.
        const grant = EntryGrantSchema.safeParse(head?.grant);
        const window = config.settings[kind === "BASIC" ? "basic" : "final"];
        if (head?.earlyLocked || (window.deadline !== null && Date.parse(window.deadline) <= Date.now())) {
          if (!grant.success || Date.parse(grant.data.until) <= Date.now()) throw new ForbiddenError("Contact the organizer to reopen this form", "stageLocked");
        } else await guardEntryWrite(db, eventId, studioId, kind === "BASIC" ? ["title"] : ["roster"], false);
      }
      if (body.action === "ACCEPT" && head?.status !== "REVIEW_PENDING") throw new ConflictError("Submit the current studio form before accepting it");
      const blockers = entryIssues(manifest, kind);
      if (body.action !== "REOPEN" && blockers.some(issue => !body.exception || !["age", "count", "duration"].includes(issue.reason))) throw new ConflictError("Resolve the checkpoint's blockers before confirming", undefined, "invalidConfiguration");
      if (body.grant) {
        if (Date.parse(body.grant.until) <= Date.now() || body.grant.fields.some(field => !fields.includes(field)) ||
          (body.grant.performanceIds !== null && (body.grant.fields.includes("roster") || body.grant.fields.includes("entries") || body.grant.performanceIds.some(id => !manifest.entries.some(entry => entry.id === id))))) {
          throw new ConflictError("Correction scope must name current entries and a future deadline", undefined, "invalidConfiguration");
        }
      }
      // Pin freshly captured sources, including roster/configuration changes since the draft save.
      for (const entry of manifest.entries) {
        const saved = await db.performance.update({ where: { id: entry.id, revision: entry.revision }, data: { revision: { increment: 1 } }, select: { revision: true } });
        entry.revision = saved.revision;
        await db.$executeRaw`SELECT capture_performance_revision(${entry.id}, 'CHECKPOINT', ${this.getUserId(req)})`;
      }
      const status = body.action === "ACCEPT" ? "ACCEPTED" : body.action === "REOPEN" ? "REQUIRES_CHANGES" : "REVIEW_PENDING";
      const savedHead = await db.entryCheckpoint.upsert({ where: { registrationId_kind: { registrationId: registration.id, kind } },
        create: { registrationId: registration.id, kind, status, earlyLocked: true, grant: body.grant ?? Prisma.DbNull },
        update: { revision: { increment: 1 }, status, earlyLocked: true, grant: body.grant ?? Prisma.DbNull } });
      const receipt = await db.entryReceipt.create({ data: { checkpointId: savedHead.id, revision: savedHead.revision,
        action: body.action, actorId: this.getUserId(req), operationId: body.operationId, digest,
        reason: body.reason ?? null, visible: body.visible, manifest } });
      await appendAudit(db, { action: body.action === "ACCEPT" ? "ENTRY_ACCEPTED" : body.action === "REOPEN" ? "ENTRY_REOPENED" : "ENTRY_SUBMITTED",
        actor: { kind: "USER", userId: this.getUserId(req) }, targetType: "ENTRY_CHECKPOINT", targetId: savedHead.id, studioId, eventId, metadata: { revision: savedHead.revision } });
      return this.receipt(receipt, kind, this.isAdmin(req));
    });
    res.json(result);
  }
}
