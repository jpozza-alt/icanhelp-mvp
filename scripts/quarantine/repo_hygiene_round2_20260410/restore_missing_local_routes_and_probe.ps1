$ErrorActionPreference = 'Stop'

$RepoRoot    = 'C:\icanhelp-mvp'
$AppBaseUrl  = 'http://localhost:3000'
$JwtPath     = Join-Path $RepoRoot 'scripts\.jwt_secondary_last.txt'
$Stamp       = Get-Date -Format 'yyyyMMdd_HHmmss'
$OutDir      = Join-Path $RepoRoot ("_debug\restore_missing_local_routes_" + $Stamp)
$BackupDir   = Join-Path $OutDir 'backup'
$SummaryPath = Join-Path $OutDir 'summary.txt'
$WhoAmIPath  = Join-Path $OutDir 'whoami.json'
$ContextPath = Join-Path $OutDir 'context.json'
$TenantsPath = Join-Path $OutDir 'tenants.json'

$RouteWhoAmI  = Join-Path $RepoRoot 'app\api\debug\auth-whoami\route.ts'
$RouteContext = Join-Path $RepoRoot 'app\api\debug\context\route.ts'
$RouteTenants = Join-Path $RepoRoot 'app\api\tenants\route.ts'

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Test-TcpPort {
    param(
        [string]$TargetHost = '127.0.0.1',
        [int]$Port = 3000,
        [int]$TimeoutMs = 1500
    )

    $client = $null
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect($TargetHost, $Port, $null, $null)
        if (-not $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
            $client.Close()
            return $false
        }
        $null = $client.EndConnect($iar)
        $client.Close()
        return $true
    }
    catch {
        if ($client) {
            try { $client.Close() } catch {}
        }
        return $false
    }
}

function Invoke-ApiProbe {
    param(
        [string]$Url,
        [hashtable]$Headers,
        [string]$BodyOutPath
    )

    $result = [ordered]@{
        Url = $Url
        StatusCode = 0
        StatusText = ''
        Reachable = $false
        BodySaved = $false
    }

    try {
        $response = Invoke-WebRequest -Uri $Url -Headers $Headers -Method Get -TimeoutSec 20
        $result.StatusCode = [int]$response.StatusCode
        $result.StatusText = [string]$response.StatusDescription
        $result.Reachable = $true
        if ($null -ne $response.Content) {
            Set-Content -LiteralPath $BodyOutPath -Value ([string]$response.Content) -Encoding UTF8
            $result.BodySaved = $true
        }
    }
    catch {
        $ex = $_.Exception

        if ($ex.Response) {
            try { $result.StatusCode = [int]$ex.Response.StatusCode } catch {}
            try { $result.StatusText = [string]$ex.Response.StatusDescription } catch { $result.StatusText = [string]$ex.Message }
            $result.Reachable = $true

            try {
                $stream = $ex.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $body = $reader.ReadToEnd()
                    $reader.Close()
                    if ($body -ne '') {
                        Set-Content -LiteralPath $BodyOutPath -Value $body -Encoding UTF8
                        $result.BodySaved = $true
                    }
                }
            } catch {}
        }
        else {
            $result.StatusText = [string]$ex.Message
        }
    }

    return [pscustomobject]$result
}

function Backup-IfExists {
    param(
        [string]$Path,
        [string]$BackupRoot
    )

    if (Test-Path -LiteralPath $Path) {
        $safeName = $Path.Substring($RepoRoot.Length).TrimStart('\').Replace('\', '__')
        $dest = Join-Path $BackupRoot $safeName
        Copy-Item -LiteralPath $Path -Destination $dest -Force
    }
}

$WhoAmICode = @"
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return json({ ok: false, error: error?.message ?? "user_not_found" }, 401);
    }

    return json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
    });
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      500
    );
  }
}
"@

$ContextCode = @"
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return json({ ok: false, error: error?.message ?? "user_not_found" }, 401);
    }

    const { data: memberships, error: membershipsError } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", data.user.id)
      .order("tenant_id", { ascending: true });

    if (membershipsError) {
      return json({ ok: false, error: membershipsError.message }, 500);
    }

    return json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
      membership_count: memberships?.length ?? 0,
      memberships: memberships ?? [],
    });
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      500
    );
  }
}
"@

$TenantsCode = @"
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
  slug: string | null;
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
      .select("id, name, slug")
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
        slug: tenant?.slug ?? null,
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
"@

try {
    Backup-IfExists -Path $RouteWhoAmI -BackupRoot $BackupDir
    Backup-IfExists -Path $RouteContext -BackupRoot $BackupDir
    Backup-IfExists -Path $RouteTenants -BackupRoot $BackupDir

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $RouteWhoAmI) | Out-Null
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $RouteContext) | Out-Null
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $RouteTenants) | Out-Null

    Set-Content -LiteralPath $RouteWhoAmI -Value $WhoAmICode -Encoding UTF8
    Set-Content -LiteralPath $RouteContext -Value $ContextCode -Encoding UTF8
    Set-Content -LiteralPath $RouteTenants -Value $TenantsCode -Encoding UTF8

    if (-not (Test-TcpPort -TargetHost '127.0.0.1' -Port 3000)) {
        throw "Local app is not listening on localhost:3000"
    }

    if (-not (Test-Path -LiteralPath $JwtPath)) {
        throw "JWT file not found: $JwtPath"
    }

    $jwt = (Get-Content -LiteralPath $JwtPath -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($jwt)) {
        throw "JWT file is empty: $JwtPath"
    }

    Start-Sleep -Seconds 8

    $headers = @{
        'Authorization' = 'Bearer ' + $jwt
        'Accept' = 'application/json'
    }

    $whoami  = Invoke-ApiProbe -Url ($AppBaseUrl + '/api/debug/auth-whoami') -Headers $headers -BodyOutPath $WhoAmIPath
    $context = Invoke-ApiProbe -Url ($AppBaseUrl + '/api/debug/context') -Headers $headers -BodyOutPath $ContextPath
    $tenants = Invoke-ApiProbe -Url ($AppBaseUrl + '/api/tenants') -Headers $headers -BodyOutPath $TenantsPath

    $all200 = ($whoami.StatusCode -eq 200) -and ($context.StatusCode -eq 200) -and ($tenants.StatusCode -eq 200)

    $tenantsCount = -1
    if (Test-Path -LiteralPath $TenantsPath) {
        try {
            $tenantsJson = Get-Content -LiteralPath $TenantsPath -Raw | ConvertFrom-Json
            if ($tenantsJson -is [System.Array]) {
                $tenantsCount = $tenantsJson.Count
            }
            elseif ($null -ne $tenantsJson) {
                $tenantsCount = 1
            }
        } catch {}
    }

    if ($all200) {
        Set-Content -LiteralPath $SummaryPath -Value @(
            'PASS'
            'STAGE=RESTORE_MISSING_LOCAL_ROUTES_AND_PROBE'
            'WHOAMI_STATUS_CODE=' + $whoami.StatusCode
            'CONTEXT_STATUS_CODE=' + $context.StatusCode
            'TENANTS_STATUS_CODE=' + $tenants.StatusCode
            'TENANTS_COUNT=' + $tenantsCount
            'JWT_PATH=' + $JwtPath
            'ROUTE_WHOAMI=' + $RouteWhoAmI
            'ROUTE_CONTEXT=' + $RouteContext
            'ROUTE_TENANTS=' + $RouteTenants
            'WHOAMI_BODY_PATH=' + $WhoAmIPath
            'CONTEXT_BODY_PATH=' + $ContextPath
            'TENANTS_BODY_PATH=' + $TenantsPath
            'OUT_DIR=' + $OutDir
            'SUMMARY_PATH=' + $SummaryPath
        ) -Encoding UTF8
    }
    else {
        Set-Content -LiteralPath $SummaryPath -Value @(
            'FAIL'
            'STAGE=RESTORE_MISSING_LOCAL_ROUTES_AND_PROBE'
            'WHOAMI_STATUS_CODE=' + $whoami.StatusCode
            'CONTEXT_STATUS_CODE=' + $context.StatusCode
            'TENANTS_STATUS_CODE=' + $tenants.StatusCode
            'TENANTS_COUNT=' + $tenantsCount
            'JWT_PATH=' + $JwtPath
            'ROUTE_WHOAMI=' + $RouteWhoAmI
            'ROUTE_CONTEXT=' + $RouteContext
            'ROUTE_TENANTS=' + $RouteTenants
            'WHOAMI_BODY_PATH=' + $WhoAmIPath
            'CONTEXT_BODY_PATH=' + $ContextPath
            'TENANTS_BODY_PATH=' + $TenantsPath
            'OUT_DIR=' + $OutDir
            'SUMMARY_PATH=' + $SummaryPath
        ) -Encoding UTF8
    }
}
catch {
    Set-Content -LiteralPath $SummaryPath -Value @(
        'FAIL'
        'STAGE=RESTORE_MISSING_LOCAL_ROUTES_AND_PROBE'
        'ERROR=' + $_.Exception.Message
        'JWT_PATH=' + $JwtPath
        'ROUTE_WHOAMI=' + $RouteWhoAmI
        'ROUTE_CONTEXT=' + $RouteContext
        'ROUTE_TENANTS=' + $RouteTenants
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8
}
finally {
    Get-Content -LiteralPath $SummaryPath
    Write-Host ''
    Read-Host 'Copy the block above and the SUMMARY_PATH, then press Enter to close'
}
