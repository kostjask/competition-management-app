import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  CreateStudioRegistrationBodySchema,
  UpdateStudioRegistrationBodySchema,
  StudioRegistrationParamsSchema,
  StudioRegistrationSchema,
  EventIdParamsSchema,
} from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError, ValidationError } from "../errors";
import { isActionAllowed } from "../utils/stageChecks";

const registrationSelect = {
  id: true,
  studioId: true,
  eventId: true,
  status: true,
  canEditDuringReview: true,
  createdAt: true,
  updatedAt: true,
  studio: { select: { id: true, name: true, approvalStatus: true, country: true, city: true } },
} satisfies Prisma.StudioEventRegistrationSelect;

type RegistrationRecord = Prisma.StudioEventRegistrationGetPayload<{ select: typeof registrationSelect }>;

function serialize(registration: RegistrationRecord) {
  return StudioRegistrationSchema.parse({
    ...registration,
    createdAt: registration.createdAt.toISOString(),
    updatedAt: registration.updatedAt.toISOString(),
  });
}

export class StudioRegistrationsController extends BaseController {
  async create(req: Request, res: Response): Promise<void> {
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const body = CreateStudioRegistrationBodySchema.parse(req.body);
    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);
    if (!isAdmin && (!body.representativeName || !body.representativeEmail)) {
      throw new ValidationError("Representative name and email are required", {
        fields: {
          ...(!body.representativeName && { representativeName: "Required" }),
          ...(!body.representativeEmail && { representativeEmail: "Required" }),
        },
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId }, select: { stage: true } });
      if (!event) throw new NotFoundError("Event", eventId);
      if (!isAdmin && !isActionAllowed(event.stage, "studio.register")) {
        throw new ForbiddenError("Registration not allowed in current event stage");
      }

      // A single nested write is atomic, including membership and registration.
      // Administrators are deliberately not made representatives of new studios.
      const studio = await tx.studio.create({
        data: {
          eventId,
          name: body.name,
          ...(body.country !== undefined && { country: body.country }),
          ...(body.city !== undefined && { city: body.city }),
          ...(body.directorName !== undefined && { directorName: body.directorName }),
          ...(body.directorPhone !== undefined && { directorPhone: body.directorPhone }),
          ...(body.invoiceDetails !== undefined && { invoiceDetails: body.invoiceDetails }),
          approvalStatus: "PENDING",
          ...(!isAdmin && body.representativeName && body.representativeEmail && {
            representatives: { create: {
              userId, name: body.representativeName, email: body.representativeEmail,
            } },
          }),
          registrations: { create: { eventId, status: "PENDING", canEditDuringReview: false } },
        },
        select: { registrations: { select: registrationSelect } },
      });
      const registration = studio.registrations[0];
      if (!registration) throw new InternalServerError();
      return serialize(registration);
    });
    res.status(201).json(result);
  }

  async list(req: Request, res: Response): Promise<void> {
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const userId = this.getUserId(req);
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) throw new NotFoundError("Event", eventId);
    const registrations = await this.prisma.studioEventRegistration.findMany({
      where: {
        eventId,
        studio: {
          eventId, deletedAt: null,
          ...(!this.isAdmin(req) && { representatives: { some: { userId, active: true } } }),
        },
      },
      select: registrationSelect,
      orderBy: { studio: { name: "asc" } },
    });
    res.json(registrations.map(serialize));
  }

  async update(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) throw new ForbiddenError("Only admins can update event registration approval");
    const { studioId, eventId } = StudioRegistrationParamsSchema.parse(req.params);
    const body = UpdateStudioRegistrationBodySchema.parse(req.body);
    const result = await this.prisma.$transaction(async (tx) => {
      const studio = await tx.studio.findFirst({
        where: { id: studioId, eventId, deletedAt: null },
        select: { approvalStatus: true, representatives: { where: { active: true }, select: { userId: true } } },
      });
      if (!studio) throw new NotFoundError("Studio", studioId);
      if (studio.approvalStatus !== "APPROVED") {
        throw new ForbiddenError("Studio must be approved before registration to events");
      }
      const registration = await tx.studioEventRegistration.findUnique({
        where: { studioId_eventId: { studioId, eventId } },
      });
      if (!registration) throw new NotFoundError("Registration");
      const updated = await tx.studioEventRegistration.update({
        where: { studioId_eventId: { studioId, eventId } },
        data: {
          status: body.status,
          ...(body.canEditDuringReview !== undefined && { canEditDuringReview: body.canEditDuringReview }),
        },
        select: registrationSelect,
      });
      if (body.status === "APPROVED" && studio.representatives.length > 0) {
        const role = await tx.role.findUnique({ where: { key: "representative" }, select: { id: true } });
        if (!role) throw new InternalServerError("Representative role is not configured");
        for (const representative of studio.representatives) {
          await tx.userRole.upsert({
            where: { userId_roleId_eventId: { userId: representative.userId, roleId: role.id, eventId } },
            create: { userId: representative.userId, roleId: role.id, eventId }, update: {},
          });
        }
      }
      return serialize(updated);
    });
    res.json(result);
  }

  async cancel(req: Request, res: Response): Promise<void> {
    const { studioId, eventId } = StudioRegistrationParamsSchema.parse(req.params);
    const userId = this.getUserId(req);
    await this.prisma.$transaction(async (tx) => {
      const studio = await tx.studio.findFirst({
        where: { id: studioId, eventId, deletedAt: null },
        select: { representatives: { where: { userId, active: true }, select: { id: true } } },
      });
      if (!studio) throw new NotFoundError("Studio", studioId);
      if (!this.isAdmin(req) && studio.representatives.length === 0) {
        throw new ForbiddenError("Can only cancel your own pending registrations");
      }
      const registration = await tx.studioEventRegistration.findUnique({
        where: { studioId_eventId: { studioId, eventId } },
      });
      if (!registration) throw new NotFoundError("Registration");
      if (registration.status !== "PENDING") throw new ForbiddenError("Can only cancel pending registrations");
      const deleted = await tx.studioEventRegistration.deleteMany({
        where: {
          studioId, eventId, status: "PENDING",
          studio: {
            eventId, deletedAt: null,
            ...(!this.isAdmin(req) && { representatives: { some: { userId, active: true } } }),
          },
        },
      });
      if (deleted.count !== 1) throw new ConflictError("Registration changed; reload before cancelling");
    });
    res.status(204).send();
  }
}
