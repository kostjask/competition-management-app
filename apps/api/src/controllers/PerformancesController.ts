import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import { BaseController } from "./BaseController";
import {
  CreatePerformanceBodySchema,
  PerformanceParamsSchema,
} from "@dance/schemas";
import { isActionAllowed } from "../utils/stageChecks";
import { th } from "zod/locales";

export class PerformancesController extends BaseController {
  /**
   * Helper: Verify performance access
   */
  private async requirePerformanceAccess(
    userId: string,
    studioId: string,
    eventId: string,
  ) {
    const studio = await this.prisma.studio.findFirst({
      where: { id: studioId, deletedAt: null },
      include: {
        registrations: true,
        representatives: true,
        event: { select: { stage: true } },
      },
    });

    if (!studio)
      return {
        studio: null,
        isRep: false,
        eventRegStatus: null,
        isStudioApproved: false,
        canEditDuringReview: false,
      };

    const isRep = studio.representatives.some(
      (r) => r.userId === userId && r.active,
    );

    const eventRegistration = studio.registrations.find(
      (r) => r.eventId === eventId,
    );

    const eventRegStatus = eventRegistration?.status;
    const isStudioApproved = studio.approvalStatus === "APPROVED";
    const canEditDuringReview = eventRegistration?.canEditDuringReview ?? false;

    return {
      studio,
      isRep,
      eventRegStatus,
      isStudioApproved,
      canEditDuringReview,
    };
  }

  async createPerformance(req: Request, res: Response): Promise<void> {
    const params = PerformanceParamsSchema.parse(req.params);
    const body = CreatePerformanceBodySchema.parse(req.body);
    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);
    const studioId = params.studioId;
    const eventId = params.eventId;

    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      include: { event: true },
    });

    if (!studio) {
      throw new NotFoundError("Studio not found", studioId);
    }

    if (!isAdmin) {
      const { studio, isRep, eventRegStatus, isStudioApproved } =
        await this.requirePerformanceAccess(userId, studioId, eventId);

      if (!isStudioApproved) {
        throw new ForbiddenError(
          "Your studio has not been approved yet. You cannot manage performances until your studio is approved.",
        );
      }

      if (eventRegStatus !== "APPROVED") {
        const msg =
          eventRegStatus === "PENDING"
            ? "Your studio's registration for this event is still pending approval"
            : "Your studio's registration for this event was rejected";

        throw new ForbiddenError(msg);
      }

      if (!isRep) {
        throw new ForbiddenError(
          "You do not have access to manage performances for this studio",
        );
      }

      if (!isActionAllowed(studio.event.stage, "performance.manage")) {
        throw new ForbiddenError(
          "Performance management not allowed in current event stage",
        );
      }
    }

    // Validate category/ageGroup/format belong to the same event
    const [category, ageGroup, format] = await Promise.all([
      this.prisma.danceCategory.findFirst({
        where: { id: body.categoryId, eventId: eventId },
      }),
      this.prisma.ageGroup.findFirst({
        where: { id: body.ageGroupId, eventId: eventId },
      }),
      this.prisma.danceFormat.findFirst({
        where: { id: body.formatId, eventId: eventId },
      }),
    ]);

    if (!category || !ageGroup || !format) {
      throw new ConflictError(
        "Category, age group, or format not found for this event",
      );
    }

    // Validate dancers belong to studio
    const dancers = await this.prisma.dancer.findMany({
      where: { id: { in: body.dancerIds }, studioId, deletedAt: null },
      select: { id: true },
    });

    if (dancers.length !== body.dancerIds.length) {
      throw new ConflictError(
        "One or more dancers not found or do not belong to the studio",
      );
    }

    const performance = await this.prisma.performance.create({
      data: {
        eventId: eventId,
        title: body.title,
        durationSec: body.durationSec,
        orderOnStage: body.orderOnStage,
        categoryId: body.categoryId,
        ageGroupId: body.ageGroupId,
        formatId: body.formatId,
        participants: {
          createMany: {
            data: body.dancerIds.map((dancerId) => ({ dancerId })),
          },
        },
      },
      include: {
        participants: { include: { dancer: true } },
      },
    });

    res.json(performance);
  }

  async getPerformancesForStudio(req: Request, res: Response): Promise<void> {
    const params = PerformanceParamsSchema.parse(req.params);
    const body = CreatePerformanceBodySchema.parse(req.body);
    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);
    const studioId = params.studioId;
    const eventId = params.eventId;

    if (!isAdmin) {
      const { studio, isRep, eventRegStatus, isStudioApproved } =
        await this.requirePerformanceAccess(userId, studioId, eventId);

      if (!studio) {
        throw new NotFoundError("Studio not found", studioId);
      }

      if (!isStudioApproved) {
        throw new ForbiddenError(
          "Your studio has not been approved yet. You cannot manage performances until your studio is approved.",
        );
      }

      if (eventRegStatus !== "APPROVED") {
        const msg =
          eventRegStatus === "PENDING"
            ? "Your studio's registration for this event is still pending approval"
            : "Your studio's registration for this event was rejected";

        throw new ForbiddenError(msg);
      }

      if (!isRep) {
        throw new ForbiddenError(
          "You do not have access to manage performances for this studio",
        );
      }

      if (!isActionAllowed(studio.event.stage, "performance.manage")) {
        throw new ForbiddenError(
          "Performance management not allowed in current event stage",
        );
      }
    }

    const performances = await this.prisma.performance.findMany({
        where: {
          participants: {
            some: {
              dancer: { studioId },
            },
          },
        },
        include: {
          participants: { include: { dancer: true } },
          category: true,
          ageGroup: true,
          format: true,
        },
        orderBy: { orderOnStage: "asc" },
      });

      res.json(performances);
    }
}
