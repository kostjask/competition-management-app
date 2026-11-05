import type { RequestHandler } from "express";

export function onboardingAuth(authenticate: RequestHandler): RequestHandler {
  return (req, res, next) => {
    const body: unknown = req.body;
    // Explicit credentials use the narrowly scoped owner-proof service, not a session.
    if (body && typeof body === "object" && "email" in body) return next();
    return authenticate(req, res, next);
  };
}
