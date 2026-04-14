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
      console.error("[nr1-assessments]", rid, "AUTH_GETUSER_FAILED", authErr);
      return unauthorized(rid, authErr?.message ?? "user_not_found");
    }

    const { data: isMember, error: rpcErr } = await supabase.rpc("is_tenant_member", {
      p_tenant: tenant,
    });

    if (rpcErr) {
      console.error("[nr1-assessments]", rid, "RPC_is_tenant_member_FAILED", rpcErr);
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
    console.error("[nr1-assessments]", rid, "GET_CTX_UNHANDLED", error);
    return serverError(rid, error instanceof Error ? error.message : "unknown_error");
  }
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt((value || "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  if (parsed > max) return max;
  return parsed;
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

function escapeLike(value: string) {
  return value.replace(/[%_,]/g, " ");
}

export async function GET(req: NextRequest) {
  const ctxOrRes = await getCtx(req);
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const ctx = ctxOrRes;

  try {
    const supabase = createUserSupabase(ctx.jwt);
    const url = new URL(req.url);

    const status = url.searchParams.get("status")?.trim() || null;
    const riskCategory = url.searchParams.get("risk_category")?.trim() || null;
    const riskPriority = url.searchParams.get("risk_priority")?.trim() || null;
    const sectorName = url.searchParams.get("sector_name")?.trim() || null;
    const activityName = url.searchParams.get("activity_name")?.trim() || null;
    const q = url.searchParams.get("q")?.trim() || null;
    const includeDeleted = (url.searchParams.get("include_deleted")?.trim() || "").toLowerCase() === "true";

    const limit = parsePositiveInt(url.searchParams.get("limit"), 20, 100);
    const offset = parsePositiveInt(url.searchParams.get("offset"), 0, 10000);

    if (status && !isAllowedStatus(status)) {
      return badRequest(ctx.request_id, "Invalid status.");
    }

    if (riskCategory && !isAllowedRiskCategory(riskCategory)) {
      return badRequest(ctx.request_id, "Invalid risk_category.");
    }

    let query = supabase
      .from("nr1_assessments")
      .select(
        "id,tenant_id,establishment_name,unit_name,sector_name,activity_name,risk_category,risk_type,hazard_title,risk_level,risk_priority,status,version,updated_at,deleted_at",
        { count: "exact" }
      )
      .eq("tenant_id", ctx.tenant)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (riskCategory) {
      query = query.eq("risk_category", riskCategory);
    }

    if (riskPriority) {
      query = query.eq("risk_priority", riskPriority);
    }

    if (sectorName) {
      query = query.eq("sector_name", sectorName);
    }

    if (activityName) {
      query = query.eq("activity_name", activityName);
    }

    if (q) {
      const escaped = escapeLike(q);
      query = query.or(
        "establishment_name.ilike.%" +
          escaped +
          "%,sector_name.ilike.%" +
          escaped +
          "%,activity_name.ilike.%" +
          escaped +
          "%,hazard_title.ilike.%" +
          escaped +
          "%,hazard_description.ilike.%" +
          escaped +
          "%"
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[nr1-assessments]", ctx.request_id, "SELECT_FAILED", error);
      return serverError(ctx.request_id, error.message || "select_failed");
    }

    return json(
      {
        ok: true,
        request_id: ctx.request_id,
        items: data ?? [],
        count: count ?? 0,
        limit,
        offset,
      },
      200
    );
  } catch (error) {
    console.error("[nr1-assessments]", ctx.request_id, "GET_UNHANDLED", error);
    return serverError(
      ctx.request_id,
      error instanceof Error ? error.message : "unknown_error"
    );
  }
}

export async function POST(req: NextRequest) {
  const ctxOrRes = await getCtx(req);
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const ctx = ctxOrRes;

  try {
    const body = await req.json().catch((e) => {
      console.error("[nr1-assessments]", ctx.request_id, "JSON_PARSE_FAILED", e);
      return null;
    });

    const establishmentName = body?.establishment_name?.toString?.().trim?.();
    const activityName = body?.activity_name?.toString?.().trim?.();
    const riskCategory = body?.risk_category?.toString?.().trim?.();
    const hazardTitle = body?.hazard_title?.toString?.().trim?.();
    const hazardDescription = body?.hazard_description?.toString?.().trim?.();
    const sourceOrCircumstance = body?.source_or_circumstance?.toString?.().trim?.();
    const exposedGroupDescription = body?.exposed_group_description?.toString?.().trim?.();
    const possibleEffects = body?.possible_injuries_or_health_effects?.toString?.().trim?.();

    const severityLevel = toIntOrNull(body?.severity_level);
    const probabilityLevel = toIntOrNull(body?.probability_level);

    if (!establishmentName) {
      return badRequest(ctx.request_id, "Missing required field: establishment_name.");
    }

    if (!activityName) {
      return badRequest(ctx.request_id, "Missing required field: activity_name.");
    }

    if (!riskCategory || !isAllowedRiskCategory(riskCategory)) {
      return badRequest(ctx.request_id, "Invalid or missing risk_category.");
    }

    if (!hazardTitle) {
      return badRequest(ctx.request_id, "Missing required field: hazard_title.");
    }

    if (!hazardDescription) {
      return badRequest(ctx.request_id, "Missing required field: hazard_description.");
    }

    if (!sourceOrCircumstance) {
      return badRequest(ctx.request_id, "Missing required field: source_or_circumstance.");
    }

    if (!exposedGroupDescription) {
      return badRequest(ctx.request_id, "Missing required field: exposed_group_description.");
    }

    if (!possibleEffects) {
      return badRequest(ctx.request_id, "Missing required field: possible_injuries_or_health_effects.");
    }

    if (!severityLevel || severityLevel < 1 || severityLevel > 5) {
      return badRequest(ctx.request_id, "Invalid severity_level.");
    }

    if (!probabilityLevel || probabilityLevel < 1 || probabilityLevel > 5) {
      return badRequest(ctx.request_id, "Invalid probability_level.");
    }

    const riskFields = computeRiskFields(severityLevel, probabilityLevel);
    const status = body?.status?.toString?.().trim?.() || "draft";

    if (!isAllowedStatus(status)) {
      return badRequest(ctx.request_id, "Invalid status.");
    }

    const payload = {
      tenant_id: ctx.tenant,
      establishment_name: establishmentName,
      unit_name: toTextOrNull(body?.unit_name),
      sector_name: toTextOrNull(body?.sector_name),
      activity_name: activityName,
      process_description: toTextOrNull(body?.process_description),
      environment_description: toTextOrNull(body?.environment_description),
      risk_category: riskCategory,
      risk_type: toTextOrNull(body?.risk_type),
      hazard_title: hazardTitle,
      hazard_description: hazardDescription,
      source_or_circumstance: sourceOrCircumstance,
      external_hazard_flag: toBooleanOrNull(body?.external_hazard_flag) ?? false,
      exposed_group_description: exposedGroupDescription,
      workers_count_estimate: toIntOrNull(body?.workers_count_estimate),
      exposure_characterization: toTextOrNull(body?.exposure_characterization),
      routine_flag: toBooleanOrNull(body?.routine_flag),
      change_related_flag: toBooleanOrNull(body?.change_related_flag),
      possible_injuries_or_health_effects: possibleEffects,
      existing_prevention_measures: toTextOrNull(body?.existing_prevention_measures),
      prevention_effectiveness_notes: toTextOrNull(body?.prevention_effectiveness_notes),
      severity_level: severityLevel,
      probability_level: probabilityLevel,
      risk_level: riskFields.risk_level,
      risk_priority: riskFields.risk_priority,
      immediate_action_required_flag: riskFields.immediate_action_required_flag,
      action_plan_needed_flag: riskFields.action_plan_needed_flag,
      recommended_action_summary: toTextOrNull(body?.recommended_action_summary),
      monitoring_notes: toTextOrNull(body?.monitoring_notes),
      status,
      version: 1,
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
    };

    const supabase = createUserSupabase(ctx.jwt);

    const { data, error } = await supabase
      .from("nr1_assessments")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[nr1-assessments]", ctx.request_id, "INSERT_FAILED", error);
      return serverError(ctx.request_id, error.message || "insert_failed");
    }

    return json(
      {
        ok: true,
        request_id: ctx.request_id,
        item: data,
      },
      201
    );
  } catch (error) {
    console.error("[nr1-assessments]", ctx.request_id, "POST_UNHANDLED", error);
    return serverError(
      ctx.request_id,
      error instanceof Error ? error.message : "unknown_error"
    );
  }
}