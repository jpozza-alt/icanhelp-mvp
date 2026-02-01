import { NextResponse } from "next/server";

const BUILD_SHA = "61817b3";

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

/**
 * DIAGNOSTIC STUB (NO SUPABASE)
 * Goal: prove whether the crash comes from Supabase import/bundle.
 * Security: still requires Bearer token for any response != 401.
 */
export async function GET(req: Request) {
  const jwt = getBearerToken(req);
  if (!jwt) return jsonWithBuild({ error: "Nao autenticado." }, { status: 401 });
  return jsonWithBuild({ error: "Diagnostic stub (no Supabase).", build: BUILD_SHA }, { status: 501 });
}

export async function POST(req: Request) {
  const jwt = getBearerToken(req);
  if (!jwt) return jsonWithBuild({ error: "Nao autenticado." }, { status: 401 });
  return jsonWithBuild({ error: "Diagnostic stub (POST disabled).", build: BUILD_SHA }, { status: 501 });
}

export async function DELETE(req: Request) {
  const jwt = getBearerToken(req);
  if (!jwt) return jsonWithBuild({ error: "Nao autenticado." }, { status: 401 });
  return jsonWithBuild({ error: "Diagnostic stub (DELETE disabled).", build: BUILD_SHA }, { status: 501 });
}


