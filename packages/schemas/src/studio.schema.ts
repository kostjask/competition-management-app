import { z } from "zod";
import { IdSchema, EmailSchema } from "./common.schema.js";

export const CreateStudioBodySchema = z.object({
  name: z.string().min(1, "Studio name is required"),
  country: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  directorName: z.string().min(1).optional(),
  directorPhone: z.string().min(1).optional(),
  invoiceDetails: z.record(z.string(), z.any()).optional(),
  representativeName: z.string().min(1, "Representative name is required").optional(),
  representativeEmail: EmailSchema.optional(),
});

export const UpdateStudioBodySchema = z.object({
  name: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  directorName: z.string().min(1).optional(),
  directorPhone: z.string().min(1).optional(),
  invoiceDetails: z.record(z.string(), z.any()).optional(),
});

export const UpdateRegistrationBodySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  canEditDuringReview: z.boolean().optional(),
});

export const UpdateRepresentativeBodySchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: EmailSchema.optional(),
});

export type CreateStudioInput = z.infer<typeof CreateStudioBodySchema>;
export type UpdateStudioInput = z.infer<typeof UpdateStudioBodySchema>;
export type UpdateRegistrationInput = z.infer<typeof UpdateRegistrationBodySchema>;
