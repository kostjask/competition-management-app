import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import {
  CreatePerformanceBodySchema, UpdatePerformanceBodySchema, PerformanceSchema,
  PerformanceCollectionParamsSchema, PerformanceItemParamsSchema, PerformanceQuerySchema,
  PerformanceDeleteQuerySchema, PerformanceHistorySchema,
} from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from "../errors";
import { isActionAllowed } from "../utils/stageChecks";
import { appendAudit } from "../services/audit";
import { serializeDto } from "../utils/dto";

const performanceSelect = {
  revision: true,
  id: true, eventId: true, studioId: true, registrationId: true, title: true, durationSec: true, orderOnStage: true,
  categoryId: true, ageGroupId: true, formatId: true,
  participants: { select: { dancerId: true, dancer: { select: {
    id: true, studioId: true, firstName: true, lastName: true, birthDate: true, photoUrl: true,
  } } }, orderBy: { dancerId: "asc" } },
} satisfies Prisma.PerformanceSelect;
type PerformanceRecord = Prisma.PerformanceGetPayload<{ select: typeof performanceSelect }>;

function serialize(performance: PerformanceRecord) {
  const result = PerformanceSchema.safeParse({
    ...performance, participants: performance.participants.map(({ dancerId, dancer }) => ({
      dancerId, dancer: { ...dancer, birthDate: dancer.birthDate.toISOString().slice(0, 10) },
    })),
  });
  if (!result.success) throw new InternalServerError();
  return result.data;
}

export class PerformancesController extends BaseController {
  private async capture(req: Request, db: Prisma.TransactionClient, performance: PerformanceRecord, origin: "CREATE" | "EDIT" | "ARCHIVE") {
    const actorId = this.getUserId(req);
    await db.$executeRaw`SELECT capture_performance_revision(${performance.id}, ${origin}, ${actorId})`;
    await appendAudit(db, { action: origin === "CREATE" ? "PERFORMANCE_CREATED" : origin === "EDIT" ? "PERFORMANCE_UPDATED" : "PERFORMANCE_ARCHIVED",
      actor: { kind: "USER", userId: actorId }, targetType: "PERFORMANCE", targetId: performance.id,
      eventId: performance.eventId, studioId: performance.studioId, metadata: { revision: performance.revision } });
  }
  private requirePermission(req: Request, eventId: string) {
    if (!this.isAdmin(req) && !this.hasPermission(req, "performance.manage", eventId) &&
      !this.hasPermission(req, "performance.manage", null)) throw new ForbiddenError();
  }

  private studioWhere(req: Request, eventId: string): Prisma.StudioWhereInput {
    return {
      eventId, deletedAt: null,
      ...(!this.isAdmin(req) && {
        approvalStatus: "APPROVED",
        representatives: { some: { userId: this.getUserId(req), active: true } },
        registrations: { some: { eventId, status: "APPROVED" } },
      }),
    };
  }

  private async requireAccess(req: Request, db: Prisma.TransactionClient, eventId: string, studioId: string, write = false) {
    this.requirePermission(req, eventId);
    const studio = await db.studio.findFirst({
      where: { id: studioId, eventId, deletedAt: null },
      select: {
        approvalStatus: true, event: { select: { stage: true } },
        representatives: { where: { userId: this.getUserId(req), active: true }, select: { id: true } },
        registrations: { where: { eventId }, select: { id: true, status: true, canEditDuringReview: true } },
      },
    });
    if (!studio) throw new NotFoundError("Studio", studioId);
    const registration = studio.registrations[0];
    if (!registration) throw new ConflictError("Performance ownership requires an event registration", undefined, "relationshipConflict");
    if (this.isAdmin(req)) return registration.id;
    if (!studio.representatives.length || studio.approvalStatus !== "APPROVED" || registration?.status !== "APPROVED") {
      throw new ForbiddenError("Access to studio performances denied", "ownershipRequired");
    }
    if (write && !isActionAllowed(studio.event.stage, "performance.manage", registration.canEditDuringReview)) {
      throw new ForbiddenError("Performance management not allowed in current event stage", "stageLocked");
    }
    return registration.id;
  }

  private async findItem(req: Request, db: Prisma.TransactionClient, eventId: string, performanceId: string, write = false) {
    this.requirePermission(req, eventId);
    const performance = await db.performance.findFirst({
      where: { id: performanceId, eventId, deletedAt: null }, select: performanceSelect,
    });
    if (!performance) throw new NotFoundError("Performance", performanceId);
    const studioId = performance.studioId;
    await this.requireAccess(req, db, eventId, studioId, write);
    return { performance, studioId };
  }

  private async validateSelection(db: Prisma.TransactionClient, eventId: string, studioId: string,
    selection: { categoryId: string | null; ageGroupId: string | null; formatId: string | null; dancerIds: string[] }) {
    const [category, ageGroup, format, dancers] = await Promise.all([
      selection.categoryId === null ? null : db.danceCategory.findFirst({ where: { id: selection.categoryId, eventId }, select: { id: true } }),
      selection.ageGroupId === null ? null : db.ageGroup.findFirst({ where: { id: selection.ageGroupId, eventId }, select: { id: true } }),
      selection.formatId === null ? null : db.danceFormat.findFirst({ where: { id: selection.formatId, eventId }, select: { id: true } }),
      db.dancer.findMany({ where: { id: { in: selection.dancerIds }, studioId, deletedAt: null }, select: { id: true } }),
    ]);
    if ((selection.categoryId !== null && !category) || (selection.ageGroupId !== null && !ageGroup) || (selection.formatId !== null && !format)) {
      throw new ConflictError("Invalid event configuration", undefined, "invalidConfiguration");
    }
    if (dancers.length !== selection.dancerIds.length) throw new ConflictError("Participants must be active dancers of the performance studio", undefined, "invalidParticipants");
  }

  private async transaction<T>(work: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try { return await this.prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = error.meta?.target;
        if (Array.isArray(target) && (target.includes("creationOperationId") || (target.includes("performanceId") && target.includes("revision")))) {
          throw new ConflictError("Performance history changed; reload before retrying", undefined, "concurrentChange");
        }
        throw new ConflictError("Stage order is already reserved for this event", undefined, "orderReserved");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2003", "P2025"].includes(error.code)) {
        throw new ConflictError("Performance relationships changed; reload and retry", undefined, "relationshipConflict");
      }
      throw error;
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    const { eventId } = PerformanceCollectionParamsSchema.parse(req.params);
    const { studioId } = PerformanceQuerySchema.parse(req.query);
    this.requirePermission(req, eventId);
    if (!await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })) throw new NotFoundError("Event", eventId);
    if (studioId) await this.requireAccess(req, this.prisma, eventId, studioId);
    const studios = await this.prisma.studio.findMany({
      where: { ...this.studioWhere(req, eventId), ...(studioId && { id: studioId }) }, select: { id: true },
    });
    const ids = studios.map(({ id }) => id);
    const performances = await this.prisma.performance.findMany({
      where: { eventId, deletedAt: null, studioId: { in: ids } }, select: performanceSelect, orderBy: [{ orderOnStage: "asc" }, { id: "asc" }],
    });
    res.json(performances.map(serialize));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { eventId, performanceId } = PerformanceItemParamsSchema.parse(req.params);
    const { performance } = await this.findItem(req, this.prisma, eventId, performanceId);
    res.json(serialize(performance));
  }

  async history(req: Request, res: Response): Promise<void> {
    const { eventId, performanceId } = PerformanceItemParamsSchema.parse(req.params);
    await this.findItem(req, this.prisma, eventId, performanceId);
    const revisions = await this.prisma.performanceRevision.findMany({
      where: { performanceId }, orderBy: { revision: "desc" },
      select: { revision: true, origin: true, capturedAt: true, actorId: true, snapshot: true },
    });
    res.json(serializeDto(PerformanceHistorySchema, revisions.map(({ actorId, capturedAt, ...row }) => ({
      ...row, capturedAt: capturedAt.toISOString(), actorKind: actorId === null ? "MIGRATION" : "USER",
    }))));
  }

  async create(req: Request, res: Response): Promise<void> {
    const { eventId } = PerformanceCollectionParamsSchema.parse(req.params);
    const body = CreatePerformanceBodySchema.parse(req.body);
    const { studioId, dancerIds, operationId, ...fields } = body;
    // Bind retries to the authenticated actor and route; never return another owner's entry.
    const digest = createHash("sha256").update(JSON.stringify([this.getUserId(req), eventId, body])).digest("hex");
    const result = await this.transaction(async (db) => {
      const registrationId = await this.requireAccess(req, db, eventId, studioId);
      if (operationId) {
        const existing = await db.performance.findUnique({ where: { creationOperationId: operationId },
          select: { id: true, eventId: true, creationDigest: true, deletedAt: true } });
        if (existing) {
          if (existing.creationDigest !== digest || existing.eventId !== eventId || existing.deletedAt !== null) {
            throw new ConflictError("Creation changed; reconcile before retrying", undefined, "concurrentChange");
          }
          const { performance } = await this.findItem(req, db, eventId, existing.id);
          return serialize(performance);
        }
      }
      await this.requireAccess(req, db, eventId, studioId, true);
      await this.validateSelection(db, eventId, studioId, { ...fields, dancerIds });
      const created = await db.performance.create({
        data: { eventId, studioId, registrationId, ...fields,
          ...(operationId && { creationOperationId: operationId, creationDigest: digest }),
          participants: { createMany: { data: dancerIds.map((dancerId) => ({ dancerId })) } } },
        select: performanceSelect,
      });
      await this.capture(req, db, created, "CREATE");
      return serialize(created);
    });
    res.status(201).json(result);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { eventId, performanceId } = PerformanceItemParamsSchema.parse(req.params);
    this.requirePermission(req, eventId);
    const { dancerIds, expectedRevision, ...fields } = UpdatePerformanceBodySchema.parse(req.body);
    const result = await this.transaction(async (db) => {
      const { performance, studioId } = await this.findItem(req, db, eventId, performanceId, true);
      if (performance.revision !== expectedRevision) throw new ConflictError("Performance changed; reload before retrying", undefined, "concurrentChange");
      await this.validateSelection(db, eventId, studioId, {
        categoryId: fields.categoryId === undefined ? performance.categoryId : fields.categoryId,
        ageGroupId: fields.ageGroupId === undefined ? performance.ageGroupId : fields.ageGroupId,
        formatId: fields.formatId === undefined ? performance.formatId : fields.formatId,
        dancerIds: dancerIds ?? performance.participants.map(({ dancerId }) => dancerId),
      });
      const updated = await db.performance.update({
        where: { id: performanceId, eventId, deletedAt: null, revision: expectedRevision },
        data: {
          revision: { increment: 1 },
          ...(fields.title !== undefined && { title: fields.title }),
          ...(fields.durationSec !== undefined && { durationSec: fields.durationSec }),
          ...(fields.orderOnStage !== undefined && { orderOnStage: fields.orderOnStage }),
          ...(fields.categoryId !== undefined && { categoryId: fields.categoryId }),
          ...(fields.ageGroupId !== undefined && { ageGroupId: fields.ageGroupId }),
          ...(fields.formatId !== undefined && { formatId: fields.formatId }),
          ...(dancerIds && { participants: {
            deleteMany: {}, createMany: { data: dancerIds.map((dancerId) => ({ dancerId })) },
          } }),
        }, select: performanceSelect,
      });
      await this.capture(req, db, updated, "EDIT");
      return serialize(updated);
    });
    res.json(result);
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { eventId, performanceId } = PerformanceItemParamsSchema.parse(req.params);
    this.requirePermission(req, eventId);
    const { expectedRevision } = PerformanceDeleteQuerySchema.parse(req.query);
    await this.transaction(async (db) => {
      const { performance } = await this.findItem(req, db, eventId, performanceId, true);
      if (performance.revision !== expectedRevision) throw new ConflictError("Performance changed; reload before retrying", undefined, "concurrentChange");
      const archived = await db.performance.update({
        where: { id: performanceId, eventId, deletedAt: null, revision: expectedRevision },
        data: { deletedAt: new Date(), deletedBy: this.getUserId(req), revision: { increment: 1 } }, select: performanceSelect,
      });
      await this.capture(req, db, archived, "ARCHIVE");
    });
    res.status(204).send();
  }
}
