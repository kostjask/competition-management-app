import { Router, type RequestHandler } from "express";
import type { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../errors/handler";
import { AuthController } from "../controllers";
import type { RecoveryDelivery } from "../services/authRecovery";
import { onboardingAuth } from "../middleware/onboardingAuth";

export const authRouter = (prisma: PrismaClient, authenticate: RequestHandler, recoveryDelivery?: RecoveryDelivery) => {
  const router = Router();
  const authController = new AuthController(prisma, recoveryDelivery);
  const draftOwner = onboardingAuth(authenticate);
  router.post("/onboarding/read", draftOwner, asyncHandler((req, res) => authController.readOnboarding(req, res)));
  router.post("/onboarding/save", draftOwner, asyncHandler((req, res) => authController.saveOnboarding(req, res)));
  router.post("/onboarding/cancel", draftOwner, asyncHandler((req, res) => authController.cancelOnboarding(req, res)));
  router.post("/logout", authenticate, asyncHandler((req, res) => authController.logout(req, res)));
  router.post("/resend-verification", asyncHandler((req, res) => authController.resendVerification(req, res)));
  router.post("/correct-email", asyncHandler((req, res) => authController.correctEmail(req, res)));
  router.post("/request-password-reset", asyncHandler((req, res) => authController.requestPasswordReset(req, res)));
  router.post("/reset-password", asyncHandler((req, res) => authController.resetPassword(req, res)));

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

  router.post("/preferences", authenticate, asyncHandler((req, res) => authController.saveLocale(req, res)));

  // Get current user profile (requires auth)
  router.get(
    "/profile",
    authenticate,
    asyncHandler((req, res) => authController.getProfile(req, res))
  );

  return router;
};
