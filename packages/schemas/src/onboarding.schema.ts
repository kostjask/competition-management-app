import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const RecipientLocaleSchema = z.enum(["et", "en", "ru"]);
export type RecipientLocale = z.infer<typeof RecipientLocaleSchema>;
export const OnboardingDetailsSchema = z.strictObject({
  studioName: z.string().trim().max(160),
  country: z.string().trim().max(100),
  city: z.string().trim().max(100),
  directorName: z.string().trim().max(160),
  directorPhone: z.string().trim().max(40),
});
export const OnboardingSaveSchema = z.strictObject({
  operationId: z.uuid(), revision: z.number().int().nonnegative(),
  intendedEventId: IdSchema.nullable(), details: OnboardingDetailsSchema,
});
export const OnboardingSubmitDetailsSchema = OnboardingDetailsSchema.extend({
  studioName: z.string().trim().min(2).max(160), country: z.string().trim().min(2).max(100),
  city: z.string().trim().min(1).max(100), directorName: z.string().trim().min(2).max(160),
});
export const OnboardingDraftSchema = z.strictObject({
  id: IdSchema, status: z.enum(["DRAFT", "CANCELLED", "COMPLETED"]),
  revision: z.number().int().nonnegative(), intendedEventId: IdSchema.nullable(),
  details: OnboardingDetailsSchema, updatedAt: z.iso.datetime(),
});
export type OnboardingSave = z.infer<typeof OnboardingSaveSchema>;
