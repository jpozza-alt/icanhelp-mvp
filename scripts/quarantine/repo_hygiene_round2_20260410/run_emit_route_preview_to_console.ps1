$ErrorActionPreference = 'Stop'

$RepoRoot    = 'C:\icanhelp-mvp'
$DebugRoot   = Join-Path $RepoRoot '_debug'
$Stamp       = Get-Date -Format 'yyyyMMdd_HHmmss'
$OutDir      = Join-Path $RepoRoot ("_debug\emit_route_preview_to_console_" + $Stamp)
$SummaryPath = Join-Path $OutDir 'summary.txt'
$PastePath   = Join-Path $OutDir 'paste_back.txt'

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

try {
    $latestPreviewDir = Get-ChildItem -LiteralPath $DebugRoot -Directory -ErrorAction Stop |
        Where-Object { $_.Name -like 'candidate_route_preview_*' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestPreviewDir) {
        throw "No candidate_route_preview directory found under $DebugRoot"
    }

    $PreviewPath = Join-Path $latestPreviewDir.FullName 'preview.txt'
    if (-not (Test-Path -LiteralPath $PreviewPath)) {
        throw "preview.txt not found: $PreviewPath"
    }

    $lines = Get-Content -LiteralPath $PreviewPath

    $out = New-Object System.Collections.Generic.List[string]
    $out.Add('BEGIN_ROUTE_DECISION_PACK')

    $copyingCandidates = $false
    $candidateCount = 0
    foreach ($line in $lines) {
        if ($line -eq '=== PREVIEW: CANDIDATE FILES ===') {
            $out.Add($line)
            $copyingCandidates = $true
            continue
        }

        if ($copyingCandidates -and $line -like '=== *') {
            $copyingCandidates = $false
            $out.Add('')
            $out.Add($line)
            continue
        }

        if ($copyingCandidates) {
            if ($line.Trim() -ne '') {
                $out.Add($line)
                $candidateCount++
            }
            continue
        }

        if ($line -eq '=== PREVIEW: FILE HEADS (FIRST 35 LINES EACH) ===') {
            break
        }
    }

    $out.Add('')
    $out.Add('=== TRIMMED_FILE_HEADS ===')

    $i = 0
    $fileHeadCount = 0
    while ($i -lt $lines.Count) {
        if ($lines[$i] -eq '=== PREVIEW: FILE HEADS (FIRST 35 LINES EACH) ===') {
            $i++
            continue
        }

        if ($lines[$i] -like 'FILE=*') {
            $out.Add($lines[$i])
            $j = $i + 1

            while ($j -lt $lines.Count -and $lines[$j] -ne 'HEAD_START') {
                $j++
            }

            if ($j -lt $lines.Count -and $lines[$j] -eq 'HEAD_START') {
                $out.Add('HEAD_START')
                $k = $j + 1
                $headLines = 0

                while ($k -lt $lines.Count -and $lines[$k] -ne 'HEAD_END' -and $headLines -lt 12) {
                    $out.Add($lines[$k])
                    $k++
                    $headLines++
                }

                $out.Add('HEAD_END')
                $out.Add('')
                $fileHeadCount++
                $i = $k
            }
        }

        if ($lines[$i] -eq '=== PREVIEW: FOCUSED HITS (FIRST 40 BLOCKS) ===') {
            break
        }

        $i++
    }

    $out.Add('=== FIRST_FOCUSED_HITS ===')

    $block = New-Object System.Collections.Generic.List[string]
    $blockCount = 0
    $captureHits = $false

    foreach ($line in $lines) {
        if ($line -eq '=== PREVIEW: FOCUSED HITS (FIRST 40 BLOCKS) ===') {
            $captureHits = $true
            continue
        }

        if (-not $captureHits) {
            continue
        }

        if ($line -like 'FILE=*') {
            if ($block.Count -gt 0 -and $blockCount -lt 12) {
                foreach ($b in $block) { $out.Add($b) }
                $out.Add('')
                $blockCount++
            }

            if ($blockCount -ge 12) {
                break
            }

            $block = New-Object System.Collections.Generic.List[string]
            $block.Add($line)
        }
        elseif ($block.Count -gt 0) {
            $block.Add($line)
        }
    }

    if ($block.Count -gt 0 -and $blockCount -lt 12) {
        foreach ($b in $block) { $out.Add($b) }
        $out.Add('')
        $blockCount++
    }

    $out.Add('END_ROUTE_DECISION_PACK')

    Set-Content -LiteralPath $PastePath -Value $out -Encoding UTF8

    Set-Content -LiteralPath $SummaryPath -Value @(
        'PASS'
        'STAGE=EMIT_ROUTE_PREVIEW_TO_CONSOLE'
        'CANDIDATE_COUNT=' + $candidateCount
        'FILE_HEAD_COUNT=' + $fileHeadCount
        'FOCUSED_HIT_BLOCK_COUNT=' + $blockCount
        'PREVIEW_SOURCE=' + $PreviewPath
        'PASTE_PATH=' + $PastePath
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8

    Get-Content -LiteralPath $SummaryPath
    Write-Host ''
    Get-Content -LiteralPath $PastePath
}
catch {
    Set-Content -LiteralPath $SummaryPath -Value @(
        'FAIL'
        'STAGE=EMIT_ROUTE_PREVIEW_TO_CONSOLE'
        'ERROR=' + $_.Exception.Message
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8

    Get-Content -LiteralPath $SummaryPath
}
finally {
    Write-Host ''
    Read-Host 'Copy everything from BEGIN_ROUTE_DECISION_PACK to END_ROUTE_DECISION_PACK and paste it here, then press Enter to close'
}
