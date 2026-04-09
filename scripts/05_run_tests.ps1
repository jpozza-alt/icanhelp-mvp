$ErrorActionPreference = "Stop"

$repoRoot = "C:\icanhelp-mvp"
$scriptsDir = Join-Path $repoRoot "scripts"
$debugRoot = Join-Path $repoRoot "_debug"
$doctorScript = Join-Path $scriptsDir "00_doctor.ps1"
$smokeScript = Join-Path $scriptsDir "e2e-smoke-official.ps1"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runDir = Join-Path $debugRoot ("run_tests_" + $timestamp)
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$mainLog = Join-Path $runDir "run.log"
$summaryFile = Join-Path $runDir "summary.txt"
$doctorOut = Join-Path $runDir "doctor.stdout.log"
$doctorErr = Join-Path $runDir "doctor.stderr.log"
$smokeOut = Join-Path $runDir "smoke.stdout.log"
$smokeErr = Join-Path $runDir "smoke.stderr.log"

function Write-Log {
    param([string]$Message)
    $line = ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message)
    $line | Tee-Object -FilePath $mainLog -Append
}

function Get-LatestDebugDirectory {
    param(
        [string]$Root,
        [datetime]$StartedAt,
        [string[]]$ExcludeNames
    )

    if (-not (Test-Path $Root)) {
        return $null
    }

    $dirs = Get-ChildItem -Path $Root -Directory | Where-Object {
        ($ExcludeNames -notcontains $_.Name) -and ($_.LastWriteTime -ge $StartedAt.AddMinutes(-1))
    } | Sort-Object LastWriteTime -Descending

    if ($dirs -and $dirs.Count -gt 0) {
        return $dirs[0].FullName
    }

    return $null
}

function Run-Step {
    param(
        [string]$Name,
        [string]$ScriptPath,
        [string]$StdOutFile,
        [string]$StdErrFile
    )

    if (-not (Test-Path $ScriptPath)) {
        throw ("Required script not found: " + $ScriptPath)
    }

    Write-Log ("STEP_START " + $Name)
    $startedAt = Get-Date

    $proc = Start-Process -FilePath "powershell.exe" `
        -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",$ScriptPath) `
        -Wait -PassThru -RedirectStandardOutput $StdOutFile -RedirectStandardError $StdErrFile

    $exitCode = $proc.ExitCode
    $artifactDir = Get-LatestDebugDirectory -Root $debugRoot -StartedAt $startedAt -ExcludeNames @((Split-Path $runDir -Leaf))

    $passDetected = $false
    $failDetected = $false

    if (Test-Path $StdOutFile) {
        $stdoutText = Get-Content -Path $StdOutFile -Raw
        if ($stdoutText -match "(?im)^\s*PASS\s*$") { $passDetected = $true }
        if ($stdoutText -match "(?im)^\s*FAIL\s*$") { $failDetected = $true }
    }

    if (Test-Path $StdErrFile) {
        $stderrText = Get-Content -Path $StdErrFile -Raw
        if ($stderrText -match "(?im)^\s*FAIL\s*$") { $failDetected = $true }
    }

    $result = [pscustomobject]@{
        Name = $Name
        ScriptPath = $ScriptPath
        ExitCode = $exitCode
        StartedAt = $startedAt.ToString("s")
        FinishedAt = (Get-Date).ToString("s")
        ArtifactDir = $artifactDir
        PassDetected = $passDetected
        FailDetected = $failDetected
        StdOutFile = $StdOutFile
        StdErrFile = $StdErrFile
    }

    $result | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $runDir ($Name + ".result.json")) -Encoding UTF8

    if ($exitCode -ne 0 -or $failDetected) {
        Write-Log ("STEP_FAIL " + $Name + " ExitCode=" + $exitCode)
        return $result
    }

    Write-Log ("STEP_PASS " + $Name + " ExitCode=" + $exitCode)
    return $result
}

try {
    Write-Log "START"
    Write-Log ("RepoRoot=" + $repoRoot)
    Write-Log ("RunDir=" + $runDir)

    if (-not (Test-Path $repoRoot)) { throw ("Repo root not found: " + $repoRoot) }
    if (-not (Test-Path $scriptsDir)) { throw ("Scripts dir not found: " + $scriptsDir) }

    $doctorResult = Run-Step -Name "doctor" -ScriptPath $doctorScript -StdOutFile $doctorOut -StdErrFile $doctorErr

    if ($doctorResult.ExitCode -ne 0 -or $doctorResult.FailDetected) {
        $summary = @()
        $summary += "FINAL_RESULT=FAIL"
        $summary += "FAILED_STEP=doctor"
        $summary += ("RUN_DIR=" + $runDir)
        $summary += ("DOCTOR_SCRIPT=" + $doctorScript)
        $summary += ("DOCTOR_ARTIFACT_DIR=" + $doctorResult.ArtifactDir)
        $summary += ("DOCTOR_STDOUT=" + $doctorResult.StdOutFile)
        $summary += ("DOCTOR_STDERR=" + $doctorResult.StdErrFile)
        $summary += ("SMOKE_SCRIPT=" + $smokeScript)
        $summary += "SMOKE_ARTIFACT_DIR="
        $summary += "SMOKE_STDOUT="
        $summary += "SMOKE_STDERR="
        $summary -join [Environment]::NewLine | Set-Content -Path $summaryFile -Encoding UTF8
        Write-Log "FINAL FAIL"
        Write-Output "FAIL"
        exit 1
    }

    $smokeResult = Run-Step -Name "smoke" -ScriptPath $smokeScript -StdOutFile $smokeOut -StdErrFile $smokeErr

    if ($smokeResult.ExitCode -ne 0 -or $smokeResult.FailDetected) {
        $summary = @()
        $summary += "FINAL_RESULT=FAIL"
        $summary += "FAILED_STEP=smoke"
        $summary += ("RUN_DIR=" + $runDir)
        $summary += ("DOCTOR_SCRIPT=" + $doctorScript)
        $summary += ("DOCTOR_ARTIFACT_DIR=" + $doctorResult.ArtifactDir)
        $summary += ("DOCTOR_STDOUT=" + $doctorResult.StdOutFile)
        $summary += ("DOCTOR_STDERR=" + $doctorResult.StdErrFile)
        $summary += ("SMOKE_SCRIPT=" + $smokeScript)
        $summary += ("SMOKE_ARTIFACT_DIR=" + $smokeResult.ArtifactDir)
        $summary += ("SMOKE_STDOUT=" + $smokeResult.StdOutFile)
        $summary += ("SMOKE_STDERR=" + $smokeResult.StdErrFile)
        $summary -join [Environment]::NewLine | Set-Content -Path $summaryFile -Encoding UTF8
        Write-Log "FINAL FAIL"
        Write-Output "FAIL"
        exit 1
    }

    $summary = @()
    $summary += "FINAL_RESULT=PASS"
    $summary += "FAILED_STEP="
    $summary += ("RUN_DIR=" + $runDir)
    $summary += ("DOCTOR_SCRIPT=" + $doctorScript)
    $summary += ("DOCTOR_ARTIFACT_DIR=" + $doctorResult.ArtifactDir)
    $summary += ("DOCTOR_STDOUT=" + $doctorResult.StdOutFile)
    $summary += ("DOCTOR_STDERR=" + $doctorResult.StdErrFile)
    $summary += ("SMOKE_SCRIPT=" + $smokeScript)
    $summary += ("SMOKE_ARTIFACT_DIR=" + $smokeResult.ArtifactDir)
    $summary += ("SMOKE_STDOUT=" + $smokeResult.StdOutFile)
    $summary += ("SMOKE_STDERR=" + $smokeResult.StdErrFile)
    $summary -join [Environment]::NewLine | Set-Content -Path $summaryFile -Encoding UTF8

    Write-Log "FINAL PASS"
    Write-Output "PASS"
    exit 0
}
catch {
    $msg = $_.Exception.Message
    Write-Log ("UNHANDLED_ERROR " + $msg)

    $summary = @()
    $summary += "FINAL_RESULT=FAIL"
    $summary += "FAILED_STEP=orchestrator_exception"
    $summary += ("RUN_DIR=" + $runDir)
    $summary += ("ERROR=" + $msg)
    $summary += ("DOCTOR_SCRIPT=" + $doctorScript)
    $summary += ("SMOKE_SCRIPT=" + $smokeScript)
    $summary -join [Environment]::NewLine | Set-Content -Path $summaryFile -Encoding UTF8

    Write-Output "FAIL"
    exit 1
}
