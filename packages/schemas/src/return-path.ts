import { z } from "zod";

export const ReturnPathSchema = z.string().max(240).refine(value =>
  value.trim() === value && /^\/(?:events(?:\/[A-Za-z0-9_-]+(?:\/edit)?)?|admin(?:\/invitations|\/events\/[A-Za-z0-9_-]+\/staff)?|judge|moderator|representative|auth\/(?:profile|onboarding))?$/.test(value),
"Unsupported return destination");

export function safeReturnPath(value: unknown): string {
  const parsed = ReturnPathSchema.safeParse(value);
  return parsed.success ? parsed.data : "/";
}
