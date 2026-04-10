$ErrorActionPreference = 'Stop'

$RepoRoot    = 'C:\icanhelp-mvp'
$Stamp       = Get-Date -Format 'yyyyMMdd_HHmmss'
$OutDir      = Join-Path $RepoRoot ("_debug\route_footprint_audit_" + $Stamp)
$SummaryPath = Join-Path $OutDir 'summary.txt'
$TreePath    = Join-Path $OutDir 'tree.txt'
$FindingsPath = Join-Path $OutDir 'findings.txt'
$LogTailPath = Join-Path $OutDir 'latest_next_dev_tail.txt'

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Write-Line {
    param([string]$Text)
    Add-Content -LiteralPath $SummaryPath -Value $Text
}

function Get-RouteInfo {
    param([string]$Path)

    $exists = Test-Path -LiteralPath $Path
    $hasGet = $false
    $hasPost = $false
    $snippet = ''

    if ($exists) {
        try {
            $raw = Get-Content -LiteralPath $Path -Raw
            if ($raw -match 'export\s+async\s+function\s+GET' -or $raw -match 'export\s+function\s+GET') {
                $hasGet = $true
            }
            if ($raw -match 'export\s+async\s+function\s+POST' -or $raw -match 'export\s+function\s+POST') {
                $hasPost = $true
            }

            $lines = Get-Content -LiteralPath $Path | Select-Object -First 40
            $snippet = ($lines -join [Environment]::NewLine)
        }
        catch {
            $snippet = 'READ_ERROR=' + $_.Exception.Message
        }
    }

    return [pscustomobject]@{
        Path = $Path
        Exists = $exists
        HasGet = $hasGet
        HasPost = $hasPost
        Snippet = $snippet
    }
}

try {
    if (-not (Test-Path -LiteralPath $RepoRoot)) {
        throw "Repo root not found: $RepoRoot"
    }

    $appDir = Join-Path $RepoRoot 'app'
    $srcDir = Join-Path $RepoRoot 'src'
    $srcAppDir = Join-Path $RepoRoot 'src\app'

    $appExists = Test-Path -LiteralPath $appDir
    $srcExists = Test-Path -LiteralPath $srcDir
    $srcAppExists = Test-Path -LiteralPath $srcAppDir

    $pathsToCheck = @(
        'app\api\debug\auth-whoami\route.ts',
        'app\api\debug\context\route.ts',
        'app\api\tenants\route.ts',
        'src\app\api\debug\auth-whoami\route.ts',
        'src\app\api\debug\context\route.ts',
        'src\app\api\tenants\route.ts'
    )

    $results = @()
    foreach ($rel in $pathsToCheck) {
        $full = Join-Path $RepoRoot $rel
        $info = Get-RouteInfo -Path $full
        $results += $info

        Add-Content -LiteralPath $FindingsPath -Value ('FILE=' + $rel)
        Add-Content -LiteralPath $FindingsPath -Value ('EXISTS=' + $info.Exists)
        Add-Content -LiteralPath $FindingsPath -Value ('HAS_GET=' + $info.HasGet)
        Add-Content -LiteralPath $FindingsPath -Value ('HAS_POST=' + $info.HasPost)
        Add-Content -LiteralPath $FindingsPath -Value 'SNIPPET_START'
        Add-Content -LiteralPath $FindingsPath -Value $info.Snippet
        Add-Content -LiteralPath $FindingsPath -Value 'SNIPPET_END'
        Add-Content -LiteralPath $FindingsPath -Value ''
    }

    $treeItems = @()
    if ($appExists) {
        $treeItems += '=== APP TREE ==='
        $treeItems += (Get-ChildItem -LiteralPath $appDir -Recurse -File | ForEach-Object { $_.FullName })
        $treeItems += ''
    }
    if ($srcAppExists) {
        $treeItems += '=== SRC APP TREE ==='
        $treeItems += (Get-ChildItem -LiteralPath $srcAppDir -Recurse -File | ForEach-Object { $_.FullName })
        $treeItems += ''
    }
    Set-Content -LiteralPath $TreePath -Value $treeItems -Encoding UTF8

    $latestLog = Get-ChildItem -LiteralPath (Join-Path $RepoRoot '_debug') -Filter 'next_dev.log' -Recurse -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($latestLog) {
        Get-Content -LiteralPath $latestLog.FullName -Tail 200 | Set-Content -LiteralPath $LogTailPath -Encoding UTF8
    }
    else {
        Set-Content -LiteralPath $LogTailPath -Value 'NO_NEXT_DEV_LOG_FOUND' -Encoding UTF8
    }

    $rootWhoami  = $results | Where-Object { $_.Path -like '*app\api\debug\auth-whoami\route.ts' -and $_.Path -notlike '*src\app*' }
    $rootContext = $results | Where-Object { $_.Path -like '*app\api\debug\context\route.ts' -and $_.Path -notlike '*src\app*' }
    $rootTenants = $results | Where-Object { $_.Path -like '*app\api\tenants\route.ts' -and $_.Path -notlike '*src\app*' }

    $srcWhoami   = $results | Where-Object { $_.Path -like '*src\app\api\debug\auth-whoami\route.ts' }
    $srcContext  = $results | Where-Object { $_.Path -like '*src\app\api\debug\context\route.ts' }
    $srcTenants  = $results | Where-Object { $_.Path -like '*src\app\api\tenants\route.ts' }

    $rootAllExist = $rootWhoami.Exists -and $rootContext.Exists -and $rootTenants.Exists
    $srcAllExist  = $srcWhoami.Exists -and $srcContext.Exists -and $srcTenants.Exists

    $diagnosis = 'UNDETERMINED'

    if (-not $rootAllExist -and -not $srcAllExist) {
        $diagnosis = 'ROUTES_MISSING_IN_BOTH_TREES'
    }
    elseif ($rootAllExist -and -not $srcAllExist -and $srcAppExists) {
        $diagnosis = 'ROOT_APP_HAS_ROUTES_BUT_SRC_APP_EXISTS_POSSIBLE_ACTIVE_TREE_MISMATCH'
    }
    elseif (-not $rootAllExist -and $srcAllExist) {
        $diagnosis = 'SRC_APP_HAS_ROUTES_ROOT_APP_INCOMPLETE'
    }
    elseif ($rootAllExist -and $srcAllExist) {
        $diagnosis = 'ROUTES_EXIST_IN_BOTH_TREES_CHECK_RUNTIME_RESOLUTION'
    }
    elseif ($rootAllExist -and -not $srcAppExists) {
        $diagnosis = 'ROOT_APP_HAS_ROUTES_NO_SRC_APP_PRESENT'
    }

    Set-Content -LiteralPath $SummaryPath -Value @(
        'PASS'
        'STAGE=ROUTE_FOOTPRINT_AUDIT'
        'APP_DIR_EXISTS=' + $appExists
        'SRC_DIR_EXISTS=' + $srcExists
        'SRC_APP_DIR_EXISTS=' + $srcAppExists
        'ROOT_ALL_EXPECTED_ROUTES_EXIST=' + $rootAllExist
        'SRC_ALL_EXPECTED_ROUTES_EXIST=' + $srcAllExist
        'DIAGNOSIS=' + $diagnosis
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
        'TREE_PATH=' + $TreePath
        'FINDINGS_PATH=' + $FindingsPath
        'LOG_TAIL_PATH=' + $LogTailPath
    ) -Encoding UTF8
}
catch {
    Set-Content -LiteralPath $SummaryPath -Value @(
        'FAIL'
        'STAGE=ROUTE_FOOTPRINT_AUDIT'
        'ERROR=' + $_.Exception.Message
        'OUT_DIR=' + $OutDir
        'SUMMARY_PATH=' + $SummaryPath
    ) -Encoding UTF8
}
finally {
    Get-Content -LiteralPath $SummaryPath
    Write-Host ''
    Read-Host 'Copy the block above and the SUMMARY_PATH, then press Enter to close'
}
