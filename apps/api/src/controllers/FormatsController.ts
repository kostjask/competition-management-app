import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  CreateFormatBodySchema, UpdateFormatBodySchema, FormatEventParamsSchema,
  FormatItemParamsSchema, FormatSchema,
} from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from "../errors";

const formatSelect = {
  id: true, eventId: true, name: true, minParticipants: true, maxParticipants: true, maxDurationSeconds: true,
} satisfies Prisma.DanceFormatSelect;
type FormatRecord = Prisma.DanceFormatGetPayload<{ select: typeof formatSelect }>;

function serialize(record: FormatRecord) {
  const result = FormatSchema.safeParse({
    id: record.id, eventId: record.eventId, name: record.name, minParticipants: record.minParticipants, maxParticipants: record.maxParticipants, maxDurationSeconds: record.maxDurationSeconds,
  });
  if (!result.success) throw new InternalServerError();
  return result.data;
}

export class FormatsController extends BaseController {
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
        if (error.code === "P2003") throw new ConflictError("Format relationship changed or performances prevent deletion", undefined, "relationshipConflict");
        if (error.code === "P2034") throw new ConflictError("Record changed concurrently; reload before retrying", undefined, "concurrentChange");
        if (error.code === "P2025") throw new NotFoundError("Format");
      }
      throw error;
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    const { eventId } = FormatEventParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId);
    const formats = await this.prisma.danceFormat.findMany({
      where: { eventId }, select: formatSelect, orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    res.json(formats.map(serialize));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { eventId, formatId } = FormatItemParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId);
    const format = await this.prisma.danceFormat.findFirst({ where: { id: formatId, eventId }, select: formatSelect });
    if (!format) throw new NotFoundError("Format", formatId);
    res.json(serialize(format));
  }

  async create(req: Request, res: Response): Promise<void> {
    const { eventId } = FormatEventParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId, true);
    const body = CreateFormatBodySchema.parse(req.body);
    const format = await this.mutation(() => this.prisma.danceFormat.create({
      data: { eventId, ...body,  }, select: formatSelect,
    }));
    res.status(201).json(serialize(format));
  }

  async update(req: Request, res: Response): Promise<void> {
    const { eventId, formatId } = FormatItemParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId, true);
    const body = UpdateFormatBodySchema.parse(req.body);
    const format = await this.mutation(() => this.prisma.$transaction(async tx => {
      const current = await tx.danceFormat.findFirst({ where: { id: formatId, eventId }, select: formatSelect });
      if (!current) throw new NotFoundError("Format", formatId);
      const data = CreateFormatBodySchema.parse({ name: current.name, minParticipants: current.minParticipants, maxParticipants: current.maxParticipants, maxDurationSeconds: current.maxDurationSeconds, ...body });
      return tx.danceFormat.update({ where: { id: formatId, eventId }, data, select: formatSelect });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    res.json(serialize(format));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { eventId, formatId } = FormatItemParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId, true);
    await this.mutation(() => this.prisma.danceFormat.delete({ where: { id: formatId, eventId } }));
    res.status(204).send();
  }
}
