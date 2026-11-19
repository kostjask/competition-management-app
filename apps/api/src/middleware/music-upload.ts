import multer from "multer";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream";
import type { Request } from "express";
import { musicLocation } from "../services/musicStorage";
import { asyncHandler } from "../errors/handler";
import { AppError, ValidationError } from "../errors";

let receiving = 0;
export function musicUploadMiddleware(prepare: (req: Request) => Promise<{ key: string; maxBytes: number }>) {
  return asyncHandler(async (req, res, next) => {
    if (receiving >= 2) throw new AppError("Music upload busy; retry", 503);
    receiving++; let released = false;
    const release = () => { if (!released) { released = true; receiving--; } };
    res.once("finish", release); res.once("close", release);
    const prepared = await prepare(req);
    const location = musicLocation(prepared.key);
    const upload = multer({ storage: {
      _handleFile(_req, file, callback) { const out = createWriteStream(location, { flags: "wx", mode: 0o600 }); pipeline(file.stream, out, error => callback(error ?? null, { filename: prepared.key, path: location, size: out.bytesWritten })); },
      _removeFile(_req, _file, callback) { callback(null); }, // Durable staging cleanup owns interrupted/invalid uploads.
    }, limits: { fileSize: prepared.maxBytes, files: 1, fields: 0, parts: 1 }, preservePath: true });
    upload.single("file")(req, res, (error: unknown) => {
      if (error) { next(new ValidationError("Invalid audio upload", undefined, error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE" ? "uploadTooLarge" : "uploadInvalid")); return; }
      next();
    });
  });
}
