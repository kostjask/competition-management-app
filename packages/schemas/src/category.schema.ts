import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const CreateCategoryBodySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

export const UpdateCategoryBodySchema = z.object({
  name: z.string().min(1).optional(),
});

export const CategoryIdParamsSchema = z.object({
  id: IdSchema,
  eventId: IdSchema,
});

export const CategoryEventParamsSchema = z.object({
  eventId: IdSchema,
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryBodySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryBodySchema>;