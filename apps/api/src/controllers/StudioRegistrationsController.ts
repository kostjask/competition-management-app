import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { CreateStudioRegistrationBodySchema, UpdateStudioRegistrationBodySchema, StudioRegistrationParamsSchema,
  StudioRegistrationSchema, EventIdParamsSchema, CancelStudioRegistrationQuerySchema } from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError, ValidationError } from "../errors";
import { assertApplicationWindow, assertReviewWindow, registrationTransaction, reconcileRepresentativeAccess } from "../services/registrationPolicy";
import { notifyReview } from "../services/reviewNotifications";
import { appendAudit } from "../services/audit";

export const registrationSelect = {
  id: true, studioId: true, eventId: true, status: true, revision: true, decisionReason: true,
  canEditDuringReview: true, createdAt: true, updatedAt: true,
  studio: { select: { id: true, name: true, approvalStatus: true, country: true, city: true } },
} satisfies Prisma.StudioEventRegistrationSelect;
type RegistrationRecord = Prisma.StudioEventRegistrationGetPayload<{ select: typeof registrationSelect }>;
export function serializeRegistration(row: RegistrationRecord) {
  // Explicit projection also keeps private retry bindings out of DTOs.
  return StudioRegistrationSchema.parse({ id: row.id, studioId: row.studioId, eventId: row.eventId,
    nextActor: row.status === "LOCKED" ? "NONE" : ["CANCELLED", "REJECTED"].includes(row.status) || row.studio.approvalStatus === "REJECTED" ? "APPLICANT" : row.status === "PENDING" || row.studio.approvalStatus === "PENDING" ? "ORGANIZER" : "APPLICANT",
    status: row.status, revision: row.revision, decisionReason: row.decisionReason,
    canEditDuringReview: row.canEditDuringReview, studio: row.studio,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
}

export class StudioRegistrationsController extends BaseController {
  private async owner(req: Request, tx: Prisma.TransactionClient, studioId: string, eventId: string) {
    const studio = await tx.studio.findFirst({ where: { id: studioId, eventId, deletedAt: null },
      select: { representatives: { where: { active: true }, select: { userId: true } } } });
    if (!studio) throw new NotFoundError("Studio");
    if (!this.isAdmin(req) && !studio.representatives.some(r => r.userId === this.getUserId(req))) {
      throw new ForbiddenError("Owner required", "ownershipRequired");
    }
    return studio;
  }

  async create(req: Request, res: Response): Promise<void> {
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const body = CreateStudioRegistrationBodySchema.parse(req.body);
    if ("studioId" in body) { await this.reapply(req, res, eventId, body.studioId, body.revision); return; }
    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);
    const digest = createHash("sha256").update(JSON.stringify({ eventId, ...body })).digest("hex");
    if (!isAdmin && (!body.representativeName || !body.representativeEmail)) {
      throw new ValidationError("Representative name and email are required");
    }
    const result = await registrationTransaction(this.prisma, async tx => {
      const event = await tx.event.findUnique({ where: { id: eventId }, select: { stage: true, registrationDeadline: true } });
      if (!event) throw new NotFoundError("Event");
      if (body.operationId) {
        const existing = await tx.studioEventRegistration.findUnique({ where: { operationId: body.operationId },
          select: { ...registrationSelect, createdBy: true, requestDigest: true } });
        if (existing) {
          if (existing.createdBy !== userId || existing.requestDigest !== digest) throw new ConflictError("Operation changed", undefined, "concurrentChange");
          await this.owner(req, tx, existing.studioId, eventId);
          return serializeRegistration(existing);
        }
      }
      assertApplicationWindow(event);
      if (body.onboarding) {
        // Bind draft completion to this verified owner, exact revision and selected event.
        const completed = await tx.onboardingDraft.updateMany({ where: {
          id: body.onboarding.draftId, userId, revision: body.onboarding.revision, status: "DRAFT",
          OR: [{ intendedEventId: null }, { intendedEventId: eventId }],
        }, data: { status: "COMPLETED", revision: { increment: 1 } } });
        if (completed.count !== 1) throw new ConflictError("Reload onboarding draft", undefined, "concurrentChange");
      }
      const studio = await tx.studio.create({ data: {
        eventId, name: body.name, country: body.country ?? null, city: body.city ?? null, directorName: body.directorName ?? null,
        directorPhone: body.directorPhone ?? null, ...(body.invoiceDetails !== undefined && { invoiceDetails: body.invoiceDetails }), approvalStatus: "PENDING",
        ...(!isAdmin && body.representativeName && body.representativeEmail && { representatives: { create: {
          userId, name: body.representativeName, email: body.representativeEmail,
        } } }),
        registrations: { create: { eventId, status: "PENDING", canEditDuringReview: false, createdBy: userId,
          operationId: body.operationId ?? null, requestDigest: body.operationId ? digest : null } },
      }, select: { registrations: { select: registrationSelect } } });
      const registration = studio.registrations[0];
      if (!registration) throw new InternalServerError();
      await appendAudit(tx, { action: "REGISTRATION_CREATED", actor: { kind: "USER", userId },
        targetType: "REGISTRATION", targetId: registration.id, eventId, studioId: registration.studioId, metadata: { revision: registration.revision } });
      return serializeRegistration(registration);
    }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Studio with this name already exists", undefined, "duplicateName");
      }
      throw error;
    });
    res.status(201).json(result);
  }

  async list(req: Request, res: Response): Promise<void> {
    const { eventId } = EventIdParamsSchema.parse(req.params);
    if (!await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })) throw new NotFoundError("Event");
    const rows = await this.prisma.studioEventRegistration.findMany({ where: { eventId, studio: { eventId, deletedAt: null,
      ...(!this.isAdmin(req) && { representatives: { some: { userId: this.getUserId(req), active: true } } }),
    } }, select: registrationSelect, orderBy: { studio: { name: "asc" } } });
    res.json(rows.map(serializeRegistration));
  }

  async update(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) throw new ForbiddenError("Only admins can update event decisions");
    const { studioId, eventId } = StudioRegistrationParamsSchema.parse(req.params);
    const body = UpdateStudioRegistrationBodySchema.parse(req.body);
    const result = await registrationTransaction(this.prisma, async tx => {
      const studio = await this.owner(req, tx, studioId, eventId);
      const current = await tx.studioEventRegistration.findUnique({ where: { studioId_eventId: { studioId, eventId } }, select: registrationSelect });
      if (!current) throw new NotFoundError("Registration");
      const reason = body.status === "REJECTED" ? body.reason ?? "CONTACT_ORGANIZER" : null;
      const canEdit = body.canEditDuringReview ?? current.canEditDuringReview;
      if (current.status === body.status && current.decisionReason === reason && current.canEditDuringReview === canEdit
        && (body.revision === current.revision || body.revision === current.revision - 1)) return serializeRegistration(current);
      if (body.revision !== current.revision) throw new ConflictError("Reload registration", undefined, "concurrentChange");
      const event = await tx.event.findUnique({ where: { id: eventId }, select: { stage: true } });
      if (!event) throw new NotFoundError("Event");
      assertReviewWindow(event.stage);
      if (["CANCELLED", "LOCKED"].includes(current.status)) throw new ForbiddenError("Review unavailable", "pendingRequired");
      const updated = await tx.studioEventRegistration.update({ where: { id: current.id, revision: body.revision },
        data: { status: body.status, decisionReason: reason, canEditDuringReview: canEdit, revision: { increment: 1 } }, select: registrationSelect });
      await reconcileRepresentativeAccess(tx, eventId, studio.representatives.map(r => r.userId), this.getUserId(req));
      await appendAudit(tx, { action: "REGISTRATION_APPROVAL_CHANGED", actor: { kind: "USER", userId: this.getUserId(req) },
        targetType: "REGISTRATION", targetId: current.id, eventId, studioId, metadata: { fromStatus: current.status, toStatus: body.status, revision: updated.revision, reasonCode: reason, reviewAllowed: canEdit } });
      await notifyReview(tx, current.id, "EVENT", body.status, updated.revision, reason);
      return serializeRegistration(updated);
    });
    res.json(result);
  }

  async cancel(req: Request, res: Response): Promise<void> {
    const { studioId, eventId } = StudioRegistrationParamsSchema.parse(req.params);
    const { revision } = CancelStudioRegistrationQuerySchema.parse(req.query);
    const userId = this.getUserId(req);
    await registrationTransaction(this.prisma, async tx => {
      await this.owner(req, tx, studioId, eventId);
      const current = await tx.studioEventRegistration.findUnique({ where: { studioId_eventId: { studioId, eventId } } });
      if (!current) throw new NotFoundError("Registration");
      if (current.status === "CANCELLED" && current.revision === revision + 1) return;
      if (current.revision !== revision) throw new ConflictError("Reload registration", undefined, "concurrentChange");
      const event = await tx.event.findUnique({ where: { id: eventId }, select: { stage: true } });
      if (!event) throw new NotFoundError("Event");
      assertReviewWindow(event.stage);
      if (current.status !== "PENDING") throw new ForbiddenError("Only pending cancellation allowed", "pendingRequired");
      const changed = await tx.studioEventRegistration.updateMany({ where: { id: current.id, revision, status: "PENDING",
        studio: { eventId, deletedAt: null, ...(!this.isAdmin(req) && { representatives: { some: { userId, active: true } } }) },
      }, data: { status: "CANCELLED", canEditDuringReview: false, revision: { increment: 1 } } });
      if (changed.count !== 1) throw new ConflictError("Reload registration", undefined, "concurrentChange");
      await appendAudit(tx, { action: "REGISTRATION_CANCELLED", actor: { kind: "USER", userId }, targetType: "REGISTRATION",
        targetId: current.id, eventId, studioId, metadata: { fromStatus: "PENDING", toStatus: "CANCELLED", revision: revision + 1 } });
    });
    res.status(204).send();
  }

  private async reapply(req: Request, res: Response, eventId: string, studioId: string, revision: number) {
    const userId = this.getUserId(req);
    const result = await registrationTransaction(this.prisma, async tx => {
      await this.owner(req, tx, studioId, eventId);
      const current = await tx.studioEventRegistration.findUnique({ where: { studioId_eventId: { studioId, eventId } }, select: registrationSelect });
      if (!current) throw new NotFoundError("Registration");
      if (current.status === "PENDING" && current.revision === revision + 1) return serializeRegistration(current);
      if (current.revision !== revision) throw new ConflictError("Reload registration", undefined, "concurrentChange");
      const event = await tx.event.findUnique({ where: { id: eventId }, select: { stage: true, registrationDeadline: true } });
      if (!event) throw new NotFoundError("Event");
      assertApplicationWindow(event);
      if (!["CANCELLED", "REJECTED"].includes(current.status)) throw new ForbiddenError("Reapplication unavailable", "pendingRequired");
      const updated = await tx.studioEventRegistration.update({ where: { id: current.id, revision },
        data: { status: "PENDING", canEditDuringReview: false, decisionReason: null, revision: { increment: 1 } }, select: registrationSelect });
      await appendAudit(tx, { action: "REGISTRATION_REAPPLIED", actor: { kind: "USER", userId }, targetType: "REGISTRATION",
        targetId: current.id, eventId, studioId, metadata: { fromStatus: current.status, toStatus: "PENDING", revision: updated.revision } });
      return serializeRegistration(updated);
    });
    res.json(result);
  }
}
