param(
    [string]$Spec = "e2e/nr1-mvp-journey.spec.ts"
)

$ErrorActionPreference = "Stop"

$Repo = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Repo

$RunId = "pwmvp02_" + (Get-Date -Format "yyyyMMdd_HHmmss") + "_" + ([guid]::NewGuid().ToString("N").Substring(0,8))

$Email = "$RunId@example.invalid"
$Password = "PwMvp02!" + ([guid]::NewGuid().ToString("N").Substring(0,16))

$TenantId = [guid]::NewGuid().ToString()
$MembershipId = [guid]::NewGuid().ToString()
$TenantSlug = $RunId.ToLowerInvariant()

$UserId = $null
$DbContainer = $null
$FixtureCreated = $false

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$OutDir = Join-Path $Repo "_debug\pw_mvp_02_official_runner_$Stamp"
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$PlaywrightLog = Join-Path $OutDir "PLAYWRIGHT.txt"
$SummaryFile = Join-Path $OutDir "SUMMARY.txt"

function Write-SummaryLine {
    param([string]$Text)

    $Text | Tee-Object -FilePath $SummaryFile -Append
}

function Get-LocalSupabaseEnvironment {
    $raw = & supabase status -o env 2>$null
    $statusExitCode = $LASTEXITCODE

    $map = @{}

    foreach ($line in $raw) {
        if ($line -match '^([^=]+)="?(.*?)"?$') {
            $map[$matches[1]] = $matches[2].Trim('"')
        }
    }

    if ($map.Count -eq 0) {
        throw "LOCAL_SUPABASE_NOT_RUNNING"
    }

    if ($statusExitCode -ne 0) {
        Write-Host "PW_MVP_SUPABASE_STATUS_WARNING=NONZERO_EXIT_WITH_USABLE_ENV"
    }

    return $map
}

function Resolve-Value {
    param(
        [hashtable]$Map,
        [string[]]$Names
    )

    foreach ($name in $Names) {
        if (
            $Map.ContainsKey($name) -and
            -not [string]::IsNullOrWhiteSpace([string]$Map[$name])
        ) {
            return [string]$Map[$name]
        }
    }

    return $null
}

function Invoke-LocalPsql {
    param([string]$Sql)

    if (-not $script:DbContainer) {
        throw "LOCAL_DB_CONTAINER_NOT_RESOLVED"
    }

    $output = & docker exec `
        -i `
        $script:DbContainer `
        psql `
        -U postgres `
        -d postgres `
        -v ON_ERROR_STOP=1 `
        -Atc $Sql 2>&1

    if ($LASTEXITCODE -ne 0) {
        throw "LOCAL_PSQL_FAILED: $($output -join ' ')"
    }

    return ($output -join "`n").Trim()
}

function Cleanup-Fixture {
    param(
        [string]$TenantIdToRemove,
        [string]$UserIdToRemove,
        [string]$ApiUrl,
        [string]$AdminKey
    )

    $cleanupErrors = New-Object System.Collections.Generic.List[string]

    if (
        $script:DbContainer -and
        -not [string]::IsNullOrWhiteSpace($TenantIdToRemove)
    ) {
        try {
            $safeTenant = $TenantIdToRemove.Replace("'", "''")

            $cleanupSql = @"
BEGIN;

DELETE FROM public.knowledge_items
WHERE tenant_id = '$safeTenant';

DELETE FROM public.nr1_assessments
WHERE tenant_id = '$safeTenant';

DELETE FROM public.nr1_diagnosis_psychosocial_factors
WHERE tenant_id = '$safeTenant';

DELETE FROM public.pasini_recruitment_requests
WHERE tenant_id = '$safeTenant';

DELETE FROM public.tenants
WHERE id = '$safeTenant';

COMMIT;
"@

            Invoke-LocalPsql -Sql $cleanupSql | Out-Null

            $remaining = Invoke-LocalPsql -Sql @"
SELECT count(*)
FROM public.tenants
WHERE id = '$safeTenant';
"@

            if ($remaining -ne "0") {
                throw "TENANT_STILL_PRESENT_AFTER_CLEANUP"
            }
        }
        catch {
            $cleanupErrors.Add(
                "TENANT_DATA_CLEANUP_FAILED=$($_.Exception.Message)"
            )
        }
    }

    if (
        $UserIdToRemove -and
        $ApiUrl -and
        $AdminKey
    ) {
        try {
            $headers = @{
                apikey        = $AdminKey
                Authorization = "Bearer $AdminKey"
            }

            Invoke-RestMethod `
                -Method Delete `
                -Uri "$ApiUrl/auth/v1/admin/users/$UserIdToRemove" `
                -Headers $headers `
                -ErrorAction Stop | Out-Null
        }
        catch {
            $cleanupErrors.Add(
                "AUTH_USER_CLEANUP_FAILED=$($_.Exception.Message)"
            )
        }
    }

    return $cleanupErrors
}

try {
    if (-not (Test-Path -LiteralPath $Spec)) {
        throw "SPEC_NOT_FOUND=$Spec"
    }

    if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
        throw "SUPABASE_CLI_NOT_FOUND"
    }

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "DOCKER_CLI_NOT_FOUND"
    }

    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        throw "PNPM_NOT_FOUND"
    }

    $envMap = Get-LocalSupabaseEnvironment

    $ApiUrl = Resolve-Value `
        -Map $envMap `
        -Names @("API_URL", "SUPABASE_URL")

    $AnonKey = Resolve-Value `
        -Map $envMap `
        -Names @(
            "ANON_KEY",
            "SUPABASE_ANON_KEY",
            "PUBLISHABLE_KEY"
        )

    $AdminKey = Resolve-Value `
        -Map $envMap `
        -Names @(
            "SERVICE_ROLE_KEY",
            "SUPABASE_SERVICE_ROLE_KEY",
            "SECRET_KEY"
        )

    if (-not $ApiUrl) {
        throw "LOCAL_API_URL_NOT_FOUND"
    }

    if (-not $AnonKey) {
        throw "LOCAL_ANON_KEY_NOT_FOUND"
    }

    if (-not $AdminKey) {
        throw "LOCAL_ADMIN_KEY_NOT_FOUND"
    }

    $dbCandidates = @(
        docker ps `
            --format "{{.Names}}" |
        Where-Object {
            $_ -match '^supabase_db_' -or
            $_ -match 'supabase.*db'
        }
    )

    if ($dbCandidates.Count -ne 1) {
        throw "LOCAL_DB_CONTAINER_AMBIGUOUS_OR_MISSING COUNT=$($dbCandidates.Count)"
    }

    $DbContainer = $dbCandidates[0]

    $headers = @{
        apikey        = $AdminKey
        Authorization = "Bearer $AdminKey"
        "Content-Type" = "application/json"
    }

    $body = @{
        email         = $Email
        password      = $Password
        email_confirm = $true
    } | ConvertTo-Json

    $createdUser = Invoke-RestMethod `
        -Method Post `
        -Uri "$ApiUrl/auth/v1/admin/users" `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    $UserId = [string]$createdUser.id

    if ([string]::IsNullOrWhiteSpace($UserId)) {
        throw "LOCAL_AUTH_USER_ID_NOT_RETURNED"
    }

    $tenantName = "PW MVP 02 $RunId"

    $tenantSql = @"
INSERT INTO public.tenants (
    id,
    name,
    slug,
    created_at,
    created_by,
    updated_at,
    updated_by
)
VALUES (
    '$TenantId',
    '$tenantName',
    '$TenantSlug',
    now(),
    '$UserId',
    now(),
    '$UserId'
);

INSERT INTO public.tenant_memberships (
    id,
    tenant_id,
    user_id,
    role,
    created_at,
    created_by,
    updated_at,
    updated_by
)
VALUES (
    '$MembershipId',
    '$TenantId',
    '$UserId',
    'owner',
    now(),
    '$UserId',
    now(),
    '$UserId'
);
"@

    Invoke-LocalPsql -Sql $tenantSql | Out-Null

    $FixtureCreated = $true

    $membershipCheck = Invoke-LocalPsql -Sql @"
SELECT count(*)
FROM public.tenant_memberships
WHERE tenant_id = '$TenantId'
  AND user_id = '$UserId'
  AND role = 'owner';
"@

    if ($membershipCheck -ne "1") {
        throw "LOCAL_OWNER_MEMBERSHIP_NOT_CONFIRMED"
    }

    $env:PW_MVP_EMAIL = $Email
    $env:PW_MVP_PASSWORD = $Password

    $env:NEXT_PUBLIC_SUPABASE_URL = $ApiUrl
    $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = $AnonKey
    $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $AnonKey

    $env:SUPABASE_URL = $ApiUrl
    $env:SUPABASE_ANON_KEY = $AnonKey

    $env:PW_OUTPUT_DIR = Join-Path $OutDir "playwright-results"

    Write-Host "PW_MVP_FIXTURE_CREATED=True"
    Write-Host "PW_MVP_RUN_ID=$RunId"
    Write-Host "PW_MVP_TENANT_ISOLATED=True"
    Write-Host "PW_MVP_EXECUTING=True"

    & pnpm exec playwright test `
        $Spec `
        --config=playwright.mvp.config.ts `
        --project=chromium 2>&1 |
        Tee-Object -FilePath $PlaywrightLog

    $PlaywrightExit = $LASTEXITCODE

    if ($PlaywrightExit -ne 0) {
        throw "PLAYWRIGHT_EXIT_CODE=$PlaywrightExit"
    }

    Write-SummaryLine "STATUS=PASS"
    Write-SummaryLine "REASON=PW_MVP_02_OFFICIAL_RUNNER_EXECUTION_PASS"
    Write-SummaryLine "RUN_ID=$RunId"
    Write-SummaryLine "FIXTURE_CREATED=$FixtureCreated"
    Write-SummaryLine "TENANT_ISOLATED=True"
    Write-SummaryLine "PLAYWRIGHT_EXIT_CODE=0"
    Write-SummaryLine "EVIDENCIAS=$OutDir"
}
catch {
    Write-SummaryLine "STATUS=FAIL"
    Write-SummaryLine "REASON=$($_.Exception.Message)"
    Write-SummaryLine "RUN_ID=$RunId"
    Write-SummaryLine "FIXTURE_CREATED=$FixtureCreated"
    Write-SummaryLine "EVIDENCIAS=$OutDir"
}
finally {
    $cleanup = Cleanup-Fixture `
        -TenantIdToRemove $TenantId `
        -UserIdToRemove $UserId `
        -ApiUrl $ApiUrl `
        -AdminKey $AdminKey

    if ($cleanup.Count -eq 0) {
        Write-SummaryLine "CLEANUP_ATTEMPTED=True"
        Write-SummaryLine "CLEANUP_ERRORS=0"
    }
    else {
        Write-SummaryLine "CLEANUP_ATTEMPTED=True"
        Write-SummaryLine "CLEANUP_ERRORS=$($cleanup.Count)"

        foreach ($item in $cleanup) {
            Write-SummaryLine $item
        }
    }

    Remove-Item Env:PW_MVP_EMAIL -ErrorAction SilentlyContinue
    Remove-Item Env:PW_MVP_PASSWORD -ErrorAction SilentlyContinue

    Write-SummaryLine "REMOTE_DB_CHANGED=False"
    Write-SummaryLine "MIGRATION_CHANGED=False"
    Write-SummaryLine "RLS_CHANGED=False"
    Write-SummaryLine "COMMIT=False"
    Write-SummaryLine "PUSH=False"
    Write-SummaryLine "DEPLOY=False"
    Write-SummaryLine "PRODUCTION_CHANGED=False"

    Write-Host ""
    Write-Host "===== PW-MVP-02 RUN SUMMARY ====="
    Get-Content -LiteralPath $SummaryFile
}