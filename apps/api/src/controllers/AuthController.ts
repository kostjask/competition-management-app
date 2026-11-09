import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  AccountLocaleSchema, RegisterSchema, LoginSchema, VerifyEmailSchema, RegisterResponseSchema,
  SessionResponseSchema, SessionVerifyEmailResponseSchema, UserProfileSchema, LogoutSchema,
  ResendVerificationSchema, CorrectEmailSchema, RequestPasswordResetSchema, ResetPasswordSchema,
  AuthRequestAcceptedSchema, ResetPasswordResponseSchema,
  OnboardingReadSchema, OnboardingWriteSchema, OnboardingCancelSchema, OnboardingContextSchema, OnboardingProofSchema,
} from "@dance/schemas";
import type { z } from "zod";
import { registerStudioApplicant } from "../services/studioSignup";
import { issueSession, clearBrowserSession } from "../services/browserSession";
import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError, InternalServerError } from "../errors";
import { BaseController } from "./BaseController";
import { verifyAccountEmail, recoverAccountPassword } from "../services/identityTokens";
import { requestAuthRecovery, defaultRecoveryDelivery, type RecoveryDelivery } from "../services/authRecovery";
import { appendAudit } from "../services/audit";
import { provenOnboarding } from "../services/onboarding";

const identitySelect = { id: true, email: true, name: true, sessionVersion: true } satisfies Prisma.UserSelect;
const profileSelect = {
  ...identitySelect, createdAt: true, preferredLocale: true,
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

export class AuthController extends BaseController {
  constructor(prisma: PrismaClient, private delivery: RecoveryDelivery = defaultRecoveryDelivery) {
    super(prisma);
  }
  private onboardingOwner(req: Request, body: unknown) {
    if (body && typeof body === "object" && "email" in body) return OnboardingProofSchema.parse({ email: body.email, password: "password" in body ? body.password : undefined });
    if (!req.auth) throw new UnauthorizedError();
    return req.auth;
  }
  async readOnboarding(req: Request, res: Response): Promise<void> {
    const body = OnboardingReadSchema.parse(req.body);
    res.json(response(OnboardingContextSchema, await provenOnboarding(this.prisma, this.onboardingOwner(req, body), { kind: "read" })));
  }
  async saveOnboarding(req: Request, res: Response): Promise<void> {
    const body = OnboardingWriteSchema.parse(req.body);
    res.json(response(OnboardingContextSchema, await provenOnboarding(this.prisma, this.onboardingOwner(req, body), { kind: "save", draft: body.draft })));
  }
  async cancelOnboarding(req: Request, res: Response): Promise<void> {
    const body = OnboardingCancelSchema.parse(req.body);
    res.json(response(OnboardingContextSchema, await provenOnboarding(this.prisma, this.onboardingOwner(req, body), { kind: "cancel", revision: body.revision })));
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
    const user = await registerStudioApplicant(this.prisma, body);
    res.status(201).json(response(RegisterResponseSchema, {
      message: "Registration accepted. Email delivery is unconfirmed.", messageId: "registered", userId: user.id, delivery: "unconfirmed",
    }));
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = VerifyEmailSchema.parse(req.body);
    const user = await verifyAccountEmail(this.prisma, token);
    res.json(response(SessionVerifyEmailResponseSchema, { message: "Email verified successfully", messageId: "emailVerified", ...issueSession(req, res, user) }));
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
    res.json(response(SessionResponseSchema, issueSession(req, res, user)));
  }

  async logout(req: Request, res: Response): Promise<void> {
    LogoutSchema.parse(req.body ?? {});
    const actor = req.auth;
    if (!actor) throw new UnauthorizedError();
    await this.prisma.$transaction(async tx => {
      const changed = await tx.user.updateMany({ where: { id: actor.userId, sessionVersion: actor.sessionVersion, active: true, emailVerified: true }, data: { sessionVersion: { increment: 1 } } });
      if (changed.count !== 1) throw new UnauthorizedError();
      await appendAudit(tx, { action: "SESSION_REVOKED", actor: { kind: "USER", userId: actor.userId }, targetType: "USER", targetId: actor.userId });
    });
    clearBrowserSession(res);
    res.status(204).end();
  }

  async saveLocale(req: Request, res: Response): Promise<void> {
    if (!req.auth) throw new UnauthorizedError();
    const body = AccountLocaleSchema.parse(req.body);
    const changed = await this.prisma.user.updateMany({ where: { id: req.auth.userId, active: true, emailVerified: true, sessionVersion: req.auth.sessionVersion }, data: body });
    if (changed.count !== 1) throw new UnauthorizedError();
    res.json(response(AccountLocaleSchema, body));
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    if (!req.auth) throw new UnauthorizedError();
    const user = await this.prisma.user.findUnique({ where: { id: req.auth.userId }, select: profileSelect });
    if (!user) throw new NotFoundError("User");
    res.json(response(UserProfileSchema, {
      id: user.id, email: user.email, name: user.name, preferredLocale: user.preferredLocale ?? null, createdAt: user.createdAt.toISOString(),
      isAdmin: req.auth.isAdmin,
      permissions: [...req.auth.permissionsByEvent].map(([eventId, keys]) => ({ eventId, keys: [...keys].sort() })),
      roles: user.roles.map(assignment => ({
        id: assignment.id, eventId: assignment.eventId,
        role: { id: assignment.role.id, key: assignment.role.key, name: assignment.role.name },
        event: assignment.event ? { id: assignment.event.id, name: assignment.event.name } : null,
      })),
    }));
  }
}
