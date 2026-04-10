$ErrorActionPreference = 'Stop'

$RepoRoot    = 'C:\icanhelp-mvp'
$AppBaseUrl  = 'http://localhost:3000'
$Port        = 3000
$Stamp       = Get-Date -Format 'yyyyMMdd_HHmmss'
$OutDir      = Join-Path $RepoRoot ("_debug\app_boot_and_reachability_safe_" + $Stamp)
$LogPath     = Join-Path $OutDir 'next_dev.log'
$LogTailPath = Join-Path $OutDir 'next_dev.tail.txt'
$ProbePath   = Join-Path $OutDir 'probe.txt'
$SummaryPath = Join-Path $OutDir 'summary.txt'
$CommandPath = Join-Path $OutDir 'launch_command.txt'

$FinalResult = 'FAIL'
$FinalError  = ''
$LauncherPid = ''
$LaunchMode  = 'UNKNOWN'
$PreExistingTcp = $false
$TcpOpen = $false
$LaunchedNewProcess = $false

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

function Invoke-Probe {
    param([string]$Url)

    $result = [ordered]@{
        Url = $Url
        StatusCode = 0
        StatusText = ''
        Reachable = $false
        ContentSnippet = ''
    }

    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 8
        $result.StatusCode = [int]$response.StatusCode
        $result.StatusText = [string]$response.StatusDescription
        $result.Reachable = $true

        if ($null -ne $response.Content) {
            $content = [string]$response.Content
            if ($content.Length -gt 300) {
                $result.ContentSnippet = $content.Substring(0,300)
            }
            else {
                $result.ContentSnippet = $content
            }
        }
    }
    catch {
        $ex = $_.Exception

        if ($ex.Response) {
            try {
                $statusCodeObj = $ex.Response.StatusCode
                if ($null -ne $statusCodeObj) {
                    $result.StatusCode = [int]$statusCodeObj
                }
            } catch {}

            try {
                $result.StatusText = [string]$ex.Response.StatusDescription
            } catch {
                $result.StatusText = [string]$ex.Message
            }

            $result.Reachable = $true
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

    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'package.json'))) {
        throw "package.json not found in repo root: $RepoRoot"
    }

    $PreExistingTcp = Test-TcpPort -TargetHost '127.0.0.1' -Port $Port

    if ($PreExistingTcp) {
        $LaunchMode = 'REUSE_EXISTING_LISTENER'
        Set-Content -LiteralPath $CommandPath -Value 'Port 3000 was already open before launch attempt. No new dev server was started.' -Encoding UTF8
    }
    else {
        $LaunchMode = 'START_NEW_DEV_SERVER'
        $cmdLine = 'cd /d "' + $RepoRoot + '" && npm.cmd run dev 1>"' + $LogPath + '" 2>&1'
        Set-Content -LiteralPath $CommandPath -Value $cmdLine -Encoding UTF8

        $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/c',$cmdLine -WorkingDirectory $RepoRoot -WindowStyle Minimized -PassThru
        $LaunchedNewProcess = $true
        $LauncherPid = [string]$proc.Id
    }

    $TcpOpen = $PreExistingTcp

    if (-not $TcpOpen) {
        for ($i = 1; $i -le 90; $i++) {
            Start-Sleep -Seconds 2
            if (Test-TcpPort -TargetHost '127.0.0.1' -Port $Port) {
                $TcpOpen = $true
                break
            }
        }
    }

    $rootProbe = Invoke-Probe -Url ($AppBaseUrl + '/')
    $whoamiProbe = Invoke-Probe -Url ($AppBaseUrl + '/api/debug/auth-whoami')

    $rootLooksLikeNext = $false
    if ($rootProbe.ContentSnippet -match '__next' -or $rootProbe.ContentSnippet -match 'next' -or $rootProbe.ContentSnippet -match '<!DOCTYPE html') {
        $rootLooksLikeNext = $true
    }

    if (Test-Path -LiteralPath $LogPath) {
        try {
            Get-Content -LiteralPath $LogPath -Tail 120 | Set-Content -LiteralPath $LogTailPath -Encoding UTF8
        }
        catch {
            Set-Content -LiteralPath $LogTailPath -Value ('Could not read log tail: ' + $_.Exception.Message) -Encoding UTF8
        }
    }
    else {
        Set-Content -LiteralPath $LogTailPath -Value 'Log file not found.' -Encoding UTF8
    }

    $probeLines = @()
    $probeLines += 'APP_BASE_URL=' + $AppBaseUrl
    $probeLines += 'PORT=' + $Port
    $probeLines += 'PREEXISTING_TCP=' + $PreExistingTcp
    $probeLines += 'LAUNCH_MODE=' + $LaunchMode
    $probeLines += 'LAUNCHED_NEW_PROCESS=' + $LaunchedNewProcess
    $probeLines += 'LAUNCHER_PID=' + $LauncherPid
    $probeLines += 'TCP_OPEN=' + $TcpOpen
    $probeLines += 'ROOT_STATUS_CODE=' + $rootProbe.StatusCode
    $probeLines += 'ROOT_STATUS_TEXT=' + $rootProbe.StatusText
    $probeLines += 'ROOT_LOOKS_LIKE_NEXT=' + $rootLooksLikeNext
    $probeLines += 'WHOAMI_STATUS_CODE=' + $whoamiProbe.StatusCode
    $probeLines += 'WHOAMI_STATUS_TEXT=' + $whoamiProbe.StatusText
    $probeLines += 'LOG_PATH=' + $LogPath
    $probeLines += 'LOG_TAIL_PATH=' + $LogTailPath
    $probeLines += 'COMMAND_PATH=' + $CommandPath
    $probeLines += 'OUT_DIR=' + $OutDir
    $probeLines += 'SUMMARY_PATH=' + $SummaryPath
    Set-Content -LiteralPath $ProbePath -Value $probeLines -Encoding UTF8

    $httpReachable = ($rootProbe.StatusCode -gt 0) -or ($whoamiProbe.StatusCode -gt 0)

    if ($TcpOpen -and $httpReachable) {
        $FinalResult = 'PASS'
        Set-Content -LiteralPath $SummaryPath -Value @(
            'PASS'
            'STAGE=APP_BOOT_AND_REACHABILITY'
            'APP_BASE_URL=' + $AppBaseUrl
            'PORT=' + $Port
            'PREEXISTING_TCP=' + $PreExistingTcp
            'LAUNCH_MODE=' + $LaunchMode
            'LAUNCHED_NEW_PROCESS=' + $LaunchedNewProcess
            'LAUNCHER_PID=' + $LauncherPid
            'TCP_OPEN=' + $TcpOpen
            'ROOT_STATUS_CODE=' + $rootProbe.StatusCode
            'ROOT_STATUS_TEXT=' + $rootProbe.StatusText
            'ROOT_LOOKS_LIKE_NEXT=' + $rootLooksLikeNext
            'WHOAMI_STATUS_CODE=' + $whoamiProbe.StatusCode
            'WHOAMI_STATUS_TEXT=' + $whoamiProbe.StatusText
            'OUT_DIR=' + $OutDir
            'LOG_PATH=' + $LogPath
            'LOG_TAIL_PATH=' + $LogTailPath
            'PROBE_PATH=' + $ProbePath
            'SUMMARY_PATH=' + $SummaryPath
        ) -Encoding UTF8
    }
    else {
        $FinalResult = 'FAIL'
        Set-Content -LiteralPath $SummaryPath -Value @(
            'FAIL'
            'STAGE=APP_BOOT_AND_REACHABILITY'
            'APP_BASE_URL=' + $AppBaseUrl
            'PORT=' + $Port
            'PREEXISTING_TCP=' + $PreExistingTcp
            'LAUNCH_MODE=' + $LaunchMode
            'LAUNCHED_NEW_PROCESS=' + $LaunchedNewProcess
            'LAUNCHER_PID=' + $LauncherPid
            'TCP_OPEN=' + $TcpOpen
            'ROOT_STATUS_CODE=' + $rootProbe.StatusCode
            'ROOT_STATUS_TEXT=' + $rootProbe.StatusText
            'ROOT_LOOKS_LIKE_NEXT=' + $rootLooksLikeNext
            'WHOAMI_STATUS_CODE=' + $whoamiProbe.StatusCode
            'WHOAMI_STATUS_TEXT=' + $whoamiProbe.StatusText
            'OUT_DIR=' + $OutDir
            'LOG_PATH=' + $LogPath
            'LOG_TAIL_PATH=' + $LogTailPath
            'PROBE_PATH=' + $ProbePath
            'SUMMARY_PATH=' + $SummaryPath
        ) -Encoding UTF8
    }
}
catch {
    $FinalResult = 'FAIL'
    $FinalError = $_.Exception.Message

    Set-Content -LiteralPath $SummaryPath -Value @(
        'FAIL'
        'STAGE=APP_BOOT_AND_REACHABILITY'
        'ERROR=' + $FinalError
        'OUT_DIR=' + $OutDir
        'LOG_PATH=' + $LogPath
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8
}
finally {
    Write-Host ''
    Write-Host $FinalResult
    Write-Host 'STAGE=APP_BOOT_AND_REACHABILITY'
    Write-Host ('OUT_DIR=' + $OutDir)
    Write-Host ('SUMMARY_PATH=' + $SummaryPath)

    if ($FinalError -ne '') {
        Write-Host ('ERROR=' + $FinalError)
    }
    elseif (Test-Path -LiteralPath $SummaryPath) {
        Write-Host ''
        Write-Host 'SUMMARY_CONTENT_START'
        Get-Content -LiteralPath $SummaryPath
        Write-Host 'SUMMARY_CONTENT_END'
    }

    Write-Host ''
    Read-Host 'Copy the PASS or FAIL block and the SUMMARY_PATH, then press Enter to close'
}
