import type { Prisma } from "@prisma/client";
import type { RecipientLocale } from "@dance/schemas";
import { queueEmail, emailDeliveryAvailable } from "../services/emailQueue";
import { config } from "../config/env";
import { AppError } from "../errors";

interface VerificationEmailParams {
  to: string;
  token: string;
  name?: string;
  locale?: RecipientLocale | undefined;
}
interface InvitationEmailParams {
  to: string;
  token: string;
  roleKey: string;
  eventName?: string | undefined;
  locale?: RecipientLocale | undefined;
}

function requireDeliveryAvailable(): void {
  if (!emailDeliveryAvailable()) {
    // Never include recipient, raw secret or URL in errors or logs.
    throw new AppError("Email delivery is unavailable", 503, "SERVICE_UNAVAILABLE", undefined, "authDeliveryUnavailable");
  }
}

export async function sendVerificationEmail(params: VerificationEmailParams, tx?: Prisma.TransactionClient): Promise<void> {
  requireDeliveryAvailable();
  if (tx) await queueEmail(tx, { to: params.to, token: params.token, locale: params.locale ?? "et", kind: "verification" });
  else if (config.email.provider !== "fake") throw new Error("Email requires a domain transaction");
}

export async function sendInvitationEmail(params: InvitationEmailParams, tx?: Prisma.TransactionClient): Promise<void> {
  requireDeliveryAvailable();
  if (tx) await queueEmail(tx, { to: params.to, token: params.token, locale: params.locale ?? "et", kind: "invitation" });
  else if (config.email.provider !== "fake") throw new Error("Email requires a domain transaction");
}

export async function sendPasswordRecoveryEmail(params: VerificationEmailParams, tx?: Prisma.TransactionClient): Promise<void> {
  requireDeliveryAvailable();
  if (tx) await queueEmail(tx, { to: params.to, token: params.token, locale: params.locale ?? "et", kind: "recovery" });
  else if (config.email.provider !== "fake") throw new Error("Email requires a domain transaction");
}
