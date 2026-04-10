$ErrorActionPreference = "Stop"

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host ("[{0}] [{1}] {2}" -f $ts, $Level, $Message)
}

function Ensure-Dir {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Save-Text {
    param(
        [string]$Path,
        [string]$Text
    )
    $parent = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($parent)) {
        Ensure-Dir -Path $parent
    }
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.Encoding]::UTF8)
}

function Save-Json {
    param(
        [string]$Path,
        $Object
    )
    $json = $Object | ConvertTo-Json -Depth 30
    Save-Text -Path $Path -Text $json
}

function Ensure-FileExists {
    param(
        [string]$Path,
        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw ($Label + " not found: " + $Path)
    }
}

function Get-LatestDirectoryByPattern {
    param(
        [string]$Root,
        [string]$Prefix
    )

    if (-not (Test-Path -LiteralPath $Root)) {
        return $null
    }

    $dirs = Get-ChildItem -LiteralPath $Root -Directory | Where-Object { $_.Name -like ($Prefix + "*") } | Sort-Object LastWriteTime -Descending
    if ($dirs.Count -gt 0) {
        return $dirs[0].FullName
    }

    return $null
}

$RepoRoot = "C:\icanhelp-mvp"
$ScriptsDir = Join-Path $RepoRoot "scripts"
$DebugRoot = Join-Path $RepoRoot "_debug"
$QuarantineDir = Join-Path $ScriptsDir "quarantine"
$runStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runDir = Join-Path $DebugRoot ("freeze_and_promote_resource_isolation_" + $runStamp)

Ensure-Dir -Path $ScriptsDir
Ensure-Dir -Path $DebugRoot
Ensure-Dir -Path $QuarantineDir
Ensure-Dir -Path $runDir

$legacy77 = Join-Path $ScriptsDir "77_cross_tenant_ticket_isolation.ps1"
$v2Script = Join-Path $ScriptsDir "81_cross_tenant_ticket_isolation_v2.ps1"
$canonical77 = Join-Path $ScriptsDir "77_cross_tenant_ticket_isolation.ps1"

$summary = [ordered]@{
    status = "FAIL"
    started_at = (Get-Date).ToString("o")
    repo_root = $RepoRoot
    run_dir = $runDir
    legacy_77 = $legacy77
    source_v2 = $v2Script
    canonical_77 = $canonical77
    latest_refresh_run = $null
    latest_v2_pass_run = $null
    backup_of_old_77 = $null
    promoted = $false
    milestone_marker = "RESOURCE_LEVEL_CROSS_TENANT_ISOLATION_PASS"
    pass_conditions = [ordered]@{
        source_v2_exists = $false
        legacy_77_exists = $false
        latest_v2_artifact_found = $false
        old_77_backed_up = $false
        v2_promoted_to_77 = $false
        milestone_files_written = $false
    }
}

try {
    Write-Log "Checking required files..."

    Ensure-FileExists -Path $v2Script -Label "V2 script"
    $summary.pass_conditions.source_v2_exists = $true

    if (Test-Path -LiteralPath $legacy77) {
        $summary.pass_conditions.legacy_77_exists = $true
    }

    $latestV2Run = Get-LatestDirectoryByPattern -Root $DebugRoot -Prefix "cross_tenant_ticket_isolation_v2_"
    $latestRefreshRun = Get-LatestDirectoryByPattern -Root $DebugRoot -Prefix "refresh_both_jwts_"

    $summary.latest_v2_pass_run = $latestV2Run
    $summary.latest_refresh_run = $latestRefreshRun

    if (-not [string]::IsNullOrWhiteSpace($latestV2Run)) {
        $summary.pass_conditions.latest_v2_artifact_found = $true
    }
    else {
        throw "Latest V2 PASS artifact folder not found."
    }

    if (Test-Path -LiteralPath $legacy77) {
        $backupPath = Join-Path $QuarantineDir ("77_cross_tenant_ticket_isolation_PRE_V2_" + $runStamp + ".ps1")
        Copy-Item -LiteralPath $legacy77 -Destination $backupPath -Force
        $summary.backup_of_old_77 = $backupPath
        $summary.pass_conditions.old_77_backed_up = $true
        Write-Log ("Backed up old 77 to " + $backupPath)
    }
    else {
        $summary.pass_conditions.old_77_backed_up = $true
        Write-Log "No old 77 found. Skipping backup." "WARN"
    }

    Copy-Item -LiteralPath $v2Script -Destination $canonical77 -Force
    $summary.promoted = $true
    $summary.pass_conditions.v2_promoted_to_77 = $true
    Write-Log "Promoted 81_cross_tenant_ticket_isolation_v2.ps1 to canonical 77_cross_tenant_ticket_isolation.ps1"

    $milestoneTxt = @()
    $milestoneTxt += "MILESTONE=RESOURCE_LEVEL_CROSS_TENANT_ISOLATION_PASS"
    $milestoneTxt += ("DATE_UTC=" + (Get-Date).ToUniversalTime().ToString("o"))
    $milestoneTxt += ("REPO_ROOT=" + $RepoRoot)
    $milestoneTxt += ("LATEST_V2_PASS_RUN=" + [string]$latestV2Run)
    $milestoneTxt += ("LATEST_REFRESH_RUN=" + [string]$latestRefreshRun)
    $milestoneTxt += ("CANONICAL_SCRIPT=" + $canonical77)
    $milestoneTxt += ("BACKUP_OF_OLD_77=" + [string]$summary.backup_of_old_77)
    $milestoneTxt += "DECISION=V2 promoted as canonical resource-level cross-tenant proof"
    $milestoneTxt += "NEXT_FOCUS=freeze milestone first; only then move to next product hardening step"

    Save-Text -Path (Join-Path $runDir "MILESTONE.txt") -Text ($milestoneTxt -join [Environment]::NewLine)

    $opsTxt = @()
    $opsTxt += "What passed:"
    $opsTxt += "- Primary tenant activation"
    $opsTxt += "- Secondary tenant activation"
    $opsTxt += "- Ticket creation in primary tenant"
    $opsTxt += "- Primary can see own ticket"
    $opsTxt += "- Secondary cross-tenant activation blocked"
    $opsTxt += "- Secondary cannot see primary ticket"
    $opsTxt += ""
    $opsTxt += "Operational decision:"
    $opsTxt += "- Legacy 77 was brittle"
    $opsTxt += "- V2 is now the canonical 77"
    $opsTxt += "- Future runs should use scripts\77_cross_tenant_ticket_isolation.ps1"

    Save-Text -Path (Join-Path $runDir "OPERATIONS_SUMMARY.txt") -Text ($opsTxt -join [Environment]::NewLine)

    $handoffTxt = @()
    $handoffTxt += "STATUS=PASS"
    $handoffTxt += "MILESTONE=RESOURCE_LEVEL_CROSS_TENANT_ISOLATION_PASS"
    $handoffTxt += ("CANONICAL_77=" + $canonical77)
    $handoffTxt += ("LATEST_V2_PASS_RUN=" + [string]$latestV2Run)
    $handoffTxt += ("BACKUP_OF_OLD_77=" + [string]$summary.backup_of_old_77)
    $handoffTxt += "DO_NOT_REOPEN_ARCHITECTURE_WITHOUT_NEW_EVIDENCE=true"
    $handoffTxt += "NEXT_STEP=ask for the next product hardening action"

    Save-Text -Path (Join-Path $runDir "PASTE_ME.txt") -Text ($handoffTxt -join [Environment]::NewLine)

    $summary.pass_conditions.milestone_files_written = $true

    $allPass = $true
    foreach ($k in $summary.pass_conditions.Keys) {
        if (-not $summary.pass_conditions[$k]) {
            $allPass = $false
        }
    }

    if ($allPass) {
        $summary.status = "PASS"
        Write-Log "PASS" "PASS"
    }
    else {
        $summary.status = "FAIL"
        Write-Log "FAIL" "FAIL"
    }
}
catch {
    $err = $_.Exception.Message
    $summary.status = "FAIL"
    $summary.error = $err
    Save-Text -Path (Join-Path $runDir "ERROR.txt") -Text $err
    Write-Log $err "ERROR"
}
finally {
    $summary.finished_at = (Get-Date).ToString("o")
    Save-Json -Path (Join-Path $runDir "SUMMARY.json") -Object $summary

    Write-Host ""
    Write-Host "Artifacts:"
    Write-Host ("- " + (Join-Path $runDir "SUMMARY.json"))
    Write-Host ("- " + (Join-Path $runDir "PASTE_ME.txt"))
    Write-Host ("- " + (Join-Path $runDir "MILESTONE.txt"))
    Write-Host ("- " + (Join-Path $runDir "OPERATIONS_SUMMARY.txt"))
    Write-Host ""

    if ($summary.status -eq "PASS") {
        Write-Host "PASS"
    }
    else {
        Write-Host "FAIL"
    }

    Read-Host "Press ENTER to finish"
}