import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function getBearer(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "").trim();
}

function getTenant(req: NextRequest) {
  const t = req.headers.get("x-icanhelp-tenant");
  return t?.trim() || null;
}

function makeSupabase(token: string, tenantId: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-icanhelp-tenant": tenantId,
        },
      },
    }
  );
}

async function assertTenantMember(supabase: ReturnType<typeof createClient>, tenantId: string) {
  // Usa função SECURITY DEFINER (já criada no banco):
  // public.is_tenant_member(p_tenant uuid) returns boolean
  const { data, error } = await supabase.rpc("is_tenant_member", { p_tenant: tenantId });

  if (error) {
    // Se a RPC falhar, tratamos como "não autorizado" (fail-closed)
    return { ok: false as const, reason: "rpc_failed", detail: error.message };
  }

  if (data !== true) {
    return { ok: false as const, reason: "not_member" };
  }

  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return json(401, { error: "missing_bearer", message: "Envie Authorization: Bearer <JWT>." });

  const tenantId = getTenant(req);
  if (!tenantId) return json(400, { error: "missing_tenant", message: "Envie x-icanhelp-tenant: <tenant_id>." });

  const supabase = makeSupabase(token, tenantId);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return json(401, { error: "unauthorized", message: "JWT inválido ou expirado.", detail: userError?.message });
  }

  const membership = await assertTenantMember(supabase, tenantId);
  if (!membership.ok) {
    return json(403, {
      error: "forbidden",
      message: "Você não tem acesso a este tenant.",
      detail: membership.reason === "rpc_failed" ? membership.detail : null,
    });
  }

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return json(403, { error: "forbidden", message: "RLS bloqueou a leitura.", detail: error.message });
  }

  return json(200, { items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return json(401, { error: "missing_bearer", message: "Envie Authorization: Bearer <JWT>." });

  const tenantId = getTenant(req);
  if (!tenantId) return json(400, { error: "missing_tenant", message: "Envie x-icanhelp-tenant: <tenant_id>." });

  const supabase = makeSupabase(token, tenantId);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return json(401, { error: "unauthorized", message: "JWT inválido ou expirado.", detail: userError?.message });
  }

  const membership = await assertTenantMember(supabase, tenantId);
  if (!membership.ok) {
    return json(403, {
      error: "forbidden",
      message: "Você não tem acesso a este tenant.",
      detail: membership.reason === "rpc_failed" ? membership.detail : null,
    });
  }

  let body: { title?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad_request", message: "JSON inválido." });
  }

  if (!body.title || !body.description) {
    return json(400, { error: "validation_error", message: "title e description são obrigatórios." });
  }

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      tenant_id: tenantId,
      title: body.title,
      description: body.description,
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    return json(403, { error: "forbidden", message: "RLS bloqueou a inserção.", detail: error.message, code: error.code ?? null });
  }

  return json(201, { item: data });
}
