import { NextRequest, NextResponse } from "next/server"
import type { Database } from "@/lib/database.types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type Nr1TrainingRecordRow = Database["public"]["Tables"]["nr1_training_records"]["Row"]
type Nr1TrainingRecordInsert = Database["public"]["Tables"]["nr1_training_records"]["Insert"]

type CreateTrainingRecordBody = {
  establishment_id?: string
  training_name?: string
  target_audience?: string | null
  status?: string | null
  periodicity?: string | null
  last_date?: string | null
  next_due_date?: string | null
  responsible_name?: string | null
  certificate_file_url?: string | null
  notes?: string | null
}

const ALLOWED_STATUS = ["up_to_date", "due_soon", "overdue"] as const
type AllowedTrainingStatus = (typeof ALLOWED_STATUS)[number]

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status })
}

function getTenantId(req: NextRequest): string {
  const queryValue = (req.nextUrl.searchParams.get("tenantId") || "").trim()
  const headerValue = (req.headers.get("x-icanhelp-tenant") || "").trim()
  return queryValue || headerValue
}

function getRequiredEstablishmentId(req: NextRequest): string | null {
  const value = (req.nextUrl.searchParams.get("establishmentId") || "").trim()
  return value || null
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanStatus(value: unknown): AllowedTrainingStatus | null {
  const text = cleanText(value)
  if (!text) return null
  return ALLOWED_STATUS.includes(text as AllowedTrainingStatus)
    ? (text as AllowedTrainingStatus)
    : null
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)
    const establishmentId = getRequiredEstablishmentId(req)

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant_id",
        message: "Provide tenantId in querystring or x-icanhelp-tenant header",
      })
    }

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "Provide establishmentId in querystring",
      })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const bearerToken = extractBearerToken(req)
    if (!bearerToken) {
      return json(401, {
        ok: false,
        error: "missing_bearer",
        message: "Missing bearer token",
      })
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const result = await userClient
      .from("nr1_training_records")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_training_records_list_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1TrainingRecordRow[]

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      membershipRole: scope.role,
      count: rows.length,
      latest: rows.length > 0 ? rows[0] : null,
      items: rows,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return json(500, {
      ok: false,
      error: "nr1_training_records_list_unhandled",
      message,
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant_id",
        message: "Provide tenantId in querystring or x-icanhelp-tenant header",
      })
    }

    const body = (await req.json().catch(() => null)) as CreateTrainingRecordBody | null
    if (!body) {
      return json(400, {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      })
    }

    const establishmentId = cleanText(body.establishment_id) || getRequiredEstablishmentId(req)
    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "Provide establishment_id in body or establishmentId in querystring",
      })
    }

    const trainingName = cleanText(body.training_name)
    if (!trainingName) {
      return json(400, {
        ok: false,
        error: "missing_training_name",
        message: "Provide training_name in request body",
      })
    }

    const rawStatus = cleanText(body.status)
    const status = cleanStatus(body.status)
    if (rawStatus && !status) {
      return json(400, {
        ok: false,
        error: "invalid_status",
        message: "status must be one of: up_to_date, due_soon, overdue",
        allowed: ALLOWED_STATUS,
      })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    if (!isTenantAdminRole(scope.role)) {
      return json(403, {
        ok: false,
        error: "insufficient_role",
        message: "Only owner/admin can create training records",
      })
    }

    const bearerToken = extractBearerToken(req)
    if (!bearerToken) {
      return json(401, {
        ok: false,
        error: "missing_bearer",
        message: "Missing bearer token",
      })
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const payload: Nr1TrainingRecordInsert = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      training_name: trainingName,
      target_audience: cleanText(body.target_audience),
      status,
      periodicity: cleanText(body.periodicity),
      last_date: cleanText(body.last_date),
      next_due_date: cleanText(body.next_due_date),
      responsible_name: cleanText(body.responsible_name),
      certificate_file_url: cleanText(body.certificate_file_url),
      notes: cleanText(body.notes),
    }

    const result = await userClient
      .from("nr1_training_records")
      .insert(payload)
      .select("*")
      .single()

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_training_records_create_failed",
        message: result.error.message,
      })
    }

    const row = result.data as Nr1TrainingRecordRow

    return json(201, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      membershipRole: scope.role,
      item: row,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return json(500, {
      ok: false,
      error: "nr1_training_records_create_unhandled",
      message,
    })
  }
}
