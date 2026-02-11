import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client";

export const judgesRouter = (_prisma: PrismaClient) => {
  const router = Router();

  return router;
};