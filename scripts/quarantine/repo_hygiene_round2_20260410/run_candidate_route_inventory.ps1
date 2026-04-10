$ErrorActionPreference = 'Stop'

$RepoRoot       = 'C:\icanhelp-mvp'
$Stamp          = Get-Date -Format 'yyyyMMdd_HHmmss'
$OutDir         = Join-Path $RepoRoot ("_debug\candidate_route_inventory_" + $Stamp)
$SummaryPath    = Join-Path $OutDir 'summary.txt'
$HitsPath       = Join-Path $OutDir 'hits.txt'
$RoutesPath     = Join-Path $OutDir 'route_files.txt'
$CandidatesPath = Join-Path $OutDir 'candidate_files.txt'

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Add-Line {
    param(
        [string]$Path,
        [string]$Text
    )
    Add-Content -LiteralPath $Path -Value $Text
}

function Should-SkipFile {
    param([string]$FullName)

    $normalized = $FullName.Replace('/', '\').ToLowerInvariant()

    if ($normalized.Contains('\node_modules\')) { return $true }
    if ($normalized.Contains('\.next\'))        { return $true }
    if ($normalized.Contains('\.git\'))         { return $true }
    if ($normalized.Contains('\_debug\'))       { return $true }
    if ($normalized.Contains('\coverage\'))     { return $true }
    if ($normalized.Contains('\dist\'))         { return $true }

    return $false
}

try {
    if (-not (Test-Path -LiteralPath $RepoRoot)) {
        throw "Repo root not found: $RepoRoot"
    }

    $searchRoots = @(
        (Join-Path $RepoRoot 'app'),
        (Join-Path $RepoRoot 'src'),
        (Join-Path $RepoRoot 'lib'),
        (Join-Path $RepoRoot 'scripts')
    ) | Where-Object { Test-Path -LiteralPath $_ }

    $allFiles = @()
    foreach ($root in $searchRoots) {
        $allFiles += Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction SilentlyContinue
    }

    $filteredFiles = $allFiles | Where-Object {
        -not (Should-SkipFile -FullName $_.FullName)
    }

    $routeFiles = $filteredFiles | Where-Object {
        $_.Name -in @('route.ts','route.tsx','route.js','route.jsx')
    } | Sort-Object FullName

    Set-Content -LiteralPath $RoutesPath -Value ($routeFiles.FullName) -Encoding UTF8

    $candidateNamePatterns = @(
        'auth-whoami',
        'context',
        'tenant',
        'tenants',
        'membership',
        'icanhelp-context',
        'requiretenant',
        'getcurrenttenant',
        'supabase'
    )

    $candidateFiles = $filteredFiles | Where-Object {
        $name = $_.Name.ToLowerInvariant()
        $full = $_.FullName.ToLowerInvariant()

        $matched = $false
        foreach ($pattern in $candidateNamePatterns) {
            if ($name.Contains($pattern) -or $full.Contains($pattern)) {
                $matched = $true
                break
            }
        }

        $matched
    } | Sort-Object FullName

    Set-Content -LiteralPath $CandidatesPath -Value ($candidateFiles.FullName) -Encoding UTF8

    $contentPatterns = @(
        'auth-whoami',
        'api/debug/context',
        'api/tenants',
        'icanhelp-context',
        'requiretenant',
        'getcurrenttenant',
        'fetchwithsupabaseaccesstoken',
        'tenant_memberships',
        'createroutehandlerclient',
        'createserverclient',
        'nextresponse',
        'supabase',
        'authorization',
        'bearer ',
        'cookies',
        'headers'
    )

    foreach ($file in $filteredFiles) {
        $ext = $file.Extension.ToLowerInvariant()
        if ($ext -notin @('.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.md','.sql')) {
            continue
        }

        try {
            $lines = Get-Content -LiteralPath $file.FullName
            for ($i = 0; $i -lt $lines.Count; $i++) {
                $lineOriginal = [string]$lines[$i]
                $lineLower = $lineOriginal.ToLowerInvariant()

                foreach ($pattern in $contentPatterns) {
                    if ($lineLower.Contains($pattern)) {
                        Add-Line -Path $HitsPath -Text ('FILE=' + $file.FullName)
                        Add-Line -Path $HitsPath -Text ('LINE=' + ($i + 1))
                        Add-Line -Path $HitsPath -Text ('MATCH=' + $pattern)
                        Add-Line -Path $HitsPath -Text ('TEXT=' + $lineOriginal)
                        Add-Line -Path $HitsPath -Text ''
                        break
                    }
                }
            }
        }
        catch {
            Add-Line -Path $HitsPath -Text ('FILE=' + $file.FullName)
            Add-Line -Path $HitsPath -Text ('READ_ERROR=' + $_.Exception.Message)
            Add-Line -Path $HitsPath -Text ''
        }
    }

    $routeCount = ($routeFiles | Measure-Object).Count
    $candidateCount = ($candidateFiles | Measure-Object).Count
    $hitCount = 0

    if (Test-Path -LiteralPath $HitsPath) {
        $hitCount = (Select-String -Path $HitsPath -Pattern '^FILE=' | Measure-Object).Count
    }

    Set-Content -LiteralPath $SummaryPath -Value @(
        'PASS'
        'STAGE=CANDIDATE_ROUTE_INVENTORY'
        'REPO_ROOT=' + $RepoRoot
        'SEARCH_ROOT_COUNT=' + $searchRoots.Count
        'ROUTE_FILE_COUNT=' + $routeCount
        'CANDIDATE_FILE_COUNT=' + $candidateCount
        'HIT_COUNT=' + $hitCount
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
        'ROUTES_PATH=' + $RoutesPath
        'CANDIDATES_PATH=' + $CandidatesPath
        'HITS_PATH=' + $HitsPath
    ) -Encoding UTF8
}
catch {
    Set-Content -LiteralPath $SummaryPath -Value @(
        'FAIL'
        'STAGE=CANDIDATE_ROUTE_INVENTORY'
        'ERROR=' + $_.Exception.Message
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8
}
finally {
    Get-Content -LiteralPath $SummaryPath
    Write-Host ''
    Read-Host 'Copy the block above plus CANDIDATES_PATH and HITS_PATH, then press Enter to close'
}
