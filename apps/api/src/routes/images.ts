/**
 * Image Upload Routes
 *
 * Handles image uploads for events, judges, dancers, and studios.
 */

import { Router, Request, Response } from "express";
import type { PrismaClient } from "../../generated/prisma/client";
import { uploadFile, deleteFile, getFileUrl } from "../services/storage";
import {
  createFileUploadMiddleware,
  generateUniqueFilename,
} from "../middleware/file-upload";

export function imagesRouter(prisma: PrismaClient) {
  const router = Router();

  /**
   * Upload event image
   * POST /images/events/:eventId
   */
  router.post(
    "/events/:eventId",
    createFileUploadMiddleware({ fieldName: "image" }),
    async (req: Request, res: Response) => {
      try {
        const eventId = req.params.eventId as string;

        // Verify event exists and user has permission
        const event = await prisma.event.findUnique({
          where: { id: eventId },
        });

        if (!event) {
          return res.status(404).json({
            error: "Event not found",
            statusCode: 404,
          });
        }

        // Check if file was uploaded
        if (!req.file) {
          return res.status(400).json({
            error: "No file uploaded",
            statusCode: 400,
          });
        }

        // Delete old image if exists
        if (event.imagePath) {
          await deleteFile(event.imagePath);
        }

        // Upload new image
        const filename = generateUniqueFilename(req.file.originalname);
        const imagePath = await uploadFile(
          {
            buffer: req.file.buffer,
            mimetype: req.file.mimetype,
          },
          "events",
          filename,
        );

        // Update event with new image URL
        const imageUrl = getFileUrl(imagePath);
        const updatedEvent = await prisma.event.update({
          where: { id: eventId },
          data: {
            imagePath,
            imageUrl,
          },
        });

        res.json({
          success: true,
          imageUrl: updatedEvent.imageUrl,
          imagePath: updatedEvent.imagePath,
        });
      } catch (err) {
        console.error("Image upload error:", err);
        res.status(500).json({
          error: "Failed to upload image",
          statusCode: 500,
          details: (err as Error).message,
        });
      }
    },
  );

  /**
   * Upload user photo (for profile, judges, studio representatives, etc.)
   * POST /images/users/:userId
   */
  router.post(
    "/users/:userId",
    createFileUploadMiddleware({ fieldName: "photo" }),
    async (req: Request, res: Response) => {
      try {
        const userId = req.params.userId as string;

        // Verify user exists
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return res.status(404).json({
            error: "User not found",
            statusCode: 404,
          });
        }

        if (!req.file) {
          return res.status(400).json({
            error: "No file uploaded",
            statusCode: 400,
          });
        }

        // Delete old photo if exists
        if (user.photoPath) {
          await deleteFile(user.photoPath);
        }

        // Upload new photo
        const filename = generateUniqueFilename(req.file.originalname);
        const photoPath = await uploadFile(
          {
            buffer: req.file.buffer,
            mimetype: req.file.mimetype,
          },
          "users",
          filename,
        );

        // Update user with new photo URL
        const photoUrl = getFileUrl(photoPath);
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            photoPath,
            photoUrl,
          },
        });

        res.json({
          success: true,
          photoUrl: updatedUser.photoUrl,
          photoPath: updatedUser.photoPath,
        });
      } catch (err) {
        console.error("Photo upload error:", err);
        res.status(500).json({
          error: "Failed to upload photo",
          statusCode: 500,
          details: (err as Error).message,
        });
      }
    },
  );

  /**
   * Upload dancer photo
   * POST /images/dancers/:dancerId
   */
  router.post(
    "/dancers/:dancerId",
    createFileUploadMiddleware({ fieldName: "photo" }),
    async (req: Request, res: Response) => {
      try {
        const dancerId = req.params.dancerId as string;

        // Verify dancer exists
        const dancer = await prisma.dancer.findUnique({
          where: { id: dancerId },
        });

        if (!dancer) {
          return res.status(404).json({
            error: "Dancer not found",
            statusCode: 404,
          });
        }

        if (!req.file) {
          return res.status(400).json({
            error: "No file uploaded",
            statusCode: 400,
          });
        }

        // Delete old photo if exists
        if (dancer.photoPath) {
          await deleteFile(dancer.photoPath);
        }

        // Upload new photo
        const filename = generateUniqueFilename(req.file.originalname);
        const photoPath = await uploadFile(
          {
            buffer: req.file.buffer,
            mimetype: req.file.mimetype,
          },
          "dancers",
          filename,
        );

        // Update dancer with new photo URL
        const photoUrl = getFileUrl(photoPath);
        const updatedDancer = await prisma.dancer.update({
          where: { id: dancerId },
          data: {
            photoPath,
            photoUrl,
          },
        });

        res.json({
          success: true,
          photoUrl: updatedDancer.photoUrl,
          photoPath: updatedDancer.photoPath,
        });
      } catch (err) {
        console.error("Photo upload error:", err);
        res.status(500).json({
          error: "Failed to upload photo",
          statusCode: 500,
          details: (err as Error).message,
        });
      }
    },
  );

  /**
   * Upload studio logo
   * POST /images/studios/:studioId
   */
  router.post(
    "/studios/:studioId",
    createFileUploadMiddleware({ fieldName: "logo" }),
    async (req: Request, res: Response) => {
      try {
        const studioId = req.params.studioId as string;

        // Verify studio exists
        const studio = await prisma.studio.findUnique({
          where: { id: studioId },
        });

        if (!studio) {
          return res.status(404).json({
            error: "Studio not found",
            statusCode: 404,
          });
        }

        if (!req.file) {
          return res.status(400).json({
            error: "No file uploaded",
            statusCode: 400,
          });
        }

        // Delete old logo if exists
        if (studio.logoPath) {
          await deleteFile(studio.logoPath);
        }

        // Upload new logo
        const filename = generateUniqueFilename(req.file.originalname);
        const logoPath = await uploadFile(
          {
            buffer: req.file.buffer,
            mimetype: req.file.mimetype,
          },
          "studios",
          filename,
        );

        // Update studio with new logo URL
        const logoUrl = getFileUrl(logoPath);
        const updatedStudio = await prisma.studio.update({
          where: { id: studioId },
          data: {
            logoPath,
            logoUrl,
          },
        });

        res.json({
          success: true,
          logoUrl: updatedStudio.logoUrl,
          logoPath: updatedStudio.logoPath,
        });
      } catch (err) {
        console.error("Logo upload error:", err);
        res.status(500).json({
          error: "Failed to upload logo",
          statusCode: 500,
          details: (err as Error).message,
        });
      }
    },
  );

  return router;
}
