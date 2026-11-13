import { z } from "zod";

export const ReturnPathSchema = z.string().max(240).refine(value =>
  value.trim() === value && /^\/(?:events(?:\/[A-Za-z0-9_-]+(?:\/(?:edit|register|studio(?:\?studio=[A-Za-z0-9_-]+)?))?)?|applications|admin(?:\/invitations|\/events\/[A-Za-z0-9_-]+\/(?:staff|setup|(?:applications|performances)(?:\?studio=[A-Za-z0-9_-]+)?))?|judge|moderator|representative|auth\/(?:profile|onboarding))?$/.test(value),
"Unsupported return destination");

export function safeReturnPath(value: unknown): string {
  const parsed = ReturnPathSchema.safeParse(value);
  return parsed.success ? parsed.data : "/";
}
