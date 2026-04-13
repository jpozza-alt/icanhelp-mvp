import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../database.types"
import type { MembershipRole, TenantMembershipRow, Nr1EstablishmentRow } from "../nr1-db-types"

type DbClient = SupabaseClient<Database>

export type AuthenticatedUser = {
  id: string
  email: string | null
}

export type Nr1Scope = {
  user: AuthenticatedUser
  tenantId: string
  membership: TenantMembershipRow
  role: MembershipRole
  establishment: Nr1EstablishmentRow | null
}

export class Nr1ScopeError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "Nr1ScopeError"
    this.status = status
    this.code = code
    this.details = details
  }
}

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Nr1ScopeError(500, "missing_env", "Missing env: " + name)
  }
  return value
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!header) return null

  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

export function createNr1AdminClient(): DbClient {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function createNr1UserClientFromBearer(bearerToken: string): DbClient {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL")
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

  return createClient<Database>(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: "Bearer " + bearerToken,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function requireAuthenticatedUser(userClient: DbClient): Promise<AuthenticatedUser> {
  const userResult = await userClient.auth.getUser()

  if (userResult.error || !userResult.data.user) {
    throw new Nr1ScopeError(
      401,
      "user_not_authenticated",
      userResult.error?.message ?? "User not authenticated",
      userResult.error ?? null,
    )
  }

  return {
    id: userResult.data.user.id,
    email: userResult.data.user.email ?? null,
  }
}

export async function requireTenantMembership(
  userClient: DbClient,
  tenantId: string,
  userId: string,
): Promise<TenantMembershipRow> {
  const membershipResult = await userClient
    .from("tenant_memberships")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)

  if (membershipResult.error) {
    throw new Nr1ScopeError(
      403,
      "membership_unreadable",
      membershipResult.error.message,
      membershipResult.error,
    )
  }

  const rows = membershipResult.data ?? []

  if (rows.length === 0) {
    throw new Nr1ScopeError(
      403,
      "membership_not_found",
      "No tenant_memberships row found for tenant_id + user_id",
    )
  }

  if (rows.length > 1) {
    throw new Nr1ScopeError(
      409,
      "membership_duplicate",
      "Expected 1 tenant membership row, got " + String(rows.length),
    )
  }

  return rows[0]
}

export async function requireEstablishmentInTenant(
  adminClient: DbClient,
  tenantId: string,
  establishmentId: string,
): Promise<Nr1EstablishmentRow> {
  const establishmentResult = await adminClient
    .from("nr1_establishments")
    .select("*")
    .eq("id", establishmentId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)

  if (establishmentResult.error) {
    throw new Nr1ScopeError(
      500,
      "establishment_lookup_failed",
      establishmentResult.error.message,
      establishmentResult.error,
    )
  }

  const rows = establishmentResult.data ?? []

  if (rows.length === 0) {
    throw new Nr1ScopeError(
      404,
      "establishment_not_found",
      "No nr1_establishments row found for tenant_id + establishment_id",
    )
  }

  if (rows.length > 1) {
    throw new Nr1ScopeError(
      409,
      "establishment_duplicate",
      "Expected 1 establishment row, got " + String(rows.length),
    )
  }

  return rows[0]
}

export function isTenantAdminRole(role: MembershipRole): boolean {
  return role === "owner" || role === "admin"
}

export async function resolveNr1Scope(input: {
  req: Request
  tenantId: string
  establishmentId?: string | null
}): Promise<Nr1Scope> {
  const bearerToken = extractBearerToken(input.req)

  if (!bearerToken) {
    throw new Nr1ScopeError(401, "missing_bearer", "Missing bearer token")
  }

  if (!input.tenantId || !input.tenantId.trim()) {
    throw new Nr1ScopeError(400, "missing_tenant_id", "tenantId is required")
  }

  const userClient = createNr1UserClientFromBearer(bearerToken)
  const adminClient = createNr1AdminClient()

  const user = await requireAuthenticatedUser(userClient)
  const membership = await requireTenantMembership(userClient, input.tenantId, user.id)

  let establishment: Nr1EstablishmentRow | null = null

  if (input.establishmentId && input.establishmentId.trim()) {
    establishment = await requireEstablishmentInTenant(adminClient, input.tenantId, input.establishmentId)
  }

  return {
    user,
    tenantId: input.tenantId,
    membership,
    role: membership.role,
    establishment,
  }
}

export function nr1ErrorToResponsePayload(error: unknown): {
  status: number
  body: Record<string, unknown>
} {
  if (error instanceof Nr1ScopeError) {
    return {
      status: error.status,
      body: {
        ok: false,
        error: error.code,
        message: error.message,
        details: error.details ?? null,
      },
    }
  }

  const message = error instanceof Error ? error.message : "Unknown error"

  return {
    status: 500,
    body: {
      ok: false,
      error: "internal_error",
      message,
    },
  }
}