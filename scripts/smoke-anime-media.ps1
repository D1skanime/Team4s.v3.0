[CmdletBinding()]
param(
  [string]$ApiBaseUrl = "http://localhost:8092",
  [int64]$AnimeID = 22
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
    [ValidateSet("GET")]
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers = @{}
  )

  $requestParams = @{
    Method          = $Method
    Uri             = $Uri
    Headers         = $Headers
    UseBasicParsing = $true
    TimeoutSec      = 20
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

function Resolve-AbsoluteUrl {
  param(
    [string]$BaseUrl,
    [string]$RawPath
  )

  $baseUri = [System.Uri]::new($BaseUrl)
  $resolved = [System.Uri]::new($baseUri, $RawPath)
  return $resolved.ToString()
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

  return [int]"$status".Trim()
}

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptPath "..")).Path

Push-Location $projectRoot
try {
  Write-Host "Running anime-media smoke checks in $projectRoot"
  Write-Host "API base URL: $ApiBaseUrl"
  Write-Host "Anime ID: $AnimeID"

  $health = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/health"
  Add-Check -Name "Health endpoint is reachable" -Passed ($health.StatusCode -eq 200) -Details "status=$($health.StatusCode)"

  $manifestResponse = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/anime/$AnimeID/backdrops"
  Add-Check -Name "Anime backdrops endpoint returns 200" -Passed ($manifestResponse.StatusCode -eq 200) -Details "status=$($manifestResponse.StatusCode)"
  Add-Check -Name "Anime backdrops payload contains data object" -Passed ($null -ne $manifestResponse.Json.data)

  $manifest = $manifestResponse.Json.data
  $themeVideos = @($manifest.theme_videos)
  $backdrops = @($manifest.backdrops)
  $logoUrl = "$($manifest.logo_url)".Trim()

  Add-Check -Name "Anime media manifest includes at least one theme video" -Passed ($themeVideos.Count -ge 1) -Details "count=$($themeVideos.Count)"
  Add-Check -Name "Anime media manifest includes at least one backdrop" -Passed ($backdrops.Count -ge 1) -Details "count=$($backdrops.Count)"
  Add-Check -Name "Anime media manifest includes logo_url" -Passed ($logoUrl -ne "")

  $videoUrl = Resolve-AbsoluteUrl -BaseUrl $ApiBaseUrl -RawPath $themeVideos[0]
  $videoStatus = Invoke-CurlStatus -Uri $videoUrl -Headers @{
    Range = "bytes=0-1023"
  }
  Add-Check -Name "Theme video proxy supports range request" -Passed ($videoStatus -eq 206) -Details "status=$videoStatus"

  $firstBackdropStatus = Invoke-CurlStatus -Uri (Resolve-AbsoluteUrl -BaseUrl $ApiBaseUrl -RawPath $backdrops[0])
  Add-Check -Name "Primary backdrop proxy is reachable" -Passed ($firstBackdropStatus -eq 200) -Details "status=$firstBackdropStatus"

  for ($i = 1; $i -lt $backdrops.Count; $i++) {
    $status = Invoke-CurlStatus -Uri (Resolve-AbsoluteUrl -BaseUrl $ApiBaseUrl -RawPath $backdrops[$i])
    Add-Check -Name ("Backdrop index {0} proxy is reachable" -f $i) -Passed ($status -eq 200) -Details "status=$status"
  }

  $passed = @($script:Checks | Where-Object { $_.Passed }).Count
  $total = $script:Checks.Count
  Write-Host ""
  Write-Host ("Anime media smoke checks complete: {0}/{1} passed." -f $passed, $total)
} finally {
  Pop-Location
}
