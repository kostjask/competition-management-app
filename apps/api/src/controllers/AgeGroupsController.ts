import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  CreateAgeGroupBodySchema, UpdateAgeGroupBodySchema, AgeGroupEventParamsSchema,
  AgeGroupItemParamsSchema, AgeGroupSchema,
} from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from "../errors";

const ageGroupSelect = {
  id: true, eventId: true, name: true, minAge: true, maxAge: true,
} satisfies Prisma.AgeGroupSelect;
type AgeGroupRecord = Prisma.AgeGroupGetPayload<{ select: typeof ageGroupSelect }>;

function serialize(record: AgeGroupRecord) {
  const result = AgeGroupSchema.safeParse({
    id: record.id, eventId: record.eventId, name: record.name, minAge: record.minAge, maxAge: record.maxAge,
  });
  if (!result.success) throw new InternalServerError();
  return result.data;
}

export class AgeGroupsController extends BaseController {
  private async requireAccess(req: Request, eventId: string, write = false) {
    const permissions = req.auth?.permissionsByEvent;
    if (!this.isAdmin(req) && (write || !(permissions?.get(eventId)?.has("event.manage") ||
      permissions?.get(null)?.has("event.manage")))) throw new ForbiddenError();
    if (!await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })) {
      throw new NotFoundError("Event", eventId);
    }
  }

  private async mutation<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") throw new ConflictError("Record conflicts with existing data");
        if (error.code === "P2003") throw new ConflictError("AgeGroup relationship changed or performances prevent deletion", undefined, "relationshipConflict");
        if (error.code === "P2034") throw new ConflictError("Record changed concurrently; reload before retrying", undefined, "concurrentChange");
        if (error.code === "P2025") throw new NotFoundError("AgeGroup");
      }
      throw error;
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    const { eventId } = AgeGroupEventParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId);
    const ageGroups = await this.prisma.ageGroup.findMany({
      where: { eventId }, select: ageGroupSelect, orderBy: [{ minAge: "asc" }, { id: "asc" }],
    });
    res.json(ageGroups.map(serialize));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { eventId, ageGroupId } = AgeGroupItemParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId);
    const ageGroup = await this.prisma.ageGroup.findFirst({ where: { id: ageGroupId, eventId }, select: ageGroupSelect });
    if (!ageGroup) throw new NotFoundError("AgeGroup", ageGroupId);
    res.json(serialize(ageGroup));
  }

  async create(req: Request, res: Response): Promise<void> {
    const { eventId } = AgeGroupEventParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId, true);
    const body = CreateAgeGroupBodySchema.parse(req.body);
    const ageGroup = await this.mutation(() => this.prisma.ageGroup.create({
      data: { eventId, ...body, maxAge: body.maxAge ?? null, }, select: ageGroupSelect,
    }));
    res.status(201).json(serialize(ageGroup));
  }

  async update(req: Request, res: Response): Promise<void> {
    const { eventId, ageGroupId } = AgeGroupItemParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId, true);
    const body = UpdateAgeGroupBodySchema.parse(req.body);
    const ageGroup = await this.mutation(() => this.prisma.$transaction(async tx => {
      const current = await tx.ageGroup.findFirst({ where: { id: ageGroupId, eventId }, select: ageGroupSelect });
      if (!current) throw new NotFoundError("AgeGroup", ageGroupId);
      const data = CreateAgeGroupBodySchema.parse({ name: current.name, minAge: current.minAge, maxAge: current.maxAge, ...body });
      return tx.ageGroup.update({ where: { id: ageGroupId, eventId }, data: { ...data, maxAge: data.maxAge ?? null }, select: ageGroupSelect });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    res.json(serialize(ageGroup));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { eventId, ageGroupId } = AgeGroupItemParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId, true);
    await this.mutation(() => this.prisma.ageGroup.delete({ where: { id: ageGroupId, eventId } }));
    res.status(204).send();
  }
}
