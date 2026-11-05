import { decode } from "./client.js";
import { apiClient } from "./client.js";
import { InvitationsSchema, InvitationPreviewSchema, CreateInvitationResponseSchema, AcceptInvitationResponseSchema, ResendInvitationResponseSchema, RevokeInvitationResponseSchema, InvitationCommandSchema, type CreateInvitationInput, type AcceptInvitationInput } from "@dance/schemas";
export const getInvitations = async () => decode(InvitationsSchema, await apiClient.get("/invitations"));
export const getInvitation = async (token: string) => decode(InvitationPreviewSchema, await apiClient.get("/invitations/" + encodeURIComponent(token)));
export const createInvitation = async (body: CreateInvitationInput) => decode(CreateInvitationResponseSchema, await apiClient.post<CreateInvitationInput>("/invitations", body));
export const acceptInvitation = async (body: AcceptInvitationInput) => {
  const result = decode(AcceptInvitationResponseSchema, await apiClient.post<AcceptInvitationInput>("/invitations/accept", body));
  return result;
};

export const resendInvitation = async (id: string, expiresAt: string) => decode(ResendInvitationResponseSchema, await apiClient.post("/invitations/" + encodeURIComponent(id) + "/resend", InvitationCommandSchema.parse({ expiresAt })));
export const revokeInvitation = async (id: string, expiresAt: string) => decode(RevokeInvitationResponseSchema, await apiClient.post("/invitations/" + encodeURIComponent(id) + "/revoke", InvitationCommandSchema.parse({ expiresAt })));
