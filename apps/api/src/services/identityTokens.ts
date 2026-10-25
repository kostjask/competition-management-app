import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { AccountTokenPurpose, Prisma, type PrismaClient } from "@prisma/client";
import { EmailSchema, RegisterSchema } from "@dance/schemas";
import { ConflictError, NotFoundError, ForbiddenError } from "../errors";

type Purpose = AccountTokenPurpose | "INVITATION";
const lifetime = { VERIFY_EMAIL: 24 * 3600000, PASSWORD_RECOVERY: 3600000, INVITATION: 7 * 86400000 };

export function tokenDigest(purpose: Purpose, raw: string): string {
  return createHash("sha256").update(`dance:identity:v1:${purpose}:`).update(raw).digest("hex");
}

export function newIdentitySecret(purpose: Purpose) {
  const raw = randomBytes(32).toString("hex");
  return { raw, digest: tokenDigest(purpose, raw), expiresAt: new Date(Date.now() + lifetime[purpose]) };
}

export async function identityTransaction<T>(prisma: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  try {
    return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      throw new ConflictError("Identity changed concurrently", undefined, "concurrentChange");
    }
    throw error;
  }
}

// Internal only: callers must deliver raw directly, never serialize it in a response.
// Locking the account serializes rotation, consumption and account deactivation.
export async function rotateAccountToken(tx: Prisma.TransactionClient, userId: string, purpose: AccountTokenPurpose) {
  const locked = await tx.user.updateMany({ where: { id: userId, active: true,
    emailVerified: purpose === "PASSWORD_RECOVERY" }, data: { active: true } });
  if (locked.count !== 1) throw new NotFoundError("Account");
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  await tx.accountToken.updateMany({ where: { userId, purpose, consumedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  const secret = newIdentitySecret(purpose);
  await tx.accountToken.create({ data: { userId, email: user.email, purpose, digest: secret.digest, expiresAt: secret.expiresAt } });
  return secret.raw;
}

async function claimAccountToken(tx: Prisma.TransactionClient, raw: string, purpose: AccountTokenPurpose) {
  const digest = tokenDigest(purpose, raw);
  const token = await tx.accountToken.findUnique({ where: { digest } });
  if (!token || token.purpose !== purpose) throw new NotFoundError("Account token");
  const now = new Date();
  if (token.consumedAt || token.revokedAt || token.expiresAt <= now) throw new NotFoundError("Account token");
  const locked = await tx.user.updateMany({ where: { id: token.userId, email: token.email, active: true,
    emailVerified: purpose === "PASSWORD_RECOVERY" }, data: { active: true } });
  if (locked.count !== 1) throw new ForbiddenError("Account is not eligible");
  const claimed = await tx.accountToken.updateMany({ where: { id: token.id, digest, purpose,
    consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
  if (claimed.count !== 1) throw new NotFoundError("Account token");
  return token.userId;
}

export async function verifyAccountEmail(prisma: PrismaClient, raw: string) {
  return identityTransaction(prisma, async tx => {
    const userId = await claimAccountToken(tx, raw, "VERIFY_EMAIL");
    return tx.user.update({ where: { id: userId }, data: { emailVerified: true }, select: { id: true, email: true, name: true } });
  });
}

// No public endpoint yet. An eventual handler must use a generic response whether
// this returns null or a delivery secret, and add rate limits under P2-AUTH.
export async function issueRecoveryToken(prisma: PrismaClient, email: string) {
  const canonical = EmailSchema.parse(email);
  return identityTransaction(prisma, async tx => {
    const user = await tx.user.findUnique({ where: { email: canonical }, select: { id: true, active: true, emailVerified: true } });
    if (!user?.active || !user.emailVerified) return null;
    return rotateAccountToken(tx, user.id, "PASSWORD_RECOVERY");
  });
}

export async function recoverAccountPassword(prisma: PrismaClient, raw: string, newPassword: string): Promise<void> {
  const password = await bcrypt.hash(RegisterSchema.shape.password.parse(newPassword), 10);
  await identityTransaction(prisma, async tx => {
    const userId = await claimAccountToken(tx, raw, "PASSWORD_RECOVERY");
    await tx.user.update({ where: { id: userId }, data: { password } });
    await tx.accountToken.updateMany({ where: { userId, consumedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  });
}

// Internal helpers: authorization of the supplied invitation ID is the caller's responsibility.
export async function rotateInvitationToken(prisma: PrismaClient, id: string) {
  return identityTransaction(prisma, async tx => {
    const secret = newIdentitySecret("INVITATION");
    const changed = await tx.invitation.updateMany({ where: { id, usedAt: null, supersededAt: null, revokedAt: null,
      expiresAt: { gt: new Date() } }, data: { tokenDigest: secret.digest, expiresAt: secret.expiresAt } });
    if (changed.count !== 1) throw new NotFoundError("Invitation");
    return secret.raw;
  });
}

export async function revokeInvitationToken(prisma: PrismaClient, id: string): Promise<void> {
  await identityTransaction(prisma, async tx => {
    const now = new Date();
    const changed = await tx.invitation.updateMany({ where: { id, usedAt: null, supersededAt: null, revokedAt: null },
      data: { revokedAt: now, supersededAt: now } });
    if (changed.count !== 1) throw new NotFoundError("Invitation");
  });
}
