import { Router, type RequestHandler } from "express";
import type { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../errors/handler";
import { AuthController } from "../controllers";
import type { RecoveryDelivery } from "../services/authRecovery";
import { authRecoveryLimit } from "../middleware/authRecoveryLimit";

export const authRouter = (prisma: PrismaClient, authenticate: RequestHandler, recoveryDelivery?: RecoveryDelivery) => {
  const router = Router();
  const authController = new AuthController(prisma, recoveryDelivery);
  const limitRecovery = authRecoveryLimit();
  router.post("/resend-verification", limitRecovery, asyncHandler((req, res) => authController.resendVerification(req, res)));
  router.post("/correct-email", limitRecovery, asyncHandler((req, res) => authController.correctEmail(req, res)));
  router.post("/request-password-reset", limitRecovery, asyncHandler((req, res) => authController.requestPasswordReset(req, res)));
  router.post("/reset-password", limitRecovery, asyncHandler((req, res) => authController.resetPassword(req, res)));

  // Register new user (public)
  router.post(
    "/register",
    asyncHandler((req, res) => authController.register(req, res))
  );

  // Verify email (public)
  router.post(
    "/verify-email",
    asyncHandler((req, res) => authController.verifyEmail(req, res))
  );

  // Login (public)
  router.post(
    "/login",
    asyncHandler((req, res) => authController.login(req, res))
  );

  // Get current user profile (requires auth)
  router.get(
    "/profile",
    authenticate,
    asyncHandler((req, res) => authController.getProfile(req, res))
  );

  return router;
};
