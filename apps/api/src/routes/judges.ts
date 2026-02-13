import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";
import {
  CreateJudgeBodySchema,
  UpdateJudgeBodySchema,
  JudgeEventParamsSchema,
  IdSchema,
} from "@dance/schemas";

export const judgesRouter = (prisma: PrismaClient) => {
  const router = Router();

  // POST /judges - Create judge for event (admin only)
  router.post(
    "/:eventId/judges",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const params = JudgeEventParamsSchema.parse(req.params);
      const body = CreateJudgeBodySchema.parse(req.body);

      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: params.eventId },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const judge = await prisma.judge.create({
        data: {
          eventId: params.eventId,
          userId: body.userId,
          name: body.name.trim(),
          description: body.description?.trim() || null,
          country: body.country?.trim() || null,
          city: body.city?.trim() || null,
        },
      });

      res.status(201).json(judge);
    },
  );

  // GET /judges - List judges for event
  router.get(
    "/:eventId/judges",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const params = JudgeEventParamsSchema.parse(req.params);

      const judges = await prisma.judge.findMany({
        where: { eventId: params.eventId },
        orderBy: { name: "asc" },
      });

      res.json(judges);
    },
  );

  // GET /judges/:id - Get single judge
  router.get(
    "/:eventId/judges/:id",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const eventId = IdSchema.parse(req.params.eventId);
      const id = IdSchema.parse(req.params.id);

      const judge = await prisma.judge.findFirst({
        where: {
          id,
          eventId,
        },
      });

      if (!judge) {
        return res.status(404).json({ error: "Judge not found" });
      }

      res.json(judge);
    },
  );

  // PATCH /judges/:id - Update judge (admin only)
  router.patch(
    "/:eventId/judges/:id",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const eventId = IdSchema.parse(req.params.eventId);
      const id = IdSchema.parse(req.params.id);
      const body = UpdateJudgeBodySchema.parse(req.body);

      // Verify judge exists and belongs to event
      const existingJudge = await prisma.judge.findFirst({
        where: { id, eventId },
      });

      if (!existingJudge) {
        return res.status(404).json({ error: "Judge not found" });
      }

      const updateData: any = {};
      if (body.name) updateData.name = body.name.trim();
      if (body.description) updateData.description = body.description.trim();
      if (body.country) updateData.country = body.country.trim();
      if (body.city) updateData.city = body.city.trim();
      if (body.eventId) {
        if (body.eventId !== eventId) {
          // Verify new event exists
          const newEvent = await prisma.event.findUnique({
            where: { id: body.eventId },
          });

          if (!newEvent) {
            return res.status(404).json({ error: "Event not found" });
          }
        }

        updateData.eventId = body.eventId;
      }

      const judge = await prisma.judge.update({
        where: { id },
        data: updateData,
      });

      res.json(judge);
    },
  );

  // DELETE /judges/:id - Delete judge (soft delete via cascade on scores)
  router.delete(
    "/:eventId/judges/:id",
    requirePermission("event.manage", { eventParam: "eventId" }),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const eventId = IdSchema.parse(req.params.eventId);
      const id = IdSchema.parse(req.params.id);

      // Verify judge exists and belongs to event
      const existingJudge = await prisma.judge.findFirst({
        where: { id, eventId },
      });

      if (!existingJudge) {
        return res.status(404).json({ error: "Judge not found" });
      }

      // Hard delete (scores will cascade delete based on schema)
      await prisma.judge.delete({
        where: { id },
      });

      res.sendStatus(204);
    },
  );

  return router;
};
