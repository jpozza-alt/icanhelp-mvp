import { NextRequest } from "next/server";
import {
  createNr1AdminClient,
  resolveNr1Scope,
  Nr1ScopeError,
} from "@/lib/server/nr1-scope";

const PGR_FORMALIZATION_ENABLED = false;

type JsonPayload = Record<string, unknown>;

function jsonResponse(payload: JsonPayload, status = 200) {
  return Response.json(payload, { status });
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getTenantId(req: NextRequest): string {
  return (
    cleanText(req.headers.get("x-icanhelp-tenant")) ||
    cleanText(req.nextUrl.searchParams.get("tenantId")) ||
    cleanText(req.nextUrl.searchParams.get("tenant_id"))
  );
}

function getEstablishmentId(req: NextRequest): string {
  return (
    cleanText(req.headers.get("x-icanhelp-establishment")) ||
    cleanText(req.nextUrl.searchParams.get("establishmentId")) ||
    cleanText(req.nextUrl.searchParams.get("establishment_id"))
  );
}

function normalizeBody(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readManualConfirmation(body: Record<string, unknown>): string {
  return cleanText(body.manual_confirmation ?? body.manualConfirmation ?? body.confirmation);
}

function readReason(body: Record<string, unknown>): string {
  return cleanText(body.reason) || "Disposable PGR document version created for safe UI final approval test.";
}

function readStatus(body: Record<string, unknown>): string {
  const value = cleanText(body.status);
  return value || "generated";
}

function readFileUrl(body: Record<string, unknown>): string | null {
  const value = cleanText(body.file_url ?? body.fileUrl);
  return value || null;
}

function isManualConfirmationValid(value: string): boolean {
  return value === "CREATE_DISPOSABLE_PGR_DOCUMENT_VERSION";
}

export async function GET() {
  return jsonResponse(
    {
      ok: false,
      error: "method_not_allowed",
      message: "Use POST with explicit manual confirmation to create a disposable PGR document version.",
    },
    405,
  );
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
    );
  }

  try {
    const tenantId = getTenantId(req);
    const establishmentId = getEstablishmentId(req);

    if (!tenantId) {
      return jsonResponse(
        {
          ok: false,
          error: "missing_tenant",
          message: "Missing tenant scope",
        },
        400,
      );
    }

    if (!establishmentId) {
      return jsonResponse(
        {
          ok: false,
          error: "missing_establishment_id",
          message: "establishment_id is required",
        },
        400,
      );
    }

    const body = normalizeBody(await req.json().catch(() => ({})));
    const manualConfirmation = readManualConfirmation(body);

    if (!isManualConfirmationValid(manualConfirmation)) {
      return jsonResponse(
        {
          ok: false,
          error: "manual_confirmation_required",
          code: "manual_confirmation_required",
          message: "To create a disposable PGR document version, send manual_confirmation=CREATE_DISPOSABLE_PGR_DOCUMENT_VERSION.",
        },
        409,
      );
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    });

    const adminClient = createNr1AdminClient();
    const generatedAt = new Date().toISOString();

    const latestResult = await adminClient
      .from("nr1_document_versions")
      .select("id, version")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .eq("document_type", "review_report")
      .order("version", { ascending: false })
      .limit(1);

    if (latestResult.error) {
      return jsonResponse(
        {
          ok: false,
          error: "disposable_pgr_latest_lookup_failed",
          message: latestResult.error.message,
        },
        500,
      );
    }

    const latestRows = latestResult.data ?? [];
    const previousVersion = latestRows.length > 0 ? latestRows[0] : null;
    const lastVersionNumber = Number(previousVersion?.version ?? 0);
    const nextVersion = Number.isFinite(lastVersionNumber) ? lastVersionNumber + 1 : 1;

    const sourceSnapshotJson = {
      snapshotType: "pgr_report_disposable_test_snapshot",
      disposable: true,
      testDocument: true,
      source: "dashboard/nr1/relatorio-pgr",
      reportType: "nr1_pgr_json",
      snapshotCreatedAt: generatedAt,
      reason: readReason(body),
      payload: {
        disposable: true,
        testDocument: true,
        warning: "This document version was created only for controlled UI final approval testing.",
        createdFor: "pgr_final_approval_ui_positive_test",
      },
    };

    const insertPayload = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      document_type: "review_report",
      source_snapshot_json: sourceSnapshotJson,
      version: nextVersion,
      generated_at: generatedAt,
      generated_by: scope.membership.user_id,
      status: readStatus(body),
      file_url: readFileUrl(body),
      supersedes_document_id: previousVersion?.id ?? null,
    };

    const insertResult = await adminClient
      .from("nr1_document_versions")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertResult.error) {
      return jsonResponse(
        {
          ok: false,
          error: "disposable_pgr_document_insert_failed",
          message: insertResult.error.message,
        },
        500,
      );
    }

    const documentVersion = insertResult.data;

    const auditPayload = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      module_name: "nr1",
      screen_key: "dashboard/nr1/relatorio-pgr",
      entity_type: "pgr_report_snapshot",
      entity_id: documentVersion.id,
      event_type: "pgr_report_disposable_test_snapshot_created",
      old_value_json: null,
      new_value_json: {
        tenantId: scope.tenantId,
        establishmentId,
        documentVersionId: documentVersion.id,
        documentType: "review_report",
        version: nextVersion,
        disposable: true,
        testDocument: true,
        source: "dashboard/nr1/relatorio-pgr",
        snapshotCreatedAt: generatedAt,
      },
      persistence_type: "formal_version",
      reason: "Disposable PGR snapshot created for controlled final approval UI test.",
      user_id: scope.membership.user_id,
    };

    const auditResult = await adminClient
      .from("nr1_audit_events")
      .insert(auditPayload)
      .select("*")
      .single();

    if (auditResult.error) {
      return jsonResponse(
        {
          ok: false,
          error: "disposable_pgr_audit_insert_failed",
          message: auditResult.error.message,
          data: documentVersion,
        },
        500,
      );
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
          disposable: true,
          testDocument: true,
          supersedesDocumentId: previousVersion?.id ?? null,
          action: "pgr_report_disposable_test_snapshot_created",
        },
      },
      201,
    );
  } catch (error) {
    if (error instanceof Nr1ScopeError) {
      return jsonResponse(
        {
          ok: false,
          error: error.code,
          message: error.message,
        },
        error.status,
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected disposable PGR document POST error";

    return jsonResponse(
      {
        ok: false,
        error: "disposable_pgr_document_post_unexpected",
        message,
      },
      500,
    );
  }
}

