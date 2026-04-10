$ErrorActionPreference = 'Stop'

$RepoRoot     = 'C:\icanhelp-mvp'
$DebugRoot    = Join-Path $RepoRoot '_debug'
$Stamp        = Get-Date -Format 'yyyyMMdd_HHmmss'
$OutDir       = Join-Path $RepoRoot ("_debug\candidate_route_digest_" + $Stamp)
$SummaryPath  = Join-Path $OutDir 'summary.txt'
$DigestPath   = Join-Path $OutDir 'digest.txt'

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Add-Line {
    param(
        [string]$Path,
        [string]$Text
    )
    Add-Content -LiteralPath $Path -Value $Text
}

try {
    if (-not (Test-Path -LiteralPath $DebugRoot)) {
        throw "Debug root not found: $DebugRoot"
    }

    $latestInventoryDir = Get-ChildItem -LiteralPath $DebugRoot -Directory -ErrorAction Stop |
        Where-Object { $_.Name -like 'candidate_route_inventory_*' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestInventoryDir) {
        throw "No candidate_route_inventory directory found under $DebugRoot"
    }

    $CandidatesPath = Join-Path $latestInventoryDir.FullName 'candidate_files.txt'
    $HitsPath       = Join-Path $latestInventoryDir.FullName 'hits.txt'

    if (-not (Test-Path -LiteralPath $CandidatesPath)) {
        throw "candidate_files.txt not found: $CandidatesPath"
    }

    if (-not (Test-Path -LiteralPath $HitsPath)) {
        throw "hits.txt not found: $HitsPath"
    }

    $candidateFiles = Get-Content -LiteralPath $CandidatesPath | Where-Object { $_ -and $_.Trim() -ne '' }

    Add-Line -Path $DigestPath -Text '=== CANDIDATE FILES ==='
    foreach ($file in $candidateFiles) {
        Add-Line -Path $DigestPath -Text $file
    }
    Add-Line -Path $DigestPath -Text ''

    $allHitLines = Get-Content -LiteralPath $HitsPath

    $focusPatterns = @(
        'auth-whoami',
        'context',
        'tenant',
        'tenants',
        'membership',
        'icanhelp-context',
        'requiretenant',
        'getcurrenttenant',
        'fetchwithsupabaseaccesstoken',
        'authorization',
        'bearer ',
        'cookies',
        'headers'
    )

    Add-Line -Path $DigestPath -Text '=== FOCUSED HITS ==='

    $currentBlock = @()
    $focusedBlockCount = 0

    foreach ($line in $allHitLines) {
        if ($line -match '^FILE=') {
            if ($currentBlock.Count -gt 0) {
                $blockText = ($currentBlock -join [Environment]::NewLine).ToLowerInvariant()
                $matched = $false
                foreach ($pattern in $focusPatterns) {
                    if ($blockText.Contains($pattern)) {
                        $matched = $true
                        break
                    }
                }

                if ($matched) {
                    foreach ($bline in $currentBlock) {
                        Add-Line -Path $DigestPath -Text $bline
                    }
                    Add-Line -Path $DigestPath -Text ''
                    $focusedBlockCount++
                }
            }

            $currentBlock = @($line)
        }
        else {
            $currentBlock += $line
        }
    }

    if ($currentBlock.Count -gt 0) {
        $blockText = ($currentBlock -join [Environment]::NewLine).ToLowerInvariant()
        $matched = $false
        foreach ($pattern in $focusPatterns) {
            if ($blockText.Contains($pattern)) {
                $matched = $true
                break
            }
        }

        if ($matched) {
            foreach ($bline in $currentBlock) {
                Add-Line -Path $DigestPath -Text $bline
            }
            Add-Line -Path $DigestPath -Text ''
            $focusedBlockCount++
        }
    }

    Add-Line -Path $DigestPath -Text '=== FILE HEAD PREVIEWS ==='
    foreach ($file in $candidateFiles) {
        Add-Line -Path $DigestPath -Text ('FILE=' + $file)
        if (Test-Path -LiteralPath $file) {
            try {
                $head = Get-Content -LiteralPath $file | Select-Object -First 80
                Add-Line -Path $DigestPath -Text 'HEAD_START'
                foreach ($line in $head) {
                    Add-Line -Path $DigestPath -Text $line
                }
                Add-Line -Path $DigestPath -Text 'HEAD_END'
            }
            catch {
                Add-Line -Path $DigestPath -Text ('READ_ERROR=' + $_.Exception.Message)
            }
        }
        else {
            Add-Line -Path $DigestPath -Text 'MISSING_ON_DISK=True'
        }
        Add-Line -Path $DigestPath -Text ''
    }

    Set-Content -LiteralPath $SummaryPath -Value @(
        'PASS'
        'STAGE=CANDIDATE_ROUTE_DIGEST'
        'LATEST_INVENTORY_DIR=' + $latestInventoryDir.FullName
        'CANDIDATES_PATH=' + $CandidatesPath
        'HITS_PATH=' + $HitsPath
        'CANDIDATE_COUNT=' + $candidateFiles.Count
        'FOCUSED_BLOCK_COUNT=' + $focusedBlockCount
        'DIGEST_PATH=' + $DigestPath
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8
}
catch {
    Set-Content -LiteralPath $SummaryPath -Value @(
        'FAIL'
        'STAGE=CANDIDATE_ROUTE_DIGEST'
        'ERROR=' + $_.Exception.Message
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8
}
finally {
    Get-Content -LiteralPath $SummaryPath
    Write-Host ''
    Read-Host 'Copy the block above plus DIGEST_PATH, then press Enter to close'
}
