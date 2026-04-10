param(
  [string]$DefaultSupabaseUrl = "https://bueqlqtfeacnlhqlwtgo.supabase.co",
  [string]$ProdUrl = "https://icanhelp-mvp.vercel.app/api/tickets"
)

$ErrorActionPreference = "Stop"

function Read-Secret($label) {
  $sec = Read-Host $label -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) } }
}

Write-Host "== LOGIN + PROBE (COM TENANT) ==" -ForegroundColor Yellow

$SUPABASE_URL = Read-Host "SUPABASE_URL [$DefaultSupabaseUrl]"
if ([string]::IsNullOrWhiteSpace($SUPABASE_URL)) { $SUPABASE_URL = $DefaultSupabaseUrl }
$SUPABASE_URL = $SUPABASE_URL.Trim().TrimEnd("/")

$ANON = Read-Secret "SUPABASE_ANON_KEY (oculta)"
$TENANT = Read-Host "TENANT_ID (uuid)"
if ([string]::IsNullOrWhiteSpace($TENANT)) { throw "TENANT_ID obrigatório." }

$email = Read-Host "ICANHELP_EMAIL"
$pass = Read-Secret "ICANHELP_PASSWORD (oculta)"

$tokenUrl = "$SUPABASE_URL/auth/v1/token?grant_type=password"
$headers = @{
  apikey = $ANON
  Authorization = "Bearer $ANON"
  "Content-Type" = "application/json"
}

$body = @{ email = $email; password = $pass } | ConvertTo-Json

$resp = Invoke-RestMethod -Method Post -Uri $tokenUrl -Headers $headers -Body $body
$jwt = [string]$resp.access_token
if ($jwt.Split(".").Count -ne 3) { throw "access_token não é JWT válido." }

$env:ICANHELP_JWT = $jwt
$env:ICANHELP_TENANT = $TENANT

Write-Host "OK: JWT exportado em ICANHELP_JWT" -ForegroundColor Green
Write-Host "OK: TENANT exportado em ICANHELP_TENANT" -ForegroundColor Green

$res = Invoke-WebRequest -Method Get -Uri $ProdUrl -Headers @{
  Authorization = "Bearer $jwt"
  "x-icanhelp-tenant" = $TENANT
} -SkipHttpErrorCheck

Write-Host ("HTTP Status: " + $res.StatusCode) -ForegroundColor Cyan
if ($res.Headers["x-icanhelp-build"]) { Write-Host ("x-icanhelp-build: " + $res.Headers["x-icanhelp-build"]) }

Write-Host "Body:"
$res.Content | Write-Host
