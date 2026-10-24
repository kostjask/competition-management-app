import { UnauthorizedError, ForbiddenError } from "../errors";
import { Request, Response, NextFunction } from "express";

export function requirePermission(
  permission: string,
  opts?: { eventParam?: string },
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return next(new UnauthorizedError());

    if (auth.isAdmin) return next();

    const raw = opts?.eventParam ? req.params[opts.eventParam] : null;

    const eventId = normalizeParam(raw);

    // if (opts?.eventParam && !eventId) {
    //   return res.status(400).json({ error: "Invalid eventId" });
    // }

    const allowed =
      auth.permissionsByEvent.get(eventId)?.has(permission) ||
      auth.permissionsByEvent.get(null)?.has(permission);

    if (!allowed) return next(new ForbiddenError());
    next();
  };
}

function normalizeParam(value: unknown): string | null {
  if (typeof value === "string") return value;
  return null;
}
