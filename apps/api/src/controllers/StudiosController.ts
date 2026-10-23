import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import {
  UpdateStudioBodySchema,
  UpdateRepresentativeBodySchema,
  UpdateStudioApprovalBodySchema,
  StudioIdParamsSchema,
  StudioIdRepIdParamsSchema,
} from "@dance/schemas";
import { isActionAllowed } from "../utils/stageChecks";
import { BaseController } from "./BaseController";

export class StudiosController extends BaseController {
  private async assertActiveStudioNameAvailable(
    name: string,
    country?: string,
    city?: string,
    excludeStudioId?: string,
  ): Promise<void> {
    const existingStudio = await this.prisma.studio.findFirst({
      where: {
        name,
        ...(country ? { country } : {}),
        ...(city ? { city } : {}),
        deletedAt: null,
        ...(excludeStudioId ? { id: { not: excludeStudioId } } : {}),
      },
      select: { id: true },
    });

    if (existingStudio) {
      throw new ConflictError("Studio with this name already exists.");
    }
  }

  /**
   * Helper: Verify studio access for representative
   */
  private async requireStudioAccess(userId: string, studioId: string) {
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
        isApproved: false,
        canEditDuringReview: false,
      };

    const isRep = studio.representatives.some(
      (r) => r.userId === userId && r.active,
    );

    const eventRegistration = studio.registrations.find(
      (r) => r.eventId === studio.eventId,
    );

    const isApproved = studio.approvalStatus === "APPROVED";
    const canEditDuringReview = eventRegistration?.canEditDuringReview ?? false;

    return { studio, isRep, isApproved, canEditDuringReview };
  }

  /**
   * Get current user's studios
   * GET /studios
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);

    if (isAdmin) {
      const studios = await this.prisma.studio.findMany({
        where: { deletedAt: null },
        include: { registrations: true, representatives: true },
        orderBy: { name: "asc" },
      });
      res.json(studios);
      return;
    }

    const studios = await this.prisma.studio.findMany({
      where: {
        deletedAt: null,
        representatives: {
          some: { userId: userId, active: true },
        },
      },
      include: { registrations: true, representatives: true },
      orderBy: { name: "asc" },
    });

    res.json(studios);
  }

  /**
   * Get studio details
   * GET /studios/:studioId
   */
  async getById(req: Request, res: Response): Promise<void> {
    const studioId = StudioIdParamsSchema.parse(req.params).studioId;
    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);

    if (isAdmin) {
      const studio = await this.prisma.studio.findFirst({
        where: { id: studioId, deletedAt: null },
        include: {
          registrations: true,
          representatives: true,
          event: true,
          dancers: true,
        },
      });

      if (!studio) {
        throw new NotFoundError("Studio not found", studioId);
      }

      res.json(studio);
      return;
    }

    const { studio, isRep } = await this.requireStudioAccess(
      userId,
      studioId,
    );

    if (!studio) {
      throw new NotFoundError("Studio not found", studioId);
    }

    if (!isRep) {
      throw new ForbiddenError("Access to studio denied");
    }

    res.json(studio);
  }

  /**
   * Update studio details
   * PATCH /studios/:studioId
   */
  async update(req: Request, res: Response): Promise<void> {
    const studioId = StudioIdParamsSchema.parse(req.params).studioId;
    const body = UpdateStudioBodySchema.parse(req.body);
    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);

    if (!isAdmin) {
      const { studio, isRep, canEditDuringReview } = await this.requireStudioAccess(
        userId,
        studioId,
      );

      if (!studio) {
        throw new NotFoundError("Studio not found", studioId);
      }

      if (!isRep) {
        throw new ForbiddenError("Access to studio denied");
      }

      // Check stage
      if (!isActionAllowed(studio.event.stage, "studio.edit", canEditDuringReview)) {
        throw new ForbiddenError(
          "Studio edits not allowed in current event stage",
        );
      }
    }

    const data: Prisma.StudioUpdateInput = {};

    if (body.name) {
      const normalizedName = body.name.trim();
      await this.assertActiveStudioNameAvailable(
        normalizedName,
        body.country?.trim() ?? undefined,
        body.city?.trim() ?? undefined,
        studioId,
      );
      data.name = normalizedName;
    }
    if (body.country) data.country = body.country.trim();
    if (body.city) data.city = body.city.trim();
    if (body.directorName) data.directorName = body.directorName.trim();
    if (body.directorPhone) data.directorPhone = body.directorPhone.trim();
    if (body.invoiceDetails)
      data.invoiceDetails = body.invoiceDetails as Prisma.InputJsonValue;

    const updatedStudio = await this.prisma.studio.update({
      where: { id: studioId },
      data,
      include: { representatives: true, registrations: true },
    });

    res.json(updatedStudio);
  }

  /**
   * Delete studio
   * DELETE /studios/:studioId
   */
  async delete(req: Request, res: Response): Promise<void> {
    const studioId = StudioIdParamsSchema.parse(req.params).studioId;
    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);

    // if not admin  nad not representative, deny access
    const { studio, isRep } = await this.requireStudioAccess(
      userId,
      studioId,
    );

    if (!isAdmin && !isRep) {
        throw new ForbiddenError("Access denied");
    }

    const deleted = await this.prisma.studio.update({
      where: { id: studioId },
      data: { deletedAt: new Date(), deletedBy: userId },
    });

    res.json(deleted);
  }

  /**
   * Update representative details
   * PATCH /studios/:studioId/representatives/:representativeId
   */
  async updateRepresentative(req: Request, res: Response): Promise<void> {
    const params = StudioIdRepIdParamsSchema.parse(req.params);
    const body = UpdateRepresentativeBodySchema.parse(req.body);
    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);
    const studioId = params.studioId;
    const representativeId = params.representativeId;

    const rep = await this.prisma.studioRepresentative.findUnique({
      where: { id: representativeId },
    });

    if (!rep || rep.studioId !== studioId) {
      throw new NotFoundError(
        "Representative not found",
        representativeId,
      );
    }

    if (!isAdmin && rep.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    const repData: Prisma.StudioRepresentativeUpdateInput = {};

    if (body.name) repData.name = body.name.trim();
    if (body.email) repData.email = body.email.trim();

    const updated = await this.prisma.studioRepresentative.update({
      where: { id: rep.id },
      data: repData,
    });

    res.json(updated);
  }

  /**
   * Update studio approval status
   * PATCH /studios/:studioId/approval
   */
  async updateStudioApproval(req: Request, res: Response): Promise<void> {
    if (!this.isAdmin(req)) {
      throw new ForbiddenError("Only admins can approve or decline studios");
    }

    const studioId = StudioIdParamsSchema.parse(req.params).studioId;
    const body = UpdateStudioApprovalBodySchema.parse(req.body);

    const studio = await this.prisma.studio.findFirst({
      where: { id: studioId, deletedAt: null },
      select: { id: true },
    });

    if (!studio) {
      throw new NotFoundError("Studio not found", studioId);
    }

    const updatedStudio = await this.prisma.studio.update({
      where: { id: studioId },
      data: { approvalStatus: body.status },
      include: { representatives: true, registrations: true },
    });

    res.json(updatedStudio);
  }
}
