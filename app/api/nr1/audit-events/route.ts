import { NextRequest, NextResponse } from "next/server"
import {
  Nr1AuditEventInsert,
  Nr1AuditEventRow,
} from "@/lib/nr1-db-types"
import {
  createNr1AdminClient,
  resolveNr1Scope,
  Nr1ScopeError,
} from "@/lib/server/nr1-scope"

type AuditEventsBody = {
  establishment_id?: string | null
  module_name?: string | null
  screen_key?: string | null
  entity_type?: string | null
  entity_id?: string | null
  event_type?: string | null
  old_value_json?: unknown
  new_value_json?: unknown
  persistence_type?: string | null
  reason?: string | null
}

type AuditValueJson = Nr1AuditEventInsert["new_value_json"]

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status })
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

function normalizeAuditJson(value: unknown): AuditValueJson {
  return (value ?? null) as AuditValueJson
}

function getTenantId(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("tenantId"))
}

function getEstablishmentId(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("establishmentId"))
}

function getScreenKey(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("screenKey"))
}

function getEntityType(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("entityType"))
}

function getEntityId(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("entityId"))
}

function getEventType(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("eventType"))
}

function getPersistenceType(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("persistenceType"))
}

function getLimit(req: NextRequest): number {
  const raw = cleanText(req.nextUrl.searchParams.get("limit"))
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return 50
  return Math.min(parsed, 200)
}

function normalizePersistenceType(value: string): string {
  if (value === "formal") return "formal_version"
  return value
}

function isAllowedPersistenceType(value: string): boolean {
  const normalized = normalizePersistenceType(value)
  return normalized === "draft" || normalized === "formal_version"
}

export async function GET(req: NextRequest) {
  const tenantId = getTenantId(req)
  const establishmentId = getEstablishmentId(req)
  const screenKey = getScreenKey(req)
  const entityType = getEntityType(req)
  const entityId = getEntityId(req)
  const eventType = getEventType(req)
  const persistenceType = normalizePersistenceType(getPersistenceType(req))
  const limit = getLimit(req)

  if (!tenantId) {
    return jsonResponse(
      {
        error: "missing_tenant_id",
        message: "tenantId is required",
      },
      400,
    )
  }

  if (!establishmentId) {
    return jsonResponse(
      {
        error: "missing_establishment_id",
        message: "Provide establishmentId in querystring",
      },
      400,
    )
  }

  if (persistenceType && !isAllowedPersistenceType(persistenceType)) {
    return jsonResponse(
      {
        error: "invalid_persistence_type",
        message: "persistenceType must be draft, formal, or formal_version",
      },
      400,
    )
  }

  try {
    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const adminClient = createNr1AdminClient()

    let query = adminClient
      .from("nr1_audit_events")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)

    if (screenKey) {
      query = query.eq("screen_key", screenKey)
    }

    if (entityType) {
      query = query.eq("entity_type", entityType)
    }

    if (entityId) {
      query = query.eq("entity_id", entityId)
    }

    if (eventType) {
      query = query.eq("event_type", eventType)
    }

    if (persistenceType) {
      query = query.eq("persistence_type", persistenceType)
    }

    const result = await query
      .order("created_at", { ascending: false })
      .limit(limit)

    if (result.error) {
      return jsonResponse(
        {
          error: "nr1_audit_events_list_failed",
          message: result.error.message,
        },
        500,
      )
    }

    const rows = (result.data || []) as Nr1AuditEventRow[]

    return jsonResponse({
      data: rows,
      meta: {
        tenantId: scope.tenantId,
        establishmentId,
        membershipRole: scope.role,
        count: rows.length,
      },
    })
  } catch (error) {
    if (error instanceof Nr1ScopeError) {
      return jsonResponse(
        {
          error: error.code,
          message: error.message,
        },
        error.status,
      )
    }

    const message = error instanceof Error ? error.message : "Unexpected nr1 audit-events GET error"
    return jsonResponse(
      {
        error: "nr1_audit_events_get_unexpected",
        message,
      },
      500,
    )
  }
}

export async function POST(req: NextRequest) {
  const tenantId = getTenantId(req)

  if (!tenantId) {
    return jsonResponse(
      {
        error: "missing_tenant_id",
        message: "tenantId is required",
      },
      400,
    )
  }

  let body: AuditEventsBody
  try {
    body = (await req.json()) as AuditEventsBody
  } catch {
    return jsonResponse(
      {
        error: "invalid_json",
        message: "Request body must be valid JSON",
      },
      400,
    )
  }

  const establishmentId = cleanText(body.establishment_id)
  const entityType = cleanText(body.entity_type)
  const entityId = cleanText(body.entity_id)
  const eventType = cleanText(body.event_type)
  const persistenceType = normalizePersistenceType(cleanText(body.persistence_type))
  const moduleName = cleanText(body.module_name) || "nr1"
  const screenKey = cleanText(body.screen_key)
  const reason = cleanText(body.reason)

  if (!establishmentId) {
    return jsonResponse(
      {
        error: "missing_establishment_id",
        message: "establishment_id is required",
      },
      400,
    )
  }

  if (!entityType) {
    return jsonResponse(
      {
        error: "missing_entity_type",
        message: "entity_type is required",
      },
      400,
    )
  }

  if (!entityId) {
    return jsonResponse(
      {
        error: "missing_entity_id",
        message: "entity_id is required",
      },
      400,
    )
  }

  if (!eventType) {
    return jsonResponse(
      {
        error: "missing_event_type",
        message: "event_type is required",
      },
      400,
    )
  }

  if (!isAllowedPersistenceType(persistenceType)) {
    return jsonResponse(
      {
        error: "invalid_persistence_type",
        message: "persistence_type must be draft, formal, or formal_version",
      },
      400,
    )
  }

  try {
    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const adminClient = createNr1AdminClient()

    const insertPayload: Nr1AuditEventInsert = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      module_name: moduleName,
      screen_key: screenKey || null,
      entity_type: entityType,
      entity_id: entityId,
      event_type: eventType,
      old_value_json: normalizeAuditJson(body.old_value_json),
      new_value_json: normalizeAuditJson(body.new_value_json),
      persistence_type: persistenceType,
      reason: reason || null,
      user_id: scope.membership.user_id,
    }

    const insertResult = await adminClient
      .from("nr1_audit_events")
      .insert(insertPayload)
      .select("*")

    if (insertResult.error) {
      return jsonResponse(
        {
          error: "nr1_audit_events_insert_failed",
          message: insertResult.error.message,
        },
        500,
      )
    }

    const rows = (insertResult.data || []) as Nr1AuditEventRow[]

    return jsonResponse(
      {
        data: rows[0] ?? null,
        meta: {
          tenantId: scope.tenantId,
          establishmentId,
          membershipRole: scope.role,
          action: "inserted",
        },
      },
      201,
    )
  } catch (error) {
    if (error instanceof Nr1ScopeError) {
      return jsonResponse(
        {
          error: error.code,
          message: error.message,
        },
        error.status,
      )
    }

    const message = error instanceof Error ? error.message : "Unexpected nr1 audit-events POST error"
    return jsonResponse(
      {
        error: "nr1_audit_events_post_unexpected",
        message,
      },
      500,
    )
  }
}

