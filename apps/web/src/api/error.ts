import { ErrorReasonSchema, FieldIssueSchema, MessageParamsSchema, validationIssues, type ErrorReason, type MessageParams, type FieldIssue } from "@dance/schemas";
import { ZodError } from "zod";
export type UiError = { reason: ErrorReason; params: MessageParams; issues: FieldIssue[] };
export class ApiError extends Error {
  statusCode: number; details?: unknown; code: string; reason: ErrorReason; params: MessageParams; issues: FieldIssue[];
  constructor(statusCode: number, message: string, details?: unknown, code = "UNKNOWN", reason: ErrorReason = "unexpected", params: MessageParams = {}, issues: FieldIssue[] = []) {
    super(message); this.name = "ApiError"; this.statusCode = statusCode; this.details = details; this.code = code; this.reason = reason; this.params = params; this.issues = issues;
  }
}
export function toUiError(error: unknown): UiError {
  if (error instanceof ApiError) return { reason: error.reason, params: error.params, issues: error.issues };
  if (error instanceof ZodError) return { reason: "invalidInput", params: {}, issues: validationIssues(error.issues) };
  return { reason: "unexpected", params: {}, issues: [] };
}
export function parseApiError(status: number, data: unknown): ApiError {
  // Be forward-compatible with new/legacy reasons while refusing to display their prose.
  if (typeof data !== "object" || data === null) return new ApiError(status, "Invalid error response");
  const reason = ErrorReasonSchema.safeParse("reason" in data ? data.reason : undefined);
  const params = MessageParamsSchema.safeParse("params" in data ? data.params : {});
  const issues = FieldIssueSchema.array().safeParse("issues" in data ? data.issues : []);
  return new ApiError(status, "Request failed", undefined, "code" in data && typeof data.code === "string" ? data.code : "UNKNOWN", reason.success ? reason.data : "unexpected", params.success ? params.data : {}, issues.success ? issues.data : []);
}
