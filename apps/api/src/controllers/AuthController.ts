import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { PrismaClient } from "../../generated/prisma/client";
import {
  RegisterSchema,
  LoginSchema,
  VerifyEmailSchema,
} from "@dance/schemas";
import { sendVerificationEmail } from "../utils/email";
import { config } from "../config/env";
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "../errors";
import { BaseController } from "./BaseController";

export class AuthController extends BaseController {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Register a new user
   * POST /auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    const body = RegisterSchema.parse(req.body);

    const existing = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existing) {
      throw new ConflictError("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        password: hashedPassword,
        verificationToken,
        emailVerified: false,
      },
    });

    // Send verification email
    await sendVerificationEmail({
      to: user.email,
      token: verificationToken,
      name: user.name,
    });

    res.status(201).json({
      message:
        "Registration successful. Please check your email to verify your account.",
      userId: user.id,
    });
  }

  /**
   * Verify email with token
   * POST /auth/verify-email
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = VerifyEmailSchema.parse(req.body);

    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new NotFoundError("Verification token");
    }

    if (user.emailVerified) {
      throw new ForbiddenError("Email already verified");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    // Auto-login: generate JWT token
    const authToken = jwt.sign(
      { userId: user.id },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiry } as any,
    );

    res.json({
      message: "Email verified successfully",
      token: authToken,
      tokenType: "Bearer",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  }

  /**
   * Login user
   * POST /auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    const body = LoginSchema.parse(req.body);

    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const valid = await bcrypt.compare(body.password, user.password);

    if (!valid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!user.active) {
      throw new ForbiddenError("Account is disabled");
    }

    const token = jwt.sign(
      { userId: user.id },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiry } as any,
    );

    res.json({
      token,
      tokenType: "Bearer",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  }

  /**
   * Get current user profile (requires auth)
   * GET /auth/profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new UnauthorizedError();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        roles: {
          include: {
            role: true,
            event: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    res.json({
      ...user,
      isAdmin: req.auth.isAdmin,
    });
  }
}
