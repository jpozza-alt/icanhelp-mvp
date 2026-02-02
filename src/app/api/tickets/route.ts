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
  // Header canônico do MVP (testável via curl/PowerShell)
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
          // Este header vai para o PostgREST e pode ser lido no RLS via request.headers
          "x-icanhelp-tenant": tenantId,
        },
      },
    }
  );
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

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // quando RLS bloquear, o PostgREST costuma responder erro
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
      tenant_id: tenantId,          // obrigatório a partir de agora
      title: body.title,
      description: body.description,
      created_by: userData.user.id, // RLS também valida
    })
    .select()
    .single();

  if (error) {
    return json(403, { error: "forbidden", message: "RLS bloqueou a inserção.", detail: error.message, code: error.code ?? null });
  }

  return json(201, { item: data });
}
