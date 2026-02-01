import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUILD_SHA = "79bd977";

function jsonWithBuild(body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("x-icanhelp-build", BUILD_SHA);
  return res;
}

function getEnvTrimmed(name: string): string | null {
  const raw = process.env[name];
  if (!raw) return null;
  const v = raw.trim();
  return v.length ? v : null;
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();
  return token.length ? token : null;
}

function createSupabaseClientWithBearer(jwt: string) {
  const url = getEnvTrimmed("NEXT_PUBLIC_SUPABASE_URL");
  const anon = getEnvTrimmed("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anon) {
    return { client: null as any, error: "ConfiguraÃ§Ã£o do backend incompleta (env vars ausentes)." };
  }

  // Importante: SEM cookies. Apenas Authorization header.
  const client = createClient(url, anon, {
    global: {
      headers: {
        Authorization: Bearer ,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return { client, error: null as string | null };
}

async function requireUser(req: Request) {
  const jwt = getBearerToken(req);
  if (!jwt) {
    return { ok: false, status: 401, body: { error: "NÃ£o autenticado." } as any, jwt: null as any, user: null as any };
  }

  const { client, error } = createSupabaseClientWithBearer(jwt);
  if (!client) {
    return { ok: false, status: 500, body: { error } as any, jwt: null as any, user: null as any };
  }

  const { data, error: authErr } = await client.auth.getUser();
  if (authErr || !data?.user) {
    return { ok: false, status: 401, body: { error: "NÃ£o autenticado." } as any, jwt: null as any, user: null as any };
  }

  return { ok: true, status: 200, body: null as any, jwt, user: data.user, client };
}

function mapDbError(err: any) {
  // Sem â€œinventarâ€: retornamos mensagem institucional e mantemos o detalhe sÃ³ no server log (nÃ£o aqui).
  // RLS normalmente aparece como "permission denied" / "new row violates row-level security policy" etc.
  const msg = (err?.message || "").toLowerCase();

  if (msg.includes("row-level security") || msg.includes("permission denied") || msg.includes("rls")) {
    return { status: 403, body: { error: "Acesso negado (RLS bloqueou)." } };
  }

  return { status: 500, body: { error: "Erro interno." } };
}

// GET /api/tickets
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return jsonWithBuild(auth.body, { status: auth.status });

    const supabase = auth.client;

    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      const mapped = mapDbError(error);
      return jsonWithBuild(mapped.body, { status: mapped.status });
    }

    return jsonWithBuild({ data: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return jsonWithBuild({ error: "Erro interno." }, { status: 500 });
  }
}

// POST /api/tickets
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return jsonWithBuild(auth.body, { status: auth.status });

    const supabase = auth.client;

    const payload = await req.json().catch(() => null);
    const title = (payload?.title ?? "").toString().trim();
    const description = (payload?.description ?? "").toString().trim();

    if (!title) {
      return jsonWithBuild({ error: "Campo obrigatÃ³rio: title." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tickets")
      .insert([{ title, description }])
      .select("*")
      .single();

    if (error) {
      const mapped = mapDbError(error);
      return jsonWithBuild(mapped.body, { status: mapped.status });
    }

    return jsonWithBuild({ data }, { status: 201 });
  } catch (e: any) {
    return jsonWithBuild({ error: "Erro interno." }, { status: 500 });
  }
}

// DELETE /api/tickets?id=...
export async function DELETE(req: Request) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return jsonWithBuild(auth.body, { status: auth.status });

    const supabase = auth.client;

    const url = new URL(req.url);
    const id = url.searchParams.get("id")?.trim();

    if (!id) {
      return jsonWithBuild({ error: "ParÃ¢metro obrigatÃ³rio: id." }, { status: 400 });
    }

    const { error } = await supabase.from("tickets").delete().eq("id", id);

    if (error) {
      const mapped = mapDbError(error);
      return jsonWithBuild(mapped.body, { status: mapped.status });
    }

    return jsonWithBuild({ ok: true }, { status: 200 });
  } catch (e: any) {
    return jsonWithBuild({ error: "Erro interno." }, { status: 500 });
  }
}
