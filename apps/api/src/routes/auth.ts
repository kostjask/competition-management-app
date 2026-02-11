import { Router } from "express";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import type { PrismaClient } from "../../generated/prisma/client";
import { RegisterSchema, LoginSchema } from "../../../../packages/schemas/src";
import { ZodError } from "zod";
import type { Response } from "express";

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
    details?: object
  ) => res.status(statusCode).json({ error, statusCode, ...(details ? { details } : {}) });

  // Register new user
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

      const user = await prisma.user.create({
        data: {
          email: body.email,
          name: body.name,
          password: hashedPassword,
        },
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });
      res
        .status(201)
        .json({
          token,
          tokenType: "Bearer",
          user: { id: user.id, email: user.email, name: user.name },
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