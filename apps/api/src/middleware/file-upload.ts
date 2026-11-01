/**
 * File Upload Middleware
 * 
 * Handles multipart file uploads with validation and processing.
 */

import { ValidationError } from "../errors";
import multer, { type StorageEngine } from "multer";
import { type Request, type Response, type NextFunction } from "express";

export interface FileUploadOptions {
  fieldName: string;
  maxSize?: number; // bytes, default: 10MB
  allowedMimeTypes?: string[];
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Create a file upload middleware
 */
export function createFileUploadMiddleware(options: FileUploadOptions) {
  const maxSize = options.maxSize || DEFAULT_MAX_SIZE;
  const allowedMimes = options.allowedMimeTypes || DEFAULT_ALLOWED_TYPES;

  const storage: StorageEngine = multer.memoryStorage();

  const upload = multer({
    storage,
    limits: { fileSize: maxSize, files: 1, fields: 0, parts: 2 },
    fileFilter: (_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
      if (!allowedMimes.includes(file.mimetype)) {
        return callback(
          new Error(
            `File type not allowed. Allowed types: ${allowedMimes.join(", ")}`,
          ),
        );
      }
      callback(null, true);
    },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(options.fieldName)(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        return next(new ValidationError(err.code === "LIMIT_FILE_SIZE" ? "File too large" : "File upload error", undefined, err.code === "LIMIT_FILE_SIZE" ? "uploadTooLarge" : "uploadInvalid"));
      }
      if (err instanceof Error) return next(new ValidationError("File upload error", undefined, "uploadType"));
      next();
    });
  };
}
