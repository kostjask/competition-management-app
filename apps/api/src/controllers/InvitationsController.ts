import { serializeDto } from "../utils/dto";
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { CreateInvitationSchema, AcceptInvitationSchema, InvitationTokenParamsSchema, InvitationIdParamsSchema, InvitationCommandSchema, InvitationPreviewSchema, CreateInvitationResponseSchema, AcceptInvitationResponseSchema, ResendInvitationResponseSchema, RevokeInvitationResponseSchema } from "@dance/schemas";
import { issueSession } from "../services/browserSession";
import { sendInvitationEmail } from "../utils/email";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "../errors";
import { BaseController } from "./BaseController";
import { newIdentitySecret, tokenDigest } from "../services/identityTokens";
import { appendAudit } from "../services/audit";
import { invitationSelect, invitationView } from "../services/invitationView";
import { assertStaffScope, recipientLocale, invitationState } from "../services/staffPolicy";


export class InvitationsController extends BaseController {
  private admin(req: Request) { if (!this.isAdmin(req)) throw new ForbiddenError(); }
  private async mutation<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (["P2002", "P2034"].includes(error.code)) throw new ConflictError("Invitation or access changed concurrently");
        if (error.code === "P2003") throw new ConflictError("Invitation relationship changed");
        if (error.code === "P2025") throw new NotFoundError("Invitation");
      }
      throw error;
    }
  }
  private valid(invitation: { usedAt: Date | null; expiresAt: Date; supersededAt: Date | null; revokedAt: Date | null }) {
    if (invitation.usedAt) throw new ValidationError("Invitation already used", undefined, "invitationUsed");
    if (invitation.revokedAt || invitation.supersededAt || invitation.expiresAt <= new Date()) throw new ValidationError("Invitation expired", undefined, "invitationExpired");
  }
  async list(req: Request, res: Response): Promise<void> {
    this.admin(req);
    const rows = await this.prisma.invitation.findMany({ select: invitationSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
    res.json(rows.map(invitationView));
  }
  async create(req: Request, res: Response): Promise<void> {
    this.admin(req);
    const body = CreateInvitationSchema.parse(req.body);
    const event = body.eventId ? await this.prisma.event.findUnique({ where: { id: body.eventId }, select: { id: true, name: true } }) : null;
    if (body.eventId && !event) throw new NotFoundError("Event");
    const role = await this.prisma.role.findUnique({ where: { key: body.roleKey }, select: { id: true } });
    if (!role) throw new NotFoundError("Role");
    assertStaffScope({ roleId: role.id, roleKey: body.roleKey, eventId: body.eventId, studioId: null });
    const recipient = await this.prisma.user.findUnique({ where: { email: body.email }, select: { preferredLocale: true } });
    const locale = recipientLocale(body.locale, recipient?.preferredLocale);
    const secret = newIdentitySecret("INVITATION");
    const invitation = await this.mutation(() => this.prisma.$transaction(async tx => {
      const now = new Date();
      const scope = { email: body.email, roleKey: body.roleKey, eventId: body.eventId ?? null };
      const existing = await tx.invitation.findFirst({ where: { ...scope, usedAt: null, supersededAt: null, expiresAt: { gt: now } } });
      if (existing) throw new ConflictError("Active invitation already exists", undefined, "invitationExists");
      if (await tx.userRole.findFirst({ where: { user: { email: body.email }, roleId: role.id, eventId: body.eventId, removedAt: null } })) {
        throw new ValidationError("User already has this role", undefined, "roleAssigned");
      }
      // Retain expired links as history and free the outstanding invitation slot atomically.
      await tx.invitation.updateMany({ where: { ...scope, usedAt: null, supersededAt: null, expiresAt: { lte: now } }, data: { supersededAt: now } });
      const created = await tx.invitation.create({ data: { email: body.email, roleKey: body.roleKey, roleId: role.id, studioId: null, locale, eventId: body.eventId, tokenDigest: secret.digest, createdBy: this.getUserId(req), expiresAt: secret.expiresAt } });
      await appendAudit(tx, { action: "INVITATION_CREATED", actor: { kind: "USER", userId: this.getUserId(req) }, targetType: "INVITATION", targetId: created.id, eventId: created.eventId });
      await sendInvitationEmail({ to: created.email, token: secret.raw, roleKey: created.roleKey, eventName: event?.name, locale }, tx);
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    res.status(201).json(serializeDto(CreateInvitationResponseSchema, { message: "Invitation created. Email delivery is unconfirmed.", messageId: "invitationCreated", invitationId: invitation.id, delivery: "unconfirmed" }));
  }
  async inspect(req: Request, res: Response): Promise<void> {
    const { token } = InvitationTokenParamsSchema.parse(req.params);
    const invitation = await this.prisma.invitation.findUnique({ where: { tokenDigest: tokenDigest("INVITATION", token) }, include: { event: { select: { id: true, name: true } } } });
    if (!invitation) throw new NotFoundError("Invitation");
    assertStaffScope(invitation);
    const account = await this.prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
    res.json(serializeDto(InvitationPreviewSchema, { email: invitation.email, roleKey: invitation.roleKey, event: invitation.event ? { id: invitation.event.id, name: invitation.event.name } : null, expiresAt: invitation.expiresAt.toISOString(), status: invitationState(invitation), accountExists: !!account }));
  }
  async resend(req: Request, res: Response): Promise<void> { await this.command(req, res, "resend"); }
  async revoke(req: Request, res: Response): Promise<void> { await this.command(req, res, "revoke"); }
  private async command(req: Request, res: Response, kind: "resend" | "revoke"): Promise<void> {
    this.admin(req);
    const { invitationId } = InvitationIdParamsSchema.parse(req.params);
    const body = InvitationCommandSchema.parse(req.body);
    await this.mutation(() => this.prisma.$transaction(async tx => {
      const row = await tx.invitation.findUnique({ where: { id: invitationId }, include: { event: { select: { id: true, name: true } } } });
      if (!row) throw new NotFoundError("Invitation");
      assertStaffScope(row);
      if (row.expiresAt.toISOString() !== body.expiresAt || row.usedAt) throw new ConflictError("Invitation changed");
      if (kind === "revoke" && row.revokedAt) return;
      if (row.revokedAt || row.supersededAt || row.expiresAt <= new Date()) throw new ConflictError("Invitation is not pending");
      if (!row.event) throw new NotFoundError("Event");
      const role = await tx.role.findUnique({ where: { key: row.roleKey }, select: { id: true } });
      if (!role || role.id !== row.roleId) throw new ConflictError("Invitation role changed");
      const secret = newIdentitySecret("INVITATION");
      if (secret.expiresAt.getTime() === row.expiresAt.getTime()) secret.expiresAt.setTime(secret.expiresAt.getTime() + 1);
      const now = new Date();
      const changed = await tx.invitation.updateMany({ where: { id: row.id, tokenDigest: row.tokenDigest, expiresAt: row.expiresAt, usedAt: null, revokedAt: null, supersededAt: null },
        data: kind === "resend" ? { tokenDigest: secret.digest, expiresAt: secret.expiresAt } : { revokedAt: now, supersededAt: now } });
      if (changed.count !== 1) throw new ConflictError("Invitation changed");
      await appendAudit(tx, { action: kind === "resend" ? "INVITATION_ROTATED" : "INVITATION_REVOKED", actor: { kind: "USER", userId: this.getUserId(req) }, targetType: "INVITATION", targetId: row.id, eventId: row.eventId });
      if (kind === "resend") await sendInvitationEmail({ to: row.email, token: secret.raw, roleKey: row.roleKey, eventName: row.event.name, locale: row.locale }, tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    res.json(kind === "resend" ? serializeDto(ResendInvitationResponseSchema, { invitationId, messageId: "invitationResent", delivery: "unconfirmed" })
      : serializeDto(RevokeInvitationResponseSchema, { invitationId, messageId: "invitationRevoked" }));
  }
  async accept(req: Request, res: Response): Promise<void> {
    const body = AcceptInvitationSchema.parse(req.body);
    const result = await this.mutation(() => this.prisma.$transaction(async tx => {
      const digest = tokenDigest("INVITATION", body.token);
      const invitation = await tx.invitation.findUnique({ where: { tokenDigest: digest } });
      if (!invitation) throw new NotFoundError("Invitation");
      this.valid(invitation);
      assertStaffScope(invitation);
      if (invitation.eventId && !await tx.event.findUnique({ where: { id: invitation.eventId }, select: { id: true } })) throw new NotFoundError("Event");
      const role = await tx.role.findUnique({ where: { key: invitation.roleKey }, select: { id: true } });
      if (!role) throw new NotFoundError("Role");
      if (role.id !== invitation.roleId) throw new ValidationError("Invitation role changed");
      let user = await tx.user.findUnique({ where: { email: invitation.email } });
      const accountCreated = !user;
      if (user) {
        if (!user.active) throw new ForbiddenError("Account is disabled", "accountDisabled");
        if (!req.auth) throw new UnauthorizedError();
        if (req.auth.userId !== user.id) throw new ForbiddenError();
        // Recheck and lock inside the transaction, serializing acceptance with
        // deactivation, email correction and credential/session revision changes.
        const locked = await tx.user.updateMany({ where: { id: user.id, email: invitation.email,
          active: true, emailVerified: true, sessionVersion: req.auth.sessionVersion }, data: { active: true } });
        if (locked.count !== 1) throw new UnauthorizedError();
      } else {
        if (req.auth) throw new ForbiddenError();
        if (!("name" in body)) throw new ValidationError("New accounts require name and password");
        const password = await bcrypt.hash(body.password, 10);
        user = await tx.user.create({ data: { email: invitation.email, name: body.name, password, emailVerified: true, active: true, preferredLocale: invitation.locale } });
      }
      const actor = { kind: "USER", userId: user.id } as const;
      const where = { userId: user.id, roleId: role.id, eventId: invitation.eventId };
      const existing = await tx.userRole.findFirst({ where });
      if (existing?.removedAt) throw new ConflictError("Removed access requires reviewed restoration");
      let assignment = existing;
      if (!assignment) {
        assignment = await tx.userRole.create({ data: where });
        await appendAudit(tx, { action: "ACCESS_GRANTED", actor, targetType: "USER_ROLE", targetId: assignment.id, eventId: invitation.eventId });
      }
      if (invitation.roleKey === "judge" && invitation.eventId) {
        const judge = await tx.judge.findUnique({ where: { userId_eventId: { userId: user.id, eventId: invitation.eventId } } });
        if (!judge) {
          await tx.judge.create({ data: { userId: user.id, eventId: invitation.eventId, name: user.name } });
          await appendAudit(tx, { action: "ACCESS_RECONCILED", actor, targetType: "USER_ROLE", targetId: assignment.id, eventId: invitation.eventId, metadata: { roleKey: "judge" } });
        }
      }
      await tx.invitation.update({ where: { id: invitation.id, tokenDigest: digest, usedAt: null, supersededAt: null,
        revokedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      await appendAudit(tx, { action: "INVITATION_ACCEPTED", actor, targetType: "INVITATION", targetId: invitation.id, eventId: invitation.eventId });
      return { user, accountCreated };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    const { user, accountCreated } = result;
    res.status(201).json(serializeDto(AcceptInvitationResponseSchema, {
      message: "Invitation accepted", messageId: "invitationAccepted", user: { id: user.id, email: user.email, name: user.name },
      ...(accountCreated ? { accountCreated: true, ...issueSession(req, res, user) } : { accountCreated: false }),
    }));
  }
}
