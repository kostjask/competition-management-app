import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { CorrectEmailInput, RequestPasswordResetInput, ResendVerificationInput } from "@dance/schemas";
import { AppError, ConflictError, NotFoundError } from "../errors";
import { emailDeliveryAvailable, queueEmail } from "./emailQueue";
import type { RecipientLocale } from "@dance/schemas";
import { sendVerificationEmail, sendPasswordRecoveryEmail } from "../utils/email";
import { identityTransaction, rotateAccountToken } from "./identityTokens";
import { appendAudit } from "./audit";

export interface RecoveryDelivery {
  available(): boolean;
  verification(data: { to: string; token: string }): Promise<void>;
  recovery(data: { to: string; token: string }): Promise<void>;
  enqueue?(tx: Prisma.TransactionClient, data: { to: string; token: string; locale: RecipientLocale }, kind: "verification" | "recovery"): Promise<void>;
}
export const defaultRecoveryDelivery: RecoveryDelivery = {
  available: emailDeliveryAvailable,
  verification: data => sendVerificationEmail(data),
  recovery: data => sendPasswordRecoveryEmail(data),
  enqueue: (tx, data, kind) => queueEmail(tx, { ...data, kind }),
};
type RecoveryRequest =
  | ({ kind: "verification" } & ResendVerificationInput)
  | ({ kind: "recovery" } & RequestPasswordResetInput)
  | ({ kind: "correction" } & CorrectEmailInput);

class DeliveryFailed extends Error {}
let missingPasswordHash: Promise<string> | undefined;
function fallbackHash() {
  return missingPasswordHash ??= bcrypt.hash(randomBytes(32).toString("hex"), 10);
}

export async function requestAuthRecovery(prisma: PrismaClient, delivery: RecoveryDelivery, request: RecoveryRequest): Promise<void> {
  if (!delivery.available()) throw new AppError("Recovery delivery is unavailable", 503, "SERVICE_UNAVAILABLE", undefined, "authDeliveryUnavailable");
  try {
    await identityTransaction(prisma, async tx => {
      const user = await tx.user.findUnique({ where: { email: request.email }, select: {
        id: true, active: true, emailVerified: true, email: true, password: true, preferredLocale: true,
      } });
      // Wrong/missing credentials use bcrypt work as well; never expose its result.
      if (request.kind === "correction") {
        const matches = await bcrypt.compare(request.password, user?.password ?? await fallbackHash());
        if (!user?.password || !matches) return;
      }
      if (!user?.active || user.emailVerified !== (request.kind === "recovery")) return;
      let target = user.email;
      if (request.kind === "correction") {
        const changed = await tx.user.updateMany({ where: { id: user.id, email: request.email,
          password: user.password, active: true, emailVerified: false },
          data: { email: request.newEmail, sessionVersion: { increment: 1 } } });
        if (changed.count !== 1) return;
        target = request.newEmail;
        await appendAudit(tx, { action: "EMAIL_CORRECTED", actor: { kind: "USER", userId: user.id }, targetType: "USER", targetId: user.id });
      }
      const purpose = request.kind === "recovery" ? "PASSWORD_RECOVERY" : "VERIFY_EMAIL";
      const raw = await rotateAccountToken(tx, user.id, purpose,
        request.kind === "correction" ? { kind: "USER", userId: user.id } : { kind: "ANONYMOUS" });
      try {
        if (delivery.enqueue) await delivery.enqueue(tx, { to: target, token: raw, locale: user.preferredLocale ?? "et" }, request.kind === "recovery" ? "recovery" : "verification");
        else {
          const send = request.kind === "recovery" ? delivery.recovery.bind(delivery) : delivery.verification.bind(delivery);
          await send({ to: target, token: raw });
        }
      } catch {
        throw new DeliveryFailed(); // Roll back email, revision and token rotation.
      }
    });
  } catch (error) {
    if (error instanceof DeliveryFailed) {
      console.error("Auth recovery delivery unconfirmed");
      return;
    }
    // Expected eligibility/collision/concurrent outcomes share one neutral acknowledgement.
    if (error instanceof ConflictError || error instanceof NotFoundError) return;
    throw error;
  }
}
