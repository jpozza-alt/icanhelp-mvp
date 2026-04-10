param(
  [string]$ApiUrl = "https://icanhelp-mvp.vercel.app/api/tickets"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:ICANHELP_JWT)) { throw "ICANHELP_JWT não definido. Rode o 66 primeiro." }
if ([string]::IsNullOrWhiteSpace($env:ICANHELP_TENANT)) { throw "ICANHELP_TENANT não definido. Rode o 66 primeiro." }

$body = @{
  title = "Pedido de ajuda - com tenant"
  description = "Criado com isolamento por tenant via header."
} | ConvertTo-Json

$res = Invoke-WebRequest -Method Post -Uri $ApiUrl -Headers @{
  Authorization = "Bearer $env:ICANHELP_JWT"
  "x-icanhelp-tenant" = $env:ICANHELP_TENANT
  "Content-Type" = "application/json"
} -Body $body -SkipHttpErrorCheck

Write-Host ("HTTP Status: " + $res.StatusCode) -ForegroundColor Cyan
Write-Host "Body:"
$res.Content | Write-Host
