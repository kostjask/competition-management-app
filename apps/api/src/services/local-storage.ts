import { promises as fs } from "node:fs";
import path from "node:path";
import type { StorageProvider } from "./storage";
import { config } from "../config/env";
import { NotFoundError } from "../errors";
import { canonicalImageName } from "./rasterImage";

export class LocalStorageService implements StorageProvider {
  private readonly root: string;
  constructor(root = config.storage.local.path) { this.root = path.resolve(root); }

  private location(key: string) {
    const parts = key.split("/");
    if (parts.length !== 2 || !["events", "users", "studios", "dancers"].includes(parts[0]!) || !canonicalImageName.test(parts[1]!)) throw new NotFoundError("Image");
    const resolved = path.resolve(this.root, ...parts);
    if (path.relative(this.root, resolved).startsWith("..") || path.isAbsolute(path.relative(this.root, resolved))) throw new NotFoundError("Image");
    return resolved;
  }
  async uploadFile(file: { buffer: Buffer; mimetype: string }, directory: string, filename: string) {
    if (file.mimetype !== "image/webp" || file.buffer.length === 0) throw new Error("Invalid canonical image");
    const key = directory + "/" + filename;
    const fullPath = this.location(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer, { flag: "wx" });
    return key;
  }
  async readFile(key: string) {
    try { return await fs.readFile(this.location(key)); }
    catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") throw new NotFoundError("Image");
      throw error;
    }
  }
  async deleteFile(key: string) {
    try { await fs.unlink(this.location(key)); }
    catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
  }
  getFileUrl(key: string) {
    this.location(key);
    return (config.storage.publicUrl?.replace(/\/$/, "") ?? "") + "/uploads/" + key;
  }
}
