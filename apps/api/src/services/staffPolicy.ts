import type { RecipientLocale } from "@dance/schemas";
import { ValidationError } from "../errors";

export function assertStaffScope(invitation: { roleId: string | null; roleKey: string; eventId: string | null; studioId: string | null }): void {
  if (!invitation.roleId || !invitation.eventId || invitation.studioId ||
      !["judge", "moderator"].includes(invitation.roleKey)) {
    throw new ValidationError("Invitation requires an assignable event staff role");
  }
}

export function recipientLocale(explicit?: RecipientLocale | null, account?: RecipientLocale | null): RecipientLocale {
  return explicit ?? account ?? "et";
}

export function invitationState(row: { usedAt: Date | null; supersededAt: Date | null; revokedAt: Date | null; expiresAt: Date }, now = new Date()) {
  if (row.usedAt) return "ACCEPTED";
  if (row.supersededAt) return "SUPERSEDED";
  if (row.revokedAt) return "REVOKED";
  return row.expiresAt <= now ? "EXPIRED" : "PENDING";
}
