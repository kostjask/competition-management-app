/**
 * Performances API methods
 */

import { apiClient } from "./client.js";

export interface Performance {
  id: string;
  eventId: string;
  title: string;
  durationSec: number;
  orderOnStage: number;
  categoryId: string;
  ageGroupId: string;
  formatId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PerformanceWithDetails extends Performance {
  participants: Array<{
    id: string;
    dancerId: string;
    dancer: {
      id: string;
      firstName: string;
      lastName: string;
      birthDate: string;
    };
  }>;
  category?: {
    id: string;
    name: string;
  };
  ageGroup?: {
    id: string;
    name: string;
  };
  format?: {
    id: string;
    name: string;
  };
}

export interface CreatePerformanceRequest {
  title: string;
  durationSec: number;
  orderOnStage: number;
  categoryId: string;
  ageGroupId: string;
  formatId: string;
  dancerIds: string[];
}

export interface UpdatePerformanceRequest {
  title?: string;
  durationSec?: number;
  orderOnStage?: number;
  categoryId?: string;
  ageGroupId?: string;
  formatId?: string;
  dancerIds?: string[];
}

/**
 * Get all performances for a studio
 */
export const getPerformances = (studioId: string): Promise<PerformanceWithDetails[]> => {
  return apiClient.get<PerformanceWithDetails[]>(`/studios/${studioId}/performances`);
};

/**
 * Get a single performance
 */
export const getPerformance = (
  studioId: string,
  performanceId: string
): Promise<PerformanceWithDetails> => {
  return apiClient.get<PerformanceWithDetails>(
    `/studios/${studioId}/performances/${performanceId}`
  );
};

/**
 * Create a new performance
 */
export const createPerformance = (
  studioId: string,
  body: CreatePerformanceRequest
): Promise<PerformanceWithDetails> => {
  return apiClient.post<PerformanceWithDetails, CreatePerformanceRequest>(
    `/studios/${studioId}/performances`,
    body
  );
};

/**
 * Update a performance
 */
export const updatePerformance = (
  studioId: string,
  performanceId: string,
  body: UpdatePerformanceRequest
): Promise<PerformanceWithDetails> => {
  return apiClient.patch<PerformanceWithDetails, UpdatePerformanceRequest>(
    `/studios/${studioId}/performances/${performanceId}`,
    body
  );
};

/**
 * Delete a performance
 */
export const deletePerformance = (
  studioId: string,
  performanceId: string
): Promise<void> => {
  return apiClient.delete<void>(`/studios/${studioId}/performances/${performanceId}`);
};
