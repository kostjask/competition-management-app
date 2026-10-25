import { Prisma, type PrismaClient } from "@prisma/client";
import { OnboardingSaveSchema, type OnboardingSave } from "@dance/schemas";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";

// Internal foundation. Caller must establish ownership; never accept a body user ID.
// Public pending-account proof and routes are P2-SIGNUP, not a verification bypass.
export async function saveOnboardingDraft(prisma: PrismaClient, ownerId: string, input: OnboardingSave) {
  const body = OnboardingSaveSchema.parse(input);
  return prisma.$transaction(async tx => {
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
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function readOnboardingDraft(prisma: PrismaClient, ownerId: string) {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { active: true } });
  if (!owner?.active) throw new ForbiddenError();
  return prisma.onboardingDraft.findUnique({ where: { userId: ownerId } });
}

export async function cancelOnboardingDraft(prisma: PrismaClient, ownerId: string, revision: number) {
  return prisma.$transaction(async tx => {
    const owner = await tx.user.findUnique({ where: { id: ownerId }, select: { active: true } });
    if (!owner?.active) throw new ForbiddenError();
    const existing = await tx.onboardingDraft.findUnique({ where: { userId: ownerId } });
    if (!existing) throw new NotFoundError("Draft");
    if (existing.status === "CANCELLED" && existing.revision === revision + 1) return existing;
    if (existing.status !== "DRAFT" || existing.revision !== revision) throw new ConflictError("Draft changed");
    return tx.onboardingDraft.update({ where: { id: existing.id, revision, status: "DRAFT" },
      data: { status: "CANCELLED", revision: { increment: 1 } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function onboardingReturnPath(intendedEventId: string | null): string {
  return intendedEventId ? `/events/${encodeURIComponent(intendedEventId)}` : "/";
}
