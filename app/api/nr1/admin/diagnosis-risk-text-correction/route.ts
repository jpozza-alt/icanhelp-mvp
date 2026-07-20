import { NextRequest, NextResponse } from "next/server"
import {
  createNr1AdminClient,
  isTenantAdminRole,
  nr1ErrorToResponsePayload,
  resolveNr1Scope,
} from "@/lib/server/nr1-scope"
import { executeNr1AdminRiskTextCorrection } from "@/lib/server/nr1-admin-risk-text-correction"

export const dynamic = "force-dynamic"

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status })
}

function getTenantId(req: NextRequest): string {
  return (
    req.nextUrl.searchParams.get("tenantId") ||
    req.headers.get("x-icanhelp-tenant") ||
    ""
  ).trim()
}

export async function POST(req: NextRequest) {
  const tenantId = getTenantId(req)

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return json(400, {
      ok: false,
      error: "invalid_json",
      message: "Request body must be valid JSON",
    })
  }

  const result = await executeNr1AdminRiskTextCorrection(
    { req, tenantId, rawBody },
    {
      resolveScope: (input) => resolveNr1Scope(input),
      isTenantAdminRole,
      callRpc: async (args) => {
        const rpcResult = await createNr1AdminClient().rpc(
          "nr1_admin_correct_diagnosis_risk_texts",
          args,
        )
        return { data: rpcResult.data, error: rpcResult.error }
      },
      mapScopeError: (error) => {
        const mapped = nr1ErrorToResponsePayload(error)
        return { status: mapped.status, body: mapped.body }
      },
    },
  )

  return json(result.status, result.body)
}
