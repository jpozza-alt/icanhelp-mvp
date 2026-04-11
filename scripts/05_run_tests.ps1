$ErrorActionPreference = "Stop"

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptRoot
$OfficialScript = Join-Path $ScriptRoot "e2e-smoke-official.ps1"
$DebugRoot = Join-Path $RepoRoot "_debug"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$RunDir = Join-Path $DebugRoot ("run_tests_" + $Stamp)
$SummaryPath = Join-Path $RunDir "summary.txt"

if (-not (Test-Path -LiteralPath $OfficialScript)) {
    throw "Required script not found: $OfficialScript"
}

New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

Write-Host ("[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] START")
Write-Host ("[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] RepoRoot=" + $RepoRoot)
Write-Host ("[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] RunDir=" + $RunDir)
Write-Host ("[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] Delegating to canonical script: " + $OfficialScript)

Push-Location $RepoRoot
try {
    & powershell -ExecutionPolicy Bypass -File $OfficialScript
    $ExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

$Overall = if ($ExitCode -eq 0) { "PASS" } else { "FAIL" }

$Summary = @()
$Summary += "STATUS=$Overall"
$Summary += "REPO_ROOT=$RepoRoot"
$Summary += "RUN_DIR=$RunDir"
$Summary += "OFFICIAL_SCRIPT=$OfficialScript"
$Summary += "EXIT_CODE=$ExitCode"
$Summary += "NEXT_STEP=$(if ($Overall -eq 'PASS') { 'ready_for_commit_and_push' } else { 'inspect_official_script_artifacts' })"

Set-Content -LiteralPath $SummaryPath -Value $Summary -Encoding UTF8

Write-Host ("[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] " + $Overall)
Write-Host ("SUMMARY_PATH=" + $SummaryPath)

if ($ExitCode -ne 0) {
    exit $ExitCode
}
