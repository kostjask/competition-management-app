import { Prisma } from "@prisma/client";
import { InvitationSchema } from "@dance/schemas";
import { serializeDto } from "../utils/dto";
import { invitationState } from "./staffPolicy";

export const invitationSelect = { id: true, email: true, roleKey: true, eventId: true, createdAt: true, expiresAt: true, usedAt: true, revokedAt: true, supersededAt: true } satisfies Prisma.InvitationSelect;
export function invitationView(row: Prisma.InvitationGetPayload<{ select: typeof invitationSelect }>) {
  return serializeDto(InvitationSchema, { id: row.id, email: row.email, roleKey: row.roleKey, eventId: row.eventId, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(), usedAt: row.usedAt?.toISOString() ?? null, revokedAt: row.revokedAt?.toISOString() ?? null, supersededAt: row.supersededAt?.toISOString() ?? null, status: invitationState(row) });
}
