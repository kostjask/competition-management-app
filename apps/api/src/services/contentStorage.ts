import { promises as fs } from "node:fs";
import path from "node:path";
import { CmsIdSchema } from "@dance/schemas";
import { config } from "../config/env";
import { NotFoundError } from "../errors";
import type { PrismaClient } from "@prisma/client";
import { contentTransaction } from "./content";

// Separate namespace: never served by the existing /uploads route or a webroot.
const root = () => path.resolve(config.storage.local.path, "content-private");
function location(key: string) {
  const parts = key.split("/");
  if (parts.length !== 2 || !CmsIdSchema.safeParse(parts[0]).success || !parts[1]?.endsWith(".webp") || !CmsIdSchema.safeParse(parts[1].slice(0, -5)).success) throw new NotFoundError("Asset");
  const result = path.resolve(root(), ...parts); const relative = path.relative(root(), result);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new NotFoundError("Asset"); return result;
}
export async function writeContentBytes(key: string, bytes: Buffer) {
  const target = location(key); await fs.mkdir(path.dirname(target), { recursive: true });
  try { await fs.writeFile(target, bytes, { flag: "wx" }); }
  catch (error) { if (!(error instanceof Error && "code" in error && error.code === "EEXIST" && (await fs.readFile(target)).equals(bytes))) throw error; }
}
export async function readContentBytes(key: string) {
  try { return await fs.readFile(location(key)); }
  catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") throw new NotFoundError("Asset"); throw error; }
}
export async function deleteContentBytes(key: string) {
  try { await fs.unlink(location(key)); }
  catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
}
export async function cleanupContentAssets(db: PrismaClient, now = new Date()) {
  // Staging rows are committed before bytes, so a crash never leaves an untracked key.
  const old = new Date(now.getTime() - 86400000);
  const candidates = await db.publicAsset.findMany({ where: { createdAt: { lt: old }, references: { none: {} }, cleanup: null }, take: 30 });
  for (const row of candidates) await db.contentAssetCleanup.upsert({ where: { assetId: row.id }, create: { assetId: row.id, dueAt: now }, update: {} });
  const jobs = await db.contentAssetCleanup.findMany({ where: { completedAt: null, dueAt: { lte: now }, attempts: { lt: 8 }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, take: 30 });
  for (const job of jobs) {
    try {
      const key = await contentTransaction(db, async tx => {
        const claimed = await tx.contentAssetCleanup.updateMany({ where: { id: job.id, completedAt: null, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, data: { leaseUntil: new Date(now.getTime() + 60000), attempts: { increment: 1 } } });
        if (!claimed.count) return null;
        const asset = await tx.publicAsset.findUniqueOrThrow({ where: { id: job.assetId }, include: { references: true } });
        if (!asset.retiredAt && asset.rights !== "REVOKED" && asset.references.length) {
          await tx.contentAssetCleanup.delete({ where: { id: job.id } }); return null;
        }
        // Retire under the same serializable lock before deletion. Attachments
        // racing cleanup must conflict; no stale worker can remove new live bytes.
        await tx.publicAsset.update({ where: { id: asset.id }, data: { retiredAt: asset.retiredAt ?? now, ready: false } });
        return asset.key;
      });
      if (!key) continue;
      // Retirement commits before the external side effect. A failed transaction
      // never removes bytes that another transaction can still publish.
      await deleteContentBytes(key);
      await db.contentAssetCleanup.update({ where: { id: job.id }, data: { completedAt: now, leaseUntil: null, failureCode: null } });
    } catch {
      await db.contentAssetCleanup.updateMany({ where: { id: job.id, completedAt: null }, data: { leaseUntil: null, dueAt: new Date(now.getTime() + 60000), failureCode: "DELETE_RETRY" } });
    }
  }
}
export function startContentCleanup(db: PrismaClient) {
  let running = false;
  const timer = setInterval(() => { if (running) return; running = true; void cleanupContentAssets(db).catch(() => console.error("Content cleanup pending")).finally(() => { running = false; }); }, 60000);
  timer.unref(); return () => clearInterval(timer);
}
