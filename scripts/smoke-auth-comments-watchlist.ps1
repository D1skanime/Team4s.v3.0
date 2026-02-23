[CmdletBinding()]
param(
  [string]$ApiBaseUrl = "http://localhost:8092",
  [string]$AuthTokenSecret = "",
  [int]$CommentLimit = 5,
  [switch]$SkipDegradedMode,
  [string]$RedisService = "team4sv30-redis"
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
    [ValidateSet("GET", "POST", "DELETE")]
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  $requestParams = @{
    Method      = $Method
    Uri         = $Uri
    Headers     = $Headers
    UseBasicParsing = $true
    TimeoutSec  = 20
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

function Get-ResponseHeaderValue {
  param(
    [object]$Response,
    [string]$HeaderName
  )

  $headers = $Response.Headers
  if ($null -eq $headers) {
    return ""
  }

  try {
    $direct = $headers[$HeaderName]
    if ($null -ne $direct -and "$direct".Trim() -ne "") {
      return "$direct"
    }
  } catch {
    # Continue with fallback scan.
  }

  if ($headers -is [System.Net.WebHeaderCollection]) {
    foreach ($key in $headers.AllKeys) {
      if ("$key" -ieq $HeaderName) {
        return "$($headers[$key])"
      }
    }
  } else {
    foreach ($key in $headers.Keys) {
      if ("$key" -ieq $HeaderName) {
        return "$($headers[$key])"
      }
    }
  }

  return ""
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

function Get-CommentRateLimitKeys {
  $keys = (& docker compose exec -T $RedisService redis-cli --scan --pattern "comment_rate_limit:*")
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to scan comment limiter keys in Redis."
  }

  return @(
    $keys |
      Where-Object { $_ -and "$_".Trim() -ne "" } |
      ForEach-Object { "$_".Trim() }
  )
}

function Clear-CommentRateLimitKeys {
  $keys = Get-CommentRateLimitKeys
  foreach ($key in $keys) {
    & docker compose exec -T $RedisService redis-cli DEL $key | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to delete Redis key: $key"
    }
  }
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

function New-CommentContent {
  param([string]$Prefix)
  return "$Prefix $(Get-Date -Format 'yyyyMMddHHmmssfff')"
}

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptPath "..")).Path

Push-Location $projectRoot
try {
  Write-Host "Running smoke checks in $projectRoot"
  Write-Host "API base URL: $ApiBaseUrl"

  $health = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/health"
  Add-Check -Name "Health endpoint is reachable" -Passed ($health.StatusCode -eq 200) -Details "status=$($health.StatusCode)"

  $secret = Get-AuthSecret -ProvidedSecret $AuthTokenSecret
  Add-Check -Name "Auth secret resolved" -Passed ($secret -ne "")

  $bootstrapToken = New-SignedBootstrapToken -UserID 1 -DisplayName "SmokeUser" -Secret $secret
  Add-Check -Name "Bootstrap token generated" -Passed ($bootstrapToken.Trim() -ne "")

  $animeList = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/anime?page=1&per_page=1"
  Add-Check -Name "Anime list returns 200" -Passed ($animeList.StatusCode -eq 200) -Details "status=$($animeList.StatusCode)"
  $animeID = [int64]$animeList.Json.data[0].id
  Add-Check -Name "Anime id available for smoke checks" -Passed ($animeID -gt 0) -Details "anime_id=$animeID"

  Write-Host "`n[Auth lifecycle]"
  $sessionA = Issue-AuthSession -BaseUrl $ApiBaseUrl -BootstrapToken $bootstrapToken

  $refreshResponse = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/auth/refresh" -Body @{
    refresh_token = "$($sessionA.refresh_token)"
  }
  Add-Check -Name "Auth refresh returns 200" -Passed ($refreshResponse.StatusCode -eq 200) -Details "status=$($refreshResponse.StatusCode)"

  $sessionB = $refreshResponse.Json.data
  Add-Check -Name "Auth refresh rotated refresh token" -Passed ("$($sessionB.refresh_token)" -ne "$($sessionA.refresh_token)")

  $revokeResponse = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/auth/revoke" -Headers @{
    Authorization = "Bearer $($sessionB.access_token)"
  } -Body @{
    refresh_token = "$($sessionB.refresh_token)"
  }
  Add-Check -Name "Auth revoke returns 204" -Passed ($revokeResponse.StatusCode -eq 204) -Details "status=$($revokeResponse.StatusCode)"

  $revokedAccessCheck = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/watchlist?page=1&per_page=1" -Headers @{
    Authorization = "Bearer $($sessionB.access_token)"
  }
  Add-Check -Name "Revoked access token is rejected" -Passed ($revokedAccessCheck.StatusCode -eq 401) -Details "status=$($revokedAccessCheck.StatusCode)"

  $activeSession = Issue-AuthSession -BaseUrl $ApiBaseUrl -BootstrapToken $bootstrapToken

  Write-Host "`n[Watchlist CRUD]"
  $cleanupDelete = Invoke-ApiRequest -Method "DELETE" -Uri "$ApiBaseUrl/api/v1/watchlist/$animeID" -Headers @{
    Authorization = "Bearer $($activeSession.access_token)"
  }
  Add-Check -Name "Watchlist pre-cleanup accepted" -Passed (@(204, 404) -contains $cleanupDelete.StatusCode) -Details "status=$($cleanupDelete.StatusCode)"

  $watchlistCreate = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/watchlist" -Headers @{
    Authorization = "Bearer $($activeSession.access_token)"
  } -Body @{
    anime_id = $animeID
  }
  Add-Check -Name "Watchlist create returns 201" -Passed ($watchlistCreate.StatusCode -eq 201) -Details "status=$($watchlistCreate.StatusCode)"

  $watchlistGet = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/watchlist/$animeID" -Headers @{
    Authorization = "Bearer $($activeSession.access_token)"
  }
  Add-Check -Name "Watchlist get returns 200" -Passed ($watchlistGet.StatusCode -eq 200) -Details "status=$($watchlistGet.StatusCode)"

  $watchlistList = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/watchlist?page=1&per_page=20" -Headers @{
    Authorization = "Bearer $($activeSession.access_token)"
  }
  Add-Check -Name "Watchlist list returns 200" -Passed ($watchlistList.StatusCode -eq 200) -Details "status=$($watchlistList.StatusCode)"
  $watchlistContainsAnime = $false
  foreach ($entry in $watchlistList.Json.data) {
    if ([int64]$entry.anime_id -eq $animeID) {
      $watchlistContainsAnime = $true
      break
    }
  }
  Add-Check -Name "Watchlist list contains created entry" -Passed $watchlistContainsAnime

  $watchlistDelete = Invoke-ApiRequest -Method "DELETE" -Uri "$ApiBaseUrl/api/v1/watchlist/$animeID" -Headers @{
    Authorization = "Bearer $($activeSession.access_token)"
  }
  Add-Check -Name "Watchlist delete returns 204" -Passed ($watchlistDelete.StatusCode -eq 204) -Details "status=$($watchlistDelete.StatusCode)"

  $watchlistGetAfterDelete = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/watchlist/$animeID" -Headers @{
    Authorization = "Bearer $($activeSession.access_token)"
  }
  Add-Check -Name "Watchlist get after delete returns 404" -Passed ($watchlistGetAfterDelete.StatusCode -eq 404) -Details "status=$($watchlistGetAfterDelete.StatusCode)"

  Write-Host "`n[Comments throttling]"
  Clear-CommentRateLimitKeys
  Add-Check -Name "Comment limiter keys cleared" -Passed $true

  $commentResponses = @()
  for ($i = 1; $i -le ($CommentLimit + 1); $i++) {
    $commentResponses += Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/anime/$animeID/comments" -Headers @{
      Authorization = "Bearer $($activeSession.access_token)"
    } -Body @{
      content = (New-CommentContent -Prefix "smoke-throttle-$i")
    }
  }

  for ($i = 0; $i -lt $CommentLimit; $i++) {
    Add-Check -Name "Comment create #$($i + 1) returns 201" -Passed ($commentResponses[$i].StatusCode -eq 201) -Details "status=$($commentResponses[$i].StatusCode)"
  }

  $throttledResponse = $commentResponses[$CommentLimit]
  Add-Check -Name "Comment create #$($CommentLimit + 1) returns 429" -Passed ($throttledResponse.StatusCode -eq 429) -Details "status=$($throttledResponse.StatusCode)"
  $retryAfter = Get-ResponseHeaderValue -Response $throttledResponse -HeaderName "Retry-After"
  $retryAfterSeconds = 0
  [void][int]::TryParse($retryAfter, [ref]$retryAfterSeconds)
  Add-Check -Name "Comment throttle response has Retry-After" -Passed ($retryAfterSeconds -ge 1) -Details "retry_after=$retryAfter"

  if (-not $SkipDegradedMode) {
    Write-Host "`n[Comments degraded mode]"
    Clear-CommentRateLimitKeys
    Add-Check -Name "Comment limiter keys cleared for degraded test" -Passed $true

    $seedComment = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/anime/$animeID/comments" -Headers @{
      Authorization = "Bearer $($activeSession.access_token)"
    } -Body @{
      content = (New-CommentContent -Prefix "smoke-degraded-seed")
    }
    Add-Check -Name "Seed comment create returns 201" -Passed ($seedComment.StatusCode -eq 201) -Details "status=$($seedComment.StatusCode)"

    $limiterKey = (Get-CommentRateLimitKeys | Select-Object -First 1)
    Add-Check -Name "Limiter key discovered for degraded test" -Passed ($null -ne $limiterKey -and "$limiterKey".Trim() -ne "")

    $setResult = (& docker compose exec -T $RedisService redis-cli SET $limiterKey "broken" EX 120)
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to poison limiter key for degraded test."
    }
    Add-Check -Name "Limiter key poisoned for degraded test" -Passed ("$setResult".Trim().ToUpperInvariant().Contains("OK"))

    $degradedComment = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/anime/$animeID/comments" -Headers @{
      Authorization = "Bearer $($activeSession.access_token)"
    } -Body @{
      content = (New-CommentContent -Prefix "smoke-degraded-check")
    }
    Add-Check -Name "Comment create remains available in degraded limiter mode" -Passed ($degradedComment.StatusCode -eq 201) -Details "status=$($degradedComment.StatusCode)"
    $degradedHeader = Get-ResponseHeaderValue -Response $degradedComment -HeaderName "X-Comment-RateLimit-Degraded"
    Add-Check -Name "Degraded limiter header is present" -Passed ($degradedHeader.Trim().ToLowerInvariant() -eq "true") -Details "header=$degradedHeader"
  }

  $passedCount = ($script:Checks | Where-Object { $_.Passed }).Count
  $totalCount = $script:Checks.Count
  Write-Host "`nSmoke checks completed: $passedCount/$totalCount passed."
} finally {
  Pop-Location
}
