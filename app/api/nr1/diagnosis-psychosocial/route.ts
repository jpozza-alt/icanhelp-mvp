import { NextRequest, NextResponse } from "next/server"
import type {
  Nr1DiagnosisPsychosocialFactorInsert,
  Nr1DiagnosisPsychosocialFactorRow,
  Nr1DiagnosisPsychosocialRow,
  Nr1DiagnosisSessionRow,
} from "@/lib/nr1-db-types"
import {
  createNr1UserClientFromBearer,
  extractBearerToken,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

export const dynamic = "force-dynamic"

type UpsertDiagnosisPsychosocialBody = {
  establishment_id?: string
  diagnosis_session_id?: string
  has_work_overload?: boolean | null
  has_excessive_pressure?: boolean | null
  has_role_ambiguity?: boolean | null
  has_low_autonomy?: boolean | null
  has_leadership_support_failure?: boolean | null
  has_peer_conflict?: boolean | null
  has_hostile_public_contact?: boolean | null
  has_constant_interruptions?: boolean | null
  has_task_accumulation?: boolean | null
  has_communication_difficulty?: boolean | null
  has_remote_isolation?: boolean | null
  has_badly_managed_change?: boolean | null
  has_report_channel?: boolean | null
  notes?: string | null
}

type PsychosocialFactorKey =
  | "has_work_overload"
  | "has_excessive_pressure"
  | "has_role_ambiguity"
  | "has_low_autonomy"
  | "has_leadership_support_failure"
  | "has_peer_conflict"
  | "has_hostile_public_contact"
  | "has_constant_interruptions"
  | "has_task_accumulation"
  | "has_communication_difficulty"
  | "has_remote_isolation"
  | "has_badly_managed_change"
  | "has_report_channel"

const PSYCHOSOCIAL_FACTORS: Array<{ key: PsychosocialFactorKey; label: string }> = [
  { key: "has_work_overload", label: "Sobrecarga de trabalho" },
  { key: "has_excessive_pressure", label: "Pressao excessiva" },
  { key: "has_role_ambiguity", label: "Ambiguidade de papel" },
  { key: "has_low_autonomy", label: "Baixa autonomia" },
  { key: "has_leadership_support_failure", label: "Falha de apoio da lideranca" },
  { key: "has_peer_conflict", label: "Conflito entre pares" },
  { key: "has_hostile_public_contact", label: "Contato hostil com publico" },
  { key: "has_constant_interruptions", label: "Interrupcoes constantes" },
  { key: "has_task_accumulation", label: "Acumulo de tarefas" },
  { key: "has_communication_difficulty", label: "Dificuldade de comunicacao" },
  { key: "has_remote_isolation", label: "Isolamento remoto" },
  { key: "has_badly_managed_change", label: "Mudanca mal gerida" },
  { key: "has_report_channel", label: "Canal de relato" },
]

async function upsertPsychosocialFactors(
  userClient: ReturnType<typeof createNr1UserClientFromBearer>,
  row: Nr1DiagnosisPsychosocialRow,
) {
  const factorRows: Nr1DiagnosisPsychosocialFactorInsert[] = PSYCHOSOCIAL_FACTORS.map((factor) => ({
    tenant_id: row.tenant_id,
    diagnosis_psychosocial_id: row.id,
    diagnosis_session_id: row.diagnosis_session_id,
    factor_key: factor.key,
    factor_label: factor.label,
    status: row[factor.key] === true ? "evidence_found" : "not_observed",
    confidence_level: "low",
    sources: [],
    investigation_pending: false,
  }))

  return userClient
    .from("nr1_diagnosis_psychosocial_factors")
    .upsert(factorRows, { onConflict: "diagnosis_psychosocial_id,factor_key" })
}

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status })
}

function getTenantId(req: NextRequest): string {
  const queryValue = (req.nextUrl.searchParams.get("tenantId") || "").trim()
  const headerValue = (req.headers.get("x-icanhelp-tenant") || "").trim()

  return queryValue || headerValue
}

function getRequiredEstablishmentId(req: NextRequest): string | null {
  const value = (req.nextUrl.searchParams.get("establishmentId") || "").trim()
  return value || null
}

function getRequiredDiagnosisSessionId(req: NextRequest): string | null {
  const value = (req.nextUrl.searchParams.get("diagnosisSessionId") || "").trim()
  return value || null
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanBooleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

async function requireDiagnosisSessionInScope(
  userClient: ReturnType<typeof createNr1UserClientFromBearer>,
  tenantId: string,
  establishmentId: string,
  diagnosisSessionId: string,
) {
  const result = await userClient
    .from("nr1_diagnosis_sessions")
    .select("*")
    .eq("id", diagnosisSessionId)
    .eq("tenant_id", tenantId)
    .eq("establishment_id", establishmentId)
    .is("deleted_at", null)

  if (result.error) {
    return {
      ok: false as const,
      status: 500,
      error: "nr1_diagnosis_session_lookup_failed",
      message: result.error.message,
    }
  }

  const rows = (result.data || []) as Nr1DiagnosisSessionRow[]

  if (rows.length === 0) {
    return {
      ok: false as const,
      status: 404,
      error: "nr1_diagnosis_session_not_found",
      message: "No nr1_diagnosis_sessions row found for tenant_id + establishment_id + diagnosis_session_id",
    }
  }

  if (rows.length > 1) {
    return {
      ok: false as const,
      status: 409,
      error: "nr1_diagnosis_session_duplicate",
      message: "Expected 1 diagnosis session row, got " + String(rows.length),
    }
  }

  return {
    ok: true as const,
    row: rows[0],
  }
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)
    const establishmentId = getRequiredEstablishmentId(req)
    const diagnosisSessionId = getRequiredDiagnosisSessionId(req)

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant_id",
        message: "Provide tenantId in querystring or x-icanhelp-tenant header",
      })
    }

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "Provide establishmentId in querystring",
      })
    }

    if (!diagnosisSessionId) {
      return json(400, {
        ok: false,
        error: "missing_diagnosis_session_id",
        message: "Provide diagnosisSessionId in querystring",
      })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const bearerToken = extractBearerToken(req)
    if (!bearerToken) {
      return json(401, {
        ok: false,
        error: "missing_bearer",
        message: "Missing bearer token",
      })
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const sessionCheck = await requireDiagnosisSessionInScope(
      userClient,
      scope.tenantId,
      establishmentId,
      diagnosisSessionId,
    )

    if (!sessionCheck.ok) {
      return json(sessionCheck.status, {
        ok: false,
        error: sessionCheck.error,
        message: sessionCheck.message,
      })
    }

    const result = await userClient
      .from("nr1_diagnosis_psychosocial")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("diagnosis_session_id", diagnosisSessionId)

    if (result.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_psychosocial_get_failed",
        message: result.error.message,
      })
    }

    const rows = (result.data || []) as Nr1DiagnosisPsychosocialRow[]

    if (rows.length === 0) {
      return json(200, {
        ok: true,
        tenantId: scope.tenantId,
        establishmentId,
        diagnosisSessionId,
        membershipRole: scope.role,
        session: {
          id: sessionCheck.row.id,
          department_id: sessionCheck.row.department_id,
          activity_id: sessionCheck.row.activity_id,
          current_stage: sessionCheck.row.current_stage,
          overall_status: sessionCheck.row.overall_status,
          progress_percent: sessionCheck.row.progress_percent,
        },
        item: null,
      })
    }

    if (rows.length > 1) {
      return json(409, {
        ok: false,
        error: "nr1_diagnosis_psychosocial_duplicate",
        message: "Expected 1 diagnosis psychosocial row, got " + String(rows.length),
      })
    }

    const row = rows[0]

    const factorsResult = await userClient
      .from("nr1_diagnosis_psychosocial_factors")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("diagnosis_psychosocial_id", row.id)
      .eq("diagnosis_session_id", diagnosisSessionId)
      .order("factor_key", { ascending: true })

    if (factorsResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_psychosocial_factors_get_failed",
        message: factorsResult.error.message,
      })
    }

    const factorRows = (factorsResult.data || []) as Nr1DiagnosisPsychosocialFactorRow[]
    return json(200, {
      ok: true,
      tenantId: scope.tenantId,
      establishmentId,
      diagnosisSessionId,
      membershipRole: scope.role,
      session: {
        id: sessionCheck.row.id,
        department_id: sessionCheck.row.department_id,
        activity_id: sessionCheck.row.activity_id,
        current_stage: sessionCheck.row.current_stage,
        overall_status: sessionCheck.row.overall_status,
        progress_percent: sessionCheck.row.progress_percent,
      },
      item: {
        id: row.id,
        tenant_id: row.tenant_id,
        diagnosis_session_id: row.diagnosis_session_id,
        has_work_overload: row.has_work_overload,
        has_excessive_pressure: row.has_excessive_pressure,
        has_role_ambiguity: row.has_role_ambiguity,
        has_low_autonomy: row.has_low_autonomy,
        has_leadership_support_failure: row.has_leadership_support_failure,
        has_peer_conflict: row.has_peer_conflict,
        has_hostile_public_contact: row.has_hostile_public_contact,
        has_constant_interruptions: row.has_constant_interruptions,
        has_task_accumulation: row.has_task_accumulation,
        has_communication_difficulty: row.has_communication_difficulty,
        has_remote_isolation: row.has_remote_isolation,
        has_badly_managed_change: row.has_badly_managed_change,
        has_report_channel: row.has_report_channel,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        factors: factorRows,
      },
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantId(req)

    if (!tenantId) {
      return json(400, {
        ok: false,
        error: "missing_tenant_id",
        message: "Provide tenantId in querystring or x-icanhelp-tenant header",
      })
    }

    let body: UpsertDiagnosisPsychosocialBody
    try {
      body = (await req.json()) as UpsertDiagnosisPsychosocialBody
    } catch {
      return json(400, {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON",
      })
    }

    const establishmentId = cleanText(body.establishment_id)
    const diagnosisSessionId = cleanText(body.diagnosis_session_id)

    if (!establishmentId) {
      return json(400, {
        ok: false,
        error: "missing_establishment_id",
        message: "establishment_id is required",
      })
    }

    if (!diagnosisSessionId) {
      return json(400, {
        ok: false,
        error: "missing_diagnosis_session_id",
        message: "diagnosis_session_id is required",
      })
    }

    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    if (!isTenantAdminRole(scope.role)) {
      return json(403, {
        ok: false,
        error: "nr1_diagnosis_psychosocial_upsert_forbidden",
        message: "Only owner or admin can upsert diagnosis psychosocial",
      })
    }

    const bearerToken = extractBearerToken(req)
    if (!bearerToken) {
      return json(401, {
        ok: false,
        error: "missing_bearer",
        message: "Missing bearer token",
      })
    }

    const userClient = createNr1UserClientFromBearer(bearerToken)

    const sessionCheck = await requireDiagnosisSessionInScope(
      userClient,
      scope.tenantId,
      establishmentId,
      diagnosisSessionId,
    )

    if (!sessionCheck.ok) {
      return json(sessionCheck.status, {
        ok: false,
        error: sessionCheck.error,
        message: sessionCheck.message,
      })
    }

    const existingResult = await userClient
      .from("nr1_diagnosis_psychosocial")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("diagnosis_session_id", diagnosisSessionId)

    if (existingResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_psychosocial_existing_lookup_failed",
        message: existingResult.error.message,
      })
    }

    const existingRows = (existingResult.data || []) as Nr1DiagnosisPsychosocialRow[]

    const payload = {
      tenant_id: scope.tenantId,
      diagnosis_session_id: diagnosisSessionId,
      has_work_overload: cleanBooleanOrNull(body.has_work_overload),
      has_excessive_pressure: cleanBooleanOrNull(body.has_excessive_pressure),
      has_role_ambiguity: cleanBooleanOrNull(body.has_role_ambiguity),
      has_low_autonomy: cleanBooleanOrNull(body.has_low_autonomy),
      has_leadership_support_failure: cleanBooleanOrNull(body.has_leadership_support_failure),
      has_peer_conflict: cleanBooleanOrNull(body.has_peer_conflict),
      has_hostile_public_contact: cleanBooleanOrNull(body.has_hostile_public_contact),
      has_constant_interruptions: cleanBooleanOrNull(body.has_constant_interruptions),
      has_task_accumulation: cleanBooleanOrNull(body.has_task_accumulation),
      has_communication_difficulty: cleanBooleanOrNull(body.has_communication_difficulty),
      has_remote_isolation: cleanBooleanOrNull(body.has_remote_isolation),
      has_badly_managed_change: cleanBooleanOrNull(body.has_badly_managed_change),
      has_report_channel: cleanBooleanOrNull(body.has_report_channel),
      notes: cleanText(body.notes),
    }

    if (existingRows.length === 0) {
      const insertResult = await userClient
        .from("nr1_diagnosis_psychosocial")
        .insert(payload)
        .select("*")

      if (insertResult.error) {
        return json(500, {
          ok: false,
          error: "nr1_diagnosis_psychosocial_create_failed",
          message: insertResult.error.message,
        })
      }

      const rows = (insertResult.data || []) as Nr1DiagnosisPsychosocialRow[]

      if (rows.length !== 1) {
        return json(500, {
          ok: false,
          error: "nr1_diagnosis_psychosocial_create_invalid_result",
          message: "Expected 1 inserted row, got " + String(rows.length),
        })
      }

      const row = rows[0]

      const factorsResult = await upsertPsychosocialFactors(userClient, row)

      if (factorsResult.error) {
        return json(500, {
          ok: false,
          error: "nr1_diagnosis_psychosocial_factors_upsert_failed",
          message: factorsResult.error.message,
        })
      }

      return json(201, {
        ok: true,
        upserted: "created",
        tenantId: scope.tenantId,
        establishmentId,
        diagnosisSessionId,
        membershipRole: scope.role,
        session: {
          id: sessionCheck.row.id,
          department_id: sessionCheck.row.department_id,
          activity_id: sessionCheck.row.activity_id,
          current_stage: sessionCheck.row.current_stage,
          overall_status: sessionCheck.row.overall_status,
          progress_percent: sessionCheck.row.progress_percent,
        },
        item: {
          id: row.id,
          tenant_id: row.tenant_id,
          diagnosis_session_id: row.diagnosis_session_id,
          has_work_overload: row.has_work_overload,
          has_excessive_pressure: row.has_excessive_pressure,
          has_role_ambiguity: row.has_role_ambiguity,
          has_low_autonomy: row.has_low_autonomy,
          has_leadership_support_failure: row.has_leadership_support_failure,
          has_peer_conflict: row.has_peer_conflict,
          has_hostile_public_contact: row.has_hostile_public_contact,
          has_constant_interruptions: row.has_constant_interruptions,
          has_task_accumulation: row.has_task_accumulation,
          has_communication_difficulty: row.has_communication_difficulty,
          has_remote_isolation: row.has_remote_isolation,
          has_badly_managed_change: row.has_badly_managed_change,
          has_report_channel: row.has_report_channel,
          notes: row.notes,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      })
    }

    if (existingRows.length > 1) {
      return json(409, {
        ok: false,
        error: "nr1_diagnosis_psychosocial_duplicate",
        message: "Expected 1 diagnosis psychosocial row, got " + String(existingRows.length),
      })
    }

    const existingRow = existingRows[0]

    const updateResult = await userClient
      .from("nr1_diagnosis_psychosocial")
      .update(payload)
      .eq("id", existingRow.id)
      .select("*")

    if (updateResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_psychosocial_update_failed",
        message: updateResult.error.message,
      })
    }

    const rows = (updateResult.data || []) as Nr1DiagnosisPsychosocialRow[]

    if (rows.length !== 1) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_psychosocial_update_invalid_result",
        message: "Expected 1 updated row, got " + String(rows.length),
      })
    }

    const row = rows[0]

    const factorsResult = await upsertPsychosocialFactors(userClient, row)

    if (factorsResult.error) {
      return json(500, {
        ok: false,
        error: "nr1_diagnosis_psychosocial_factors_upsert_failed",
        message: factorsResult.error.message,
      })
    }

    return json(200, {
      ok: true,
      upserted: "updated",
      tenantId: scope.tenantId,
      establishmentId,
      diagnosisSessionId,
      membershipRole: scope.role,
      session: {
        id: sessionCheck.row.id,
        department_id: sessionCheck.row.department_id,
        activity_id: sessionCheck.row.activity_id,
        current_stage: sessionCheck.row.current_stage,
        overall_status: sessionCheck.row.overall_status,
        progress_percent: sessionCheck.row.progress_percent,
      },
      item: {
        id: row.id,
        tenant_id: row.tenant_id,
        diagnosis_session_id: row.diagnosis_session_id,
        has_work_overload: row.has_work_overload,
        has_excessive_pressure: row.has_excessive_pressure,
        has_role_ambiguity: row.has_role_ambiguity,
        has_low_autonomy: row.has_low_autonomy,
        has_leadership_support_failure: row.has_leadership_support_failure,
        has_peer_conflict: row.has_peer_conflict,
        has_hostile_public_contact: row.has_hostile_public_contact,
        has_constant_interruptions: row.has_constant_interruptions,
        has_task_accumulation: row.has_task_accumulation,
        has_communication_difficulty: row.has_communication_difficulty,
        has_remote_isolation: row.has_remote_isolation,
        has_badly_managed_change: row.has_badly_managed_change,
        has_report_channel: row.has_report_channel,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    })
  } catch (error) {
    const response = nr1ErrorToResponsePayload(error)
    return json(response.status, response.body)
  }
}
