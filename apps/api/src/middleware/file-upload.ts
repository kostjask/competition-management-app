/**
 * File Upload Middleware
 * 
 * Handles multipart file uploads with validation and processing.
 */

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
 * Generate a unique filename with timestamp
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split(".").pop() || "bin";
  return `${timestamp}-${random}.${ext}`;
}

/**
 * Create a file upload middleware
 */
export function createFileUploadMiddleware(options: FileUploadOptions) {
  const maxSize = options.maxSize || DEFAULT_MAX_SIZE;
  const allowedMimes = options.allowedMimeTypes || DEFAULT_ALLOWED_TYPES;

  const storage: StorageEngine = multer.memoryStorage();

  const upload = multer({
    storage,
    limits: { fileSize: maxSize },
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
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: "File too large",
            statusCode: 400,
            details: `Maximum file size is ${maxSize / 1024 / 1024}MB`,
          });
        }
        return res.status(400).json({
          error: "File upload error",
          statusCode: 400,
          details: err.message,
        });
      }

      if (err instanceof Error) {
        return res.status(400).json({
          error: "File upload error",
          statusCode: 400,
          details: err.message,
        });
      }

      next();
    });
  };
}
