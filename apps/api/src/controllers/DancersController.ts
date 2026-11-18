import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import {
  CreateDancerBodySchema, UpdateDancerBodySchema, DancerSchema,
  DancerCollectionParamsSchema, DancerItemParamsSchema, DancerArchiveBodySchema, type Dancer,
} from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from "../errors";
import { isActionAllowed } from "../utils/stageChecks";
import { guardEntryWrite, markEntryChanged, entrySettings, entryTransaction } from "../services/entryWorkflow";

import { appendAudit } from "../services/audit";

const dancerSelect = {
  revision: true,
  id: true, studioId: true, firstName: true, lastName: true, birthDate: true, photoUrl: true,
} satisfies Prisma.DancerSelect;
type DancerRecord = Prisma.DancerGetPayload<{ select: typeof dancerSelect }>;

function serialize(dancer: DancerRecord) {
  const result = DancerSchema.safeParse({
    ...dancer, birthDate: dancer.birthDate.toISOString().slice(0, 10),
  });
  if (!result.success) throw new InternalServerError();
  return result.data;
}

export class DancersController extends BaseController {
  private async requireAccess(req: Request, db: Prisma.TransactionClient, studioId: string, write = false) {
    const userId = this.getUserId(req);
    const studio = await db.studio.findFirst({
      where: { id: studioId, deletedAt: null },
      select: {
        eventId: true, approvalStatus: true, event: { select: { stage: true } },
        representatives: { where: { userId, active: true }, select: { id: true } },
        registrations: { select: { eventId: true, status: true, canEditDuringReview: true } },
      },
    });
    if (!studio) throw new NotFoundError("Studio", studioId);
    if (this.isAdmin(req)) return studio.eventId;
    const permissions = req.auth?.permissionsByEvent;
    const permitted = permissions?.get(studio.eventId)?.has("dancer.manage") ||
      permissions?.get(null)?.has("dancer.manage");
    const registration = studio.registrations.find((record) => record.eventId === studio.eventId);
    if (!permitted || studio.representatives.length === 0 || studio.approvalStatus !== "APPROVED" ||
      registration?.status !== "APPROVED") {
      throw new ForbiddenError("Access to studio dancers denied", "ownershipRequired");
    }
    if (write && !isActionAllowed(studio.event.stage, "dancer.manage", registration.canEditDuringReview) && !await entrySettings(db, studio.eventId)) {
      throw new ForbiddenError("Dancer management not allowed in current event stage", "stageLocked");
    }
    return studio.eventId;
  }

  async list(req: Request, res: Response): Promise<void> {
    const { studioId } = DancerCollectionParamsSchema.parse(req.params);
    await this.requireAccess(req, this.prisma, studioId);
    const dancers = await this.prisma.dancer.findMany({
      where: { studioId, deletedAt: null }, select: dancerSelect,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
    });
    res.json(dancers.map(serialize));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { studioId, dancerId } = DancerItemParamsSchema.parse(req.params);
    await this.requireAccess(req, this.prisma, studioId);
    const dancer = await this.prisma.dancer.findFirst({
      where: { id: dancerId, studioId, deletedAt: null }, select: dancerSelect,
    });
    if (!dancer) throw new NotFoundError("Dancer", dancerId);
    res.json(serialize(dancer));
  }


  private async mutate(req: Request, studioId: string, dancerId: string | null,
    action: "CREATE" | "UPDATE" | "ARCHIVE", body: { operationId: string; expectedRevision?: number },
    work: (tx: Prisma.TransactionClient) => Promise<DancerRecord>): Promise<Dancer> {
    const actorId = this.getUserId(req);
    const digest = createHash("sha256").update(JSON.stringify({ studioId, dancerId, action, body })).digest("hex");
    return entryTransaction(this.prisma, async tx => {
      const eventId = await this.requireAccess(req, tx, studioId);
      const previous = await tx.dancerOperation.findUnique({ where: { operationId: body.operationId } });
      if (previous) {
        if (previous.actorId !== actorId || previous.studioId !== studioId || previous.action !== action || previous.digest !== digest) {
          throw new ConflictError("Operation has different content", undefined, "concurrentChange");
        }
        return DancerSchema.parse(previous.response);
      }
      await this.requireAccess(req, tx, studioId, true);
      await guardEntryWrite(tx, eventId, studioId, ["roster"], this.isAdmin(req));
      if (dancerId) {
        const current = await tx.dancer.findFirst({ where: { id: dancerId, studioId, deletedAt: null }, select: dancerSelect });
        if (!current) throw new NotFoundError("Dancer", dancerId);
        if (current.revision !== body.expectedRevision) throw new ConflictError("Dancer changed; compare before saving", undefined, "concurrentChange");
      }
      const dancer = serialize(await work(tx));
      await tx.dancerOperation.create({ data: { operationId: body.operationId, studioId, dancerId: dancer.id, actorId,
        action, digest, revision: dancer.revision, response: dancer } });
      await appendAudit(tx, { action: action === "CREATE" ? "DANCER_CREATED" : action === "UPDATE" ? "DANCER_UPDATED" : "DANCER_ARCHIVED",
        actor: { kind: "USER", userId: actorId }, targetType: "DANCER", targetId: dancer.id, eventId, studioId,
        metadata: { operationId: body.operationId, revision: dancer.revision } });
      await markEntryChanged(tx, eventId, studioId, ["roster"]);
      return dancer;
    });
  }

  async create(req: Request, res: Response): Promise<void> {
    const { studioId } = DancerCollectionParamsSchema.parse(req.params);
    const body = CreateDancerBodySchema.parse(req.body);
    const result = await this.mutate(req, studioId, null, "CREATE", body, tx => tx.dancer.create({
      data: { studioId, firstName: body.firstName, lastName: body.lastName, birthDate: new Date(body.birthDate + "T00:00:00.000Z") }, select: dancerSelect,
    }));
    res.status(201).json(result);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { studioId, dancerId } = DancerItemParamsSchema.parse(req.params);
    const body = UpdateDancerBodySchema.parse(req.body);
    const result = await this.mutate(req, studioId, dancerId, "UPDATE", body, tx => tx.dancer.update({
      where: { id: dancerId, studioId, deletedAt: null, revision: body.expectedRevision },
      data: { revision: { increment: 1 }, ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.birthDate !== undefined && { birthDate: new Date(body.birthDate + "T00:00:00.000Z") }) }, select: dancerSelect,
    }));
    res.json(result);
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { studioId, dancerId } = DancerItemParamsSchema.parse(req.params);
    const body = DancerArchiveBodySchema.parse(req.body);
    await this.mutate(req, studioId, dancerId, "ARCHIVE", body, tx => tx.dancer.update({
      where: { id: dancerId, studioId, deletedAt: null, revision: body.expectedRevision },
      data: { revision: { increment: 1 }, deletedAt: new Date(), deletedBy: this.getUserId(req) }, select: dancerSelect,
    }));
    res.status(204).send();
  }
}
