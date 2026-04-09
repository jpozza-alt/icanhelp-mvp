$ErrorActionPreference="Stop"
Set-StrictMode -Version Latest

function Clean-Val([string]$v){
  if($null -eq $v){ return $null }
  $v = $v.Trim().Trim('"').Trim("'")
  $v = $v -replace "`r","" -replace "`n",""
  $v = $v -replace "\\r","" -replace "\\n",""
  return $v.Trim()
}

# Lê .env.local
$envMap=@{}
Get-Content ".\.env.local" | %{
  if($_ -match '^\s*#' -or $_ -match '^\s*$'){ return }
  if($_ -match '^([^=]+)=(.*)$'){
    $envMap[$matches[1].Trim()] = $matches[2]
  }
}

$u = $envMap["SUPABASE_URL"]; if(-not $u){ $u = $envMap["NEXT_PUBLIC_SUPABASE_URL"] }
$k = $envMap["SUPABASE_ANON_KEY"]; if(-not $k){ $k = $envMap["NEXT_PUBLIC_SUPABASE_ANON_KEY"] }

$u = (Clean-Val $u).TrimEnd("/")
$k = Clean-Val $k

if(-not $u){ throw "Sem SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL" }
if(-not $k){ throw "Sem SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY" }

# Confirma health 200 (sem vazar key)
$r = Invoke-WebRequest -Method GET -Uri "$u/auth/v1/health" -Headers @{ apikey=$k; Authorization="Bearer $k" } -TimeoutSec 20
Write-Host ("✅ Supabase health: HTTP " + $r.StatusCode)

# Pede credenciais
$email  = Read-Host "Email (Supabase Auth)"
$pass   = Read-Host "Senha" -AsSecureString
$tenant = Read-Host "tenant_uuid (x-icanhelp-tenant)"

# converte securestring -> string
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass)
try { $passPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }

# pega JWT via node + supabase-js
$env:SUPABASE_URL = $u
$env:SUPABASE_ANON_KEY = $k
$env:SB_EMAIL = $email
$env:SB_PASSWORD = $passPlain

$nodeScript = @"
(async () => {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email: process.env.SB_EMAIL, password: process.env.SB_PASSWORD });
  if (error) { console.log(JSON.stringify({ ok:false, message:error.message }, null, 2)); process.exit(3); }
  const token = data?.session?.access_token;
  console.log(JSON.stringify({ ok:true, token_len: token?.length || 0, user_id: data?.user?.id || null }, null, 2));
  require('fs').writeFileSync('jwt.txt', token, { encoding: 'utf8' });
})();
"@

$nodeOut = & node -e $nodeScript 2>&1
$nodeOut | % { $_ }
if(-not (Test-Path .\jwt.txt)){ throw "jwt.txt não foi gerado (login falhou)" }
$jwt = (Get-Content .\jwt.txt -Raw).Trim()
if($jwt.Split('.').Count -ne 3){ throw "JWT inválido (jwt.txt estranho)" }

# chama PROD /api/tickets e captura corpo mesmo em erro
function Call-Api([string]$method,[string]$url,[hashtable]$headers,[string]$bodyJson=$null){
  try{
    $p=@{ Method=$method; Uri=$url; Headers=$headers; TimeoutSec=30 }
    if($bodyJson){ $p.ContentType="application/json"; $p.Body=$bodyJson }
    $resp = Invoke-WebRequest @p
    return @{ ok=$true; status=[int]$resp.StatusCode; body=$resp.Content }
  } catch {
    $ex=$_.Exception
    $status=$null
    $body=$null
    if($ex.Response -and $ex.Response -is [System.Net.HttpWebResponse]){
      $status=[int]$ex.Response.StatusCode
      try{
        $stream=$ex.Response.GetResponseStream()
        if($stream){
          $sr=New-Object IO.StreamReader($stream)
          $body=$sr.ReadToEnd()
          $sr.Close()
        }
      } catch { }
    }
    return @{ ok=$false; status=$status; body=$body; error=$ex.Message }
  }
}

$prod = "https://icanhelp-mvp.vercel.app"
$endpoint = "$prod/api/tickets"
$headers = @{
  Authorization = "Bearer $jwt"
  "x-icanhelp-tenant" = $tenant
  Accept="application/json"
}

Write-Host "---- GET /api/tickets ----"
$g = Call-Api "GET" $endpoint $headers
$g | ConvertTo-Json -Depth 6

Write-Host "---- POST /api/tickets ----"
$body = @{ title="SMOKE $(Get-Date -Format s)"; description="after env cleanup" } | ConvertTo-Json -Depth 5
$p = Call-Api "POST" $endpoint $headers $body
$p | ConvertTo-Json -Depth 6

