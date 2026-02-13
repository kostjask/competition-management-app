/**
 * Local File Storage Service
 * 
 * Free, self-hosted storage implementation. Files are stored on the server's filesystem.
 * Can be easily migrated to AWS S3 or other cloud providers later.
 */

import { promises as fs } from "fs";
import path from "path";
import { StorageProvider } from "./storage";

const UPLOAD_BASE_DIR = path.join(process.cwd(), "uploads");
const PUBLIC_URL_BASE = process.env.STORAGE_PUBLIC_URL || "http://localhost:4000";

export class LocalStorageService implements StorageProvider {
  async uploadFile(
    file: { buffer: Buffer; mimetype: string },
    directory: string,
    filename: string,
  ): Promise<string> {
    // Validate inputs
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error("File buffer is empty");
    }

    if (!directory || !filename) {
      throw new Error("Directory and filename are required");
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const dirPath = path.join(UPLOAD_BASE_DIR, directory);
    const filePath = path.join(dirPath, sanitizedFilename);

    // Ensure path is within upload directory
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(UPLOAD_BASE_DIR);
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error("Invalid file path");
    }

    try {
      // Create directory if it doesn't exist
      await fs.mkdir(dirPath, { recursive: true });

      // Write file
      await fs.writeFile(filePath, file.buffer);

      // Return relative path for storage
      const relativePath = path.relative(UPLOAD_BASE_DIR, filePath);
      return relativePath;
    } catch (err) {
      console.error("File upload error:", err);
      throw new Error("Failed to upload file");
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!filePath) {
      return; // Silently ignore empty paths
    }

    const fullPath = path.join(UPLOAD_BASE_DIR, filePath);

    // Ensure path is within upload directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedBase = path.resolve(UPLOAD_BASE_DIR);
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error("Invalid file path");
    }

    try {
      await fs.unlink(fullPath);
    } catch (err) {
      // Silently ignore if file doesn't exist
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("File deletion error:", err);
        throw new Error("Failed to delete file");
      }
    }
  }

  getFileUrl(filePath: string): string {
    if (!filePath) {
      return "";
    }
    // Return the public URL path for serving
    return `${PUBLIC_URL_BASE}/uploads/${filePath}`;
  }
}
