import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { CreateEventBodySchema, UpdateEventBodySchema, EventIdParamsSchema, EventSchema } from "@dance/schemas";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from "../errors";
import { BaseController } from "./BaseController";

const eventSelect = {
  id: true, name: true, startsAt: true, endsAt: true, stage: true, createdAt: true,
  venue: true, country: true, city: true, description: true,
  maxStudios: true, maxPerformances: true, imageUrl: true,
} satisfies Prisma.EventSelect;
type EventRecord = Prisma.EventGetPayload<{ select: typeof eventSelect }>;
function serialize(event: EventRecord) {
  const result = EventSchema.safeParse({
    id: event.id, name: event.name, startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(), stage: event.stage, createdAt: event.createdAt.toISOString(),
    venue: event.venue, country: event.country, city: event.city, description: event.description,
    maxStudios: event.maxStudios, maxPerformances: event.maxPerformances, imageUrl: event.imageUrl,
  });
  if (!result.success) throw new InternalServerError();
  return result.data;
}

export class EventsController extends BaseController {
  async getAll(_req: Request, res: Response): Promise<void> {
    const events = await this.prisma.event.findMany({
      select: eventSelect, orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    });
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
    const event = await this.prisma.event.create({
      data: { name: body.name, startsAt: new Date(body.startsAt), endsAt: new Date(body.endsAt),
        ...(body.stage !== undefined && { stage: body.stage }),
        ...(body.venue !== undefined && { venue: body.venue }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.maxStudios !== undefined && { maxStudios: body.maxStudios }),
        ...(body.maxPerformances !== undefined && { maxPerformances: body.maxPerformances }),
      },
      select: eventSelect,
    });
    res.status(201).json(serialize(event));
  }

  async update(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) throw new ForbiddenError("Only admins can update events");
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const body = UpdateEventBodySchema.parse(req.body);
    try {
      // Validate the resulting date pair; concurrent edits must not invalidate it.
      const event = await this.prisma.$transaction(async (tx) => {
        const current = await tx.event.findUnique({ where: { id: eventId }, select: eventSelect });
        if (!current) throw new NotFoundError("Event", eventId);
        UpdateEventBodySchema.parse({
          ...body, startsAt: body.startsAt ?? current.startsAt.toISOString(),
          endsAt: body.endsAt ?? current.endsAt.toISOString(),
        });
        return tx.event.update({
          where: { id: eventId },
          data: {
            ...(body.name !== undefined && { name: body.name }),
            ...(body.stage !== undefined && { stage: body.stage }),
            ...(body.venue !== undefined && { venue: body.venue }),
            ...(body.country !== undefined && { country: body.country }),
            ...(body.city !== undefined && { city: body.city }),
            ...(body.description !== undefined && { description: body.description }),
            ...(body.maxStudios !== undefined && { maxStudios: body.maxStudios }),
            ...(body.maxPerformances !== undefined && { maxPerformances: body.maxPerformances }),
            ...(body.startsAt !== undefined && { startsAt: new Date(body.startsAt) }),
            ...(body.endsAt !== undefined && { endsAt: new Date(body.endsAt) }),
          },
          select: eventSelect,
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      res.json(serialize(event));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") throw new NotFoundError("Event", eventId);
        if (error.code === "P2034") throw new ConflictError("Event changed concurrently; reload before retrying", undefined, "concurrentChange");
      }
      throw error;
    }
  }
}
