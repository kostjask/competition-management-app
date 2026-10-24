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
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  let issues: FieldIssue[] = [];
  let appError: AppError;
  if (error instanceof ZodError) { issues = validationIssues(error.issues); appError = handleZodError(error); }
  else if (error instanceof AppError) {
    appError = error;
    if (error instanceof ValidationError && error.details?.fields && typeof error.details.fields === "object") {
      issues = Object.keys(error.details.fields).map(field => ({ path: field ? field.split(".") : [], rule: "invalid", params: {} }));
    }
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2003", "P2025", "P2034"].includes(error.code)) {
    appError = error.code === "P2025" ? new NotFoundError("Record") : new ConflictError("The operation conflicts with current records", undefined, error.code === "P2034" ? "concurrentChange" : error.code === "P2003" ? "relationshipConflict" : "conflict");
  } else if (error instanceof SyntaxError && "status" in error && error.status === 400) appError = new ValidationError("Invalid JSON");
  else { console.error("Unexpected API error"); appError = new InternalServerError(); }
  const response: ErrorResponse = {
    error: appError.message, code: appError.code, statusCode: appError.statusCode,
    reason: appError.reason, params: {}, issues, details: appError.details, timestamp: new Date().toISOString(),
  };
  res.status(appError.statusCode).json(response);
}
