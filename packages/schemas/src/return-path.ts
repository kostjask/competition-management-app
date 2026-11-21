import { z } from "zod";

const WorkspaceReturnPathSchema = z.string().max(240).refine(value =>
  value.trim() === value && /^\/(?:events(?:\/[A-Za-z0-9_-]+(?:\/(?:edit|register|studio(?:\?studio=[A-Za-z0-9_-]+)?))?)?|applications|admin(?:\/invitations|\/events\/[A-Za-z0-9_-]+\/(?:staff|setup|(?:applications|performances)(?:\?studio=[A-Za-z0-9_-]+)?))?|judge|moderator|representative|auth\/(?:profile|onboarding))?$/.test(value),
"Unsupported return destination");

const CmsReturnPathSchema = z.string().max(240).regex(/^\/content\/(?:studio|festivals|editions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/);
const EntryReturnPathSchema = z.string().max(240).regex(/^\/(?:studios\/[A-Za-z0-9_-]+\/dancers|events\/[A-Za-z0-9_-]+\/studios\/[A-Za-z0-9_-]+\/performances(?:\/new|\/[A-Za-z0-9_-]+\/edit)?(?:\?entry=review(?:&checkpoint=(?:BASIC|FINAL))?)?)$/);
const MusicReturnPathSchema = z.string().max(240).regex(/^\/events\/[A-Za-z0-9_-]+\/studios\/[A-Za-z0-9_-]+\/music(?:\?(?:performance=[A-Za-z0-9_-]+(?:&track=[0-9a-f-]{36})?|track=[0-9a-f-]{36}(?:&performance=[A-Za-z0-9_-]+)?))?$/);
const ScheduleReturnPathSchema = z.string().max(240).regex(/^\/admin\/events\/[A-Za-z0-9_-]+\/schedule(?:\?(?:stage=[0-9a-f-]{36}(?:&session=[0-9a-f-]{36})?|session=[0-9a-f-]{36}))?$/);
const InternalReturnPathSchema = WorkspaceReturnPathSchema.or(CmsReturnPathSchema).or(EntryReturnPathSchema).or(MusicReturnPathSchema).or(ScheduleReturnPathSchema);
export const WORKSPACE_BASE = "/app";
/** Absolute browser/mail links. Router destinations use paths relative to its basename. */
export function workspaceLink(path: string): string { return WORKSPACE_BASE + (path === "/" ? "" : path); }
export const ReturnPathSchema = z.string().max(244).refine(value => !/[\r\n\\#]/.test(value)).transform(value => value === WORKSPACE_BASE ? "/" : value.startsWith(WORKSPACE_BASE + "/") ? value.slice(WORKSPACE_BASE.length) : value)
  .pipe(InternalReturnPathSchema).transform(workspaceLink);
export function safeReturnPath(value: unknown): string {
  const parsed = ReturnPathSchema.safeParse(value);
  return parsed.success ? parsed.data : WORKSPACE_BASE;
}

/** Use only at the React Router boundary, whose basename already adds /app. */
export function routerReturnPath(value: unknown): string { return safeReturnPath(value).slice(WORKSPACE_BASE.length) || "/"; }

const identityPath = /^\/(?:verify-email|auth\/(?:login|register|onboarding|profile|forgot-password|resend-verification|correct-email|reset-password|accept-invitation))$/;
export function legacyWorkspaceRedirect(input: string): string | null {
  if (!input.startsWith("/") || input.startsWith("//") || /[%\\\r\n]/.test(input.split("?")[0] ?? "")) return null;
  const url = new URL(input, "https://workspace.invalid");
  if (url.pathname !== input.split("?")[0] || /[\r\n#]/.test(input)) return null;
  const path = url.pathname === "/login" ? "/auth/login" : url.pathname;
  if (path === "/" || (!identityPath.test(path) && !InternalReturnPathSchema.safeParse(path).success)) return null;
  const query = new URLSearchParams();
  const one = (key: string) => url.searchParams.getAll(key).length === 1 ? url.searchParams.get(key) : null;
  const lang = one("lang"); if (lang && ["et", "en", "ru"].includes(lang)) query.set("lang", lang);
  const token = one("token");
  if (["/verify-email", "/auth/reset-password", "/auth/accept-invitation"].includes(path) && token && /^[A-Za-z0-9_-]{1,2048}$/.test(token)) query.set("token", token);
  const destination = ReturnPathSchema.safeParse(one("returnTo"));
  if (identityPath.test(path) && destination.success) query.set("returnTo", destination.data);
  const eventId = one("eventId"); if (path === "/auth/register" && eventId && /^[A-Za-z0-9_-]+$/.test(eventId)) query.set("eventId", eventId);
  const studio = one("studio");
  if (studio && InternalReturnPathSchema.safeParse(path + "?studio=" + studio).success) query.set("studio", studio);
  return workspaceLink(path) + (query.size ? "?" + query : "");
}
