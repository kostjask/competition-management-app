import type { RequestHandler } from "express";
import { isProduction } from "../config/env";

// API responses and private images never need active content or framing.
export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.set({
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
  });
  if (isProduction()) res.set("Strict-Transport-Security", "max-age=31536000");
  next();
};
