import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const DancerCollectionParamsSchema = z.object({ studioId: IdSchema });
export const DancerItemParamsSchema = DancerCollectionParamsSchema.extend({ dancerId: IdSchema });
export const DancerBirthDateSchema = z.iso.date().refine(value => !value.startsWith("0000-"), {
  message: "A calendar birth date must use a supported year", params: { reason: "calendarDate" },
});

export const DancerSchema = z.strictObject({
  revision: z.int().positive(),
  id: IdSchema,
  firstName: z.string(),
  lastName: z.string(),
  birthDate: DancerBirthDateSchema,
  studioId: IdSchema,
  photoUrl: z.string().nullable(),
});
export const DancersSchema = z.array(DancerSchema);

export const CreateDancerBodySchema = z.strictObject({
  operationId: z.uuid(),
  firstName: z.string().trim().min(1, "First name is required").max(200),
  lastName: z.string().trim().min(1, "Last name is required").max(200),
  birthDate: DancerBirthDateSchema,
});

export const DancerArchiveBodySchema = z.strictObject({ operationId: z.uuid(), expectedRevision: z.int().positive() });
export const UpdateDancerBodySchema = CreateDancerBodySchema.omit({ operationId: true }).partial().extend(DancerArchiveBodySchema.shape).refine(
  (body) => [body.firstName, body.lastName, body.birthDate].some((value) => value !== undefined),
  { message: "At least one dancer field is required", params: { reason: "nonemptyPatch" } },
);

export type Dancer = z.infer<typeof DancerSchema>;
export type CreateDancerInput = z.input<typeof CreateDancerBodySchema>;
export type UpdateDancerInput = z.input<typeof UpdateDancerBodySchema>;
