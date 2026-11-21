import type { Request, Response } from "express";
import { EventIdParamsSchema, JudgeScoringQuerySchema, ScoringCommandSchema, ScoringPreviewBodySchema } from "@dance/schemas";
import { BaseController } from "./BaseController";
import { UnauthorizedError, ForbiddenError } from "../errors";
import { entryTransaction } from "../services/entryWorkflow";
import { readJudgeScoring, readScoring, previewScoring, commandScoring } from "../services/scoring";
export class ScoringController extends BaseController {
  private actor(req: Request) { if (!req.auth) throw new UnauthorizedError(); return { id: req.auth.userId, sessionVersion: req.auth.sessionVersion }; }
  async read(req: Request, res: Response) { const { eventId } = EventIdParamsSchema.parse(req.params); res.set("Cache-Control", "no-store").json(await entryTransaction(this.prisma, db => readScoring(db, this.actor(req), eventId))); }
  async judge(req: Request, res: Response) {
    const { eventId } = EventIdParamsSchema.parse(req.params);
    const { operationId } = JudgeScoringQuerySchema.parse(req.query);
    res.set("Cache-Control", "no-store").json(await entryTransaction(this.prisma, db => readJudgeScoring(db, this.actor(req), eventId, operationId)));
  }
  async preview(req: Request, res: Response) { if (!this.isAdmin(req)) throw new ForbiddenError(); const { eventId } = EventIdParamsSchema.parse(req.params); const body = ScoringPreviewBodySchema.parse(req.body); res.set("Cache-Control", "no-store").json(await entryTransaction(this.prisma, db => previewScoring(db, this.actor(req), eventId, body.expectedRevision, body.setup))); }
  async command(req: Request, res: Response) { const { eventId } = EventIdParamsSchema.parse(req.params); const body = ScoringCommandSchema.parse(req.body); res.set("Cache-Control", "no-store").json(await entryTransaction(this.prisma, db => commandScoring(db, this.actor(req), eventId, body))); }
}
