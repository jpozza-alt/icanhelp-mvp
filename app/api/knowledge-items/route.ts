import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Ctx = {
  request_id: string;
  tenant: string;
  user: { id: string; email?: string | null };
  jwt: string;
};

type KnowledgeItemRow = {
  id: string;
  tenant_id: string;
  domain: string;
  category: string;
  title: string;
  summary: string | null;
  body: string;
  foundation_type: string | null;
  foundation_reference: string | null;
  status: string;
  version: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
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
      console.error("[knowledge-items]", rid, "AUTH_GETUSER_FAILED", authErr);
      return unauthorized(rid, authErr?.message ?? "user_not_found");
    }

    const { data: isMember, error: rpcErr } = await supabase.rpc("is_tenant_member", {
      p_tenant: tenant,
    });

    if (rpcErr) {
      console.error("[knowledge-items]", rid, "RPC_is_tenant_member_FAILED", rpcErr);
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
    console.error("[knowledge-items]", rid, "GET_CTX_UNHANDLED", error);
    return serverError(rid, error instanceof Error ? error.message : "unknown_error");
  }
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt((value || "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  if (parsed > max) return max;
  return parsed;
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

    const domain = url.searchParams.get("domain")?.trim() || null;
    const status = url.searchParams.get("status")?.trim() || null;
    const category = url.searchParams.get("category")?.trim() || null;
    const q = url.searchParams.get("q")?.trim() || null;

    const limit = parsePositiveInt(url.searchParams.get("limit"), 20, 100);
    const offset = parsePositiveInt(url.searchParams.get("offset"), 0, 10000);

    if (domain && !isAllowedDomain(domain)) {
      return badRequest(ctx.request_id, "Invalid domain.");
    }

    if (status && !isAllowedStatus(status)) {
      return badRequest(ctx.request_id, "Invalid status.");
    }

    let query = supabase
      .from("knowledge_items")
      .select(
        "id,tenant_id,domain,category,title,summary,body,foundation_type,foundation_reference,status,version,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by",
        { count: "exact" }
      )
      .eq("tenant_id", ctx.tenant)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (domain) {
      query = query.eq("domain", domain);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (q) {
      const escaped = escapeLike(q);
      query = query.or(
        "title.ilike.%" +
          escaped +
          "%,summary.ilike.%" +
          escaped +
          "%,body.ilike.%" +
          escaped +
          "%"
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[knowledge-items]", ctx.request_id, "SELECT_FAILED", error);
      return serverError(ctx.request_id, error.message || "select_failed");
    }

    const items = ((data ?? []) as KnowledgeItemRow[]).map((item) => ({
      id: item.id,
      tenant_id: item.tenant_id,
      domain: item.domain,
      category: item.category,
      title: item.title,
      summary: item.summary,
      status: item.status,
      version: item.version,
      updated_at: item.updated_at,
    }));

    return json(
      {
        ok: true,
        request_id: ctx.request_id,
        items,
        count: count ?? items.length,
        limit,
        offset,
      },
      200
    );
  } catch (error) {
    console.error("[knowledge-items]", ctx.request_id, "GET_UNHANDLED", error);
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
      console.error("[knowledge-items]", ctx.request_id, "JSON_PARSE_FAILED", e);
      return null;
    });

    const domain = body?.domain?.toString?.().trim?.();
    const category = body?.category?.toString?.().trim?.();
    const title = body?.title?.toString?.().trim?.();
    const summary = toTextOrNull(body?.summary);
    const contentBody = body?.body?.toString?.().trim?.();
    const foundationType = toTextOrNull(body?.foundation_type);
    const foundationReference = toTextOrNull(body?.foundation_reference);
    const status = body?.status?.toString?.().trim?.() || "draft";

    if (!domain || !isAllowedDomain(domain)) {
      return badRequest(ctx.request_id, "Invalid or missing domain.");
    }

    if (!category) {
      return badRequest(ctx.request_id, "Missing required field: category.");
    }

    if (!title) {
      return badRequest(ctx.request_id, "Missing required field: title.");
    }

    if (!contentBody) {
      return badRequest(ctx.request_id, "Missing required field: body.");
    }

    if (!isAllowedStatus(status)) {
      return badRequest(ctx.request_id, "Invalid status.");
    }

    const supabase = createUserSupabase(ctx.jwt);

    const { data, error } = await supabase
      .from("knowledge_items")
      .insert({
        tenant_id: ctx.tenant,
        domain,
        category,
        title,
        summary,
        body: contentBody,
        foundation_type: foundationType,
        foundation_reference: foundationReference,
        status,
        version: 1,
        created_by: ctx.user.id,
        updated_by: ctx.user.id,
      })
      .select(
        "id,tenant_id,domain,category,title,summary,body,foundation_type,foundation_reference,status,version,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by"
      )
      .single();

    if (error) {
      console.error("[knowledge-items]", ctx.request_id, "INSERT_FAILED", error);
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
    console.error("[knowledge-items]", ctx.request_id, "POST_UNHANDLED", error);
    return serverError(
      ctx.request_id,
      error instanceof Error ? error.message : "unknown_error"
    );
  }
}
