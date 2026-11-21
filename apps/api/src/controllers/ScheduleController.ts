import type { Request, Response } from "express";
import { EventIdParamsSchema, LiveScheduleQuerySchema, ScheduleCommandSchema, SchedulePreviewBodySchema } from "@dance/schemas";
import { BaseController } from "./BaseController";
import { UnauthorizedError } from "../errors";
import { entryTransaction } from "../services/entryWorkflow";
import { commandSchedule, previewSchedule, readSchedule } from "../services/schedule";
import { readLiveSchedule } from "../services/liveSchedule";

export class ScheduleController extends BaseController {
  private actor(req: Request) {
    if (!req.auth) throw new UnauthorizedError();
    return { id: req.auth.userId, sessionVersion: req.auth.sessionVersion };
  }
  async read(req: Request, res: Response) {
    const { eventId } = EventIdParamsSchema.parse(req.params);
    res.set("Cache-Control", "no-store").json(await entryTransaction(this.prisma, db => readSchedule(db, this.actor(req), eventId)));
  }
  async live(req: Request, res: Response) {
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const query = LiveScheduleQuerySchema.parse(req.query);
    res.set("Cache-Control", "no-store").json(await entryTransaction(this.prisma, db => readLiveSchedule(db, this.actor(req), eventId, query)));
  }
  async preview(req: Request, res: Response) {
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const body = SchedulePreviewBodySchema.parse(req.body);
    res.set("Cache-Control", "no-store").json(await entryTransaction(this.prisma, db => previewSchedule(db, this.actor(req), eventId, body.expectedRevision, body.queues)));
  }
  async command(req: Request, res: Response) {
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const body = ScheduleCommandSchema.parse(req.body);
    res.set("Cache-Control", "no-store").json(await entryTransaction(this.prisma, db => commandSchedule(db, this.actor(req), eventId, body)));
  }
}
