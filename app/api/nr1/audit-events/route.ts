import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../src/lib/database.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuditEventRow = Record<string, unknown>;

const tenantHeaderNames = [
  "x-tenant-id",
  "x-icanhelp-tenant-id",
  "icanhelp-tenant-id",
];

const establishmentHeaderNames = [
  "x-establishment-id",
  "x-icanhelp-establishment-id",
  "icanhelp-establishment-id",
];

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function firstHeader(request: NextRequest, names: string[]) {
  for (const name of names) {
    const value = request.headers.get(name);

    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function firstSearchParam(request: NextRequest, names: string[]) {
  for (const name of names) {
    const value = request.nextUrl.searchParams.get(name);

    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function requiredSearchOrHeader(
  request: NextRequest,
  searchNames: string[],
  headerNames: string[],
) {
  return (
    firstSearchParam(request, searchNames) ??
    firstHeader(request, headerNames)
  );
}

function optionalSearchParam(request: NextRequest, names: string[]) {
  return firstSearchParam(request, names);
}

function parseLimit(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("limit");

  if (!raw) {
    return 100;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }

  return Math.min(parsed, 300);
}

function humanizeAuditEvent(row: AuditEventRow) {
  const eventType = String(row.event_type ?? "");
  const entityType = String(row.entity_type ?? "");

  if (eventType === "nr1_evidence_item_archived") {
    return "Evidencia arquivada";
  }

  if (eventType.length > 0 && entityType.length > 0) {
    return `${eventType} em ${entityType}`;
  }

  if (eventType.length > 0) {
    return eventType;
  }

  return "Evento de auditoria";
}

function normalizeAuditEvent(row: AuditEventRow) {
  return {
    id: row.id ?? null,
    tenant_id: row.tenant_id ?? null,
    establishment_id: row.establishment_id ?? null,
    module_name: row.module_name ?? null,
    screen_key: row.screen_key ?? null,
    entity_type: row.entity_type ?? null,
    entity_id: row.entity_id ?? null,
    event_type: row.event_type ?? null,
    old_value_json: row.old_value_json ?? null,
    new_value_json: row.new_value_json ?? null,
    persistence_type: row.persistence_type ?? null,
    user_id: row.user_id ?? null,
    reason: row.reason ?? null,
    created_at: row.created_at ?? null,
    title: humanizeAuditEvent(row),
    source: "nr1_audit_events",
  };
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const authorizationLower = authorization.toLowerCase();

  if (!authorizationLower.startsWith("bearer ")) {
    return json(401, {
      ok: false,
      error: "missing_bearer_token",
    });
  }

  const tenantId = requiredSearchOrHeader(
    request,
    ["tenantId", "tenant_id"],
    tenantHeaderNames,
  );

  if (!tenantId) {
    return json(400, {
      ok: false,
      error: "missing_tenant_id",
    });
  }

  const establishmentId = requiredSearchOrHeader(
    request,
    ["establishmentId", "establishment_id"],
    establishmentHeaderNames,
  );

  if (!establishmentId) {
    return json(400, {
      ok: false,
      error: "missing_establishment_id",
    });
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return json(500, {
      ok: false,
      error: "missing_supabase_public_env",
    });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const limit = parseLimit(request);
  const entityType = optionalSearchParam(request, ["entityType", "entity_type"]);
  const entityId = optionalSearchParam(request, ["entityId", "entity_id"]);
  const eventType = optionalSearchParam(request, ["eventType", "event_type"]);

  let query = supabase
    .from("nr1_audit_events")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("establishment_id", establishmentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (entityId) {
    query = query.eq("entity_id", entityId);
  }

  if (eventType) {
    query = query.eq("event_type", eventType);
  }

  const { data, error } = await query;

  if (error) {
    return json(500, {
      ok: false,
      error: "audit_events_query_failed",
      details: error.message,
    });
  }

  const rows = (data ?? []) as AuditEventRow[];

  return json(200, {
    ok: true,
    source: "nr1_audit_events",
    tenantId,
    establishmentId,
    count: rows.length,
    items: rows.map(normalizeAuditEvent),
  });
}
