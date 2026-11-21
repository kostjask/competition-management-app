import { LiveScheduleWorkspaceSchema, ScheduleWorkspaceSchema, ScheduleCommandSchema, SchedulePreviewSchema, SchedulePreviewBodySchema, ScheduleReceiptSchema, type LiveScheduleQuery, type ScheduleCommand, type ScheduleQueues } from "@dance/schemas";
import { ApiError, apiClient, decode } from "./client";
const base = (eventId: string) => `/events/${encodeURIComponent(eventId)}/schedule`;
export const getSchedule = async (eventId: string) => decode(ScheduleWorkspaceSchema, await apiClient.get(base(eventId), { cache: "no-store" }));
export const previewSchedule = async (eventId: string, expectedRevision: number, queues: ScheduleQueues) => decode(SchedulePreviewSchema, await apiClient.post(`${base(eventId)}/preview`, SchedulePreviewBodySchema.parse({ expectedRevision, queues })));
export const commandSchedule = async (eventId: string, command: ScheduleCommand, signal?: AbortSignal) => decode(ScheduleReceiptSchema, await apiClient.post(`${base(eventId)}/commands`, ScheduleCommandSchema.parse(command), { signal }));
export async function getLiveSchedule(eventId: string, { sessionId, operationId }: LiveScheduleQuery, signal: AbortSignal) {
  const params = new URLSearchParams();
  if (sessionId !== undefined) params.set("sessionId", sessionId);
  if (operationId) params.set("operationId", operationId);
  const workspace = decode(LiveScheduleWorkspaceSchema, await apiClient.get(`${base(eventId)}/live?${params}`, { cache: "no-store", signal }));
  if (sessionId !== undefined && workspace.session?.id !== sessionId) throw new ApiError(502, "Wrong live session", undefined, "INVALID_RESPONSE", "invalidResponse");
  return workspace;
}
