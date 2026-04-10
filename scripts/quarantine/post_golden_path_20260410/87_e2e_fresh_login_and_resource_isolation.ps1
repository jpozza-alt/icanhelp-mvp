$ErrorActionPreference = "Stop"

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host ("[{0}] [{1}] {2}" -f $ts, $Level, $Message)
}

function Ensure-Dir {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Save-Text {
    param(
        [string]$Path,
        [string]$Text
    )
    $parent = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($parent)) {
        Ensure-Dir -Path $parent
    }
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.Encoding]::UTF8)
}

function Save-Json {
    param(
        [string]$Path,
        $Object
    )
    $json = $Object | ConvertTo-Json -Depth 40
    Save-Text -Path $Path -Text $json
}

function Get-FileText {
    param([string]$Path)
    if (Test-Path -LiteralPath $Path) {
        return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    }
    return ""
}

function Read-EnvValue {
    param(
        [string[]]$EnvFiles,
        [string]$Key
    )

    foreach ($file in $EnvFiles) {
        if (-not (Test-Path -LiteralPath $file)) {
            continue
        }

        $lines = Get-Content -LiteralPath $file
        foreach ($line in $lines) {
            if ($line -match '^\s*#') { continue }
            if ($line -match '^\s*$') { continue }

            $pattern = '^\s*' + [regex]::Escape($Key) + '\s*=\s*(.*)\s*$'
            $m = [regex]::Match($line, $pattern)
            if ($m.Success) {
                $value = $m.Groups[1].Value.Trim()
                if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
                if (-not [string]::IsNullOrWhiteSpace($value)) {
                    return $value
                }
            }
        }
    }

    return $null
}

function Get-StringFromFileOrPrompt {
    param(
        [string]$PreferredPath,
        [string]$Prompt
    )

    if (Test-Path -LiteralPath $PreferredPath) {
        $content = (Get-Content -LiteralPath $PreferredPath -Raw).Trim()
        if (-not [string]::IsNullOrWhiteSpace($content)) {
            return $content
        }
    }

    return (Read-Host $Prompt).Trim()
}

function Read-PlainPassword {
    param([string]$Prompt)

    $secure = Read-Host $Prompt -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    }
    finally {
        if ($bstr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }
}

function Decode-Base64UrlToString {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $padded = $Value.Replace("-", "+").Replace("_", "/")
    switch ($padded.Length % 4) {
        2 { $padded += "==" }
        3 { $padded += "=" }
        default { }
    }

    $bytes = [System.Convert]::FromBase64String($padded)
    return [System.Text.Encoding]::UTF8.GetString($bytes)
}

function Get-JwtInfo {
    param([string]$Jwt)

    $result = [ordered]@{
        valid = $false
        reason = ""
        sub = $null
        email = $null
        role = $null
        exp = $null
        expires_at_utc = $null
        seconds_remaining = $null
        payload = $null
    }

    if ([string]::IsNullOrWhiteSpace($Jwt)) {
        $result.reason = "empty_token"
        return [pscustomobject]$result
    }

    $parts = $Jwt.Trim().Split(".")
    if ($parts.Count -lt 2) {
        $result.reason = "not_jwt"
        return [pscustomobject]$result
    }

    try {
        $payloadJson = Decode-Base64UrlToString -Value $parts[1]
        $payloadObj = $payloadJson | ConvertFrom-Json

        $result.sub = $payloadObj.sub
        $result.email = $payloadObj.email
        $result.role = $payloadObj.role
        $result.payload = $payloadObj

        if ($null -ne $payloadObj.exp) {
            $expInt = [int64]$payloadObj.exp
            $epoch = [DateTimeOffset]::FromUnixTimeSeconds($expInt)
            $result.exp = $expInt
            $result.expires_at_utc = $epoch.UtcDateTime.ToString("o")
            $result.seconds_remaining = [math]::Floor(($epoch.UtcDateTime - (Get-Date).ToUniversalTime()).TotalSeconds)
        }

        $result.valid = $true
        return [pscustomobject]$result
    }
    catch {
        $result.reason = $_.Exception.Message
        return [pscustomobject]$result
    }
}

function Invoke-PasswordLogin {
    param(
        [string]$SupabaseUrl,
        [string]$AnonKey,
        [string]$Email,
        [string]$Password
    )

    $url = $SupabaseUrl.TrimEnd("/") + "/auth/v1/token?grant_type=password"
    $headers = @{
        "apikey" = $AnonKey
        "Accept" = "application/json"
    }

    $bodyObj = @{
        email = $Email
        password = $Password
    }

    $bodyJson = $bodyObj | ConvertTo-Json -Depth 5

    try {
        $resp = Invoke-WebRequest -Method "POST" -Uri $url -Headers $headers -ContentType "application/json" -Body $bodyJson -UseBasicParsing -ErrorAction Stop
        $json = $null
        if (-not [string]::IsNullOrWhiteSpace([string]$resp.Content)) {
            $json = $resp.Content | ConvertFrom-Json
        }

        return [pscustomobject]@{
            ok = $true
            status = [int]$resp.StatusCode
            body_text = [string]$resp.Content
            json = $json
            exception = $null
        }
    }
    catch {
        $ex = $_.Exception
        $status = $null
        $bodyText = ""

        if ($ex.Response -ne $null) {
            try {
                $status = [int]$ex.Response.StatusCode
            }
            catch { }

            try {
                $stream = $ex.Response.GetResponseStream()
                if ($stream -ne $null) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $bodyText = $reader.ReadToEnd()
                    $reader.Close()
                }
            }
            catch { }
        }

        $json = $null
        if (-not [string]::IsNullOrWhiteSpace($bodyText)) {
            try {
                $json = $bodyText | ConvertFrom-Json
            }
            catch { }
        }

        return [pscustomobject]@{
            ok = $false
            status = $status
            body_text = $bodyText
            json = $json
            exception = $ex.Message
        }
    }
}

function Invoke-Http {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers,
        [string]$Body,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        [int]$TimeoutSec = 60
    )

    $responseObj = [ordered]@{
        ok = $false
        status = $null
        body_text = ""
        json = $null
        headers = @{}
        exception = $null
        url = $Url
        method = $Method
    }

    try {
        $params = @{
            Method          = $Method
            Uri             = $Url
            Headers         = $Headers
            TimeoutSec      = $TimeoutSec
            UseBasicParsing = $true
            ErrorAction     = "Stop"
        }

        if ($null -ne $Session) {
            $params.WebSession = $Session
        }

        if (-not [string]::IsNullOrWhiteSpace($Body)) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }

        $resp = Invoke-WebRequest @params

        $responseObj.ok = $true
        $responseObj.status = [int]$resp.StatusCode
        $responseObj.body_text = [string]$resp.Content

        foreach ($k in $resp.Headers.Keys) {
            $responseObj.headers[$k] = [string]$resp.Headers[$k]
        }

        if (-not [string]::IsNullOrWhiteSpace($responseObj.body_text)) {
            try {
                $responseObj.json = $responseObj.body_text | ConvertFrom-Json
            }
            catch { }
        }

        return [pscustomobject]$responseObj
    }
    catch {
        $ex = $_.Exception
        $responseObj.exception = $ex.Message

        if ($ex.Response -ne $null) {
            try {
                $responseObj.status = [int]$ex.Response.StatusCode
            }
            catch { }

            try {
                $stream = $ex.Response.GetResponseStream()
                if ($stream -ne $null) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $responseObj.body_text = $reader.ReadToEnd()
                    $reader.Close()
                }
            }
            catch { }

            if (-not [string]::IsNullOrWhiteSpace($responseObj.body_text)) {
                try {
                    $responseObj.json = $responseObj.body_text | ConvertFrom-Json
                }
                catch { }
            }
        }

        return [pscustomobject]$responseObj
    }
}

function Get-AuthHeaders {
    param(
        [string]$Jwt,
        [string]$TenantId
    )

    $h = @{
        "Authorization" = "Bearer $Jwt"
        "Accept"        = "application/json"
    }

    if (-not [string]::IsNullOrWhiteSpace($TenantId)) {
        $h["x-tenant-id"] = $TenantId
        $h["x-icanhelp-tenant"] = $TenantId
    }

    return $h
}

function New-WebSession {
    return New-Object Microsoft.PowerShell.Commands.WebRequestSession
}

function Test-EndpointReachable {
    param([string]$BaseUrl)

    $probe = Invoke-Http -Method "GET" -Url ($BaseUrl.TrimEnd("/") + "/api/debug/context") -Headers @{} -Body $null -Session $null -TimeoutSec 15
    if ($null -ne $probe.status) {
        return $true
    }

    return $false
}

function Start-LocalAppIfNeeded {
    param(
        [string]$RepoRoot,
        [string]$BaseUrl,
        [string]$RunDir
    )

    $devLog = Join-Path $RunDir "local_app_dev.log"

    $startInfo = [ordered]@{
        app_reachable_before = $false
        started_process = $false
        process_id = $null
        dev_log = $devLog
        app_reachable_after = $false
    }

    if (Test-EndpointReachable -BaseUrl $BaseUrl) {
        $startInfo.app_reachable_before = $true
        $startInfo.app_reachable_after = $true
        return [pscustomobject]$startInfo
    }

    $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -eq $npmCmd) {
        throw "npm.cmd not found in PATH."
    }

    Write-Log "Local app not reachable. Starting npm run dev..." "WARN"

    $cmdLine = "/c npm.cmd run dev 1> `"$devLog`" 2>&1"
    $p = Start-Process -FilePath "cmd.exe" -ArgumentList $cmdLine -WorkingDirectory $RepoRoot -WindowStyle Hidden -PassThru

    $startInfo.started_process = $true
    $startInfo.process_id = $p.Id

    $deadline = (Get-Date).AddMinutes(3)
    do {
        Start-Sleep -Seconds 3
        if (Test-EndpointReachable -BaseUrl $BaseUrl) {
            $startInfo.app_reachable_after = $true
            return [pscustomobject]$startInfo
        }
    } while ((Get-Date) -lt $deadline)

    return [pscustomobject]$startInfo
}

function Extract-TenantIds {
    param(
        $Json,
        [string]$BodyText
    )

    $ids = New-Object System.Collections.Generic.List[string]

    if ($null -ne $Json) {
        if ($Json -is [System.Array]) {
            foreach ($item in $Json) {
                if ($null -ne $item -and $item.PSObject.Properties.Name -contains "id") {
                    $val = [string]$item.id
                    if (-not [string]::IsNullOrWhiteSpace($val)) {
                        $ids.Add($val)
                    }
                }
            }
        }
        else {
            foreach ($prop in @("tenants", "data", "items", "result")) {
                if ($Json.PSObject.Properties.Name -contains $prop) {
                    $val = $Json.$prop

                    if ($val -is [System.Array]) {
                        foreach ($item in $val) {
                            if ($null -ne $item -and $item.PSObject.Properties.Name -contains "id") {
                                $id = [string]$item.id
                                if (-not [string]::IsNullOrWhiteSpace($id)) {
                                    $ids.Add($id)
                                }
                            }
                        }
                    }
                    elseif ($null -ne $val) {
                        if ($val.PSObject.Properties.Name -contains "id") {
                            $id = [string]$val.id
                            if (-not [string]::IsNullOrWhiteSpace($id)) {
                                $ids.Add($id)
                            }
                        }
                    }
                }
            }

            if (($ids.Count -eq 0) -and ($Json.PSObject.Properties.Name -contains "id")) {
                $singleId = [string]$Json.id
                if (-not [string]::IsNullOrWhiteSpace($singleId)) {
                    $ids.Add($singleId)
                }
            }
        }
    }

    if (($ids.Count -eq 0) -and (-not [string]::IsNullOrWhiteSpace($BodyText))) {
        $matches = [regex]::Matches($BodyText, '"id"\s*:\s*"([0-9a-fA-F-]{36})"')
        foreach ($m in $matches) {
            $id = $m.Groups[1].Value
            if (-not [string]::IsNullOrWhiteSpace($id)) {
                $ids.Add($id)
            }
        }
    }

    $unique = New-Object System.Collections.Generic.List[string]
    $seen = @{}

    foreach ($id in $ids) {
        if (-not $seen.ContainsKey($id)) {
            $seen[$id] = $true
            $unique.Add($id)
        }
    }

    return ,$unique.ToArray()
}

function Select-PrimaryTenantId {
    param(
        [string[]]$PrimaryIds,
        [string[]]$SecondaryIds
    )

    $secondarySet = @{}
    foreach ($id in $SecondaryIds) {
        if (-not [string]::IsNullOrWhiteSpace($id)) {
            $secondarySet[$id] = $true
        }
    }

    foreach ($id in $PrimaryIds) {
        if (-not [string]::IsNullOrWhiteSpace($id) -and (-not $secondarySet.ContainsKey($id))) {
            return $id
        }
    }

    if ($PrimaryIds.Count -gt 0) {
        return [string]$PrimaryIds[0]
    }

    return $null
}

function Get-TenantIdFromCookieJar {
    param(
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        [string]$BaseUrl
    )

    try {
        $uri = [Uri]$BaseUrl
        $cookies = $Session.Cookies.GetCookies($uri)
        foreach ($c in $cookies) {
            if ($c.Name -eq "icanhelp_tenant") {
                return [string]$c.Value
            }
        }
    }
    catch { }

    return $null
}

function Activate-Tenant {
    param(
        [string]$BaseUrl,
        [string]$Jwt,
        [string]$TenantId,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session
    )

    $url = $BaseUrl.TrimEnd("/") + "/api/tenants/active"

    $candidates = @(
        @{ tenantId = $TenantId },
        @{ id = $TenantId },
        @{ tenant_id = $TenantId }
    )

    $attempts = @()

    foreach ($bodyObj in $candidates) {
        $bodyJson = $bodyObj | ConvertTo-Json -Depth 10
        $resp = Invoke-Http -Method "POST" -Url $url -Headers (Get-AuthHeaders -Jwt $Jwt -TenantId $null) -Body $bodyJson -Session $Session
        $cookieTenant = Get-TenantIdFromCookieJar -Session $Session -BaseUrl $BaseUrl

        $attempts += [pscustomobject]@{
            body = $bodyObj
            status = $resp.status
            ok = $resp.ok
            response_text = $resp.body_text
            cookie_tenant = $cookieTenant
        }

        if (($resp.status -ge 200) -and ($resp.status -lt 300) -and ($cookieTenant -eq $TenantId)) {
            return [pscustomobject]@{
                success = $true
                chosen_body = $bodyObj
                status = $resp.status
                response = $resp
                cookie_tenant = $cookieTenant
                attempts = $attempts
            }
        }
    }

    return [pscustomobject]@{
        success = $false
        chosen_body = $null
        status = $null
        response = $null
        cookie_tenant = (Get-TenantIdFromCookieJar -Session $Session -BaseUrl $BaseUrl)
        attempts = $attempts
    }
}

function Discover-TicketPayloadCandidates {
    param(
        [string]$RepoRoot,
        [string]$Marker
    )

    $paths = @(
        (Join-Path $RepoRoot "app\api\tickets\route.ts"),
        (Join-Path $RepoRoot "db\migrations\20260301_create_tickets_with_rls.sql"),
        (Join-Path $RepoRoot "scripts\67_create_ticket_with_tenant.ps1"),
        (Join-Path $RepoRoot "scripts\prod-smoke-tickets-now.ps1")
    )

    $blob = ""
    foreach ($p in $paths) {
        $blob += ([Environment]::NewLine + (Get-FileText -Path $p))
    }

    $hasTitle = $blob -match "\btitle\b"
    $hasBody = $blob -match "\bbody\b"
    $hasStatus = $blob -match "\bstatus\b"
    $hasSubject = $blob -match "\bsubject\b"
    $hasDescription = $blob -match "\bdescription\b"

    $candidates = New-Object System.Collections.Generic.List[object]

    if ($hasTitle -and $hasBody -and $hasStatus) {
        $candidates.Add([ordered]@{
            title  = "cross-tenant-proof-$Marker"
            body   = "marker=$Marker"
            status = "draft"
        })
    }

    if ($hasTitle -and $hasBody) {
        $candidates.Add([ordered]@{
            title = "cross-tenant-proof-$Marker"
            body  = "marker=$Marker"
        })
    }

    if ($hasTitle -and $hasDescription) {
        $candidates.Add([ordered]@{
            title       = "cross-tenant-proof-$Marker"
            description = "marker=$Marker"
        })
    }

    if ($hasSubject -and $hasBody) {
        $candidates.Add([ordered]@{
            subject = "cross-tenant-proof-$Marker"
            body    = "marker=$Marker"
        })
    }

    if ($hasSubject -and $hasDescription) {
        $candidates.Add([ordered]@{
            subject     = "cross-tenant-proof-$Marker"
            description = "marker=$Marker"
        })
    }

    if ($candidates.Count -eq 0) {
        $candidates.Add([ordered]@{
            title = "cross-tenant-proof-$Marker"
            body  = "marker=$Marker"
        })
    }

    return ,$candidates.ToArray()
}

function Try-Create-Ticket {
    param(
        [string]$BaseUrl,
        [string]$Jwt,
        [string]$TenantId,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        [object[]]$PayloadCandidates
    )

    $url = $BaseUrl.TrimEnd("/") + "/api/tickets"
    $attempts = @()

    foreach ($payload in $PayloadCandidates) {
        $bodyJson = $payload | ConvertTo-Json -Depth 10
        $resp = Invoke-Http -Method "POST" -Url $url -Headers (Get-AuthHeaders -Jwt $Jwt -TenantId $TenantId) -Body $bodyJson -Session $Session

        $attempts += [pscustomobject]@{
            payload = $payload
            status = $resp.status
            ok = $resp.ok
            response_text = $resp.body_text
        }

        if (($resp.status -ge 200) -and ($resp.status -lt 300)) {
            return [pscustomobject]@{
                success = $true
                payload = $payload
                response = $resp
                attempts = $attempts
            }
        }
    }

    return [pscustomobject]@{
        success = $false
        payload = $null
        response = $null
        attempts = $attempts
    }
}

function ResponseContainsMarker {
    param(
        [string]$Text,
        [string]$Marker
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return $false
    }

    return ($Text -like ("*" + $Marker + "*"))
}

$RepoRoot = "C:\icanhelp-mvp"
$ScriptsDir = Join-Path $RepoRoot "scripts"
$DebugRoot = Join-Path $RepoRoot "_debug"
$runStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runDir = Join-Path $DebugRoot ("e2e_fresh_login_and_resource_isolation_" + $runStamp)

Ensure-Dir -Path $ScriptsDir
Ensure-Dir -Path $DebugRoot
Ensure-Dir -Path $runDir

$summary = [ordered]@{
    status = "FAIL"
    started_at = (Get-Date).ToString("o")
    repo_root = $RepoRoot
    run_dir = $runDir
    base_url = $null
    supabase_url = $null
    anon_key_present = $false
    app_bootstrap = $null
    primary_email = $null
    secondary_email = $null
    primary_jwt_info = $null
    secondary_jwt_info = $null
    primary_tenant_ids = @()
    secondary_tenant_ids = @()
    primary_selected_tenant = $null
    secondary_selected_tenant = $null
    primary_activation = $null
    secondary_activation = $null
    cross_activation_secondary_to_primary = $null
    ticket_payload_candidates = $null
    ticket_create = $null
    primary_get_after = $null
    secondary_get = $null
    marker = $null
    pass_conditions = [ordered]@{
        app_reachable = $false
        supabase_url_resolved = $false
        anon_key_resolved = $false
        primary_login_ok = $false
        secondary_login_ok = $false
        primary_jwt_fresh = $false
        secondary_jwt_fresh = $false
        primary_tenants_found = $false
        secondary_tenants_found = $false
        distinct_tenants = $false
        primary_activation_ok = $false
        secondary_activation_ok = $false
        primary_ticket_created = $false
        primary_can_see_ticket = $false
        secondary_cross_activation_blocked = $false
        secondary_cannot_see_primary_ticket = $false
    }
}

try {
    $baseUrlInput = Read-Host "Base URL [enter for http://localhost:3000]"
    if ([string]::IsNullOrWhiteSpace($baseUrlInput)) {
        $BaseUrl = "http://localhost:3000"
    }
    else {
        $BaseUrl = $baseUrlInput.Trim()
    }
    $summary.base_url = $BaseUrl

    $appInfo = Start-LocalAppIfNeeded -RepoRoot $RepoRoot -BaseUrl $BaseUrl -RunDir $runDir
    $summary.app_bootstrap = $appInfo
    Save-Json -Path (Join-Path $runDir "app_bootstrap.json") -Object $appInfo

    if (-not $appInfo.app_reachable_after) {
        throw ("App is not reachable at " + $BaseUrl)
    }
    $summary.pass_conditions.app_reachable = $true

    $envFiles = @(
        (Join-Path $RepoRoot ".env.local"),
        (Join-Path $RepoRoot ".env.production.local")
    )

    $supabaseUrl = Read-EnvValue -EnvFiles $envFiles -Key "NEXT_PUBLIC_SUPABASE_URL"
    if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
        $supabaseUrl = Read-Host "Paste NEXT_PUBLIC_SUPABASE_URL"
    }

    $anonKey = Read-EnvValue -EnvFiles $envFiles -Key "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    if ([string]::IsNullOrWhiteSpace($anonKey)) {
        $anonKey = Read-Host "Paste NEXT_PUBLIC_SUPABASE_ANON_KEY"
    }

    $summary.supabase_url = $supabaseUrl
    $summary.anon_key_present = (-not [string]::IsNullOrWhiteSpace($anonKey))

    if (-not [string]::IsNullOrWhiteSpace($supabaseUrl)) {
        $summary.pass_conditions.supabase_url_resolved = $true
    }
    if (-not [string]::IsNullOrWhiteSpace($anonKey)) {
        $summary.pass_conditions.anon_key_resolved = $true
    }

    if (-not $summary.pass_conditions.supabase_url_resolved) {
        throw "Supabase URL not resolved."
    }
    if (-not $summary.pass_conditions.anon_key_resolved) {
        throw "Supabase anon key not resolved."
    }

    $primaryEmailPath = Join-Path $ScriptsDir ".primary_email_last.txt"
    $secondaryEmailPath = Join-Path $ScriptsDir ".secondary_email_last.txt"

    $primaryEmail = Get-StringFromFileOrPrompt -PreferredPath $primaryEmailPath -Prompt "Primary email"
    $secondaryEmail = Get-StringFromFileOrPrompt -PreferredPath $secondaryEmailPath -Prompt "Secondary email"

    $summary.primary_email = $primaryEmail
    $summary.secondary_email = $secondaryEmail

    Save-Text -Path $primaryEmailPath -Text $primaryEmail
    Save-Text -Path $secondaryEmailPath -Text $secondaryEmail

    $primaryPassword = Read-PlainPassword -Prompt "Primary password"
    $secondaryPassword = Read-PlainPassword -Prompt "Secondary password"

    Write-Log "Logging in PRIMARY..."
    $primaryLogin = Invoke-PasswordLogin -SupabaseUrl $supabaseUrl -AnonKey $anonKey -Email $primaryEmail -Password $primaryPassword
    Save-Json -Path (Join-Path $runDir "primary_login_response.json") -Object $primaryLogin

    if (-not $primaryLogin.ok) {
        throw ("Primary login failed. Status=" + [string]$primaryLogin.status + " Exception=" + [string]$primaryLogin.exception)
    }

    $primaryJwt = [string]$primaryLogin.json.access_token
    if ([string]::IsNullOrWhiteSpace($primaryJwt)) {
        throw "Primary access_token missing in login response."
    }

    Save-Text -Path (Join-Path $ScriptsDir ".jwt_last.txt") -Text $primaryJwt
    $summary.pass_conditions.primary_login_ok = $true

    $primaryJwtInfo = Get-JwtInfo -Jwt $primaryJwt
    $summary.primary_jwt_info = $primaryJwtInfo
    Save-Json -Path (Join-Path $runDir "primary_jwt_info.json") -Object $primaryJwtInfo
    Save-Text -Path (Join-Path $ScriptsDir ".primary_user_id_last.txt") -Text ([string]$primaryJwtInfo.sub)

    if ($primaryJwtInfo.valid -and ($primaryJwtInfo.seconds_remaining -gt 300)) {
        $summary.pass_conditions.primary_jwt_fresh = $true
    }
    else {
        throw "Primary JWT is not fresh enough."
    }

    Write-Log "Logging in SECONDARY..."
    $secondaryLogin = Invoke-PasswordLogin -SupabaseUrl $supabaseUrl -AnonKey $anonKey -Email $secondaryEmail -Password $secondaryPassword
    Save-Json -Path (Join-Path $runDir "secondary_login_response.json") -Object $secondaryLogin

    if (-not $secondaryLogin.ok) {
        throw ("Secondary login failed. Status=" + [string]$secondaryLogin.status + " Exception=" + [string]$secondaryLogin.exception)
    }

    $secondaryJwt = [string]$secondaryLogin.json.access_token
    if ([string]::IsNullOrWhiteSpace($secondaryJwt)) {
        throw "Secondary access_token missing in login response."
    }

    Save-Text -Path (Join-Path $ScriptsDir ".jwt_secondary_last.txt") -Text $secondaryJwt
    $summary.pass_conditions.secondary_login_ok = $true

    $secondaryJwtInfo = Get-JwtInfo -Jwt $secondaryJwt
    $summary.secondary_jwt_info = $secondaryJwtInfo
    Save-Json -Path (Join-Path $runDir "secondary_jwt_info.json") -Object $secondaryJwtInfo
    Save-Text -Path (Join-Path $ScriptsDir ".secondary_user_id_last.txt") -Text ([string]$secondaryJwtInfo.sub)

    if ($secondaryJwtInfo.valid -and ($secondaryJwtInfo.seconds_remaining -gt 300)) {
        $summary.pass_conditions.secondary_jwt_fresh = $true
    }
    else {
        throw "Secondary JWT is not fresh enough."
    }

    Write-Log "Listing tenants for PRIMARY..."
    $primaryTenantsResp = Invoke-Http -Method "GET" -Url ($BaseUrl.TrimEnd("/") + "/api/tenants") -Headers (Get-AuthHeaders -Jwt $primaryJwt -TenantId $null) -Body $null -Session $null
    Save-Json -Path (Join-Path $runDir "primary_tenants_response.json") -Object $primaryTenantsResp
    Save-Text -Path (Join-Path $runDir "primary_tenants_raw.txt") -Text $primaryTenantsResp.body_text

    Write-Log "Listing tenants for SECONDARY..."
    $secondaryTenantsResp = Invoke-Http -Method "GET" -Url ($BaseUrl.TrimEnd("/") + "/api/tenants") -Headers (Get-AuthHeaders -Jwt $secondaryJwt -TenantId $null) -Body $null -Session $null
    Save-Json -Path (Join-Path $runDir "secondary_tenants_response.json") -Object $secondaryTenantsResp
    Save-Text -Path (Join-Path $runDir "secondary_tenants_raw.txt") -Text $secondaryTenantsResp.body_text

    if (($primaryTenantsResp.status -lt 200) -or ($primaryTenantsResp.status -ge 300)) {
        throw ("Primary /api/tenants failed with status " + [string]$primaryTenantsResp.status)
    }

    if (($secondaryTenantsResp.status -lt 200) -or ($secondaryTenantsResp.status -ge 300)) {
        throw ("Secondary /api/tenants failed with status " + [string]$secondaryTenantsResp.status)
    }

    $primaryTenantIds = Extract-TenantIds -Json $primaryTenantsResp.json -BodyText $primaryTenantsResp.body_text
    $secondaryTenantIds = Extract-TenantIds -Json $secondaryTenantsResp.json -BodyText $secondaryTenantsResp.body_text

    $summary.primary_tenant_ids = $primaryTenantIds
    $summary.secondary_tenant_ids = $secondaryTenantIds

    Save-Json -Path (Join-Path $runDir "primary_tenant_ids.json") -Object $primaryTenantIds
    Save-Json -Path (Join-Path $runDir "secondary_tenant_ids.json") -Object $secondaryTenantIds

    if (@($primaryTenantIds).Count -gt 0) {
        $summary.pass_conditions.primary_tenants_found = $true
    }
    if (@($secondaryTenantIds).Count -gt 0) {
        $summary.pass_conditions.secondary_tenants_found = $true
    }

    if (-not $summary.pass_conditions.primary_tenants_found) {
        throw "Primary tenant list is empty after extraction."
    }

    if (-not $summary.pass_conditions.secondary_tenants_found) {
        throw "Secondary tenant list is empty after extraction."
    }

    $primaryTenantId = Select-PrimaryTenantId -PrimaryIds $primaryTenantIds -SecondaryIds $secondaryTenantIds
    $secondaryTenantId = [string]$secondaryTenantIds[0]

    if ([string]::IsNullOrWhiteSpace($primaryTenantId)) {
        throw "Primary selected tenant is empty."
    }

    if ([string]::IsNullOrWhiteSpace($secondaryTenantId)) {
        throw "Secondary selected tenant is empty."
    }

    $summary.primary_selected_tenant = $primaryTenantId
    $summary.secondary_selected_tenant = $secondaryTenantId

    if ($primaryTenantId -ne $secondaryTenantId) {
        $summary.pass_conditions.distinct_tenants = $true
    }
    else {
        throw "Primary and secondary selected tenants are the same."
    }

    $primarySession = New-WebSession
    $secondarySession = New-WebSession

    Write-Log ("Activating PRIMARY tenant " + $primaryTenantId + " ...")
    $primaryActivation = Activate-Tenant -BaseUrl $BaseUrl -Jwt $primaryJwt -TenantId $primaryTenantId -Session $primarySession
    $summary.primary_activation = $primaryActivation
    Save-Json -Path (Join-Path $runDir "primary_activation.json") -Object $primaryActivation

    if (-not $primaryActivation.success) {
        throw "Primary tenant activation failed."
    }
    $summary.pass_conditions.primary_activation_ok = $true

    Write-Log ("Activating SECONDARY tenant " + $secondaryTenantId + " ...")
    $secondaryActivation = Activate-Tenant -BaseUrl $BaseUrl -Jwt $secondaryJwt -TenantId $secondaryTenantId -Session $secondarySession
    $summary.secondary_activation = $secondaryActivation
    Save-Json -Path (Join-Path $runDir "secondary_activation.json") -Object $secondaryActivation

    if (-not $secondaryActivation.success) {
        throw "Secondary tenant activation failed."
    }
    $summary.pass_conditions.secondary_activation_ok = $true

    $marker = [guid]::NewGuid().ToString("N")
    $summary.marker = $marker

    $payloadCandidates = Discover-TicketPayloadCandidates -RepoRoot $RepoRoot -Marker $marker
    $summary.ticket_payload_candidates = $payloadCandidates
    Save-Json -Path (Join-Path $runDir "ticket_payload_candidates.json") -Object $payloadCandidates

    Write-Log "Creating ticket in PRIMARY tenant..."
    $ticketCreate = Try-Create-Ticket -BaseUrl $BaseUrl -Jwt $primaryJwt -TenantId $primaryTenantId -Session $primarySession -PayloadCandidates $payloadCandidates
    $summary.ticket_create = $ticketCreate
    Save-Json -Path (Join-Path $runDir "ticket_create_attempts.json") -Object $ticketCreate

    if (-not $ticketCreate.success) {
        throw "Ticket creation failed for all payload candidates."
    }
    $summary.pass_conditions.primary_ticket_created = $true

    Write-Log "Listing tickets in PRIMARY tenant..."
    $primaryGetAfter = Invoke-Http -Method "GET" -Url ($BaseUrl.TrimEnd("/") + "/api/tickets") -Headers (Get-AuthHeaders -Jwt $primaryJwt -TenantId $primaryTenantId) -Body $null -Session $primarySession
    $summary.primary_get_after = $primaryGetAfter
    Save-Json -Path (Join-Path $runDir "primary_get_after.json") -Object $primaryGetAfter
    Save-Text -Path (Join-Path $runDir "primary_get_after_raw.txt") -Text $primaryGetAfter.body_text

    if (($primaryGetAfter.status -ge 200) -and ($primaryGetAfter.status -lt 300) -and (ResponseContainsMarker -Text $primaryGetAfter.body_text -Marker $marker)) {
        $summary.pass_conditions.primary_can_see_ticket = $true
    }
    else {
        throw "Primary could not verify created ticket marker."
    }

    Write-Log "Attempting forbidden cross-tenant activation: SECONDARY -> PRIMARY..."
    $crossActivation = Activate-Tenant -BaseUrl $BaseUrl -Jwt $secondaryJwt -TenantId $primaryTenantId -Session $secondarySession
    $summary.cross_activation_secondary_to_primary = $crossActivation
    Save-Json -Path (Join-Path $runDir "secondary_cross_activation_to_primary.json") -Object $crossActivation

    $secondaryCookieAfterCross = Get-TenantIdFromCookieJar -Session $secondarySession -BaseUrl $BaseUrl

    if (($crossActivation.success -eq $false) -and ($secondaryCookieAfterCross -ne $primaryTenantId)) {
        $summary.pass_conditions.secondary_cross_activation_blocked = $true
    }

    if (($crossActivation.success -eq $true) -and ($secondaryCookieAfterCross -ne $primaryTenantId)) {
        $summary.pass_conditions.secondary_cross_activation_blocked = $true
    }

    if (-not $summary.pass_conditions.secondary_cross_activation_blocked) {
        throw "Secondary cross-tenant activation was not blocked."
    }

    Write-Log "Listing tickets in SECONDARY tenant..."
    $secondaryGet = Invoke-Http -Method "GET" -Url ($BaseUrl.TrimEnd("/") + "/api/tickets") -Headers (Get-AuthHeaders -Jwt $secondaryJwt -TenantId $secondaryTenantId) -Body $null -Session $secondarySession
    $summary.secondary_get = $secondaryGet
    Save-Json -Path (Join-Path $runDir "secondary_get.json") -Object $secondaryGet
    Save-Text -Path (Join-Path $runDir "secondary_get_raw.txt") -Text $secondaryGet.body_text

    if (($secondaryGet.status -ge 200) -and ($secondaryGet.status -lt 300) -and (-not (ResponseContainsMarker -Text $secondaryGet.body_text -Marker $marker))) {
        $summary.pass_conditions.secondary_cannot_see_primary_ticket = $true
    }
    else {
        throw "Secondary could see the primary ticket marker."
    }

    $allPass = $true
    foreach ($k in $summary.pass_conditions.Keys) {
        if (-not $summary.pass_conditions[$k]) {
            $allPass = $false
        }
    }

    if ($allPass) {
        $summary.status = "PASS"
        Write-Log "PASS" "PASS"
    }
    else {
        $summary.status = "FAIL"
        Write-Log "FAIL" "FAIL"
    }
}
catch {
    $err = $_.Exception.Message
    $summary.status = "FAIL"
    $summary.error = $err
    Save-Text -Path (Join-Path $runDir "ERROR.txt") -Text $err
    Write-Log $err "ERROR"
}
finally {
    $summary.finished_at = (Get-Date).ToString("o")
    Save-Json -Path (Join-Path $runDir "SUMMARY.json") -Object $summary

    $report = @()
    $report += ("STATUS=" + $summary.status)
    $report += ("RUN_DIR=" + $runDir)
    $report += ("PRIMARY_EMAIL=" + [string]$summary.primary_email)
    $report += ("SECONDARY_EMAIL=" + [string]$summary.secondary_email)
    $report += ("PRIMARY_SELECTED_TENANT=" + [string]$summary.primary_selected_tenant)
    $report += ("SECONDARY_SELECTED_TENANT=" + [string]$summary.secondary_selected_tenant)
    foreach ($k in $summary.pass_conditions.Keys) {
        $report += ($k.ToUpper() + "=" + [string]$summary.pass_conditions[$k])
    }

    Save-Text -Path (Join-Path $runDir "PASTE_ME.txt") -Text ($report -join [Environment]::NewLine)

    Write-Host ""
    Write-Host "Artifacts:"
    Write-Host ("- " + (Join-Path $runDir "SUMMARY.json"))
    Write-Host ("- " + (Join-Path $runDir "PASTE_ME.txt"))
    Write-Host ("- " + (Join-Path $runDir "primary_login_response.json"))
    Write-Host ("- " + (Join-Path $runDir "secondary_login_response.json"))
    Write-Host ("- " + (Join-Path $runDir "primary_tenants_raw.txt"))
    Write-Host ("- " + (Join-Path $runDir "secondary_tenants_raw.txt"))
    Write-Host ("- " + (Join-Path $runDir "primary_activation.json"))
    Write-Host ("- " + (Join-Path $runDir "secondary_activation.json"))
    Write-Host ("- " + (Join-Path $runDir "secondary_cross_activation_to_primary.json"))
    Write-Host ("- " + (Join-Path $runDir "ticket_create_attempts.json"))
    Write-Host ("- " + (Join-Path $runDir "primary_get_after.json"))
    Write-Host ("- " + (Join-Path $runDir "secondary_get.json"))
    Write-Host ""

    if ($summary.status -eq "PASS") {
        Write-Host "PASS"
    }
    else {
        Write-Host "FAIL"
    }

    Read-Host "Press ENTER to finish"
}