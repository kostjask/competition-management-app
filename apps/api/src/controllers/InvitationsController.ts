import { serializeDto } from "../utils/dto";
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { CreateInvitationSchema, AcceptInvitationSchema, InvitationTokenParamsSchema, InvitationSchema, InvitationPreviewSchema, CreateInvitationResponseSchema, AcceptInvitationResponseSchema } from "@dance/schemas";
import { config } from "../config/env";
import { sendInvitationEmail } from "../utils/email";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";
import { BaseController } from "./BaseController";

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
  private valid(invitation: { usedAt: Date | null; expiresAt: Date; supersededAt: Date | null }) {
    if (invitation.usedAt) throw new ValidationError("Invitation already used", undefined, "invitationUsed");
    if (invitation.supersededAt || invitation.expiresAt <= new Date()) throw new ValidationError("Invitation expired", undefined, "invitationExpired");
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
    const invitation = await this.mutation(() => this.prisma.$transaction(async tx => {
      const now = new Date();
      const scope = { email: body.email, roleKey: body.roleKey, eventId: body.eventId ?? null };
      const existing = await tx.invitation.findFirst({ where: { ...scope, usedAt: null, supersededAt: null, expiresAt: { gt: now } } });
      if (existing) throw new ConflictError("Active invitation already exists", undefined, "invitationExists");
      if (body.roleKey !== "representative" && await tx.userRole.findFirst({ where: { user: { email: body.email }, roleId: role.id, eventId: body.eventId ?? null } })) {
        throw new ValidationError("User already has this role", undefined, "roleAssigned");
      }
      // Retain expired links as history and free the outstanding invitation slot atomically.
      await tx.invitation.updateMany({ where: { ...scope, usedAt: null, supersededAt: null, expiresAt: { lte: now } }, data: { supersededAt: now } });
      return tx.invitation.create({ data: { email: body.email, roleKey: body.roleKey, eventId: body.eventId ?? null, token: crypto.randomBytes(32).toString("hex"), createdBy: this.getUserId(req), expiresAt: new Date(Date.now() + 7 * 86400000) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    await sendInvitationEmail({ to: invitation.email, token: invitation.token, roleKey: invitation.roleKey, eventName: event?.name });
    res.status(201).json(serializeDto(CreateInvitationResponseSchema, { message: "Invitation sent", messageId: "invitationSent", invitationId: invitation.id }));
  }
  async inspect(req: Request, res: Response): Promise<void> {
    const { token } = InvitationTokenParamsSchema.parse(req.params);
    const invitation = await this.prisma.invitation.findUnique({ where: { token }, include: { event: { select: { id: true, name: true } } } });
    if (!invitation) throw new NotFoundError("Invitation");
    this.valid(invitation);
    res.json(serializeDto(InvitationPreviewSchema, { email: invitation.email, roleKey: invitation.roleKey, event: invitation.event ? { id: invitation.event.id, name: invitation.event.name } : null, expiresAt: invitation.expiresAt.toISOString() }));
  }
  async accept(req: Request, res: Response): Promise<void> {
    const body = AcceptInvitationSchema.parse(req.body);
    const password = await bcrypt.hash(body.password, 10);
    const user = await this.mutation(() => this.prisma.$transaction(async tx => {
      const invitation = await tx.invitation.findUnique({ where: { token: body.token } });
      if (!invitation) throw new NotFoundError("Invitation");
      this.valid(invitation);
      if (invitation.eventId && !await tx.event.findUnique({ where: { id: invitation.eventId }, select: { id: true } })) throw new NotFoundError("Event");
      const role = await tx.role.findUnique({ where: { key: invitation.roleKey }, select: { id: true } });
      if (!role) throw new NotFoundError("Role");
      // Existing-account identity and eligibility policy is P2-INVITE, unchanged here.
      let user = await tx.user.findUnique({ where: { email: invitation.email } });
      if (!user) user = await tx.user.create({ data: { email: invitation.email, name: body.name, password, emailVerified: true, active: true } });
      else if (!user.password) user = await tx.user.update({ where: { id: user.id }, data: { password, emailVerified: true, active: true } });
      const where = { userId: user.id, roleId: role.id, eventId: invitation.eventId };
      if (!await tx.userRole.findFirst({ where })) await tx.userRole.create({ data: where });
      await tx.invitation.update({ where: { id: invitation.id, usedAt: null, supersededAt: null }, data: { usedAt: new Date() } });
      return user;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    res.status(201).json(serializeDto(AcceptInvitationResponseSchema, { message: "Account created successfully", messageId: "invitationAccepted", token: jwt.sign({ userId: user.id }, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpiry }), tokenType: "Bearer", user: { id: user.id, email: user.email, name: user.name } }));
  }
}
