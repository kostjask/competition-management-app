import { apiClient } from "./client.js";
import {
  StudioSchema, StudiosSchema, StudioRepresentativeSchema, StudioRegistrationSchema, StudioRegistrationsSchema,
  type Studio, type StudioRepresentative, type StudioRegistration,
  type CreateStudioRegistrationInput, type UpdateStudioRegistrationInput,
  type UpdateStudioInput, type UpdateRepresentativeInput, type UpdateStudioApprovalInput,
} from "@dance/schemas";

export type { Studio } from "@dance/schemas";
export type StudioWithRegistration = Studio;
export type CreateStudioRequest = CreateStudioRegistrationInput;
export type UpdateStudioRequest = UpdateStudioInput;
export type UpdateRegistrationRequest = UpdateStudioRegistrationInput;
export type UpdateRepresentativeRequest = UpdateRepresentativeInput;
const studioPath = (studioId: string) => `/studios/${encodeURIComponent(studioId)}`;
const registrationsPath = (eventId: string) => `/events/${encodeURIComponent(eventId)}/studio-registrations`;

/** Event applications; each result includes a studio summary. */
export const getStudios = async (eventId: string): Promise<StudioRegistration[]> =>
  StudioRegistrationsSchema.parse(await apiClient.get<unknown>(registrationsPath(eventId)));
/** Studio profiles visible to the current member/admin, independent of application approval. */
export const getMyStudios = async (): Promise<Studio[]> =>
  StudiosSchema.parse(await apiClient.get<unknown>("/studios"));
export const getStudio = async (studioId: string): Promise<Studio> =>
  StudioSchema.parse(await apiClient.get<unknown>(studioPath(studioId)));
export const createStudio = async (eventId: string, body: CreateStudioRequest): Promise<StudioRegistration> =>
  StudioRegistrationSchema.parse(await apiClient.post<unknown, CreateStudioRequest>(registrationsPath(eventId), body));
export const updateStudio = async (studioId: string, body: UpdateStudioRequest): Promise<Studio> =>
  StudioSchema.parse(await apiClient.patch<unknown, UpdateStudioRequest>(studioPath(studioId), body));
export const updateStudioRegistration = async (eventId: string, studioId: string, body: UpdateRegistrationRequest): Promise<StudioRegistration> =>
  StudioRegistrationSchema.parse(await apiClient.patch<unknown, UpdateRegistrationRequest>(`${registrationsPath(eventId)}/${encodeURIComponent(studioId)}`, body));
export const cancelStudioRegistration = (eventId: string, studioId: string): Promise<void> =>
  apiClient.delete<void>(`${registrationsPath(eventId)}/${encodeURIComponent(studioId)}`);
export const updateStudioRepresentative = async (studioId: string, representativeId: string, body: UpdateRepresentativeRequest): Promise<StudioRepresentative> =>
  StudioRepresentativeSchema.parse(await apiClient.patch<unknown, UpdateRepresentativeRequest>(
    `${studioPath(studioId)}/representatives/${encodeURIComponent(representativeId)}`, body,
  ));
export const updateStudioApproval = async (studioId: string, body: UpdateStudioApprovalInput): Promise<Studio> =>
  StudioSchema.parse(await apiClient.patch<unknown, UpdateStudioApprovalInput>(`${studioPath(studioId)}/approval`, body));
export const deleteStudio = (studioId: string): Promise<void> => apiClient.delete<void>(studioPath(studioId));
