import type { Request, Response } from "express";
import { isDeepStrictEqual } from "node:util";
import { Prisma } from "@prisma/client";
import {
  UpdateStudioBodySchema, UpdateRepresentativeBodySchema, UpdateStudioApprovalBodySchema,
  StudioIdParamsSchema, StudioIdRepIdParamsSchema, StudioSchema, StudioRepresentativeSchema,
} from "@dance/schemas";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from "../errors";
import { isActionAllowed } from "../utils/stageChecks";
import { BaseController } from "./BaseController";
import { assertApplicationWindow, reconcileRepresentativeAccess, registrationTransaction } from "../services/registrationPolicy";
import { appendAudit } from "../services/audit";
import { queueReviewNotice } from "../services/reviewNotifications";

const representativeSelect = {
  id: true, studioId: true, userId: true, name: true, email: true, active: true, createdAt: true,
} satisfies Prisma.StudioRepresentativeSelect;
const studioSelect = {
  id: true, eventId: true, name: true, approvalStatus: true, approvalReason: true, country: true, city: true,
  directorName: true, directorPhone: true, invoiceDetails: true, logoUrl: true,
  representatives: { where: { active: true }, select: representativeSelect, orderBy: { id: "asc" } },
  registrations: { select: {
    id: true, studioId: true, eventId: true, status: true, canEditDuringReview: true, revision: true, decisionReason: true, createdAt: true, updatedAt: true,
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
    id: studio.id, eventId: studio.eventId, name: studio.name, approvalStatus: studio.approvalStatus, approvalReason: studio.approvalReason,
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
    try { return await registrationTransaction(this.prisma, work); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Studio with this name already exists", undefined, "duplicateName");
      }
      throw error;
    }
  }

  private async requireAccess(req: Request, db: Prisma.TransactionClient, studioId: string, write = false, allowPendingCorrection = false) {
    const studio = await db.studio.findFirst({
      where: { id: studioId, deletedAt: null },
      select: { ...studioSelect, event: { select: { stage: true, registrationDeadline: true } } },
    });
    if (!studio) throw new NotFoundError("Studio", studioId);
    if (this.isAdmin(req)) return studio;
    if (!studio.representatives.some((r) => r.userId === this.getUserId(req) && r.active)) {
      throw new ForbiddenError("Access to studio denied", "ownershipRequired");
    }
    if (write) {
      const pendingApplication = studio.registrations.some(r => r.eventId === studio.eventId && r.status === "PENDING");
      if (allowPendingCorrection && pendingApplication) { assertApplicationWindow(studio.event); return studio; }
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
      const studio = await this.requireAccess(req, db, studioId, true, true);
      const receipt = studio.registrations.find(r => r.eventId === studio.eventId);
      if (body.expectedRevision !== undefined && receipt?.revision !== body.expectedRevision) {
        const matches = Object.entries(body).every(([key, value]) => key === "expectedRevision" || value === undefined || isDeepStrictEqual(Reflect.get(studio, key), value));
        if (receipt?.revision === body.expectedRevision + 1 && matches) return serialize(studio);
        throw new ConflictError("Reload application", undefined, "concurrentChange");
      }
      const name = body.name ?? studio.name;
      // Match the SQL-only global partial unique index on active studio names.
      if (name !== studio.name && await db.studio.findFirst({
        where: { id: { not: studioId }, name, deletedAt: null }, select: { id: true },
      })) {
        throw new ConflictError("Studio with this name already exists", undefined, "duplicateName");
      }
      const pending = studio.registrations.find(r => r.eventId === studio.eventId && r.status === "PENDING");
      const editingReceipt = pending ?? (body.expectedRevision !== undefined ? receipt : undefined);
      if (editingReceipt) {
        const changed = await db.studioEventRegistration.updateMany({ where: { id: editingReceipt.id, revision: editingReceipt.revision }, data: { revision: { increment: 1 } } });
        if (changed.count !== 1) throw new ConflictError("Reload application", undefined, "concurrentChange");
        await appendAudit(db, { action: "REGISTRATION_CORRECTED", actor: { kind: "USER", userId: this.getUserId(req) }, targetType: "REGISTRATION", targetId: editingReceipt.id, eventId: studio.eventId, studioId, metadata: { revision: editingReceipt.revision + 1 } });
      }
      const updated = await db.studio.update({
        where: { id: studioId, deletedAt: null },
        data: {
          ...(pending && { approvalStatus: "PENDING", approvalReason: null }),
          ...(body.name !== undefined && { name: body.name }),
          ...(body.country !== undefined && { country: body.country }),
          ...(body.city !== undefined && { city: body.city }),
          ...(body.directorName !== undefined && { directorName: body.directorName }),
          ...(body.directorPhone !== undefined && { directorPhone: body.directorPhone }),
          ...(body.invoiceDetails !== undefined && { invoiceDetails: body.invoiceDetails === null ? Prisma.DbNull : body.invoiceDetails }),
        }, select: studioSelect,
      });
      if (pending && studio.approvalStatus === "APPROVED") await reconcileRepresentativeAccess(db, studio.eventId, studio.representatives.map(r => r.userId), this.getUserId(req));
      return serialize(updated);
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
      const studio = await this.requireAccess(req, db, studioId, true, true);
      const rep = await db.studioRepresentative.findFirst({
        where: { id: representativeId, studioId, active: true }, select: representativeSelect,
      });
      if (!rep) throw new NotFoundError("Representative", representativeId);
      if (!this.isAdmin(req) && rep.userId !== this.getUserId(req)) throw new ForbiddenError();
      const receipt = studio.registrations.find(r => r.eventId === studio.eventId);
      if (body.expectedRevision !== undefined && receipt?.revision !== body.expectedRevision) {
        if (receipt?.revision === body.expectedRevision + 1 && (body.name === undefined || body.name === rep.name) && (body.email === undefined || body.email === rep.email)) return serializeRepresentative(rep);
        throw new ConflictError("Reload application", undefined, "concurrentChange");
      }
      if (receipt && body.expectedRevision !== undefined) {
        await db.studioEventRegistration.update({ where: { id: receipt.id, revision: body.expectedRevision }, data: { revision: { increment: 1 } } });
        await appendAudit(db, { action: "REGISTRATION_CORRECTED", actor: { kind: "USER", userId: this.getUserId(req) }, targetType: "REGISTRATION", targetId: receipt.id, eventId: studio.eventId, studioId, metadata: { revision: receipt.revision + 1 } });
      }
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
      const current = await this.requireAccess(req, db, studioId);
      const registration = current.registrations.find(row => row.eventId === current.eventId);
      if (!registration) throw new NotFoundError("Registration");
      const reason = body.status === "REJECTED" ? body.reason ?? "CONTACT_ORGANIZER" : null;
      if (current.approvalStatus === body.status && current.approvalReason === reason
        && (body.revision === registration.revision || body.revision === registration.revision - 1)) return serialize(current);
      if (body.revision !== registration.revision) throw new ConflictError("Reload application", undefined, "concurrentChange");
      const receipt = await db.studioEventRegistration.update({ where: { id: registration.id, revision: body.revision },
        data: { revision: { increment: 1 } } });
      const updated = await db.studio.update({
        where: { id: studioId, deletedAt: null }, data: { approvalStatus: body.status, approvalReason: reason }, select: studioSelect,
      });
      await reconcileRepresentativeAccess(db, current.eventId, current.representatives.map(r => r.userId), this.getUserId(req));
      await appendAudit(db, { action: "STUDIO_APPROVAL_CHANGED", actor: { kind: "USER", userId: this.getUserId(req) }, targetType: "STUDIO", targetId: studioId, eventId: current.eventId, studioId, metadata: { fromStatus: current.approvalStatus, toStatus: body.status, revision: receipt.revision, reasonCode: reason } });
      await queueReviewNotice(db, receipt, "ORGANIZATION");
      return serialize(updated);
    });
    res.json(result);
  }
}
