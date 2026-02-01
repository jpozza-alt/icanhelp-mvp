export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUILD_SHA = "9fdd357";

function jsonWithBuild(body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("x-icanhelp-build", BUILD_SHA);
  return res;
}

function getEnvTrimmed(name: string): string | null {
  const v = process.env[name];
  if (!v) return null;
  const t = v.trim();
  return t.length ? t : null;
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function mapDbError(err: any) {
  const msg = (err?.message || "").toLowerCase();
  const debug = {
    code: err?.code ?? null,
    message: err?.message ?? null,
    details: err?.details ?? null,
    hint: err?.hint ?? null,
  };

  if (msg.includes("row-level security") || msg.includes("permission denied") || msg.includes("rls")) {
    return { status: 403, body: { error: "Acesso negado (RLS bloqueou).", debug } };
  }

  // Alguns casos de RLS/perm vem sem essa string; mantemos debug para decidir com precisão.
  if (err?.code === "42501") {
    return { status: 403, body: { error: "Acesso negado (permissão).", debug } };
  }

  return { status: 500, body: { error: "Erro interno.", debug } };
}

function getSupabaseClient() {
  const url = getEnvTrimmed("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnvTrimmed("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anonKey) return { client: null as any, error: "Supabase env ausente." };

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { client, error: null as string | null };
}

export async function GET(req: Request) {
  const jwt = getBearerToken(req);
  if (!jwt) return jsonWithBuild({ error: "Nao autenticado." }, { status: 401 });

  const { client: supabase, error: envError } = getSupabaseClient();
  if (envError) return jsonWithBuild({ error: envError }, { status: 500 });

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData?.user) return jsonWithBuild({ error: "Nao autenticado." }, { status: 401 });

  const { data, error } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });

  if (error) {
    const mapped = mapDbError(error);
    return jsonWithBuild(mapped.body, { status: mapped.status });
  }

  return jsonWithBuild({ data: data ?? [] }, { status: 200 });
}

export async function POST(req: Request) {
  const jwt = getBearerToken(req);
  if (!jwt) return jsonWithBuild({ error: "Nao autenticado." }, { status: 401 });

  const { client: supabase, error: envError } = getSupabaseClient();
  if (envError) return jsonWithBuild({ error: envError }, { status: 500 });

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData?.user) return jsonWithBuild({ error: "Nao autenticado." }, { status: 401 });

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return jsonWithBuild({ error: "Body JSON inválido." }, { status: 400 });
  }

  const title = (payload?.title ?? "").toString().trim();
  const description = (payload?.description ?? "").toString().trim();
  if (!title) return jsonWithBuild({ error: "Campo obrigatório ausente: title." }, { status: 400 });

  const insertObj: any = { title };
  if (description) insertObj.description = description;

  const { data, error } = await supabase.from("tickets").insert(insertObj).select("*").single();

  if (error) {
    const mapped = mapDbError(error);
    return jsonWithBuild(mapped.body, { status: mapped.status });
  }

  return jsonWithBuild({ data }, { status: 201 });
}
