import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

export function requirePermission(
  permission: string,
  opts?: { eventParam?: string },
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return res.sendStatus(401);

    if (auth.isAdmin) return next();

    const raw = opts?.eventParam ? req.params[opts.eventParam] : null;

    const eventId = normalizeParam(raw);

    // if (opts?.eventParam && !eventId) {
    //   return res.status(400).json({ error: "Invalid eventId" });
    // }

    const allowed =
      auth.permissionsByEvent.get(eventId)?.has(permission) ||
      auth.permissionsByEvent.get(null)?.has(permission);

    if (!allowed) return res.sendStatus(403);
    next();
  };
}

function normalizeParam(value: unknown): string | null {
  if (typeof value === "string") return value;
  return null;
}
