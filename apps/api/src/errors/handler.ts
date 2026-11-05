import { Prisma } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { validationIssues, type ErrorResponse, type FieldIssue } from "@dance/schemas";
import { AppError, ValidationError, InternalServerError, ConflictError, NotFoundError } from "./index";
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res, next)).catch(next); };
}
export function handleZodError(error: ZodError): ValidationError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[issue.path.join(".")] = issue.message;
  return new ValidationError("Validation failed", { fields });
}
export type { ErrorResponse } from "@dance/schemas";
function parserError(error: unknown): AppError | undefined {
  if (!(error instanceof Error) || !("type" in error) || !("status" in error)) return;
  if (error.type === "entity.too.large" && error.status === 413) return new AppError("Request body is too large", 413, "PAYLOAD_TOO_LARGE", undefined, "requestTooLarge");
  if (["charset.unsupported", "encoding.unsupported"].includes(String(error.type)) && error.status === 415) return new AppError("Unsupported request encoding", 415, "UNSUPPORTED_MEDIA_TYPE", undefined, "unsupportedEncoding");
  if (["entity.parse.failed", "request.aborted", "request.size.invalid"].includes(String(error.type)) && error.status === 400) return new AppError("Invalid request body", 400, "VALIDATION_ERROR", undefined, "invalidInput");
}
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  let issues: FieldIssue[] = [];
  let appError: AppError;
  const parsed = parserError(error);
  if (error instanceof ZodError) { issues = validationIssues(error.issues); appError = handleZodError(error); }
  else if (error instanceof AppError) {
    appError = error;
    if (error instanceof ValidationError && error.details?.fields && typeof error.details.fields === "object") {
      issues = Object.keys(error.details.fields).map(field => ({ path: field ? field.split(".") : [], rule: "invalid", params: {} }));
    }
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2003", "P2025", "P2034"].includes(error.code)) {
    appError = error.code === "P2025" ? new NotFoundError("Record") : new ConflictError("The operation conflicts with current records", undefined, error.code === "P2034" ? "concurrentChange" : error.code === "P2003" ? "relationshipConflict" : "conflict");
  } else if (parsed) appError = parsed;
  else { console.error("Unexpected API error"); appError = new InternalServerError(); }
  const response: ErrorResponse = {
    error: appError.message, code: appError.code, statusCode: appError.statusCode,
    reason: appError.reason, params: {}, issues, details: appError.details, timestamp: new Date().toISOString(),
  };
  res.status(appError.statusCode).json(response);
}
