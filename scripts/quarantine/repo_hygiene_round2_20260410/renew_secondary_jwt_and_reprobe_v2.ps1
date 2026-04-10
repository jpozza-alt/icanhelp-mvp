$ErrorActionPreference = 'Stop'

$RepoRoot   = 'C:\icanhelp-mvp'
$JwtPath    = Join-Path $RepoRoot 'scripts\.jwt_secondary_last.txt'
$AppBaseUrl = 'http://localhost:3000'
$DefaultSupabaseUrl = 'https://bueqlqtfeacnlhqlwtgo.supabase.co'
$Stamp      = Get-Date -Format 'yyyyMMdd_HHmmss'
$OutDir     = Join-Path $RepoRoot ("_debug\renew_secondary_jwt_and_reprobe_v2_" + $Stamp)
$SummaryPath = Join-Path $OutDir 'summary.txt'
$LoginBodyPath = Join-Path $OutDir 'login_body.json'
$LoginRespPath = Join-Path $OutDir 'login_response.json'
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

function Sanitize-Email([string]$RawEmail) {
    if ([string]::IsNullOrWhiteSpace($RawEmail)) {
        return ''
    }

    $email = $RawEmail.Trim()

    if ($email -match '^\s*SECONDARY_EMAIL\s*=\s*(.+)$') {
        $email = $Matches[1].Trim()
    }

    $email = $email.Trim('"')
    $email = $email.Trim("'")
    return $email.Trim()
}

function Invoke-CurlGet {
    param(
        [string]$Url,
        [string]$Jwt,
        [string]$OutFile
    )

    if (Test-Path -LiteralPath $OutFile) {
        Remove-Item -LiteralPath $OutFile -Force
    }

    $status = & curl.exe -sS `
        -H ("Authorization: Bearer " + $Jwt) `
        -H 'Accept: application/json' `
        -o $OutFile `
        -w '%{http_code}' `
        $Url

    return [string]$status
}

try {
    $supabaseUrl = Read-Host ("Supabase URL [" + $DefaultSupabaseUrl + "]")
    if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
        $supabaseUrl = $DefaultSupabaseUrl
    }
    $supabaseUrl = $supabaseUrl.Trim()

    $anonKey = Read-Secret 'Supabase anon key'
    if ([string]::IsNullOrWhiteSpace($anonKey)) {
        throw 'Supabase anon key is required.'
    }

    $rawEmail = Read-Host 'Secondary user email'
    $email = Sanitize-Email $rawEmail
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
    } | ConvertTo-Json -Compress

    Set-Content -LiteralPath $LoginBodyPath -Value $loginBody -Encoding UTF8

    if (Test-Path -LiteralPath $LoginRespPath) {
        Remove-Item -LiteralPath $LoginRespPath -Force
    }

    $loginUrl = $supabaseUrl.TrimEnd('/') + '/auth/v1/token?grant_type=password'

    $loginStatus = & curl.exe -sS `
        -X POST `
        -H ("apikey: " + $anonKey) `
        -H 'Content-Type: application/json' `
        -o $LoginRespPath `
        -w '%{http_code}' `
        --data-binary "@$LoginBodyPath" `
        $loginUrl

    $loginStatus = [string]$loginStatus

    if ($loginStatus -ne '200') {
        $loginBodyText = ''
        if (Test-Path -LiteralPath $LoginRespPath) {
            $loginBodyText = Get-Content -LiteralPath $LoginRespPath -Raw
        }

        Set-Content -LiteralPath $SummaryPath -Value @(
            'FAIL'
            'STAGE=RENEW_SECONDARY_JWT_AND_REPROBE_V2'
            'SECONDARY_EMAIL=' + $email
            'LOGIN_STATUS_CODE=' + $loginStatus
            'LOGIN_RESPONSE_PATH=' + $LoginRespPath
            'JWT_PATH=' + $JwtPath
            'OUT_DIR=' + $OutDir
            'SUMMARY_PATH=' + $SummaryPath
        ) -Encoding UTF8

        Get-Content -LiteralPath $SummaryPath
        Write-Host ''
        Write-Host 'LOGIN_RESPONSE_START'
        if ([string]::IsNullOrWhiteSpace($loginBodyText)) {
            Write-Host 'EMPTY_LOGIN_RESPONSE'
        } else {
            Write-Host $loginBodyText
        }
        Write-Host 'LOGIN_RESPONSE_END'
        Write-Host ''
        Read-Host 'Copy the block above and the LOGIN_RESPONSE block, then press Enter to close'
        exit
    }

    $loginJson = Get-Content -LiteralPath $LoginRespPath -Raw | ConvertFrom-Json
    $jwt = [string]$loginJson.access_token

    if ([string]::IsNullOrWhiteSpace($jwt)) {
        throw 'No access_token returned by Supabase login.'
    }

    Set-Content -LiteralPath $JwtPath -Value $jwt -Encoding UTF8

    Start-Sleep -Seconds 2

    $whoamiStatus  = Invoke-CurlGet -Url ($AppBaseUrl + '/api/debug/auth-whoami') -Jwt $jwt -OutFile $WhoAmIPath
    $contextStatus = Invoke-CurlGet -Url ($AppBaseUrl + '/api/debug/context') -Jwt $jwt -OutFile $ContextPath
    $tenantsStatus = Invoke-CurlGet -Url ($AppBaseUrl + '/api/tenants') -Jwt $jwt -OutFile $TenantsPath

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

    $all200 = ($whoamiStatus -eq '200') -and ($contextStatus -eq '200') -and ($tenantsStatus -eq '200')

    if ($all200) {
        Set-Content -LiteralPath $SummaryPath -Value @(
            'PASS'
            'STAGE=RENEW_SECONDARY_JWT_AND_REPROBE_V2'
            'SECONDARY_EMAIL=' + $email
            'LOGIN_STATUS_CODE=' + $loginStatus
            'JWT_PATH=' + $JwtPath
            'WHOAMI_STATUS_CODE=' + $whoamiStatus
            'CONTEXT_STATUS_CODE=' + $contextStatus
            'TENANTS_STATUS_CODE=' + $tenantsStatus
            'TENANTS_COUNT=' + $tenantsCount
            'LOGIN_RESPONSE_PATH=' + $LoginRespPath
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
            'STAGE=RENEW_SECONDARY_JWT_AND_REPROBE_V2'
            'SECONDARY_EMAIL=' + $email
            'LOGIN_STATUS_CODE=' + $loginStatus
            'JWT_PATH=' + $JwtPath
            'WHOAMI_STATUS_CODE=' + $whoamiStatus
            'CONTEXT_STATUS_CODE=' + $contextStatus
            'TENANTS_STATUS_CODE=' + $tenantsStatus
            'TENANTS_COUNT=' + $tenantsCount
            'LOGIN_RESPONSE_PATH=' + $LoginRespPath
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
        'STAGE=RENEW_SECONDARY_JWT_AND_REPROBE_V2'
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
