Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$pages = Get-ChildItem -Path "app" -Recurse -Filter "page.tsx" -File
$errors = @()

foreach ($p in $pages) {
  $content = Get-Content $p.FullName -Raw
  if ($content -notmatch "export\s+default") {
    $errors += $p.FullName
  }
}

if ($errors.Count -gt 0) {
  Write-Host "ERRO: page.tsx sem 'export default' encontrado:" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "OK: todos os page.tsx possuem export default." -ForegroundColor Green