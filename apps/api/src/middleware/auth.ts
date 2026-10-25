import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "@prisma/client";
import { UnauthorizedError } from "../errors";
import { config } from "../config/env";

export interface AuthContext {
  userId: string;
  isAdmin: boolean;
  permissionsByEvent: Map<string | null, Set<string>>;
}

export function createAuthMiddleware(prisma: PrismaClient) {
  return async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    let identity: { id: string; sessionVersion: number } | { email: string };
    if (config.dev.authBypass) {
      identity = { email: config.dev.authEmail };
    } else {
      const authHeader = req.headers.authorization ?? "";
      if (!authHeader.startsWith("Bearer ")) return next(new UnauthorizedError());
      const token = authHeader.slice("Bearer ".length).trim();
      if (!token) return next(new UnauthorizedError());
      try {
        const payload = jwt.verify(token, config.auth.jwtSecret);
        if (typeof payload !== "object" || typeof payload.userId !== "string" || !payload.userId) throw new Error("Invalid identity");
        if (typeof payload.sessionVersion !== "number" || !Number.isInteger(payload.sessionVersion) || payload.sessionVersion < 0 || payload.sessionVersion > 2147483647) throw new Error("Invalid session revision");
        identity = { id: payload.userId, sessionVersion: payload.sessionVersion };
      } catch {
        return next(new UnauthorizedError());
      }
    }

    // Eligibility is checked on every request, before any role/admin bypass.
    // A valid JWT alone cannot keep a deleted, disabled or unverified account active.
    const user = await prisma.user.findFirst({
      where: { ...identity, active: true, emailVerified: true }, select: { id: true },
    });
    if (!user) return next(new UnauthorizedError());
    const userId = user.id;

    const roles = await prisma.userRole.findMany({
      where: { userId, removedAt: null },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    const permissionsByEvent = new Map<string | null, Set<string>>();
    let isAdmin = false;

    for (const ur of roles) {
      if (ur.role.key === "admin" && ur.eventId === null) {
        isAdmin = true;
        break;
      }
      if (ur.role.key === "admin" || (["judge", "moderator"].includes(ur.role.key) && ur.eventId === null)) continue;
      const eventKey = ur.eventId ?? null;
      if (!permissionsByEvent.has(eventKey))
        permissionsByEvent.set(eventKey, new Set());
      for (const rp of ur.role.permissions) {
        permissionsByEvent.get(eventKey)!.add(rp.permission.key);
      }
    }

    req.auth = { userId, isAdmin, permissionsByEvent };

    return next();
  };
}
