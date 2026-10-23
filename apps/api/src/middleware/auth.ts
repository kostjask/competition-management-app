import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "@prisma/client";
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
    // DEV_AUTH shortcut for development
    if (config.dev.authBypass) {
      req.auth = {
        userId: "dev-admin",
        isAdmin: true,
        permissionsByEvent: new Map([
          [
            null,
            new Set([
              "event.manage",
              "studio.manage",
              "dancer.manage",
              "performance.manage",
              "event.register",
              "score.submit",
            ]),
          ],
        ]),
      };
      return next();
    }

    const authHeader = req.headers.authorization ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        code: "UNAUTHORIZED",
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        code: "UNAUTHORIZED",
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
    }

    let payload: { userId: string };
    try {
      payload = jwt.verify(token, config.auth.jwtSecret) as { userId: string };
    } catch {
      return res.status(401).json({
        error: "Unauthorized",
        code: "UNAUTHORIZED",
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
    }

    const userId = payload.userId;
    const roles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    const permissionsByEvent = new Map<string | null, Set<string>>();
    let isAdmin = false;

    for (const ur of roles) {
      if (ur.role.key === "admin") {
        isAdmin = true;
        break;
      }
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
