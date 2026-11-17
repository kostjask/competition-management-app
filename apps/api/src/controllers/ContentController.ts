import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { CmsCommandSchema, CmsSaveSchema, CmsPublishSchema, CmsFestivalCreateSchema, CmsEditionCreateSchema, CmsLinkSchema, CmsPayloadSchema, CmsIdSchema,
  CmsPreviewQuerySchema, CmsHistoryQuerySchema, CmsLocaleQuerySchema, CmsSlugSchema, CmsIndexSchema, CmsRevisionSchema, CmsPreviewSchema, CmsInitializeSchema, emptyCmsPayload } from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ForbiddenError, NotFoundError, ConflictError } from "../errors";
import { contentAdmin, contentTransaction, contentOperation, contentDigest, documentRow, contentDetail, saveRevision, canonicalFacts, validateContentReferences, projectContent, receipt, readPublishedContent } from "../services/content";
import { appendAudit } from "../services/audit";

export class ContentController extends BaseController {
  private auth(req: Request) { if (!req.auth?.isAdmin) throw new ForbiddenError(); return req.auth; }
  private id(req: Request) { return CmsIdSchema.parse(req.params.documentId); }
  async index(req: Request, res: Response) {
    const auth = this.auth(req);
    res.json(await contentTransaction(this.prisma, async db => {
      await contentAdmin(db, auth);
      return CmsIndexSchema.parse({ documents: await Promise.all((await db.contentDocument.findMany({ orderBy: { createdAt: "asc" } })).map(row => contentDetail(db, row))),
        festivals: await db.festival.findMany({ where: { archivedAt: null }, select: { id: true, name: true, slug: true } }) });
    }));
  }
  async initialize(req: Request, res: Response) {
    const auth = this.auth(req); const body = CmsInitializeSchema.parse(req.body);
    res.json(await contentTransaction(this.prisma, async db => {
      await contentAdmin(db, auth); const digest = contentDigest({ actorId: auth.userId, kind: "INITIALIZE", body });
      const prior = await db.contentOperation.findUnique({ where: { operationId: body.operationId } });
      if (prior) { if (prior.digest !== digest) throw new ConflictError("Operation identity changed"); return receipt(prior); }
      if (body.expectedVersion !== 0 || await db.contentDocument.findFirst({ where: { kind: body.kind } })) throw new ConflictError("Document already exists", undefined, "concurrentChange");
      // The ID also participates in nullable composite revision FKs. Supply it
      // explicitly instead of relying on Prisma's overlapping-relation default.
      const document = await db.contentDocument.create({ data: { id: randomUUID(), kind: body.kind } });
      const revision = await saveRevision(db, document, emptyCmsPayload(body.kind), auth.userId, false);
      await appendAudit(db, { action: "CONTENT_CREATED", actor: { kind: "USER", userId: auth.userId }, targetType: "CONTENT_DOCUMENT", targetId: document.id, metadata: { operationId: body.operationId, documentId: document.id, revisionId: revision.id, revision: 1 } });
      return receipt(await db.contentOperation.create({ data: { operationId: body.operationId, actorId: auth.userId, documentId: document.id, kind: "INITIALIZE", digest, version: 1, revisionId: revision.id } }));
    }));
  }
  async detail(req: Request, res: Response) {
    const auth = this.auth(req); const id = this.id(req);
    res.json(await contentTransaction(this.prisma, async db => { await contentAdmin(db, auth); return contentDetail(db, await documentRow(db, id)); }));
  }
  async save(req: Request, res: Response) {
    const auth = this.auth(req); const id = this.id(req); const body = CmsSaveSchema.parse(req.body);
    res.json(await contentOperation(this.prisma, auth, id, "SAVE", body, "CONTENT_SAVED", async (db, document) => (await saveRevision(db, document, body.payload, auth.userId)).id));
  }
  async publish(req: Request, res: Response) {
    const auth = this.auth(req); const id = this.id(req); const body = CmsPublishSchema.parse(req.body);
    res.json(await contentOperation(this.prisma, auth, id, "PUBLISH", body, "CONTENT_PUBLISHED", async (db, document) => {
      const revision = await db.contentRevision.findFirst({ where: { id: body.revisionId, documentId: id } });
      if (!revision) throw new NotFoundError("Revision");
      const issues = await validateContentReferences(db, id, CmsPayloadSchema.parse(revision.payload), true);
      if (issues.length) throw new ConflictError("Resolve publication readiness", { issues }, "invalidConfiguration");
      const { digest } = await canonicalFacts(db, document);
      // The document version does not change when operational policy changes.
      // Bind this acknowledgement to the facts returned by the private preview.
      if (body.policyDigest !== digest) throw new ConflictError("Canonical facts changed; preview and review again", undefined, "concurrentChange");
      await db.contentDocument.update({ where: { id }, data: { publishedRevisionId: revision.id, publishedAt: new Date(), policyDigest: digest } });
      if (document.editionId) await db.festivalEdition.update({ where: { id: document.editionId }, data: { everPublished: true } });
      return revision.id;
    }));
  }
  async unpublish(req: Request, res: Response) {
    const auth = this.auth(req); const id = this.id(req); const body = CmsCommandSchema.parse(req.body);
    res.json(await contentOperation(this.prisma, auth, id, "UNPUBLISH", body, "CONTENT_UNPUBLISHED", async (db, document) => {
      await db.contentDocument.update({ where: { id }, data: { publishedRevisionId: null, publishedAt: null, policyDigest: null } }); return document.draftRevisionId;
    }));
  }
  async history(req: Request, res: Response) {
    const auth = this.auth(req); const id = this.id(req); const query = CmsHistoryQuerySchema.parse(req.query);
    res.json(await contentTransaction(this.prisma, async db => { await contentAdmin(db, auth); await documentRow(db, id);
      return (await db.contentRevision.findMany({ where: { documentId: id, ...(query.before && { number: { lt: query.before } }) }, orderBy: { number: "desc" }, take: 20 }))
        .map(row => CmsRevisionSchema.parse({ id: row.id, number: row.number, payload: row.payload, createdAt: row.createdAt.toISOString() })); }));
  }
  async preview(req: Request, res: Response) {
    const auth = this.auth(req); const id = this.id(req); const query = CmsPreviewQuerySchema.parse(req.query);
    res.json(await contentTransaction(this.prisma, async db => {
      await contentAdmin(db, auth); const document = await documentRow(db, id);
      const revision = await db.contentRevision.findFirst({ where: { id: query.revisionId, documentId: id } }); if (!revision) throw new NotFoundError("Revision");
      const { facts, digest } = await canonicalFacts(db, document);
      return CmsPreviewSchema.parse({ content: await projectContent(db, document, revision.id, query.locale, true), issues: await validateContentReferences(db, id, CmsPayloadSchema.parse(revision.payload), true), policyDigest: digest, facts });
    }));
  }
  async operation(req: Request, res: Response) {
    const auth = this.auth(req); const id = this.id(req); const operationId = CmsIdSchema.parse(req.params.operationId);
    res.json(await contentTransaction(this.prisma, async db => { await contentAdmin(db, auth);
      const row = await db.contentOperation.findFirst({ where: { operationId, documentId: id, actorId: auth.userId } }); if (!row) throw new NotFoundError("Operation"); return receipt(row); }));
  }
  async festival(req: Request, res: Response) {
    const auth = this.auth(req); const body = CmsFestivalCreateSchema.parse(req.body);
    const portal = await this.prisma.contentDocument.findFirst({ where: { kind: "FESTIVAL_PORTAL" } }); if (!portal) throw new ConflictError("Load the CMS first");
    res.json(await contentOperation(this.prisma, auth, portal.id, "FESTIVAL", body, "CONTENT_CREATED", async db => {
      await db.festival.create({ data: { slug: body.slug, name: body.name } }); return portal.draftRevisionId;
    }));
  }
  async edition(req: Request, res: Response) {
    const auth = this.auth(req); const body = CmsEditionCreateSchema.parse(req.body);
    const portal = await this.prisma.contentDocument.findFirst({ where: { kind: "FESTIVAL_PORTAL" } }); if (!portal) throw new ConflictError("Load the CMS first");
    res.json(await contentOperation(this.prisma, auth, portal.id, "EDITION", body, "CONTENT_CREATED", async db => {
      if (!await db.festival.findFirst({ where: { id: body.festivalId, archivedAt: null } })) throw new NotFoundError("Festival");
      const edition = await db.festivalEdition.create({ data: { festivalId: body.festivalId, slug: body.slug } });
      const document = await db.contentDocument.create({ data: { id: randomUUID(), kind: "FESTIVAL_EDITION", editionId: edition.id } });
      const payload = emptyCmsPayload("FESTIVAL_EDITION");
      if (payload.kind !== "FESTIVAL_EDITION") throw new Error("Wrong template");
      if (body.copyDocumentId) {
        const source = await documentRow(db, body.copyDocumentId); const sourceRevision = await db.contentRevision.findUniqueOrThrow({ where: { id: source.draftRevisionId! } });
        const original = CmsPayloadSchema.parse(sourceRevision.payload); if (original.kind !== "FESTIVAL_EDITION") throw new ConflictError("Copy an edition");
        payload.primaryLocale = original.primaryLocale;
        for (const key of body.sections) {
          if (key === "brand") payload.brand = { ...original.brand, artwork: null };
          else if (key === "judges") payload.judges = original.judges.map(row => ({ ...row, portrait: null }));
          else if (key === "rules") payload.rules = original.rules;
          else if (key === "contact") payload.contact = original.contact;
          else payload[key] = original[key];
        }
      }
      // Media require explicit document re-ownership through upload; dates, links,
      // results, metadata, policy review and every operational record stay absent.
      const revision = await saveRevision(db, document, payload, auth.userId, false);
      return revision.id;
    }));
  }
  async link(req: Request, res: Response) {
    const auth = this.auth(req); const editionId = CmsIdSchema.parse(req.params.editionId); const body = CmsLinkSchema.parse(req.body);
    const document = await this.prisma.contentDocument.findUnique({ where: { editionId } }); if (!document) throw new NotFoundError("Edition");
    res.json(await contentOperation(this.prisma, auth, document.id, "LINK", body, "CONTENT_LINKED", async (db, current) => {
      if (current.publishedRevisionId) throw new ConflictError("Unpublish before changing the event");
      const edition = await db.festivalEdition.findUniqueOrThrow({ where: { id: editionId } });
      if (edition.everPublished && !body.migrationReviewed) throw new ConflictError("Review URL and canonical facts before relinking", undefined, "invalidConfiguration");
      if (body.eventId && !await db.event.findUnique({ where: { id: body.eventId } })) throw new NotFoundError("Event");
      await db.festivalEdition.update({ where: { id: editionId }, data: { eventId: body.eventId } }); return document.draftRevisionId;
    }));
  }
  async archive(req: Request, res: Response) {
    const auth = this.auth(req); const id = this.id(req); const body = CmsCommandSchema.parse(req.body);
    res.json(await contentOperation(this.prisma, auth, id, "ARCHIVE", body, "CONTENT_ARCHIVED", async (db, document) => {
      if (!document.editionId || document.publishedRevisionId) throw new ConflictError("Unpublish the edition first");
      await db.festivalEdition.update({ where: { id: document.editionId }, data: { archivedAt: new Date() } }); return document.draftRevisionId;
    }));
  }
  async publicRead(req: Request, res: Response, kind: "STUDIO_SITE" | "FESTIVAL_PORTAL" | "FESTIVAL_EDITION") {
    const { locale } = CmsLocaleQuerySchema.parse(req.query);
    const slug = req.params.festivalSlug === undefined ? undefined : CmsSlugSchema.parse(req.params.festivalSlug);
    const editionSlug = req.params.editionSlug === undefined ? undefined : CmsSlugSchema.parse(req.params.editionSlug);
    res.json(await readPublishedContent(this.prisma, kind, locale, slug && editionSlug ? { festivalSlug: slug, editionSlug } : undefined));
  }
}
