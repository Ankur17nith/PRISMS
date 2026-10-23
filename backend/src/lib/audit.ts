import type { Request } from "express";
import { prisma } from "./prisma.js";

type AuditInput = {
  actorUserId?: string | null;
  eventType: string;
  entityType?: string;
  entityId?: string | null;
  outcome: "SUCCESS" | "DENIED" | "FAILURE";
  reason?: string;
  req?: Request;
  metadata?: Record<string, string | number | boolean | null>;
};

/** Writes an audit row. Never throws: auditing must not break the request. */
export async function audit(e: AuditInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        actorUserId: e.actorUserId ?? null,
        eventType: e.eventType,
        entityType: e.entityType ?? "user",
        entityId: e.entityId ?? e.actorUserId ?? null,
        outcome: e.outcome,
        reason: e.reason ?? null,
        ipAddress: e.req?.ip ?? null,
        userAgent: e.req?.get("user-agent")?.slice(0, 255) ?? null,
        metadata: e.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit event:", error);
  }
}
