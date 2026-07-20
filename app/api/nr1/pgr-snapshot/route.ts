import { NextRequest, NextResponse } from "next/server"
import {
  createNr1AdminClient,
  resolveNr1Scope,
  Nr1ScopeError,
} from "@/lib/server/nr1-scope"
import type { Json } from "@/lib/database.types"

export const dynamic = "force-dynamic"

const PGR_FORMALIZATION_ENABLED = false

type SnapshotBody = {
  establishment_id?: string | null
  source_snapshot_json?: Json
  report_payload?: Json
  status?: string | null
  file_url?: string | null
}

type JsonObject = { [key: string]: Json | undefined }

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status })
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

function getTenantId(req: NextRequest): string {
  const queryValue = cleanText(req.nextUrl.searchParams.get("tenantId"))
  const headerValue = cleanText(req.headers.get("x-icanhelp-tenant"))
  return headerValue || queryValue
}

function getEstablishmentId(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("establishmentId"))
}

function isJsonObject(value: Json): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function asRecord(value: Json): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return value
}

function normalizeSnapshot(value: Json): Json {
  if (value && typeof value === "object") {
    return value
  }

  return {
    value: value ?? null,
  }
}

function readReportGeneratedAt(snapshot: Json): string | null {
  const root = asRecord(snapshot)
  const report = isJsonObject(root.report) ? root.report : root
  const generatedAt = cleanText(report.generatedAt)

  return generatedAt || null
}

function readCounts(snapshot: Json): JsonObject {
  const root = asRecord(snapshot)
  const report = isJsonObject(root.report) ? root.report : root
  return isJsonObject(report.counts) ? report.counts : {}
}

function normalizeStatus(value: unknown): string {
  const status = cleanText(value)
  return status || "generated"
}

function normalizeFileUrl(value: unknown): string | null {
  const fileUrl = cleanText(value)
  return fileUrl || null
}

function isMissingEstablishment(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "")
  return message.includes("missing_establishment_id")
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)
    const establishmentId = getEstablishmentId(req)

    if (!tenantId) {
      return jsonResponse(
        {
          ok: false,
          error: "missing_tenant",
          message: "Missing tenant scope",
        },
        400,
      )
    }

    if (!establishmentId) {
      return jsonResponse(
        {
          ok: false,
          error: "missing_establishment_id",
          message: "Provide establishmentId in querystring",
        },
        400,
      )
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const adminClient = createNr1AdminClient()

    const result = await adminClient
      .from("nr1_document_versions")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .eq("document_type", "review_report")
      .order("version", { ascending: false })
      .limit(20)

    if (result.error) {
      return jsonResponse(
        {
          ok: false,
          error: "pgr_snapshot_list_failed",
          message: result.error.message,
        },
        500,
      )
    }

    const rows = result.data ?? []

    return jsonResponse({
      ok: true,
      data: rows,
      meta: {
        tenantId: scope.tenantId,
        establishmentId,
        documentType: "review_report",
        count: rows.length,
      },
    })
  } catch (error) {
    if (error instanceof Nr1ScopeError) {
      return jsonResponse(
        {
          ok: false,
          error: error.code,
          message: error.message,
        },
        error.status,
      )
    }

    if (isMissingEstablishment(error)) {
      return jsonResponse(
        {
          ok: false,
          error: "missing_establishment_id",
          message: "Provide establishmentId in querystring",
        },
        400,
      )
    }

    const message = error instanceof Error ? error.message : "Unexpected PGR snapshot GET error"

    return jsonResponse(
      {
        ok: false,
        error: "pgr_snapshot_get_unexpected",
        message,
      },
      500,
    )
  }
}

export async function POST(req: NextRequest) {
  if (!PGR_FORMALIZATION_ENABLED) {
    return jsonResponse(
      {
        ok: false,
        error: "pgr_formalization_temporarily_disabled",
        message: "A formalização do PGR está temporariamente indisponível. Use apenas a prévia não formal.",
      },
      503,
    )
  }

  let body: SnapshotBody

  try {
    body = (await req.json()) as SnapshotBody
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      },
      400,
    )
  }

  try {
    const tenantId = getTenantId(req)
    const establishmentId = cleanText(body.establishment_id) || getEstablishmentId(req)

    if (!tenantId) {
      return jsonResponse(
        {
          ok: false,
          error: "missing_tenant",
          message: "Missing tenant scope",
        },
        400,
      )
    }

    if (!establishmentId) {
      return jsonResponse(
        {
          ok: false,
          error: "missing_establishment_id",
          message: "establishment_id is required",
        },
        400,
      )
    }

    const rawSnapshot = body.source_snapshot_json ?? body.report_payload

    if (typeof rawSnapshot === "undefined" || rawSnapshot === null) {
      return jsonResponse(
        {
          ok: false,
          error: "missing_source_snapshot_json",
          message: "source_snapshot_json is required",
        },
        400,
      )
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const adminClient = createNr1AdminClient()
    const generatedAt = new Date().toISOString()
    const normalizedSnapshot = normalizeSnapshot(rawSnapshot)
    const reportGeneratedAt = readReportGeneratedAt(normalizedSnapshot)
    const counts = readCounts(normalizedSnapshot)

    const latestResult = await adminClient
      .from("nr1_document_versions")
      .select("id, version")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .eq("document_type", "review_report")
      .order("version", { ascending: false })
      .limit(1)

    if (latestResult.error) {
      return jsonResponse(
        {
          ok: false,
          error: "pgr_snapshot_latest_lookup_failed",
          message: latestResult.error.message,
        },
        500,
      )
    }

    const latestRows = latestResult.data ?? []
    const previousVersion = latestRows.length > 0 ? latestRows[0] : null
    const lastVersionNumber = Number(previousVersion?.version ?? 0)
    const nextVersion = Number.isFinite(lastVersionNumber) ? lastVersionNumber + 1 : 1

    const sourceSnapshotJson = {
      snapshotType: "pgr_report_formal_snapshot",
      source: "dashboard/nr1/relatorio-pgr",
      reportType: "nr1_pgr_json",
      snapshotCreatedAt: generatedAt,
      reportGeneratedAt,
      counts,
      payload: normalizedSnapshot,
    }

    const insertPayload = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      document_type: "review_report",
      source_snapshot_json: sourceSnapshotJson,
      version: nextVersion,
      generated_at: generatedAt,
      generated_by: scope.membership.user_id,
      status: normalizeStatus(body.status),
      file_url: normalizeFileUrl(body.file_url),
      supersedes_document_id: previousVersion?.id ?? null,
    }

    const insertResult = await adminClient
      .from("nr1_document_versions")
      .insert(insertPayload)
      .select("*")
      .single()

    if (insertResult.error) {
      return jsonResponse(
        {
          ok: false,
          error: "pgr_snapshot_insert_failed",
          message: insertResult.error.message,
        },
        500,
      )
    }

    const documentVersion = insertResult.data

    const auditPayload = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      module_name: "nr1",
      screen_key: "dashboard/nr1/relatorio-pgr",
      entity_type: "pgr_report_snapshot",
      entity_id: documentVersion.id,
      event_type: "pgr_report_formal_snapshot_created",
      old_value_json: null,
      new_value_json: {
        tenantId: scope.tenantId,
        establishmentId,
        documentVersionId: documentVersion.id,
        documentType: "review_report",
        version: nextVersion,
        reportType: "nr1_pgr_json",
        source: "dashboard/nr1/relatorio-pgr",
        snapshotCreatedAt: generatedAt,
        reportGeneratedAt,
        counts,
      },
      persistence_type: "formal_version",
      reason: "Formal PGR snapshot created.",
      user_id: scope.membership.user_id,
    }

    const auditResult = await adminClient
      .from("nr1_audit_events")
      .insert(auditPayload)
      .select("*")
      .single()

    if (auditResult.error) {
      return jsonResponse(
        {
          ok: false,
          error: "pgr_snapshot_audit_insert_failed",
          message: auditResult.error.message,
          data: documentVersion,
        },
        500,
      )
    }

    return jsonResponse(
      {
        ok: true,
        data: documentVersion,
        auditEvent: auditResult.data,
        meta: {
          tenantId: scope.tenantId,
          establishmentId,
          documentType: "review_report",
          version: nextVersion,
          supersedesDocumentId: previousVersion?.id ?? null,
          action: "pgr_report_formal_snapshot_created",
        },
      },
      201,
    )
  } catch (error) {
    if (error instanceof Nr1ScopeError) {
      return jsonResponse(
        {
          ok: false,
          error: error.code,
          message: error.message,
        },
        error.status,
      )
    }

    const message = error instanceof Error ? error.message : "Unexpected PGR snapshot POST error"

    return jsonResponse(
      {
        ok: false,
        error: "pgr_snapshot_post_unexpected",
        message,
      },
      500,
    )
  }
}


