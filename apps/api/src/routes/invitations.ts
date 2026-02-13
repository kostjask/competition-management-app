import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client";
import { requirePermission } from "../auth/requirePermission";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  CreateInvitationSchema,
  AcceptInvitationSchema,
} from "@dance/schemas";
import { ZodError } from "zod";
import type { Response } from "express";
import { sendInvitationEmail } from "../utils/email";

export const invitationsRouter = (prisma: PrismaClient) => {
  const router = Router();

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  const sendError = (
    res: Response,
    statusCode: number,
    error: string,
    details?: object,
  ) =>
    res
      .status(statusCode)
      .json({ error, statusCode, ...(details ? { details } : {}) });

  // Admin creates invitation
  router.post(
    "/invitations",
    requirePermission("event.manage"),
    async (req, res, next) => {
      try {
        const auth = req.auth!;
        if (!auth.isAdmin) return res.sendStatus(403);

        const body = CreateInvitationSchema.parse(req.body);

        // Check if invitation already exists
        // Note: Using 'as any' because Prisma's generated compound unique types don't support null
        // even though the schema allows nullable eventId. This is a known Prisma limitation.
        const existing = await prisma.invitation.findUnique({
          where: {
            email_roleKey_eventId: {
              email: body.email,
              roleKey: body.roleKey,
              eventId: body.eventId ?? null,
            } as any,
          },
        });

        if (existing && !existing.usedAt && existing.expiresAt > new Date()) {
          return sendError(
            res,
            409,
            "Active invitation already exists for this email and role",
          );
        }

        // Check if user already exists with this role
        if (body.roleKey !== "representative") {
          const role = await prisma.role.findUnique({
            where: { key: body.roleKey },
          });

          if (role) {
            const existingUserRole = await prisma.userRole.findFirst({
              where: {
                user: { email: body.email },
                roleId: role.id,
                eventId: body.eventId ?? null,
              },
            });

            if (existingUserRole) {
              return sendError(
                res,
                400,
                "User already has this role for this event",
              );
            }
          }
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const invitation = await prisma.invitation.create({
          data: {
            email: body.email,
            roleKey: body.roleKey,
            eventId: body.eventId ?? null,
            token,
            createdBy: auth.userId,
            expiresAt,
          },
        });

        // Send invitation email
        const event = body.eventId
          ? await prisma.event.findUnique({
              where: { id: body.eventId },
              select: { name: true },
            })
          : null;

        await sendInvitationEmail({
          to: body.email,
          token,
          roleKey: body.roleKey,
          eventName: event?.name,
        });

        res.status(201).json({
          message: "Invitation sent",
          invitationId: invitation.id,
          token: invitation.token, // For testing purposes, remove in production
        });
      } catch (err) {
        if (err instanceof ZodError) {
          return sendError(res, 400, "Validation error", {
            issues: err.issues,
          });
        }
        return next(err);
      }
    },
  );

  // Accept invitation and complete registration
  router.post("/invitations/accept", async (req, res, next) => {
    try {
      const body = AcceptInvitationSchema.parse(req.body);

      const invitation = await prisma.invitation.findUnique({
        where: { token: body.token },
        include: { event: true },
      });

      if (!invitation) {
        return sendError(res, 404, "Invalid invitation token");
      }

      if (invitation.usedAt) {
        return sendError(res, 400, "Invitation already used");
      }

      if (invitation.expiresAt < new Date()) {
        return sendError(res, 400, "Invitation expired");
      }

      const hashedPassword = await bcrypt.hash(body.password, 10);

      const user = await prisma.$transaction(async (tx) => {
        // Find or create user
        let user = await tx.user.findUnique({
          where: { email: invitation.email },
        });

        if (user) {
          // User exists - update password if they don't have one
          if (!user.password) {
            user = await tx.user.update({
              where: { id: user.id },
              data: {
                password: hashedPassword,
                emailVerified: true,
                active: true,
              },
            });
          }
        } else {
          // Create new user
          user = await tx.user.create({
            data: {
              email: invitation.email,
              name: body.name,
              password: hashedPassword,
              emailVerified: true, // Pre-verified via invitation
              active: true,
            },
          });
        }

        // Assign role
        const role = await tx.role.findUnique({
          where: { key: invitation.roleKey },
        });

        if (!role) {
          throw new Error(`Role '${invitation.roleKey}' not found in database`);
        }

        // Create or ignore if already exists
        // Note: Using 'as any' for where clause because Prisma's compound unique types don't support null
        await tx.userRole.upsert({
          where: {
            userId_roleId_eventId: {
              userId: user.id,
              roleId: role.id,
              eventId: invitation.eventId ?? null,
            } as any,
          },
          create: {
            userId: user.id,
            roleId: role.id,
            eventId: invitation.eventId ?? null,
          },
          update: {}, // Do nothing if already exists
        });

        // Mark invitation as used
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { usedAt: new Date() },
        });

        return user;
      });

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.status(201).json({
        message: "Account created successfully",
        token,
        tokenType: "Bearer",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (err) {
      if (err instanceof ZodError) {
        return sendError(res, 400, "Validation error", { issues: err.issues });
      }
      return next(err);
    }
  });

  // List invitations (admin only)
  router.get(
    "/invitations",
    requirePermission("event.manage"),
    async (req, res) => {
      const auth = req.auth!;
      if (!auth.isAdmin) return res.sendStatus(403);

      const invitations = await prisma.invitation.findMany({
        include: {
          event: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(invitations);
    },
  );

  // Check invitation validity (public endpoint)
  router.get("/invitations/:token", async (req, res) => {
    const { token } = req.params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        event: { select: { id: true, name: true } },
      },
    });

    if (!invitation) {
      return sendError(res, 404, "Invitation not found");
    }

    if (invitation.usedAt) {
      return sendError(res, 400, "Invitation already used");
    }

    if (invitation.expiresAt < new Date()) {
      return sendError(res, 400, "Invitation expired");
    }

    // Return invitation details without sensitive data
    res.json({
      email: invitation.email,
      roleKey: invitation.roleKey,
      event: invitation.event,
      expiresAt: invitation.expiresAt,
    });
  });

  return router;
};