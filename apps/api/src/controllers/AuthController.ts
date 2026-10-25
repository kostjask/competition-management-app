import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  RegisterSchema, LoginSchema, VerifyEmailSchema, RegisterResponseSchema,
  AuthResponseSchema, VerifyEmailResponseSchema, UserProfileSchema,
  ResendVerificationSchema, CorrectEmailSchema, RequestPasswordResetSchema, ResetPasswordSchema,
  AuthRequestAcceptedSchema, ResetPasswordResponseSchema,
} from "@dance/schemas";
import type { z } from "zod";
import { sendVerificationEmail } from "../utils/email";
import { config } from "../config/env";
import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError, InternalServerError } from "../errors";
import { BaseController } from "./BaseController";
import { newIdentitySecret, verifyAccountEmail, recoverAccountPassword } from "../services/identityTokens";
import { requestAuthRecovery, defaultRecoveryDelivery, type RecoveryDelivery } from "../services/authRecovery";
import { appendAudit } from "../services/audit";

const identitySelect = { id: true, email: true, name: true, sessionVersion: true } satisfies Prisma.UserSelect;
const profileSelect = {
  ...identitySelect, createdAt: true,
  roles: { where: { removedAt: null }, select: {
    id: true, eventId: true,
    role: { select: { id: true, key: true, name: true } },
    event: { select: { id: true, name: true } },
  }, orderBy: { id: "asc" } },
} satisfies Prisma.UserSelect;

function response<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new InternalServerError();
  return result.data;
}
function session(user: Prisma.UserGetPayload<{ select: typeof identitySelect }>) {
  return {
    token: jwt.sign({ userId: user.id, sessionVersion: user.sessionVersion }, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpiry }),
    tokenType: "Bearer",
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export class AuthController extends BaseController {
  constructor(prisma: PrismaClient, private delivery: RecoveryDelivery = defaultRecoveryDelivery) {
    super(prisma);
  }

  async resendVerification(req: Request, res: Response): Promise<void> {
    const body = ResendVerificationSchema.parse(req.body);
    await requestAuthRecovery(this.prisma, this.delivery, { kind: "verification", ...body });
    res.status(202).json(response(AuthRequestAcceptedSchema, { messageId: "authRequestAccepted", delivery: "unconfirmed" }));
  }
  async correctEmail(req: Request, res: Response): Promise<void> {
    const body = CorrectEmailSchema.parse(req.body);
    await requestAuthRecovery(this.prisma, this.delivery, { kind: "correction", ...body });
    res.status(202).json(response(AuthRequestAcceptedSchema, { messageId: "authRequestAccepted", delivery: "unconfirmed" }));
  }
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    const body = RequestPasswordResetSchema.parse(req.body);
    await requestAuthRecovery(this.prisma, this.delivery, { kind: "recovery", ...body });
    res.status(202).json(response(AuthRequestAcceptedSchema, { messageId: "authRequestAccepted", delivery: "unconfirmed" }));
  }
  async resetPassword(req: Request, res: Response): Promise<void> {
    const body = ResetPasswordSchema.parse(req.body);
    await recoverAccountPassword(this.prisma, body.token, body.password);
    res.json(response(ResetPasswordResponseSchema, { messageId: "passwordReset" }));
  }
  async register(req: Request, res: Response): Promise<void> {
    const body = RegisterSchema.parse(req.body);
    const existing = await this.prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (existing) throw new ConflictError("Email already registered", undefined, "emailRegistered");
    const hashedPassword = await bcrypt.hash(body.password, 10);
    const verification = newIdentitySecret("VERIFY_EMAIL");
    let user: Prisma.UserGetPayload<{ select: typeof identitySelect }>;
    try {
      user = await this.prisma.$transaction(async tx => {
        const created = await tx.user.create({
          data: { email: body.email, name: body.name, password: hashedPassword, emailVerified: false, preferredLocale: body.locale ?? null,
            accountTokens: { create: { email: body.email, purpose: "VERIFY_EMAIL", digest: verification.digest, expiresAt: verification.expiresAt } } },
          select: identitySelect,
        });
        await appendAudit(tx, { action: "ACCOUNT_REGISTERED", actor: { kind: "ANONYMOUS" }, targetType: "USER", targetId: created.id });
        await sendVerificationEmail({ to: created.email, token: verification.raw, name: created.name, locale: body.locale }, tx);
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Email already registered", undefined, "emailRegistered");
      }
      throw error;
    }
    res.status(201).json(response(RegisterResponseSchema, {
      message: "Registration accepted. Email delivery is unconfirmed.", messageId: "registered", userId: user.id, delivery: "unconfirmed",
    }));
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = VerifyEmailSchema.parse(req.body);
    const user = await verifyAccountEmail(this.prisma, token);
    res.json(response(VerifyEmailResponseSchema, { message: "Email verified successfully", messageId: "emailVerified", ...session(user) }));
  }

  async login(req: Request, res: Response): Promise<void> {
    const body = LoginSchema.parse(req.body);
    const user = await this.prisma.user.findUnique({
      where: { email: body.email }, select: { ...identitySelect, password: true, active: true, emailVerified: true },
    });
    if (!user || !user.password || !await bcrypt.compare(body.password, user.password)) {
      throw new UnauthorizedError("Invalid credentials", "invalidCredentials");
    }
    if (!user.active) throw new ForbiddenError("Account is disabled", "accountDisabled");
    if (!user.emailVerified) throw new ForbiddenError("Verify your email before signing in", "emailVerificationRequired");
    res.json(response(AuthResponseSchema, session(user)));
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    if (!req.auth) throw new UnauthorizedError();
    const user = await this.prisma.user.findUnique({ where: { id: req.auth.userId }, select: profileSelect });
    if (!user) throw new NotFoundError("User");
    res.json(response(UserProfileSchema, {
      id: user.id, email: user.email, name: user.name, createdAt: user.createdAt.toISOString(),
      isAdmin: req.auth.isAdmin,
      roles: user.roles.map(assignment => ({
        id: assignment.id, eventId: assignment.eventId,
        role: { id: assignment.role.id, key: assignment.role.key, name: assignment.role.name },
        event: assignment.event ? { id: assignment.event.id, name: assignment.event.name } : null,
      })),
    }));
  }
}
