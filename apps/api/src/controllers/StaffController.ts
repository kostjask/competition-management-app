import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { StaffAssignmentParamsSchema, StaffEventParamsSchema, StaffOverviewSchema, RemoveStaffSchema } from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import { appendAudit } from "../services/audit";
import { invitationSelect, invitationView } from "../services/invitationView";
import { serializeDto } from "../utils/dto";

export class StaffController extends BaseController {
  async list(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) throw new ForbiddenError();
    const { eventId } = StaffEventParamsSchema.parse(req.params);
    const overview = await this.prisma.$transaction(async tx => {
      const event = await tx.event.findUnique({ where: { id: eventId }, select: { id: true, name: true } });
      if (!event) throw new NotFoundError("Event");
      const invitations = await tx.invitation.findMany({ where: { eventId, roleKey: { in: ["judge", "moderator"] }, roleId: { not: null }, studioId: null }, select: invitationSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
      const assignments = await tx.userRole.findMany({ where: { eventId, role: { key: { in: ["judge", "moderator"] } } }, select: {
        id: true, removedAt: true, role: { select: { key: true } },
        user: { select: { id: true, name: true, email: true, active: true, emailVerified: true, judges: { where: { eventId }, select: { id: true } } } },
      }, orderBy: { id: "asc" } });
      return { event, invitations: invitations.map(invitationView), assignments: assignments.map(row => ({
        id: row.id, roleKey: row.role.key, removedAt: row.removedAt?.toISOString() ?? null,
        user: { id: row.user.id, name: row.user.name, email: row.user.email },
        status: row.removedAt ? "REMOVED" : !row.user.active || !row.user.emailVerified ? "ACCOUNT_UNAVAILABLE" : row.role.key === "judge" && !row.user.judges.length ? "JUDGE_MISSING" : "ACTIVE",
      })) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    res.json(serializeDto(StaffOverviewSchema, overview));
  }

  async remove(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) throw new ForbiddenError();
    const { eventId, assignmentId } = StaffAssignmentParamsSchema.parse(req.params);
    RemoveStaffSchema.parse(req.body);
    try {
      await this.prisma.$transaction(async tx => {
        const assignment = await tx.userRole.findFirst({ where: { id: assignmentId, eventId }, include: { role: true } });
        if (!assignment) throw new NotFoundError("Staff assignment");
        if (!["judge", "moderator"].includes(assignment.role.key)) throw new ForbiddenError();
        if (assignment.removedAt) return;
        await tx.userRole.update({ where: { id: assignment.id, removedAt: null }, data: { removedAt: new Date() } });
        await appendAudit(tx, { action: "ACCESS_REMOVED", actor: { kind: "USER", userId: this.getUserId(req) }, targetType: "USER_ROLE", targetId: assignment.id, eventId });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2025"].includes(error.code)) throw new ConflictError("Staff access changed concurrently");
      throw error;
    }
    res.status(204).end();
  }
}
