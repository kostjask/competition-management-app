import { serializeDto } from "../utils/dto";
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { CreateInvitationSchema, AcceptInvitationSchema, InvitationTokenParamsSchema, InvitationSchema, InvitationPreviewSchema, CreateInvitationResponseSchema, AcceptInvitationResponseSchema } from "@dance/schemas";
import { config } from "../config/env";
import { sendInvitationEmail } from "../utils/email";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";
import { BaseController } from "./BaseController";
import { newIdentitySecret, tokenDigest } from "../services/identityTokens";
import { appendAudit } from "../services/audit";
import { assertStaffScope, recipientLocale } from "../services/staffPolicy";

const invitationSelect = { id: true, email: true, roleKey: true, eventId: true, createdAt: true, expiresAt: true, usedAt: true } satisfies Prisma.InvitationSelect;
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
    res.json(rows.map(row => serializeDto(InvitationSchema, { id: row.id, email: row.email, roleKey: row.roleKey, eventId: row.eventId, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(), usedAt: row.usedAt?.toISOString() ?? null })));
  }
  async create(req: Request, res: Response): Promise<void> {
    this.admin(req);
    const body = CreateInvitationSchema.parse(req.body);
    const event = body.eventId ? await this.prisma.event.findUnique({ where: { id: body.eventId }, select: { id: true, name: true } }) : null;
    if (body.eventId && !event) throw new NotFoundError("Event");
    const role = await this.prisma.role.findUnique({ where: { key: body.roleKey }, select: { id: true } });
    if (!role) throw new NotFoundError("Role");
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
    this.valid(invitation);
    assertStaffScope(invitation);
    res.json(serializeDto(InvitationPreviewSchema, { email: invitation.email, roleKey: invitation.roleKey, event: invitation.event ? { id: invitation.event.id, name: invitation.event.name } : null, expiresAt: invitation.expiresAt.toISOString() }));
  }
  async accept(req: Request, res: Response): Promise<void> {
    const body = AcceptInvitationSchema.parse(req.body);
    const password = await bcrypt.hash(body.password, 10);
    const user = await this.mutation(() => this.prisma.$transaction(async tx => {
      const digest = tokenDigest("INVITATION", body.token);
      const invitation = await tx.invitation.findUnique({ where: { tokenDigest: digest } });
      if (!invitation) throw new NotFoundError("Invitation");
      this.valid(invitation);
      assertStaffScope(invitation);
      if (invitation.eventId && !await tx.event.findUnique({ where: { id: invitation.eventId }, select: { id: true } })) throw new NotFoundError("Event");
      const role = await tx.role.findUnique({ where: { key: invitation.roleKey }, select: { id: true } });
      if (!role) throw new NotFoundError("Role");
      if (role.id !== invitation.roleId) throw new ValidationError("Invitation role changed");
      // Existing-account identity and eligibility policy is P2-INVITE, unchanged here.
      let user = await tx.user.findUnique({ where: { email: invitation.email } });
      if (user && !user.active) throw new ForbiddenError("Account is disabled", "accountDisabled");
      if (user && (await tx.user.updateMany({ where: { id: user.id, active: true }, data: { active: true } })).count !== 1) {
        throw new ForbiddenError("Account is disabled", "accountDisabled");
      }
      if (!user) user = await tx.user.create({ data: { email: invitation.email, name: body.name, password, emailVerified: true, active: true, preferredLocale: invitation.locale } });
      else if (!user.password) user = await tx.user.update({ where: { id: user.id }, data: { password, emailVerified: true } });
      const where = { userId: user.id, roleId: role.id, eventId: invitation.eventId };
      const existing = await tx.userRole.findFirst({ where });
      if (existing?.removedAt) throw new ConflictError("Removed access requires reviewed restoration");
      if (!existing) {
        const assignment = await tx.userRole.create({ data: where });
        await appendAudit(tx, { action: "ACCESS_GRANTED", actor: { kind: "ANONYMOUS" }, targetType: "USER_ROLE", targetId: assignment.id, eventId: invitation.eventId });
      }
      await tx.invitation.update({ where: { id: invitation.id, tokenDigest: digest, usedAt: null, supersededAt: null,
        revokedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      await appendAudit(tx, { action: "INVITATION_ACCEPTED", actor: { kind: "ANONYMOUS" }, targetType: "INVITATION", targetId: invitation.id, eventId: invitation.eventId });
      return user;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    res.status(201).json(serializeDto(AcceptInvitationResponseSchema, { message: "Account created successfully", messageId: "invitationAccepted", token: jwt.sign({ userId: user.id, sessionVersion: user.sessionVersion }, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpiry }), tokenType: "Bearer", user: { id: user.id, email: user.email, name: user.name } }));
  }
}
