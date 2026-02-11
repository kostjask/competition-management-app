import { z } from "zod";

export const IdSchema = z.string().min(1, "ID is required");

export const EmailSchema = z.email("Invalid email address");

export const NamedEntitySchema = z.object({
  id: IdSchema,
  name: z.string().min(1, "Name is required"),
});

export const DateSchema = z.string().datetime().or(z.date());

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof PaginationSchema>;