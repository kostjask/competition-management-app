import { decode } from "./client.js";
import { apiClient } from "./client.js";
import { FormatSchema, FormatsSchema, type Format, type CreateFormatInput, type UpdateFormatInput } from "@dance/schemas";

export type { Format, CreateFormatInput, UpdateFormatInput } from "@dance/schemas";
const collectionPath = (eventId: string) => `/events/${encodeURIComponent(eventId)}/formats`;
const itemPath = (eventId: string, formatId: string) => `${collectionPath(eventId)}/${encodeURIComponent(formatId)}`;

export const getFormats = async (eventId: string): Promise<Format[]> =>
  decode(FormatsSchema, await apiClient.get(collectionPath(eventId)));
export const getFormat = async (eventId: string, formatId: string): Promise<Format> =>
  decode(FormatSchema, await apiClient.get(itemPath(eventId, formatId)));
export const createFormat = async (eventId: string, body: CreateFormatInput): Promise<Format> =>
  decode(FormatSchema, await apiClient.post<CreateFormatInput>(collectionPath(eventId), body));
export const updateFormat = async (eventId: string, formatId: string, body: UpdateFormatInput): Promise<Format> =>
  decode(FormatSchema, await apiClient.patch<UpdateFormatInput>(itemPath(eventId, formatId), body));
export const deleteFormat = (eventId: string, formatId: string): Promise<void> =>
  apiClient.delete(itemPath(eventId, formatId));
