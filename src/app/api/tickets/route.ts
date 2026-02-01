export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUILD_SHA = "0c2eece";

function jsonWithBuild(body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("x-icanhelp-build", BUILD_SHA);
  return res;
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();
  return token.length ? token : null;
}

function getEnvTrimmed(name: string): string | null {
  const raw = process.env[name];
  if (!raw) return null;
  const v = raw.trim();
  return v.length ? v : null;
}

function mapDbError(err: any) {
  const msg = (err?.message || "").toLowerCase();
  if (msg.includes("row-level security") || msg.includes("permission denied") || msg.includes("rls")) {
    return { status: 403, body: { error: "Acesso negado (RLS bloqueou)." } };
  }
  return { status: 500, body: { error: "Erro interno." } };
}

export async function GET(req: Request) {
  const jwt = getBearerToken(req);
  if (!jwt) return jsonWithBuild({ error: "Nao autenticado." }, { status: 401 });

  const url = getEnvTrimmed("NEXT_PUBLIC_SUPABASE_URL");
  const anon = getEnvTrimmed("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anon) {
    return jsonWithBuild({ error: "Missing env vars.", hasUrl: !!url, hasAnon: !!anon }, { status: 500 });
  }

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: u, error: uerr } = await client.auth.getUser();
  if (uerr || !u?.user) {
    return jsonWithBuild({ error: "Nao autenticado." }, { status: 401 });
  }

  const { data, error } = await client
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    const mapped = mapDbError(error);
    return jsonWithBuild(mapped.body, { status: mapped.status });
  }

  return jsonWithBuild({ data: data ?? [] }, { status: 200 });
}

