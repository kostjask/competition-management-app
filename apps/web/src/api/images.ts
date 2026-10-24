import { decode } from "./client.js";
import { apiClient } from "./client";
import { ImageUploadResponseSchema, PhotoUploadResponseSchema, LogoUploadResponseSchema } from "@dance/schemas";
const form = (field: string, file: File) => { const data = new FormData(); data.set(field, file); return data; };
export const uploadEventImage = async (id: string, file: File) => decode(ImageUploadResponseSchema, await apiClient.upload("/images/events/" + encodeURIComponent(id), form("image", file)));
export const uploadUserPhoto = async (id: string, file: File) => decode(PhotoUploadResponseSchema, await apiClient.upload("/images/users/" + encodeURIComponent(id), form("photo", file)));
export const uploadDancerPhoto = async (id: string, file: File) => decode(PhotoUploadResponseSchema, await apiClient.upload("/images/dancers/" + encodeURIComponent(id), form("photo", file)));
export const uploadStudioLogo = async (id: string, file: File) => decode(LogoUploadResponseSchema, await apiClient.upload("/images/studios/" + encodeURIComponent(id), form("logo", file)));
