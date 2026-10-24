import { z } from "zod";
import { IdSchema, EmailSchema } from "./common.schema.js";

export const StudioIdParamsSchema = z.object({ studioId: IdSchema });
export const StudioIdRepIdParamsSchema = StudioIdParamsSchema.extend({ representativeId: IdSchema });
const text = z.string().trim().min(1);
const invoice = z.record(z.string(), z.json());
export const CreateStudioBodySchema = z.strictObject({
  name: text, country: text.optional(), city: text.optional(), directorName: text.optional(),
  directorPhone: text.optional(), invoiceDetails: invoice.optional(),
  representativeName: text.optional(), representativeEmail: EmailSchema.optional(),
});
export const UpdateStudioBodySchema = z.strictObject({
  name: text.optional(), country: text.nullable().optional(), city: text.nullable().optional(),
  directorName: text.nullable().optional(), directorPhone: text.nullable().optional(),
  invoiceDetails: invoice.nullable().optional(),
}).refine((body) => Object.values(body).some((value) => value !== undefined), { message: "At least one studio field is required" });
export const UpdateRegistrationBodySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]), canEditDuringReview: z.boolean().optional(),
});
export const StudioApprovalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export const UpdateStudioApprovalBodySchema = z.strictObject({ status: StudioApprovalStatusSchema });
export const UpdateRepresentativeBodySchema = z.strictObject({ name: text.optional(), email: EmailSchema.optional() })
  .refine((body) => Object.values(body).some((value) => value !== undefined), { message: "At least one representative field is required" });
export const StudioRepresentativeSchema = z.strictObject({
  id: IdSchema, studioId: IdSchema, userId: IdSchema, name: z.string(), email: z.string(),
  active: z.boolean(), createdAt: z.iso.datetime(),
});
export const StudioEventMembershipSchema = z.strictObject({
  id: IdSchema, studioId: IdSchema, eventId: IdSchema,
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "LOCKED"]),
  canEditDuringReview: z.boolean(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
export const StudioSchema = z.strictObject({
  id: IdSchema, eventId: IdSchema, name: z.string(), approvalStatus: StudioApprovalStatusSchema,
  country: z.string().nullable(), city: z.string().nullable(), directorName: z.string().nullable(),
  directorPhone: z.string().nullable(), invoiceDetails: z.json().nullable(), logoUrl: z.string().nullable(),
  registrations: z.array(StudioEventMembershipSchema), representatives: z.array(StudioRepresentativeSchema),
});
export const StudiosSchema = z.array(StudioSchema);
export type Studio = z.infer<typeof StudioSchema>;
export type StudioRepresentative = z.infer<typeof StudioRepresentativeSchema>;
export type CreateStudioInput = z.input<typeof CreateStudioBodySchema>;
export type UpdateStudioInput = z.input<typeof UpdateStudioBodySchema>;
export type UpdateRepresentativeInput = z.input<typeof UpdateRepresentativeBodySchema>;
export type UpdateRegistrationInput = z.input<typeof UpdateRegistrationBodySchema>;
export type UpdateStudioApprovalInput = z.input<typeof UpdateStudioApprovalBodySchema>;
