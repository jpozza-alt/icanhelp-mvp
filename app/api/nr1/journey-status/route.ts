import { NextRequest, NextResponse } from "next/server"
import {
  createNr1AdminClient,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type AnyRecord = Record<string, unknown>
type DbError = {
  message: string
}

type DbResult<T> = {
  data: T | null
  error: DbError | null
  count?: number | null
}

type DbListResult<T> = {
  data: T[] | null
  error: DbError | null
  count?: number | null
}

type DbQuery<T = AnyRecord> = PromiseLike<DbListResult<T>> & {
  select: (columns?: string, options?: { count?: "exact"; head?: boolean }) => DbQuery<T>
  eq: (column: string, value: string) => DbQuery<T>
  order: (column: string, options?: { ascending?: boolean }) => DbQuery<T>
  limit: (count: number) => DbQuery<T>
  maybeSingle: () => PromiseLike<DbResult<T>>
}

type DbClient = {
  from: <T = AnyRecord>(table: string) => DbQuery<T>
}

function asDbClient(value: unknown): DbClient {
  return value as DbClient
}

function json(status: number, payload: unknown) {
  return NextResponse.json(payload, { status })
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

function getTenantId(req: NextRequest): string {
  const queryValue = cleanText(req.nextUrl.searchParams.get("tenantId"))
  const querySnakeValue = cleanText(req.nextUrl.searchParams.get("tenant_id"))
  const headerValue = cleanText(req.headers.get("x-icanhelp-tenant"))
  const headerTenantId = cleanText(req.headers.get("x-tenant-id"))
  const headerTenant = cleanText(req.headers.get("x-tenant"))

  return queryValue || querySnakeValue || headerValue || headerTenantId || headerTenant
}

function getEstablishmentId(req: NextRequest): string {
  const queryValue = cleanText(req.nextUrl.searchParams.get("establishmentId"))
  const querySnakeValue = cleanText(req.nextUrl.searchParams.get("establishment_id"))
  const headerValue = cleanText(req.headers.get("x-icanhelp-establishment"))
  const headerEstablishmentId = cleanText(req.headers.get("x-establishment-id"))
  const headerEstablishment = cleanText(req.headers.get("x-establishment"))

  return queryValue || querySnakeValue || headerValue || headerEstablishmentId || headerEstablishment
}

function getDocumentVersionId(req: NextRequest): string {
  const queryValue = cleanText(req.nextUrl.searchParams.get("documentVersionId"))
  const querySnakeValue = cleanText(req.nextUrl.searchParams.get("document_version_id"))

  return queryValue || querySnakeValue
}

function asRecord(value: unknown): AnyRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return value as AnyRecord
}

function readString(value: unknown, keys: string[]): string {
  const record = asRecord(value)

  for (const key of keys) {
    const raw = record[key]
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim()
    }
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return String(raw)
    }
  }

  return ""
}

function readNumber(value: unknown, keys: string[]): number | null {
  const record = asRecord(value)

  for (const key of keys) {
    const raw = record[key]
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw
    }
    if (typeof raw === "string" && raw.trim().length > 0) {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return null
}

function formatVersion(snapshot: unknown): string {
  const version = readNumber(snapshot, ["version"])
  const status = readString(snapshot, ["status"])
  const generatedAt = readString(snapshot, ["generated_at"])

  if (!version) return "PGR formal nao gerado"

  const versionLabel = "v" + String(version)

  if (status && generatedAt) {
    return "PGR formal " + versionLabel + " - " + status
  }

  if (status) {
    return "PGR formal " + versionLabel + " - " + status
  }

  return "PGR formal " + versionLabel
}

function formatApproval(approval: unknown): string {
  const status = readString(approval, ["approval_status", "status"])
  const professionalName = readString(approval, ["professional_name"])

  if (!status) return "Aprovacao final pendente"

  if (status === "approved" && professionalName) {
    return "PGR aprovado por " + professionalName
  }

  if (status === "approved") {
    return "PGR aprovado"
  }

  return "Aprovacao " + status
}

function calculateCompletionPercent(input: {
  hasEstablishment: boolean
  hasRisks: boolean
  hasActionPlans: boolean
  hasSnapshot: boolean
  hasApproval: boolean
}) {
  const items = [
    input.hasEstablishment,
    input.hasRisks,
    input.hasActionPlans,
    input.hasSnapshot,
    input.hasApproval,
  ]

  const done = items.filter(Boolean).length
  return Math.round((done / items.length) * 100)
}

function calculatePendingCount(input: {
  risksCount: number
  actionPlansCount: number
  hasSnapshot: boolean
  hasApproval: boolean
}) {
  let count = 0

  if (input.risksCount === 0) count++
  if (input.actionPlansCount === 0) count++
  if (!input.hasSnapshot) count++
  if (!input.hasApproval) count++

  return count
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)
    const establishmentId = getEstablishmentId(req)
    const documentVersionId = getDocumentVersionId(req)

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
        message: "Provide establishmentId in querystring or x-icanhelp-establishment header",
      })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const adminClient = asDbClient(createNr1AdminClient() as unknown)

    const establishmentResult = await adminClient
      .from("nr1_establishments")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("id", establishmentId)
      .maybeSingle()

    if (establishmentResult.error) {
      return json(500, {
        ok: false,
        error: "journey_status_establishment_lookup_failed",
        message: establishmentResult.error.message,
      })
    }

    const establishment = establishmentResult.data ?? scope.establishment

    let company: unknown = null
    const companyId = readString(establishment, ["company_id"])

    if (companyId) {
      const companyResult = await adminClient
        .from("nr1_companies")
        .select("id, tenant_id, legal_name, trade_name, status")
        .eq("tenant_id", scope.tenantId)
        .eq("id", companyId)
        .maybeSingle()

      if (companyResult.error) {
        return json(500, {
          ok: false,
          error: "journey_status_company_lookup_failed",
          message: companyResult.error.message,
        })
      }

      company = companyResult.data ?? null
    }

    const snapshotsResult = await adminClient
      .from("nr1_document_versions")
      .select("id, tenant_id, establishment_id, document_type, status, version, generated_at, generated_by")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .eq("document_type", "review_report")
      .order("version", { ascending: false })
      .limit(1)

    if (snapshotsResult.error) {
      return json(500, {
        ok: false,
        error: "journey_status_snapshot_lookup_failed",
        message: snapshotsResult.error.message,
      })
    }

    const latestSnapshot = (snapshotsResult.data ?? [])[0] ?? null
    const effectiveDocumentVersionId = documentVersionId || readString(latestSnapshot, ["id"])

    let approvalQuery = adminClient
      .from("nr1_pgr_approvals")
      .select(
        [
          "id",
          "tenant_id",
          "establishment_id",
          "document_version_id",
          "approval_status",
          "professional_name",
          "professional_role",
          "professional_council",
          "professional_registration",
          "professional_state",
          "approved_at",
          "created_at",
        ].join(","),
      )
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (effectiveDocumentVersionId) {
      approvalQuery = approvalQuery.eq("document_version_id", effectiveDocumentVersionId)
    }

    const approvalResult = await approvalQuery

    if (approvalResult.error) {
      return json(500, {
        ok: false,
        error: "journey_status_approval_lookup_failed",
        message: approvalResult.error.message,
      })
    }

    const latestApproval = (approvalResult.data ?? [])[0] ?? null

    const risksResult = await adminClient
      .from("nr1_risks")
      .select("id, status", { count: "exact", head: false })
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)

    if (risksResult.error) {
      return json(500, {
        ok: false,
        error: "journey_status_risks_lookup_failed",
        message: risksResult.error.message,
      })
    }

    const actionPlansResult = await adminClient
      .from("nr1_action_plans")
      .select("id, status", { count: "exact", head: false })
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)

    if (actionPlansResult.error) {
      return json(500, {
        ok: false,
        error: "journey_status_action_plans_lookup_failed",
        message: actionPlansResult.error.message,
      })
    }

    const auditResult = await adminClient
      .from("nr1_audit_events")
      .select("id, event_type, created_at", { count: "exact", head: false })
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (auditResult.error) {
      return json(500, {
        ok: false,
        error: "journey_status_audit_lookup_failed",
        message: auditResult.error.message,
      })
    }

    const risksCount = risksResult.count ?? (risksResult.data ?? []).length
    const actionPlansCount = actionPlansResult.count ?? (actionPlansResult.data ?? []).length
    const hasSnapshot = Boolean(latestSnapshot)
    const hasApproval = Boolean(latestApproval)
    const hasRisks = risksCount > 0
    const hasActionPlans = actionPlansCount > 0

    const completionPercent = calculateCompletionPercent({
      hasEstablishment: Boolean(establishment),
      hasRisks,
      hasActionPlans,
      hasSnapshot,
      hasApproval,
    })

    const pendingCount = calculatePendingCount({
      risksCount,
      actionPlansCount,
      hasSnapshot,
      hasApproval,
    })

    const establishmentName = readString(establishment, ["name"]) || "Estabelecimento nao definido"
    const companyName =
      readString(company, ["trade_name", "legal_name"]) ||
      readString(establishment, ["company_name"]) ||
      "Cliente atendido"

    const professionalName = readString(latestApproval, ["professional_name"])
    const technicalResponsibleName = professionalName || "Responsavel tecnico a definir"

    const pgrStatus = hasRisks || hasActionPlans || hasSnapshot ? "PGR em andamento" : "PGR nao iniciado"
    const formalVersionStatus = formatVersion(latestSnapshot)
    const finalApprovalStatus = formatApproval(latestApproval)

    return json(200, {
      ok: true,
      data: {
        mode: "parceiro_sst",
        partnerName: "Parceiro SST",
        clientName: companyName,
        establishmentName,
        technicalResponsibleName,
        pgrStatus,
        formalVersionStatus,
        finalApprovalStatus,
        pendingCount,
        completionPercent,
        technicalDetails: [
          { label: "tenantId", value: scope.tenantId },
          { label: "establishmentId", value: establishmentId },
          { label: "documentVersionId", value: effectiveDocumentVersionId || "" },
          { label: "membershipRole", value: scope.role },
          { label: "risksCount", value: String(risksCount) },
          { label: "actionPlansCount", value: String(actionPlansCount) },
          { label: "latestAuditEventId", value: readString((auditResult.data ?? [])[0] ?? null, ["id"]) },
        ],
      },
      meta: {
        tenantId: scope.tenantId,
        establishmentId,
        documentVersionId: effectiveDocumentVersionId || null,
        readonly: true,
      },
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}




