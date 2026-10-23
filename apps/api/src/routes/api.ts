import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { createAuthMiddleware } from "../middleware/auth";
import { authRouter } from "./auth";
import { invitationsRouter } from "./invitations";
import { eventsRouter } from "./events";
import { studioRegistrationsRouter } from "./studio-registrations";
import { judgesRouter } from "./judges";
import { categoriesRouter } from "./categories";
import { formatsRouter } from "./formats";
import { ageGroupsRouter } from "./age-groups";
import { studiosRouter } from "./studios";
import { dancersRouter } from "./dancers";
import { imagesRouter } from "./images";

export function apiRouter(prisma: PrismaClient) {
  const router = Router();
  const authenticate = createAuthMiddleware(prisma);

  // These routers attach authentication to their protected operations explicitly.
  router.use("/auth", authRouter(prisma, authenticate));
  router.use("/invitations", invitationsRouter(prisma, authenticate));

  // Every operation in these resource routers requires authentication.
  router.use(
    "/events",
    authenticate,
    eventsRouter(prisma),
    studioRegistrationsRouter(prisma),
    judgesRouter(prisma),
    categoriesRouter(prisma),
    formatsRouter(prisma),
    ageGroupsRouter(prisma),
  );
  router.use("/studios", authenticate, studiosRouter(prisma), dancersRouter(prisma));
  router.use("/images", authenticate, imagesRouter(prisma));

  // Performances await canonical-path/controller repairs; users.ts is empty.
  // Do not expose the duplicate performance handlers or pretend users exist.
  return router;
}
