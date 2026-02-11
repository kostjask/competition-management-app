export interface AuthContext {
  userId: string
  isAdmin: boolean
  permissionsByEvent: Map<string | null, Set<string>>
}

import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";
import * as jwt from "jsonwebtoken";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // DEV_AUTH shortcut
  if (process.env.DEV_AUTH === "true") {
    req.auth = {
      userId: "dev-admin",
      isAdmin: true,
      permissionsByEvent: new Map(
        [[null, new Set(["event.manage","studio.manage","dancer.manage","performance.manage","event.register","score.submit"])]]
      ),
    };
    return next();
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) return res.status(500).json({ error: "Server misconfiguration", statusCode: 500 });

  const authHeader = req.headers.authorization ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", statusCode: 401 });
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized", statusCode: 401 });
  }

  let payload: { userId: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return res.status(401).json({ error: "Unauthorized", statusCode: 401 });
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
    if (!permissionsByEvent.has(eventKey)) permissionsByEvent.set(eventKey, new Set());
    for (const rp of ur.role.permissions) {
      permissionsByEvent.get(eventKey)!.add(rp.permission.key);
    }
  }

  req.auth = { userId, isAdmin, permissionsByEvent };

  return next();
}