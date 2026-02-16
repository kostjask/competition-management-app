/**
 * Base types and utilities for controllers
 */
import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../generated/prisma/client";

/**
 * Controller context containing dependencies and request metadata
 */
export interface ControllerContext {
  prisma: PrismaClient;
  req: Request;
  res: Response;
  next: NextFunction;
}

/**
 * Base controller class with common functionality
 */
export abstract class BaseController {
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get user ID from authenticated request
   */
  protected getUserId(req: Request): string {
    if (!req.auth) {
      throw new Error("User not authenticated");
    }
    return req.auth.userId;
  }

  /**
   * Check if user is admin
   */
  protected isAdmin(req: Request): boolean {
    return req.auth?.isAdmin ?? false;
  }

  /**
   * Get authenticated user's permissions for an event
   */
  protected getUserPermissions(req: Request, eventId?: string | null) {
    if (!req.auth) {
      throw new Error("User not authenticated");
    }

    const key = eventId ?? null;
    return req.auth.permissionsByEvent.get(key) ?? new Set<string>();
  }

  /**
   * Check if user has a specific permission
   */
  protected hasPermission(
    req: Request,
    permission: string,
    eventId?: string | null,
  ): boolean {
    const permissions = this.getUserPermissions(req, eventId);
    return permissions.has(permission);
  }
}
