import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";
import {
  CreateFormatBodySchema,
  UpdateFormatBodySchema,
  FormatEventParamsSchema,
  IdSchema,
} from "@dance/schemas";

export const formatsRouter = (prisma: PrismaClient) => {
  const router = Router();

  // POST /events/:eventId/formats - Create format (admin only)
  router.post(
    "/:eventId/formats",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const params = FormatEventParamsSchema.parse(req.params);
      const body = CreateFormatBodySchema.parse(req.body);

      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: params.eventId },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const format = await prisma.danceFormat.create({
        data: {
          eventId: params.eventId,
          name: body.name.trim(),
          minParticipants: body.minParticipants,
          maxParticipants: body.maxParticipants,
          maxDurationSeconds: body.maxDurationSeconds,
        },
      });

      res.status(201).json(format);
    }
  );

  // GET /events/:eventId/formats - List formats
  router.get(
    "/:eventId/formats",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const params = FormatEventParamsSchema.parse(req.params);

      const formats = await prisma.danceFormat.findMany({
        where: { eventId: params.eventId },
        orderBy: { name: "asc" },
      });

      res.json(formats);
    }
  );

  // GET /events/:eventId/formats/:id - Get single format
  router.get(
    "/:eventId/formats/:id",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const eventId = IdSchema.parse(req.params.eventId);
      const id = IdSchema.parse(req.params.id);

      const format = await prisma.danceFormat.findFirst({
        where: {
          id,
          eventId,
        },
      });

      if (!format) {
        return res.status(404).json({ error: "Format not found" });
      }

      res.json(format);
    }
  );

  // PATCH /events/:eventId/formats/:id - Update format (admin only)
  router.patch(
    "/:eventId/formats/:id",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const eventId = IdSchema.parse(req.params.eventId);
      const id = IdSchema.parse(req.params.id);
      const body = UpdateFormatBodySchema.parse(req.body);

      // Verify format exists and belongs to event
      const existingFormat = await prisma.danceFormat.findFirst({
        where: { id, eventId },
      });

      if (!existingFormat) {
        return res.status(404).json({ error: "Format not found" });
      }

      // If updating min/max participants, ensure validation
      const minParticipants = body.minParticipants ?? existingFormat.minParticipants;
      const maxParticipants = body.maxParticipants ?? existingFormat.maxParticipants;

      if (minParticipants > maxParticipants) {
        return res.status(400).json({
          error: "Min participants cannot exceed max participants",
        });
      }

      const updateData: any = {};
      if (body.name) updateData.name = body.name.trim();
      if (body.minParticipants !== undefined) updateData.minParticipants = body.minParticipants;
      if (body.maxParticipants !== undefined) updateData.maxParticipants = body.maxParticipants;
      if (body.maxDurationSeconds !== undefined) updateData.maxDurationSeconds = body.maxDurationSeconds;

      const format = await prisma.danceFormat.update({
        where: { id },
        data: updateData,
      });

      res.json(format);
    }
  );

  // DELETE /events/:eventId/formats/:id - Delete format
  router.delete(
    "/:eventId/formats/:id",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const eventId = IdSchema.parse(req.params.eventId);
      const id = IdSchema.parse(req.params.id);

      // Verify format exists and belongs to event
      const existingFormat = await prisma.danceFormat.findFirst({
        where: { id, eventId },
        include: {
          _count: {
            select: { performances: true },
          },
        },
      });

      if (!existingFormat) {
        return res.status(404).json({ error: "Format not found" });
      }

      // Check if format is in use
      if (existingFormat._count.performances > 0) {
        return res.status(409).json({
          error: "Cannot delete format that is used by performances",
        });
      }

      await prisma.danceFormat.delete({
        where: { id },
      });

      res.sendStatus(204);
    }
  );

  return router;
};