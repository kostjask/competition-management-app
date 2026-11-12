import type { Request, Response } from "express";
import { z } from "zod";
import { EventIdParamsSchema, ReviewOverviewSchema, IdSchema } from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ForbiddenError, NotFoundError } from "../errors";
import { eventSelect, serializeEvent } from "./EventsController";
import { registrationTransaction } from "../services/registrationPolicy";
import { queueEmail } from "../services/emailQueue";
import { recipientLocale } from "../services/staffPolicy";
import { StudiosController } from "./StudiosController";
import { serializeRegistration, registrationSelect } from "./StudioRegistrationsController";

const RetryParams = EventIdParamsSchema.extend({ notificationId: IdSchema });
const Metadata = z.object({
  fromStatus: z.string().optional(),
  toStatus: z.string().optional(),
  revision: z.int().optional(),
});
export class ReviewController extends BaseController {
  async overview(req: Request, res: Response) {
    if (!this.isAdmin(req)) throw new ForbiddenError();
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const result = await registrationTransaction(this.prisma, async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId }, select: eventSelect });
      if (!event) throw new NotFoundError("Event");
      const rows = await tx.studioEventRegistration.findMany({
        where: { eventId, studio: { eventId, deletedAt: null } },
        select: {
          ...registrationSelect,
          notifications: {
            include: { delivery: { select: { state: true, expiresAt: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { studio: { name: "asc" } },
      });
      const applications = [];
      for (const row of rows) {
        const studio = await StudiosController.readForReview(tx, row.studioId, eventId);
        const history = await tx.auditLog.findMany({
          where: {
            eventId,
            studioId: row.studioId,
            action: {
              in: [
                "REGISTRATION_CREATED",
                "REGISTRATION_CORRECTED",
                "REGISTRATION_CANCELLED",
                "REGISTRATION_REAPPLIED",
                "REGISTRATION_APPROVAL_CHANGED",
                "STUDIO_APPROVAL_CHANGED",
              ],
            },
          },
          select: { id: true, action: true, metadata: true, createdAt: true },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });
        applications.push({
          registration: serializeRegistration(row),
          studio,
          history: history.map((entry) => {
            const data = Metadata.parse(entry.metadata);
            return {
              id: entry.id,
              action: entry.action,
              createdAt: entry.createdAt.toISOString(),
              fromStatus: data.fromStatus ?? null,
              toStatus: data.toStatus ?? null,
              revision: data.revision ?? null,
            };
          }),
          notifications: row.notifications.map((item) => ({
            id: item.id,
            kind: item.kind,
            status: item.status,
            revision: item.revision,
            reason: item.reason,
            createdAt: item.createdAt.toISOString(),
            delivery: !item.delivery
              ? "TEST_ONLY"
              : item.delivery.state === "PENDING" && item.delivery.expiresAt <= new Date()
                ? "CANCELLED"
                : item.delivery.state,
          })),
        });
      }
      return ReviewOverviewSchema.parse({ event: serializeEvent(event), applications });
    });
    res.json(result);
  }

  async retry(req: Request, res: Response) {
    if (!this.isAdmin(req)) throw new ForbiddenError();
    const { eventId, notificationId } = RetryParams.parse(req.params);
    z.strictObject({}).parse(req.body ?? {});
    await registrationTransaction(this.prisma, async (tx) => {
      const item = await tx.reviewNotification.findFirst({
        where: {
          id: notificationId,
          registration: { eventId, studio: { eventId, deletedAt: null } },
        },
        include: { delivery: true, registration: { select: { studioId: true } } },
      });
      if (!item) throw new NotFoundError("Notification");
      // Pending dispatch already retries automatically. Never resend provider-accepted mail.
      if (
        item.delivery &&
        (item.delivery.state === "ACCEPTED" ||
          (item.delivery.state === "PENDING" && item.delivery.expiresAt > new Date()))
      )
        return;
      const owner = await tx.studioRepresentative.findFirst({
        where: {
          studioId: item.registration.studioId,
          userId: item.recipientId,
          active: true,
          user: { active: true, emailVerified: true },
        },
        select: { user: { select: { email: true, preferredLocale: true } } },
      });
      if (!owner) throw new ForbiddenError();
      if (item.delivery?.state === "PENDING")
        await tx.emailDelivery.update({
          where: { id: item.delivery.id },
          data: { state: "CANCELLED", ciphertext: null },
        });
      const deliveryId = await queueEmail(tx, {
        to: owner.user.email,
        locale: recipientLocale(undefined, owner.user.preferredLocale),
        kind: "reviewUpdated",
      });
      await tx.reviewNotification.update({ where: { id: item.id }, data: { deliveryId } });
    });
    res.status(204).send();
  }
}
