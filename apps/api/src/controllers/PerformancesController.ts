import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  CreatePerformanceBodySchema, UpdatePerformanceBodySchema, PerformanceSchema,
  PerformanceCollectionParamsSchema, PerformanceItemParamsSchema, PerformanceQuerySchema,
} from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from "../errors";
import { isActionAllowed } from "../utils/stageChecks";

const performanceSelect = {
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
    selection: { categoryId: string; ageGroupId: string; formatId: string; dancerIds: string[] }) {
    const [category, ageGroup, format, dancers] = await Promise.all([
      db.danceCategory.findFirst({ where: { id: selection.categoryId, eventId }, select: { id: true } }),
      db.ageGroup.findFirst({ where: { id: selection.ageGroupId, eventId }, select: { id: true } }),
      db.danceFormat.findFirst({ where: { id: selection.formatId, eventId }, select: { id: true } }),
      db.dancer.findMany({ where: { id: { in: selection.dancerIds }, studioId, deletedAt: null }, select: { id: true } }),
    ]);
    if (!category || !ageGroup || !format) throw new ConflictError("Invalid event configuration", undefined, "invalidConfiguration");
    if (dancers.length !== selection.dancerIds.length) throw new ConflictError("Participants must be active dancers of the performance studio", undefined, "invalidParticipants");
  }

  private async transaction<T>(work: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try { return await this.prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Stage order is already reserved for this event", undefined, "orderReserved");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2003"].includes(error.code)) {
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

  async create(req: Request, res: Response): Promise<void> {
    const { eventId } = PerformanceCollectionParamsSchema.parse(req.params);
    const { studioId, dancerIds, ...fields } = CreatePerformanceBodySchema.parse(req.body);
    const result = await this.transaction(async (db) => {
      const registrationId = await this.requireAccess(req, db, eventId, studioId, true);
      await this.validateSelection(db, eventId, studioId, { ...fields, dancerIds });
      return serialize(await db.performance.create({
        data: { eventId, studioId, registrationId, ...fields, participants: { createMany: { data: dancerIds.map((dancerId) => ({ dancerId })) } } },
        select: performanceSelect,
      }));
    });
    res.status(201).json(result);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { eventId, performanceId } = PerformanceItemParamsSchema.parse(req.params);
    const { dancerIds, ...fields } = UpdatePerformanceBodySchema.parse(req.body);
    const result = await this.transaction(async (db) => {
      const { performance, studioId } = await this.findItem(req, db, eventId, performanceId, true);
      await this.validateSelection(db, eventId, studioId, {
        categoryId: fields.categoryId ?? performance.categoryId,
        ageGroupId: fields.ageGroupId ?? performance.ageGroupId,
        formatId: fields.formatId ?? performance.formatId,
        dancerIds: dancerIds ?? performance.participants.map(({ dancerId }) => dancerId),
      });
      return serialize(await db.performance.update({
        where: { id: performanceId, eventId, deletedAt: null },
        data: {
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
      }));
    });
    res.json(result);
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { eventId, performanceId } = PerformanceItemParamsSchema.parse(req.params);
    await this.transaction(async (db) => {
      await this.findItem(req, db, eventId, performanceId, true);
      const result = await db.performance.updateMany({
        where: { id: performanceId, eventId, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: this.getUserId(req) },
      });
      if (result.count !== 1) throw new NotFoundError("Performance", performanceId);
    });
    res.status(204).send();
  }
}
