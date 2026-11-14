import { z } from "zod";
import { IdSchema, EmailSchema } from "./common.schema.js";
import { StudioApprovalStatusSchema, StudioEventMembershipSchema, UpdateRegistrationBodySchema, ReviewReasonSchema } from "./studio.schema.js";

const TextSchema = z.string().trim().min(1);

export const NewStudioRegistrationBodySchema = z.strictObject({
  operationId: z.uuid().optional(),
  onboardingRevision: z.int().positive().optional(),
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
    approvalReason: ReviewReasonSchema.nullable().default(null),
    country: z.string().nullable(),
    city: z.string().nullable(),
  }),
});

export const StudioRegistrationsSchema = z.array(StudioRegistrationSchema);
export type CreateStudioRegistrationInput = z.input<typeof CreateStudioRegistrationBodySchema>;
export type UpdateStudioRegistrationInput = z.input<typeof UpdateStudioRegistrationBodySchema>;
export type StudioRegistration = z.infer<typeof StudioRegistrationSchema>;

export const ApplicationReviewSchema = z.strictObject({
  history: z.array(z.strictObject({ action: z.enum(["STUDIO_APPROVAL_CHANGED", "REGISTRATION_APPROVAL_CHANGED", "REGISTRATION_CORRECTED", "REGISTRATION_CANCELLED", "REGISTRATION_REAPPLIED", "REGISTRATION_CREATED"]), createdAt: z.iso.datetime(), revision: z.int().positive().nullable(), fromStatus: StudioEventMembershipSchema.shape.status.nullable(), toStatus: StudioEventMembershipSchema.shape.status.nullable(), reason: ReviewReasonSchema.nullable() })),
  notifications: z.array(z.strictObject({ id: IdSchema, revision: z.int().positive(), axis: z.enum(["ORGANIZATION", "EVENT"]), state: z.enum(["SIMULATED", "NO_RECIPIENT", "QUEUED", "RETRYING", "ACCEPTED", "EXPIRED"]), retryable: z.boolean().default(false), createdAt: z.iso.datetime() })),
});
export type ApplicationReview = z.infer<typeof ApplicationReviewSchema>;
