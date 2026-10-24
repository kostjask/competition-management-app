import { decode } from "./client.js";
import { apiClient } from "./client.js";
import { PerformanceSchema, PerformancesSchema, type Performance, type CreatePerformanceInput, type UpdatePerformanceInput } from "@dance/schemas";

export type { Performance } from "@dance/schemas";
export type PerformanceWithDetails = Performance;
export type CreatePerformanceRequest = CreatePerformanceInput;
export type UpdatePerformanceRequest = UpdatePerformanceInput;
const collectionPath = (eventId: string) => `/events/${encodeURIComponent(eventId)}/performances`;
const itemPath = (eventId: string, performanceId: string) => `${collectionPath(eventId)}/${encodeURIComponent(performanceId)}`;

export const getPerformances = async (eventId: string, studioId?: string): Promise<Performance[]> =>
  decode(PerformancesSchema, await apiClient.get(`${collectionPath(eventId)}${studioId ? `?studioId=${encodeURIComponent(studioId)}` : ""}`));
export const getPerformance = async (eventId: string, performanceId: string): Promise<Performance> =>
  decode(PerformanceSchema, await apiClient.get(itemPath(eventId, performanceId)));
export const createPerformance = async (eventId: string, body: CreatePerformanceRequest): Promise<Performance> =>
  decode(PerformanceSchema, await apiClient.post<CreatePerformanceRequest>(collectionPath(eventId), body));
export const updatePerformance = async (eventId: string, performanceId: string, body: UpdatePerformanceRequest): Promise<Performance> =>
  decode(PerformanceSchema, await apiClient.patch<UpdatePerformanceRequest>(itemPath(eventId, performanceId), body));
export const deletePerformance = (eventId: string, performanceId: string): Promise<void> =>
  apiClient.delete(itemPath(eventId, performanceId));
