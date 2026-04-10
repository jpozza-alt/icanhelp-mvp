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

function Ensure-FileHasContent {
    param(
        [string]$Path,
        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw ($Label + " not found: " + $Path)
    }

    $content = (Get-Content -LiteralPath $Path -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($content)) {
        throw ($Label + " is empty: " + $Path)
    }

    return $content
}

function Get-FileText {
    param([string]$Path)

    if (Test-Path -LiteralPath $Path) {
        return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    }

    return ""
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
            foreach ($prop in @("tenants","data","items","result")) {
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
$runDir = Join-Path $DebugRoot ("cross_tenant_ticket_isolation_v2_" + $runStamp)

Ensure-Dir -Path $ScriptsDir
Ensure-Dir -Path $DebugRoot
Ensure-Dir -Path $runDir

$summary = [ordered]@{
    status = "FAIL"
    started_at = (Get-Date).ToString("o")
    repo_root = $RepoRoot
    run_dir = $runDir
    base_url = $null
    app_bootstrap = $null
    primary_tenant_ids = @()
    secondary_tenant_ids = @()
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
    $baseUrlInput = Read-Host "Base URL [enter para http://localhost:3000]"
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

    $primaryJwt = Ensure-FileHasContent -Path (Join-Path $ScriptsDir ".jwt_last.txt") -Label "PRIMARY JWT"
    $secondaryJwt = Ensure-FileHasContent -Path (Join-Path $ScriptsDir ".jwt_secondary_last.txt") -Label "SECONDARY JWT"

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
        throw "Primary tenant list is empty after robust extraction."
    }

    if (-not $summary.pass_conditions.secondary_tenants_found) {
        throw "Secondary tenant list is empty after robust extraction."
    }

    $primaryTenantId = [string]$primaryTenantIds[0]
    $secondaryTenantId = [string]$secondaryTenantIds[0]

    if ($primaryTenantId -ne $secondaryTenantId) {
        $summary.pass_conditions.distinct_tenants = $true
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

    Write-Log "Listing tickets in SECONDARY tenant..."
    $secondaryGet = Invoke-Http -Method "GET" -Url ($BaseUrl.TrimEnd("/") + "/api/tickets") -Headers (Get-AuthHeaders -Jwt $secondaryJwt -TenantId $secondaryTenantId) -Body $null -Session $secondarySession
    $summary.secondary_get = $secondaryGet
    Save-Json -Path (Join-Path $runDir "secondary_get.json") -Object $secondaryGet
    Save-Text -Path (Join-Path $runDir "secondary_get_raw.txt") -Text $secondaryGet.body_text

    if (($secondaryGet.status -ge 200) -and ($secondaryGet.status -lt 300) -and (-not (ResponseContainsMarker -Text $secondaryGet.body_text -Marker $marker))) {
        $summary.pass_conditions.secondary_cannot_see_primary_ticket = $true
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

    $reportLines = @()
    $reportLines += ("STATUS=" + $summary.status)
    $reportLines += ("RUN_DIR=" + $runDir)
    $reportLines += ("PRIMARY_TENANT_IDS=" + (@($summary.primary_tenant_ids) -join ","))
    $reportLines += ("SECONDARY_TENANT_IDS=" + (@($summary.secondary_tenant_ids) -join ","))
    foreach ($k in $summary.pass_conditions.Keys) {
        $reportLines += ($k.ToUpper() + "=" + [string]$summary.pass_conditions[$k])
    }

    Save-Text -Path (Join-Path $runDir "PASTE_ME.txt") -Text ($reportLines -join [Environment]::NewLine)

    Write-Host ""
    Write-Host "Artifacts:"
    Write-Host ("- " + (Join-Path $runDir "SUMMARY.json"))
    Write-Host ("- " + (Join-Path $runDir "PASTE_ME.txt"))
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