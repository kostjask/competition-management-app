import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const DancerCollectionParamsSchema = z.object({ studioId: IdSchema });
export const DancerItemParamsSchema = DancerCollectionParamsSchema.extend({ dancerId: IdSchema });
export const DancerBirthDateSchema = z.iso.date();

export const DancerSchema = z.strictObject({
  id: IdSchema,
  firstName: z.string(),
  lastName: z.string(),
  birthDate: DancerBirthDateSchema,
  studioId: IdSchema,
  photoUrl: z.string().nullable(),
});
export const DancersSchema = z.array(DancerSchema);

export const CreateDancerBodySchema = z.strictObject({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  birthDate: DancerBirthDateSchema,
});

export const UpdateDancerBodySchema = CreateDancerBodySchema.partial().refine(
  (body) => Object.values(body).some((value) => value !== undefined),
  { message: "At least one dancer field is required" },
);

export type Dancer = z.infer<typeof DancerSchema>;
export type CreateDancerInput = z.input<typeof CreateDancerBodySchema>;
export type UpdateDancerInput = z.input<typeof UpdateDancerBodySchema>;
