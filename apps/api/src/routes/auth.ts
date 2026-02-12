import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import type { PrismaClient } from "../../generated/prisma/client";
import {
  RegisterSchema,
  LoginSchema,
  VerifyEmailSchema,
} from "../../../../packages/schemas/src";
import { ZodError } from "zod";
import type { Response } from "express";
import { sendVerificationEmail } from "../utils/email";

export const authRouter = (prisma: PrismaClient) => {
  const router = Router();

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  const sendError = (
    res: Response,
    statusCode: number,
    error: string,
    details?: object,
  ) =>
    res
      .status(statusCode)
      .json({ error, statusCode, ...(details ? { details } : {}) });

  // Register new user (no role initially)
  router.post("/register", async (req, res, next) => {
    try {
      const body = RegisterSchema.parse(req.body);

      const existing = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existing) {
        return sendError(res, 409, "Email already registered");
      }

      const hashedPassword = await bcrypt.hash(body.password, 10);
      const verificationToken = crypto.randomBytes(32).toString("hex");

      const user = await prisma.user.create({
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
    } catch (err) {
      if (err instanceof ZodError) {
        return sendError(res, 400, "Validation error", { issues: err.issues });
      }
      return next(err);
    }
  });

  router.post("/verify-email", async (req, res, next) => {
    try {
      const { token } = VerifyEmailSchema.parse(req.body);

      console.log(token);
      

      const user = await prisma.user.findUnique({
        where: { verificationToken: token },
      });

      if (!user) {
        return sendError(res, 400, "Invalid verification token");
      }

      if (user.emailVerified) {
        return sendError(res, 400, "Email already verified");
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
        },
      });

      // Auto-login: generate JWT token
      const authToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

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
    } catch (err) {
      if (err instanceof ZodError) {
        return sendError(res, 400, "Validation error", { issues: err.issues });
      }
      return next(err);
    }
  });

  // Login
  router.post("/login", async (req, res, next) => {
    try {
      const body = LoginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user || !user.password) {
        return sendError(res, 401, "Invalid credentials");
      }

      const valid = await bcrypt.compare(body.password, user.password);

      if (!valid) {
        return sendError(res, 401, "Invalid credentials");
      }

      if (!user.active) {
        return sendError(res, 403, "Account is disabled");
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.json({
        token,
        tokenType: "Bearer",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (err) {
      if (err instanceof ZodError) {
        return sendError(res, 400, "Validation error", { issues: err.issues });
      }
      return next(err);
    }
  });

  // Get current user (requires auth)
  router.get("/me", async (req, res) => {
    if (!req.auth) return res.sendStatus(401);

    const user = await prisma.user.findUnique({
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

    if (!user) return res.sendStatus(404);

    res.json({
      ...user,
      isAdmin: req.auth.isAdmin,
    });
  });

  return router;
};
