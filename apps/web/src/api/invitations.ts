import { decode } from "./client.js";
import { apiClient, setToken } from "./client.js";
import { InvitationsSchema, InvitationPreviewSchema, CreateInvitationResponseSchema, AcceptInvitationResponseSchema, type CreateInvitationInput, type AcceptInvitationInput } from "@dance/schemas";
export const getInvitations = async () => decode(InvitationsSchema, await apiClient.get("/invitations"));
export const getInvitation = async (token: string) => decode(InvitationPreviewSchema, await apiClient.get("/invitations/" + encodeURIComponent(token)));
export const createInvitation = async (body: CreateInvitationInput) => decode(CreateInvitationResponseSchema, await apiClient.post<CreateInvitationInput>("/invitations", body));
export const acceptInvitation = async (body: AcceptInvitationInput) => {
  const result = decode(AcceptInvitationResponseSchema, await apiClient.post<AcceptInvitationInput>("/invitations/accept", body));
  setToken(result.token); return result;
};
