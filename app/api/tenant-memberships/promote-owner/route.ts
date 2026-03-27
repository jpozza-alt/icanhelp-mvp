import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type PromoteOwnerBody = {
  tenant_id?: string
  userId?: string
}

type MembershipRow = {
  tenant_id: string
  user_id: string
  role: string
}

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status })
}

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(`Missing env: ${name}`)
  }
  return value
}

function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization")
  if (!authHeader) return null

  const prefix = "Bearer "
  if (!authHeader.startsWith(prefix)) return null

  const token = authHeader.slice(prefix.length).trim()
  return token || null
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL")
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseAnonKey || !supabaseAnonKey.trim()) {
      return json(500, {
        error: "server_misconfig",
        stage: "env_validation",
        message: "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      })
    }

    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")
    const bearerToken = extractBearerToken(req)

    if (!bearerToken) {
      return json(401, {
        error: "missing_bearer",
        stage: "auth_header",
        message: "Authorization Bearer token is required",
      })
    }

    let body: PromoteOwnerBody
    try {
      body = (await req.json()) as PromoteOwnerBody
    } catch {
      return json(400, {
        error: "invalid_json",
        stage: "request_body",
        message: "Request body must be valid JSON",
      })
    }

    const tenantId = (body.tenant_id || "").trim()
    const targetUserId = (body.userId || "").trim()

    if (!tenantId || !targetUserId) {
      return json(400, {
        error: "missing_fields",
        stage: "request_body",
        message: "tenant_id and userId are required",
      })
    }

    if (!isUuid(tenantId) || !isUuid(targetUserId)) {
      return json(400, {
        error: "invalid_uuid",
        stage: "request_body",
        message: "tenant_id and userId must be valid UUIDs",
      })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const userResult = await userClient.auth.getUser()

    if (userResult.error || !userResult.data.user) {
      return json(401, {
        error: "invalid_user_session",
        stage: "auth_get_user",
        message: userResult.error?.message || "Unable to resolve authenticated user",
      })
    }

    const actorUserId = userResult.data.user.id

    const actorMembershipResult = await userClient
      .from("tenant_memberships")
      .select("tenant_id,user_id,role")
      .eq("tenant_id", tenantId)
      .eq("user_id", actorUserId)

    if (actorMembershipResult.error) {
      return json(403, {
        error: "actor_membership_unreadable",
        stage: "actor_membership_lookup",
        message: actorMembershipResult.error.message,
      })
    }

    const actorRows = (actorMembershipResult.data || []) as MembershipRow[]

    if (actorRows.length !== 1) {
      return json(403, {
        error: "actor_membership_invalid",
        stage: "actor_membership_lookup",
        message: `Expected 1 actor membership row, got ${actorRows.length}`,
      })
    }

    const actorMembership = actorRows[0]
    const actorRole = actorMembership.role

    if (actorRole !== "admin" && actorRole !== "owner") {
      return json(403, {
        error: "actor_role_forbidden",
        stage: "actor_authorization",
        message: `Role ${actorRole} cannot promote owner`,
      })
    }

    if (actorRole === "admin" && actorUserId !== targetUserId) {
      return json(403, {
        error: "admin_cross_user_forbidden",
        stage: "actor_authorization",
        message: "Admin can only request self-promotion to owner in this flow",
      })
    }

    const targetMembershipResult = await adminClient
      .from("tenant_memberships")
      .select("tenant_id,user_id,role")
      .eq("tenant_id", tenantId)
      .eq("user_id", targetUserId)

    if (targetMembershipResult.error) {
      return json(404, {
        error: "target_not_found",
        stage: "target_membership_lookup",
        message: targetMembershipResult.error.message,
      })
    }

    const targetRows = (targetMembershipResult.data || []) as MembershipRow[]

    if (targetRows.length === 0) {
      return json(404, {
        error: "target_not_found",
        stage: "target_membership_lookup",
        message: "No tenant_memberships row found for tenant_id + userId",
      })
    }

    if (targetRows.length > 1) {
      return json(409, {
        error: "duplicate_target_membership",
        stage: "target_membership_lookup",
        message: `Expected 1 target membership row, got ${targetRows.length}`,
      })
    }

    const targetMembership = targetRows[0]

    if (targetMembership.role === "owner") {
      return json(200, {
        ok: true,
        stage: "target_already_owner",
        tenant_id: tenantId,
        userId: targetUserId,
        role: "owner",
      })
    }

    if (targetMembership.role !== "admin") {
      return json(409, {
        error: "target_role_invalid",
        stage: "target_role_validation",
        message: `Expected target role admin, got ${targetMembership.role}`,
      })
    }

    const updateResult = await adminClient
      .from("tenant_memberships")
      .update({ role: "owner" })
      .eq("tenant_id", tenantId)
      .eq("user_id", targetUserId)
      .eq("role", "admin")
      .select("tenant_id,user_id,role")

    if (updateResult.error) {
      return json(500, {
        error: "promote_update_failed",
        stage: "promote_update",
        message: updateResult.error.message,
      })
    }

    const updatedRows = (updateResult.data || []) as MembershipRow[]

    if (updatedRows.length !== 1) {
      return json(500, {
        error: "promote_update_ambiguous",
        stage: "promote_update",
        message: `Expected 1 updated row, got ${updatedRows.length}`,
      })
    }

    return json(200, {
      ok: true,
      stage: "promote_update",
      tenant_id: tenantId,
      userId: targetUserId,
      role: updatedRows[0].role,
      actorUserId,
      actorRole,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return json(500, {
      error: "unhandled_exception",
      stage: "route_top_level",
      message,
    })
  }
}