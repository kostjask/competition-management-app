import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { config } from "../config/env";
import { NotFoundError } from "../errors";

export function musicRoot() {
  const root = config.music.root;
  if (!root || !path.isAbsolute(root)) throw new Error("MUSIC_STORAGE_PATH requires an absolute private volume path");
  const resolved = path.resolve(root);
  const forbidden = [path.resolve(config.storage.local.path), path.resolve(__dirname, "../../../web"), path.resolve(__dirname, "../../../../packages/public-site")];
  if (forbidden.some(base => { const relative = path.relative(base, resolved); return !relative || (!relative.startsWith("..") && !path.isAbsolute(relative)); })) throw new Error("Music storage must be outside uploads and web/public directories");
  return resolved;
}
export function musicLocation(key: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) throw new NotFoundError("Music");
  return path.join(musicRoot(), key);
}
export async function initializeMusicStorage() {
  if (!config.music.root) return;
  const root = musicRoot(); await fs.mkdir(root, { recursive: true, mode: 0o700 });
  // Test the configured volume, without touching any retained object.
  const probe = musicLocation(randomUUID()); await fs.writeFile(probe, "", { flag: "wx", mode: 0o600 }); await fs.unlink(probe);
}
export async function cleanupMusicUploads(db: PrismaClient, now = new Date()) {
  const jobs = await db.musicUpload.findMany({ where: { expiresAt: { lte: now } }, take: 30 });
  for (const job of jobs) {
    // Commit retirement before deleting external bytes. Finalization checks the
    // same row inside a serializable transaction, so it cannot race retirement.
    await db.musicUpload.updateMany({ where: { id: job.id, expiresAt: { lte: now } }, data: { deleting: true } });
    const retired = await db.musicUpload.findUnique({ where: { id: job.id } });
    if (!retired?.deleting || await db.musicVersion.count({ where: { objectKey: job.id } })) continue;
    try { await fs.unlink(musicLocation(job.id)); }
    catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
    await db.musicUpload.deleteMany({ where: { id: job.id, deleting: true } });
  }
}
export function startMusicCleanup(db: PrismaClient) {
  if (!config.music.root) return () => {};
  let running = false;
  const timer = setInterval(() => { if (running) return; running = true; void cleanupMusicUploads(db).catch(() => console.error("Private music cleanup pending")).finally(() => { running = false; }); }, 60000);
  timer.unref(); return () => clearInterval(timer);
}
