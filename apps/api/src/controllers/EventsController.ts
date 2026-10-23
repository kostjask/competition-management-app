import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  CreateEventBodySchema,
  UpdateEventBodySchema,
  EventIdParamsSchema,
} from "@dance/schemas";
import { ForbiddenError, NotFoundError } from "../errors";
import { BaseController } from "./BaseController";

export class EventsController extends BaseController {
  /**
   * Get all events
   * GET /events
   */
  async getAll(_req: Request, res: Response): Promise<void> {
    const events = await this.prisma.event.findMany({
      orderBy: { startsAt: "asc" },
    });
    res.json(events);
  }

  /**
   * Get single event by ID
   * GET /events/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    const params = EventIdParamsSchema.parse(req.params);
    const event = await this.prisma.event.findUnique({
      where: { id: params.eventId },
    });

    if (!event) {
      throw new NotFoundError("Event", params.eventId);
    }

    res.json(event);
  }

  /**
   * Create new event (Admin only)
   * POST /events
   */
  async create(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) {
      throw new ForbiddenError("Only admins can create events");
    }

    const body = CreateEventBodySchema.parse(req.body);

    const updateData: Prisma.EventCreateInput = {
      name: body.name || "Untitled Event",
      startsAt: body.startsAt || new Date(),
      endsAt: body.endsAt || new Date(),
      ...(body.stage && { stage: body.stage }),
    };

    const event = await this.prisma.event.create({
      data: updateData,
    });

    res.status(201).json(event);
  }

  /**
   * Update event (Admin only)
   * PATCH /events/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) {
      throw new ForbiddenError("Only admins can update events");
    }

    const params = EventIdParamsSchema.parse(req.params);
    const body = UpdateEventBodySchema.parse(req.body);

    const updateData: Prisma.EventUpdateInput = {};
    if (body.name) updateData.name = body.name;
    if (body.startsAt) updateData.startsAt = body.startsAt;
    if (body.endsAt) updateData.endsAt = body.endsAt;
    if (body.stage) updateData.stage = body.stage;

    const event = await this.prisma.event.update({
      where: { id: params.eventId },
      data: updateData,
    });

    res.json(event);
  }
}
