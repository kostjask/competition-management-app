import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  CreateEventBodySchema,
  UpdateEventBodySchema,
  EventIdParamsSchema,
  CreateStudioBodySchema,
  UpdateRegistrationBodySchema,
  IdSchema,
} from "@dance/schemas";
import { isActionAllowed } from "../utils/stageChecks";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import { BaseController } from "./BaseController";

export class EventsController extends BaseController {
  /**
   * Helper: Verify studio access
   */
  private async requireStudioAccess(userId: string, studioId: string) {
    const studio = await this.prisma.studio.findFirst({
      where: { id: studioId, deletedAt: null },
      include: {
        registrations: true,
        representatives: true,
        event: { select: { stage: true } },
      },
    });

    if (!studio)
      return {
        studio: null,
        isRep: false,
        status: null,
        canEditDuringReview: false,
      };

    const isRep = studio.representatives.some(
      (r) => r.userId === userId && r.active,
    );

    const registration = studio.registrations.find(
      (r) => r.eventId === studio.eventId,
    );

    const status = registration?.status ?? null;
    const canEditDuringReview = registration?.canEditDuringReview ?? false;

    return { studio, isRep, status, canEditDuringReview };
  }

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

  /**
   * Register studio for event
   * POST /events/:eventId/studios
   */
  async registerStudio(req: Request, res: Response): Promise<void> {
    const eventId = IdSchema.parse(req.params.eventId);
    const body = CreateStudioBodySchema.parse(req.body);
    const isAdmin = this.isAdmin(req);
    const studioName = body.name.trim();

    // Check event stage for non-admin users
    if (!isAdmin) {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { stage: true },
      });

      if (!event || !isActionAllowed(event.stage, "studio.register")) {
        throw new ForbiddenError(
          "Registration not allowed in current event stage",
        );
      }

      if (!body.representativeName?.trim() || !body.representativeEmail?.trim()) {
        throw new ForbiddenError(
          "Representative name and email are required",
        );
      }
    }

    const userId = this.getUserId(req);

    // Admin can create studio directly with approval
    if (isAdmin) {
      const data: Prisma.StudioUncheckedCreateInput = {
        eventId,
        name: studioName,
        approvalStatus: "PENDING",
      };

      if (body.country !== undefined) data.country = body.country.trim();
      if (body.city !== undefined) data.city = body.city.trim();
      if (body.directorName !== undefined)
        data.directorName = body.directorName.trim();
      if (body.directorPhone !== undefined)
        data.directorPhone = body.directorPhone.trim();
      if (body.invoiceDetails !== undefined)
        data.invoiceDetails = body.invoiceDetails as Prisma.InputJsonValue;

      const studio = await this.prisma.studio.create({
        data,
        include: { representatives: true, registrations: true },
      });

      res.status(201).json(studio);
      return;
    }

    // Representative flow: create studio + pending registration request
    const data: Prisma.StudioUncheckedCreateInput = {
      eventId,
      name: studioName,
      approvalStatus: "PENDING",
      representatives: {
        create: {
          userId,
          name: body.representativeName!.trim(),
          email: body.representativeEmail!.trim(),
        },
      },
    };

    if (body.country !== undefined) data.country = body.country.trim();
    if (body.city !== undefined) data.city = body.city.trim();
    if (body.directorName !== undefined)
      data.directorName = body.directorName.trim();
    if (body.directorPhone !== undefined)
      data.directorPhone = body.directorPhone.trim();
    if (body.invoiceDetails !== undefined)
      data.invoiceDetails = body.invoiceDetails as Prisma.InputJsonValue;

    const studio = await this.prisma.studio.create({
      data,
      include: { representatives: true, registrations: true },
    });

    res.status(201).json(studio);
  }

  /**
   * List studios for an event
   * GET /events/:eventId/studios
   */
  async listStudios(req: Request, res: Response): Promise<void> {
    const eventId = IdSchema.parse(req.params.eventId);
    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);

    if (isAdmin) {
      const studios = await this.prisma.studio.findMany({
        where: { eventId, deletedAt: null },
        include: { registrations: true, representatives: true },
        orderBy: { name: "asc" },
      });
      res.json(studios);
      return;
    }

    // Representatives only see their own studios
    const studios = await this.prisma.studio.findMany({
      where: {
        eventId,
        deletedAt: null,
        representatives: {
          some: { userId, active: true },
        },
      },
      include: { registrations: true, representatives: true },
      orderBy: { name: "asc" },
    });

    res.json(studios);
  }

  /**
   * Update studio registration status for event
   * PATCH /events/:eventId/studios/:studioId/registration
   */
  async updateRegistration(req: Request, res: Response): Promise<void> {
    const eventId = IdSchema.parse(req.params.eventId);
    const studioId = IdSchema.parse(req.params.studioId);
    const body = UpdateRegistrationBodySchema.parse(req.body);

    const studio = await this.prisma.studio.findFirst({
      where: { id: studioId, eventId, deletedAt: null },
      select: { id: true, approvalStatus: true },
    });

    if (!studio) {
      throw new NotFoundError("Studio not found", studioId);
    }

    if (studio.approvalStatus !== "APPROVED") {
      throw new ForbiddenError(
        "Studio must be approved before registration to events",
      );
    }

    const updateData: Prisma.StudioEventRegistrationUpdateInput = {
      status: body.status,
    };

    if (body.canEditDuringReview !== undefined) {
      updateData.canEditDuringReview = body.canEditDuringReview;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Update or create registration
      const updated = await tx.studioEventRegistration.upsert({
        where: { studioId_eventId: { studioId, eventId } },
        update: updateData,
        create: {
          studioId,
          eventId,
          status: body.status,
          canEditDuringReview: body.canEditDuringReview ?? false,
        },
      });

      // If approved, assign representative role to all active studio representatives
      if (body.status === "APPROVED") {
        const studio = await tx.studio.findUnique({
          where: { id: studioId },
          include: { representatives: { where: { active: true } } },
        });

        if (studio) {
          const representativeRole = await tx.role.findUnique({
            where: { key: "representative" },
          });

          if (representativeRole) {
            // Assign role to each representative
            for (const rep of studio.representatives) {
              await tx.userRole.upsert({
                where: {
                  userId_roleId_eventId: {
                    userId: rep.userId,
                    roleId: representativeRole.id,
                    eventId: eventId ?? null,
                  } as any,
                },
                create: {
                  userId: rep.userId,
                  roleId: representativeRole.id,
                  eventId: eventId ?? null,
                },
                update: {}, // Already has role, do nothing
              });
            }
          }
        }
      }

      return updated;
    });

    res.json(result);
  }

  /**
   * Cancel studio registration (Representative, PENDING only)
   * DELETE /events/:eventId/studios/:studioId/registration
   */
  async cancelRegistration(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);
    const eventId = IdSchema.parse(req.params.eventId);
    const studioId = IdSchema.parse(req.params.studioId);

    if (!isAdmin) {
      const { studio, isRep, status } = await this.requireStudioAccess(
        userId,
        studioId,
      );

      if (!studio || !isRep || status !== "PENDING") {
        throw new ForbiddenError(
          "Can only cancel your own pending registrations",
        );
      }
    }

    const registration = await this.prisma.studioEventRegistration.findUnique({
      where: { studioId_eventId: { studioId, eventId } },
    });

    if (!registration) {
      throw new NotFoundError("Registration");
    }

    if (registration.status !== "PENDING") {
      throw new ForbiddenError("Can only cancel pending registrations");
    }

    await this.prisma.studioEventRegistration.delete({
      where: { studioId_eventId: { studioId, eventId } },
    });

    res.status(204).send();
  }
}
