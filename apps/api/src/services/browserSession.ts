import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config, isProduction } from "../config/env";
import { ForbiddenError, UnauthorizedError, ValidationError } from "../errors";

export const sessionCookieName = isProduction() ? "__Host-dance_session" : "dance_session";
const cookieOptions = () => ({ httpOnly: true, secure: isProduction(), sameSite: "lax" as const, path: "/" });

export function cookieToken(req: Request): string | undefined {
  const values = (req.headers.cookie ?? "").split(";").map(value => value.trim()).filter(value => value.startsWith(sessionCookieName + "="));
  if (values.length > 1) throw new UnauthorizedError();
  return values[0]?.slice(sessionCookieName.length + 1);
}

export function browserRequest(req: Request): boolean {
  const mode = req.header("X-Session-Transport");
  if (mode !== undefined && mode !== "cookie") throw new ValidationError("Unsupported session transport");
  return mode === "cookie";
}

export function checkBrowserCsrf(req: Request): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (cookieToken(req) && req.header("Origin") && !config.security.corsOrigin.some(allowed => allowed !== "*" && allowed === req.header("Origin"))) throw new ForbiddenError();
    return;
  }
  if (!cookieToken(req) && !browserRequest(req)) return;
  const origin = req.header("Origin");
  if (!origin || !config.security.corsOrigin.some(allowed => allowed !== "*" && allowed === origin)
    || req.header("X-CSRF-Protection") !== "1") throw new ForbiddenError("Browser request proof required");
}

export function issueSession(req: Request, res: Response, user: { id: string; email: string; name: string; sessionVersion: number }) {
  const identity = { id: user.id, email: user.email, name: user.name };
  if (browserRequest(req)) {
    const expiresAt = new Date((Math.floor(Date.now() / 1000) + 3600) * 1000);
    const token = jwt.sign({ userId: user.id, sessionVersion: user.sessionVersion, transport: "cookie" }, config.auth.jwtSecret, { expiresIn: "1h" });
    res.cookie(sessionCookieName, token, { ...cookieOptions(), expires: expiresAt });
    return { session: "cookie" as const, expiresAt: expiresAt.toISOString(), user: identity };
  }
  return { token: jwt.sign({ userId: user.id, sessionVersion: user.sessionVersion }, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpiry }), tokenType: "Bearer" as const, user: identity };
}

export function clearBrowserSession(res: Response): void { res.clearCookie(sessionCookieName, cookieOptions()); }
