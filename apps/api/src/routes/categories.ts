import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";
import {
  CreateCategoryBodySchema,
  UpdateCategoryBodySchema,
  CategoryEventParamsSchema,
  IdSchema,
} from "@dance/schemas";

export const categoriesRouter = (prisma: PrismaClient) => {
  const router = Router();

  // POST /events/:eventId/categories - Create category (admin only)
  router.post(
    "/:eventId/categories",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const params = CategoryEventParamsSchema.parse(req.params);
      const body = CreateCategoryBodySchema.parse(req.body);

      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: params.eventId },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      try {
        const category = await prisma.danceCategory.create({
          data: {
            eventId: params.eventId,
            name: body.name.trim(),
          },
        });

        res.status(201).json(category);
      } catch (error: any) {
        // Handle unique constraint violation
        if (error.code === "P2002") {
          return res.status(409).json({
            error: "Category with this name already exists for this event",
          });
        }
        throw error;
      }
    }
  );

  // GET /events/:eventId/categories - List categories
  router.get(
    "/:eventId/categories",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const params = CategoryEventParamsSchema.parse(req.params);

      const categories = await prisma.danceCategory.findMany({
        where: { eventId: params.eventId },
        orderBy: { name: "asc" },
      });

      res.json(categories);
    }
  );

  // GET /events/:eventId/categories/:id - Get single category
  router.get(
    "/:eventId/categories/:id",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const eventId = IdSchema.parse(req.params.eventId);
      const id = IdSchema.parse(req.params.id);

      const category = await prisma.danceCategory.findFirst({
        where: {
          id,
          eventId,
        },
      });

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      res.json(category);
    }
  );

  // PATCH /events/:eventId/categories/:id - Update category (admin only)
  router.patch(
    "/:eventId/categories/:id",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const eventId = IdSchema.parse(req.params.eventId);
      const id = IdSchema.parse(req.params.id);
      const body = UpdateCategoryBodySchema.parse(req.body);

      // Verify category exists and belongs to event
      const existingCategory = await prisma.danceCategory.findFirst({
        where: { id, eventId },
      });

      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }

      try {
        const updateData: any = {};
        if (body.name) updateData.name = body.name.trim();

        const category = await prisma.danceCategory.update({
          where: { id },
          data: updateData,
        });

        res.json(category);
      } catch (error: any) {
        // Handle unique constraint violation
        if (error.code === "P2002") {
          return res.status(409).json({
            error: "Category with this name already exists for this event",
          });
        }
        throw error;
      }
    }
  );

  // DELETE /events/:eventId/categories/:id - Delete category
  router.delete(
    "/:eventId/categories/:id",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const eventId = IdSchema.parse(req.params.eventId);
      const id = IdSchema.parse(req.params.id);

      // Verify category exists and belongs to event
      const existingCategory = await prisma.danceCategory.findFirst({
        where: { id, eventId },
        include: {
          _count: {
            select: { performances: true },
          },
        },
      });

      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Check if category is in use
      if (existingCategory._count.performances > 0) {
        return res.status(409).json({
          error: "Cannot delete category that is used by performances",
        });
      }

      await prisma.danceCategory.delete({
        where: { id },
      });

      res.sendStatus(204);
    }
  );

  return router;
};