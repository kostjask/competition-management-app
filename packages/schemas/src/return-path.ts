import { z } from "zod";

const WorkspaceReturnPathSchema = z.string().max(240).refine(value =>
  value.trim() === value && /^\/(?:events(?:\/[A-Za-z0-9_-]+(?:\/(?:edit|register|studio(?:\?studio=[A-Za-z0-9_-]+)?))?)?|applications|admin(?:\/invitations|\/events\/[A-Za-z0-9_-]+\/(?:staff|setup|(?:applications|performances)(?:\?studio=[A-Za-z0-9_-]+)?))?|judge|moderator|representative|auth\/(?:profile|onboarding))?$/.test(value),
"Unsupported return destination");

const CmsReturnPathSchema = z.string().max(240).regex(/^\/content\/(?:studio|festivals|editions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/);
export const ReturnPathSchema = WorkspaceReturnPathSchema.or(CmsReturnPathSchema);
export function safeReturnPath(value: unknown): string {
  const parsed = ReturnPathSchema.safeParse(value);
  return parsed.success ? parsed.data : "/";
}
