import type { Prisma } from "@prisma/client";
import { queueEmail } from "./emailQueue";
import { recipientLocale } from "./staffPolicy";

/** Only verified active account owners receive decisions; profile contact fields are not identity. */
export async function notifyReview(
  tx: Prisma.TransactionClient,
  registrationId: string,
  kind: "ORGANIZATION" | "EVENT",
  status: "PENDING" | "APPROVED" | "REJECTED",
  revision: number,
  reason: string | null = null,
) {
  const registration = await tx.studioEventRegistration.findUniqueOrThrow({
    where: { id: registrationId },
    select: {
      studio: {
        select: {
          representatives: {
            where: { active: true, user: { active: true, emailVerified: true } },
            select: { user: { select: { id: true, email: true, preferredLocale: true } } },
          },
        },
      },
    },
  });
  for (const { user } of registration.studio.representatives) {
    const deliveryId = await queueEmail(tx, {
      to: user.email,
      locale: recipientLocale(undefined, user.preferredLocale),
      kind: "reviewUpdated",
    });
    await tx.reviewNotification.create({
      data: { registrationId, recipientId: user.id, kind, status, revision, reason, deliveryId },
    });
  }
}
