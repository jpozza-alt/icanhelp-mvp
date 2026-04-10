import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Ctx = {
  request_id: string;
  tenant: string;
  user: { id: string; email?: string | null };
  jwt: string;
};

function requestId() {
  return crypto.randomUUID();
}

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function deny(rid: string) {
  return json(403, {
    ok: false,
    code: "forbidden",
    message:
      "Acesso negado para este tenant. Verifique se você selecionou o órgão/tenant correto.",
    request_id: rid,
  });
}

function badRequest(rid: string, message: string) {
  return json(400, { ok: false, code: "bad_request", message, request_id: rid });
}

function unauthorized(rid: string, message: string) {
  return json(401, { ok: false, code: "unauthorized", message, request_id: rid });
}

function serverError(rid: string) {
  return json(500, {
    ok: false,
    code: "internal_error",
    message:
      "Ocorreu um erro inesperado. Tente novamente em instantes. Se persistir, informe o suporte com o request_id.",
    request_id: rid,
  });
}

function getEnv(rid: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnon =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    console.error("[tickets]", rid, "ENV_MISSING", {
      SUPABASE_URL: !!supabaseUrl,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
    return null;
  }

  return { supabaseUrl, supabaseAnon };
}

function supa(rid: string, jwt: string) {
  const env = getEnv(rid);
  if (!env) return null;

  return createClient(env.supabaseUrl, env.supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
}

async function getCtx(req: Request): Promise<Ctx | NextResponse> {
  const rid = requestId();

  const tenant = req.headers.get("x-icanhelp-tenant")?.trim();
  if (!tenant) return badRequest(rid, "Header obrigatório ausente: x-icanhelp-tenant.");

  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return unauthorized(rid, "Authorization Bearer token ausente ou inválido.");
  const jwt = m[1].trim();

  const supabase = supa(rid, jwt);
  if (!supabase) return serverError(rid);

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user?.id) {
    console.error("[tickets]", rid, "AUTH_GETUSER_FAILED", authErr);
    return unauthorized(rid, "Sessão inválida. Faça login novamente.");
  }

  const user = { id: authData.user.id, email: authData.user.email };

  // RPC com param detectado (ex.: p_tenant)
  const args: any = {};
  args["p_tenant"] = tenant;

  const { data: isMember, error: rpcErr } = await supabase.rpc("is_tenant_member", args);

  if (rpcErr) {
    console.error("[tickets]", rid, "RPC_is_tenant_member_FAILED", rpcErr);
    return serverError(rid);
  }

  if (!isMember) return deny(rid);

  return { request_id: rid, tenant, user, jwt };
}

export async function GET(req: Request) {
  const ctxOrRes = await getCtx(req);
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const ctx = ctxOrRes;

  const supabase = supa(ctx.request_id, ctx.jwt);
  if (!supabase) return serverError(ctx.request_id);

  const { data, error } = await supabase
    .from("tickets")
    .select("id,title,description,status,created_by,assigned_to,created_at,updated_at,tenant_id")
    .eq("tenant_id", ctx.tenant)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[tickets]", ctx.request_id, "SELECT_FAILED", error);
    return serverError(ctx.request_id);
  }

  return json(200, { ok: true, request_id: ctx.request_id, tickets: data ?? [] });
}

export async function POST(req: Request) {
  const ctxOrRes = await getCtx(req);
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const ctx = ctxOrRes;

  const body = await req.json().catch((e) => {
    console.error("[tickets]", ctx.request_id, "JSON_PARSE_FAILED", e);
    return null;
  });

  const title = body?.title?.toString?.().trim?.();
  const description = body?.description?.toString?.().trim?.();

  if (!title) return badRequest(ctx.request_id, "Campo obrigatório ausente: title.");

  const supabase = supa(ctx.request_id, ctx.jwt);
  if (!supabase) return serverError(ctx.request_id);

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      tenant_id: ctx.tenant,
      created_by: ctx.user.id,
      title,
      description: description || null,
      status: "open",
    })
    .select("id,title,description,status,created_by,assigned_to,created_at,updated_at,tenant_id")
    .single();

  if (error) {
    console.error("[tickets]", ctx.request_id, "INSERT_FAILED", error);
    return serverError(ctx.request_id);
  }

  return json(201, { ok: true, request_id: ctx.request_id, ticket: data });
}

