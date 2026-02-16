import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError, ValidationError, InternalServerError } from "./index";

/**
 * Wraps async route handlers to catch errors and pass to Express error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      next(error);
    });
  };
}

/**
 * Converts Zod validation errors to structured ValidationError
 */
export function handleZodError(error: ZodError): ValidationError {
  const fieldErrors = error.issues.reduce(
    (acc, issue) => {
      const path = issue.path.join(".");
      acc[path] = issue.message;
      return acc;
    },
    {} as Record<string, string>,
  );

  return new ValidationError("Validation failed", { fields: fieldErrors });
}

/**
 * Type for standard API error response
 */
export interface ErrorResponse {
  error: string;
  code: string;
  statusCode: number;
  details: Record<string, unknown> | undefined;
  timestamp: string;
}

/**
 * Central error handler middleware for Express
 */
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Convert Zod errors
  if (error instanceof ZodError) {
    const validationError = handleZodError(error);
    const response: ErrorResponse = {
      error: validationError.message,
      code: validationError.code,
      statusCode: validationError.statusCode,
      details: validationError.details,
      timestamp: new Date().toISOString(),
    };
    return res.status(validationError.statusCode).json(response);
  }

  // Handle app errors
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      timestamp: new Date().toISOString(),
    };
    return res.status(error.statusCode).json(response);
  }

  // Log unexpected errors
  console.error("Unexpected error:", error);

  // Default to 500 for unknown errors
  const response: ErrorResponse = {
    error: "An unexpected error occurred",
    code: "INTERNAL_SERVER_ERROR",
    statusCode: 500,
    details: undefined,
    timestamp: new Date().toISOString(),
  };

  res.status(500).json(response);
}
