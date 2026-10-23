import { z } from "zod";
import { IdSchema, EmailSchema } from "./common.schema.js";
import { StudioApprovalStatusSchema, UpdateRegistrationBodySchema } from "./studio.schema.js";

const TextSchema = z.string().trim().min(1);

export const CreateStudioRegistrationBodySchema = z.strictObject({
  name: TextSchema,
  country: TextSchema.optional(),
  city: TextSchema.optional(),
  directorName: TextSchema.optional(),
  directorPhone: TextSchema.optional(),
  invoiceDetails: z.record(z.string(), z.json()).optional(),
  representativeName: TextSchema.optional(),
  representativeEmail: EmailSchema.optional(),
});

export const UpdateStudioRegistrationBodySchema = UpdateRegistrationBodySchema.strict();
export const StudioRegistrationParamsSchema = z.object({
  eventId: IdSchema,
  studioId: IdSchema,
});

export const StudioRegistrationSchema = z.strictObject({
  id: IdSchema,
  studioId: IdSchema,
  eventId: IdSchema,
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "LOCKED"]),
  canEditDuringReview: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  studio: z.strictObject({
    id: IdSchema,
    name: z.string(),
    approvalStatus: StudioApprovalStatusSchema,
    country: z.string().nullable(),
    city: z.string().nullable(),
  }),
});

export const StudioRegistrationsSchema = z.array(StudioRegistrationSchema);
export type CreateStudioRegistrationInput = z.input<typeof CreateStudioRegistrationBodySchema>;
export type UpdateStudioRegistrationInput = z.input<typeof UpdateStudioRegistrationBodySchema>;
export type StudioRegistration = z.infer<typeof StudioRegistrationSchema>;
