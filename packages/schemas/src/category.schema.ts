import { z } from "zod";
import { IdSchema } from "./common.schema.js";

export const CreateCategoryBodySchema = z.strictObject({ name: z.string().trim().min(1) });
export const UpdateCategoryBodySchema = CreateCategoryBodySchema;
export const CategoryEventParamsSchema = z.object({ eventId: IdSchema });
export const CategoryItemParamsSchema = CategoryEventParamsSchema.extend({ categoryId: IdSchema });
export const CategorySchema = z.strictObject({ id: IdSchema, eventId: IdSchema, name: z.string() });
export const CategoriesSchema = z.array(CategorySchema);
export type Category = z.infer<typeof CategorySchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategoryBodySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryBodySchema>;
