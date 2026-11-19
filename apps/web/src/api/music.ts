import { MusicWorkspaceSchema, MusicReceiptSchema, MusicConfigurationSchema, MusicCreateSchema, MusicCommandSchema, MusicConfigureSchema, MusicUploadSchema } from "@dance/schemas";
import type { z } from "zod";
import { apiClient, decode } from "./client";
export const musicBase = (eventId: string, studioId: string) => `/events/${encodeURIComponent(eventId)}/studios/${encodeURIComponent(studioId)}/music`;
export const getMusic = async (eventId: string, studioId: string) => decode(MusicWorkspaceSchema, await apiClient.get(musicBase(eventId, studioId), { cache: "no-store" }));
export const createMusic = async (eventId: string, studioId: string, body: z.infer<typeof MusicCreateSchema>) => decode(MusicReceiptSchema, await apiClient.post(musicBase(eventId, studioId), MusicCreateSchema.parse(body)));
export const commandMusic = async (eventId: string, studioId: string, trackId: string, body: z.infer<typeof MusicCommandSchema>) => decode(MusicReceiptSchema, await apiClient.post(`${musicBase(eventId, studioId)}/${trackId}/commands`, MusicCommandSchema.parse(body)));
export const configureMusic = async (eventId: string, body: z.infer<typeof MusicConfigureSchema>) => decode(MusicConfigurationSchema, await apiClient.put(`/events/${encodeURIComponent(eventId)}/music-configuration`, MusicConfigureSchema.parse(body)));
export const uploadMusic = async (eventId: string, studioId: string, trackId: string, body: z.infer<typeof MusicUploadSchema>, file: File, signal: AbortSignal, progress: (value: number) => void) => {
  const data = new FormData(); data.set("file", file);
  return decode(MusicReceiptSchema, await apiClient.uploadProgress(`${musicBase(eventId, studioId)}/${trackId}/versions`, data,
    { "X-Operation-Id": body.operationId, "X-Music-Revision": String(body.expectedRevision), "X-Policy-Revision": String(body.policyRevision), "X-Display-Name": encodeURIComponent(file.name) }, signal, progress));
};
export const musicAudioUrl = (eventId: string, studioId: string, trackId: string, versionId: string) => apiClient.privateMusicUrl(`${musicBase(eventId, studioId)}/${trackId}/versions/${versionId}/bytes`);
