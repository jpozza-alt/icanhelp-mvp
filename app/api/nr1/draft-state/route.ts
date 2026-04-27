import { NextRequest, NextResponse } from "next/server"
import {
  Nr1DraftStateInsert,
  Nr1DraftStateRow,
  Nr1DraftStateUpdate,
} from "@/lib/nr1-db-types"
import {
  createNr1AdminClient,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"

type DraftStateBody = {
  establishment_id?: string | null
  screen_key?: string | null
  record_type?: string | null
  record_id?: string | null
  payload_json?: unknown
  is_dirty?: boolean | null
}

type DraftPayloadJson = Nr1DraftStateInsert["payload_json"]

function normalizePayloadJson(value: unknown): DraftPayloadJson {
  return (value ?? {}) as DraftPayloadJson
}

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status })
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

function getTenantId(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("tenantId"))
}

function getEstablishmentId(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("establishmentId"))
}

function getScreenKey(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("screenKey"))
}

function getRecordType(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("recordType"))
}

function getRecordId(req: NextRequest): string {
  return cleanText(req.nextUrl.searchParams.get("recordId"))
}

export async function GET(req: NextRequest) {
  const tenantId = getTenantId(req)
  const establishmentId = getEstablishmentId(req)
  const screenKey = getScreenKey(req)
  const recordType = getRecordType(req)
  const recordId = getRecordId(req)

  if (!tenantId) {
    return jsonResponse(
      {
        error: "missing_tenant_id",
        message: "tenantId is required",
      },
      400,
    )
  }

  if (!establishmentId) {
    return jsonResponse(
      {
        error: "missing_establishment_id",
        message: "Provide establishmentId in querystring",
      },
      400,
    )
  }

  if (!screenKey) {
    return jsonResponse(
      {
        error: "missing_screen_key",
        message: "Provide screenKey in querystring",
      },
      400,
    )
  }

  try {
    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const adminClient = createNr1AdminClient()

    let query = adminClient
      .from("nr1_draft_state")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .eq("screen_key", screenKey)

    if (recordType) {
      query = query.eq("record_type", recordType)
    }

    if (recordId) {
      query = query.eq("record_id", recordId)
    }

    const result = await query.order("last_saved_at", { ascending: false })

    if (result.error) {
      return jsonResponse(
        {
          error: "nr1_draft_state_list_failed",
          message: result.error.message,
        },
        500,
      )
    }

    const rows = (result.data || []) as Nr1DraftStateRow[]

    return jsonResponse({
      data: rows,
      meta: {
        tenantId: scope.tenantId,
        establishmentId,
        membershipRole: scope.role,
        screenKey,
        count: rows.length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected nr1 draft-state GET error"
    return jsonResponse(
      {
        error: "nr1_draft_state_get_unexpected",
        message,
      },
      500,
    )
  }
}

export async function POST(req: NextRequest) {
  const tenantId = getTenantId(req)

  if (!tenantId) {
    return jsonResponse(
      {
        error: "missing_tenant_id",
        message: "tenantId is required",
      },
      400,
    )
  }

  let body: DraftStateBody
  try {
    body = (await req.json()) as DraftStateBody
  } catch {
    return jsonResponse(
      {
        error: "invalid_json",
        message: "Request body must be valid JSON",
      },
      400,
    )
  }

  const establishmentId = cleanText(body.establishment_id)
  const screenKey = cleanText(body.screen_key)
  const recordType = cleanText(body.record_type)
  const recordId = cleanText(body.record_id)

  if (!establishmentId) {
    return jsonResponse(
      {
        error: "missing_establishment_id",
        message: "establishment_id is required",
      },
      400,
    )
  }

  if (!screenKey) {
    return jsonResponse(
      {
        error: "missing_screen_key",
        message: "screen_key is required",
      },
      400,
    )
  }

  if (!recordType) {
    return jsonResponse(
      {
        error: "missing_record_type",
        message: "record_type is required",
      },
      400,
    )
  }

  try {
    const scope = await resolveNr1Scope({
      req,
      tenantId,
      establishmentId,
    })

    const adminClient = createNr1AdminClient()

    let existingQuery = adminClient
      .from("nr1_draft_state")
      .select("*")
      .eq("tenant_id", scope.tenantId)
      .eq("establishment_id", establishmentId)
      .eq("screen_key", screenKey)
      .eq("record_type", recordType)

    if (recordId) {
      existingQuery = existingQuery.eq("record_id", recordId)
    } else {
      existingQuery = existingQuery.is("record_id", null)
    }

    const existingResult = await existingQuery
      .order("last_saved_at", { ascending: false })
      .limit(1)

    if (existingResult.error) {
      return jsonResponse(
        {
          error: "nr1_draft_state_lookup_failed",
          message: existingResult.error.message,
        },
        500,
      )
    }

    const existingRow = ((existingResult.data || [])[0] || null) as Nr1DraftStateRow | null

    const basePayload = {
      tenant_id: scope.tenantId,
      establishment_id: establishmentId,
      screen_key: screenKey,
      record_type: recordType,
      record_id: recordId || null,
      payload_json: normalizePayloadJson(body.payload_json),
      is_dirty: typeof body.is_dirty === "boolean" ? body.is_dirty : true,
      last_saved_at: new Date().toISOString(),
    }

    if (existingRow) {
      const updatePayload: Nr1DraftStateUpdate = {
        payload_json: basePayload.payload_json,
        is_dirty: basePayload.is_dirty,
        last_saved_at: basePayload.last_saved_at,
      }

      const updateResult = await adminClient
        .from("nr1_draft_state")
        .update(updatePayload)
        .eq("id", existingRow.id)
        .select("*")

      if (updateResult.error) {
        return jsonResponse(
          {
            error: "nr1_draft_state_update_failed",
            message: updateResult.error.message,
          },
          500,
        )
      }

      const rows = (updateResult.data || []) as Nr1DraftStateRow[]
      return jsonResponse(
        {
          data: rows[0] ?? null,
          meta: {
            tenantId: scope.tenantId,
            establishmentId,
            membershipRole: scope.role,
            action: "updated",
          },
        },
        200,
      )
    }

    const insertPayload: Nr1DraftStateInsert = {
      tenant_id: basePayload.tenant_id,
      establishment_id: basePayload.establishment_id,
      screen_key: basePayload.screen_key,
      record_type: basePayload.record_type,
      record_id: basePayload.record_id,
      payload_json: basePayload.payload_json,
      is_dirty: basePayload.is_dirty,
      last_saved_at: basePayload.last_saved_at,
    }

    const insertResult = await adminClient
      .from("nr1_draft_state")
      .insert(insertPayload)
      .select("*")

    if (insertResult.error) {
      return jsonResponse(
        {
          error: "nr1_draft_state_insert_failed",
          message: insertResult.error.message,
        },
        500,
      )
    }

    const rows = (insertResult.data || []) as Nr1DraftStateRow[]
    return jsonResponse(
      {
        data: rows[0] ?? null,
        meta: {
          tenantId: scope.tenantId,
          establishmentId,
          membershipRole: scope.role,
          action: "inserted",
        },
      },
      201,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected nr1 draft-state POST error"
    return jsonResponse(
      {
        error: "nr1_draft_state_post_unexpected",
        message,
      },
      500,
    )
  }
}