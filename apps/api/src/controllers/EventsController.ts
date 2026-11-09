import type { Request, Response } from "express";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AuthoredContentSchema, CreateEventBodySchema, UpdateEventBodySchema, EventIdParamsSchema, EventSchema, eventSetupBlockers, type CreateEventInput, type UpdateEventInput } from "@dance/schemas";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from "../errors";
import { appendAudit } from "../services/audit";
import { assertStageTransition } from "../services/registrationPolicy";
import { BaseController } from "./BaseController";

const eventSelect = {
  timeZone: true, registrationDeadline: true, id: true, name: true, startsAt: true, endsAt: true, stage: true, createdAt: true,
  venue: true, country: true, city: true, description: true, descriptionSourceLocale: true, descriptionTranslations: true,
  organizerEmail: true, organizerPhone: true, revision: true, creationDigest: true,
  maxStudios: true, maxPerformances: true, imageUrl: true,
} satisfies Prisma.EventSelect;
type EventRecord = Prisma.EventGetPayload<{ select: typeof eventSelect }>;
function serialize(event: EventRecord) {
  const description = event.descriptionSourceLocale === null ? null : AuthoredContentSchema.parse({
    sourceLocale: event.descriptionSourceLocale, sourceText: event.description, translations: event.descriptionTranslations,
  });
  const result = EventSchema.safeParse({
    timeZone: event.timeZone, registrationDeadline: event.registrationDeadline?.toISOString() ?? null,
    id: event.id, name: event.name, startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(), stage: event.stage, createdAt: event.createdAt.toISOString(),
    venue: event.venue, country: event.country, city: event.city, description,
    unclassifiedDescription: event.descriptionSourceLocale === null ? event.description : null,
    organizerEmail: event.organizerEmail, organizerPhone: event.organizerPhone, revision: event.revision,
    maxStudios: event.maxStudios, maxPerformances: event.maxPerformances, imageUrl: event.imageUrl,
  });
  if (!result.success) throw new InternalServerError();
  return result.data;
}
function contentData(content: UpdateEventInput["description"]) {
  return content === undefined ? {} : {
    description: content?.sourceText ?? null, descriptionSourceLocale: content?.sourceLocale ?? null,
    descriptionTranslations: content?.translations ?? {},
  };
}
function setupFields(body: CreateEventInput | UpdateEventInput) {
  return {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.stage !== undefined && { stage: body.stage }),
    ...(body.timeZone !== undefined && { timeZone: body.timeZone }),
    ...(body.venue !== undefined && { venue: body.venue }),
    ...(body.country !== undefined && { country: body.country }),
    ...(body.city !== undefined && { city: body.city }),
    ...(body.organizerEmail !== undefined && { organizerEmail: body.organizerEmail }),
    ...(body.organizerPhone !== undefined && { organizerPhone: body.organizerPhone }),
    ...(body.maxStudios !== undefined && { maxStudios: body.maxStudios }),
    ...(body.maxPerformances !== undefined && { maxPerformances: body.maxPerformances }),
    ...contentData(body.description),
  };
}
function assertReady(event: EventRecord) {
  const blockers = eventSetupBlockers(serialize(event));
  if (blockers.length) throw new ZodError(blockers.map(field => ({ code: "custom", path: [field], message: "Complete event setup", params: { reason: "invalid" } })));
}
function matchesRetry(current: EventRecord, body: UpdateEventInput) {
  const dto = serialize(current);
  if (current.revision !== body.expectedRevision + 1) return false;
  return (Object.keys(body) as (keyof UpdateEventInput)[]).every(key => {
    if (key === "expectedStage" || key === "expectedRevision") return true;
    const value = body[key];
    if (key === "startsAt" || key === "endsAt" || key === "registrationDeadline") {
      return value === null ? dto[key] === null : typeof value === "string" && new Date(value).toISOString() === dto[key];
    }
    if (key === "description") {
      const wanted = body.description;
      return wanted === null ? dto.description === null && dto.unclassifiedDescription === null :
        wanted !== undefined && dto.description !== null && wanted.sourceLocale === dto.description.sourceLocale && wanted.sourceText === dto.description.sourceText &&
        (["et", "en", "ru"] as const).every(locale => wanted.translations[locale] === dto.description?.translations[locale]);
    }
    return dto[key] === value;
  });
}

export class EventsController extends BaseController {
  async getAll(_req: Request, res: Response): Promise<void> {
    const events = await this.prisma.event.findMany({ select: eventSelect, orderBy: [{ startsAt: "asc" }, { id: "asc" }] });
    res.json(events.map(serialize));
  }
  async getById(req: Request, res: Response): Promise<void> {
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: eventSelect });
    if (!event) throw new NotFoundError("Event", eventId);
    res.json(serialize(event));
  }
  async create(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) throw new ForbiddenError("Only admins can create events");
    const body = CreateEventBodySchema.parse(req.body);
    if (body.stage && !["PRE_REGISTRATION", "REGISTRATION_OPEN"].includes(body.stage)) throw new ForbiddenError("Unsupported initial stage", "stageLocked");
    const digest = createHash("sha256").update(JSON.stringify([this.getUserId(req), body])).digest("hex");
    try {
      const event = await this.prisma.$transaction(async tx => {
        if (body.operationId) {
          const existing = await tx.event.findUnique({ where: { creationOperationId: body.operationId }, select: eventSelect });
          if (existing) {
            if (existing.creationDigest !== digest) throw new ConflictError("Creation request changed; reconcile before retrying", undefined, "concurrentChange");
            return existing;
          }
        }
        const { operationId, startsAt, endsAt, registrationDeadline } = body;
        const created = await tx.event.create({ data: {
          ...setupFields(body), name: body.name, timeZone: body.timeZone ?? "UTC",
          startsAt: new Date(startsAt), endsAt: new Date(endsAt),
          registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
          ...(operationId && { creationOperationId: operationId, creationDigest: digest }),
        }, select: eventSelect });
        if (created.stage === "REGISTRATION_OPEN") assertReady(created);
        await appendAudit(tx, { action: "EVENT_UPDATED", actor: { kind: "USER", userId: this.getUserId(req) }, targetType: "EVENT", targetId: created.id, eventId: created.id, metadata: { toStage: created.stage } });
        return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      res.status(201).json(serialize(event));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) throw new ConflictError("Retry the same creation request", undefined, "concurrentChange");
      throw error;
    }
  }
  async update(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) throw new ForbiddenError("Only admins can update events");
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const body = UpdateEventBodySchema.parse(req.body);
    try {
      const event = await this.prisma.$transaction(async tx => {
        const current = await tx.event.findUnique({ where: { id: eventId }, select: eventSelect });
        if (!current) throw new NotFoundError("Event", eventId);
        if (body.expectedRevision !== current.revision) {
          if (matchesRetry(current, body)) return current;
          throw new ConflictError("Event changed; compare and reload before saving", undefined, "concurrentChange");
        }
        UpdateEventBodySchema.parse({ ...body,
          registrationDeadline: body.registrationDeadline === undefined ? current.registrationDeadline?.toISOString() ?? null : body.registrationDeadline,
          startsAt: body.startsAt ?? current.startsAt.toISOString(), endsAt: body.endsAt ?? current.endsAt.toISOString(),
        });
        if (body.stage !== undefined) assertStageTransition(current.stage, body.stage, body.expectedStage);
        const { expectedRevision, startsAt, endsAt, registrationDeadline } = body;
        const updated = await tx.event.update({ where: { id: eventId, revision: expectedRevision }, data: {
          ...setupFields(body), revision: { increment: 1 },
          ...(startsAt !== undefined && { startsAt: new Date(startsAt) }),
          ...(endsAt !== undefined && { endsAt: new Date(endsAt) }),
          ...(registrationDeadline !== undefined && { registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null }),
        }, select: eventSelect });
        if (updated.stage === "REGISTRATION_OPEN") assertReady(updated);
        await appendAudit(tx, { action: "EVENT_UPDATED", actor: { kind: "USER", userId: this.getUserId(req) }, targetType: "EVENT", targetId: eventId, eventId, metadata: { fromStage: current.stage, toStage: updated.stage } });
        return updated;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      res.json(serialize(event));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2025", "P2034"].includes(error.code)) throw new ConflictError("Event changed concurrently; reload before retrying", undefined, "concurrentChange");
      throw error;
    }
  }
}
