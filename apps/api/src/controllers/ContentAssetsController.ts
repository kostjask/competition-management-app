import type { Request, Response } from "express";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { CmsIdSchema, CmsCommandSchema, CmsReviewSchema } from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from "../errors";
import { contentAdmin, contentTransaction, contentOperation, contentDigest, replayContentOperation } from "../services/content";
import { prepareRaster } from "../services/rasterImage";
import { writeContentBytes, readContentBytes } from "../services/contentStorage";

export class ContentAssetsController extends BaseController {
  async authorize(req: Request) {
    if (!req.auth?.isAdmin) throw new ForbiddenError();
    await contentAdmin(this.prisma, req.auth);
  }
  async upload(req: Request, res: Response) {
    if (!req.auth) throw new ForbiddenError(); const auth = req.auth;
    const documentId = CmsIdSchema.parse(req.params.documentId);
    const command = CmsCommandSchema.parse({ operationId: req.headers["x-content-operation"], expectedVersion: Number(req.headers["x-content-version"]) });
    if (!req.file) throw new ValidationError("Select an image", undefined, "uploadMissing");
    const image = await prepareRaster(req.file); const meta = await sharp(image.buffer).metadata();
    if (!meta.width || !meta.height) throw new ValidationError("Image dimensions missing");
    const digest = contentDigest(image.buffer.toString("base64"));
    const uploadBody = { ...command, digest, assetId: command.operationId };
    const prior = await contentTransaction(this.prisma, async db => { await contentAdmin(db, auth); return replayContentOperation(db, auth, documentId, "ASSET_UPLOAD", uploadBody); });
    if (prior) { res.json(prior); return; }
    const staged = await contentTransaction(this.prisma, async db => {
      await contentAdmin(db, auth);
      const existing = await db.publicAsset.findUnique({ where: { id: command.operationId } });
      if (existing) { if (existing.documentId !== documentId || existing.actorId !== auth.userId || existing.digest !== digest || existing.retiredAt) throw new ConflictError("Upload identity changed"); return existing; }
      const document = await db.contentDocument.findUnique({ where: { id: documentId } }); if (!document) throw new NotFoundError("Content");
      if (document.version !== command.expectedVersion) throw new ConflictError("Content changed", undefined, "concurrentChange");
      return db.publicAsset.create({ data: { id: command.operationId, documentId, key: `${documentId}/${randomUUID()}.webp`, digest, size: image.buffer.length, width: meta.width!, height: meta.height!, actorId: auth.userId } });
    });
    await writeContentBytes(staged.key, image.buffer);
    res.json(await contentOperation(this.prisma, auth, documentId, "ASSET_UPLOAD", uploadBody, "CONTENT_ASSET_UPLOADED", async (db, document) => {
      const attached = await db.publicAsset.updateMany({ where: { id: command.operationId, documentId, retiredAt: null, rights: { not: "REVOKED" }, digest }, data: { ready: true } });
      if (!attached.count) throw new ConflictError("Upload was retired before finalization", undefined, "concurrentChange");
      return document.draftRevisionId;
    }));
  }
  async review(req: Request, res: Response, retire = false) {
    if (!req.auth) throw new ForbiddenError(); const auth = req.auth;
    const documentId = CmsIdSchema.parse(req.params.documentId); const assetId = CmsIdSchema.parse(req.params.assetId);
    const body = retire ? CmsCommandSchema.parse(req.body) : CmsReviewSchema.parse(req.body);
    res.json(await contentOperation(this.prisma, auth, documentId, retire ? "ASSET_RETIRE" : "ASSET_REVIEW", { ...body, assetId }, retire ? "CONTENT_ASSET_RETIRED" : "CONTENT_ASSET_REVIEWED", async (db, document) => {
      const row = await db.publicAsset.findFirst({ where: { id: assetId, documentId, ready: true, retiredAt: null, rights: { not: "REVOKED" } } }); if (!row) throw new NotFoundError("Asset");
      const approved = !retire && "approved" in body && body.approved;
      await db.publicAsset.update({ where: { id: assetId }, data: { rights: approved ? "APPROVED" : "REVOKED", reviewedAt: new Date(), actorId: auth.userId, ...(retire && { retiredAt: new Date() }) } });
      if (!approved) {
        if (document.publishedRevisionId && await db.contentRevisionAsset.findFirst({ where: { assetId, revisionId: document.publishedRevisionId } })) await db.contentDocument.update({ where: { id: documentId }, data: { publishedRevisionId: null, publishedAt: null, policyDigest: null } });
        await db.contentAssetCleanup.upsert({ where: { assetId }, create: { assetId, dueAt: new Date() }, update: { dueAt: new Date(), completedAt: null, attempts: 0 } });
      }
      return document.draftRevisionId;
    }));
  }
  async retrieve(req: Request, res: Response, preview = false) {
    const assetId = CmsIdSchema.parse(req.params.assetId); const documentId = preview ? CmsIdSchema.parse(req.params.documentId) : undefined;
    const bytes = await contentTransaction(this.prisma, async db => {
      if (preview) { if (!req.auth) throw new ForbiddenError(); await contentAdmin(db, req.auth); }
      const row = await db.publicAsset.findFirst({ where: { id: assetId, ...(documentId && { documentId }), ready: true, retiredAt: null, rights: preview ? { not: "REVOKED" } : "APPROVED" }, include: { document: { include: { edition: { include: { festival: true } } } } } });
      if (!row) throw new NotFoundError("Asset");
      if (!preview && (!row.document.publishedRevisionId || row.document.edition?.archivedAt || row.document.edition?.festival.archivedAt || !await db.contentRevisionAsset.findFirst({ where: { revisionId: row.document.publishedRevisionId, assetId } }))) throw new NotFoundError("Asset");
      return readContentBytes(row.key);
    });
    res.set({ "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Content-Disposition": 'inline; filename="image.webp"', "Content-Security-Policy": "default-src 'none'; sandbox" }); res.status(200).end(req.method === "HEAD" ? undefined : bytes);
  }
}
