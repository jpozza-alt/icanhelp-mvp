import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Ctx = {
  request_id: string;
  tenant: string;
  user: { id: string; email?: string | null };
  jwt: string;
};

const ALLOWED_STATUSES = ["draft", "reviewed", "approved", "archived"] as const;
const ALLOWED_RISK_CATEGORIES = [
  "physical",
  "chemical",
  "biological",
  "ergonomic",
  "psychosocial_related_to_work",
  "accident",
] as const;

function requestId() {
  return crypto.randomUUID();
}

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status });
}

function deny(rid: string) {
  return json(
    {
      ok: false,
      code: "forbidden",
      message: "Access denied for this tenant.",
      request_id: rid,
    },
    403
  );
}

function badRequest(rid: string, message: string) {
  return json({ ok: false, code: "bad_request", message, request_id: rid }, 400);
}

function unauthorized(rid: string, message: string) {
  return json({ ok: false, code: "unauthorized", message, request_id: rid }, 401);
}

function notFound(rid: string, message = "not_found") {
  return json({ ok: false, code: "not_found", message, request_id: rid }, 404);
}

function serverError(rid: string, message = "internal_error") {
  return json({ ok: false, code: "internal_error", message, request_id: rid }, 500);
}

function getEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error("Missing env: " + name);
  }
  return value;
}

function getBearer(req: NextRequest) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");

  if (!authHeader) return null;

  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) return null;

  const token = authHeader.slice(prefix.length).trim();
  return token || null;
}

function createUserSupabase(token: string) {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseAnonKey || !supabaseAnonKey.trim()) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: "Bearer " + token,
      },
    },
  });
}

async function getCtx(req: NextRequest): Promise<Ctx | NextResponse> {
  const rid = requestId();

  try {
    const tenant = req.headers.get("x-icanhelp-tenant")?.trim();
    if (!tenant) {
      return badRequest(rid, "Required header missing: x-icanhelp-tenant.");
    }

    const token = getBearer(req);
    if (!token) {
      return unauthorized(rid, "Authorization Bearer token missing or invalid.");
    }

    const supabase = createUserSupabase(token);
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData.user) {
      console.error("[nr1-assessments:id]", rid, "AUTH_GETUSER_FAILED", authErr);
      return unauthorized(rid, authErr?.message ?? "user_not_found");
    }

    const { data: isMember, error: rpcErr } = await supabase.rpc("is_tenant_member", {
      p_tenant: tenant,
    });

    if (rpcErr) {
      console.error("[nr1-assessments:id]", rid, "RPC_is_tenant_member_FAILED", rpcErr);
      return serverError(rid, rpcErr.message || "rpc_is_tenant_member_failed");
    }

    if (!isMember) {
      return deny(rid);
    }

    return {
      request_id: rid,
      tenant,
      user: {
        id: authData.user.id,
        email: authData.user.email ?? null,
      },
      jwt: token,
    };
  } catch (error) {
    console.error("[nr1-assessments:id]", rid, "GET_CTX_UNHANDLED", error);
    return serverError(rid, error instanceof Error ? error.message : "unknown_error");
  }
}

function toTextOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function toBooleanOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function toIntOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isAllowedStatus(value: string) {
  return (ALLOWED_STATUSES as readonly string[]).includes(value);
}

function isAllowedRiskCategory(value: string) {
  return (ALLOWED_RISK_CATEGORIES as readonly string[]).includes(value);
}

function computeRiskFields(severityLevel: number | null, probabilityLevel: number | null) {
  if (!severityLevel || !probabilityLevel) {
    return {
      risk_level: null,
      risk_priority: null,
      immediate_action_required_flag: false,
      action_plan_needed_flag: false,
    };
  }

  const score = severityLevel * probabilityLevel;

  let level = "low";
  if (score >= 20) {
    level = "very_high";
  } else if (score >= 12) {
    level = "high";
  } else if (score >= 6) {
    level = "medium";
  }

  return {
    risk_level: level,
    risk_priority: level,
    immediate_action_required_flag: level === "very_high",
    action_plan_needed_flag: level === "medium" || level === "high" || level === "very_high",
  };
}

async function getExistingItem(
  supabase: ReturnType<typeof createUserSupabase>,
  tenant: string,
  id: string
) {
  return await supabase
    .from("nr1_assessments")
    .select("*")
    .eq("tenant_id", tenant)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctxOrRes = await getCtx(req);
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const ctx = ctxOrRes;

  try {
    const params = await context.params;
    const id = params?.id?.trim();

    if (!id) {
      return badRequest(ctx.request_id, "Missing route param: id.");
    }

    const supabase = createUserSupabase(ctx.jwt);
    const { data, error } = await getExistingItem(supabase, ctx.tenant, id);

    if (error) {
      console.error("[nr1-assessments:id]", ctx.request_id, "DETAIL_SELECT_FAILED", error);
      return serverError(ctx.request_id, error.message || "detail_select_failed");
    }

    if (!data) {
      return notFound(ctx.request_id, "nr1_assessment_not_found");
    }

    return json(
      {
        ok: true,
        request_id: ctx.request_id,
        item: data,
      },
      200
    );
  } catch (error) {
    console.error("[nr1-assessments:id]", ctx.request_id, "GET_UNHANDLED", error);
    return serverError(
      ctx.request_id,
      error instanceof Error ? error.message : "unknown_error"
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctxOrRes = await getCtx(req);
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const ctx = ctxOrRes;

  try {
    const params = await context.params;
    const id = params?.id?.trim();

    if (!id) {
      return badRequest(ctx.request_id, "Missing route param: id.");
    }

    const body = await req.json().catch((e) => {
      console.error("[nr1-assessments:id]", ctx.request_id, "JSON_PARSE_FAILED", e);
      return null;
    });

    const supabase = createUserSupabase(ctx.jwt);
    const existing = await getExistingItem(supabase, ctx.tenant, id);

    if (existing.error) {
      console.error("[nr1-assessments:id]", ctx.request_id, "LOAD_EXISTING_FAILED", existing.error);
      return serverError(ctx.request_id, existing.error.message || "load_existing_failed");
    }

    if (!existing.data) {
      return notFound(ctx.request_id, "nr1_assessment_not_found");
    }

    const updates: Record<string, unknown> = {};
    let changed = false;

    const textFields = [
      "establishment_name",
      "unit_name",
      "sector_name",
      "activity_name",
      "process_description",
      "environment_description",
      "risk_type",
      "hazard_title",
      "hazard_description",
      "source_or_circumstance",
      "exposed_group_description",
      "exposure_characterization",
      "possible_injuries_or_health_effects",
      "existing_prevention_measures",
      "prevention_effectiveness_notes",
      "recommended_action_summary",
      "monitoring_notes",
    ];

    for (const field of textFields) {
      if (body && Object.prototype.hasOwnProperty.call(body, field)) {
        updates[field] = toTextOrNull(body[field]);
        changed = true;
      }
    }

    if (body && Object.prototype.hasOwnProperty.call(body, "risk_category")) {
      const riskCategory = body?.risk_category?.toString?.().trim?.();
      if (!riskCategory || !isAllowedRiskCategory(riskCategory)) {
        return badRequest(ctx.request_id, "Invalid risk_category.");
      }
      updates.risk_category = riskCategory;
      changed = true;
    }

    if (body && Object.prototype.hasOwnProperty.call(body, "status")) {
      const status = body?.status?.toString?.().trim?.();
      if (!status || !isAllowedStatus(status)) {
        return badRequest(ctx.request_id, "Invalid status.");
      }
      updates.status = status;
      changed = true;
    }

    const booleanFields = [
      "external_hazard_flag",
      "routine_flag",
      "change_related_flag",
    ];

    for (const field of booleanFields) {
      if (body && Object.prototype.hasOwnProperty.call(body, field)) {
        updates[field] = toBooleanOrNull(body[field]);
        changed = true;
      }
    }

    if (body && Object.prototype.hasOwnProperty.call(body, "workers_count_estimate")) {
      updates.workers_count_estimate = toIntOrNull(body?.workers_count_estimate);
      changed = true;
    }

    let severityLevel = existing.data.severity_level as number | null;
    let probabilityLevel = existing.data.probability_level as number | null;

    if (body && Object.prototype.hasOwnProperty.call(body, "severity_level")) {
      const parsed = toIntOrNull(body?.severity_level);
      if (!parsed || parsed < 1 || parsed > 5) {
        return badRequest(ctx.request_id, "Invalid severity_level.");
      }
      severityLevel = parsed;
      updates.severity_level = parsed;
      changed = true;
    }

    if (body && Object.prototype.hasOwnProperty.call(body, "probability_level")) {
      const parsed = toIntOrNull(body?.probability_level);
      if (!parsed || parsed < 1 || parsed > 5) {
        return badRequest(ctx.request_id, "Invalid probability_level.");
      }
      probabilityLevel = parsed;
      updates.probability_level = parsed;
      changed = true;
    }

    if (!changed) {
      return badRequest(ctx.request_id, "No valid fields provided for update.");
    }

    const riskFields = computeRiskFields(severityLevel, probabilityLevel);
    updates.risk_level = riskFields.risk_level;
    updates.risk_priority = riskFields.risk_priority;
    updates.immediate_action_required_flag = riskFields.immediate_action_required_flag;
    updates.action_plan_needed_flag = riskFields.action_plan_needed_flag;
    updates.version = Number(existing.data.version || 1) + 1;
    updates.updated_by = ctx.user.id;

    const { data, error } = await supabase
      .from("nr1_assessments")
      .update(updates)
      .eq("tenant_id", ctx.tenant)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      console.error("[nr1-assessments:id]", ctx.request_id, "UPDATE_FAILED", error);
      return serverError(ctx.request_id, error.message || "update_failed");
    }

    return json(
      {
        ok: true,
        request_id: ctx.request_id,
        item: data,
      },
      200
    );
  } catch (error) {
    console.error("[nr1-assessments:id]", ctx.request_id, "PATCH_UNHANDLED", error);
    return serverError(
      ctx.request_id,
      error instanceof Error ? error.message : "unknown_error"
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctxOrRes = await getCtx(req);
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const ctx = ctxOrRes;

  try {
    const params = await context.params;
    const id = params?.id?.trim();

    if (!id) {
      return badRequest(ctx.request_id, "Missing route param: id.");
    }

    const supabase = createUserSupabase(ctx.jwt);
    const existing = await getExistingItem(supabase, ctx.tenant, id);

    if (existing.error) {
      console.error("[nr1-assessments:id]", ctx.request_id, "LOAD_EXISTING_FAILED", existing.error);
      return serverError(ctx.request_id, existing.error.message || "load_existing_failed");
    }

    if (!existing.data) {
      return notFound(ctx.request_id, "nr1_assessment_not_found");
    }

    const { error } = await supabase
      .from("nr1_assessments")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: ctx.user.id,
        updated_by: ctx.user.id,
        version: Number(existing.data.version || 1) + 1,
      })
      .eq("tenant_id", ctx.tenant)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      console.error("[nr1-assessments:id]", ctx.request_id, "SOFT_DELETE_FAILED", error);
      return serverError(ctx.request_id, error.message || "soft_delete_failed");
    }

    return json(
      {
        ok: true,
        request_id: ctx.request_id,
      },
      200
    );
  } catch (error) {
    console.error("[nr1-assessments:id]", ctx.request_id, "DELETE_UNHANDLED", error);
    return serverError(
      ctx.request_id,
      error instanceof Error ? error.message : "unknown_error"
    );
  }
}