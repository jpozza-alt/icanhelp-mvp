$ErrorActionPreference = 'Stop'

function Write-Section {
    param([string]$Text)
    Write-Host ""
    Write-Host ("==== " + $Text + " ====")
}

function New-DirSafe {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Save-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )
    $dir = Split-Path -Parent $Path
    if ($dir) {
        New-DirSafe -Path $dir
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

$RepoRoot = 'C:\icanhelp-mvp'
$Timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$RunDir = Join-Path $RepoRoot ("_debug\action103_capture_raw_next_build_" + $Timestamp)
$SummaryPath = Join-Path $RunDir 'summary.txt'
$StdoutPath = Join-Path $RunDir 'build_stdout.txt'
$StderrPath = Join-Path $RunDir 'build_stderr.txt'
$CombinedPath = Join-Path $RunDir 'build_combined.txt'

New-DirSafe -Path $RunDir

Write-Section 'BOOT'

if (-not (Test-Path -LiteralPath $RepoRoot)) {
    $msg = @(
        'STATUS=FAIL'
        'REASON=REPO_ROOT_NOT_FOUND'
        "REPO_ROOT=$RepoRoot"
    ) -join [Environment]::NewLine
    Save-Utf8NoBom -Path $SummaryPath -Content $msg
    Write-Host $msg
    Read-Host 'Press Enter to close'
    return
}

$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    $msg = @(
        'STATUS=FAIL'
        'REASON=NPM_NOT_FOUND'
        'DETAIL=npm.cmd nao foi encontrado no PATH'
    ) -join [Environment]::NewLine
    Save-Utf8NoBom -Path $SummaryPath -Content $msg
    Write-Host $msg
    Read-Host 'Press Enter to close'
    return
}

Write-Section 'RUN_BUILD_RAW'
Push-Location $RepoRoot

try {
    if (Test-Path -LiteralPath $StdoutPath) { Remove-Item -LiteralPath $StdoutPath -Force -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $StderrPath) { Remove-Item -LiteralPath $StderrPath -Force -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $CombinedPath) { Remove-Item -LiteralPath $CombinedPath -Force -ErrorAction SilentlyContinue }

    $proc = Start-Process -FilePath 'npm.cmd' `
        -ArgumentList @('run', 'build') `
        -WorkingDirectory $RepoRoot `
        -RedirectStandardOutput $StdoutPath `
        -RedirectStandardError $StderrPath `
        -NoNewWindow `
        -PassThru `
        -Wait

    $exitCode = $proc.ExitCode
}
finally {
    Pop-Location
}

Write-Section 'MERGE_LOGS'
$stdout = ''
$stderr = ''

if (Test-Path -LiteralPath $StdoutPath) {
    $stdout = Get-Content -LiteralPath $StdoutPath -Raw
}

if (Test-Path -LiteralPath $StderrPath) {
    $stderr = Get-Content -LiteralPath $StderrPath -Raw
}

$combined = @(
    '===== STDOUT START ====='
    $stdout
    '===== STDOUT END ====='
    ''
    '===== STDERR START ====='
    $stderr
    '===== STDERR END ====='
) -join [Environment]::NewLine

Save-Utf8NoBom -Path $CombinedPath -Content $combined

$stdoutExists = Test-Path -LiteralPath $StdoutPath
$stderrExists = Test-Path -LiteralPath $StderrPath
$stdoutSize = if ($stdoutExists) { (Get-Item -LiteralPath $StdoutPath).Length } else { 0 }
$stderrSize = if ($stderrExists) { (Get-Item -LiteralPath $StderrPath).Length } else { 0 }
$combinedSize = if (Test-Path -LiteralPath $CombinedPath) { (Get-Item -LiteralPath $CombinedPath).Length } else { 0 }

$summary = @(
    ("STATUS=" + ($(if ($exitCode -eq 0) { 'PASS' } else { 'FAIL' })))
    "REPO_ROOT=$RepoRoot"
    "RUN_DIR=$RunDir"
    "STDOUT_PATH=$StdoutPath"
    "STDERR_PATH=$StderrPath"
    "COMBINED_PATH=$CombinedPath"
    ("BUILD_EXIT_CODE=" + $exitCode)
    ("STDOUT_SIZE=" + $stdoutSize)
    ("STDERR_SIZE=" + $stderrSize)
    ("COMBINED_SIZE=" + $combinedSize)
)

Save-Utf8NoBom -Path $SummaryPath -Content ($summary -join [Environment]::NewLine)

Write-Section 'RESULT'
Get-Content -LiteralPath $SummaryPath
Write-Host ''
Write-Host 'Preview STDOUT tail:'
Write-Host '----------------------------------------'
if ($stdoutExists) {
    Get-Content -LiteralPath $StdoutPath -Tail 80
} else {
    Write-Host '[STDOUT vazio]'
}
Write-Host '----------------------------------------'
Write-Host ''
Write-Host 'Preview STDERR tail:'
Write-Host '----------------------------------------'
if ($stderrExists) {
    Get-Content -LiteralPath $StderrPath -Tail 80
} else {
    Write-Host '[STDERR vazio]'
}
Write-Host '----------------------------------------'

Read-Host 'Press Enter to close'