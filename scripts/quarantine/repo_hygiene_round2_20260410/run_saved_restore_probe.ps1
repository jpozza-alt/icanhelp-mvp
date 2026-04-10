$ErrorActionPreference = 'Stop'

$ScriptPath = 'C:\icanhelp-mvp\scripts\restore_missing_local_routes_and_probe.ps1'

if (-not (Test-Path -LiteralPath $ScriptPath)) {
    Write-Host 'FAIL'
    Write-Host 'STAGE=RUN_SAVED_RESTORE_PROBE'
    Write-Host ('ERROR=Script file not found: ' + $ScriptPath)
    Read-Host 'Press Enter to close'
    exit
}

Write-Host 'RUNNING=' + $ScriptPath
& $ScriptPath
