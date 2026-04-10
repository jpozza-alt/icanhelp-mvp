$ErrorActionPreference = "Stop"

function New-DirectorySafe {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Save-TextFile {
    param(
        [string]$Path,
        [string]$Content
    )
    $dir = Split-Path -Parent $Path
    if ($dir) {
        New-DirectorySafe -Path $dir
    }
    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.Encoding]::UTF8)
}

function Clean-Value {
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

    return $v
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

    try {
        $params = @{
            Method      = $Method
            Uri         = $Url
            Headers     = $Headers
            TimeoutSec  = $TimeoutSec
            ErrorAction = "Stop"
        }

        if ($null -ne $Session) {
            $params["WebSession"] = $Session
        }

        if (-not [string]::IsNullOrWhiteSpace($Body)) {
            $params["Body"] = $Body
            if (-not $Headers.ContainsKey("Content-Type")) {
                $params["ContentType"] = "application/json"
            }
        }

        $response = Invoke-WebRequest @params
        return [pscustomobject]@{
            Success    = $true
            StatusCode = [int]$response.StatusCode
            Body       = [string]$response.Content
            Headers    = $response.Headers
            ErrorText  = ""
        }
    }
    catch {
        $statusCode = -1
        $bodyText = ""
        $errorText = $_.Exception.Message
        $respHeaders = @{}

        if ($_.Exception.Response -ne $null) {
            $resp = $_.Exception.Response
            try {
                $statusCode = [int]$resp.StatusCode
            }
            catch {
                $statusCode = -1
            }

            try {
                $stream = $resp.GetResponseStream()
                if ($stream -ne $null) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $bodyText = $reader.ReadToEnd()
                    $reader.Close()
                }
            }
            catch {
            }

            try {
                $respHeaders = $resp.Headers
            }
            catch {
            }
        }

        return [pscustomobject]@{
            Success    = $false
            StatusCode = $statusCode
            Body       = [string]$bodyText
            Headers    = $respHeaders
            ErrorText  = [string]$errorText
        }
    }
}

function Convert-JsonSafe {
    param([string]$Text)
    try {
        if ([string]::IsNullOrWhiteSpace($Text)) {
            return $null
        }
        return ($Text | ConvertFrom-Json -Depth 100)
    }
    catch {
        return $null
    }
}

function Get-TenantResult {
    param([string]$JsonText)

    $result = [ordered]@{
        Count = 0
        FirstTenantId = ""
        Strategy = "none"
    }

    if ([string]::IsNullOrWhiteSpace($JsonText)) {
        return [pscustomobject]$result
    }

    $trim = $JsonText.Trim()
    if ($trim -eq "[]") {
        $result["Strategy"] = "empty_array"
        return [pscustomobject]$result
    }

    $tenantMatches = [regex]::Matches($trim, '"tenant_id"\s*:\s*"([^"]+)"')
    if ($tenantMatches.Count -gt 0) {
        $result["Count"] = $tenantMatches.Count
        $result["FirstTenantId"] = $tenantMatches[0].Groups[1].Value
        $result["Strategy"] = "regex_tenant_id"
        return [pscustomobject]$result
    }

    $idMatches = [regex]::Matches($trim, '"id"\s*:\s*"([^"]+)"')
    if ($trim.StartsWith("[") -and $idMatches.Count -gt 0) {
        $result["Count"] = $idMatches.Count
        $result["FirstTenantId"] = $idMatches[0].Groups[1].Value
        $result["Strategy"] = "regex_id_array"
        return [pscustomobject]$result
    }

    $obj = Convert-JsonSafe $trim
    if ($null -eq $obj) {
        $result["Strategy"] = "json_parse_failed"
        return [pscustomobject]$result
    }

    if ($obj -is [System.Array]) {
        $result["Count"] = $obj.Count
        if ($obj.Count -ge 1) {
            if ($obj[0].PSObject.Properties.Name -contains "tenant_id") {
                $result["FirstTenantId"] = [string]$obj[0].tenant_id
            }
            elseif ($obj[0].PSObject.Properties.Name -contains "id") {
                $result["FirstTenantId"] = [string]$obj[0].id
            }
        }
        $result["Strategy"] = "json_array"
        return [pscustomobject]$result
    }

    if ($obj.PSObject.Properties.Name -contains "tenant_id" -or $obj.PSObject.Properties.Name -contains "id") {
        $result["Count"] = 1
        if ($obj.PSObject.Properties.Name -contains "tenant_id") {
            $result["FirstTenantId"] = [string]$obj.tenant_id
        }
        elseif ($obj.PSObject.Properties.Name -contains "id") {
            $result["FirstTenantId"] = [string]$obj.id
        }
        $result["Strategy"] = "json_single_object"
        return [pscustomobject]$result
    }

    if ($obj.PSObject.Properties.Name -contains "tenants" -and $null -ne $obj.tenants) {
        if ($obj.tenants -is [System.Array]) {
            $result["Count"] = $obj.tenants.Count
            if ($obj.tenants.Count -ge 1) {
                if ($obj.tenants[0].PSObject.Properties.Name -contains "tenant_id") {
                    $result["FirstTenantId"] = [string]$obj.tenants[0].tenant_id
                }
                elseif ($obj.tenants[0].PSObject.Properties.Name -contains "id") {
                    $result["FirstTenantId"] = [string]$obj.tenants[0].id
                }
            }
        }
        else {
            $result["Count"] = 1
            if ($obj.tenants.PSObject.Properties.Name -contains "tenant_id") {
                $result["FirstTenantId"] = [string]$obj.tenants.tenant_id
            }
            elseif ($obj.tenants.PSObject.Properties.Name -contains "id") {
                $result["FirstTenantId"] = [string]$obj.tenants.id
            }
        }
        $result["Strategy"] = "json_tenants_property"
        return [pscustomobject]$result
    }

    if ($obj.PSObject.Properties.Name -contains "data" -and $null -ne $obj.data) {
        if ($obj.data -is [System.Array]) {
            $result["Count"] = $obj.data.Count
            if ($obj.data.Count -ge 1) {
                if ($obj.data[0].PSObject.Properties.Name -contains "tenant_id") {
                    $result["FirstTenantId"] = [string]$obj.data[0].tenant_id
                }
                elseif ($obj.data[0].PSObject.Properties.Name -contains "id") {
                    $result["FirstTenantId"] = [string]$obj.data[0].id
                }
            }
        }
        else {
            $result["Count"] = 1
            if ($obj.data.PSObject.Properties.Name -contains "tenant_id") {
                $result["FirstTenantId"] = [string]$obj.data.tenant_id
            }
            elseif ($obj.data.PSObject.Properties.Name -contains "id") {
                $result["FirstTenantId"] = [string]$obj.data.id
            }
        }
        $result["Strategy"] = "json_data_property"
        return [pscustomobject]$result
    }

    $result["Strategy"] = "no_supported_shape"
    return [pscustomobject]$result
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$RepoRoot = "C:\icanhelp-mvp"
$AppBaseUrl = "https://icanhelp-mvp.vercel.app"
$JwtPath = Join-Path $RepoRoot "scripts\.jwt_secondary_last.txt"

$RunDir = Join-Path $RepoRoot ("_debug\remote_app_probe_final_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
$RawDir = Join-Path $RunDir "raw"
$SummaryPath = Join-Path $RunDir "summary.txt"
$WhoAmIPath = Join-Path $RawDir "auth_whoami.body.json"
$TenantsPath = Join-Path $RawDir "tenants.body.json"
$TenantActivePath = Join-Path $RawDir "tenant_active.body.json"
$ContextPath = Join-Path $RawDir "context.body.json"
$HeadersPath = Join-Path $RawDir "response_headers.txt"

New-DirectorySafe -Path $RunDir
New-DirectorySafe -Path $RawDir

$summary = [ordered]@{}
$summary["RUN_DIR"] = $RunDir
$summary["REPO_ROOT"] = $RepoRoot
$summary["MODE"] = "REMOTE_APP_PROBE_FINAL_V2"
$summary["APP_BASE_URL"] = $AppBaseUrl
$summary["JWT_PATH"] = $JwtPath

try {
    Write-Host ""
    Write-Host "[STEP] Loading saved JWT"

    if (-not (Test-Path -LiteralPath $JwtPath)) {
        $summary["OVERALL"] = "FAIL"
        $summary["FAIL_REASON"] = "JWT_FILE_NOT_FOUND"
        Save-TextFile -Path $SummaryPath -Content (($summary.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join [Environment]::NewLine)
        Write-Host "FAIL"
        Write-Host ("SUMMARY_PATH=" + $SummaryPath)
        Read-Host "Pressione Enter para continuar"
        return
    }

    $AccessToken = Clean-Value (Get-Content -LiteralPath $JwtPath -Raw)
    $summary["JWT_LENGTH"] = $AccessToken.Length

    if ([string]::IsNullOrWhiteSpace($AccessToken)) {
        $summary["OVERALL"] = "FAIL"
        $summary["FAIL_REASON"] = "JWT_EMPTY"
        Save-TextFile -Path $SummaryPath -Content (($summary.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join [Environment]::NewLine)
        Write-Host "FAIL"
        Write-Host ("SUMMARY_PATH=" + $SummaryPath)
        Read-Host "Pressione Enter para continuar"
        return
    }

    $apiHeaders = @{
        "Authorization" = "Bearer " + $AccessToken
        "Accept"        = "application/json"
    }

    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

    Write-Host ""
    Write-Host "[STEP] Calling /api/debug/auth-whoami"
    $whoUrl = $AppBaseUrl + "/api/debug/auth-whoami"
    $whoResponse = Invoke-Http -Method "GET" -Url $whoUrl -Headers $apiHeaders -Body "" -Session $session -TimeoutSec 60
    Save-TextFile -Path $WhoAmIPath -Content $whoResponse.Body
    $summary["WHOAMI_STATUS_CODE"] = $whoResponse.StatusCode
    $summary["WHOAMI_BODY_PATH"] = $WhoAmIPath

    Write-Host ""
    Write-Host "[STEP] Calling /api/tenants"
    $tenantsUrl = $AppBaseUrl + "/api/tenants"
    $tenantsResponse = Invoke-Http -Method "GET" -Url $tenantsUrl -Headers $apiHeaders -Body "" -Session $session -TimeoutSec 60
    Save-TextFile -Path $TenantsPath -Content $tenantsResponse.Body
    $summary["TENANTS_STATUS_CODE"] = $tenantsResponse.StatusCode
    $summary["TENANTS_BODY_PATH"] = $TenantsPath

    $tenantResult = Get-TenantResult -JsonText $tenantsResponse.Body
    $tenantCount = [int]$tenantResult.Count
    $firstTenantId = [string]$tenantResult.FirstTenantId
    $summary["TENANTS_COUNT"] = $tenantCount
    $summary["FIRST_TENANT_ID"] = $firstTenantId
    $summary["TENANTS_PARSE_STRATEGY"] = [string]$tenantResult.Strategy

    Write-Host ""
    Write-Host "[STEP] Trying /api/tenants/active if tenant exists"
    $tenantActiveStatus = -1
    if (-not [string]::IsNullOrWhiteSpace($firstTenantId)) {
        $tenantActiveUrl = $AppBaseUrl + "/api/tenants/active"
        $candidateBodies = @(
            (@{ tenantId = $firstTenantId } | ConvertTo-Json -Compress),
            (@{ tenant_id = $firstTenantId } | ConvertTo-Json -Compress),
            (@{ id = $firstTenantId } | ConvertTo-Json -Compress)
        )

        foreach ($candidateBody in $candidateBodies) {
            $activeHeaders = @{
                "Authorization" = "Bearer " + $AccessToken
                "Accept"        = "application/json"
                "Content-Type"  = "application/json"
            }

            $tenantActiveResponse = Invoke-Http -Method "POST" -Url $tenantActiveUrl -Headers $activeHeaders -Body $candidateBody -Session $session -TimeoutSec 60
            $tenantActiveStatus = $tenantActiveResponse.StatusCode
            Save-TextFile -Path $TenantActivePath -Content $tenantActiveResponse.Body

            if ($tenantActiveStatus -ge 200 -and $tenantActiveStatus -lt 300) {
                break
            }
        }
    }

    $summary["TENANT_ACTIVE_STATUS_CODE"] = $tenantActiveStatus
    $summary["TENANT_ACTIVE_BODY_PATH"] = $TenantActivePath

    Write-Host ""
    Write-Host "[STEP] Calling /api/debug/context"
    $contextUrl = $AppBaseUrl + "/api/debug/context"
    $contextResponse = Invoke-Http -Method "GET" -Url $contextUrl -Headers $apiHeaders -Body "" -Session $session -TimeoutSec 60
    Save-TextFile -Path $ContextPath -Content $contextResponse.Body
    $summary["CONTEXT_STATUS_CODE"] = $contextResponse.StatusCode
    $summary["CONTEXT_BODY_PATH"] = $ContextPath

    $headerText = @()
    $headerText += "WHOAMI_HEADERS"
    if ($whoResponse.Headers -ne $null) {
        foreach ($key in $whoResponse.Headers.Keys) {
            $headerText += ($key + "=" + ($whoResponse.Headers[$key] -join "; "))
        }
    }
    $headerText += ""
    $headerText += "TENANTS_HEADERS"
    if ($tenantsResponse.Headers -ne $null) {
        foreach ($key in $tenantsResponse.Headers.Keys) {
            $headerText += ($key + "=" + ($tenantsResponse.Headers[$key] -join "; "))
        }
    }
    $headerText += ""
    $headerText += "CONTEXT_HEADERS"
    if ($contextResponse.Headers -ne $null) {
        foreach ($key in $contextResponse.Headers.Keys) {
            $headerText += ($key + "=" + ($contextResponse.Headers[$key] -join "; "))
        }
    }
    Save-TextFile -Path $HeadersPath -Content ($headerText -join [Environment]::NewLine)
    $summary["HEADERS_PATH"] = $HeadersPath

    $allPass =
        ($whoResponse.StatusCode -eq 200) -and
        ($tenantsResponse.StatusCode -eq 200) -and
        ($contextResponse.StatusCode -eq 200) -and
        ($tenantCount -ge 1)

    if ($allPass) {
        $summary["OVERALL"] = "PASS"
        $summary["FAIL_REASON"] = ""
    }
    else {
        $summary["OVERALL"] = "FAIL"
        $reasons = @()
        if ($whoResponse.StatusCode -ne 200) { $reasons += "WHOAMI_NOT_200" }
        if ($tenantsResponse.StatusCode -ne 200) { $reasons += "TENANTS_NOT_200" }
        if ($contextResponse.StatusCode -ne 200) { $reasons += "CONTEXT_NOT_200" }
        if ($tenantCount -lt 1) { $reasons += "TENANTS_COUNT_LT_1" }
        $summary["FAIL_REASON"] = ($reasons -join ",")
    }

    Save-TextFile -Path $SummaryPath -Content (($summary.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join [Environment]::NewLine)

    Write-Host ""
    Write-Host $summary["OVERALL"]
    Write-Host ("SUMMARY_PATH=" + $SummaryPath)
    Get-Content -LiteralPath $SummaryPath

    Read-Host "Cole aqui o PASS ou FAIL e o summary. Pressione Enter para continuar"
}
catch {
    $summary["OVERALL"] = "FAIL"
    $summary["FAIL_REASON"] = "UNHANDLED_ERROR"
    $summary["UNHANDLED_ERROR"] = $_.Exception.Message
    Save-TextFile -Path $SummaryPath -Content (($summary.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join [Environment]::NewLine)

    Write-Host ""
    Write-Host "FAIL"
    Write-Host ("SUMMARY_PATH=" + $SummaryPath)
    Get-Content -LiteralPath $SummaryPath

    Read-Host "Cole aqui tudo. Pressione Enter para continuar"
}