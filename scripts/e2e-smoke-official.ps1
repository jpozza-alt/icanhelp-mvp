$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

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
    if ($parent) {
        Ensure-Dir -Path $parent
    }
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.Encoding]::UTF8)
}

function Invoke-Http {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers,
        [string]$Body = ""
    )

    try {
        $params = @{
            Method          = $Method
            Uri             = $Url
            Headers         = $Headers
            TimeoutSec      = 60
            ErrorAction     = "Stop"
            UseBasicParsing = $true
        }

        if (-not [string]::IsNullOrWhiteSpace($Body)) {
            $params["Body"] = $Body
            $params["ContentType"] = "application/json"
        }

        $resp = Invoke-WebRequest @params
        return [pscustomobject]@{
            ok        = $true
            status    = [int]$resp.StatusCode
            body      = [string]$resp.Content
            error     = ""
            headers   = $resp.Headers
        }
    }
    catch {
        $status = $null
        $body = ""
        $err = $_.Exception.Message

        if ($_.Exception.Response -ne $null) {
            try {
                $status = [int]$_.Exception.Response.StatusCode
            }
            catch { }

            try {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream -ne $null) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $body = $reader.ReadToEnd()
                    $reader.Close()
                }
            }
            catch { }
        }

        return [pscustomobject]@{
            ok        = $false
            status    = $status
            body      = $body
            error     = $err
            headers   = @{}
        }
    }
}

function Read-PlainSecret {
    param([string]$Prompt)
    $secure = Read-Host -Prompt $Prompt -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        if ($bstr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }
}

function Clean-PastedValue {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $v = [string]$Value
    $v = $v.Trim()
    $v = $v -replace '\\r', ''
    $v = $v -replace '\\n', ''
    $v = $v -replace "`r", ''
    $v = $v -replace "`n", ''
    $v = $v.Trim()

    if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
        if ($v.Length -ge 2) {
            $v = $v.Substring(1, $v.Length - 2).Trim()
        }
    }

    while ($v -match '^[A-Za-z_][A-Za-z0-9_]*=') {
        $eq = $v.IndexOf("=")
        if ($eq -lt 0) { break }
        $v = $v.Substring($eq + 1).Trim()
    }

    return $v
}

function Login-SupabasePassword {
    param(
        [string]$AnonKey,
        [string]$Email,
        [string]$Password
    )

    $url = "https://bueqlqtfeacnlhqlwtgo.supabase.co/auth/v1/token?grant_type=password"
    $headers = @{
        "apikey" = $AnonKey
        "Accept" = "application/json"
    }

    $body = @{
        email = $Email
        password = $Password
    } | ConvertTo-Json -Compress

    return Invoke-Http -Method "POST" -Url $url -Headers $headers -Body $body
}

function Get-TenantIdsByRegex {
    param([string]$JsonText)

    $ids = New-Object System.Collections.Generic.List[string]

    if ([string]::IsNullOrWhiteSpace($JsonText)) {
        return @()
    }

    $matches = [regex]::Matches($JsonText, '"tenant_id"\s*:\s*"([^"]+)"')
    foreach ($m in $matches) {
        $value = $m.Groups[1].Value
        if (-not [string]::IsNullOrWhiteSpace($value)) {
            $ids.Add($value)
        }
    }

    if ($ids.Count -eq 0) {
        $matches = [regex]::Matches($JsonText, '"id"\s*:\s*"([0-9a-fA-F-]{36})"')
        foreach ($m in $matches) {
            $value = $m.Groups[1].Value
            if (-not [string]::IsNullOrWhiteSpace($value)) {
                $ids.Add($value)
            }
        }
    }

    return @($ids | Select-Object -Unique)
}

function Auth-Headers {
    param(
        [string]$Jwt,
        [string]$TenantId = ""
    )

    $h = @{
        "Authorization" = "Bearer $Jwt"
        "Accept" = "application/json"
    }

    if (-not [string]::IsNullOrWhiteSpace($TenantId)) {
        $h["x-icanhelp-tenant"] = $TenantId
    }

    return $h
}

$RepoRoot = "C:\icanhelp-mvp"
$RunDir = Join-Path $RepoRoot ("_debug\e2e_smoke_official_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
$SummaryJsonPath = Join-Path $RunDir "SUMMARY.json"
$PasteMePath = Join-Path $RunDir "PASTE_ME.txt"

Ensure-Dir -Path $RunDir

$summary = [ordered]@{
    run_dir = $RunDir
    base_url = "https://icanhelp-mvp.vercel.app"
    primary_email = ""
    secondary_email = ""
    primary_tenant_id = ""
    secondary_tenant_id = ""
    created_ticket_id = ""
    created_ticket_title = ""
    primary_login_status = $null
    secondary_login_status = $null
    primary_tenants_status = $null
    secondary_tenants_status = $null
    primary_create_status = $null
    primary_get_status = $null
    secondary_own_get_status = $null
    secondary_cross_get_status = $null
    secondary_cross_post_status = $null
    primary_sees_created_ticket = $false
    secondary_own_list_sees_primary_ticket = $false
    secondary_cross_get_denied = $false
    secondary_cross_post_denied = $false
    overall = "FAIL"
    fail_reason = ""
}

try {
    $anonKey = Clean-PastedValue (Read-PlainSecret "Enter Supabase anon key")
    $primaryEmail = Clean-PastedValue (Read-Host "Enter primary user email")
    $primaryPassword = Clean-PastedValue (Read-PlainSecret "Enter primary user password")
    $secondaryEmail = Clean-PastedValue (Read-Host "Enter secondary user email")
    $secondaryPassword = Clean-PastedValue (Read-PlainSecret "Enter secondary user password")

    $summary.primary_email = $primaryEmail
    $summary.secondary_email = $secondaryEmail

    if ([string]::IsNullOrWhiteSpace($anonKey)) { throw "Supabase anon key is required." }
    if ([string]::IsNullOrWhiteSpace($primaryEmail)) { throw "Primary email is required." }
    if ([string]::IsNullOrWhiteSpace($primaryPassword)) { throw "Primary password is required." }
    if ([string]::IsNullOrWhiteSpace($secondaryEmail)) { throw "Secondary email is required." }
    if ([string]::IsNullOrWhiteSpace($secondaryPassword)) { throw "Secondary password is required." }

    $primaryLogin = Login-SupabasePassword -AnonKey $anonKey -Email $primaryEmail -Password $primaryPassword
    $secondaryLogin = Login-SupabasePassword -AnonKey $anonKey -Email $secondaryEmail -Password $secondaryPassword

    $summary.primary_login_status = $primaryLogin.status
    $summary.secondary_login_status = $secondaryLogin.status

    Save-Text -Path (Join-Path $RunDir "primary_login.json") -Text ($primaryLogin | ConvertTo-Json -Depth 20)
    Save-Text -Path (Join-Path $RunDir "secondary_login.json") -Text ($secondaryLogin | ConvertTo-Json -Depth 20)

    if ($primaryLogin.status -ne 200) { throw ("Primary login failed with status " + $primaryLogin.status) }
    if ($secondaryLogin.status -ne 200) { throw ("Secondary login failed with status " + $secondaryLogin.status) }

    $primaryJwt = ""
    $secondaryJwt = ""

    $primaryTokenMatch = [regex]::Match($primaryLogin.body, '"access_token"\s*:\s*"([^"]+)"')
    if ($primaryTokenMatch.Success) { $primaryJwt = $primaryTokenMatch.Groups[1].Value }

    $secondaryTokenMatch = [regex]::Match($secondaryLogin.body, '"access_token"\s*:\s*"([^"]+)"')
    if ($secondaryTokenMatch.Success) { $secondaryJwt = $secondaryTokenMatch.Groups[1].Value }

    if ([string]::IsNullOrWhiteSpace($primaryJwt)) { throw "Primary access_token not found." }
    if ([string]::IsNullOrWhiteSpace($secondaryJwt)) { throw "Secondary access_token not found." }

    $primaryTenants = Invoke-Http -Method "GET" -Url ($summary.base_url + "/api/tenants") -Headers (Auth-Headers -Jwt $primaryJwt)
    $secondaryTenants = Invoke-Http -Method "GET" -Url ($summary.base_url + "/api/tenants") -Headers (Auth-Headers -Jwt $secondaryJwt)

    $summary.primary_tenants_status = $primaryTenants.status
    $summary.secondary_tenants_status = $secondaryTenants.status

    Save-Text -Path (Join-Path $RunDir "primary_tenants_raw.txt") -Text $primaryTenants.body
    Save-Text -Path (Join-Path $RunDir "secondary_tenants_raw.txt") -Text $secondaryTenants.body

    if ($primaryTenants.status -ne 200) { throw ("Primary /api/tenants failed with status " + $primaryTenants.status) }
    if ($secondaryTenants.status -ne 200) { throw ("Secondary /api/tenants failed with status " + $secondaryTenants.status) }

    $primaryIds = @(Get-TenantIdsByRegex -JsonText $primaryTenants.body)
    $secondaryIds = @(Get-TenantIdsByRegex -JsonText $secondaryTenants.body)

    if ($primaryIds.Count -lt 1) { throw "Primary tenant list is empty." }
    if ($secondaryIds.Count -lt 1) { throw "Secondary tenant list is empty." }

    $summary.secondary_tenant_id = [string]$secondaryIds[0]

    foreach ($id in $primaryIds) {
        if ([string]$id -ne $summary.secondary_tenant_id) {
            $summary.primary_tenant_id = [string]$id
            break
        }
    }

    if ([string]::IsNullOrWhiteSpace($summary.primary_tenant_id)) {
        throw "Could not resolve a primary tenant different from secondary."
    }

    $summary.created_ticket_title = "Golden path final " + (Get-Date -Format "yyyyMMdd_HHmmss")

    $createBody = @{
        title = $summary.created_ticket_title
        description = "golden path official"
    } | ConvertTo-Json -Compress

    $primaryCreate = Invoke-Http -Method "POST" -Url ($summary.base_url + "/api/tickets") -Headers (Auth-Headers -Jwt $primaryJwt -TenantId $summary.primary_tenant_id) -Body $createBody
    $summary.primary_create_status = $primaryCreate.status
    Save-Text -Path (Join-Path $RunDir "primary_create_ticket.json") -Text ($primaryCreate | ConvertTo-Json -Depth 20)

    if ($primaryCreate.status -ne 201) {
        throw ("Primary POST /api/tickets failed with status " + $primaryCreate.status)
    }

    $ticketIdMatch = [regex]::Match($primaryCreate.body, '"id"\s*:\s*"([0-9a-fA-F-]{36})"')
    if ($ticketIdMatch.Success) {
        $summary.created_ticket_id = $ticketIdMatch.Groups[1].Value
    }

    Start-Sleep -Seconds 2

    $primaryGet = Invoke-Http -Method "GET" -Url ($summary.base_url + "/api/tickets") -Headers (Auth-Headers -Jwt $primaryJwt -TenantId $summary.primary_tenant_id)
    $summary.primary_get_status = $primaryGet.status
    Save-Text -Path (Join-Path $RunDir "primary_get_after.json") -Text ($primaryGet | ConvertTo-Json -Depth 20)

    if ($primaryGet.status -ne 200) {
        throw ("Primary GET /api/tickets failed with status " + $primaryGet.status)
    }

    if ($primaryGet.body.Contains($summary.created_ticket_title)) {
        $summary.primary_sees_created_ticket = $true
    } else {
        throw "Primary ticket list did not contain the created ticket."
    }

    $secondaryOwnGet = Invoke-Http -Method "GET" -Url ($summary.base_url + "/api/tickets") -Headers (Auth-Headers -Jwt $secondaryJwt -TenantId $summary.secondary_tenant_id)
    $summary.secondary_own_get_status = $secondaryOwnGet.status
    Save-Text -Path (Join-Path $RunDir "secondary_own_get.json") -Text ($secondaryOwnGet | ConvertTo-Json -Depth 20)

    if ($secondaryOwnGet.status -ne 200) {
        throw ("Secondary own GET /api/tickets failed with status " + $secondaryOwnGet.status)
    }

    if ($secondaryOwnGet.body.Contains($summary.created_ticket_title)) {
        $summary.secondary_own_list_sees_primary_ticket = $true
        throw "Secondary own tenant list leaked the primary ticket."
    }

    $secondaryCrossGet = Invoke-Http -Method "GET" -Url ($summary.base_url + "/api/tickets") -Headers (Auth-Headers -Jwt $secondaryJwt -TenantId $summary.primary_tenant_id)
    $summary.secondary_cross_get_status = $secondaryCrossGet.status
    $summary.secondary_cross_get_denied = ($secondaryCrossGet.status -eq 403)
    Save-Text -Path (Join-Path $RunDir "secondary_cross_get_primary_tenant.json") -Text ($secondaryCrossGet | ConvertTo-Json -Depth 20)

    if (-not $summary.secondary_cross_get_denied) {
        throw ("Secondary cross GET expected 403 but got " + $secondaryCrossGet.status)
    }

    $secondaryCrossPostBody = @{
        title = "Should not create"
        description = "cross tenant write denied"
    } | ConvertTo-Json -Compress

    $secondaryCrossPost = Invoke-Http -Method "POST" -Url ($summary.base_url + "/api/tickets") -Headers (Auth-Headers -Jwt $secondaryJwt -TenantId $summary.primary_tenant_id) -Body $secondaryCrossPostBody
    $summary.secondary_cross_post_status = $secondaryCrossPost.status
    $summary.secondary_cross_post_denied = ($secondaryCrossPost.status -eq 403)
    Save-Text -Path (Join-Path $RunDir "secondary_cross_post_primary_tenant.json") -Text ($secondaryCrossPost | ConvertTo-Json -Depth 20)

    if (-not $summary.secondary_cross_post_denied) {
        throw ("Secondary cross POST expected 403 but got " + $secondaryCrossPost.status)
    }

    $summary.overall = "PASS"
    $summary.fail_reason = ""
}
catch {
    $summary.overall = "FAIL"
    $summary.fail_reason = $_.Exception.Message
    Write-Host ("[ERROR] " + $_.Exception.Message)
}

$summaryJson = $summary | ConvertTo-Json -Depth 20
Save-Text -Path $SummaryJsonPath -Text $summaryJson

$paste = @()
$paste += ("OVERALL=" + $summary.overall)
$paste += ("FAIL_REASON=" + $summary.fail_reason)
$paste += ("RUN_DIR=" + $summary.run_dir)
$paste += ("BASE_URL=" + $summary.base_url)
$paste += ("PRIMARY_TENANT_ID=" + $summary.primary_tenant_id)
$paste += ("SECONDARY_TENANT_ID=" + $summary.secondary_tenant_id)
$paste += ("CREATED_TICKET_ID=" + $summary.created_ticket_id)
$paste += ("CREATED_TICKET_TITLE=" + $summary.created_ticket_title)
$paste += ("PRIMARY_LOGIN_STATUS=" + $summary.primary_login_status)
$paste += ("SECONDARY_LOGIN_STATUS=" + $summary.secondary_login_status)
$paste += ("PRIMARY_TENANTS_STATUS=" + $summary.primary_tenants_status)
$paste += ("SECONDARY_TENANTS_STATUS=" + $summary.secondary_tenants_status)
$paste += ("PRIMARY_CREATE_STATUS=" + $summary.primary_create_status)
$paste += ("PRIMARY_GET_STATUS=" + $summary.primary_get_status)
$paste += ("SECONDARY_OWN_GET_STATUS=" + $summary.secondary_own_get_status)
$paste += ("SECONDARY_CROSS_GET_STATUS=" + $summary.secondary_cross_get_status)
$paste += ("SECONDARY_CROSS_POST_STATUS=" + $summary.secondary_cross_post_status)
$paste += ("PRIMARY_SEES_CREATED_TICKET=" + $summary.primary_sees_created_ticket)
$paste += ("SECONDARY_OWN_LIST_SEES_PRIMARY_TICKET=" + $summary.secondary_own_list_sees_primary_ticket)
$paste += ("SECONDARY_CROSS_GET_DENIED=" + $summary.secondary_cross_get_denied)
$paste += ("SECONDARY_CROSS_POST_DENIED=" + $summary.secondary_cross_post_denied)

Save-Text -Path $PasteMePath -Text ($paste -join [Environment]::NewLine)

Write-Host ""
Write-Host $summary.overall
Write-Host ("SUMMARY_JSON=" + $SummaryJsonPath)
Write-Host ("PASTE_ME=" + $PasteMePath)
Write-Host ""
Write-Host "Artifacts:"
Write-Host ("- " + $SummaryJsonPath)
Write-Host ("- " + $PasteMePath)

Read-Host "Cole aqui o PASS ou FAIL final e o PASTE_ME.txt. Pressione Enter para continuar"