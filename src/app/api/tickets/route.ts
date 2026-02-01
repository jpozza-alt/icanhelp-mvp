export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUILD_SHA = "7cfcd48";

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
  if (!jwt) return jsonWithBuild({ ok: false, stage: "bearer", error: "Nao autenticado." }, { status: 401 });

  const url = getEnvTrimmed("NEXT_PUBLIC_SUPABASE_URL");
  const anon = getEnvTrimmed("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anon) {
    return jsonWithBuild({ ok: false, stage: "env", error: "Missing env vars.", hasUrl: !!url, hasAnon: !!anon }, { status: 500 });
  }

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) {
      return jsonWithBuild({ ok: false, stage: "getUser", error: "Nao autenticado.", details: error?.message || null }, { status: 401 });
    }
    return jsonWithBuild({ ok: true, stage: "getUser", userId: data.user.id, build: BUILD_SHA }, { status: 200 });
  } catch (e: any) {
    return jsonWithBuild({ ok: false, stage: "getUser", error: "Exception", details: (e?.message || String(e)) }, { status: 500 });
  }
}

