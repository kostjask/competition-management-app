import { z } from "zod";
import { ErrorReasonSchema, FieldIssueSchema, MessageParamsSchema } from "./message.schema.js";

export const IdSchema = z.string().min(1, "ID is required");

// ADR-009: ASCII spaces only, matching PostgreSQL btrim(..., ' ').
// Keep provider-specific dots and plus tags; they are distinct identities.
export const EmailSchema = z.string()
  .regex(/^[\x20-\x7e]*$/, "Invalid email address")
  .transform(value => value.replace(/^ +| +$/g, "").toLowerCase())
  .pipe(z.email("Invalid email address"));

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
export const ErrorResponseSchema = z.strictObject({
  error: z.string(), code: z.string(), statusCode: z.number().int().min(400).max(599),
  reason: ErrorReasonSchema, params: MessageParamsSchema, issues: z.array(FieldIssueSchema),
  details: z.record(z.string(), z.unknown()).optional(), timestamp: z.iso.datetime(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
