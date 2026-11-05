import bcrypt from "bcrypt";
import { Prisma, type PrismaClient } from "@prisma/client";
import { OnboardingDetailsSchema, type RegisterInput } from "@dance/schemas";
import { ConflictError, NotFoundError, UnauthorizedError } from "../errors";
import { appendAudit } from "./audit";
import { newIdentitySecret } from "./identityTokens";
import { sendVerificationEmail } from "../utils/email";

export async function registerStudioApplicant(prisma: PrismaClient, body: RegisterInput) {
  const password = await bcrypt.hash(body.password, 10);
  const secret = newIdentitySecret("VERIFY_EMAIL");
  try {
    return await prisma.$transaction(async tx => {
      const existing = await tx.user.findUnique({ where: { email: body.email }, include: { onboardingDraft: true } });
      if (existing) {
        const draft = existing.onboardingDraft;
        const details = draft && OnboardingDetailsSchema.safeParse(draft.details);
        if (!existing.active || !existing.password || !await bcrypt.compare(body.password, existing.password)
          || existing.name !== body.name || existing.preferredLocale !== (body.locale ?? null)
          || !draft || draft.status !== "DRAFT" || draft.revision !== 1 || draft.operationId !== body.onboarding.operationId
          || draft.intendedEventId !== body.onboarding.intendedEventId || !details || !details.success
          || JSON.stringify(details.data) !== JSON.stringify(body.onboarding.details)) throw new ConflictError("Email already registered", undefined, "emailRegistered");
        const locked = await tx.user.updateMany({ where: { id: existing.id, email: body.email, password: existing.password, sessionVersion: existing.sessionVersion, active: true }, data: { active: true } });
        if (locked.count !== 1) throw new UnauthorizedError();
        return { id: existing.id };
      }
      if (body.onboarding.intendedEventId && !await tx.event.findUnique({ where: { id: body.onboarding.intendedEventId }, select: { id: true } })) throw new NotFoundError("Event");
      const user = await tx.user.create({ data: {
        email: body.email, name: body.name, password, emailVerified: false, preferredLocale: body.locale ?? null,
        onboardingDraft: { create: { details: body.onboarding.details, intendedEventId: body.onboarding.intendedEventId, operationId: body.onboarding.operationId, revision: 1 } },
        accountTokens: { create: { email: body.email, purpose: "VERIFY_EMAIL", digest: secret.digest, expiresAt: secret.expiresAt } },
      }, select: { id: true, email: true, name: true } });
      await appendAudit(tx, { action: "ACCOUNT_REGISTERED", actor: { kind: "ANONYMOUS" }, targetType: "USER", targetId: user.id });
      await appendAudit(tx, { action: "ONBOARDING_SAVED", actor: { kind: "USER", userId: user.id }, targetType: "USER", targetId: user.id });
      await sendVerificationEmail({ to: user.email, token: secret.raw, name: user.name, locale: body.locale }, tx);
      return user;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictError("Email already registered", undefined, "emailRegistered");
    throw error;
  }
}
