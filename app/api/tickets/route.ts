import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Ctx = {
  request_id: string;
  tenant: string;
  user: { id: string; email?: string | null };
  jwt: string;
};

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
      message: "Acesso negado para este tenant. Verifique se voce selecionou o tenant correto.",
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
      return badRequest(rid, "Header obrigatorio ausente: x-icanhelp-tenant.");
    }

    const token = getBearer(req);
    if (!token) {
      return unauthorized(rid, "Authorization Bearer token ausente ou invalido.");
    }

    const supabase = createUserSupabase(token);
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData.user) {
      console.error("[tickets]", rid, "AUTH_GETUSER_FAILED", authErr);
      return unauthorized(rid, authErr?.message ?? "user_not_found");
    }

    const args: any = { p_tenant: tenant };
    const { data: isMember, error: rpcErr } = await supabase.rpc("is_tenant_member", args);

    if (rpcErr) {
      console.error("[tickets]", rid, "RPC_is_tenant_member_FAILED", rpcErr);
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
    console.error("[tickets]", rid, "GET_CTX_UNHANDLED", error);
    return serverError(rid, error instanceof Error ? error.message : "unknown_error");
  }
}

export async function GET(req: NextRequest) {
  const ctxOrRes = await getCtx(req);
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const ctx = ctxOrRes;

  try {
    const supabase = createUserSupabase(ctx.jwt);

    const { data, error } = await supabase
      .from("tickets")
      .select("id,title,description,status,created_by,assigned_to,created_at,updated_at,tenant_id")
      .eq("tenant_id", ctx.tenant)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[tickets]", ctx.request_id, "SELECT_FAILED", error);
      return serverError(ctx.request_id, error.message || "select_failed");
    }

    return json(
      {
        ok: true,
        request_id: ctx.request_id,
        tickets: data ?? [],
      },
      200
    );
  } catch (error) {
    console.error("[tickets]", ctx.request_id, "GET_UNHANDLED", error);
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
      console.error("[tickets]", ctx.request_id, "JSON_PARSE_FAILED", e);
      return null;
    });

    const title = body?.title?.toString?.().trim?.();
    const description = body?.description?.toString?.().trim?.();

    if (!title) {
      return badRequest(ctx.request_id, "Campo obrigatorio ausente: title.");
    }

    const supabase = createUserSupabase(ctx.jwt);

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
      return serverError(ctx.request_id, error.message || "insert_failed");
    }

    return json(
      {
        ok: true,
        request_id: ctx.request_id,
        ticket: data,
      },
      201
    );
  } catch (error) {
    console.error("[tickets]", ctx.request_id, "POST_UNHANDLED", error);
    return serverError(
      ctx.request_id,
      error instanceof Error ? error.message : "unknown_error"
    );
  }
}