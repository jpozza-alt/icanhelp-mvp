$ErrorActionPreference = 'Stop'

$RepoRoot      = 'C:\icanhelp-mvp'
$AppBaseUrl    = 'http://localhost:3000'
$JwtPath       = Join-Path $RepoRoot 'scripts\.jwt_secondary_last.txt'
$Stamp         = Get-Date -Format 'yyyyMMdd_HHmmss'
$OutDir        = Join-Path $RepoRoot ("_debug\secondary_jwt_endpoint_probe_" + $Stamp)
$SummaryPath   = Join-Path $OutDir 'summary.txt'
$WhoAmIPath    = Join-Path $OutDir 'whoami.json'
$ContextPath   = Join-Path $OutDir 'context.json'
$TenantsPath   = Join-Path $OutDir 'tenants.json'

$FinalResult = 'FAIL'
$FinalError  = ''

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

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
        BodyOutPath = $BodyOutPath
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
            try {
                $result.StatusCode = [int]$ex.Response.StatusCode
            } catch {}

            try {
                $result.StatusText = [string]$ex.Response.StatusDescription
            } catch {
                $result.StatusText = [string]$ex.Message
            }

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

try {
    if (-not (Test-Path -LiteralPath $RepoRoot)) {
        throw "Repo root not found: $RepoRoot"
    }

    if (-not (Test-Path -LiteralPath $JwtPath)) {
        throw "JWT file not found: $JwtPath"
    }

    $tcpOpen = Test-TcpPort -TargetHost '127.0.0.1' -Port 3000
    if (-not $tcpOpen) {
        throw "App is not listening on localhost:3000"
    }

    $jwt = (Get-Content -LiteralPath $JwtPath -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($jwt)) {
        throw "JWT file is empty: $JwtPath"
    }

    $headers = @{
        'Authorization' = 'Bearer ' + $jwt
        'Accept' = 'application/json'
    }

    $whoami  = Invoke-ApiProbe -Url ($AppBaseUrl + '/api/debug/auth-whoami') -Headers $headers -BodyOutPath $WhoAmIPath
    $context = Invoke-ApiProbe -Url ($AppBaseUrl + '/api/debug/context')     -Headers $headers -BodyOutPath $ContextPath
    $tenants = Invoke-ApiProbe -Url ($AppBaseUrl + '/api/tenants')           -Headers $headers -BodyOutPath $TenantsPath

    $no401 = ($whoami.StatusCode -ne 401) -and ($context.StatusCode -ne 401) -and ($tenants.StatusCode -ne 401)
    $all200 = ($whoami.StatusCode -eq 200) -and ($context.StatusCode -eq 200) -and ($tenants.StatusCode -eq 200)

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
                elseif ($tenantsJson.PSObject.Properties.Name.Count -gt 0) {
                    $tenantsCount = 1
                }
            }
        } catch {}
    }

    if ($no401 -and $all200) {
        $FinalResult = 'PASS'
    }
    else {
        $FinalResult = 'FAIL'
    }

    Set-Content -LiteralPath $SummaryPath -Value @(
        $FinalResult
        'STAGE=SECONDARY_JWT_ENDPOINT_PROBE'
        'APP_BASE_URL=' + $AppBaseUrl
        'JWT_PATH=' + $JwtPath
        'WHOAMI_STATUS_CODE=' + $whoami.StatusCode
        'WHOAMI_STATUS_TEXT=' + $whoami.StatusText
        'CONTEXT_STATUS_CODE=' + $context.StatusCode
        'CONTEXT_STATUS_TEXT=' + $context.StatusText
        'TENANTS_STATUS_CODE=' + $tenants.StatusCode
        'TENANTS_STATUS_TEXT=' + $tenants.StatusText
        'TENANTS_COUNT=' + $tenantsCount
        'NO_401=' + $no401
        'ALL_200=' + $all200
        'WHOAMI_BODY_PATH=' + $WhoAmIPath
        'CONTEXT_BODY_PATH=' + $ContextPath
        'TENANTS_BODY_PATH=' + $TenantsPath
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8
}
catch {
    $FinalResult = 'FAIL'
    $FinalError = $_.Exception.Message

    Set-Content -LiteralPath $SummaryPath -Value @(
        'FAIL'
        'STAGE=SECONDARY_JWT_ENDPOINT_PROBE'
        'ERROR=' + $FinalError
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8
}
finally {
    Write-Host ''
    if (Test-Path -LiteralPath $SummaryPath) {
        Get-Content -LiteralPath $SummaryPath
    }
    else {
        Write-Host 'FAIL'
        Write-Host 'STAGE=SECONDARY_JWT_ENDPOINT_PROBE'
        Write-Host ('ERROR=' + $FinalError)
        Write-Host ('OUT_DIR=' + $OutDir)
        Write-Host ('SUMMARY_PATH=' + $SummaryPath)
    }

    Write-Host ''
    Read-Host 'Copy the block above and the SUMMARY_PATH, then press Enter to close'
}
