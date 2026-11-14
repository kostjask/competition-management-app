import { decode } from "./client.js";
import { apiClient } from "./client.js";
import { PerformanceSchema, PerformancesSchema, PerformanceHistorySchema, PerformanceLifecycleResultSchema, type PerformanceLifecycleInput, type Performance, type CreatePerformanceInput, type UpdatePerformanceInput } from "@dance/schemas";

export type { Performance } from "@dance/schemas";
export type PerformanceWithDetails = Performance;
export type CreatePerformanceRequest = CreatePerformanceInput;
export type UpdatePerformanceRequest = UpdatePerformanceInput;
const collectionPath = (eventId: string) => `/events/${encodeURIComponent(eventId)}/performances`;
const itemPath = (eventId: string, performanceId: string) => `${collectionPath(eventId)}/${encodeURIComponent(performanceId)}`;

export const getPerformances = async (eventId: string, studioId?: string, state: "active" | "withdrawn" = "active"): Promise<Performance[]> => {
  const query = new URLSearchParams({ ...(studioId && { studioId }), ...(state === "withdrawn" && { state }) });
  return decode(PerformancesSchema, await apiClient.get(`${collectionPath(eventId)}${query.size ? `?${query}` : ""}`));
};
export const changePerformanceLifecycle = async (eventId: string, performanceId: string, body: PerformanceLifecycleInput) =>
  decode(PerformanceLifecycleResultSchema, body.action === "WITHDRAW" ? await apiClient.delete(itemPath(eventId, performanceId), body)
    : await apiClient.post(`${itemPath(eventId, performanceId)}/restore`, body));
export const getPerformance = async (eventId: string, performanceId: string): Promise<Performance> =>
  decode(PerformanceSchema, await apiClient.get(itemPath(eventId, performanceId)));
export const createPerformance = async (eventId: string, body: CreatePerformanceRequest): Promise<Performance> =>
  decode(PerformanceSchema, await apiClient.post<CreatePerformanceRequest>(collectionPath(eventId), body));
export const updatePerformance = async (eventId: string, performanceId: string, body: UpdatePerformanceRequest): Promise<Performance> =>
  decode(PerformanceSchema, await apiClient.patch<UpdatePerformanceRequest>(itemPath(eventId, performanceId), body));
export const deletePerformance = (eventId: string, performanceId: string, expectedRevision: number): Promise<void> =>
  apiClient.delete(`${itemPath(eventId, performanceId)}?expectedRevision=${expectedRevision}`);
export const getPerformanceHistory = async (eventId: string, performanceId: string) =>
  decode(PerformanceHistorySchema, await apiClient.get(`${itemPath(eventId, performanceId)}/history`));
