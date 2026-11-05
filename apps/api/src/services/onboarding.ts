import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import type { z } from "zod";
import { OnboardingProofSchema } from "@dance/schemas";
import type { AuthContext } from "../middleware/auth";
import { appendAudit } from "./audit";
import { Prisma, type PrismaClient } from "@prisma/client";
import { OnboardingSaveSchema, OnboardingDetailsSchema, safeReturnPath, type OnboardingSave } from "@dance/schemas";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../errors";

// Internal foundation. Caller must establish ownership; never accept a body user ID.
// Public pending-account proof and routes are P2-SIGNUP, not a verification bypass.
async function saveDraft(tx: Prisma.TransactionClient, ownerId: string, input: OnboardingSave) {
  const body = OnboardingSaveSchema.parse(input);
  const owner = await tx.user.findUnique({ where: { id: ownerId }, select: { active: true } });
  if (!owner?.active) throw new ForbiddenError();
  if (body.intendedEventId && !await tx.event.findUnique({ where: { id: body.intendedEventId }, select: { id: true } })) throw new NotFoundError("Event");
  const existing = await tx.onboardingDraft.findUnique({ where: { userId: ownerId } });
  if (existing?.operationId === body.operationId) {
    const details = OnboardingSaveSchema.shape.details.parse(existing.details);
    if (existing.intendedEventId !== body.intendedEventId ||
        JSON.stringify(details) !== JSON.stringify(body.details) || existing.revision !== body.revision + 1) {
      throw new ConflictError("Operation already used");
    }
    return existing;
  }
  if (existing && (existing.status !== "DRAFT" || existing.revision !== body.revision)) throw new ConflictError("Draft changed");
  if (!existing && body.revision !== 0) throw new ConflictError("Draft changed");
  const data = { details: body.details, intendedEventId: body.intendedEventId, operationId: body.operationId, revision: body.revision + 1 };
  return existing
    ? tx.onboardingDraft.update({ where: { id: existing.id, revision: body.revision, status: "DRAFT" }, data })
    : tx.onboardingDraft.create({ data: { ...data, userId: ownerId } });
}

export async function saveOnboardingDraft(prisma: PrismaClient, ownerId: string, input: OnboardingSave) {
  return prisma.$transaction(tx => saveDraft(tx, ownerId, input), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function readOnboardingDraft(prisma: PrismaClient, ownerId: string) {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { active: true } });
  if (!owner?.active) throw new ForbiddenError();
  return prisma.onboardingDraft.findUnique({ where: { userId: ownerId } });
}

async function cancelDraft(tx: Prisma.TransactionClient, ownerId: string, revision: number) {
  const owner = await tx.user.findUnique({ where: { id: ownerId }, select: { active: true } });
  if (!owner?.active) throw new ForbiddenError();
  const existing = await tx.onboardingDraft.findUnique({ where: { userId: ownerId } });
  if (!existing) throw new NotFoundError("Draft");
  if (existing.status === "CANCELLED" && existing.revision === revision + 1) return existing;
  if (existing.status !== "DRAFT" || existing.revision !== revision) throw new ConflictError("Draft changed");
  return tx.onboardingDraft.update({ where: { id: existing.id, revision, status: "DRAFT" },
    data: { status: "CANCELLED", revision: { increment: 1 } } });
}

export async function cancelOnboardingDraft(prisma: PrismaClient, ownerId: string, revision: number) {
  return prisma.$transaction(tx => cancelDraft(tx, ownerId, revision), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function onboardingReturnPath(intendedEventId: string | null): string {
  return intendedEventId ? `/events/${encodeURIComponent(intendedEventId)}` : "/";
}

export type OnboardingOwnerProof = z.infer<typeof OnboardingProofSchema> | Pick<AuthContext, "userId" | "sessionVersion">;
let missingHash: Promise<string> | undefined;

export async function provenOnboarding(prisma: PrismaClient, proof: OnboardingOwnerProof, operation: { kind: "read" } | { kind: "save"; draft: OnboardingSave } | { kind: "cancel"; revision: number }) {
  return prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: "email" in proof ? { email: proof.email } : { id: proof.userId } });
    if ("email" in proof) {
      const valid = await bcrypt.compare(proof.password, user?.password ?? await (missingHash ??= bcrypt.hash(randomBytes(32).toString("hex"), 10)));
      if (!user?.password || !valid) throw new UnauthorizedError("Invalid credentials", "invalidCredentials");
    } else if (!user?.emailVerified || user.sessionVersion !== proof.sessionVersion) throw new UnauthorizedError();
    if (!user?.active) throw new UnauthorizedError();
    const locked = await tx.user.updateMany({ where: { id: user.id, active: true, email: user.email, password: user.password, sessionVersion: user.sessionVersion }, data: { active: true } });
    if (locked.count !== 1) throw new UnauthorizedError();
    const before = await tx.onboardingDraft.findUnique({ where: { userId: user.id } });
    const draft = operation.kind === "save" ? await saveDraft(tx, user.id, operation.draft)
      : operation.kind === "cancel" ? await cancelDraft(tx, user.id, operation.revision) : before;
    if (operation.kind !== "read" && draft && (!before || draft.revision !== before.revision)) await appendAudit(tx, {
      action: operation.kind === "save" ? "ONBOARDING_SAVED" : "ONBOARDING_CANCELLED", actor: { kind: "USER", userId: user.id }, targetType: "USER", targetId: user.id,
    });
    return { email: user.email, emailVerified: user.emailVerified, returnTo: safeReturnPath(onboardingReturnPath(draft?.intendedEventId ?? null)), draft: draft ? {
      id: draft.id, status: draft.status, revision: draft.revision, intendedEventId: draft.intendedEventId,
      details: OnboardingDetailsSchema.parse(draft.details), updatedAt: draft.updatedAt.toISOString(),
    } : null };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
