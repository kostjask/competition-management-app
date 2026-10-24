import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  UpdateStudioBodySchema, UpdateRepresentativeBodySchema, UpdateStudioApprovalBodySchema,
  StudioIdParamsSchema, StudioIdRepIdParamsSchema, StudioSchema, StudioRepresentativeSchema,
} from "@dance/schemas";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from "../errors";
import { isActionAllowed } from "../utils/stageChecks";
import { BaseController } from "./BaseController";

const representativeSelect = {
  id: true, studioId: true, userId: true, name: true, email: true, active: true, createdAt: true,
} satisfies Prisma.StudioRepresentativeSelect;
const studioSelect = {
  id: true, eventId: true, name: true, approvalStatus: true, country: true, city: true,
  directorName: true, directorPhone: true, invoiceDetails: true, logoUrl: true,
  representatives: { where: { active: true }, select: representativeSelect, orderBy: { id: "asc" } },
  registrations: { select: {
    id: true, studioId: true, eventId: true, status: true, canEditDuringReview: true, createdAt: true, updatedAt: true,
  }, orderBy: { id: "asc" } },
} satisfies Prisma.StudioSelect;
type StudioRecord = Prisma.StudioGetPayload<{ select: typeof studioSelect }>;
type RepresentativeRecord = Prisma.StudioRepresentativeGetPayload<{ select: typeof representativeSelect }>;

function serializeRepresentative(rep: RepresentativeRecord) {
  const result = StudioRepresentativeSchema.safeParse({ ...rep, createdAt: rep.createdAt.toISOString() });
  if (!result.success) throw new InternalServerError();
  return result.data;
}
function serialize(studio: StudioRecord) {
  const result = StudioSchema.safeParse({
    id: studio.id, eventId: studio.eventId, name: studio.name, approvalStatus: studio.approvalStatus,
    country: studio.country, city: studio.city, directorName: studio.directorName,
    directorPhone: studio.directorPhone, invoiceDetails: studio.invoiceDetails, logoUrl: studio.logoUrl,
    representatives: studio.representatives.map(serializeRepresentative),
    registrations: studio.registrations.filter((r) => r.eventId === studio.eventId).map((r) => ({
      ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    })),
  });
  if (!result.success) throw new InternalServerError();
  return result.data;
}

export class StudiosController extends BaseController {
  private async transaction<T>(work: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try { return await this.prisma.$transaction(work); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Studio with this name already exists", undefined, "duplicateName");
      }
      throw error;
    }
  }

  private async requireAccess(req: Request, db: Prisma.TransactionClient, studioId: string, write = false) {
    const studio = await db.studio.findFirst({
      where: { id: studioId, deletedAt: null },
      select: { ...studioSelect, event: { select: { stage: true } } },
    });
    if (!studio) throw new NotFoundError("Studio", studioId);
    if (this.isAdmin(req)) return studio;
    if (!studio.representatives.some((r) => r.userId === this.getUserId(req) && r.active)) {
      throw new ForbiddenError("Access to studio denied", "ownershipRequired");
    }
    if (write) {
      if (!this.hasPermission(req, "studio.manage", studio.eventId) && !this.hasPermission(req, "studio.manage", null)) {
        throw new ForbiddenError("Studio management permission required");
      }
      // Organization edits keep their existing pre-registration/open-stage policy.
      // Event approval governs entry operations, not access to the organization profile.
      if (!isActionAllowed(studio.event.stage, "studio.edit")) {
        throw new ForbiddenError("Studio edits not allowed in current event stage", "stageLocked");
      }
    }
    return studio;
  }

  async getAll(req: Request, res: Response): Promise<void> {
    const studios = await this.prisma.studio.findMany({
      where: { deletedAt: null, ...(!this.isAdmin(req) && {
        representatives: { some: { userId: this.getUserId(req), active: true } },
      }) }, select: studioSelect, orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    res.json(studios.map(serialize));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { studioId } = StudioIdParamsSchema.parse(req.params);
    res.json(serialize(await this.requireAccess(req, this.prisma, studioId)));
  }

  async update(req: Request, res: Response): Promise<void> {
    const { studioId } = StudioIdParamsSchema.parse(req.params);
    const body = UpdateStudioBodySchema.parse(req.body);
    const result = await this.transaction(async (db) => {
      const studio = await this.requireAccess(req, db, studioId, true);
      const name = body.name ?? studio.name;
      // Match the SQL-only global partial unique index on active studio names.
      if (name !== studio.name && await db.studio.findFirst({
        where: { id: { not: studioId }, name, deletedAt: null }, select: { id: true },
      })) {
        throw new ConflictError("Studio with this name already exists", undefined, "duplicateName");
      }
      return serialize(await db.studio.update({
        where: { id: studioId, deletedAt: null },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.country !== undefined && { country: body.country }),
          ...(body.city !== undefined && { city: body.city }),
          ...(body.directorName !== undefined && { directorName: body.directorName }),
          ...(body.directorPhone !== undefined && { directorPhone: body.directorPhone }),
          ...(body.invoiceDetails !== undefined && { invoiceDetails: body.invoiceDetails === null ? Prisma.DbNull : body.invoiceDetails }),
        }, select: studioSelect,
      }));
    });
    res.json(result);
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { studioId } = StudioIdParamsSchema.parse(req.params);
    await this.transaction(async (db) => {
      await this.requireAccess(req, db, studioId, true);
      const result = await db.studio.updateMany({
        where: { id: studioId, deletedAt: null }, data: { deletedAt: new Date(), deletedBy: this.getUserId(req) },
      });
      if (result.count !== 1) throw new NotFoundError("Studio", studioId);
    });
    res.status(204).send();
  }

  async updateRepresentative(req: Request, res: Response): Promise<void> {
    const { studioId, representativeId } = StudioIdRepIdParamsSchema.parse(req.params);
    const body = UpdateRepresentativeBodySchema.parse(req.body);
    const result = await this.transaction(async (db) => {
      await this.requireAccess(req, db, studioId, true);
      const rep = await db.studioRepresentative.findFirst({
        where: { id: representativeId, studioId, active: true }, select: representativeSelect,
      });
      if (!rep) throw new NotFoundError("Representative", representativeId);
      if (!this.isAdmin(req) && rep.userId !== this.getUserId(req)) throw new ForbiddenError();
      return serializeRepresentative(await db.studioRepresentative.update({
        where: { id: representativeId, studioId, active: true }, data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.email !== undefined && { email: body.email }),
        }, select: representativeSelect,
      }));
    });
    res.json(result);
  }

  async updateStudioApproval(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) throw new ForbiddenError("Only admins can approve or decline studios");
    const { studioId } = StudioIdParamsSchema.parse(req.params);
    const body = UpdateStudioApprovalBodySchema.parse(req.body);
    const result = await this.transaction(async (db) => {
      await this.requireAccess(req, db, studioId);
      return serialize(await db.studio.update({
        where: { id: studioId, deletedAt: null }, data: { approvalStatus: body.status }, select: studioSelect,
      }));
    });
    res.json(result);
  }
}
