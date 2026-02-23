[CmdletBinding()]
param(
  [string]$ApiBaseUrl = "http://localhost:8092",
  [string]$AuthTokenSecret = "",
  [int64]$AdminUserID = 1,
  [int]$PlaybackRateLimit = 0,
  [int64]$PreferredEpisodeID = 76,
  [int64]$ProbeStartID = 1,
  [int64]$ProbeEndID = 250
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
    [ValidateSet("GET", "POST")]
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
    $httpResponse = $null
    if ($_.Exception -and $_.Exception.PSObject.Properties["Response"]) {
      $httpResponse = $_.Exception.Response
    }
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

function Invoke-CurlStatus {
  param(
    [string]$Uri,
    [hashtable]$Headers = @{}
  )

  $args = @("-s", "-o", "NUL", "-w", "%{http_code}")
  foreach ($key in $Headers.Keys) {
    $args += "-H"
    $args += ("{0}: {1}" -f $key, $Headers[$key])
  }
  $args += $Uri

  $status = & curl.exe @args
  if ($LASTEXITCODE -ne 0) {
    throw "curl failed for uri: $Uri"
  }

  return "$status".Trim()
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
    user_id      = $UserID
    display_name = $DisplayName
    exp          = [DateTimeOffset]::UtcNow.AddSeconds($TtlSeconds).ToUnixTimeSeconds()
  } | ConvertTo-Json -Compress

  $payloadBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $payloadB64 = [Convert]::ToBase64String($payloadBytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")

  $secretBytes = [System.Text.Encoding]::UTF8.GetBytes($Secret)
  $hmac = [System.Security.Cryptography.HMACSHA256]::new($secretBytes)
  try {
    $signatureBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payloadB64))
  } finally {
    $hmac.Dispose()
  }

  $signatureB64 = [Convert]::ToBase64String($signatureBytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
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

function Get-PlaybackRateLimit {
  param([int]$ProvidedLimit)

  if ($ProvidedLimit -gt 0) {
    return $ProvidedLimit
  }

  if ($env:EPISODE_PLAYBACK_RATE_LIMIT -and $env:EPISODE_PLAYBACK_RATE_LIMIT.Trim() -ne "") {
    $parsedEnv = 0
    if ([int]::TryParse($env:EPISODE_PLAYBACK_RATE_LIMIT.Trim(), [ref]$parsedEnv) -and $parsedEnv -gt 0) {
      return $parsedEnv
    }
  }

  $containerLimit = (& docker compose exec -T team4sv30-backend /bin/sh -lc 'printf %s "$EPISODE_PLAYBACK_RATE_LIMIT"')
  if ($LASTEXITCODE -eq 0) {
    $parsedContainer = 0
    if ([int]::TryParse("$containerLimit".Trim(), [ref]$parsedContainer) -and $parsedContainer -gt 0) {
      return $parsedContainer
    }
  }

  return 30
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

function Test-PlayableEpisode {
  param(
    [string]$BaseUrl,
    [int64]$EpisodeID
  )

  if ($EpisodeID -le 0) {
    return $false
  }

  $response = Invoke-ApiRequest -Method "GET" -Uri "$BaseUrl/api/v1/episodes/$EpisodeID"
  if ($response.StatusCode -ne 200 -or $null -eq $response.Json -or $null -eq $response.Json.data) {
    return $false
  }

  $streamLinks = @($response.Json.data.stream_links)
  foreach ($item in $streamLinks) {
    if ($null -ne $item -and "$item".Trim() -ne "") {
      return $true
    }
  }

  return $false
}

function Find-PlayableEpisodeID {
  param(
    [string]$BaseUrl,
    [int64]$PreferredID,
    [int64]$StartID,
    [int64]$EndID
  )

  if (Test-PlayableEpisode -BaseUrl $BaseUrl -EpisodeID $PreferredID) {
    return $PreferredID
  }

  for ($id = $StartID; $id -le $EndID; $id++) {
    if ($id -eq $PreferredID) {
      continue
    }
    if (Test-PlayableEpisode -BaseUrl $BaseUrl -EpisodeID $id) {
      return $id
    }
  }

  throw "No playable episode found in probe range $StartID..$EndID and preferred id $PreferredID."
}

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptPath "..")).Path

Push-Location $projectRoot
try {
  Write-Host "Running episode-playback smoke checks in $projectRoot"
  Write-Host "API base URL: $ApiBaseUrl"

  $health = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/health"
  Add-Check -Name "Health endpoint is reachable" -Passed ($health.StatusCode -eq 200) -Details "status=$($health.StatusCode)"

  $secret = Get-AuthSecret -ProvidedSecret $AuthTokenSecret
  Add-Check -Name "Auth secret resolved" -Passed ($secret -ne "")

  $bootstrapToken = New-SignedBootstrapToken -UserID $AdminUserID -DisplayName "EpisodePlaybackSmokeAdmin" -Secret $secret
  Add-Check -Name "Bootstrap token generated" -Passed ($bootstrapToken.Trim() -ne "")

  $session = Issue-AuthSession -BaseUrl $ApiBaseUrl -BootstrapToken $bootstrapToken

  $episodeID = Find-PlayableEpisodeID -BaseUrl $ApiBaseUrl -PreferredID $PreferredEpisodeID -StartID $ProbeStartID -EndID $ProbeEndID
  Add-Check -Name "Playable episode discovered" -Passed ($episodeID -gt 0) -Details "episode_id=$episodeID"

  $grantNoAuth = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/episodes/$episodeID/play/grant"
  Add-Check -Name "Episode play grant without auth returns 401" -Passed ($grantNoAuth.StatusCode -eq 401) -Details "status=$($grantNoAuth.StatusCode)"

  $playNoAuth = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/episodes/$episodeID/play"
  Add-Check -Name "Episode play without auth returns 401" -Passed ($playNoAuth.StatusCode -eq 401) -Details "status=$($playNoAuth.StatusCode)"

  $grantWithAuth = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/episodes/$episodeID/play/grant" -Headers @{
    Authorization = "Bearer $($session.access_token)"
  }
  Add-Check -Name "Episode play grant with auth returns 201" -Passed ($grantWithAuth.StatusCode -eq 201) -Details "status=$($grantWithAuth.StatusCode)"
  $grantToken = "$($grantWithAuth.Json.data.grant_token)".Trim()
  Add-Check -Name "Episode play grant token is present" -Passed ($grantToken -ne "")
  $cacheControl = Get-ResponseHeaderValue -Response $grantWithAuth -HeaderName "Cache-Control"
  Add-Check -Name "Episode play grant returns no-store cache header" -Passed ("$cacheControl".ToLowerInvariant().Contains("no-store")) -Details "cache_control=$cacheControl"

  $playWithGrantStatus = [int](Invoke-CurlStatus -Uri "$ApiBaseUrl/api/v1/episodes/$episodeID/play?grant=$([System.Uri]::EscapeDataString($grantToken))")
  Add-Check -Name "Episode play with grant returns stream status" -Passed (@(200, 206) -contains $playWithGrantStatus) -Details "status=$playWithGrantStatus"

  $playWithAuthStatus = [int](Invoke-CurlStatus -Uri "$ApiBaseUrl/api/v1/episodes/$episodeID/play" -Headers @{
    Authorization = "Bearer $($session.access_token)"
  })
  Add-Check -Name "Episode play with auth returns stream status" -Passed (@(200, 206) -contains $playWithAuthStatus) -Details "status=$playWithAuthStatus"

  $invalidGrant = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/episodes/$episodeID/play?grant=$([System.Uri]::EscapeDataString($grantToken + 'invalid'))"
  Add-Check -Name "Episode play with invalid grant returns 401" -Passed ($invalidGrant.StatusCode -eq 401) -Details "status=$($invalidGrant.StatusCode)"

  $playbackRateLimit = Get-PlaybackRateLimit -ProvidedLimit $PlaybackRateLimit
  Add-Check -Name "Episode playback rate-limit config resolved" -Passed ($playbackRateLimit -gt 0) -Details "limit=$playbackRateLimit"

  $rateLimitBootstrapToken = New-SignedBootstrapToken -UserID ($AdminUserID + 1000) -DisplayName "EpisodePlaybackRateLimitUser" -Secret $secret
  $rateLimitSession = Issue-AuthSession -BaseUrl $ApiBaseUrl -BootstrapToken $rateLimitBootstrapToken

  $withinLimitPass = $true
  for ($i = 1; $i -le $playbackRateLimit; $i++) {
    $grantAttempt = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/episodes/$episodeID/play/grant" -Headers @{
      Authorization = "Bearer $($rateLimitSession.access_token)"
    }
    if ($grantAttempt.StatusCode -ne 201) {
      $withinLimitPass = $false
      break
    }
  }
  Add-Check -Name "Episode play grant allows requests within configured rate limit" -Passed $withinLimitPass -Details "limit=$playbackRateLimit"

  $grantRateLimited = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/episodes/$episodeID/play/grant" -Headers @{
    Authorization = "Bearer $($rateLimitSession.access_token)"
  }
  Add-Check -Name "Episode play grant above rate limit returns 429" -Passed ($grantRateLimited.StatusCode -eq 429) -Details "status=$($grantRateLimited.StatusCode)"
  $grantRetryAfter = Get-ResponseHeaderValue -Response $grantRateLimited -HeaderName "Retry-After"
  Add-Check -Name "Episode play grant rate-limit includes Retry-After" -Passed ("$grantRetryAfter".Trim() -ne "") -Details "retry_after=$grantRetryAfter"

  $passed = @($script:Checks | Where-Object { $_.Passed }).Count
  $total = $script:Checks.Count
  Write-Host ""
  Write-Host ("Episode playback smoke checks complete: {0}/{1} passed." -f $passed, $total)
} finally {
  Pop-Location
}
