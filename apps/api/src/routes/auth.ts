import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "../../generated/prisma/client";

export const authRouter = (prisma: PrismaClient) => {
  const router = Router();

  const RegisterBody = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
  });

  const LoginBody = z.object({
    email: z.string().email(),
    password: z.string(),
  });

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  // Register new user
  router.post("/register", async (req, res) => {
    const body = RegisterBody.safeParse(req.body);
    if (!body.success) return res.status(400).json(body.error);

    const existing = await prisma.user.findUnique({
      where: { email: body.data.email },
    });

    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(body.data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: body.data.email,
        name: body.data.name,
        password: hashedPassword,
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  });

  // Login
  router.post("/login", async (req, res) => {
    const body = LoginBody.safeParse(req.body);
    if (!body.success) return res.status(400).json(body.error);

    const user = await prisma.user.findUnique({
      where: { email: body.data.email },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(body.data.password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.active) {
      return res.status(403).json({ error: "Account is disabled" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
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