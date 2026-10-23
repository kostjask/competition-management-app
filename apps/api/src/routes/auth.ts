import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../errors/handler";
import { AuthController } from "../controllers";

export const authRouter = (prisma: PrismaClient) => {
  const router = Router();
  const authController = new AuthController(prisma);

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
    asyncHandler((req, res) => authController.getProfile(req, res))
  );

  return router;
};
