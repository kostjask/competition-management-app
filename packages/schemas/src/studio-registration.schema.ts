import { z } from "zod";
import { IdSchema, EmailSchema } from "./common.schema.js";
import { StudioApprovalStatusSchema, StudioEventMembershipSchema, UpdateRegistrationBodySchema } from "./studio.schema.js";

const TextSchema = z.string().trim().min(1);

export const NewStudioRegistrationBodySchema = z.strictObject({
  operationId: z.uuid().optional(),
  name: TextSchema,
  country: TextSchema.optional(),
  city: TextSchema.optional(),
  directorName: TextSchema.optional(),
  directorPhone: TextSchema.optional(),
  invoiceDetails: z.record(z.string(), z.json()).optional(),
  representativeName: TextSchema.optional(),
  representativeEmail: EmailSchema.optional(),
});

export const ReapplyStudioRegistrationBodySchema = z.strictObject({ studioId: IdSchema, revision: z.int().positive() });
export const CreateStudioRegistrationBodySchema = z.union([NewStudioRegistrationBodySchema, ReapplyStudioRegistrationBodySchema]);
export const CancelStudioRegistrationQuerySchema = z.strictObject({ revision: z.coerce.number().int().positive() });

export const UpdateStudioRegistrationBodySchema = UpdateRegistrationBodySchema.strict();
export const StudioRegistrationParamsSchema = z.object({
  eventId: IdSchema,
  studioId: IdSchema,
});

export const StudioRegistrationSchema = StudioEventMembershipSchema.extend({
  nextActor: z.enum(["ORGANIZER", "APPLICANT", "NONE"]),
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
