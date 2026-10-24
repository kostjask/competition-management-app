import { z } from "zod";
import { IdSchema } from "./common.schema.js";
export const EventImageParamsSchema = z.object({ eventId: IdSchema });
export const UserPhotoParamsSchema = z.object({ userId: IdSchema });
export const DancerPhotoParamsSchema = z.object({ dancerId: IdSchema });
export const StudioLogoParamsSchema = z.object({ studioId: IdSchema });
export const ImageUploadResponseSchema = z.strictObject({ success: z.literal(true), messageId: z.literal("saved"), imageUrl: z.string().min(1) });
export const PhotoUploadResponseSchema = z.strictObject({ success: z.literal(true), messageId: z.literal("saved"), photoUrl: z.string().min(1) });
export const LogoUploadResponseSchema = z.strictObject({ success: z.literal(true), messageId: z.literal("saved"), logoUrl: z.string().min(1) });
