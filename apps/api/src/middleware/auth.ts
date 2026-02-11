export interface AuthContext {
  userId: string
  isAdmin: boolean
  permissionsByEvent: Map<string | null, Set<string>>
}

import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers["x-user-id"] as string
  if (!userId) return next()

  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  })

  const permissionsByEvent = new Map<string | null, Set<string>>()
  let isAdmin = false

  for (const ur of roles) {
    if (ur.role.key === "admin") {
      isAdmin = true
      break
    }

    const eventKey = ur.eventId ?? null
    if (!permissionsByEvent.has(eventKey)) {
      permissionsByEvent.set(eventKey, new Set())
    }

    for (const rp of ur.role.permissions) {
      permissionsByEvent.get(eventKey)!.add(rp.permission.key)
    }
  }

  req.auth = {
    userId,
    isAdmin,
    permissionsByEvent,
  }

  next()
}