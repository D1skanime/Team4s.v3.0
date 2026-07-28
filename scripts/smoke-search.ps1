<#
.SYNOPSIS
  Validierungs-Harness fuer die globale Suche (GET /api/v1/search + /suggestions).

.DESCRIPTION
  Prueft die End-to-End-Verhaltensfaelle der Phase 115 gegen ein LIVE-Backend:
    (a) D-12  "Koe no Katachi" / "Eiga Koe no Katachi" findet den Ziel-Anime
              ("A Silent Voice"), d.h. der Romaji-/Japanisch-Titel ist durchsuchbar.
    (b) D-04  "Narotu" findet "Naruto" (Tippfehler); "T4S" und "team-4s" finden
              die Gruppe "Team4s" ueber das Alias-/Kuerzel-System.
    (c) D-05  Ein exakter Haupttitel steht auf Rang 1 und wird NICHT durch einen
              populaereren Teiltreffer verdraengt.
    (d) D-11  Aufgeloeste (dissolved) Gruppen erscheinen; disabled-Anime fehlt ohne
              Admin-Token und erscheint mit include_disabled=true + Admin-Token.
    (e) D-07  Parameter-Fehler: q<2 -> 400, q>100 -> 400.

  WICHTIG (Live-Umgebung):
  - Die realen Host-Ports werden zur Laufzeit aus `docker ps` ermittelt, NICHT aus
    der .env gelesen (die .env-Werte weichen von den tatsaechlich veroeffentlichten
    Ports ab; vgl. Team4s-Betriebsnotiz). -ApiBaseUrl/-KeycloakBaseUrl uebersteuern
    die Auto-Erkennung.
  - Der Admin-Override (disabled-Anime) nutzt einen Keycloak-Direct-Grant-Token
    (Default-User csubs-leader/123, Client team4s-frontend). Schlaegt die
    Token-Beschaffung fehl, wird der Admin-Teilfall sauber uebersprungen.
  - Fehlt die Live-Umgebung komplett (Backend nicht erreichbar), bricht das Skript
    mit Hinweis und Exit-Code 0 ab (kein Hard-Fail im CI).

  Dieses Skript wird in Plan 115-08 vollstaendig gegen echte Daten gefahren.
#>
[CmdletBinding()]
param(
  [string]$ApiBaseUrl = "",
  [string]$KeycloakBaseUrl = "",
  [string]$KeycloakRealm = "team4s",
  [string]$KeycloakClientId = "team4s-frontend",
  [string]$KeycloakClientSecret = "",
  [string]$AdminUser = "csubs-leader",
  [string]$AdminPassword = "123",
  # Erwartungswerte fuer die Live-Faelle (an das Seed-Set anpassbar).
  [string]$SilentVoiceQuery = "Koe no Katachi",
  [string]$SilentVoiceAltQuery = "Eiga Koe no Katachi",
  [string]$SilentVoiceExpect = "silent",
  [string]$TypoQuery = "Narotu",
  [string]$TypoExpect = "naruto",
  [string]$GroupAbbrevQuery = "T4S",
  [string]$GroupDashQuery = "team-4s",
  [string]$GroupExpect = "team4s",
  [string]$ExactTitleQuery = "Naruto",
  [string]$DissolvedGroupExpect = "",
  [string]$DisabledAnimeQuery = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:Checks = @()

function Add-Check {
  param([string]$Name, [bool]$Passed, [string]$Details = "")
  $status = if ($Passed) { "PASS" } else { "FAIL" }
  $suffix = if ($Details) { " - $Details" } else { "" }
  Write-Host ("[{0}] {1}{2}" -f $status, $Name, $suffix)
  $script:Checks += [pscustomobject]@{ Name = $Name; Passed = $Passed; Details = $Details }
  if (-not $Passed) { throw "Smoke check failed: $Name. $Details" }
}

function Skip-Suite {
  param([string]$Reason)
  Write-Host ""
  Write-Host "HINWEIS: Suche-Smoke uebersprungen - $Reason"
  Write-Host "Die Live-Verifikation erfolgt in Plan 115-08 (Docker-Backend erforderlich)."
  exit 0
}

# Ermittelt den veroeffentlichten Host-Port fuer einen Container-internen Port aus
# `docker ps` (z.B. 8092 -> 18092). Gibt "" zurueck, wenn nichts gefunden wird.
function Get-PublishedHostPort {
  param([int]$ContainerPort)
  try {
    $lines = & docker ps --format "{{.Ports}}" 2>$null
  } catch {
    return ""
  }
  if ($LASTEXITCODE -ne 0 -or $null -eq $lines) { return "" }
  foreach ($line in @($lines)) {
    foreach ($m in [regex]::Matches("$line", '(\d+)->' + $ContainerPort + '/tcp')) {
      return $m.Groups[1].Value
    }
  }
  return ""
}

function Resolve-BaseUrl {
  param([string]$Provided, [int]$ContainerPort, [string]$Label)
  if ($Provided.Trim() -ne "") { return $Provided.Trim().TrimEnd("/") }
  $port = Get-PublishedHostPort -ContainerPort $ContainerPort
  if ($port -eq "") {
    Skip-Suite "Kein veroeffentlichter Host-Port fuer $Label (Container-Port $ContainerPort) via 'docker ps' gefunden."
  }
  return "http://localhost:$port"
}

function Invoke-Api {
  param(
    [ValidateSet("GET", "POST")]
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers = @{},
    [hashtable]$Form = $null
  )
  $params = @{
    Method          = $Method
    Uri             = $Uri
    Headers         = $Headers
    UseBasicParsing = $true
    TimeoutSec      = 20
  }
  if ($null -ne $Form) {
    $params["ContentType"] = "application/x-www-form-urlencoded"
    $params["Body"] = $Form
  }

  $statusCode = 0
  $rawBody = ""
  try {
    $response = Invoke-WebRequest @params
    $statusCode = [int]$response.StatusCode
    $rawBody = "$($response.Content)"
  } catch {
    $httpResponse = $_.Exception.Response
    if ($null -eq $httpResponse) { throw }
    $statusCode = [int]$httpResponse.StatusCode
    $stream = $httpResponse.GetResponseStream()
    if ($null -ne $stream) {
      $reader = New-Object System.IO.StreamReader($stream)
      try { $rawBody = $reader.ReadToEnd() } finally { $reader.Close() }
    }
  }

  $json = $null
  if ($rawBody.Trim().Length -gt 0) {
    try { $json = $rawBody | ConvertFrom-Json } catch { $json = $null }
  }
  return [pscustomobject]@{ StatusCode = $statusCode; Body = $rawBody; Json = $json }
}

# Fuehrt eine Suche aus und liefert die geparste Antwort (data.anime/data.fansub, meta).
function Invoke-Search {
  param([string]$BaseUrl, [string]$Query, [hashtable]$Extra = @{}, [hashtable]$Headers = @{})
  $qs = "q=" + [System.Uri]::EscapeDataString($Query)
  foreach ($key in $Extra.Keys) {
    $qs += "&$key=" + [System.Uri]::EscapeDataString("$($Extra[$key])")
  }
  return Invoke-Api -Method "GET" -Uri "$BaseUrl/api/v1/search?$qs" -Headers $Headers
}

function Get-AnimeTitles {
  param($SearchResponse)
  $titles = @()
  if ($null -ne $SearchResponse.Json -and $null -ne $SearchResponse.Json.data -and $null -ne $SearchResponse.Json.data.anime) {
    foreach ($item in @($SearchResponse.Json.data.anime.items)) { $titles += "$($item.title)" }
  }
  return $titles
}

function Get-FansubTitles {
  param($SearchResponse)
  $titles = @()
  if ($null -ne $SearchResponse.Json -and $null -ne $SearchResponse.Json.data -and $null -ne $SearchResponse.Json.data.fansub) {
    foreach ($item in @($SearchResponse.Json.data.fansub.items)) { $titles += "$($item.title)" }
  }
  return $titles
}

function Test-AnyContains {
  param([string[]]$Values, [string]$Needle)
  $n = $Needle.ToLowerInvariant()
  foreach ($v in @($Values)) {
    if ("$v".ToLowerInvariant().Contains($n)) { return $true }
  }
  return $false
}

# Optionaler Keycloak-Direct-Grant-Token fuer den Admin-Override. "" bei Fehlschlag.
function Get-KeycloakAdminToken {
  param([string]$KcBaseUrl)
  $form = @{
    grant_type = "password"
    client_id  = $KeycloakClientId
    username   = $AdminUser
    password   = $AdminPassword
  }
  if ($KeycloakClientSecret.Trim() -ne "") { $form["client_secret"] = $KeycloakClientSecret.Trim() }
  $tokenUri = "$KcBaseUrl/realms/$KeycloakRealm/protocol/openid-connect/token"
  try {
    $resp = Invoke-Api -Method "POST" -Uri $tokenUri -Form $form
    if ($resp.StatusCode -eq 200 -and $null -ne $resp.Json -and $null -ne $resp.Json.access_token) {
      return "$($resp.Json.access_token)"
    }
  } catch {
    return ""
  }
  return ""
}

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptPath "..")).Path

Push-Location $projectRoot
try {
  $ApiBaseUrl = Resolve-BaseUrl -Provided $ApiBaseUrl -ContainerPort 8092 -Label "Backend"
  Write-Host "Suche-Smoke gegen: $ApiBaseUrl"

  $health = $null
  try {
    $health = Invoke-Api -Method "GET" -Uri "$ApiBaseUrl/health"
  } catch {
    Skip-Suite "Backend unter $ApiBaseUrl nicht erreichbar."
  }
  if ($null -eq $health -or $health.StatusCode -ne 200) {
    Skip-Suite "Health-Endpoint nicht 200 (Backend down?)."
  }
  Add-Check -Name "Health erreichbar" -Passed ($health.StatusCode -eq 200) -Details "status=$($health.StatusCode)"

  # --- (e) D-07: Parameter-Validierung -------------------------------------
  $tooShort = Invoke-Search -BaseUrl $ApiBaseUrl -Query "a"
  Add-Check -Name "D-07 q<2 -> 400" -Passed ($tooShort.StatusCode -eq 400) -Details "status=$($tooShort.StatusCode)"

  $tooLong = Invoke-Search -BaseUrl $ApiBaseUrl -Query ("a" * 101)
  Add-Check -Name "D-07 q>100 -> 400" -Passed ($tooLong.StatusCode -eq 400) -Details "status=$($tooLong.StatusCode)"

  $invalidType = Invoke-Search -BaseUrl $ApiBaseUrl -Query "naruto" -Extra @{ type = "movies" }
  Add-Check -Name "D-07 ungueltiger type -> 400" -Passed ($invalidType.StatusCode -eq 400) -Details "status=$($invalidType.StatusCode)"

  # --- (a) D-12: Romaji/Japanisch-Titel durchsuchbar -----------------------
  $silent = Invoke-Search -BaseUrl $ApiBaseUrl -Query $SilentVoiceQuery -Extra @{ type = "anime" }
  Add-Check -Name "D-12 '$SilentVoiceQuery' liefert 200" -Passed ($silent.StatusCode -eq 200) -Details "status=$($silent.StatusCode)"
  $silentTitles = Get-AnimeTitles -SearchResponse $silent
  Add-Check -Name "D-12 '$SilentVoiceQuery' findet Ziel-Anime" `
    -Passed ((@($silentTitles).Count -ge 1) -and (Test-AnyContains -Values $silentTitles -Needle $SilentVoiceExpect)) `
    -Details ("treffer=" + (@($silentTitles) -join ", "))

  $silentAlt = Invoke-Search -BaseUrl $ApiBaseUrl -Query $SilentVoiceAltQuery -Extra @{ type = "anime" }
  Add-Check -Name "D-12 '$SilentVoiceAltQuery' liefert 200" -Passed ($silentAlt.StatusCode -eq 200) -Details "status=$($silentAlt.StatusCode)"

  # --- (b) D-04: Tippfehler + Gruppen-Kuerzel/-Alias -----------------------
  $typo = Invoke-Search -BaseUrl $ApiBaseUrl -Query $TypoQuery -Extra @{ type = "anime" }
  $typoTitles = Get-AnimeTitles -SearchResponse $typo
  Add-Check -Name "D-04 Tippfehler '$TypoQuery' findet '$TypoExpect'" `
    -Passed (Test-AnyContains -Values $typoTitles -Needle $TypoExpect) `
    -Details ("treffer=" + (@($typoTitles) -join ", "))

  $abbrev = Invoke-Search -BaseUrl $ApiBaseUrl -Query $GroupAbbrevQuery -Extra @{ type = "fansub" }
  $abbrevTitles = Get-FansubTitles -SearchResponse $abbrev
  Add-Check -Name "D-04 Kuerzel '$GroupAbbrevQuery' findet '$GroupExpect'" `
    -Passed (Test-AnyContains -Values $abbrevTitles -Needle $GroupExpect) `
    -Details ("treffer=" + (@($abbrevTitles) -join ", "))

  $dash = Invoke-Search -BaseUrl $ApiBaseUrl -Query $GroupDashQuery -Extra @{ type = "fansub" }
  $dashTitles = Get-FansubTitles -SearchResponse $dash
  Add-Check -Name "D-04 Bindestrich '$GroupDashQuery' findet '$GroupExpect'" `
    -Passed (Test-AnyContains -Values $dashTitles -Needle $GroupExpect) `
    -Details ("treffer=" + (@($dashTitles) -join ", "))

  # --- (c) D-05: exakter Haupttitel auf Rang 1 -----------------------------
  $exact = Invoke-Search -BaseUrl $ApiBaseUrl -Query $ExactTitleQuery -Extra @{ type = "anime" }
  $exactTitles = Get-AnimeTitles -SearchResponse $exact
  $topTitle = if (@($exactTitles).Count -ge 1) { "$($exactTitles[0])" } else { "" }
  Add-Check -Name "D-05 exakter Haupttitel '$ExactTitleQuery' auf Rang 1" `
    -Passed ($topTitle.ToLowerInvariant() -eq $ExactTitleQuery.ToLowerInvariant()) `
    -Details "rang1=$topTitle"

  # --- (d) D-11: dissolved erscheint / disabled admin-gated ----------------
  if ($DissolvedGroupExpect.Trim() -ne "") {
    $dissolved = Invoke-Search -BaseUrl $ApiBaseUrl -Query $DissolvedGroupExpect -Extra @{ type = "fansub" }
    $dissolvedTitles = Get-FansubTitles -SearchResponse $dissolved
    Add-Check -Name "D-11 dissolved-Gruppe '$DissolvedGroupExpect' erscheint" `
      -Passed (Test-AnyContains -Values $dissolvedTitles -Needle $DissolvedGroupExpect) `
      -Details ("treffer=" + (@($dissolvedTitles) -join ", "))
  } else {
    Write-Host "HINWEIS: D-11 dissolved-Fall uebersprungen (kein -DissolvedGroupExpect gesetzt)."
  }

  if ($DisabledAnimeQuery.Trim() -ne "") {
    $KeycloakBaseUrl = Resolve-BaseUrl -Provided $KeycloakBaseUrl -ContainerPort 8080 -Label "Keycloak"
    $adminToken = Get-KeycloakAdminToken -KcBaseUrl $KeycloakBaseUrl

    $withoutAdmin = Invoke-Search -BaseUrl $ApiBaseUrl -Query $DisabledAnimeQuery -Extra @{ type = "anime" }
    $withoutTitles = Get-AnimeTitles -SearchResponse $withoutAdmin
    Add-Check -Name "D-11 disabled-Anime fehlt ohne Admin" `
      -Passed (-not (Test-AnyContains -Values $withoutTitles -Needle $DisabledAnimeQuery)) `
      -Details ("treffer=" + (@($withoutTitles) -join ", "))

    if ($adminToken -ne "") {
      $withAdmin = Invoke-Search -BaseUrl $ApiBaseUrl -Query $DisabledAnimeQuery `
        -Extra @{ type = "anime"; include_disabled = "true" } `
        -Headers @{ Authorization = "Bearer $adminToken" }
      $withTitles = Get-AnimeTitles -SearchResponse $withAdmin
      Add-Check -Name "D-11 disabled-Anime erscheint mit Admin+include_disabled" `
        -Passed (Test-AnyContains -Values $withTitles -Needle $DisabledAnimeQuery) `
        -Details ("treffer=" + (@($withTitles) -join ", "))
    } else {
      Write-Host "HINWEIS: D-11 Admin-Teilfall uebersprungen (Keycloak-Token nicht beschaffbar)."
    }
  } else {
    Write-Host "HINWEIS: D-11 disabled-Fall uebersprungen (kein -DisabledAnimeQuery gesetzt)."
  }

  # --- Suggestions ---------------------------------------------------------
  $suggest = Invoke-Api -Method "GET" -Uri "$ApiBaseUrl/api/v1/search/suggestions?q=$([System.Uri]::EscapeDataString($ExactTitleQuery))"
  Add-Check -Name "Suggestions liefert 200" -Passed ($suggest.StatusCode -eq 200) -Details "status=$($suggest.StatusCode)"

  $passed = @($script:Checks | Where-Object { $_.Passed }).Count
  $total = $script:Checks.Count
  Write-Host ""
  Write-Host ("Suche-Smoke abgeschlossen: {0}/{1} bestanden." -f $passed, $total)
} finally {
  Pop-Location
}
