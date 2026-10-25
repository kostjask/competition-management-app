import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { EmailSchema } from "@dance/schemas";
import { config, isProduction } from "../config/env";
import { EmailContentSchema, renderEmail, type EmailContent } from "./emailTemplates";
import { OutgoingEmailSchema, ResendProvider, type EmailProvider } from "./emailProvider";
import { tokenDigest } from "./identityTokens";

const EmailEnvelopeSchema = z.strictObject({
  from: EmailSchema,
  message: OutgoingEmailSchema,
});
type EmailEnvelope = z.infer<typeof EmailEnvelopeSchema>;

export function encryptEmail(content: EmailEnvelope, id: string, key: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), nonce);
  cipher.setAAD(Buffer.from(id));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(EmailEnvelopeSchema.parse(content)), "utf8"), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString("base64");
}
export function decryptEmail(value: string, id: string, key: string): EmailEnvelope {
  const bytes = Buffer.from(value, "base64");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(id)); decipher.setAuthTag(bytes.subarray(12, 28));
  return EmailEnvelopeSchema.parse(JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8")));
}

export function emailDeliveryAvailable(): boolean {
  return config.email.provider === "resend" || !isProduction();
}

/** Domain mutation and encrypted dispatch intent commit together. Fake stays silent. */
export async function queueEmail(tx: Prisma.TransactionClient, content: EmailContent): Promise<void> {
  if (!emailDeliveryAvailable()) throw new Error("Email delivery is unavailable");
  if (config.email.provider === "fake") return;
  const key = config.email.queueKey;
  if (!key) throw new Error("Email delivery is unavailable");
  const data = EmailContentSchema.parse(content);
  const purpose = data.kind === "verification" ? "VERIFY_EMAIL" : data.kind === "recovery" ? "PASSWORD_RECOVERY" : data.kind === "invitation" ? "INVITATION" : null;
  if (purpose && !data.token) throw new Error("Email link is required");
  // Validate/render before committing an intent, never discover a bad template later.
  const envelope = { from: config.email.from, message: renderEmail(data, config.email.webOrigin) };
  const id = randomUUID();
  await tx.emailDelivery.create({ data: { id, ciphertext: encryptEmail(envelope, id, key), purpose,
    bindingDigest: purpose && data.token ? tokenDigest(purpose, data.token) : null,
    expiresAt: new Date(Date.now() + 23 * 3600000) } });
}

async function validBinding(tx: Prisma.TransactionClient, row: { bindingDigest: string | null; purpose: string | null }, content: { to: string }): Promise<boolean> {
  if (row.purpose === null) return true;
  if (!row.bindingDigest) return false;
  const now = new Date();
  if (row.purpose === "INVITATION") {
    const invitation = await tx.invitation.findUnique({ where: { tokenDigest: row.bindingDigest } });
    return !!invitation && invitation.email === content.to && !!invitation.roleId &&
      !invitation.usedAt && !invitation.revokedAt && !invitation.supersededAt && invitation.expiresAt > now;
  }
  if (row.purpose !== "VERIFY_EMAIL" && row.purpose !== "PASSWORD_RECOVERY") return false;
  const token = await tx.accountToken.findUnique({ where: { digest: row.bindingDigest }, include: { user: true } });
  return !!token && token.purpose === row.purpose && token.email === content.to && token.user.email === token.email &&
    token.user.active && token.user.emailVerified === (row.purpose === "PASSWORD_RECOVERY") &&
    !token.consumedAt && !token.revokedAt && token.expiresAt > now;
}

/** At most one worker dispatches at a time. No recipient or provider errors escape. */
export async function dispatchEmailBatch(prisma: PrismaClient, provider?: EmailProvider): Promise<number> {
  const key = config.email.queueKey;
  if (config.email.provider !== "resend" || !key || !config.email.resend.apiKey) return 0;
  const sender = provider ?? new ResendProvider(config.email.resend.apiKey, config.email.from);
  let processed = 0;
  for (let index = 0; index < 20; index++) {
    const result = await prisma.$transaction(async tx => {
      const locks = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(712482901) AS locked`;
      if (!locks[0]?.locked) return false;
      const row = await tx.emailDelivery.findFirst({ where: { state: "PENDING", nextAttemptAt: { lte: new Date() } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      if (!row) return false;
      if (row.expiresAt <= new Date()) {
        await tx.emailDelivery.update({ where: { id: row.id }, data: { state: "CANCELLED", ciphertext: null } });
        return true;
      }
      try {
        if (!row.ciphertext) throw new Error();
        const content = decryptEmail(row.ciphertext, row.id, key);
        if (!await validBinding(tx, row, content.message)) {
          await tx.emailDelivery.update({ where: { id: row.id }, data: { state: "CANCELLED", ciphertext: null } });
          return true;
        }
        // Frozen body and sender keep retries identical across template/config deploys.
        const providerId = await sender.send(content.message, row.id, content.from);
        await tx.emailDelivery.update({ where: { id: row.id }, data: { state: "ACCEPTED", acceptedAt: new Date(),
          providerId, ciphertext: null, attempts: { increment: 1 } } });
      } catch {
        await tx.emailDelivery.update({ where: { id: row.id }, data: { attempts: { increment: 1 },
          nextAttemptAt: new Date(Date.now() + Math.min(900000, 30000 * 2 ** Math.min(row.attempts, 5))) } });
        console.error("Email provider acceptance unconfirmed; retry scheduled");
      }
      return true;
    }, { timeout: 20000 });
    if (!result) break;
    processed++;
  }
  return processed;
}

export function startEmailWorker(prisma: PrismaClient): () => void {
  if (config.email.provider !== "resend") return () => {};
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await dispatchEmailBatch(prisma); }
    catch { console.error("Email worker unavailable"); }
    finally { running = false; }
  };
  const timer = setInterval(() => { void tick(); }, 5000);
  timer.unref(); void tick();
  return () => clearInterval(timer);
}
