import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";
import {
  CreateAgeGroupBodySchema,
  UpdateAgeGroupBodySchema,
  AgeGroupEventParamsSchema,
  IdSchema,
} from "@dance/schemas";

export const ageGroupsRouter = (prisma: PrismaClient) => {
  const router = Router();

  // POST /events/:eventId/age-groups - Create age group (admin only)
  router.post(
    "/:eventId/age-groups",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const params = AgeGroupEventParamsSchema.parse(req.params);
      const body = CreateAgeGroupBodySchema.parse(req.body);

      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: params.eventId },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const ageGroup = await prisma.ageGroup.create({
        data: {
          eventId: params.eventId,
          name: body.name.trim(),
          minAge: body.minAge,
          maxAge: body.maxAge ?? null,
        },
      });

      res.status(201).json(ageGroup);
    }
  );

  // GET /events/:eventId/age-groups - List age groups
  router.get(
    "/:eventId/age-groups",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const params = AgeGroupEventParamsSchema.parse(req.params);

      const ageGroups = await prisma.ageGroup.findMany({
        where: { eventId: params.eventId },
        orderBy: { minAge: "asc" },
      });

      res.json(ageGroups);
    }
  );

  // GET /events/:eventId/age-groups/:id - Get single age group
  router.get(
    "/:eventId/age-groups/:id",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const eventId = IdSchema.parse(req.params.eventId);
      const id = IdSchema.parse(req.params.id);

      const ageGroup = await prisma.ageGroup.findFirst({
        where: {
          id,
          eventId,
        },
      });

      if (!ageGroup) {
        return res.status(404).json({ error: "Age group not found" });
      }

      res.json(ageGroup);
    }
  );

  // PATCH /events/:eventId/age-groups/:id - Update age group (admin only)
  router.patch(
    "/:eventId/age-groups/:id",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const eventId = IdSchema.parse(req.params.eventId);
      const id = IdSchema.parse(req.params.id);
      const body = UpdateAgeGroupBodySchema.parse(req.body);

      // Verify age group exists and belongs to event
      const existingAgeGroup = await prisma.ageGroup.findFirst({
        where: { id, eventId },
      });

      if (!existingAgeGroup) {
        return res.status(404).json({ error: "Age group not found" });
      }

      // If updating min/max age, ensure validation
      const minAge = body.minAge ?? existingAgeGroup.minAge;
      const maxAge = body.maxAge !== undefined ? body.maxAge : existingAgeGroup.maxAge;

      if (maxAge !== null && minAge > maxAge) {
        return res.status(400).json({
          error: "Min age cannot exceed max age",
        });
      }

      const updateData: any = {};
      if (body.name) updateData.name = body.name.trim();
      if (body.minAge !== undefined) updateData.minAge = body.minAge;
      if (body.maxAge !== undefined) updateData.maxAge = body.maxAge;

      const ageGroup = await prisma.ageGroup.update({
        where: { id },
        data: updateData,
      });

      res.json(ageGroup);
    }
  );

  // DELETE /events/:eventId/age-groups/:id - Delete age group
  router.delete(
    "/:eventId/age-groups/:id",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const eventId = IdSchema.parse(req.params.eventId);
      const id = IdSchema.parse(req.params.id);

      // Verify age group exists and belongs to event
      const existingAgeGroup = await prisma.ageGroup.findFirst({
        where: { id, eventId },
        include: {
          _count: {
            select: { performances: true },
          },
        },
      });

      if (!existingAgeGroup) {
        return res.status(404).json({ error: "Age group not found" });
      }

      // Check if age group is in use
      if (existingAgeGroup._count.performances > 0) {
        return res.status(409).json({
          error: "Cannot delete age group that is used by performances",
        });
      }

      await prisma.ageGroup.delete({
        where: { id },
      });

      res.sendStatus(204);
    }
  );

  return router;
};