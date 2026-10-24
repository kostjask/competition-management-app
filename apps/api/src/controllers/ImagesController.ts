import { serializeDto } from "../utils/dto";
import type { Request, Response } from "express";
import { EventImageParamsSchema, UserPhotoParamsSchema, DancerPhotoParamsSchema, StudioLogoParamsSchema, ImageUploadResponseSchema, PhotoUploadResponseSchema, LogoUploadResponseSchema } from "@dance/schemas";
import { uploadFile, deleteFile, getFileUrl } from "../services/storage";
import { generateUniqueFilename } from "../middleware/file-upload";
import { NotFoundError, ValidationError } from "../errors";
import { BaseController } from "./BaseController";
// Resource-specific permissions remain P2-BOUNDARIES; no upload UI may rely on this slice.
export class ImagesController extends BaseController {
  async event(req: Request, res: Response): Promise<void> {
    const { eventId } = EventImageParamsSchema.parse(req.params);
    const record = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!record) throw new NotFoundError("event");
    if (!req.file) throw new ValidationError("No file uploaded", undefined, "uploadMissing");
    const filePath = await uploadFile({ buffer: req.file.buffer, mimetype: req.file.mimetype }, "events", generateUniqueFilename(req.file.originalname));
    const url = getFileUrl(filePath);
    try {
      await this.prisma.event.update({ where: { id: eventId }, data: { imagePath: filePath, imageUrl: url } });
    } catch (error) { await deleteFile(filePath); throw error; }
    if (record.imagePath) await deleteFile(record.imagePath);
    res.json(serializeDto(ImageUploadResponseSchema, { success: true, messageId: "saved", imageUrl: url }));
  }
  async user(req: Request, res: Response): Promise<void> {
    const { userId } = UserPhotoParamsSchema.parse(req.params);
    const record = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!record) throw new NotFoundError("user");
    if (!req.file) throw new ValidationError("No file uploaded", undefined, "uploadMissing");
    const filePath = await uploadFile({ buffer: req.file.buffer, mimetype: req.file.mimetype }, "users", generateUniqueFilename(req.file.originalname));
    const url = getFileUrl(filePath);
    try {
      await this.prisma.user.update({ where: { id: userId }, data: { photoPath: filePath, photoUrl: url } });
    } catch (error) { await deleteFile(filePath); throw error; }
    if (record.photoPath) await deleteFile(record.photoPath);
    res.json(serializeDto(PhotoUploadResponseSchema, { success: true, messageId: "saved", photoUrl: url }));
  }
  async dancer(req: Request, res: Response): Promise<void> {
    const { dancerId } = DancerPhotoParamsSchema.parse(req.params);
    const record = await this.prisma.dancer.findUnique({ where: { id: dancerId } });
    if (!record || record.deletedAt) throw new NotFoundError("dancer");
    if (!req.file) throw new ValidationError("No file uploaded", undefined, "uploadMissing");
    const filePath = await uploadFile({ buffer: req.file.buffer, mimetype: req.file.mimetype }, "dancers", generateUniqueFilename(req.file.originalname));
    const url = getFileUrl(filePath);
    try {
      await this.prisma.dancer.update({ where: { id: dancerId }, data: { photoPath: filePath, photoUrl: url } });
    } catch (error) { await deleteFile(filePath); throw error; }
    if (record.photoPath) await deleteFile(record.photoPath);
    res.json(serializeDto(PhotoUploadResponseSchema, { success: true, messageId: "saved", photoUrl: url }));
  }
  async studio(req: Request, res: Response): Promise<void> {
    const { studioId } = StudioLogoParamsSchema.parse(req.params);
    const record = await this.prisma.studio.findUnique({ where: { id: studioId } });
    if (!record || record.deletedAt) throw new NotFoundError("studio");
    if (!req.file) throw new ValidationError("No file uploaded", undefined, "uploadMissing");
    const filePath = await uploadFile({ buffer: req.file.buffer, mimetype: req.file.mimetype }, "studios", generateUniqueFilename(req.file.originalname));
    const url = getFileUrl(filePath);
    try {
      await this.prisma.studio.update({ where: { id: studioId }, data: { logoPath: filePath, logoUrl: url } });
    } catch (error) { await deleteFile(filePath); throw error; }
    if (record.logoPath) await deleteFile(record.logoPath);
    res.json(serializeDto(LogoUploadResponseSchema, { success: true, messageId: "saved", logoUrl: url }));
  }
}
