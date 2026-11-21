import { ScheduleWorkspaceSchema, ScheduleCommandSchema, SchedulePreviewSchema, SchedulePreviewBodySchema, ScheduleReceiptSchema, type ScheduleCommand, type ScheduleQueues } from "@dance/schemas";
import { apiClient, decode } from "./client";
const base = (eventId: string) => `/events/${encodeURIComponent(eventId)}/schedule`;
export const getSchedule = async (eventId: string) => decode(ScheduleWorkspaceSchema, await apiClient.get(base(eventId), { cache: "no-store" }));
export const previewSchedule = async (eventId: string, expectedRevision: number, queues: ScheduleQueues) => decode(SchedulePreviewSchema, await apiClient.post(`${base(eventId)}/preview`, SchedulePreviewBodySchema.parse({ expectedRevision, queues })));
export const commandSchedule = async (eventId: string, command: ScheduleCommand) => decode(ScheduleReceiptSchema, await apiClient.post(`${base(eventId)}/commands`, ScheduleCommandSchema.parse(command)));
