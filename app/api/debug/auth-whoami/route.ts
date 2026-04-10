import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status });
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

export async function GET(req: NextRequest) {
  try {
    const token = getBearer(req);
    if (!token) {
      return json({ ok: false, error: "missing_bearer" }, 401);
    }

    const supabase = createUserSupabase(token);
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return json({ ok: false, error: error?.message ?? "user_not_found" }, 401);
    }

    return json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
    });
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      500
    );
  }
}
