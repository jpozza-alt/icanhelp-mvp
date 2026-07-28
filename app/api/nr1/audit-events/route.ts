import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "../../../../src/lib/database.types";
import {
  createNr1AdminClient,
  Nr1ScopeError,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "../../../../src/lib/server/nr1-scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuditEventRow = Record<string, unknown>;
type Nr1AuditEventInsert =
  Database["public"]["Tables"]["nr1_audit_events"]["Insert"];

const MAX_AUDIT_METADATA_BYTES = 64 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedAuditBodyFields = new Set([
  "establishment_id",
  "module_name",
  "screen_key",
  "entity_type",
  "entity_id",
  "event_type",
  "old_value_json",
  "new_value_json",
  "persistence_type",
  "reason",
]);


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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

function isJson(value: unknown, depth = 0): value is Json {
  if (depth > 20) {
    return false;
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJson(item, depth + 1));
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(
    (item) => item === undefined || isJson(item, depth + 1),
  );
}

function jsonByteLength(value: Json): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function normalizePersistenceType(
  value: unknown,
): Nr1AuditEventInsert["persistence_type"] | null {
  if (value === "draft") {
    return "draft";
  }

  if (value === "formal" || value === "formal_version") {
    return "formal_version";
  }

  return null;
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

export async function POST(request: NextRequest) {
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

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return json(400, {
      ok: false,
      error: "invalid_json_body",
      message: "Request body must be valid JSON",
    });
  }

  if (!isRecord(parsedBody)) {
    return json(400, {
      ok: false,
      error: "invalid_body",
      message: "Request body must be a JSON object",
    });
  }

  const unsupportedFields = Object.keys(parsedBody).filter(
    (field) => !allowedAuditBodyFields.has(field),
  );

  if (unsupportedFields.length > 0) {
    return json(400, {
      ok: false,
      error: "unsupported_fields",
      fields: unsupportedFields,
    });
  }

  const bodyEstablishmentId = cleanText(parsedBody.establishment_id, 36);
  const requestEstablishmentId = requiredSearchOrHeader(
    request,
    ["establishmentId", "establishment_id"],
    establishmentHeaderNames,
  );

  if (!bodyEstablishmentId || !UUID_PATTERN.test(bodyEstablishmentId)) {
    return json(400, {
      ok: false,
      error: "invalid_establishment_id",
    });
  }

  if (
    requestEstablishmentId &&
    requestEstablishmentId !== bodyEstablishmentId
  ) {
    return json(400, {
      ok: false,
      error: "establishment_context_mismatch",
    });
  }

  const moduleName = cleanText(parsedBody.module_name, 32);
  const screenKey = cleanText(parsedBody.screen_key, 120);
  const entityType = cleanText(parsedBody.entity_type, 120);
  const entityId = cleanText(parsedBody.entity_id, 36);
  const eventType = cleanText(parsedBody.event_type, 160);
  const reason = cleanText(parsedBody.reason, 500);
  const persistenceType = normalizePersistenceType(
    parsedBody.persistence_type,
  );

  if (moduleName !== "nr1") {
    return json(400, {
      ok: false,
      error: "invalid_module_name",
    });
  }

  if (!entityType) {
    return json(400, {
      ok: false,
      error: "invalid_entity_type",
    });
  }

  if (!entityId || !UUID_PATTERN.test(entityId)) {
    return json(400, {
      ok: false,
      error: "invalid_entity_id",
    });
  }

  if (!eventType) {
    return json(400, {
      ok: false,
      error: "invalid_event_type",
    });
  }

  if (!persistenceType) {
    return json(400, {
      ok: false,
      error: "invalid_persistence_type",
      allowed: ["draft", "formal", "formal_version"],
    });
  }

  const oldValue = parsedBody.old_value_json ?? null;
  const newValue = parsedBody.new_value_json ?? null;

  if (!isJson(oldValue) || !isJson(newValue)) {
    return json(400, {
      ok: false,
      error: "invalid_audit_metadata",
    });
  }

  if (
    jsonByteLength(oldValue) + jsonByteLength(newValue) >
    MAX_AUDIT_METADATA_BYTES
  ) {
    return json(400, {
      ok: false,
      error: "audit_metadata_too_large",
      maxBytes: MAX_AUDIT_METADATA_BYTES,
    });
  }

  try {
    const scope = await resolveNr1Scope({
      req: request,
      tenantId,
      establishmentId: bodyEstablishmentId,
    });
    const adminClient = createNr1AdminClient();
    const insertPayload: Nr1AuditEventInsert = {
      tenant_id: scope.tenantId,
      establishment_id: scope.establishment?.id ?? bodyEstablishmentId,
      module_name: "nr1",
      screen_key: screenKey,
      entity_type: entityType,
      entity_id: entityId,
      event_type: eventType,
      old_value_json: oldValue,
      new_value_json: newValue,
      persistence_type: persistenceType,
      reason,
      user_id: scope.user.id,
    };

    const insertResult = await adminClient
      .from("nr1_audit_events")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertResult.error) {
      return json(500, {
        ok: false,
        error: "audit_event_insert_failed",
        message: insertResult.error.message,
      });
    }

    return json(201, {
      ok: true,
      source: "nr1_audit_events",
      tenantId: scope.tenantId,
      establishmentId: bodyEstablishmentId,
      membershipRole: scope.role,
      item: insertResult.data,
    });
  } catch (error) {
    if (
      error instanceof Nr1ScopeError &&
      error.code === "establishment_not_found"
    ) {
      return json(403, {
        ok: false,
        error: "establishment_scope_forbidden",
        message: "Establishment does not belong to the requested tenant",
      });
    }

    const response = nr1ErrorToResponsePayload(error);
    return json(response.status, response.body);
  }
}
