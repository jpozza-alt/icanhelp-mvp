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
    $json = $Object | ConvertTo-Json -Depth 50
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

function Convert-JsonSafe {
    param([string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return $null
    }

    try {
        return ($Text | ConvertFrom-Json -Depth 100)
    }
    catch {
        return $null
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
                $responseObj.json = $responseObj.body_text | ConvertFrom-Json -Depth 100
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

            try {
                foreach ($k in $ex.Response.Headers.Keys) {
                    $responseObj.headers[$k] = [string]$ex.Response.Headers[$k]
                }
            }
            catch { }

            if (-not [string]::IsNullOrWhiteSpace($responseObj.body_text)) {
                try {
                    $responseObj.json = $responseObj.body_text | ConvertFrom-Json -Depth 100
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
        $h["x-icanhelp-tenant"] = $TenantId
    }

    return $h
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

function Ticket-ListContains {
    param(
        [object]$Json,
        [string]$TicketId,
        [string]$Title
    )

    if ($null -eq $Json) {
        return $false
    }

    $items = @()

    if ($Json -is [System.Array]) {
        $items = @($Json)
    }
    elseif ($Json.PSObject.Properties.Name -contains "tickets") {
        $items = @($Json.tickets)
    }

    foreach ($item in $items) {
        if ($null -eq $item) { continue }

        $idValue = ""
        $titleValue = ""

        if ($item.PSObject.Properties.Name -contains "id") {
            $idValue = [string]$item.id
        }
        if ($item.PSObject.Properties.Name -contains "title") {
            $titleValue = [string]$item.title
        }

        if ((-not [string]::IsNullOrWhiteSpace($TicketId)) -and ($idValue -eq $TicketId)) {
            return $true
        }

        if ((-not [string]::IsNullOrWhiteSpace($Title)) -and ($titleValue -eq $Title)) {
            return $true
        }
    }

    return $false
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$RepoRoot = "C:\icanhelp-mvp"
$ScriptsDir = Join-Path $RepoRoot "scripts"
$PrimaryJwtPath = Join-Path $ScriptsDir ".jwt_last.txt"
$SecondaryJwtPath = Join-Path $ScriptsDir ".jwt_secondary_last.txt"

$BaseUrl = "https://icanhelp-mvp.vercel.app"
$RunDir = Join-Path $RepoRoot ("_debug\cross_tenant_ticket_isolation_regex_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
Ensure-Dir -Path $RunDir

$summaryJsonPath = Join-Path $RunDir "SUMMARY.json"
$pasteMePath = Join-Path $RunDir "PASTE_ME.txt"

$primaryTenantsRawPath = Join-Path $RunDir "primary_tenants_raw.txt"
$secondaryTenantsRawPath = Join-Path $RunDir "secondary_tenants_raw.txt"
$primaryCreatePath = Join-Path $RunDir "primary_create_ticket.json"
$primaryGetPath = Join-Path $RunDir "primary_get_after.json"
$secondaryOwnGetPath = Join-Path $RunDir "secondary_own_get.json"
$secondaryCrossGetPath = Join-Path $RunDir "secondary_cross_get_primary_tenant.json"
$secondaryCrossPostPath = Join-Path $RunDir "secondary_cross_post_primary_tenant.json"

$summary = [ordered]@{
    run_dir = $RunDir
    repo_root = $RepoRoot
    base_url = $BaseUrl
    primary_jwt_path = $PrimaryJwtPath
    secondary_jwt_path = $SecondaryJwtPath
    primary_tenant_ids = @()
    secondary_tenant_ids = @()
    primary_tenant_id = $null
    secondary_tenant_id = $null
    created_ticket_id = $null
    created_ticket_title = $null
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
    fail_reason = $null
}

try {
    $primaryJwt = Ensure-FileHasContent -Path $PrimaryJwtPath -Label "PRIMARY JWT"
    $secondaryJwt = Ensure-FileHasContent -Path $SecondaryJwtPath -Label "SECONDARY JWT"

    $primarySession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $secondarySession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

    Write-Log "Listing tenants for PRIMARY..."
    $primaryTenantsResp = Invoke-Http -Method "GET" -Url ($BaseUrl.TrimEnd("/") + "/api/tenants") -Headers (Get-AuthHeaders -Jwt $primaryJwt -TenantId $null) -Body $null -Session $primarySession -TimeoutSec 60
    Save-Text -Path $primaryTenantsRawPath -Text $primaryTenantsResp.body_text
    Save-Json -Path (Join-Path $RunDir "primary_tenants_response.json") -Object $primaryTenantsResp
    $summary.primary_tenants_status = $primaryTenantsResp.status

    if ($primaryTenantsResp.status -ne 200) {
        throw ("Primary /api/tenants failed with status " + $primaryTenantsResp.status)
    }

    Write-Log "Listing tenants for SECONDARY..."
    $secondaryTenantsResp = Invoke-Http -Method "GET" -Url ($BaseUrl.TrimEnd("/") + "/api/tenants") -Headers (Get-AuthHeaders -Jwt $secondaryJwt -TenantId $null) -Body $null -Session $secondarySession -TimeoutSec 60
    Save-Text -Path $secondaryTenantsRawPath -Text $secondaryTenantsResp.body_text
    Save-Json -Path (Join-Path $RunDir "secondary_tenants_response.json") -Object $secondaryTenantsResp
    $summary.secondary_tenants_status = $secondaryTenantsResp.status

    if ($secondaryTenantsResp.status -ne 200) {
        throw ("Secondary /api/tenants failed with status " + $secondaryTenantsResp.status)
    }

    $primaryTenantIds = @(Get-TenantIdsByRegex -JsonText $primaryTenantsResp.body_text)
    $secondaryTenantIds = @(Get-TenantIdsByRegex -JsonText $secondaryTenantsResp.body_text)

    $summary.primary_tenant_ids = $primaryTenantIds
    $summary.secondary_tenant_ids = $secondaryTenantIds

    if ($primaryTenantIds.Count -lt 1) {
        throw "PRIMARY tenant list is empty."
    }
    if ($secondaryTenantIds.Count -lt 1) {
        throw "SECONDARY tenant list is empty."
    }

    $secondaryTenantId = [string]$secondaryTenantIds[0]
    $primaryTenantId = $null

    foreach ($candidate in $primaryTenantIds) {
        if ([string]$candidate -ne $secondaryTenantId) {
            $primaryTenantId = [string]$candidate
            break
        }
    }

    if ([string]::IsNullOrWhiteSpace($primaryTenantId)) {
        throw "Could not resolve a PRIMARY tenant different from SECONDARY tenant."
    }

    $summary.primary_tenant_id = $primaryTenantId
    $summary.secondary_tenant_id = $secondaryTenantId

    $ticketTitle = "Cross tenant probe " + (Get-Date -Format "yyyyMMdd_HHmmss")
    $summary.created_ticket_title = $ticketTitle

    Write-Log ("Creating ticket in PRIMARY tenant " + $primaryTenantId + " ...")
    $createBody = @{
        title = $ticketTitle
        description = "cross tenant isolation regex"
    } | ConvertTo-Json -Compress

    $primaryCreateResp = Invoke-Http -Method "POST" -Url ($BaseUrl.TrimEnd("/") + "/api/tickets") -Headers (Get-AuthHeaders -Jwt $primaryJwt -TenantId $primaryTenantId) -Body $createBody -Session $primarySession -TimeoutSec 60
    Save-Json -Path $primaryCreatePath -Object $primaryCreateResp
    $summary.primary_create_status = $primaryCreateResp.status

    if ($primaryCreateResp.status -ne 201) {
        throw ("Primary ticket create failed with status " + $primaryCreateResp.status)
    }

    $primaryCreateJson = Convert-JsonSafe -Text $primaryCreateResp.body_text
    $createdTicketId = $null
    if ($null -ne $primaryCreateJson -and ($primaryCreateJson.PSObject.Properties.Name -contains "ticket")) {
        if ($null -ne $primaryCreateJson.ticket -and ($primaryCreateJson.ticket.PSObject.Properties.Name -contains "id")) {
            $createdTicketId = [string]$primaryCreateJson.ticket.id
        }
    }

    $summary.created_ticket_id = $createdTicketId

    Write-Log "Reading PRIMARY tenant ticket list..."
    $primaryGetResp = Invoke-Http -Method "GET" -Url ($BaseUrl.TrimEnd("/") + "/api/tickets") -Headers (Get-AuthHeaders -Jwt $primaryJwt -TenantId $primaryTenantId) -Body $null -Session $primarySession -TimeoutSec 60
    Save-Json -Path $primaryGetPath -Object $primaryGetResp
    $summary.primary_get_status = $primaryGetResp.status

    if ($primaryGetResp.status -ne 200) {
        throw ("Primary GET /api/tickets failed with status " + $primaryGetResp.status)
    }

    $primaryGetJson = Convert-JsonSafe -Text $primaryGetResp.body_text
    $summary.primary_sees_created_ticket = Ticket-ListContains -Json $primaryGetJson -TicketId $createdTicketId -Title $ticketTitle

    if (-not $summary.primary_sees_created_ticket) {
        throw "Primary ticket list did not contain the created ticket."
    }

    Write-Log "Reading SECONDARY own tenant ticket list..."
    $secondaryOwnGetResp = Invoke-Http -Method "GET" -Url ($BaseUrl.TrimEnd("/") + "/api/tickets") -Headers (Get-AuthHeaders -Jwt $secondaryJwt -TenantId $secondaryTenantId) -Body $null -Session $secondarySession -TimeoutSec 60
    Save-Json -Path $secondaryOwnGetPath -Object $secondaryOwnGetResp
    $summary.secondary_own_get_status = $secondaryOwnGetResp.status

    if ($secondaryOwnGetResp.status -ne 200) {
        throw ("Secondary own GET /api/tickets failed with status " + $secondaryOwnGetResp.status)
    }

    $secondaryOwnGetJson = Convert-JsonSafe -Text $secondaryOwnGetResp.body_text
    $summary.secondary_own_list_sees_primary_ticket = Ticket-ListContains -Json $secondaryOwnGetJson -TicketId $createdTicketId -Title $ticketTitle

    if ($summary.secondary_own_list_sees_primary_ticket) {
        throw "Secondary own tenant list leaked the primary ticket."
    }

    Write-Log "Attempting cross-tenant GET with SECONDARY token on PRIMARY tenant..."
    $secondaryCrossGetResp = Invoke-Http -Method "GET" -Url ($BaseUrl.TrimEnd("/") + "/api/tickets") -Headers (Get-AuthHeaders -Jwt $secondaryJwt -TenantId $primaryTenantId) -Body $null -Session $secondarySession -TimeoutSec 60
    Save-Json -Path $secondaryCrossGetPath -Object $secondaryCrossGetResp
    $summary.secondary_cross_get_status = $secondaryCrossGetResp.status
    $summary.secondary_cross_get_denied = ($secondaryCrossGetResp.status -eq 403)

    if (-not $summary.secondary_cross_get_denied) {
        throw ("Secondary cross-tenant GET expected 403 but got " + $secondaryCrossGetResp.status)
    }

    Write-Log "Attempting cross-tenant POST with SECONDARY token on PRIMARY tenant..."
    $secondaryCrossPostBody = @{
        title = "Should not create"
        description = "cross tenant write should be denied"
    } | ConvertTo-Json -Compress

    $secondaryCrossPostResp = Invoke-Http -Method "POST" -Url ($BaseUrl.TrimEnd("/") + "/api/tickets") -Headers (Get-AuthHeaders -Jwt $secondaryJwt -TenantId $primaryTenantId) -Body $secondaryCrossPostBody -Session $secondarySession -TimeoutSec 60
    Save-Json -Path $secondaryCrossPostPath -Object $secondaryCrossPostResp
    $summary.secondary_cross_post_status = $secondaryCrossPostResp.status
    $summary.secondary_cross_post_denied = ($secondaryCrossPostResp.status -eq 403)

    if (-not $summary.secondary_cross_post_denied) {
        throw ("Secondary cross-tenant POST expected 403 but got " + $secondaryCrossPostResp.status)
    }

    $summary.overall = "PASS"
    $summary.fail_reason = ""
}
catch {
    $summary.overall = "FAIL"
    $summary.fail_reason = $_.Exception.Message
    Write-Log -Level "ERROR" -Message $_.Exception.Message
}
finally {
    Save-Json -Path $summaryJsonPath -Object $summary

    $reportLines = @()
    $reportLines += ("OVERALL=" + $summary.overall)
    $reportLines += ("FAIL_REASON=" + $summary.fail_reason)
    $reportLines += ("RUN_DIR=" + $summary.run_dir)
    $reportLines += ("BASE_URL=" + $summary.base_url)
    $reportLines += ("PRIMARY_TENANT_ID=" + $summary.primary_tenant_id)
    $reportLines += ("SECONDARY_TENANT_ID=" + $summary.secondary_tenant_id)
    $reportLines += ("CREATED_TICKET_ID=" + $summary.created_ticket_id)
    $reportLines += ("CREATED_TICKET_TITLE=" + $summary.created_ticket_title)
    $reportLines += ("PRIMARY_TENANTS_STATUS=" + $summary.primary_tenants_status)
    $reportLines += ("SECONDARY_TENANTS_STATUS=" + $summary.secondary_tenants_status)
    $reportLines += ("PRIMARY_CREATE_STATUS=" + $summary.primary_create_status)
    $reportLines += ("PRIMARY_GET_STATUS=" + $summary.primary_get_status)
    $reportLines += ("SECONDARY_OWN_GET_STATUS=" + $summary.secondary_own_get_status)
    $reportLines += ("SECONDARY_CROSS_GET_STATUS=" + $summary.secondary_cross_get_status)
    $reportLines += ("SECONDARY_CROSS_POST_STATUS=" + $summary.secondary_cross_post_status)
    $reportLines += ("PRIMARY_SEES_CREATED_TICKET=" + $summary.primary_sees_created_ticket)
    $reportLines += ("SECONDARY_OWN_LIST_SEES_PRIMARY_TICKET=" + $summary.secondary_own_list_sees_primary_ticket)
    $reportLines += ("SECONDARY_CROSS_GET_DENIED=" + $summary.secondary_cross_get_denied)
    $reportLines += ("SECONDARY_CROSS_POST_DENIED=" + $summary.secondary_cross_post_denied)

    Save-Text -Path $pasteMePath -Text ($reportLines -join [Environment]::NewLine)

    Write-Host ""
    Write-Host $summary.overall
    Write-Host ("SUMMARY_JSON=" + $summaryJsonPath)
    Write-Host ("PASTE_ME=" + $pasteMePath)
    Write-Host ""
    Write-Host "Artifacts:"
    Write-Host ("- " + $summaryJsonPath)
    Write-Host ("- " + $pasteMePath)
    Write-Host ("- " + $primaryTenantsRawPath)
    Write-Host ("- " + $secondaryTenantsRawPath)
    Write-Host ("- " + $primaryCreatePath)
    Write-Host ("- " + $primaryGetPath)
    Write-Host ("- " + $secondaryOwnGetPath)
    Write-Host ("- " + $secondaryCrossGetPath)
    Write-Host ("- " + $secondaryCrossPostPath)
}