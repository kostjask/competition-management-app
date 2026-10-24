import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  CreateCategoryBodySchema, UpdateCategoryBodySchema, CategoryEventParamsSchema,
  CategoryItemParamsSchema, CategorySchema,
} from "@dance/schemas";
import { BaseController } from "./BaseController";
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from "../errors";

const categorySelect = {
  id: true, eventId: true, name: true,
} satisfies Prisma.DanceCategorySelect;
type CategoryRecord = Prisma.DanceCategoryGetPayload<{ select: typeof categorySelect }>;

function serialize(record: CategoryRecord) {
  const result = CategorySchema.safeParse({
    id: record.id, eventId: record.eventId, name: record.name,
  });
  if (!result.success) throw new InternalServerError();
  return result.data;
}

export class CategoriesController extends BaseController {
  private async requireAccess(req: Request, eventId: string, write = false) {
    const permissions = req.auth?.permissionsByEvent;
    if (!this.isAdmin(req) && (write || !(permissions?.get(eventId)?.has("event.manage") ||
      permissions?.get(null)?.has("event.manage")))) throw new ForbiddenError();
    if (!await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })) {
      throw new NotFoundError("Event", eventId);
    }
  }

  private async mutation<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") throw new ConflictError("Category with this name already exists for this event", undefined, "duplicateName");
        if (error.code === "P2003") throw new ConflictError("Category relationship changed or performances prevent deletion", undefined, "relationshipConflict");
        if (error.code === "P2025") throw new NotFoundError("Category");
      }
      throw error;
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    const { eventId } = CategoryEventParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId);
    const categories = await this.prisma.danceCategory.findMany({
      where: { eventId }, select: categorySelect, orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    res.json(categories.map(serialize));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { eventId, categoryId } = CategoryItemParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId);
    const category = await this.prisma.danceCategory.findFirst({ where: { id: categoryId, eventId }, select: categorySelect });
    if (!category) throw new NotFoundError("Category", categoryId);
    res.json(serialize(category));
  }

  async create(req: Request, res: Response): Promise<void> {
    const { eventId } = CategoryEventParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId, true);
    const body = CreateCategoryBodySchema.parse(req.body);
    const category = await this.mutation(() => this.prisma.danceCategory.create({
      data: { eventId, name: body.name }, select: categorySelect,
    }));
    res.status(201).json(serialize(category));
  }

  async update(req: Request, res: Response): Promise<void> {
    const { eventId, categoryId } = CategoryItemParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId, true);
    const body = UpdateCategoryBodySchema.parse(req.body);
    const category = await this.mutation(() => this.prisma.danceCategory.update({
      where: { id: categoryId, eventId }, data: { name: body.name }, select: categorySelect,
    }));
    res.json(serialize(category));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { eventId, categoryId } = CategoryItemParamsSchema.parse(req.params);
    await this.requireAccess(req, eventId, true);
    await this.mutation(() => this.prisma.danceCategory.delete({ where: { id: categoryId, eventId } }));
    res.status(204).send();
  }
}
