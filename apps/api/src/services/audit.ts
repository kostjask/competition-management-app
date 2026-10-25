import type { Prisma } from "@prisma/client";
import { AuditRecordSchema, type AuditRecord } from "@dance/schemas";

export async function appendAudit(tx: Prisma.TransactionClient, input: AuditRecord): Promise<void> {
  const record = AuditRecordSchema.parse(input);
  await tx.auditLog.create({ data: {
    action: record.action, actorKind: record.actor.kind,
    actorId: record.actor.kind === "USER" ? record.actor.userId : null,
    targetType: record.targetType, targetId: record.targetId,
    eventId: record.eventId ?? null, studioId: record.studioId ?? null, metadata: record.metadata,
  } });
}
