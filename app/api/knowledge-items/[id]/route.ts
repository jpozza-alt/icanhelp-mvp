import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  hasKnowledgeDomainFeature,
  resolveTenantPlanFeatures,
} from "@/lib/server/tenant-plan-features";

export const dynamic = "force-dynamic";

type Ctx = {
  request_id: string;
  tenant: string;
  user: { id: string; email?: string | null };
  jwt: string;
};

const ALLOWED_DOMAINS = ["organizational", "governmental"] as const;
const ALLOWED_STATUSES = ["draft", "approved", "archived"] as const;

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
      console.error("[knowledge-items:id]", rid, "AUTH_GETUSER_FAILED", authErr);
      return unauthorized(rid, authErr?.message ?? "user_not_found");
    }

    const { data: isMember, error: rpcErr } = await supabase.rpc("is_tenant_member", {
      p_tenant: tenant,
    });

    if (rpcErr) {
      console.error("[knowledge-items:id]", rid, "RPC_is_tenant_member_FAILED", rpcErr);
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
    console.error("[knowledge-items:id]", rid, "GET_CTX_UNHANDLED", error);
    return serverError(rid, error instanceof Error ? error.message : "unknown_error");
  }
}

function isAllowedDomain(value: string) {
  return (ALLOWED_DOMAINS as readonly string[]).includes(value);
}

function isAllowedStatus(value: string) {
  return (ALLOWED_STATUSES as readonly string[]).includes(value);
}

function toTextOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

async function getExistingItem(
  supabase: ReturnType<typeof createUserSupabase>,
  tenant: string,
  id: string
) {
  return await supabase
    .from("knowledge_items")
    .select(
      "id,tenant_id,domain,category,title,summary,body,foundation_type,foundation_reference,status,version,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by"
    )
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
      console.error("[knowledge-items:id]", ctx.request_id, "DETAIL_SELECT_FAILED", error);
      return serverError(ctx.request_id, error.message || "detail_select_failed");
    }

    if (!data) {
      return notFound(ctx.request_id, "knowledge_item_not_found");
    }

    const access = await resolveTenantPlanFeatures(ctx.tenant);
    if (!hasKnowledgeDomainFeature(access, String(data.domain || ""))) {
      return deny(ctx.request_id);
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
    console.error("[knowledge-items:id]", ctx.request_id, "GET_UNHANDLED", error);
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
      console.error("[knowledge-items:id]", ctx.request_id, "JSON_PARSE_FAILED", e);
      return null;
    });

    const supabase = createUserSupabase(ctx.jwt);
    const existing = await getExistingItem(supabase, ctx.tenant, id);

    if (existing.error) {
      console.error("[knowledge-items:id]", ctx.request_id, "LOAD_EXISTING_FAILED", existing.error);
      return serverError(ctx.request_id, existing.error.message || "load_existing_failed");
    }

    if (!existing.data) {
      return notFound(ctx.request_id, "knowledge_item_not_found");
    }

    const access = await resolveTenantPlanFeatures(ctx.tenant);
    if (!hasKnowledgeDomainFeature(access, String(existing.data.domain || ""))) {
      return deny(ctx.request_id);
    }

    const updates: Record<string, unknown> = {};
    let changed = false;

    if (body && Object.prototype.hasOwnProperty.call(body, "domain")) {
      const domain = body?.domain?.toString?.().trim?.();
      if (!domain || !isAllowedDomain(domain)) {
        return badRequest(ctx.request_id, "Invalid domain.");
      }
      if (!hasKnowledgeDomainFeature(access, domain)) {
        return deny(ctx.request_id);
      }
      updates.domain = domain;
      changed = true;
    }

    if (body && Object.prototype.hasOwnProperty.call(body, "category")) {
      const category = body?.category?.toString?.().trim?.();
      if (!category) {
        return badRequest(ctx.request_id, "Invalid category.");
      }
      updates.category = category;
      changed = true;
    }

    if (body && Object.prototype.hasOwnProperty.call(body, "title")) {
      const title = body?.title?.toString?.().trim?.();
      if (!title) {
        return badRequest(ctx.request_id, "Invalid title.");
      }
      updates.title = title;
      changed = true;
    }

    if (body && Object.prototype.hasOwnProperty.call(body, "summary")) {
      updates.summary = toTextOrNull(body?.summary);
      changed = true;
    }

    if (body && Object.prototype.hasOwnProperty.call(body, "body")) {
      const contentBody = body?.body?.toString?.().trim?.();
      if (!contentBody) {
        return badRequest(ctx.request_id, "Invalid body.");
      }
      updates.body = contentBody;
      changed = true;
    }

    if (body && Object.prototype.hasOwnProperty.call(body, "foundation_type")) {
      updates.foundation_type = toTextOrNull(body?.foundation_type);
      changed = true;
    }

    if (body && Object.prototype.hasOwnProperty.call(body, "foundation_reference")) {
      updates.foundation_reference = toTextOrNull(body?.foundation_reference);
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

    if (!changed) {
      return badRequest(ctx.request_id, "No valid fields provided for update.");
    }

    updates.version = Number(existing.data.version || 1) + 1;
    updates.updated_by = ctx.user.id;

    const { data, error } = await supabase
      .from("knowledge_items")
      .update(updates)
      .eq("tenant_id", ctx.tenant)
      .eq("id", id)
      .is("deleted_at", null)
      .select(
        "id,tenant_id,domain,category,title,summary,body,foundation_type,foundation_reference,status,version,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by"
      )
      .single();

    if (error) {
      console.error("[knowledge-items:id]", ctx.request_id, "UPDATE_FAILED", error);
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
    console.error("[knowledge-items:id]", ctx.request_id, "PATCH_UNHANDLED", error);
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
      console.error("[knowledge-items:id]", ctx.request_id, "LOAD_EXISTING_FAILED", existing.error);
      return serverError(ctx.request_id, existing.error.message || "load_existing_failed");
    }

    if (!existing.data) {
      return notFound(ctx.request_id, "knowledge_item_not_found");
    }

    const access = await resolveTenantPlanFeatures(ctx.tenant);
    if (!hasKnowledgeDomainFeature(access, String(existing.data.domain || ""))) {
      return deny(ctx.request_id);
    }

    const { error } = await supabase
      .from("knowledge_items")
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
      console.error("[knowledge-items:id]", ctx.request_id, "SOFT_DELETE_FAILED", error);
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
    console.error("[knowledge-items:id]", ctx.request_id, "DELETE_UNHANDLED", error);
    return serverError(
      ctx.request_id,
      error instanceof Error ? error.message : "unknown_error"
    );
  }
}
