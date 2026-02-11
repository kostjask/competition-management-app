/**
 * Dancers API methods
 */

import { apiClient } from "./client.js";

export interface Dancer {
  id: string;
  studioId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateDancerRequest {
  firstName: string;
  lastName: string;
  birthDate: string;
}

export interface UpdateDancerRequest {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
}

/**
 * Get all dancers for a studio
 */
export const getDancers = (studioId: string): Promise<Dancer[]> => {
  return apiClient.get<Dancer[]>(`/studios/${studioId}/dancers`);
};

/**
 * Get a single dancer
 */
export const getDancer = (studioId: string, dancerId: string): Promise<Dancer> => {
  return apiClient.get<Dancer>(`/studios/${studioId}/dancers/${dancerId}`);
};

/**
 * Create a new dancer
 */
export const createDancer = (
  studioId: string,
  body: CreateDancerRequest
): Promise<Dancer> => {
  return apiClient.post<Dancer, CreateDancerRequest>(
    `/studios/${studioId}/dancers`,
    body
  );
};

/**
 * Update a dancer
 */
export const updateDancer = (
  studioId: string,
  dancerId: string,
  body: UpdateDancerRequest
): Promise<Dancer> => {
  return apiClient.patch<Dancer, UpdateDancerRequest>(
    `/studios/${studioId}/dancers/${dancerId}`,
    body
  );
};

/**
 * Delete a dancer
 */
export const deleteDancer = (studioId: string, dancerId: string): Promise<void> => {
  return apiClient.delete<void>(`/studios/${studioId}/dancers/${dancerId}`);
};
