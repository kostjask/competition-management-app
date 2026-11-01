import { serializeDto } from "../utils/dto";
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { EventImageParamsSchema, UserPhotoParamsSchema, DancerPhotoParamsSchema, StudioLogoParamsSchema, ImageUploadResponseSchema, PhotoUploadResponseSchema, LogoUploadResponseSchema } from "@dance/schemas";
import { uploadFile, deleteFile, getFileUrl, getStorageProvider } from "../services/storage";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../errors";
import { BaseController } from "./BaseController";
import { imageAccess, type ImageTarget, type ImageResource } from "../services/imageAccess";
import { prepareRaster, canonicalImageName } from "../services/rasterImage";
import { appendAudit } from "../services/audit";

export class ImagesController extends BaseController {
  private async discard(filePath: string) {
    try { await deleteFile(filePath); }
    catch { console.error("Image cleanup pending"); }
  }
  private async replace(req: Request, res: Response, target: ImageTarget) {
    if (!req.auth) throw new UnauthorizedError();
    const session = req.auth;
    const before = await imageAccess(this.prisma, session, target, true);
    if (!req.file) throw new ValidationError("No file uploaded", undefined, "uploadMissing");
    const image = await prepareRaster(req.file);
    const filePath = await uploadFile(image, target.resource, image.filename);
    const url = getFileUrl(filePath);
    try {
      await this.prisma.$transaction(async tx => {
        const current = await imageAccess(tx, session, target, true);
        if (current.path !== before.path) throw new ConflictError("Image changed concurrently", undefined, "concurrentChange");
        switch (target.resource) {
          case "events": await tx.event.update({ where: { id: target.id }, data: { imagePath: filePath, imageUrl: url } }); break;
          case "users": await tx.user.update({ where: { id: target.id }, data: { photoPath: filePath, photoUrl: url } }); break;
          case "dancers": await tx.dancer.update({ where: { id: target.id }, data: { photoPath: filePath, photoUrl: url } }); break;
          case "studios": await tx.studio.update({ where: { id: target.id }, data: { logoPath: filePath, logoUrl: url } }); break;
        }
        await appendAudit(tx, { action: "IMAGE_REPLACED", actor: { kind: "USER", userId: session.userId },
          targetType: current.targetType, targetId: target.id, eventId: current.eventId, studioId: current.studioId });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) { await this.discard(filePath); throw error; }
    if (before.path) await this.discard(before.path);
    const body = { success: true, messageId: "saved" };
    if (target.resource === "events") res.json(serializeDto(ImageUploadResponseSchema, { ...body, imageUrl: url }));
    else if (target.resource === "studios") res.json(serializeDto(LogoUploadResponseSchema, { ...body, logoUrl: url }));
    else res.json(serializeDto(PhotoUploadResponseSchema, { ...body, photoUrl: url }));
  }
  async event(req: Request, res: Response) { const { eventId } = EventImageParamsSchema.parse(req.params); await this.replace(req, res, { resource: "events", id: eventId }); }
  async user(req: Request, res: Response) { const { userId } = UserPhotoParamsSchema.parse(req.params); await this.replace(req, res, { resource: "users", id: userId }); }
  async dancer(req: Request, res: Response) { const { dancerId } = DancerPhotoParamsSchema.parse(req.params); await this.replace(req, res, { resource: "dancers", id: dancerId }); }
  async studio(req: Request, res: Response) { const { studioId } = StudioLogoParamsSchema.parse(req.params); await this.replace(req, res, { resource: "studios", id: studioId }); }

  async retrieve(req: Request, res: Response) {
    if (!req.auth) throw new UnauthorizedError();
    const { resource, filename } = req.params;
    if (typeof resource !== "string" || !["events", "users", "studios", "dancers"].includes(resource) || typeof filename !== "string" || !canonicalImageName.test(filename)) throw new NotFoundError("Image");
    const key = resource + "/" + filename;
    let id: string | undefined;
    switch (resource) {
      case "events": id = (await this.prisma.event.findFirst({ where: { imagePath: key }, select: { id: true } }))?.id; break;
      case "users": id = (await this.prisma.user.findFirst({ where: { photoPath: key }, select: { id: true } }))?.id; break;
      case "dancers": id = (await this.prisma.dancer.findFirst({ where: { photoPath: key }, select: { id: true } }))?.id; break;
      case "studios": id = (await this.prisma.studio.findFirst({ where: { logoPath: key }, select: { id: true } }))?.id; break;
    }
    if (!id) throw new NotFoundError("Image");
    // Construct a typed target only after validating the resource name above.
    const targetResource: ImageResource = resource === "events" ? "events" : resource === "users" ? "users" : resource === "dancers" ? "dancers" : "studios";
    const current = await imageAccess(this.prisma, req.auth, { resource: targetResource, id }, false);
    if (current.path !== key) throw new NotFoundError("Image");
    const bytes = await getStorageProvider().readFile(key);
    res.set({ "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Disposition": 'inline; filename="image.webp"' });
    res.send(bytes);
  }
}
