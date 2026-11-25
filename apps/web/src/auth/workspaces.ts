import { routerReturnPath, type UserProfile } from "@dance/schemas";
import { roleAccess } from "./access";

export const workspaceLinks = [
  { key: "admin", path: "/admin", label: "Shell.administrator" },
  { key: "judge", path: "/judge", label: "Shell.judge" },
  { key: "moderator", path: "/moderator", label: "Shell.moderator" },
  { key: "representative", path: "/applications", label: "Application.title" },
] as const;

export function availableWorkspaces(user: UserProfile | null) {
  const { isAdmin, hasAssignment } = roleAccess(user);
  return workspaceLinks.filter(workspace => workspace.key === "admin" ? isAdmin : hasAssignment(workspace.key));
}

export function signInDestination(user: UserProfile, returnTo: string | null) {
  const { isAdmin, hasAssignment, hasRole } = roleAccess(user);
  const landing = () => {
    if (isAdmin) return "/admin";
    const available = availableWorkspaces(user);
    if (available.length === 0) return "/applications";
    return available.length === 1 ? available[0]?.path ?? "/" : "/";
  };
  if (returnTo === null) return landing();

  const destination = routerReturnPath(returnTo);
  const pathname = destination.split("?")[0] ?? destination;
  const [, section, segment, eventId] = pathname.split("/");
  const workspace = workspaceLinks.find(item => item.key === section);
  if ((section === "judge" || section === "moderator") && !hasAssignment(section, eventId)) return landing();
  if (workspace && !hasRole(workspace.key, segment === "events" ? eventId : undefined)) return landing();
  const organizerRoute = section === "content" || pathname === "/events/new" || /^\/events\/[^/]+\/edit$/.test(pathname);
  return organizerRoute && !isAdmin ? landing() : destination;
}
