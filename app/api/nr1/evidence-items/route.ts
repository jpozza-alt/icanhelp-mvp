import { NextRequest, NextResponse } from "next/server"
import type { Database } from "@/lib/database.types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type EvidenceRow = Database["public"]["Tables"]["nr1_evidence_items"]["Row"]
type EvidenceInsert = Database["public"]["Tables"]["nr1_evidence_items"]["Insert"]

function getTenantId(req: NextRequest): string {
  const queryValue = (req.nextUrl.searchParams.get("tenantId") || "").trim()
  const headerValue = (req.headers.get("x-icanhelp-tenant") || "").trim()
  const tenantId = queryValue || headerValue

  if (!tenantId) {
    throw new Error("missing_tenant")
  }

  return tenantId
}

function getOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getRequiredString(value: unknown, fieldName: string): string {
  const normalized = getOptionalString(value)

  if (!normalized) {
    throw new Error("missing_" + fieldName)
  }

  return normalized
}

function readQueryString(req: NextRequest, names: string[]): string | null {
  for (const name of names) {
    const value = (req.nextUrl.searchParams.get(name) || "").trim()
    if (value) {
      return value
    }
  }

  return null
}

function readBooleanQuery(req: NextRequest, names: string[]): boolean {
  const raw = readQueryString(req, names)
  if (!raw) {
    return false
  }

  const normalized = raw.toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

function normalizeReferenceDate(value: unknown): string | null {
  const normalized = getOptionalString(value)

  if (!normalized) {
    return null
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("invalid_reference_date")
  }

  return normalized
}

function toErrorResponse(error: unknown) {
  const response = nr1ErrorToResponsePayload(error) as
    | { status?: number; body?: unknown }
    | undefined

  return NextResponse.json(
    response?.body ?? {
      error: "internal_error",
      message: "Unexpected NR1 evidence-items route error",
    },
    { status: response?.status ?? 500 }
  )
}

export async function GET(req: NextRequest) {
  try {
    const bearerToken = extractBearerToken(req)

    if (!bearerToken) {
      return NextResponse.json(
        {
          error: "missing_bearer",
          message: "Missing bearer token",
        },
        { status: 401 }
      )
    }

    const establishmentId = getRequiredString(
      readQueryString(req, ["establishment_id", "establishmentId"]),
      "establishment_id"
    )

    const scope = await resolveNr1Scope({
      req,
      tenantId: getTenantId(req),
      establishmentId,
    })

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const linkedEntityType = readQueryString(req, ["linked_entity_type", "linkedEntityType"])
    const linkedEntityId = readQueryString(req, ["linked_entity_id", "linkedEntityId"])
    const evidenceType = readQueryString(req, ["evidence_type", "evidenceType"])
    const includeDeleted = readBooleanQuery(req, ["includeDeleted", "include_deleted"])

    let query = userClient
      .from("nr1_evidence_items")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)

    if (linkedEntityType) {
      query = query.eq("linked_entity_type", linkedEntityType)
    }

    if (linkedEntityId) {
      query = query.eq("linked_entity_id", linkedEntityId)
    }

    if (evidenceType) {
      query = query.eq("evidence_type", evidenceType)
    }

    if (!includeDeleted) {
      query = query.is("deleted_at", null)
    }

    const { data, error } = await query
      .order("reference_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json(
      {
        data: (data ?? []) as EvidenceRow[],
        meta: {
          tenantId: scope.tenantId,
          membershipRole: scope.role,
          establishmentId,
          count: data?.length ?? 0,
          includeDeleted,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const bearerToken = extractBearerToken(req)

    if (!bearerToken) {
      return NextResponse.json(
        {
          error: "missing_bearer",
          message: "Missing bearer token",
        },
        { status: 401 }
      )
    }

    const body = (await req.json()) as Partial<EvidenceInsert>
    const establishmentId = getRequiredString(body.establishment_id, "establishment_id")

    const scope = await resolveNr1Scope({
      req,
      tenantId: getTenantId(req),
      establishmentId,
    })

    if (!isTenantAdminRole(scope.role)) {
      return NextResponse.json(
        {
          error: "forbidden",
          message: "Admin role required",
        },
        { status: 403 }
      )
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const payload: EvidenceInsert = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      title: getRequiredString(body.title, "title"),
      evidence_type: getRequiredString(body.evidence_type, "evidence_type"),
      description: getOptionalString(body.description),
      linked_entity_type: getOptionalString(body.linked_entity_type),
      linked_entity_id: getOptionalString(body.linked_entity_id),
      reference_date: normalizeReferenceDate(body.reference_date),
      file_name: getOptionalString(body.file_name),
      file_url: getOptionalString(body.file_url),
      validation_status: getOptionalString(body.validation_status),
      responsible_name: getOptionalString(body.responsible_name),
    }

    const { data, error } = await userClient
      .from("nr1_evidence_items")
      .insert(payload)
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      {
        data: data as EvidenceRow,
        meta: {
          tenantId: scope.tenantId,
          membershipRole: scope.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}
