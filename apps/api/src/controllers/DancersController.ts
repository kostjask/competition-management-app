import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import {
  CreateDancerBodySchema, UpdateDancerBodySchema, DancerSchema,
  DancerCollectionParamsSchema, DancerItemParamsSchema,
} from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ForbiddenError, InternalServerError, NotFoundError } from "../errors";
import { isActionAllowed } from "../utils/stageChecks";

const dancerSelect = {
  id: true, studioId: true, firstName: true, lastName: true, birthDate: true, photoUrl: true,
} satisfies Prisma.DancerSelect;
type DancerRecord = Prisma.DancerGetPayload<{ select: typeof dancerSelect }>;

function serialize(dancer: DancerRecord) {
  const result = DancerSchema.safeParse({
    ...dancer, birthDate: dancer.birthDate.toISOString().slice(0, 10),
  });
  if (!result.success) throw new InternalServerError();
  return result.data;
}

export class DancersController extends BaseController {
  private async requireAccess(req: Request, db: Prisma.TransactionClient, studioId: string, write = false) {
    const userId = this.getUserId(req);
    const studio = await db.studio.findFirst({
      where: { id: studioId, deletedAt: null },
      select: {
        eventId: true, approvalStatus: true, event: { select: { stage: true } },
        representatives: { where: { userId, active: true }, select: { id: true } },
        registrations: { select: { eventId: true, status: true, canEditDuringReview: true } },
      },
    });
    if (!studio) throw new NotFoundError("Studio", studioId);
    if (this.isAdmin(req)) return;
    const permissions = req.auth?.permissionsByEvent;
    const permitted = permissions?.get(studio.eventId)?.has("dancer.manage") ||
      permissions?.get(null)?.has("dancer.manage");
    const registration = studio.registrations.find((record) => record.eventId === studio.eventId);
    if (!permitted || studio.representatives.length === 0 || studio.approvalStatus !== "APPROVED" ||
      registration?.status !== "APPROVED") {
      throw new ForbiddenError("Access to studio dancers denied");
    }
    if (write && !isActionAllowed(studio.event.stage, "dancer.manage", registration.canEditDuringReview)) {
      throw new ForbiddenError("Dancer management not allowed in current event stage");
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    const { studioId } = DancerCollectionParamsSchema.parse(req.params);
    await this.requireAccess(req, this.prisma, studioId);
    const dancers = await this.prisma.dancer.findMany({
      where: { studioId, deletedAt: null }, select: dancerSelect,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
    });
    res.json(dancers.map(serialize));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { studioId, dancerId } = DancerItemParamsSchema.parse(req.params);
    await this.requireAccess(req, this.prisma, studioId);
    const dancer = await this.prisma.dancer.findFirst({
      where: { id: dancerId, studioId, deletedAt: null }, select: dancerSelect,
    });
    if (!dancer) throw new NotFoundError("Dancer", dancerId);
    res.json(serialize(dancer));
  }

  async create(req: Request, res: Response): Promise<void> {
    const { studioId } = DancerCollectionParamsSchema.parse(req.params);
    const body = CreateDancerBodySchema.parse(req.body);
    const result = await this.prisma.$transaction(async (tx) => {
      await this.requireAccess(req, tx, studioId, true);
      const dancer = await tx.dancer.create({
        data: { studioId, firstName: body.firstName, lastName: body.lastName,
          birthDate: new Date(`${body.birthDate}T00:00:00.000Z`) },
        select: dancerSelect,
      });
      return serialize(dancer);
    });
    res.status(201).json(result);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { studioId, dancerId } = DancerItemParamsSchema.parse(req.params);
    const body = UpdateDancerBodySchema.parse(req.body);
    const result = await this.prisma.$transaction(async (tx) => {
      await this.requireAccess(req, tx, studioId, true);
      const where = { id: dancerId, studioId, deletedAt: null };
      const dancer = await tx.dancer.findFirst({ where, select: { id: true } });
      if (!dancer) throw new NotFoundError("Dancer", dancerId);
      const updated = await tx.dancer.update({
        where,
        data: {
          ...(body.firstName !== undefined && { firstName: body.firstName }),
          ...(body.lastName !== undefined && { lastName: body.lastName }),
          ...(body.birthDate !== undefined && { birthDate: new Date(`${body.birthDate}T00:00:00.000Z`) }),
        }, select: dancerSelect,
      });
      return serialize(updated);
    });
    res.json(result);
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { studioId, dancerId } = DancerItemParamsSchema.parse(req.params);
    const userId = this.getUserId(req);
    await this.prisma.$transaction(async (tx) => {
      await this.requireAccess(req, tx, studioId, true);
      const result = await tx.dancer.updateMany({
        where: { id: dancerId, studioId, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: userId },
      });
      if (result.count !== 1) throw new NotFoundError("Dancer", dancerId);
    });
    res.status(204).send();
  }
}
