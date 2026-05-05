import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type ApprovalStatus = "draft" | "approved";

function jsonError(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...extra,
    },
    { status }
  );
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }

  return value;
}

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

function getTenantId(req: NextRequest, body?: Record<string, unknown>) {
  const fromHeader =
    req.headers.get("x-icanhelp-tenant") ||
    req.headers.get("x-tenant-id") ||
    req.headers.get("x-tenant") ||
    "";

  const fromQuery = req.nextUrl.searchParams.get("tenant_id") || "";
  const fromBody = typeof body?.tenant_id === "string" ? body.tenant_id : "";

  return (fromHeader || fromQuery || fromBody).trim();
}

function getEstablishmentId(req: NextRequest, body?: Record<string, unknown>) {
  const fromHeader =
    req.headers.get("x-icanhelp-establishment") ||
    req.headers.get("x-establishment-id") ||
    req.headers.get("x-establishment") ||
    "";

  const fromQuery = req.nextUrl.searchParams.get("establishment_id") || "";
  const fromBody = typeof body?.establishment_id === "string" ? body.establishment_id : "";

  return (fromHeader || fromQuery || fromBody).trim();
}

function isAllowedApprovalStatus(value: unknown): value is ApprovalStatus {
  return value === "draft" || value === "approved";
}

function createScopedSupabase(req: NextRequest) {
  const token = getBearerToken(req);

  if (!token) {
    return {
      token,
      supabase: null,
    };
  }

  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return {
    token,
    supabase,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { token, supabase } = createScopedSupabase(req);

    if (!token || !supabase) {
      return jsonError("Unauthorized", 401);
    }

    const { data: userResult, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userResult.user) {
      return jsonError("Unauthorized", 401, {
        details: userError?.message || "User not found",
      });
    }

    const tenantId = getTenantId(req);
    const establishmentId = getEstablishmentId(req);
    const documentVersionId = req.nextUrl.searchParams.get("document_version_id") || "";

    if (!tenantId) {
      return jsonError("Missing tenant context", 400);
    }

    let query = supabase
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
          "approval_statement",
          "approved_at",
          "approved_by",
          "created_at",
          "created_by",
          "updated_at",
          "updated_by",
          "revoked_at",
          "revoked_by",
          "revocation_reason",
          "source_snapshot_json",
        ].join(",")
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (establishmentId) {
      query = query.eq("establishment_id", establishmentId);
    }

    if (documentVersionId) {
      query = query.eq("document_version_id", documentVersionId);
    }

    const { data, error } = await query;

    if (error) {
      return jsonError("Failed to list PGR approvals", 500, {
        details: error.message,
      });
    }

    return NextResponse.json({
      ok: true,
      approvals: data || [],
    });
  } catch (error) {
    return jsonError("Unexpected error on GET /api/nr1/pgr-approvals", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, supabase } = createScopedSupabase(req);

    if (!token || !supabase) {
      return jsonError("Unauthorized", 401);
    }

    const { data: userResult, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userResult.user) {
      return jsonError("Unauthorized", 401, {
        details: userError?.message || "User not found",
      });
    }

    const body = (await req.json()) as Record<string, unknown>;

    const tenantId = getTenantId(req, body);
    const establishmentId = getEstablishmentId(req, body);
    const documentVersionId =
      typeof body.document_version_id === "string" ? body.document_version_id.trim() : "";

    const professionalName =
      typeof body.professional_name === "string" ? body.professional_name.trim() : "";

    const approvalStatusRaw = body.approval_status || "draft";

    if (!tenantId) {
      return jsonError("Missing tenant context", 400);
    }

    if (!establishmentId) {
      return jsonError("Missing establishment context", 400);
    }

    if (!documentVersionId) {
      return jsonError("Missing document_version_id", 400);
    }

    if (!professionalName) {
      return jsonError("Missing professional_name", 400);
    }

    if (!isAllowedApprovalStatus(approvalStatusRaw)) {
      return jsonError("Invalid approval_status. Allowed: draft, approved", 400);
    }

    if (approvalStatusRaw === "approved") {
      return jsonError("Final PGR approval is not available in this draft route yet", 409, {
        code: "final_approval_requires_explicit_workflow",
        message:
          "Use approval_status=draft here. Final professional approval must use a dedicated explicit finalization workflow with responsibility confirmation and audit trail.",
      });
    }

    const { data: documentVersion, error: documentVersionError } = await supabase
      .from("nr1_document_versions")
      .select("id, tenant_id, establishment_id, document_type, status, version, source_snapshot_json, generated_at, generated_by")
      .eq("id", documentVersionId)
      .eq("tenant_id", tenantId)
      .eq("establishment_id", establishmentId)
      .single();

    if (documentVersionError || !documentVersion) {
      return jsonError("Document version not found for this tenant and establishment", 404, {
        details: documentVersionError?.message || "Not found",
      });
    }

    const now = new Date().toISOString();
    const approvalStatus = approvalStatusRaw;

    const approvalPayload = {
      tenant_id: tenantId,
      establishment_id: establishmentId,
      document_version_id: documentVersionId,
      approval_status: approvalStatus,
      professional_name: professionalName,
      professional_role:
        typeof body.professional_role === "string" ? body.professional_role.trim() : null,
      professional_council:
        typeof body.professional_council === "string" ? body.professional_council.trim() : null,
      professional_registration:
        typeof body.professional_registration === "string"
          ? body.professional_registration.trim()
          : null,
      professional_state:
        typeof body.professional_state === "string" ? body.professional_state.trim() : null,
      approval_statement:
        typeof body.approval_statement === "string" ? body.approval_statement.trim() : null,
      approved_at: null,
      approved_by: null,
      created_by: userResult.user.id,
      updated_by: userResult.user.id,
      source_snapshot_json: {
        document_version: documentVersion,
        approval_input: {
          approval_status: approvalStatus,
          professional_name: professionalName,
          professional_role:
            typeof body.professional_role === "string" ? body.professional_role.trim() : null,
          professional_council:
            typeof body.professional_council === "string" ? body.professional_council.trim() : null,
          professional_registration:
            typeof body.professional_registration === "string"
              ? body.professional_registration.trim()
              : null,
          professional_state:
            typeof body.professional_state === "string" ? body.professional_state.trim() : null,
        },
      },
    };

    const { data: insertedApproval, error: insertError } = await supabase
      .from("nr1_pgr_approvals")
      .insert(approvalPayload)
      .select("*")
      .single();

    if (insertError || !insertedApproval) {
      return jsonError("Failed to create PGR approval", 500, {
        details: insertError?.message || "Insert returned no data",
      });
    }
    const auditPayload = {
      tenant_id: tenantId,
      establishment_id: establishmentId,
      module_name: "nr1",
      screen_key: "pgr_report",
      entity_type: "pgr_professional_approval",
      entity_id: insertedApproval.id,
      event_type: "pgr_professional_approval_created",
      action: "inserted",
      old_value_json: null,
      new_value_json: insertedApproval,
      persistence_type: insertedApproval.approval_status === "approved" ? "formal" : "draft",
      reason: "Professional PGR approval created",
    };

    const auditResponse = await fetch(new URL("/api/nr1/audit-events", req.nextUrl.origin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-icanhelp-tenant": tenantId,
        "x-icanhelp-establishment": establishmentId,
      },
      body: JSON.stringify(auditPayload),
    });

    const auditPayloadResponse = await auditResponse.json().catch(() => null);

    if (!auditResponse.ok) {
      return jsonError("PGR approval was created, but audit event failed", 500, {
        approval: insertedApproval,
        audit_status: auditResponse.status,
        audit_error:
          auditPayloadResponse?.error ||
          auditPayloadResponse?.details ||
          "Audit route rejected the event",
      });
    }

    return NextResponse.json(
      {
        ok: true,
        approval: insertedApproval,
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError("Unexpected error on POST /api/nr1/pgr-approvals", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}






