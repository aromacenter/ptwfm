import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "USER_REGISTER"
  | "CONSENT_GRANT"
  | "CONSENT_WITHDRAW"
  | "HEALTH_NOTE_VIEW"
  | "HEALTH_NOTE_CREATE"
  | "DATA_EXPORT"
  | "DATA_ERASURE"
  | "SETTING_UPDATE";

/** Writes an immutable audit-trail entry (UK GDPR accountability). */
export function recordAudit(params: {
  actorId: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      metadata: params.metadata,
    },
  });
}
