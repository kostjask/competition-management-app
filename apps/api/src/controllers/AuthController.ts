import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  RegisterSchema, LoginSchema, VerifyEmailSchema, RegisterResponseSchema,
  AuthResponseSchema, VerifyEmailResponseSchema, UserProfileSchema,
} from "@dance/schemas";
import type { z } from "zod";
import { sendVerificationEmail } from "../utils/email";
import { config } from "../config/env";
import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError, InternalServerError } from "../errors";
import { BaseController } from "./BaseController";

const identitySelect = { id: true, email: true, name: true } satisfies Prisma.UserSelect;
const profileSelect = {
  ...identitySelect, createdAt: true,
  roles: { select: {
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
    token: jwt.sign({ userId: user.id }, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpiry }),
    tokenType: "Bearer",
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export class AuthController extends BaseController {
  async register(req: Request, res: Response): Promise<void> {
    const body = RegisterSchema.parse(req.body);
    const existing = await this.prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (existing) throw new ConflictError("Email already registered", undefined, "emailRegistered");
    const hashedPassword = await bcrypt.hash(body.password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    let user: Prisma.UserGetPayload<{ select: typeof identitySelect }>;
    try {
      user = await this.prisma.user.create({
        data: { email: body.email, name: body.name, password: hashedPassword, verificationToken, emailVerified: false },
        select: identitySelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Email already registered", undefined, "emailRegistered");
      }
      throw error;
    }
    await sendVerificationEmail({ to: user.email, token: verificationToken, name: user.name });
    res.status(201).json(response(RegisterResponseSchema, {
      message: "Registration successful. Please check your email to verify your account.", messageId: "registered", userId: user.id,
    }));
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = VerifyEmailSchema.parse(req.body);
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token }, select: { ...identitySelect, emailVerified: true },
    });
    if (!user) throw new NotFoundError("Verification token");
    if (user.emailVerified) throw new ForbiddenError("Email already verified", "emailVerified");
    await this.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, verificationToken: null } });
    res.json(response(VerifyEmailResponseSchema, { message: "Email verified successfully", messageId: "emailVerified", ...session(user) }));
  }

  async login(req: Request, res: Response): Promise<void> {
    const body = LoginSchema.parse(req.body);
    const user = await this.prisma.user.findUnique({
      where: { email: body.email }, select: { ...identitySelect, password: true, active: true },
    });
    if (!user || !user.password || !await bcrypt.compare(body.password, user.password)) {
      throw new UnauthorizedError("Invalid credentials", "invalidCredentials");
    }
    if (!user.active) throw new ForbiddenError("Account is disabled", "accountDisabled");
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
