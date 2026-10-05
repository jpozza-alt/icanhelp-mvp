import { NextRequest, NextResponse } from "next/server"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  resolveNr1Scope,
  Nr1ScopeError,
} from "@/lib/server/nr1-scope"
import type { Json } from "@/lib/database.types"

export const dynamic = "force-dynamic"

const SUPPORT_DOCUMENT_TYPE =
  "pgr_support_document"

type SupportDocumentBody = {
  establishment_id?: string | null
  source_snapshot_json?: Json
  report_payload?: Json
}

type JsonObject = {
  [key: string]: Json | undefined
}

function jsonResponse(
  payload: unknown,
  status = 200,
) {
  return NextResponse.json(
    payload,
    { status },
  )
}

function cleanText(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function getTenantId(
  req: NextRequest,
): string {
  return (
    cleanText(
      req.headers.get(
        "x-icanhelp-tenant"
      )
    ) ||
    cleanText(
      req.nextUrl.searchParams.get(
        "tenantId"
      )
    )
  )
}

function getEstablishmentId(
  req: NextRequest,
): string {
  return cleanText(
    req.nextUrl.searchParams.get(
      "establishmentId"
    )
  )
}

function isJsonObject(
  value: Json,
): value is JsonObject {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value)
}

function asRecord(
  value: Json,
): JsonObject {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {}
  }

  return value
}

function normalizeSnapshot(
  value: Json,
): Json {
  if (
    value &&
    typeof value === "object"
  ) {
    return value
  }

  return {
    value: value ?? null,
  }
}

function readReportGeneratedAt(
  snapshot: Json,
): string | null {
  const root =
    asRecord(snapshot)

  const report =
    isJsonObject(root.report)
      ? root.report
      : root

  const generatedAt =
    cleanText(
      report.generatedAt
    )

  return generatedAt || null
}

function readCounts(
  snapshot: Json,
): JsonObject {
  const root =
    asRecord(snapshot)

  const report =
    isJsonObject(root.report)
      ? root.report
      : root

  return isJsonObject(report.counts)
    ? report.counts
    : {}
}

export async function GET(
  req: NextRequest,
) {
  try {
    const tenantId =
      getTenantId(req)

    const establishmentId =
      getEstablishmentId(req)

    if (!tenantId) {
      return jsonResponse(
        {
          ok: false,
          error: "missing_tenant",
        },
        400,
      )
    }

    if (!establishmentId) {
      return jsonResponse(
        {
          ok: false,
          error:
            "missing_establishment_id",
        },
        400,
      )
    }

    const scope =
      await resolveNr1Scope({
        req,
        tenantId,
        establishmentId,
      })

    const bearerToken =
      extractBearerToken(req)

    if (!bearerToken) {
      return jsonResponse(
        {
          ok: false,
          error: "missing_bearer",
        },
        401,
      )
    }

    const userClient =
      createNr1UserClientFromBearer(
        bearerToken
      )

    const result =
      await userClient
        .from(
          "nr1_document_versions"
        )
        .select("*")
        .eq(
          "tenant_id",
          scope.tenantId
        )
        .eq(
          "establishment_id",
          establishmentId
        )
        .eq(
          "document_type",
          SUPPORT_DOCUMENT_TYPE
        )
        .order(
          "version",
          { ascending: false }
        )
        .limit(20)

    if (result.error) {
      return jsonResponse(
        {
          ok: false,
          error:
            "pgr_support_document_list_failed",
          message:
            result.error.message,
        },
        500,
      )
    }

    return jsonResponse({
      ok: true,
      data: result.data ?? [],
      meta: {
        tenantId:
          scope.tenantId,
        establishmentId,
        documentType:
          SUPPORT_DOCUMENT_TYPE,
        formalPgr:
          false,
      },
    })
  }
  catch (error) {
    if (
      error instanceof
      Nr1ScopeError
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            error.code,
          message:
            error.message,
        },
        error.status,
      )
    }

    return jsonResponse(
      {
        ok: false,
        error:
          "pgr_support_document_get_unexpected",
        message:
          error instanceof Error
            ? error.message
            : "Unexpected error",
      },
      500,
    )
  }
}

export async function POST(
  req: NextRequest,
) {
  let body:
    SupportDocumentBody

  try {
    body =
      (await req.json()) as
        SupportDocumentBody
  }
  catch {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_json",
      },
      400,
    )
  }

  try {
    const tenantId =
      getTenantId(req)

    const establishmentId =
      cleanText(
        body.establishment_id
      ) ||
      getEstablishmentId(req)

    if (!tenantId) {
      return jsonResponse(
        {
          ok: false,
          error: "missing_tenant",
        },
        400,
      )
    }

    if (!establishmentId) {
      return jsonResponse(
        {
          ok: false,
          error:
            "missing_establishment_id",
        },
        400,
      )
    }

    const rawSnapshot =
      body.source_snapshot_json ??
      body.report_payload

    if (
      typeof rawSnapshot ===
        "undefined" ||
      rawSnapshot === null
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            "missing_source_snapshot_json",
        },
        400,
      )
    }

    const scope =
      await resolveNr1Scope({
        req,
        tenantId,
        establishmentId,
      })

    const bearerToken =
      extractBearerToken(req)

    if (!bearerToken) {
      return jsonResponse(
        {
          ok: false,
          error: "missing_bearer",
        },
        401,
      )
    }

    const userClient =
      createNr1UserClientFromBearer(
        bearerToken
      )

    const generatedAt =
      new Date().toISOString()

    const normalizedSnapshot =
      normalizeSnapshot(
        rawSnapshot
      )

    const reportGeneratedAt =
      readReportGeneratedAt(
        normalizedSnapshot
      )

    const counts =
      readCounts(
        normalizedSnapshot
      )

    const latestResult =
      await userClient
        .from(
          "nr1_document_versions"
        )
        .select("id, version")
        .eq(
          "tenant_id",
          scope.tenantId
        )
        .eq(
          "establishment_id",
          establishmentId
        )
        .eq(
          "document_type",
          SUPPORT_DOCUMENT_TYPE
        )
        .order(
          "version",
          { ascending: false }
        )
        .limit(1)

    if (latestResult.error) {
      return jsonResponse(
        {
          ok: false,
          error:
            "pgr_support_document_latest_lookup_failed",
          message:
            latestResult.error.message,
        },
        500,
      )
    }

    const previousVersion =
      (
        latestResult.data ?? []
      )[0] ?? null

    const lastVersionNumber =
      Number(
        previousVersion
          ?.version ?? 0
      )

    const nextVersion =
      Number.isFinite(
        lastVersionNumber
      )
        ? lastVersionNumber + 1
        : 1

    const insertResult =
      await userClient
        .from(
          "nr1_document_versions"
        )
        .insert({
          tenant_id:
            scope.tenantId,
          establishment_id:
            establishmentId,
          document_type:
            SUPPORT_DOCUMENT_TYPE,
          source_snapshot_json: {
            snapshotType:
              "pgr_support_document",
            documentNature:
              "support_for_pgr_formalization",
            formalPgr:
              false,
            professionalApproval:
              false,
            automaticSignature:
              false,
            requiresOrganizationReview:
              true,
            requiresDatingAndSignatureOutsideProduct:
              true,
            source:
              "dashboard/nr1/relatorio-pgr",
            reportType:
              "nr1_pgr_support_document_json",
            snapshotCreatedAt:
              generatedAt,
            reportGeneratedAt,
            counts,
            payload:
              normalizedSnapshot,
          },
          version:
            nextVersion,
          generated_at:
            generatedAt,
          generated_by:
            scope.membership.user_id,
          status:
            "generated",
          file_url:
            null,
          supersedes_document_id:
            previousVersion?.id ??
            null,
        })
        .select("*")
        .single()

    if (insertResult.error) {
      return jsonResponse(
        {
          ok: false,
          error:
            "pgr_support_document_insert_failed",
          message:
            insertResult.error.message,
        },
        500,
      )
    }

    const documentVersion =
      insertResult.data

    const auditResult =
      await userClient
        .from(
          "nr1_audit_events"
        )
        .insert({
          tenant_id:
            scope.tenantId,
          establishment_id:
            establishmentId,
          module_name:
            "nr1",
          screen_key:
            "dashboard/nr1/relatorio-pgr",
          entity_type:
            "pgr_support_document",
          entity_id:
            documentVersion.id,
          event_type:
            "pgr_support_document_generated",
          old_value_json:
            null,
          new_value_json: {
            documentVersionId:
              documentVersion.id,
            documentType:
              SUPPORT_DOCUMENT_TYPE,
            version:
              nextVersion,
            formalPgr:
              false,
            professionalApproval:
              false,
          },
          persistence_type:
            "versioned_support_document",
          reason:
            "Versioned PGR support document generated. This does not formalize or professionally approve the PGR.",
          user_id:
            scope.membership.user_id,
        })
        .select("*")
        .single()

    if (auditResult.error) {
      return jsonResponse(
        {
          ok: false,
          error:
            "pgr_support_document_audit_insert_failed",
          message:
            auditResult.error.message,
          data:
            documentVersion,
        },
        500,
      )
    }

    return jsonResponse(
      {
        ok: true,
        data:
          documentVersion,
        auditEvent:
          auditResult.data,
        meta: {
          tenantId:
            scope.tenantId,
          establishmentId,
          documentType:
            SUPPORT_DOCUMENT_TYPE,
          formalPgr:
            false,
          professionalApproval:
            false,
          action:
            "pgr_support_document_generated",
        },
      },
      201,
    )
  }
  catch (error) {
    if (
      error instanceof
      Nr1ScopeError
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            error.code,
          message:
            error.message,
        },
        error.status,
      )
    }

    return jsonResponse(
      {
        ok: false,
        error:
          "pgr_support_document_post_unexpected",
        message:
          error instanceof Error
            ? error.message
            : "Unexpected error",
      },
      500,
    )
  }
}
