import { NextRequest, NextResponse } from "next/server.js";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type MembershipRow = {
  tenant_id: string;
  role: string;
};

const ACTIVE_TENANT_COOKIE = "icanhelp_tenant";
const ACTIVE_TENANT_USER_COOKIE = "icanhelp_tenant_user";
const ACTIVE_ESTABLISHMENT_COOKIE = "icanhelp_establishment";
const ACTIVE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

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

function normalizeTenantId(body: unknown) {
  if (!body || typeof body !== "object") return "";

  const payload = body as Record<string, unknown>;
  const raw = payload.tenantId ?? payload.id;

  if (typeof raw !== "string") return "";
  return raw.trim();
}

function readActiveTenantFromCookie(req: NextRequest) {
  const tenantCookie = req.cookies.get(ACTIVE_TENANT_COOKIE)?.value?.trim() ?? "";
  const userCookie = req.cookies.get(ACTIVE_TENANT_USER_COOKIE)?.value?.trim() ?? "";
  const establishmentCookie =
    req.cookies.get(ACTIVE_ESTABLISHMENT_COOKIE)?.value?.trim() ?? "";

  return {
    tenantId: tenantCookie,
    userId: userCookie,
    establishmentId: establishmentCookie,
  };
}

function clearActiveTenantCookies(response: NextResponse) {
  for (const name of [
    ACTIVE_TENANT_COOKIE,
    ACTIVE_TENANT_USER_COOKIE,
    ACTIVE_ESTABLISHMENT_COOKIE,
  ]) {
    response.cookies.set(name, "", { ...ACTIVE_COOKIE_OPTIONS, maxAge: 0 });
  }

  return response;
}

function clearedJson(payload: unknown, status: number) {
  return clearActiveTenantCookies(json(payload, status));
}

export async function GET(req: NextRequest) {
  try {
    const token = getBearer(req);
    if (!token) {
      return clearedJson({ ok: false, error: "missing_bearer" }, 401);
    }

    const supabase = createUserSupabase(token);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return clearedJson(
        { ok: false, error: authError?.message ?? "user_not_found" },
        401
      );
    }

    const active = readActiveTenantFromCookie(req);

    if (!active.tenantId || active.userId !== authData.user.id) {
      return clearedJson(
        {
          ok: false,
          error: active.tenantId ? "active_tenant_invalid" : "active_tenant_not_set",
          tenantId: "",
          establishmentId: "",
        },
        404
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", authData.user.id)
      .eq("tenant_id", active.tenantId)
      .maybeSingle();

    if (membershipError) {
      return json({ ok: false, error: membershipError.message }, 500);
    }

    if (!membership) {
      return clearedJson({ ok: false, error: "active_tenant_invalid" }, 404);
    }

    const row = membership as MembershipRow;

    return json({
      ok: true,
      tenantId: row.tenant_id,
      tenant_id: row.tenant_id,
      activeTenantId: row.tenant_id,
      active_tenant_id: row.tenant_id,
      establishmentId: active.establishmentId || "",
      establishment_id: active.establishmentId || "",
      activeEstablishmentId: active.establishmentId || "",
      active_establishment_id: active.establishmentId || "",
      role: row.role,
    });
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getBearer(req);
    if (!token) {
      return clearedJson({ ok: false, error: "missing_bearer" }, 401);
    }

    const body = await req.json().catch(() => null);
    const tenantId = normalizeTenantId(body);

    if (!tenantId) {
      return json({ ok: false, error: "missing_tenant_id" }, 400);
    }

    const supabase = createUserSupabase(token);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return clearedJson(
        { ok: false, error: authError?.message ?? "user_not_found" },
        401
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", authData.user.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (membershipError) {
      return json({ ok: false, error: membershipError.message }, 500);
    }

    if (!membership) {
      return json({ ok: false, error: "tenant_forbidden" }, 403);
    }

    const row = membership as MembershipRow;

    const response = json({
      ok: true,
      tenantId: row.tenant_id,
      tenant_id: row.tenant_id,
      role: row.role,
    });

    response.cookies.set(ACTIVE_TENANT_COOKIE, row.tenant_id, {
      ...ACTIVE_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set(ACTIVE_TENANT_USER_COOKIE, authData.user.id, {
      ...ACTIVE_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set(ACTIVE_ESTABLISHMENT_COOKIE, "", {
      ...ACTIVE_COOKIE_OPTIONS,
      maxAge: 0,
    });

    return response;
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      500
    );
  }
}
