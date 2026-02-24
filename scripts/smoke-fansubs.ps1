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
    [ValidateSet("GET", "POST", "PATCH", "DELETE")]
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
  Write-Host "Running fansub smoke checks in $projectRoot"
  Write-Host "API base URL: $ApiBaseUrl"

  $health = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/health"
  Add-Check -Name "Health endpoint is reachable" -Passed ($health.StatusCode -eq 200) -Details "status=$($health.StatusCode)"

  $secret = Get-AuthSecret -ProvidedSecret $AuthTokenSecret
  Add-Check -Name "Auth secret resolved" -Passed ($secret -ne "")

  $adminBootstrapToken = New-SignedBootstrapToken -UserID $AdminUserID -DisplayName "FansubSmokeAdmin" -Secret $secret
  $nonAdminBootstrapToken = New-SignedBootstrapToken -UserID $NonAdminUserID -DisplayName "FansubSmokeUser" -Secret $secret
  Add-Check -Name "Bootstrap tokens generated" -Passed ($adminBootstrapToken.Trim() -ne "" -and $nonAdminBootstrapToken.Trim() -ne "")

  $adminSession = Issue-AuthSession -BaseUrl $ApiBaseUrl -BootstrapToken $adminBootstrapToken
  $nonAdminSession = Issue-AuthSession -BaseUrl $ApiBaseUrl -BootstrapToken $nonAdminBootstrapToken

  $animeList = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/anime?page=1&per_page=1"
  Add-Check -Name "Anime list returns 200" -Passed ($animeList.StatusCode -eq 200) -Details "status=$($animeList.StatusCode)"
  Add-Check -Name "Anime list provides at least one item" -Passed ($null -ne $animeList.Json.data -and $animeList.Json.data.Count -ge 1)
  $animeID = [int64]$animeList.Json.data[0].id
  Add-Check -Name "Anime id available for fansub smoke checks" -Passed ($animeID -gt 0) -Details "anime_id=$animeID"

  $fansubListBefore = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/fansubs?page=1&per_page=1"
  Add-Check -Name "Fansub list returns 200" -Passed ($fansubListBefore.StatusCode -eq 200) -Details "status=$($fansubListBefore.StatusCode)"

  $createUnauthorized = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/fansubs" -Body @{
    slug   = "unauth-check"
    name   = "Unauth Check"
    status = "active"
  }
  Add-Check -Name "Fansub create without auth returns 401" -Passed ($createUnauthorized.StatusCode -eq 401) -Details "status=$($createUnauthorized.StatusCode)"

  $createForbidden = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/fansubs" -Headers @{
    Authorization = "Bearer $($nonAdminSession.access_token)"
  } -Body @{
    slug   = "forbidden-check"
    name   = "Forbidden Check"
    status = "active"
  }
  Add-Check -Name "Fansub create with non-admin returns 403" -Passed ($createForbidden.StatusCode -eq 403) -Details "status=$($createForbidden.StatusCode)"

  $stamp = Get-Date -Format "yyyyMMddHHmmssfff"
  $slug = "smoke-fansub-$stamp"
  $name = "Smoke Fansub $stamp"

  $createdFansub = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/fansubs" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    slug   = $slug
    name   = $name
    status = "active"
    country = "DE"
  }
  Add-Check -Name "Admin fansub create returns 201" -Passed ($createdFansub.StatusCode -eq 201) -Details "status=$($createdFansub.StatusCode)"
  $fansubID = [int64]$createdFansub.Json.data.id
  Add-Check -Name "Created fansub id is available" -Passed ($fansubID -gt 0) -Details "fansub_id=$fansubID"

  $getByID = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/fansubs/$fansubID"
  Add-Check -Name "Fansub get-by-id returns 200" -Passed ($getByID.StatusCode -eq 200) -Details "status=$($getByID.StatusCode)"

  $getBySlug = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/fansub-slugs/$slug"
  Add-Check -Name "Fansub get-by-slug returns 200" -Passed ($getBySlug.StatusCode -eq 200) -Details "status=$($getBySlug.StatusCode)"

  $patchedFansub = Invoke-ApiRequest -Method "PATCH" -Uri "$ApiBaseUrl/api/v1/fansubs/$fansubID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    name = "$name (patched)"
  }
  Add-Check -Name "Fansub patch returns 200" -Passed ($patchedFansub.StatusCode -eq 200) -Details "status=$($patchedFansub.StatusCode)"
  Add-Check -Name "Fansub patch reflected" -Passed ("$($patchedFansub.Json.data.name)" -like "*patched*")

  $collabSlug = "smoke-collab-$stamp"
  $collabName = "Smoke Collaboration $stamp"
  $createdCollaboration = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/fansubs" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    slug       = $collabSlug
    name       = $collabName
    status     = "active"
    group_type = "collaboration"
  }
  Add-Check -Name "Collaboration group create returns 201" -Passed ($createdCollaboration.StatusCode -eq 201) -Details "status=$($createdCollaboration.StatusCode)"
  $collaborationID = [int64]$createdCollaboration.Json.data.id
  Add-Check -Name "Created collaboration id is available" -Passed ($collaborationID -gt 0) -Details "collaboration_id=$collaborationID"

  $collabMembersInitial = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/fansubs/$collaborationID/collaboration-members"
  Add-Check -Name "Collaboration members list returns 200" -Passed ($collabMembersInitial.StatusCode -eq 200) -Details "status=$($collabMembersInitial.StatusCode)"
  Add-Check -Name "Collaboration members starts empty" -Passed (@($collabMembersInitial.Json.data).Count -eq 0)

  $addCollabMemberForbidden = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/fansubs/$collaborationID/collaboration-members" -Headers @{
    Authorization = "Bearer $($nonAdminSession.access_token)"
  } -Body @{
    member_group_id = $fansubID
  }
  Add-Check -Name "Collaboration member add with non-admin returns 403" -Passed ($addCollabMemberForbidden.StatusCode -eq 403) -Details "status=$($addCollabMemberForbidden.StatusCode)"

  $addCollabMember = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/fansubs/$collaborationID/collaboration-members" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    member_group_id = $fansubID
  }
  Add-Check -Name "Collaboration member add returns 201" -Passed ($addCollabMember.StatusCode -eq 201) -Details "status=$($addCollabMember.StatusCode)"

  $collabMembersAfterAdd = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/fansubs/$collaborationID/collaboration-members"
  Add-Check -Name "Added collaboration member appears in list" -Passed (@($collabMembersAfterAdd.Json.data | Where-Object { [int64]$_.member_group_id -eq $fansubID }).Count -eq 1)

  $removeCollabMember = Invoke-ApiRequest -Method "DELETE" -Uri "$ApiBaseUrl/api/v1/fansubs/$collaborationID/collaboration-members/$fansubID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  }
  Add-Check -Name "Collaboration member delete returns 204" -Passed ($removeCollabMember.StatusCode -eq 204) -Details "status=$($removeCollabMember.StatusCode)"

  $collabMembersAfterDelete = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/fansubs/$collaborationID/collaboration-members"
  Add-Check -Name "Collaboration members empty after delete" -Passed (@($collabMembersAfterDelete.Json.data).Count -eq 0)

  $deleteCollaboration = Invoke-ApiRequest -Method "DELETE" -Uri "$ApiBaseUrl/api/v1/fansubs/$collaborationID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  }
  Add-Check -Name "Collaboration group delete returns 204" -Passed ($deleteCollaboration.StatusCode -eq 204) -Details "status=$($deleteCollaboration.StatusCode)"

  $createdMember = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/fansubs/$fansubID/members" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    handle = "SmokeMember-$stamp"
    role   = "translator"
  }
  Add-Check -Name "Fansub member create returns 201" -Passed ($createdMember.StatusCode -eq 201) -Details "status=$($createdMember.StatusCode)"
  $memberID = [int64]$createdMember.Json.data.id
  Add-Check -Name "Created member id is available" -Passed ($memberID -gt 0) -Details "member_id=$memberID"

  $patchedMember = Invoke-ApiRequest -Method "PATCH" -Uri "$ApiBaseUrl/api/v1/fansubs/$fansubID/members/$memberID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    role = "timer"
  }
  Add-Check -Name "Fansub member patch returns 200" -Passed ($patchedMember.StatusCode -eq 200) -Details "status=$($patchedMember.StatusCode)"
  Add-Check -Name "Fansub member patch reflected" -Passed ("$($patchedMember.Json.data.role)" -eq "timer")

  $membersList = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/fansubs/$fansubID/members"
  Add-Check -Name "Fansub members list returns 200" -Passed ($membersList.StatusCode -eq 200) -Details "status=$($membersList.StatusCode)"
  $memberFound = @($membersList.Json.data | Where-Object { [int64]$_.id -eq $memberID }).Count -eq 1
  Add-Check -Name "Created member appears in members list" -Passed $memberFound

  $attached = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/anime/$animeID/fansubs/$fansubID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    is_primary = $true
    notes      = "smoke attach"
  }
  Add-Check -Name "Anime-fansub attach returns 201" -Passed ($attached.StatusCode -eq 201) -Details "status=$($attached.StatusCode)"

  $animeFansubs = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/anime/$animeID/fansubs"
  Add-Check -Name "Anime-fansub list returns 200" -Passed ($animeFansubs.StatusCode -eq 200) -Details "status=$($animeFansubs.StatusCode)"
  $attachedFound = @($animeFansubs.Json.data | Where-Object { [int64]$_.fansub_group_id -eq $fansubID }).Count -eq 1
  Add-Check -Name "Attached fansub appears in anime-fansub list" -Passed $attachedFound

  $createdVersion = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/anime/$animeID/episodes/1/versions" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  } -Body @{
    title           = "Smoke Release $stamp"
    fansub_group_id = $fansubID
    media_provider  = "emby"
    media_item_id   = "smoke-item-$stamp"
    video_quality   = "1080p"
    subtitle_type   = "softsub"
    stream_url      = "$ApiBaseUrl/health"
  }
  Add-Check -Name "Episode version create returns 201" -Passed ($createdVersion.StatusCode -eq 201) -Details "status=$($createdVersion.StatusCode)"
  $versionID = [int64]$createdVersion.Json.data.id
  Add-Check -Name "Created episode version id is available" -Passed ($versionID -gt 0) -Details "version_id=$versionID"

  $groupedEpisodes = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/anime/$animeID/episodes"
  Add-Check -Name "Grouped episodes list returns 200" -Passed ($groupedEpisodes.StatusCode -eq 200) -Details "status=$($groupedEpisodes.StatusCode)"
  $versionFound = $false
  foreach ($group in @($groupedEpisodes.Json.data.episodes)) {
    if ($null -eq $group.versions) {
      continue
    }
    if (@($group.versions | Where-Object { [int64]$_.id -eq $versionID }).Count -gt 0) {
      $versionFound = $true
      break
    }
  }
  Add-Check -Name "Created version appears in grouped episodes" -Passed $versionFound

  $streamNoAuth = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/releases/$versionID/stream"
  Add-Check -Name "Release stream without auth returns 401" -Passed ($streamNoAuth.StatusCode -eq 401) -Details "status=$($streamNoAuth.StatusCode)"

  $grantNoAuth = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/releases/$versionID/grant"
  Add-Check -Name "Release stream grant without auth returns 401" -Passed ($grantNoAuth.StatusCode -eq 401) -Details "status=$($grantNoAuth.StatusCode)"

  $grantWithAuth = Invoke-ApiRequest -Method "POST" -Uri "$ApiBaseUrl/api/v1/releases/$versionID/grant" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  }
  Add-Check -Name "Release stream grant with auth returns 201" -Passed ($grantWithAuth.StatusCode -eq 201) -Details "status=$($grantWithAuth.StatusCode)"
  $grantToken = "$($grantWithAuth.Json.data.grant_token)".Trim()
  Add-Check -Name "Release stream grant token is present" -Passed ($grantToken -ne "")

  $streamWithGrant = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/releases/$versionID/stream?grant=$([System.Uri]::EscapeDataString($grantToken))"
  Add-Check -Name "Release stream with grant returns 200" -Passed ($streamWithGrant.StatusCode -eq 200) -Details "status=$($streamWithGrant.StatusCode)"

  $streamWithAuth = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/releases/$versionID/stream" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  }
  Add-Check -Name "Release stream with auth returns 200" -Passed ($streamWithAuth.StatusCode -eq 200) -Details "status=$($streamWithAuth.StatusCode)"

  $deleteMember = Invoke-ApiRequest -Method "DELETE" -Uri "$ApiBaseUrl/api/v1/fansubs/$fansubID/members/$memberID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  }
  Add-Check -Name "Fansub member delete returns 204" -Passed ($deleteMember.StatusCode -eq 204) -Details "status=$($deleteMember.StatusCode)"

  $deleteFansub = Invoke-ApiRequest -Method "DELETE" -Uri "$ApiBaseUrl/api/v1/fansubs/$fansubID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  }
  Add-Check -Name "Fansub delete returns 204" -Passed ($deleteFansub.StatusCode -eq 204) -Details "status=$($deleteFansub.StatusCode)"

  $getDeletedFansub = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/fansubs/$fansubID"
  Add-Check -Name "Deleted fansub returns 404" -Passed ($getDeletedFansub.StatusCode -eq 404) -Details "status=$($getDeletedFansub.StatusCode)"

  $groupedAfterFansubDelete = Invoke-ApiRequest -Method "GET" -Uri "$ApiBaseUrl/api/v1/anime/$animeID/episodes"
  Add-Check -Name "Grouped episodes after fansub delete returns 200" -Passed ($groupedAfterFansubDelete.StatusCode -eq 200) -Details "status=$($groupedAfterFansubDelete.StatusCode)"
  $versionStillExists = $false
  $versionDetachedFromFansub = $false
  foreach ($group in @($groupedAfterFansubDelete.Json.data.episodes)) {
    if ($null -eq $group.versions) {
      continue
    }
    foreach ($version in @($group.versions)) {
      if ([int64]$version.id -eq $versionID) {
        $versionStillExists = $true
        $hasFansubGroupProperty = $version.PSObject.Properties.Match("fansub_group").Count -gt 0
        $versionDetachedFromFansub = (-not $hasFansubGroupProperty) -or ($null -eq $version.fansub_group)
        break
      }
    }
    if ($versionStillExists) {
      break
    }
  }
  Add-Check -Name "Episode version remains after fansub delete" -Passed $versionStillExists
  Add-Check -Name "Episode version fansub_group is null after fansub delete" -Passed $versionDetachedFromFansub

  $detachFansubAfterDelete = Invoke-ApiRequest -Method "DELETE" -Uri "$ApiBaseUrl/api/v1/anime/$animeID/fansubs/$fansubID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  }
  Add-Check -Name "Anime-fansub detach after fansub delete returns 404" -Passed ($detachFansubAfterDelete.StatusCode -eq 404) -Details "status=$($detachFansubAfterDelete.StatusCode)"

  $deleteVersion = Invoke-ApiRequest -Method "DELETE" -Uri "$ApiBaseUrl/api/v1/episode-versions/$versionID" -Headers @{
    Authorization = "Bearer $($adminSession.access_token)"
  }
  Add-Check -Name "Episode version delete returns 204" -Passed ($deleteVersion.StatusCode -eq 204) -Details "status=$($deleteVersion.StatusCode)"

  $passed = @($script:Checks | Where-Object { $_.Passed }).Count
  $total = $script:Checks.Count
  Write-Host ""
  Write-Host ("Fansub smoke checks complete: {0}/{1} passed." -f $passed, $total)
} finally {
  Pop-Location
}
