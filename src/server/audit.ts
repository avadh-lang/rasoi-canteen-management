import "server-only";
import type { Tx } from "@/lib/db";

export async function audit(
  tx: Tx,
  entry: { actorId: string | null; action: string; entity: string; entityId?: string; detail?: string },
) {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      detail: entry.detail ?? "",
    },
  });
}
