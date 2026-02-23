[CmdletBinding()]
param(
  [string]$ApiBaseUrl = "http://localhost:8092",
  [string]$AuthTokenSecret = "",
  [int64]$AdminUserID = 1,
  [int64]$NonAdminUserID = 999999
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:Checks = @()

function Add-Check {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Details = ""
  )

  $status = if ($Passed) { "PASS" } else { "FAIL" }
  $suffix = if ($Details) { " - $Details" } else { "" }
  Write-Host ("[{0}] {1}{2}" -f $status, $Name, $suffix)

  $script:Checks += [pscustomobject]@{
    Name    = $Name
    Passed  = $Passed
    Details = $Details
  }

  if (-not $Passed) {
    throw "Smoke check failed: $Name. $Details"
  }
}

function Invoke-ApiRequest {
  param(
    [ValidateSet("GET", "POST", "PATCH")]
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  $requestParams = @{
    Method          = $Method
    Uri             = $Uri
    Headers         = $Headers
    UseBasicParsing = $true
    TimeoutSec      = 20
  }

  if ($null -ne $Body) {
    $requestParams["ContentType"] = "application/json"
    $requestParams["Body"] = ($Body | ConvertTo-Json -Depth 10 -Compress)
  }

  $statusCode = 0
  $rawBody = ""
  $responseHeaders = $null

  try {
    $response = Invoke-WebRequest @requestParams
    $statusCode = [int]$response.StatusCode
    $rawBody = "$($response.Content)"
    $responseHeaders = $response.Headers
  } catch {
    $httpResponse = $_.Exception.Response
    if ($null -eq $httpResponse) {
      throw
    }

    $statusCode = [int]$httpResponse.StatusCode
    $responseHeaders = $httpResponse.Headers
    $stream = $httpResponse.GetResponseStream()
    if ($null -ne $stream) {
      $reader = New-Object System.IO.StreamReader($stream)
      try {
        $rawBody = $reader.ReadToEnd()
      } finally {
        $reader.Close()
      }
    }
  }

  $jsonBody = $null
  if ($rawBody.Trim().Length -gt 0) {
    try {
      $jsonBody = $rawBody | ConvertFrom-Json
    } catch {
      $jsonBody = $null
    }
  }

  return [pscustomobject]@{
    StatusCode = $statusCode
    Headers    = $responseHeaders
    Body       = $rawBody
    Json       = $jsonBody
  }
}

function Get-JsonPropValue {
  param(
    [object]$Object,
    [string]$Name
  )

  if ($null -eq $Object) {
    return $null
  }

  $prop = $Object.PSObject.Properties[$Name]
  if ($null -eq $prop) {
    return $null
  }

  return $prop.Value
}

function New-SignedBootstrapToken {
  param(
    [int64]$UserID,
    [string]$DisplayName,
    [string]$Secret,
    [int]$TtlSeconds = 600
  )

  $payload = @{
    user_id = $UserID
    display_name = $DisplayName
    exp = [DateTimeOffset]::UtcNow.AddSeconds($TtlSeconds).ToUnixTimeSeconds()
  } | ConvertTo-Json -Compress

  $payloadBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $payloadB64 = [Convert]::ToBase64String($payloadBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

  $secretBytes = [System.Text.Encoding]::UTF8.GetBytes($Secret)
  $hmac = [System.Security.Cryptography.HMACSHA256]::new($secretBytes)
  try {
    $signatureBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payloadB64))
  } finally {
    $hmac.Dispose()
  }

  $signatureB64 = [Convert]::ToBase64String($signatureBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  return "$payloadB64.$signatureB64"
}

function Get-AuthSecret {
  param([string]$ProvidedSecret)

  if ($ProvidedSecret.Trim() -ne "") {
    return $ProvidedSecret.Trim()
  }

  if ($env:AUTH_TOKEN_SECRET -and $env:AUTH_TOKEN_SECRET.Trim() -ne "") {
    return $env:AUTH_TOKEN_SECRET.Trim()
  }

  $containerSecret = (& docker compose exec -T team4sv30-backend /bin/sh -lc 'printf %s "$AUTH_TOKEN_SECRET"')
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to load AUTH_TOKEN_SECRET from backend container."
  }

  $trimmed = "$containerSecret".Trim()
  if ($trimmed -eq "") {
    throw "AUTH_TOKEN_SECRET is empty. Pass -AuthTokenSecret explicitly."
  }

  return $trimmed
}

function Issue-AuthSession {
  param(
    [string]$BaseUrl,
    [string]$BootstrapToken
  )

  $issueResponse = Invoke-ApiRequest -Method "POST" -Uri "$BaseUrl/api/v1/auth/issue" -Headers @{
    Authorization = "Bearer $BootstrapToken"
  }
  Add-Check -Name "Auth issue returns 201" -Passed ($issueResponse.StatusCode -eq 201) -Details "status=$($issueResponse.StatusCode)"

  $issuedData = $issueResponse.Json.data
  Add-Check -Name "Auth issue returns access token" -Passed ($null -ne $issuedData.access_token -and "$($issuedData.access_token)".Trim() -ne "")
  Add-Check -Name "Auth issue returns refresh token" -Passed ($null -ne $issuedData.refresh_token -and "$($issuedData.refresh_token)".Trim() -ne "")

  return $issuedData
}

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptPath "..")).Path

Push-Location $projectRoot
try {
  Write-Host "Running admin smoke checks in $projectRoot"
  Write-Host "API base URL: $ApiBaseUrl"

  $health = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/health"
  Add-Check -Name "Health endpoint is reachable" -Passed ($health.StatusCode -eq 200) -Details "status=$($health.StatusCode)"

  $secret = Get-AuthSecret -ProvidedSecret $AuthTokenSecret
  Add-Check -Name "Auth secret resolved" -Passed ($secret -ne "")

  $adminBootstrapToken = New-SignedBootstrapToken -UserID $AdminUserID -DisplayName "AdminSmoke" -Secret $secret
  $nonAdminBootstrapToken = New-SignedBootstrapToken -UserID $NonAdminUserID -DisplayName "UserSmoke" -Secret $secret
  Add-Check -Name "Bootstrap tokens generated" -Passed ($adminBootstrapToken.Trim() -ne "" -and $nonAdminBootstrapToken.Trim() -ne "")

  $adminSession = Issue-AuthSession -BaseUrl $ApiBaseUrl -BootstrapToken $adminBootstrapToken
  $nonAdminSession = Issue-AuthSession -BaseUrl $ApiBaseUrl -BootstrapToken $nonAdminBootstrapToken

  Write-Host "`n[Admin allowed: create+patch]"
  $stamp = (Get-Date -Format "yyyyMMddHHmmssfff")

  $createAnime = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/admin/anime" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    title = "SMOKE ADMIN ANIME $stamp"
    type = "tv"
    content_type = "anime"
    status = "disabled"
    year = 2026
    max_episodes = 1
  }
  Add-Check -Name "Admin create anime returns 201" -Passed ($createAnime.StatusCode -eq 201) -Details "status=$($createAnime.StatusCode)"
  $animeID = [int64]$createAnime.Json.data.id
  Add-Check -Name "Created anime id is available" -Passed ($animeID -gt 0) -Details "anime_id=$animeID"

  $patchAnime = Invoke-ApiRequest -Method "PATCH" -Uri "$ApiBaseUrl/api/v1/admin/anime/$animeID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    description = "smoke patched $stamp"
  }
  Add-Check -Name "Admin patch anime returns 200" -Passed ($patchAnime.StatusCode -eq 200) -Details "status=$($patchAnime.StatusCode)"

  $patchAnimeCoverSet = Invoke-ApiRequest -Method "PATCH" -Uri "$ApiBaseUrl/api/v1/admin/anime/$animeID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    cover_image = "smoke-cover-$stamp.webp"
  }
  Add-Check -Name "Admin patch anime cover_image set returns 200" -Passed ($patchAnimeCoverSet.StatusCode -eq 200) -Details "status=$($patchAnimeCoverSet.StatusCode)"
  $coverSetValue = Get-JsonPropValue -Object $patchAnimeCoverSet.Json.data -Name "cover_image"
  Add-Check -Name "Admin patch anime cover_image set reflected" -Passed ($null -ne $coverSetValue -and "$coverSetValue" -like "smoke-cover-*") -Details "cover_image=$coverSetValue"

  $patchAnimeCoverClear = Invoke-ApiRequest -Method "PATCH" -Uri "$ApiBaseUrl/api/v1/admin/anime/$animeID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    cover_image = $null
  }
  Add-Check -Name "Admin patch anime cover_image clear returns 200" -Passed ($patchAnimeCoverClear.StatusCode -eq 200) -Details "status=$($patchAnimeCoverClear.StatusCode)"
  $coverClearValue = Get-JsonPropValue -Object $patchAnimeCoverClear.Json.data -Name "cover_image"
  Add-Check -Name "Admin patch anime cover_image cleared" -Passed ($null -eq $coverClearValue) -Details "cover_image=$coverClearValue"

  $createEpisode = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/admin/episodes" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    anime_id = $animeID
    episode_number = "01"
    status = "disabled"
    title = "smoke ep $stamp"
  }
  Add-Check -Name "Admin create episode returns 201" -Passed ($createEpisode.StatusCode -eq 201) -Details "status=$($createEpisode.StatusCode)"
  $episodeID = [int64]$createEpisode.Json.data.id
  Add-Check -Name "Created episode id is available" -Passed ($episodeID -gt 0) -Details "episode_id=$episodeID"

  $patchEpisode = Invoke-ApiRequest -Method "PATCH" -Uri "$ApiBaseUrl/api/v1/admin/episodes/$episodeID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    title = "smoke ep patched $stamp"
  }
  Add-Check -Name "Admin patch episode returns 200" -Passed ($patchEpisode.StatusCode -eq 200) -Details "status=$($patchEpisode.StatusCode)"

  $patchEpisodeClearTitle = Invoke-ApiRequest -Method "PATCH" -Uri "$ApiBaseUrl/api/v1/admin/episodes/$episodeID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    title = $null
  }
  Add-Check -Name "Admin patch episode title clear returns 200" -Passed ($patchEpisodeClearTitle.StatusCode -eq 200) -Details "status=$($patchEpisodeClearTitle.StatusCode)"
  $episodeTitleClearValue = Get-JsonPropValue -Object $patchEpisodeClearTitle.Json.data -Name "title"
  Add-Check -Name "Admin patch episode title cleared" -Passed ($null -eq $episodeTitleClearValue) -Details "title=$episodeTitleClearValue"

  Write-Host "`n[Non-admin forbidden: 403]"
  $nonAdminCreateAnime = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/admin/anime" -Headers @{
    Authorization = "Bearer $($nonAdminSession.access_token)"
  } -Body @{
    title = "SMOKE NONADMIN SHOULD FAIL $stamp"
    type = "tv"
    content_type = "anime"
    status = "disabled"
  }
  Add-Check -Name "Non-admin create anime returns 403" -Passed ($nonAdminCreateAnime.StatusCode -eq 403) -Details "status=$($nonAdminCreateAnime.StatusCode)"

  $nonAdminPatchAnime = Invoke-ApiRequest -Method "PATCH" -Uri "$ApiBaseUrl/api/v1/admin/anime/$animeID" -Headers @{
    Authorization = "Bearer $($nonAdminSession.access_token)"
  } -Body @{
    description = "should not be applied"
  }
  Add-Check -Name "Non-admin patch anime returns 403" -Passed ($nonAdminPatchAnime.StatusCode -eq 403) -Details "status=$($nonAdminPatchAnime.StatusCode)"

  $nonAdminCreateEpisode = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/admin/episodes" -Headers @{
    Authorization = "Bearer $($nonAdminSession.access_token)"
  } -Body @{
    anime_id = $animeID
    episode_number = "02"
    status = "disabled"
  }
  Add-Check -Name "Non-admin create episode returns 403" -Passed ($nonAdminCreateEpisode.StatusCode -eq 403) -Details "status=$($nonAdminCreateEpisode.StatusCode)"

  $nonAdminPatchEpisode = Invoke-ApiRequest -Method "PATCH" -Uri "$ApiBaseUrl/api/v1/admin/episodes/$episodeID" -Headers @{
    Authorization = "Bearer $($nonAdminSession.access_token)"
  } -Body @{
    title = "should not be applied"
  }
  Add-Check -Name "Non-admin patch episode returns 403" -Passed ($nonAdminPatchEpisode.StatusCode -eq 403) -Details "status=$($nonAdminPatchEpisode.StatusCode)"

  $passedCount = ($script:Checks | Where-Object { $_.Passed }).Count
  $totalCount = $script:Checks.Count
  Write-Host "`nAdmin smoke checks completed: $passedCount/$totalCount passed."
} finally {
  Pop-Location
}
