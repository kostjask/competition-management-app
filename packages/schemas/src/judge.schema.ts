import { z } from "zod";
import { IdSchema } from "./common.schema.js";
const TextSchema = z.string().trim().min(1);
const profileFields = {
  name: TextSchema,
  description: TextSchema.nullable().optional(),
  country: TextSchema.nullable().optional(),
  city: TextSchema.nullable().optional(),
};
export const CreateJudgeBodySchema = z.strictObject({ userId: IdSchema, ...profileFields });
export const UpdateJudgeBodySchema = z.strictObject(profileFields).partial()
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required", params: { reason: "nonemptyPatch" } });
export const JudgeEventParamsSchema = z.object({ eventId: IdSchema });
export const JudgeItemParamsSchema = JudgeEventParamsSchema.extend({ judgeId: IdSchema });
export const JudgeSchema = z.strictObject({
  id: IdSchema, eventId: IdSchema, userId: IdSchema, name: z.string(),
  description: z.string().nullable(), country: z.string().nullable(), city: z.string().nullable(),
});
export const JudgesSchema = z.array(JudgeSchema);
export type Judge = z.infer<typeof JudgeSchema>;
export type CreateJudgeInput = z.infer<typeof CreateJudgeBodySchema>;
export type UpdateJudgeInput = z.infer<typeof UpdateJudgeBodySchema>;
