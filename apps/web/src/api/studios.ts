/**
 * Studios API methods
 */

import { apiClient } from "./client.js";
import {
  StudioRegistrationSchema, StudioRegistrationsSchema,
  type CreateStudioRegistrationInput, type UpdateStudioRegistrationInput,
  type StudioRegistration,
} from "@dance/schemas";

export interface Studio {
  id: string;
  eventId: string;
  name: string;
  country?: string;
  city?: string;
  directorName?: string;
  directorPhone?: string;
  invoiceDetails?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface StudioWithRegistration extends Studio {
  registrations: Array<{
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    canEditDuringReview: boolean;
  }>;
  representatives: Array<{
    id: string;
    userId: string;
    active: boolean;
    user: {
      name: string;
      email: string;
    };
  }>;
}

export type CreateStudioRequest = CreateStudioRegistrationInput;

export interface UpdateStudioRequest {
  name?: string;
  country?: string;
  city?: string;
  directorName?: string;
  directorPhone?: string;
  invoiceDetails?: Record<string, unknown>;
}

export type UpdateRegistrationRequest = UpdateStudioRegistrationInput;

export interface UpdateRepresentativeRequest {
  name?: string;
  email?: string;
}

/**
 * Get visible registration records for an event (each includes a studio summary)
 */
export const getStudios = async (eventId: string): Promise<StudioRegistration[]> => {
  const response = await apiClient.get<unknown>(`/events/${encodeURIComponent(eventId)}/studio-registrations`);
  return StudioRegistrationsSchema.parse(response);
};

/**
 * Get a single studio
 */
export const getStudio = (eventId: string, studioId: string): Promise<StudioWithRegistration> => {
  return apiClient.get<StudioWithRegistration>(`/events/${eventId}/studios/${studioId}`);
};

/**
 * Create a new studio registration
 */
export const createStudio = async (
  eventId: string,
  body: CreateStudioRequest
): Promise<StudioRegistration> => {
  const response = await apiClient.post<unknown, CreateStudioRequest>(
    `/events/${encodeURIComponent(eventId)}/studio-registrations`, body
  );
  return StudioRegistrationSchema.parse(response);
};

/**
 * Update studio details
 */
export const updateStudio = (
  eventId: string,
  studioId: string,
  body: UpdateStudioRequest
): Promise<Studio> => {
  return apiClient.patch<Studio, UpdateStudioRequest>(
    `/events/${eventId}/studios/${studioId}`,
    body
  );
};

/**
 * Update studio registration status (Admin only)
 */
export const updateStudioRegistration = async (
  eventId: string,
  studioId: string,
  body: UpdateRegistrationRequest
): Promise<StudioRegistration> => {
  const response = await apiClient.patch<unknown, UpdateRegistrationRequest>(
    `/events/${encodeURIComponent(eventId)}/studio-registrations/${encodeURIComponent(studioId)}`, body
  );
  return StudioRegistrationSchema.parse(response);
};

/** Cancel an owned pending registration without deleting the studio. */
export const cancelStudioRegistration = (eventId: string, studioId: string): Promise<void> =>
  apiClient.delete<void>(`/events/${encodeURIComponent(eventId)}/studio-registrations/${encodeURIComponent(studioId)}`);

/**
 * Update representative information
 */
export const updateStudioRepresentative = (
  eventId: string,
  studioId: string,
  body: UpdateRepresentativeRequest
): Promise<{ name: string; email: string }> => {
  return apiClient.patch<{ name: string; email: string }, UpdateRepresentativeRequest>(
    `/events/${eventId}/studios/${studioId}/representative`,
    body
  );
};

/**
 * Delete a studio
 */
export const deleteStudio = (eventId: string, studioId: string): Promise<void> => {
  return apiClient.delete<void>(`/events/${eventId}/studios/${studioId}`);
};
