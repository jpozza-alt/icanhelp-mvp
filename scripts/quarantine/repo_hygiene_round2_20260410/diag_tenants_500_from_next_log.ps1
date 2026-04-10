$ErrorActionPreference = 'Stop'

$RepoRoot     = 'C:\icanhelp-mvp'
$DebugRoot    = Join-Path $RepoRoot '_debug'
$AppBaseUrl   = 'http://localhost:3000'
$JwtPath      = Join-Path $RepoRoot 'scripts\.jwt_secondary_last.txt'
$Stamp        = Get-Date -Format 'yyyyMMdd_HHmmss'
$OutDir       = Join-Path $RepoRoot ("_debug\diag_tenants_500_from_next_log_" + $Stamp)
$SummaryPath  = Join-Path $OutDir 'summary.txt'
$LogTailPath  = Join-Path $OutDir 'next_log_tail.txt'
$ProbePath    = Join-Path $OutDir 'tenants_probe.txt'

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

function Invoke-TenantsProbe {
    param(
        [string]$Url,
        [hashtable]$Headers
    )

    $result = [ordered]@{
        StatusCode = 0
        StatusText = ''
        Reachable = $false
    }

    try {
        $response = Invoke-WebRequest -Uri $Url -Headers $Headers -Method Get -TimeoutSec 20
        $result.StatusCode = [int]$response.StatusCode
        $result.StatusText = [string]$response.StatusDescription
        $result.Reachable = $true
    }
    catch {
        $ex = $_.Exception
        if ($ex.Response) {
            try { $result.StatusCode = [int]$ex.Response.StatusCode } catch {}
            try { $result.StatusText = [string]$ex.Response.StatusDescription } catch { $result.StatusText = [string]$ex.Message }
            $result.Reachable = $true
        }
        else {
            $result.StatusText = [string]$ex.Message
        }
    }

    return [pscustomobject]$result
}

try {
    if (-not (Test-TcpPort -TargetHost '127.0.0.1' -Port 3000)) {
        throw 'Local app is not listening on localhost:3000'
    }

    if (-not (Test-Path -LiteralPath $JwtPath)) {
        throw ('JWT file not found: ' + $JwtPath)
    }

    $jwt = (Get-Content -LiteralPath $JwtPath -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($jwt)) {
        throw ('JWT file is empty: ' + $JwtPath)
    }

    $latestLog = Get-ChildItem -LiteralPath $DebugRoot -Filter 'next_dev.log' -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestLog) {
        throw 'No next_dev.log found under _debug'
    }

    $beforeCount = (Get-Content -LiteralPath $latestLog.FullName | Measure-Object -Line).Lines

    $headers = @{
        'Authorization' = 'Bearer ' + $jwt
        'Accept' = 'application/json'
    }

    $probe = Invoke-TenantsProbe -Url ($AppBaseUrl + '/api/tenants') -Headers $headers

    Start-Sleep -Seconds 2

    $allLines = Get-Content -LiteralPath $latestLog.FullName
    $startIndex = 0
    if ($beforeCount -gt 0 -and $beforeCount -lt $allLines.Count) {
        $startIndex = $beforeCount - 1
    }

    $tailLines = $allLines[$startIndex..($allLines.Count - 1)]
    Set-Content -LiteralPath $LogTailPath -Value $tailLines -Encoding UTF8

    Set-Content -LiteralPath $ProbePath -Value @(
        'TENANTS_STATUS_CODE=' + $probe.StatusCode
        'TENANTS_STATUS_TEXT=' + $probe.StatusText
        'LOG_SOURCE=' + $latestLog.FullName
        'BEFORE_LINE_COUNT=' + $beforeCount
        'AFTER_LINE_COUNT=' + $allLines.Count
        'OUT_DIR=' + $OutDir
    ) -Encoding UTF8

    Set-Content -LiteralPath $SummaryPath -Value @(
        'PASS'
        'STAGE=DIAG_TENANTS_500_FROM_NEXT_LOG'
        'TENANTS_STATUS_CODE=' + $probe.StatusCode
        'TENANTS_STATUS_TEXT=' + $probe.StatusText
        'LOG_SOURCE=' + $latestLog.FullName
        'LOG_TAIL_PATH=' + $LogTailPath
        'PROBE_PATH=' + $ProbePath
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8
}
catch {
    Set-Content -LiteralPath $SummaryPath -Value @(
        'FAIL'
        'STAGE=DIAG_TENANTS_500_FROM_NEXT_LOG'
        'ERROR=' + $_.Exception.Message
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8
}
finally {
    Get-Content -LiteralPath $SummaryPath
    Write-Host ''
    if (Test-Path -LiteralPath $LogTailPath) {
        Write-Host 'BEGIN_NEXT_TENANTS_TAIL'
        Get-Content -LiteralPath $LogTailPath
        Write-Host 'END_NEXT_TENANTS_TAIL'
    }
    Write-Host ''
    Read-Host 'Copy the block above and the text between BEGIN_NEXT_TENANTS_TAIL and END_NEXT_TENANTS_TAIL, then press Enter to close'
}
