$ErrorActionPreference = 'Stop'

function Write-Section {
    param([string]$Text)
    Write-Host ""
    Write-Host ("==== " + $Text + " ====")
}

function New-DirSafe {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Save-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )
    $dir = Split-Path -Parent $Path
    if ($dir) {
        New-DirSafe -Path $dir
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

$RepoRoot = 'C:\icanhelp-mvp'
$Timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$RunDir = Join-Path $RepoRoot ("_debug\action110_force_vercel_prod_deploy_" + $Timestamp)
$SummaryPath = Join-Path $RunDir 'summary.txt'
$WhoamiPath = Join-Path $RunDir 'vercel_whoami.txt'
$DeployOutputPath = Join-Path $RunDir 'vercel_deploy_output.txt'

New-DirSafe -Path $RunDir

Write-Section 'BOOT'

if (-not (Test-Path -LiteralPath $RepoRoot)) {
    $msg = @(
        'STATUS=FAIL'
        'REASON=REPO_ROOT_NOT_FOUND'
        "REPO_ROOT=$RepoRoot"
    ) -join [Environment]::NewLine
    Save-Utf8NoBom -Path $SummaryPath -Content $msg
    Write-Host $msg
    Read-Host 'Press Enter to close'
    return
}

$npxCmd = Get-Command npx.cmd -ErrorAction SilentlyContinue
if (-not $npxCmd) {
    $msg = @(
        'STATUS=FAIL'
        'REASON=NPX_NOT_FOUND'
        'DETAIL=npx.cmd was not found in PATH'
    ) -join [Environment]::NewLine
    Save-Utf8NoBom -Path $SummaryPath -Content $msg
    Write-Host $msg
    Read-Host 'Press Enter to close'
    return
}

Push-Location $RepoRoot
try {
    Write-Section 'VERCEL_WHOAMI'
    Write-Host 'If Vercel asks for login, complete it and come back to this window.'

    $whoamiOutput = & npx.cmd vercel whoami 2>&1
    $whoamiExit = $LASTEXITCODE
    Save-Utf8NoBom -Path $WhoamiPath -Content (($whoamiOutput | Out-String))

    Write-Section 'VERCEL_DEPLOY_PROD'
    Write-Host 'Starting production deploy...'

    $deployOutput = & npx.cmd vercel deploy --prod --yes 2>&1
    $deployExit = $LASTEXITCODE
    $deployText = ($deployOutput | Out-String)
    Save-Utf8NoBom -Path $DeployOutputPath -Content $deployText

    $detectedUrl = ''
    $matches = [System.Text.RegularExpressions.Regex]::Matches(
        $deployText,
        'https://[a-zA-Z0-9\.\-]+\.vercel\.app'
    )
    if ($matches.Count -gt 0) {
        $detectedUrl = $matches[$matches.Count - 1].Value
    }

    $overall = if ($deployExit -eq 0) { 'PASS' } else { 'FAIL' }

    $summary = @(
        "STATUS=$overall"
        "REPO_ROOT=$RepoRoot"
        "RUN_DIR=$RunDir"
        "SUMMARY_PATH=$SummaryPath"
        "WHOAMI_PATH=$WhoamiPath"
        "DEPLOY_OUTPUT_PATH=$DeployOutputPath"
        "WHOAMI_EXIT_CODE=$whoamiExit"
        "DEPLOY_EXIT_CODE=$deployExit"
        "DETECTED_URL=$detectedUrl"
    )

    Save-Utf8NoBom -Path $SummaryPath -Content ($summary -join [Environment]::NewLine)

    Write-Section 'RESULT'
    Get-Content -LiteralPath $SummaryPath
}
finally {
    Pop-Location
}

Read-Host 'Press Enter to close'