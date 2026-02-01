export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUILD_SHA = "082915c";

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

export async function GET(req: Request) {
  const jwt = getBearerToken(req);
  if (!jwt) return jsonWithBuild({ error: "Nao autenticado." }, { status: 401 });

  // PROBE: apenas confirmar que o import do Supabase nao crasha em runtime.
  // Nao executa DB, nao valida JWT, nao usa cookies.
  const url = getEnvTrimmed("NEXT_PUBLIC_SUPABASE_URL");
  const anon = getEnvTrimmed("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // Criar client sem chamar nada (tambem ajuda a separar import vs createClient)
  const client = createClient(url || "missing", anon || "missing", {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Nao chamar client.auth.getUser aqui.
  return jsonWithBuild({ ok: true, probe: "import+createClient ok", build: BUILD_SHA, hasUrl: !!url, hasAnon: !!anon }, { status: 200 });
}

