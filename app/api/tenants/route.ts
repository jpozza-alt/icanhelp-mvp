import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type MembershipRow = {
  tenant_id: string;
  role: string;
};

type TenantRow = {
  id: string;
  name: string | null;
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

export async function GET(req: NextRequest) {
  try {
    const token = getBearer(req);
    if (!token) {
      return json({ ok: false, error: "missing_bearer" }, 401);
    }

    const supabase = createUserSupabase(token);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return json({ ok: false, error: authError?.message ?? "user_not_found" }, 401);
    }

    const { data: memberships, error: membershipsError } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", authData.user.id)
      .order("tenant_id", { ascending: true });

    if (membershipsError) {
      return json({ ok: false, error: membershipsError.message }, 500);
    }

    const membershipRows = (memberships ?? []) as MembershipRow[];
    const tenantIds = [...new Set(membershipRows.map((x) => x.tenant_id).filter(Boolean))];

    if (tenantIds.length === 0) {
      return json([]);
    }

    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name")
      .in("id", tenantIds);

    if (tenantsError) {
      return json({ ok: false, error: tenantsError.message }, 500);
    }

    const tenantMap = new Map<string, TenantRow>();
    for (const tenant of (tenants ?? []) as TenantRow[]) {
      tenantMap.set(tenant.id, tenant);
    }

    const payload = membershipRows.map((membership) => {
      const tenant = tenantMap.get(membership.tenant_id);
      return {
        id: membership.tenant_id,
        tenant_id: membership.tenant_id,
        role: membership.role,
        name: tenant?.name ?? null,
        slug: null,
      };
    });

    return json(payload);
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      500
    );
  }
}
