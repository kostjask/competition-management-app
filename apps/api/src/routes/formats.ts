import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client";

export const formatsRouter = (_prisma: PrismaClient) => {
  const router = Router();

  return router;
};