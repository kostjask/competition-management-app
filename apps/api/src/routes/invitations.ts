import { Router, type RequestHandler } from "express";
import type { PrismaClient } from "@prisma/client";
import { InvitationsController } from "../controllers/InvitationsController";
import { asyncHandler } from "../errors/handler";
import { cookieToken } from "../services/browserSession";
export function invitationsRouter(prisma: PrismaClient, authenticate: RequestHandler) {
  const router = Router();
  const controller = new InvitationsController(prisma);
  router.get("/", authenticate, asyncHandler((req, res) => controller.list(req, res)));
  router.post("/", authenticate, asyncHandler((req, res) => controller.create(req, res)));
  router.post("/:invitationId/resend", authenticate, asyncHandler((req, res) => controller.resend(req, res)));
  router.post("/:invitationId/revoke", authenticate, asyncHandler((req, res) => controller.revoke(req, res)));
  router.get("/:token", asyncHandler((req, res) => controller.inspect(req, res)));
  router.post("/accept", (req, res, next) => {
    // New recipients may set up an account without a session. Supplied sessions
    // must pass the same eligibility/revision checks as protected routes.
    if (req.headers.authorization !== undefined || cookieToken(req) !== undefined) return authenticate(req, res, next);
    next();
  }, asyncHandler((req, res) => controller.accept(req, res)));
  return router;
}
