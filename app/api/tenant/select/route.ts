import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type MembershipRow = {
  tenant_id: string;
  role: string;
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
  const tenantCookie = req.cookies.get("icanhelp_tenant")?.value?.trim() ?? "";
  const establishmentCookie =
    req.cookies.get("icanhelp_establishment")?.value?.trim() ?? "";

  return {
    tenantId: tenantCookie,
    establishmentId: establishmentCookie,
  };
}

export async function GET(req: NextRequest) {
  try {
    const active = readActiveTenantFromCookie(req);

    if (!active.tenantId) {
      return json(
        {
          ok: false,
          error: "active_tenant_not_set",
          tenantId: "",
          establishmentId: active.establishmentId || "",
        },
        404
      );
    }

    return json({
      ok: true,
      tenantId: active.tenantId,
      tenant_id: active.tenantId,
      activeTenantId: active.tenantId,
      active_tenant_id: active.tenantId,
      establishmentId: active.establishmentId || "",
      establishment_id: active.establishmentId || "",
      activeEstablishmentId: active.establishmentId || "",
      active_establishment_id: active.establishmentId || "",
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
      return json({ ok: false, error: "missing_bearer" }, 401);
    }

    const body = await req.json().catch(() => null);
    const tenantId = normalizeTenantId(body);

    if (!tenantId) {
      return json({ ok: false, error: "missing_tenant_id" }, 400);
    }

    const supabase = createUserSupabase(token);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return json(
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

    response.cookies.set("icanhelp_tenant", row.tenant_id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      500
    );
  }
}
