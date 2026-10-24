import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  CreateJudgeBodySchema, UpdateJudgeBodySchema, JudgeEventParamsSchema,
  JudgeItemParamsSchema, JudgeSchema,
} from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from "../errors";

const judgeSelect = {
  id: true, eventId: true, userId: true, name: true, description: true, country: true, city: true,
} satisfies Prisma.JudgeSelect;
type JudgeRecord = Prisma.JudgeGetPayload<{ select: typeof judgeSelect }>;

function serialize(record: JudgeRecord) {
  const result = JudgeSchema.safeParse({
    id: record.id, eventId: record.eventId, userId: record.userId, name: record.name,
    description: record.description, country: record.country, city: record.city,
  });
  if (!result.success) throw new InternalServerError();
  return result.data;
}

export class JudgesController extends BaseController {
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
        if (error.code === "P2002") throw new ConflictError("User is already a judge for this event");
        if (error.code === "P2003") throw new ConflictError("Judge relationship changed or scores prevent deletion");
        if (error.code === "P2025") throw new NotFoundError("Judge");
      }
      throw error;
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    const { eventId } = JudgeEventParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId);
    const judges = await this.prisma.judge.findMany({
      where: { eventId }, select: judgeSelect, orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    res.json(judges.map(serialize));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { eventId, judgeId } = JudgeItemParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId);
    const judge = await this.prisma.judge.findFirst({ where: { id: judgeId, eventId }, select: judgeSelect });
    if (!judge) throw new NotFoundError("Judge", judgeId);
    res.json(serialize(judge));
  }

  async create(req: Request, res: Response): Promise<void> {
    const { eventId } = JudgeEventParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId, true);
    const body = CreateJudgeBodySchema.parse(req.body);
    const user = await this.prisma.user.findUnique({ where: { id: body.userId }, select: { active: true } });
    if (!user) throw new NotFoundError("User", body.userId);
    if (!user.active) throw new ConflictError("Cannot assign an inactive user");
    const judge = await this.mutation(() => this.prisma.judge.create({
      data: { eventId, userId: body.userId, name: body.name,
        description: body.description ?? null, country: body.country ?? null, city: body.city ?? null },
      select: judgeSelect,
    }));
    res.status(201).json(serialize(judge));
  }

  async update(req: Request, res: Response): Promise<void> {
    const { eventId, judgeId } = JudgeItemParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId, true);
    const body = UpdateJudgeBodySchema.parse(req.body);
    const judge = await this.mutation(() => this.prisma.judge.update({
      where: { id: judgeId, eventId }, data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.city !== undefined && { city: body.city }),
      }, select: judgeSelect,
    }));
    res.json(serialize(judge));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { eventId, judgeId } = JudgeItemParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId, true);
    await this.mutation(() => this.prisma.judge.delete({ where: { id: judgeId, eventId } }));
    res.status(204).send();
  }
}
