import type { RequestHandler } from "express";
import { AppError } from "../errors";
import { config } from "../config/env";

// Process-local protection for these new public endpoints. Proxy trust stays false.
export function authRecoveryLimit(options = config.security.rateLimit, now = Date.now): RequestHandler {
  const buckets = new Map<string, { count: number; until: number }>();
  let nextCleanup = 0;
  return (req, res, next) => {
    const time = now();
    if (time >= nextCleanup) {
      for (const [key, bucket] of buckets) if (bucket.until <= time) buckets.delete(key);
      nextCleanup = time + Math.min(60000, options.windowMs);
    }
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    let bucket = buckets.get(key);
    if (bucket && bucket.until <= time) { buckets.delete(key); bucket = undefined; }
    if (!bucket && buckets.size < 10000) {
      bucket = { count: 0, until: time + options.windowMs };
      buckets.set(key, bucket);
    }
    if (!bucket || bucket.count >= options.maxRequests) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil(((bucket?.until ?? time + options.windowMs) - time) / 1000))));
      next(new AppError("Too many recovery requests", 429, "TOO_MANY_REQUESTS", undefined, "tooManyRequests"));
      return;
    }
    bucket.count++;
    next();
  };
}
