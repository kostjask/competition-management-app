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
import { performancesRouter } from "./performances";
import type { RecoveryDelivery } from "../services/authRecovery";

export function apiRouter(prisma: PrismaClient, recoveryDelivery?: RecoveryDelivery) {
  const router = Router();
  const authenticate = createAuthMiddleware(prisma);

  // These routers attach authentication to their protected operations explicitly.
  router.use("/auth", authRouter(prisma, authenticate, recoveryDelivery));
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
    performancesRouter(prisma),
  );
  router.use("/studios", authenticate, studiosRouter(prisma), dancersRouter(prisma));
  router.use("/images", authenticate, imagesRouter(prisma));

  // users.ts is empty; user management remains deferred.
  return router;
}
