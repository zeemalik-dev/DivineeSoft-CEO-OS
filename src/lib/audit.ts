import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function audit(params: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata,
      ip: params.ip ?? null,
    },
  });
}

/** Append to the realtime feed that the SSE endpoint tails. */
export async function emitActivity(params: {
  type: string;
  actorName?: string | null;
  summary: string;
  entityType?: string;
  entityId?: string;
  payload?: Prisma.InputJsonValue;
}) {
  await prisma.activityEvent.create({
    data: {
      type: params.type,
      actorName: params.actorName ?? null,
      summary: params.summary,
      entityType: params.entityType,
      entityId: params.entityId,
      payload: params.payload,
    },
  });
}
