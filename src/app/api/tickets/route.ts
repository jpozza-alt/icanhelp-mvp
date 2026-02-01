// src/app/api/tickets/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

function getEnvOrNull(name: string): string | null {
  const v = process.env[name];
  if (!v || typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function getAuthorizationHeader(req: Request): string | null {
  const raw = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const v = raw.trim();
  if (!v) return null;
  if (!/^Bearer\s+.+/i.test(v)) return null;
  return v;
}

function supabaseFromBearer(req: Request) {
  const supabaseUrl =
    getEnvOrNull("NEXT_PUBLIC_SUPABASE_URL") ?? getEnvOrNull("SUPABASE_URL");
  const supabaseAnonKey =
    getEnvOrNull("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? getEnvOrNull("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return { supabase: null as any, err: "Missing Supabase env vars (URL/ANON KEY)." };
  }

  const authHeader = getAuthorizationHeader(req);
  if (!authHeader) return { supabase: null as any, err: "Missing Bearer token." };

  // Adapter de cookies (não usado neste fluxo Bearer-only)
  const cookieAdapter = {
    getAll() {
      return [];
    },
    setAll() {
      // no-op: não persistimos sessão em cookie
    },
  };

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: cookieAdapter,
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  return { supabase, err: null as string | null };
}

async function requireUser(req: Request) {
  const { supabase, err } = supabaseFromBearer(req);

  if (err === "Missing Supabase env vars (URL/ANON KEY).") {
    return {
      supabase: null as any,
      user: null as any,
      errorResp: jsonError(500, err, { action: "Verificação manual necessária nas env vars do Vercel." }),
    };
  }

  if (err === "Missing Bearer token.") {
    return {
      supabase: null as any,
      user: null as any,
      errorResp: jsonError(401, "Não autenticado. Envie Authorization: Bearer <JWT>."),
    };
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return {
      supabase: null as any,
      user: null as any,
      errorResp: jsonError(401, "Não autenticado. Token inválido ou expirado."),
    };
  }

  return { supabase, user: userData.user, errorResp: null as any };
}

function isRlsBlockedMessage(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("row-level security") || m.includes("violates row") || m.includes("rls");
}

export async function GET(req: Request) {
  const { supabase, errorResp } = await requireUser(req);
  if (errorResp) return errorResp;

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isRlsBlockedMessage(error.message)) {
      return jsonError(403, "Ação não permitida pelas regras de acesso (RLS).");
    }
    return jsonError(500, "Falha ao listar tickets.", { code: error.code });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const { supabase, user, errorResp } = await requireUser(req);
  if (errorResp) return errorResp;

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonError(400, "JSON inválido no corpo da requisição.");
  }

  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";

  if (!title) return jsonError(400, "Campo obrigatório: title.");

  const { data, error } = await supabase
    .from("tickets")
    .insert({ title, body, user_id: user.id })
    .select("*");

  if (error) {
    if (isRlsBlockedMessage(error.message)) {
      return jsonError(403, "Ação não permitida pelas regras de acesso (RLS).");
    }
    return jsonError(500, "Falha ao criar ticket.", { code: error.code });
  }

  return NextResponse.json(data ?? []);
}

export async function DELETE(req: Request) {
  const { supabase, errorResp } = await requireUser(req);
  if (errorResp) return errorResp;

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonError(400, "JSON inválido no corpo da requisição.");
  }

  const id = typeof payload?.id === "string" ? payload.id.trim() : "";
  if (!id) return jsonError(400, "Campo obrigatório: id.");

  const { error } = await supabase.from("tickets").delete().eq("id", id);

  if (error) {
    if (isRlsBlockedMessage(error.message)) {
      return jsonError(403, "Ação não permitida pelas regras de acesso (RLS).");
    }
    return jsonError(500, "Falha ao remover ticket.", { code: error.code });
  }

  return NextResponse.json({ ok: true });
}
