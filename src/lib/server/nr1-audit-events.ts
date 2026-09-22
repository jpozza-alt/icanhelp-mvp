import type { Json } from "@/lib/database.types"
import type { Nr1AuditEventInsert } from "@/lib/nr1-db-types"
import { createNr1UserClientFromBearer } from "@/lib/server/nr1-scope"

type Nr1AuditClient = ReturnType<typeof createNr1UserClientFromBearer>

export type Nr1AuditEventInput = {
  tenantId: string
  establishmentId: string
  entityType: string
  entityId: string
  eventType: string
  userId: string
  screenKey?: string | null
  oldValueJson?: Json | null
  newValueJson?: Json | null
  persistenceType?: Nr1AuditEventInsert["persistence_type"]
  reason?: string | null
}

export async function insertNr1AuditEvents(
  userClient: Nr1AuditClient,
  events: Nr1AuditEventInput[],
) {
  if (events.length === 0) {
    return { ok: true as const }
  }

  const payloads: Nr1AuditEventInsert[] = events.map((event) => ({
    tenant_id: event.tenantId,
    establishment_id: event.establishmentId,
    module_name: "nr1",
    screen_key: event.screenKey ?? "guided_diagnosis",
    entity_type: event.entityType,
    entity_id: event.entityId,
    event_type: event.eventType,
    old_value_json: event.oldValueJson ?? null,
    new_value_json: event.newValueJson ?? null,
    persistence_type: event.persistenceType ?? "draft",
    reason: event.reason ?? null,
    user_id: event.userId,
  }))

  const result = await userClient
    .from("nr1_audit_events")
    .insert(payloads)

  if (result.error) {
    return {
      ok: false as const,
      error: result.error.message,
    }
  }

  return { ok: true as const }
}
