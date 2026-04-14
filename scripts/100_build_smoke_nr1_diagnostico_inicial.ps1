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
$RunDir = Join-Path $RepoRoot ("_debug\action100_build_smoke_nr1_diagnostico_inicial_safe_" + $Timestamp)
$SummaryPath = Join-Path $RunDir 'summary.txt'
$BuildLogPath = Join-Path $RunDir 'build_output.txt'
$TargetPath = Join-Path $RepoRoot 'app\dashboard\nr1\diagnostico-inicial\page.tsx'

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

if (-not (Test-Path -LiteralPath $TargetPath)) {
    $msg = @(
        'STATUS=FAIL'
        'REASON=TARGET_NOT_FOUND'
        "TARGET_PATH=$TargetPath"
    ) -join [Environment]::NewLine
    Save-Utf8NoBom -Path $SummaryPath -Content $msg
    Write-Host $msg
    Read-Host 'Press Enter to close'
    return
}

$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    $msg = @(
        'STATUS=FAIL'
        'REASON=NPM_NOT_FOUND'
        'DETAIL=npm.cmd was not found in PATH'
    ) -join [Environment]::NewLine
    Save-Utf8NoBom -Path $SummaryPath -Content $msg
    Write-Host $msg
    Read-Host 'Press Enter to close'
    return
}

Write-Section 'PRECHECK'
$raw = Get-Content -LiteralPath $TargetPath -Raw

$checks = @(
    'supabase.auth.getSession',
    '/api/tenants',
    '/api/nr1-assessments',
    '"x-icanhelp-tenant": tenantId',
    'Salvar draft no backend'
)

$missingChecks = New-Object System.Collections.Generic.List[string]
foreach ($check in $checks) {
    if ($raw -notlike ("*" + $check + "*")) {
        $missingChecks.Add($check)
    }
}

if ($missingChecks.Count -gt 0) {
    $summary = @(
        'STATUS=FAIL'
        'REASON=PRECHECK_FAILED'
        "TARGET_PATH=$TargetPath"
        ("MISSING_CHECK_COUNT=" + $missingChecks.Count)
    )
    foreach ($item in $missingChecks) {
        $summary += ("MISSING_CHECK=" + $item)
    }
    Save-Utf8NoBom -Path $SummaryPath -Content ($summary -join [Environment]::NewLine)
    Get-Content -LiteralPath $SummaryPath
    Read-Host 'Press Enter to close'
    return
}

Write-Section 'BUILD'
Write-Host 'This version does not delete .next and does not close automatically.'

Push-Location $RepoRoot
$buildOutput = $null
$exitCode = -1

try {
    $buildOutput = & npm.cmd run build 2>&1
    $exitCode = $LASTEXITCODE
}
catch {
    $buildOutput = @($_.Exception.Message)
    $exitCode = 1
}
finally {
    Pop-Location
}

$buildText = ($buildOutput | Out-String)
Save-Utf8NoBom -Path $BuildLogPath -Content $buildText

$buildPassed = ($exitCode -eq 0)

$summary = @(
    ("STATUS=" + ($(if ($buildPassed) { 'PASS' } else { 'FAIL' })))
    "REPO_ROOT=$RepoRoot"
    "RUN_DIR=$RunDir"
    "TARGET_PATH=$TargetPath"
    "BUILD_LOG_PATH=$BuildLogPath"
    ("BUILD_EXIT_CODE=" + $exitCode)
    ("PRECHECK_MISSING_COUNT=" + $missingChecks.Count)
)

Save-Utf8NoBom -Path $SummaryPath -Content ($summary -join [Environment]::NewLine)

Write-Section 'RESULT'
Get-Content -LiteralPath $SummaryPath
Write-Host ''
Write-Host 'Open build log:'
Write-Host $BuildLogPath
Write-Host ''
Write-Host 'Last lines of build log:'
Write-Host '----------------------------------------'
Get-Content -LiteralPath $BuildLogPath -Tail 80
Write-Host '----------------------------------------'

Read-Host 'Press Enter to close'