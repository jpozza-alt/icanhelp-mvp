$ErrorActionPreference = 'Stop'

$RepoRoot     = 'C:\icanhelp-mvp'
$DebugRoot    = Join-Path $RepoRoot '_debug'
$Stamp        = Get-Date -Format 'yyyyMMdd_HHmmss'
$OutDir       = Join-Path $RepoRoot ("_debug\candidate_route_preview_" + $Stamp)
$SummaryPath  = Join-Path $OutDir 'summary.txt'
$PreviewPath  = Join-Path $OutDir 'preview.txt'

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

try {
    $latestDigestDir = Get-ChildItem -LiteralPath $DebugRoot -Directory -ErrorAction Stop |
        Where-Object { $_.Name -like 'candidate_route_digest_*' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestDigestDir) {
        throw "No candidate_route_digest directory found under $DebugRoot"
    }

    $DigestPath = Join-Path $latestDigestDir.FullName 'digest.txt'
    if (-not (Test-Path -LiteralPath $DigestPath)) {
        throw "digest.txt not found: $DigestPath"
    }

    $lines = Get-Content -LiteralPath $DigestPath

    $out = New-Object System.Collections.Generic.List[string]
    $out.Add('=== PREVIEW: CANDIDATE FILES ===')

    $capture = $false
    $candidateCount = 0
    foreach ($line in $lines) {
        if ($line -eq '=== CANDIDATE FILES ===') {
            $capture = $true
            continue
        }
        if ($capture -and $line -like '=== *') {
            break
        }
        if ($capture -and $line.Trim() -ne '') {
            $out.Add($line)
            $candidateCount++
        }
    }

    $out.Add('')
    $out.Add('=== PREVIEW: FILE HEADS (FIRST 35 LINES EACH) ===')

    $i = 0
    while ($i -lt $lines.Count) {
        if ($lines[$i] -like 'FILE=*') {
            $fileLine = $lines[$i]
            $j = $i + 1

            while ($j -lt $lines.Count -and $lines[$j] -ne 'HEAD_START') {
                $j++
            }

            if ($j -lt $lines.Count -and $lines[$j] -eq 'HEAD_START') {
                $out.Add($fileLine)
                $out.Add('HEAD_START')

                $k = $j + 1
                $lineCount = 0
                while ($k -lt $lines.Count -and $lines[$k] -ne 'HEAD_END' -and $lineCount -lt 35) {
                    $out.Add($lines[$k])
                    $k++
                    $lineCount++
                }

                $out.Add('HEAD_END')
                $out.Add('')
                $i = $k
            }
        }

        $i++
    }

    $out.Add('=== PREVIEW: FOCUSED HITS (FIRST 40 BLOCKS) ===')
    $block = New-Object System.Collections.Generic.List[string]
    $blockCount = 0

    foreach ($line in $lines) {
        if ($line -like 'FILE=*') {
            if ($block.Count -gt 0 -and $blockCount -lt 40) {
                foreach ($b in $block) { $out.Add($b) }
                $out.Add('')
                $blockCount++
            }
            $block = New-Object System.Collections.Generic.List[string]
            $block.Add($line)
        }
        elseif ($block.Count -gt 0) {
            $block.Add($line)
        }
    }

    if ($block.Count -gt 0 -and $blockCount -lt 40) {
        foreach ($b in $block) { $out.Add($b) }
        $out.Add('')
        $blockCount++
    }

    Set-Content -LiteralPath $PreviewPath -Value $out -Encoding UTF8

    Set-Content -LiteralPath $SummaryPath -Value @(
        'PASS'
        'STAGE=CANDIDATE_ROUTE_PREVIEW'
        'CANDIDATE_COUNT=' + $candidateCount
        'FOCUSED_BLOCKS_EXPORTED=' + $blockCount
        'DIGEST_SOURCE=' + $DigestPath
        'PREVIEW_PATH=' + $PreviewPath
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8

    Get-Content -LiteralPath $SummaryPath
}
catch {
    Set-Content -LiteralPath $SummaryPath -Value @(
        'FAIL'
        'STAGE=CANDIDATE_ROUTE_PREVIEW'
        'ERROR=' + $_.Exception.Message
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8

    Get-Content -LiteralPath $SummaryPath
}
finally {
    Write-Host ''
    Read-Host 'Copy the block above plus PREVIEW_PATH, then press Enter to close'
}
