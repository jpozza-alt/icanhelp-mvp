import { NextRequest, NextResponse } from "next/server"

import type { Database } from "@/lib/database.types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type ValidationRow =
  Database["public"]["Tables"]["nr1_trigger_investigation_validations"]["Row"]

function json(
  status: number,
  payload: Record<string, unknown>,
) {
  return NextResponse.json(payload, { status })
}

function cleanText(
  value: unknown,
  maxLength = 128,
): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()

  if (!trimmed || trimmed.length > maxLength) {
    return null
  }

  return trimmed
}

function getTenantId(req: NextRequest): string {
  return (
    (req.nextUrl.searchParams.get("tenantId") || "").trim() ||
    (req.headers.get("x-icanhelp-tenant") || "").trim()
  )
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params

    const investigationId =
      cleanText(params?.id, 36)

    const tenantId = getTenantId(req)

    const establishmentId =
      cleanText(
        req.nextUrl.searchParams.get("establishmentId"),
        36,
      )

    if (!investigationId) {
      return json(400, {
        ok: false,
        error: "missing_investigation_id",
      })
    }

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant_id",
      })
    }

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
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
      })
    }

    const userClient =
      createNr1UserClientFromBearer(bearerToken)

    const investigationResult = await userClient
      .from("nr1_trigger_investigations")
      .select(
        "id,investigation_status,technical_validation_required,generated_risk_id",
      )
      .eq("id", investigationId)
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .is("deleted_at", null)

    if (investigationResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_trigger_investigation_lookup_failed",
        message: investigationResult.error.message,
      })
    }

    if ((investigationResult.data || []).length === 0) {
      return json(404, {
        ok: false,
        error: "nr1_trigger_investigation_not_found",
      })
    }

    if ((investigationResult.data || []).length > 1) {
      return json(409, {
        ok: false,
        error: "nr1_trigger_investigation_duplicate",
      })
    }

    const investigation = investigationResult.data![0]

    const validationsResult = await userClient
      .from("nr1_trigger_investigation_validations")
      .select(
        "id,validation_type,validation_status,decision_type,validated_result,created_at,validated_at,revoked_at,source_snapshot_json",
      )
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .eq(
        "trigger_investigation_id",
        investigationId,
      )
      .is("revoked_at", null)
      .neq("validation_status", "revoked")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })

    if (validationsResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_trigger_validation_list_failed",
        message: validationsResult.error.message,
      })
    }

    const rows =
      (validationsResult.data || []) as ValidationRow[]

    const humanValidation =
      rows.find(
        (row) => row.validation_type === "human",
      ) || null

    const technicalValidation =
      rows.find(
        (row) => row.validation_type === "technical",
      ) || null

    let technicalValidationCurrent = false

    if (
      humanValidation &&
      technicalValidation &&
      technicalValidation.source_snapshot_json &&
      typeof technicalValidation.source_snapshot_json === "object" &&
      !Array.isArray(
        technicalValidation.source_snapshot_json,
      )
    ) {
      const source =
        technicalValidation.source_snapshot_json as Record<
          string,
          unknown
        >

      technicalValidationCurrent =
        cleanText(
          source.human_validation_id,
          36,
        ) === humanValidation.id &&
        cleanText(
          source.human_validated_result,
          64,
        ) === humanValidation.validated_result
    }

    const effectiveResult =
      investigation.technical_validation_required === true
        ? technicalValidationCurrent &&
          technicalValidation?.validation_status === "validated"
          ? technicalValidation.validated_result
          : null
        : humanValidation?.validation_status === "validated"
          ? humanValidation.validated_result
          : null

    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      investigationId,
      investigationStatus:
        investigation.investigation_status,
      generatedRiskId:
        investigation.generated_risk_id,
      humanValidation,
      technicalValidation,
      technicalValidationCurrent,
      effectiveResult,
    })
  } catch (error) {
    const response =
      nr1ErrorToResponsePayload(error)

    return json(
      response.status,
      response.body,
    )
  }
}