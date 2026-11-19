import type { Request, Response } from "express";
import { promises as fs } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { MusicCommandSchema, MusicConfigureSchema, MusicConfigurationSchema, MusicCreateSchema, MusicUploadSchema, MusicWorkspaceSchema, MusicReceiptSchema, MusicStateSchema, nextMusicState, IdSchema } from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError, AppError } from "../errors";
import { config } from "../config/env";
import { entryTransaction } from "../services/entryWorkflow";
import { appendAudit } from "../services/audit";
import { musicAuthority, musicAccess, musicPolicy, musicTrack, musicPerformance, musicDto, musicWindow, musicDigest, musicReplay, musicReceipt } from "../services/music";
import { musicLocation } from "../services/musicStorage";
import { inspectMusic } from "../services/musicAudio";

const OwnerSchema = z.object({ eventId: IdSchema, studioId: IdSchema });
const TrackParams = OwnerSchema.extend({ trackId: z.uuid() });
let processing = 0;
export class MusicController extends BaseController {
  private actor(req: Request) { if (!req.auth) throw new ForbiddenError(); return { id: req.auth.userId, organizer: req.auth.isAdmin, sessionVersion: req.auth.sessionVersion }; }
  async configure(req: Request, res: Response) {
    if (!this.isAdmin(req)) throw new ForbiddenError();
    const eventId = IdSchema.parse(req.params.eventId); const body = MusicConfigureSchema.parse(req.body);
    const result = await entryTransaction(this.prisma, async db => {
      await musicAuthority(db, this.actor(req));
      if (!await db.event.findUnique({ where: { id: eventId } })) throw new NotFoundError("Event");
      const current = await musicPolicy(db, eventId);
      if ((current?.revision ?? 0) !== body.expectedRevision) throw new ConflictError("Policy changed", undefined, "concurrentChange");
      const row = current ? await db.musicConfiguration.update({ where: { eventId, revision: body.expectedRevision }, data: { revision: { increment: 1 }, policy: body.policy } }) : await db.musicConfiguration.create({ data: { eventId, policy: body.policy } });
      await appendAudit(db, { action: "MUSIC_CONFIGURED", actor: { kind: "USER", userId: this.getUserId(req) }, targetType: "EVENT", targetId: eventId, eventId, metadata: { revision: row.revision } });
      return MusicConfigurationSchema.parse({ revision: row.revision, policy: row.policy, providerReady: !!config.music.root });
    }); res.json(result);
  }
  async read(req: Request, res: Response) {
    const owner = OwnerSchema.parse(req.params); const actor = this.actor(req);
    const result = await entryTransaction(this.prisma, async db => {
      const registration = await musicAccess(db, actor, owner); const policy = await musicPolicy(db, owner.eventId);
      const rows = await db.musicTrack.findMany({ where: { ...owner, OR: [{ performanceId: null }, { performance: { deletedAt: null } }] }, include: { currentVersion: true }, orderBy: { createdAt: "asc" } });
      return MusicWorkspaceSchema.parse({ eventName: registration.event.name, studioName: registration.studio.name, configuration: { revision: policy?.revision ?? 0, policy: policy?.policy ?? null, providerReady: !!config.music.root }, tracks: rows.map(musicDto), organizer: actor.organizer });
    }); res.setHeader("Cache-Control", "private, no-store"); res.json(result);
  }
  async create(req: Request, res: Response) {
    const owner = OwnerSchema.parse(req.params); const actor = this.actor(req); const body = MusicCreateSchema.parse(req.body);
    const digest = musicDigest(actor, owner, body);
    const result = await entryTransaction(this.prisma, async db => {
      const registration = await musicAccess(db, actor, owner);
      const replay = await musicReplay(db, body.operationId, digest, body.trackId); if (replay) { await musicTrack(db, owner, body.trackId); return replay; }
      musicWindow(registration.event.stage, (await musicPolicy(db, owner.eventId))?.policy);
      if (body.performanceId) await musicPerformance(db, owner, registration.id, body.performanceId);
      const row = await db.musicTrack.create({ data: { id: body.trackId, ...owner, registrationId: registration.id, performanceId: body.performanceId ?? null }, include: { currentVersion: true } });
      return musicReceipt(db, actor, owner, row, body.operationId, digest, "CREATE");
    }); res.status(201).json(result);
  }
  async command(req: Request, res: Response) {
    const { trackId, ...owner } = TrackParams.parse(req.params); const actor = this.actor(req); const body = MusicCommandSchema.parse(req.body);
    if (body.action === "REPLACE") throw new ValidationError("Use the version upload endpoint");
    if (["ACCEPT", "REOPEN"].includes(body.action) && !actor.organizer) throw new ForbiddenError();
    const digest = musicDigest(actor, owner, { trackId, body });
    const result = await entryTransaction(this.prisma, async db => {
      const registration = await musicAccess(db, actor, owner); const row = await musicTrack(db, owner, trackId);
      const replay = await musicReplay(db, body.operationId, digest, trackId); if (replay) return replay;
      if (row.revision !== body.expectedRevision || (body.versionId && body.versionId !== row.currentVersionId)) throw new ConflictError("Music changed", undefined, "concurrentChange");
      const policy = await musicPolicy(db, owner.eventId);
      if (body.action === "REOPEN") {
        if (!policy || !body.until || Date.parse(body.until) <= Date.now() || Date.parse(body.until) > Date.parse(policy.policy.exceptionUntil) || ["FINALIZED", "ENDED", "CANCELLED"].includes(registration.event.stage)) throw new ForbiddenError("Invalid correction window", "stageLocked");
      } else if (body.action !== "ACCEPT") musicWindow(registration.event.stage, policy?.policy, row.correctionUntil);
      if (body.action === "CONFIRM" || body.action === "ACCEPT") {
        const version = row.currentVersion;
        if (!policy || !version || !policy.policy.allowedMime.some(value => value === version.detectedMime) || version.byteLength > policy.policy.maxBytes || version.durationMs > policy.policy.maxDurationMs) throw new ConflictError("Current file does not meet music policy", undefined, "invalidConfiguration");
      }
      const state = nextMusicState(MusicStateSchema.parse(row.state), body.action, !!row.currentVersion, actor.organizer);
      if (!state) throw new ConflictError("Music is locked", undefined, "stageLocked");
      if (body.performanceId) { if (row.performanceId) throw new ConflictError("Track already attached"); await musicPerformance(db, owner, registration.id, body.performanceId); }
      const updated = await db.musicTrack.update({ where: { id: trackId, revision: body.expectedRevision }, data: { state, revision: { increment: 1 }, ...(body.performanceId && { performanceId: body.performanceId }), ...(body.action === "REOPEN" && { correctionUntil: new Date(z.iso.datetime().parse(body.until)) }) }, include: { currentVersion: true } });
      return musicReceipt(db, actor, owner, updated, body.operationId, digest, body.action, body.reason ?? null);
    }); res.json(result);
  }
  // Runs before multipart parsing and again at commit: denied requests cannot stage bytes.
  async prepare(req: Request) {
    if (!config.music.root) throw new ConflictError("Music storage is disabled", undefined, "invalidConfiguration");
    const { trackId, ...owner } = TrackParams.parse(req.params); const actor = this.actor(req);
    const body = MusicUploadSchema.parse({ operationId: req.headers["x-operation-id"], expectedRevision: req.headers["x-music-revision"], policyRevision: req.headers["x-policy-revision"] });
    return entryTransaction(this.prisma, async db => {
      const registration = await musicAccess(db, actor, owner); const row = await musicTrack(db, owner, trackId); const policy = await musicPolicy(db, owner.eventId);
      // Exact upload retries still parse/hash bytes to verify actor/body identity.
      const replay = await db.musicOperation.findUnique({ where: { operationId: body.operationId } });
      if (!replay) {
        if (!policy || body.policyRevision !== policy.revision) throw new ConflictError("Music policy changed", undefined, "concurrentChange");
        musicWindow(registration.event.stage, policy.policy, row.correctionUntil); if (row.state !== "DRAFT" || row.revision !== body.expectedRevision) throw new ConflictError("Music changed", undefined, "concurrentChange");
      } else if (replay.actorId !== actor.id || replay.trackId !== trackId || replay.action !== "REPLACE") throw new ConflictError("Operation changed", undefined, "concurrentChange");
      const stage = await db.musicUpload.create({ data: { id: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } });
      const receiptVersion = replay ? MusicReceiptSchema.parse(replay.response).track.currentVersion : null;
      const maxBytes = receiptVersion?.byteLength ?? policy?.policy.maxBytes;
      if (!maxBytes) throw new ConflictError("Music policy unavailable", undefined, "invalidConfiguration");
      return { key: stage.id, maxBytes };
    });
  }
  async upload(req: Request, res: Response) {
    if (!req.file) throw new ValidationError("Choose an audio file", undefined, "uploadInvalid");
    if (processing >= 2) throw new AppError("Music processing busy; retry", 503);
    const { trackId, ...owner } = TrackParams.parse(req.params); const actor = this.actor(req);
    const body = MusicUploadSchema.parse({ operationId: req.headers["x-operation-id"], expectedRevision: req.headers["x-music-revision"], policyRevision: req.headers["x-policy-revision"] });
    const key = z.uuid().parse(req.file.filename); const safeName = z.string().min(1).max(255).regex(/^[^\u0000-\u001f\u007f/\\]+$/u);
    let displayName = safeName.parse(req.file.originalname);
    if (req.headers["x-display-name"] !== undefined) {
      try { displayName = safeName.parse(decodeURIComponent(z.string().max(3072).parse(req.headers["x-display-name"]))); }
      catch { throw new ValidationError("Invalid display filename", undefined, "uploadInvalid"); }
    }
    processing++;
    try {
      const bytes = await fs.readFile(musicLocation(key)); const metadata = inspectMusic(bytes); const sha256 = createHash("sha256").update(bytes).digest("hex");
      const digest = musicDigest(actor, owner, { trackId, body, displayName, sha256 });
      const result = await entryTransaction(this.prisma, async db => {
        const registration = await musicAccess(db, actor, owner); const row = await musicTrack(db, owner, trackId);
        const replay = await musicReplay(db, body.operationId, digest, trackId); if (replay) return replay;
        const policy = await musicPolicy(db, owner.eventId); const stage = await db.musicUpload.findUnique({ where: { id: key } });
        if (!stage || stage.deleting || stage.expiresAt.getTime() <= Date.now() || !policy || body.policyRevision !== policy.revision || row.revision !== body.expectedRevision) throw new ConflictError("Upload or policy changed", undefined, "concurrentChange");
        musicWindow(registration.event.stage, policy.policy, row.correctionUntil);
        if (row.state !== "DRAFT") throw new ConflictError("Music locked", undefined, "stageLocked");
        if (!policy.policy.allowedMime.includes(metadata.detectedMime)) throw new ValidationError("Audio type not allowed", undefined, "uploadType");
        if (bytes.length > policy.policy.maxBytes) throw new ValidationError("Audio too large", undefined, "uploadTooLarge");
        if (metadata.durationMs > policy.policy.maxDurationMs) throw new ValidationError("Audio exceeds duration limit", undefined, "invalidConfiguration");
        const version = await db.musicVersion.create({ data: { trackId, objectKey: key, displayName, sha256, byteLength: bytes.length, ...metadata, uploadedBy: actor.id } });
        const updated = await db.musicTrack.update({ where: { id: trackId, revision: body.expectedRevision }, data: { currentVersionId: version.id, revision: { increment: 1 } }, include: { currentVersion: true } });
        await db.musicUpload.delete({ where: { id: key } });
        return musicReceipt(db, actor, owner, updated, body.operationId, digest, "REPLACE");
      }); res.json(result);
    } finally { processing--; }
    // Uncommitted staging (including exact retry bytes) is retired by the worker.
    // Never compensate an uncertain database response by deleting retained bytes.
  }
  async bytes(req: Request, res: Response) {
    const { trackId, ...owner } = TrackParams.parse(req.params); const versionId = z.uuid().parse(req.params.versionId);
    const row = await entryTransaction(this.prisma, async db => { await musicAccess(db, this.actor(req), owner); return musicTrack(db, owner, trackId); });
    if (!row.currentVersion || row.currentVersion.id !== versionId) throw new NotFoundError("Current music version");
    res.set({ "Cache-Control": "private, no-store", "Content-Type": row.currentVersion.detectedMime, "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" });
    res.sendFile(musicLocation(row.currentVersion.objectKey), { dotfiles: "allow", cacheControl: false, lastModified: false, etag: false }, error => { if (error && !res.headersSent) res.status(404).end(); });
  }
}
