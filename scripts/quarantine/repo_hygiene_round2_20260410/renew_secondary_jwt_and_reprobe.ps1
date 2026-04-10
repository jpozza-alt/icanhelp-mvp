$ErrorActionPreference = 'Stop'

$RepoRoot      = 'C:\icanhelp-mvp'
$JwtPath       = Join-Path $RepoRoot 'scripts\.jwt_secondary_last.txt'
$AppBaseUrl    = 'http://localhost:3000'
$DefaultSupabaseUrl = 'https://bueqlqtfeacnlhqlwtgo.supabase.co'
$Stamp         = Get-Date -Format 'yyyyMMdd_HHmmss'
$OutDir        = Join-Path $RepoRoot ("_debug\renew_secondary_jwt_and_reprobe_" + $Stamp)
$SummaryPath   = Join-Path $OutDir 'summary.txt'
$WhoAmIPath    = Join-Path $OutDir 'whoami.json'
$ContextPath   = Join-Path $OutDir 'context.json'
$TenantsPath   = Join-Path $OutDir 'tenants.json'

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $JwtPath) | Out-Null

function Read-Secret([string]$Label) {
    $sec = Read-Host $Label -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        if ($ptr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        }
    }
}

function Invoke-JsonGet {
    param(
        [string]$Url,
        [hashtable]$Headers,
        [string]$BodyOutPath
    )

    $result = [ordered]@{
        Url = $Url
        StatusCode = 0
        StatusText = ''
    }

    try {
        $response = Invoke-WebRequest -Uri $Url -Headers $Headers -Method GET -TimeoutSec 20
        $result.StatusCode = [int]$response.StatusCode
        $result.StatusText = [string]$response.StatusDescription
        if ($null -ne $response.Content) {
            Set-Content -LiteralPath $BodyOutPath -Value ([string]$response.Content) -Encoding UTF8
        }
    }
    catch {
        $ex = $_.Exception
        if ($ex.Response) {
            try { $result.StatusCode = [int]$ex.Response.StatusCode } catch {}
            try { $result.StatusText = [string]$ex.Response.StatusDescription } catch { $result.StatusText = [string]$ex.Message }

            try {
                $body = $ex.Response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                if (-not [string]::IsNullOrWhiteSpace($body)) {
                    Set-Content -LiteralPath $BodyOutPath -Value $body -Encoding UTF8
                }
            } catch {}
        }
        else {
            $result.StatusText = [string]$ex.Message
        }
    }

    return [pscustomobject]$result
}

try {
    $supabaseUrl = Read-Host ("Supabase URL [" + $DefaultSupabaseUrl + "]")
    if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
        $supabaseUrl = $DefaultSupabaseUrl
    }

    $email = Read-Host 'Secondary user email'
    if ([string]::IsNullOrWhiteSpace($email)) {
        throw 'Secondary user email is required.'
    }

    $password = Read-Secret 'Secondary user password'
    if ([string]::IsNullOrWhiteSpace($password)) {
        throw 'Secondary user password is required.'
    }

    $loginBody = @{
        email = $email
        password = $password
    } | ConvertTo-Json -Depth 5

    $loginUrl = $supabaseUrl.TrimEnd('/') + '/auth/v1/token?grant_type=password'

    $loginResponse = Invoke-RestMethod `
        -Method POST `
        -Uri $loginUrl `
        -Headers @{
            apikey = 'anon'
            'Content-Type' = 'application/json'
        } `
        -Body $loginBody

    if (-not $loginResponse.access_token) {
        throw 'No access_token returned by Supabase login.'
    }

    $jwt = [string]$loginResponse.access_token
    Set-Content -LiteralPath $JwtPath -Value $jwt -Encoding UTF8

    Start-Sleep -Seconds 2

    $headers = @{
        Authorization = "Bearer $jwt"
        Accept = 'application/json'
    }

    $whoami  = Invoke-JsonGet -Url ($AppBaseUrl + '/api/debug/auth-whoami') -Headers $headers -BodyOutPath $WhoAmIPath
    $context = Invoke-JsonGet -Url ($AppBaseUrl + '/api/debug/context') -Headers $headers -BodyOutPath $ContextPath
    $tenants = Invoke-JsonGet -Url ($AppBaseUrl + '/api/tenants') -Headers $headers -BodyOutPath $TenantsPath

    $tenantsCount = -1
    if (Test-Path -LiteralPath $TenantsPath) {
        try {
            $tenantsJson = Get-Content -LiteralPath $TenantsPath -Raw | ConvertFrom-Json
            if ($tenantsJson -is [System.Array]) {
                $tenantsCount = $tenantsJson.Count
            }
            elseif ($null -ne $tenantsJson) {
                if ($tenantsJson.PSObject.Properties.Name -contains 'data' -and $tenantsJson.data -is [System.Array]) {
                    $tenantsCount = $tenantsJson.data.Count
                }
                else {
                    $tenantsCount = 1
                }
            }
        } catch {}
    }

    $all200 = ($whoami.StatusCode -eq 200) -and ($context.StatusCode -eq 200) -and ($tenants.StatusCode -eq 200)

    if ($all200) {
        Set-Content -LiteralPath $SummaryPath -Value @(
            'PASS'
            'STAGE=RENEW_SECONDARY_JWT_AND_REPROBE'
            'SECONDARY_EMAIL=' + $email
            'JWT_PATH=' + $JwtPath
            'WHOAMI_STATUS_CODE=' + $whoami.StatusCode
            'CONTEXT_STATUS_CODE=' + $context.StatusCode
            'TENANTS_STATUS_CODE=' + $tenants.StatusCode
            'TENANTS_COUNT=' + $tenantsCount
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
            'STAGE=RENEW_SECONDARY_JWT_AND_REPROBE'
            'SECONDARY_EMAIL=' + $email
            'JWT_PATH=' + $JwtPath
            'WHOAMI_STATUS_CODE=' + $whoami.StatusCode
            'CONTEXT_STATUS_CODE=' + $context.StatusCode
            'TENANTS_STATUS_CODE=' + $tenants.StatusCode
            'TENANTS_COUNT=' + $tenantsCount
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
        'STAGE=RENEW_SECONDARY_JWT_AND_REPROBE'
        'ERROR=' + $_.Exception.Message
        'JWT_PATH=' + $JwtPath
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8
}
finally {
    Get-Content -LiteralPath $SummaryPath
    Write-Host ''
    Read-Host 'Copy the block above and the SUMMARY_PATH, then press Enter to close'
}
