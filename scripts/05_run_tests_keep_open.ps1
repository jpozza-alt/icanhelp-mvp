$ErrorActionPreference = "Stop"

$target = "C:\icanhelp-mvp\scripts\05_run_tests.ps1"

try {
    if (-not (Test-Path $target)) {
        Write-Host "FAIL"
        Read-Host "Target script not found. Press Enter to close"
        exit 1
    }

    Write-Host "RUNNING: $target"
    Write-Host ""

    & $target

    $code = $LASTEXITCODE
    if ($null -eq $code) {
        $code = 0
    }

    Write-Host ""
    Write-Host ("EXIT_CODE=" + $code)

    if ($code -eq 0) {
        Write-Host "PASS"
    }
    else {
        Write-Host "FAIL"
    }

    Read-Host "Execution finished. Press Enter to close"
    exit $code
}
catch {
    Write-Host ""
    Write-Host ("ERROR: " + $_.Exception.Message)
    Write-Host "FAIL"
    Read-Host "Execution failed. Press Enter to close"
    exit 1
}
