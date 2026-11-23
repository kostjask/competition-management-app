import type { Request, Response } from "express";
import { EventIdParamsSchema, ResultsCommandSchema, ResultsQuerySchema, ResultsReceiptSchema } from "@dance/schemas";
import { ForbiddenError, UnauthorizedError } from "../errors";
import { entryTransaction } from "../services/entryWorkflow";
import { commandResults, readResults } from "../services/results";
import { BaseController } from "./BaseController";

export class ResultsController extends BaseController {
  private actor(req: Request) {
    if (!req.auth) throw new UnauthorizedError();
    if (!this.isAdmin(req)) throw new ForbiddenError();
    return { id: req.auth.userId, sessionVersion: req.auth.sessionVersion };
  }

  async read(req: Request, res: Response) {
    const actor = this.actor(req);
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const query = ResultsQuerySchema.parse(req.query);
    res.json(await entryTransaction(this.prisma, db => readResults(db, actor, eventId, query)));
  }

  async command(req: Request, res: Response) {
    const actor = this.actor(req);
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const body = ResultsCommandSchema.parse(req.body);
    res.json(ResultsReceiptSchema.parse(await entryTransaction(this.prisma, db => commandResults(db, actor, eventId, body))));
  }
}
