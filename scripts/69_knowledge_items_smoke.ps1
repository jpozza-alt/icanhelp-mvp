param()

$ErrorActionPreference = "Stop"

function New-RunDir {
    param([string]$RepoRoot)
    $debugRoot = Join-Path $RepoRoot "_debug"
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $dir = Join-Path $debugRoot ("knowledge_items_smoke_" + $stamp)
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    return $dir
}

function Save-Text {
    param(
        [string]$Path,
        [string]$Value
    )
    Set-Content -LiteralPath $Path -Value $Value -Encoding UTF8
}

function Read-OptionalText {
    param(
        [string]$Prompt,
        [string]$DefaultValue = ""
    )
    $value = Read-Host $Prompt
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $DefaultValue
    }
    return $value.Trim()
}

function Load-JwtFromDefaultFile {
    param([string]$RepoRoot)
    $defaultPath = Join-Path $RepoRoot "scripts\.jwt_last.txt"
    if (Test-Path -LiteralPath $defaultPath) {
        $token = Get-Content -LiteralPath $defaultPath -Raw -Encoding UTF8
        if (-not [string]::IsNullOrWhiteSpace($token)) {
            return $token.Trim()
        }
    }
    return $null
}

function Invoke-JsonRequest {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers,
        [object]$Body = $null
    )

    $params = @{
        Uri         = $Uri
        Method      = $Method
        Headers     = $Headers
        ErrorAction = "Stop"
    }

    if ($null -ne $Body) {
        $params["ContentType"] = "application/json"
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }

    try {
        $response = Invoke-WebRequest @params
        $text = $response.Content
        $json = $null
        try {
            $json = $text | ConvertFrom-Json -Depth 20
        }
        catch {
            $json = $null
        }

        return [pscustomobject]@{
            Ok         = $true
            StatusCode = [int]$response.StatusCode
            Text       = $text
            Json       = $json
        }
    }
    catch {
        $statusCode = 0
        $text = $_.Exception.Message

        if ($_.Exception.Response) {
            try {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }
            catch {
                $statusCode = 0
            }

            try {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $text = $reader.ReadToEnd()
                    $reader.Close()
                }
            }
            catch {
            }
        }

        $json = $null
        try {
            $json = $text | ConvertFrom-Json -Depth 20
        }
        catch {
            $json = $null
        }

        return [pscustomobject]@{
            Ok         = $false
            StatusCode = $statusCode
            Text       = $text
            Json       = $json
        }
    }
}

$RepoRoot = "C:\icanhelp-mvp"
if (-not (Test-Path -LiteralPath $RepoRoot)) {
    throw "Repo nao encontrado em $RepoRoot"
}

$RunDir = New-RunDir -RepoRoot $RepoRoot

$AppBaseUrl = Read-OptionalText -Prompt "APP_BASE_URL [ENTER para https://icanhelp-mvp.vercel.app]" -DefaultValue "https://icanhelp-mvp.vercel.app"
$TenantId = Read-OptionalText -Prompt "TENANT_ID (x-icanhelp-tenant)"
$Jwt = Load-JwtFromDefaultFile -RepoRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($Jwt)) {
    $Jwt = Read-OptionalText -Prompt "JWT Bearer"
}

if ([string]::IsNullOrWhiteSpace($TenantId)) {
    throw "TENANT_ID vazio."
}

if ([string]::IsNullOrWhiteSpace($Jwt)) {
    throw "JWT vazio."
}

$Headers = @{
    "Authorization"    = "Bearer " + $Jwt
    "x-icanhelp-tenant" = $TenantId
}

$CreateBody = @{
    domain               = "organizational"
    category             = "sst"
    title                = "Smoke " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    summary              = "Smoke test knowledge item"
    body                 = "Conteudo de smoke test do knowledge-items"
    foundation_type      = "methodological"
    foundation_reference = "Smoke reference"
    status               = "draft"
}

$BaseUri = $AppBaseUrl.TrimEnd("/")
$CollectionUri = $BaseUri + "/api/knowledge-items"

$CreateResponse = Invoke-JsonRequest -Method "POST" -Uri $CollectionUri -Headers $Headers -Body $CreateBody
Save-Text -Path (Join-Path $RunDir "01_create_status.txt") -Value ("STATUS_CODE=" + $CreateResponse.StatusCode)
Save-Text -Path (Join-Path $RunDir "01_create_body.json") -Value $CreateResponse.Text

$CreatedId = $null
if ($CreateResponse.Json -and $CreateResponse.Json.item -and $CreateResponse.Json.item.id) {
    $CreatedId = [string]$CreateResponse.Json.item.id
}

$ListResponse = Invoke-JsonRequest -Method "GET" -Uri ($CollectionUri + "?domain=organizational&limit=20&offset=0") -Headers $Headers
Save-Text -Path (Join-Path $RunDir "02_list_status.txt") -Value ("STATUS_CODE=" + $ListResponse.StatusCode)
Save-Text -Path (Join-Path $RunDir "02_list_body.json") -Value $ListResponse.Text

$DetailResponse = $null
$PatchResponse = $null
$DeleteResponse = $null

if (-not [string]::IsNullOrWhiteSpace($CreatedId)) {
    $ItemUri = $CollectionUri + "/" + $CreatedId

    $DetailResponse = Invoke-JsonRequest -Method "GET" -Uri $ItemUri -Headers $Headers
    Save-Text -Path (Join-Path $RunDir "03_detail_status.txt") -Value ("STATUS_CODE=" + $DetailResponse.StatusCode)
    Save-Text -Path (Join-Path $RunDir "03_detail_body.json") -Value $DetailResponse.Text

    $PatchBody = @{
        title  = "Smoke Updated " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        status = "approved"
    }

    $PatchResponse = Invoke-JsonRequest -Method "PATCH" -Uri $ItemUri -Headers $Headers -Body $PatchBody
    Save-Text -Path (Join-Path $RunDir "04_patch_status.txt") -Value ("STATUS_CODE=" + $PatchResponse.StatusCode)
    Save-Text -Path (Join-Path $RunDir "04_patch_body.json") -Value $PatchResponse.Text

    $DeleteResponse = Invoke-JsonRequest -Method "DELETE" -Uri $ItemUri -Headers $Headers
    Save-Text -Path (Join-Path $RunDir "05_delete_status.txt") -Value ("STATUS_CODE=" + $DeleteResponse.StatusCode)
    Save-Text -Path (Join-Path $RunDir "05_delete_body.json") -Value $DeleteResponse.Text
}

$CreateOk = ($CreateResponse.StatusCode -eq 201 -and -not [string]::IsNullOrWhiteSpace($CreatedId))
$ListOk = ($ListResponse.StatusCode -eq 200)
$DetailOk = ($null -ne $DetailResponse -and $DetailResponse.StatusCode -eq 200)
$PatchOk = ($null -ne $PatchResponse -and $PatchResponse.StatusCode -eq 200)
$DeleteOk = ($null -ne $DeleteResponse -and $DeleteResponse.StatusCode -eq 200)

$Overall = if ($CreateOk -and $ListOk -and $DetailOk -and $PatchOk -and $DeleteOk) { "PASS" } else { "FAIL" }

$Summary = @()
$Summary += "STATUS=$Overall"
$Summary += "RUN_DIR=$RunDir"
$Summary += "APP_BASE_URL=$AppBaseUrl"
$Summary += "TENANT_ID=$TenantId"
$Summary += "CREATE_STATUS_CODE=$($CreateResponse.StatusCode)"
$Summary += "LIST_STATUS_CODE=$($ListResponse.StatusCode)"
$Summary += "DETAIL_STATUS_CODE=$(if ($DetailResponse) { $DetailResponse.StatusCode } else { 0 })"
$Summary += "PATCH_STATUS_CODE=$(if ($PatchResponse) { $PatchResponse.StatusCode } else { 0 })"
$Summary += "DELETE_STATUS_CODE=$(if ($DeleteResponse) { $DeleteResponse.StatusCode } else { 0 })"
$Summary += "CREATED_ID=$CreatedId"
$Summary += "NEXT_STEP=$(if ($Overall -eq 'PASS') { 'commit_and_push_if_not_done' } else { 'inspect_smoke_artifacts' })"

Save-Text -Path (Join-Path $RunDir "summary.txt") -Value ($Summary -join [Environment]::NewLine)

Write-Host ""
Write-Host $Overall
Write-Host "RUN_DIR=$RunDir"
Write-Host "SUMMARY_PATH=$(Join-Path $RunDir 'summary.txt')"
Write-Host ""
