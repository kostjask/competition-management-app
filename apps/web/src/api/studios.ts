/**
 * Studios API methods
 */

import { apiClient } from "./client.js";

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

export interface CreateStudioRequest {
  name: string;
  country?: string;
  city?: string;
  directorName?: string;
  directorPhone?: string;
  invoiceDetails?: Record<string, unknown>;
  representativeName?: string;
  representativeEmail?: string;
}

export interface UpdateStudioRequest {
  name?: string;
  country?: string;
  city?: string;
  directorName?: string;
  directorPhone?: string;
  invoiceDetails?: Record<string, unknown>;
}

export interface UpdateRegistrationRequest {
  status: "PENDING" | "APPROVED" | "REJECTED";
  canEditDuringReview?: boolean;
}

export interface UpdateRepresentativeRequest {
  name?: string;
  email?: string;
}

/**
 * Get all studios for an event
 */
export const getStudios = (eventId: string): Promise<StudioWithRegistration[]> => {
  return apiClient.get<StudioWithRegistration[]>(`/events/${eventId}/studios`);
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
export const createStudio = (
  eventId: string,
  body: CreateStudioRequest
): Promise<StudioWithRegistration> => {
  return apiClient.post<StudioWithRegistration, CreateStudioRequest>(
    `/events/${eventId}/studios`,
    body
  );
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
export const updateStudioRegistration = (
  eventId: string,
  studioId: string,
  body: UpdateRegistrationRequest
): Promise<{ status: string; canEditDuringReview: boolean }> => {
  return apiClient.patch<{ status: string; canEditDuringReview: boolean }, UpdateRegistrationRequest>(
    `/events/${eventId}/studios/${studioId}/registration`,
    body
  );
};

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
