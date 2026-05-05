import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type FinalizeBody = {
  tenant_id?: unknown;
  establishment_id?: unknown;
  document_version_id?: unknown;
  professional_name?: unknown;
  professional_role?: unknown;
  professional_council?: unknown;
  professional_registration?: unknown;
  professional_state?: unknown;
  approval_statement?: unknown;
  responsibility_confirmation?: unknown;
  final_confirmation?: unknown;
};

function jsonError(error: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...extra,
    },
    { status }
  );
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error("Missing required env: " + name);
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

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getTenantId(req: NextRequest, body?: FinalizeBody) {
  const fromHeader =
    req.headers.get("x-icanhelp-tenant") ||
    req.headers.get("x-tenant-id") ||
    req.headers.get("x-tenant") ||
    "";

  const fromQuery =
    req.nextUrl.searchParams.get("tenant_id") ||
    req.nextUrl.searchParams.get("tenantId") ||
    "";

  const fromBody = cleanText(body?.tenant_id);

  return (fromHeader || fromQuery || fromBody).trim();
}

function getEstablishmentId(req: NextRequest, body?: FinalizeBody) {
  const fromHeader =
    req.headers.get("x-icanhelp-establishment") ||
    req.headers.get("x-establishment-id") ||
    req.headers.get("x-establishment") ||
    "";

  const fromQuery =
    req.nextUrl.searchParams.get("establishment_id") ||
    req.nextUrl.searchParams.get("establishmentId") ||
    "";

  const fromBody = cleanText(body?.establishment_id);

  return (fromHeader || fromQuery || fromBody).trim();
}

function isTrue(value: unknown) {
  return value === true || value === "true" || value === "TRUE" || value === "1";
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
        Authorization: "Bearer " + token,
      },
    },
  });

  return {
    token,
    supabase,
  };
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

    const body = (await req.json()) as FinalizeBody;

    const tenantId = getTenantId(req, body);
    const establishmentId = getEstablishmentId(req, body);
    const documentVersionId = cleanText(body.document_version_id);

    const professionalName = cleanText(body.professional_name);
    const professionalRole = cleanText(body.professional_role);
    const professionalCouncil = cleanText(body.professional_council);
    const professionalRegistration = cleanText(body.professional_registration);
    const professionalState = cleanText(body.professional_state);
    const approvalStatement = cleanText(body.approval_statement);

    const responsibilityConfirmation = isTrue(body.responsibility_confirmation);
    const finalConfirmation = isTrue(body.final_confirmation);

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

    if (!professionalRole) {
      return jsonError("Missing professional_role", 400);
    }

    if (!professionalCouncil) {
      return jsonError("Missing professional_council", 400);
    }

    if (!professionalRegistration) {
      return jsonError("Missing professional_registration", 400);
    }

    if (!professionalState) {
      return jsonError("Missing professional_state", 400);
    }

    if (!approvalStatement) {
      return jsonError("Missing approval_statement", 400);
    }

    if (!responsibilityConfirmation) {
      return jsonError("Responsibility confirmation is required", 409, {
        code: "responsibility_confirmation_required",
        message: "Final PGR approval requires explicit technical responsibility confirmation.",
      });
    }

    if (!finalConfirmation) {
      return jsonError("Final confirmation is required", 409, {
        code: "final_confirmation_required",
        message: "Final PGR approval requires explicit final confirmation.",
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

    const { data: existingApprovals, error: existingApprovalError } = await supabase
      .from("nr1_pgr_approvals")
      .select("id, approval_status, revoked_at")
      .eq("tenant_id", tenantId)
      .eq("establishment_id", establishmentId)
      .eq("document_version_id", documentVersionId)
      .eq("approval_status", "approved")
      .is("revoked_at", null)
      .limit(1);

    if (existingApprovalError) {
      return jsonError("Failed to check existing PGR approval", 500, {
        details: existingApprovalError.message,
      });
    }

    if ((existingApprovals || []).length > 0) {
      return jsonError("PGR document version already has a final approval", 409, {
        code: "pgr_final_approval_already_exists",
      });
    }

    const now = new Date().toISOString();

    const approvalInput = {
      professional_name: professionalName,
      professional_role: professionalRole,
      professional_council: professionalCouncil,
      professional_registration: professionalRegistration,
      professional_state: professionalState,
      approval_statement: approvalStatement,
      responsibility_confirmation: true,
      final_confirmation: true,
    };

    const approvalPayload = {
      tenant_id: tenantId,
      establishment_id: establishmentId,
      document_version_id: documentVersionId,
      approval_status: "approved",
      professional_name: professionalName,
      professional_role: professionalRole,
      professional_council: professionalCouncil,
      professional_registration: professionalRegistration,
      professional_state: professionalState,
      approval_statement: approvalStatement,
      approved_at: now,
      approved_by: userResult.user.id,
      created_by: userResult.user.id,
      updated_by: userResult.user.id,
      source_snapshot_json: {
        document_version: documentVersion,
        approval_input: approvalInput,
        finalized_at: now,
      },
    };

    const { data: insertedApproval, error: insertError } = await supabase
      .from("nr1_pgr_approvals")
      .insert(approvalPayload)
      .select("*")
      .single();

    if (insertError || !insertedApproval) {
      return jsonError("Failed to create final PGR approval", 500, {
        details: insertError?.message || "Insert returned no data",
      });
    }

    const auditPayload = {
      tenant_id: tenantId,
      establishment_id: establishmentId,
      module_name: "nr1",
      entity_type: "pgr_approval",
      entity_id: insertedApproval.id,
      event_type: "pgr_final_approval_created",
      old_value_json: null,
      new_value_json: {
        approval: insertedApproval,
        document_version_id: documentVersionId,
        responsibility_confirmation: true,
        final_confirmation: true,
      },
      persistence_type: "formal_version",
      created_by: userResult.user.id,
    };

    const { data: insertedAuditEvent, error: auditError } = await supabase
      .from("nr1_audit_events")
      .insert(auditPayload)
      .select("*")
      .single();

    if (auditError || !insertedAuditEvent) {
      await supabase
        .from("nr1_pgr_approvals")
        .update({
          revoked_at: now,
          revoked_by: userResult.user.id,
          revocation_reason: "audit_event_insert_failed",
          updated_by: userResult.user.id,
        })
        .eq("id", insertedApproval.id)
        .eq("tenant_id", tenantId)
        .eq("establishment_id", establishmentId);

      return jsonError("Final PGR approval was not completed because audit event creation failed", 500, {
        details: auditError?.message || "Audit insert returned no data",
        code: "pgr_final_approval_audit_failed",
      });
    }

    return NextResponse.json(
      {
        ok: true,
        approval: insertedApproval,
        audit_event: insertedAuditEvent,
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError("Unexpected error on POST /api/nr1/pgr-approvals/finalize", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
