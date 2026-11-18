import { EntryContextSchema, EntryConfigurationSchema, EntryReviewSchema, EntryReceiptSchema, type EntryConfigurationInput, type EntryKind, type EntryCommand } from "@dance/schemas";
import { apiClient, decode } from "./client";
const configuration = (eventId: string) => `/events/${encodeURIComponent(eventId)}/entry-configuration`;
export const getEntryContext = async (eventId: string, studioId: string, performanceId?: string) => decode(EntryContextSchema, await apiClient.get(`/events/${encodeURIComponent(eventId)}/studios/${encodeURIComponent(studioId)}/entry-context${performanceId ? "?performanceId=" + encodeURIComponent(performanceId) : ""}`));
const review = (eventId: string, studioId: string) => `/events/${encodeURIComponent(eventId)}/studios/${encodeURIComponent(studioId)}/entry-review`;
export const getEntryConfiguration = async (eventId: string) => decode(EntryConfigurationSchema, await apiClient.get(configuration(eventId)));
export const saveEntryConfiguration = async (eventId: string, body: EntryConfigurationInput) =>
  decode(EntryConfigurationSchema, await apiClient.put(configuration(eventId), body));
export const getEntryReview = async (eventId: string, studioId: string) => decode(EntryReviewSchema, await apiClient.get(review(eventId, studioId)));
export const commandEntryCheckpoint = async (eventId: string, studioId: string, kind: EntryKind, body: EntryCommand) =>
  decode(EntryReceiptSchema, await apiClient.post(`${review(eventId, studioId)}/${kind}`, body));
