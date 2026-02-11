import { z } from "zod";

export const IdSchema = z.string().min(1);

export const NamedEntitySchema = z.object({
  id: IdSchema,
  name: z.string().min(1)
});