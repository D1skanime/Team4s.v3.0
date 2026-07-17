[CmdletBinding()]
param(
  [string]$KeycloakBaseUrl = $(if ($env:NEXT_PUBLIC_KEYCLOAK_BASE_URL) { $env:NEXT_PUBLIC_KEYCLOAK_BASE_URL } else { "http://127.0.0.1:18081" }),
  [string]$Realm = "team4s",
  [string]$RealmJsonPath = "infra/keycloak/realm-team4s.json",
  [string]$AdminUser = $(if ($env:KEYCLOAK_ADMIN) { $env:KEYCLOAK_ADMIN } else { "admin" }),
  [string]$AdminPassword = $(if ($env:KEYCLOAK_ADMIN_PASSWORD) { $env:KEYCLOAK_ADMIN_PASSWORD } else { "admin" }),
  [string]$FrontendClientId = "team4s-frontend",
  [string]$VerifyUsername = "kc-verify-account-console",
  [string]$VerifyPassword = "123",
  [switch]$SkipApply,
  [switch]$SkipLiveCheck
)

# Purpose: verify (and, unless -SkipApply is passed, idempotently repair) the local
# Keycloak realm configuration behind the Phase 104 Account Console 403 fix.
#
# Root cause (evidence-backed, see 104-01-SUMMARY.md and
# docs/operations/keycloak-auth-foundation-phase43.md):
#   1. infra/keycloak/realm-team4s.json declares a custom `clientScopes` list that
#      does not include Keycloak's built-in `roles` scope. Keycloak's realm import
#      treats a provided `clientScopes` list as authoritative and skips creating the
#      standard `roles` scope, so no token in this realm ever carries
#      `realm_access`/`resource_access` claims.
#   2. The built-in `account`/`account-console` clients (auto-bootstrapped by
#      Keycloak because they are intentionally NOT redeclared in the realm JSON --
#      redeclaring them was proven to suppress Keycloak's own default-role/composite
#      bootstrap for the `account` client roles) therefore never get `roles` in
#      their `defaultClientScopes`. Their issued tokens carry no
#      `resource_access.account.roles`, so the built-in Account REST API
#      (`/realms/{realm}/account`, `/account/credentials`, ...) rejects every
#      request with HTTP 403, because it cannot see the `manage-account`/
#      `view-profile` client roles that ARE actually granted to the user via the
#      realm's `default-roles-{realm}` composite.
#
# Fix: (a) infra/keycloak/realm-team4s.json now declares the standard `roles`
# client scope (with its three default protocol mappers), so a fresh import gets
# it automatically and Keycloak's own bootstrap correctly wires
# `default-roles-{realm}` to include the `account` client's `view-profile`/
# `manage-account` roles. (b) Because a custom `clientScopes` list also prevents
# Keycloak from auto-assigning `roles` as a *default* scope to the built-in
# `account`/`account-console` clients, this script performs that one remaining
# assignment via the Admin REST API. This step is idempotent and identical for a
# freshly imported realm and an already-populated local volume.

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
    throw "Keycloak config check failed: $Name. $Details"
  }
}

function Invoke-JsonRequest {
  param(
    [ValidateSet("GET", "POST", "PUT", "DELETE")]
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers = @{},
    [object]$Body = $null,
    [string]$ContentType = "application/json"
  )

  $requestParams = @{
    Method          = $Method
    Uri             = $Uri
    Headers         = $Headers
    UseBasicParsing = $true
    TimeoutSec      = 20
  }

  if ($null -ne $Body) {
    $requestParams["ContentType"] = $ContentType
    $requestParams["Body"] = $Body
  }

  $statusCode = 0
  $rawBody = ""

  try {
    $response = Invoke-WebRequest @requestParams
    $statusCode = [int]$response.StatusCode
    $rawBody = "$($response.Content)"
  } catch {
    $httpResponse = $_.Exception.Response
    if ($null -eq $httpResponse) {
      throw
    }
    $statusCode = [int]$httpResponse.StatusCode
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
    Body       = $rawBody
    Json       = $jsonBody
  }
}

function Get-AdminToken {
  param([string]$BaseUrl, [string]$User, [string]$Password)

  $bodyParams = @{
    client_id  = "admin-cli"
    username   = $User
    password   = $Password
    grant_type = "password"
  }
  $bodyString = ($bodyParams.GetEnumerator() | ForEach-Object { "$($_.Key)=$([uri]::EscapeDataString($_.Value))" }) -join "&"

  $response = Invoke-JsonRequest -Method "POST" -Uri "$BaseUrl/realms/master/protocol/openid-connect/token" -Body $bodyString -ContentType "application/x-www-form-urlencoded"
  if ($response.StatusCode -ne 200 -or $null -eq $response.Json.access_token) {
    throw "Failed to obtain Keycloak admin token (status=$($response.StatusCode))."
  }
  return "$($response.Json.access_token)"
}

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptPath "..")).Path

Push-Location $projectRoot
try {
  Write-Host "Verifying Keycloak realm config against $KeycloakBaseUrl (realm=$Realm)"
  Write-Host "Realm JSON: $RealmJsonPath`n"

  # ---------------------------------------------------------------------
  # 1. Static assertions against the versioned realm JSON.
  # ---------------------------------------------------------------------
  Write-Host "[Static realm JSON assertions]"
  $realmJsonFullPath = Resolve-Path $RealmJsonPath
  $realmConfig = Get-Content -Raw -Path $realmJsonFullPath | ConvertFrom-Json

  Add-Check -Name "registrationAllowed is true" -Passed ($realmConfig.registrationAllowed -eq $true)
  Add-Check -Name "resetPasswordAllowed is true" -Passed ($realmConfig.resetPasswordAllowed -eq $true)
  $passwordPolicy = $realmConfig.PSObject.Properties["passwordPolicy"]
  Add-Check -Name "No password policy configured (D-11: local password '123' stays valid)" -Passed (($null -eq $passwordPolicy) -or [string]::IsNullOrEmpty($passwordPolicy.Value))
  $bruteForce = $realmConfig.PSObject.Properties["bruteForceProtected"]
  Add-Check -Name "bruteForceProtected is not enabled (D-12)" -Passed (($null -eq $bruteForce) -or ($bruteForce.Value -ne $true))
  $verifyEmail = $realmConfig.PSObject.Properties["verifyEmail"]
  Add-Check -Name "verifyEmail is not enforced (D-14)" -Passed (($null -eq $verifyEmail) -or ($verifyEmail.Value -ne $true))

  $frontendClient = $realmConfig.clients | Where-Object { $_.clientId -eq $FrontendClientId }
  Add-Check -Name "$FrontendClientId is declared in realm JSON" -Passed ($null -ne $frontendClient)
  Add-Check -Name "$FrontendClientId.directAccessGrantsEnabled is true (D-13, local test scripts)" -Passed ($frontendClient.directAccessGrantsEnabled -eq $true)

  $userRole = $realmConfig.roles.realm | Where-Object { $_.name -eq "user" }
  Add-Check -Name "Realm role 'user' still exists as a plain local login role (D-15: never auto-mapped to Team4s authorization)" -Passed ($null -ne $userRole)
  Add-Check -Name "Realm JSON does not declare an explicit defaultRole/composite override (D-15)" -Passed ($null -eq ($realmConfig.PSObject.Properties["defaultRole"])) -Details "Keycloak-managed default-roles-$Realm is intentionally not redeclared in JSON so Keycloak bootstraps its own account-client composites."

  $rolesScope = $realmConfig.clientScopes | Where-Object { $_.name -eq "roles" }
  Add-Check -Name "Built-in 'roles' client scope is declared in realm JSON" -Passed ($null -ne $rolesScope) -Details "Fixes Account Console 403: without it no token in this realm carries realm_access/resource_access claims."
  if ($null -ne $rolesScope) {
    $mapperNames = @($rolesScope.protocolMappers | ForEach-Object { $_.name })
    Add-Check -Name "'roles' scope has 'realm roles' and 'client roles' and 'audience resolve' mappers" -Passed (
      ($mapperNames -contains "realm roles") -and ($mapperNames -contains "client roles") -and ($mapperNames -contains "audience resolve")
    ) -Details "mappers=$($mapperNames -join ', ')"
  }

  $accountClientDeclared = $realmConfig.clients | Where-Object { $_.clientId -eq "account" -or $_.clientId -eq "account-console" }
  Add-Check -Name "Built-in 'account'/'account-console' clients are NOT redeclared in realm JSON" -Passed ($null -eq $accountClientDeclared) -Details "Redeclaring them was proven (live fresh-import test) to suppress Keycloak's own bootstrap of the account client's view-profile/manage-account roles and default-roles-$Realm composite."

  # ---------------------------------------------------------------------
  # 2. docker-compose.yml sanity (rendered config must be parseable).
  # ---------------------------------------------------------------------
  Write-Host "`n[docker compose config]"
  $composeOutput = & docker compose config 2>&1
  $composeDetails = ($composeOutput | Select-Object -Last 5) -join "; "
  Add-Check -Name "docker compose config parses without error" -Passed ($LASTEXITCODE -eq 0) -Details $composeDetails

  if ($SkipApply -and $SkipLiveCheck) {
    Write-Host "`n-SkipApply and -SkipLiveCheck set: static checks only."
    $passedCount = ($script:Checks | Where-Object { $_.Passed }).Count
    $totalCount = $script:Checks.Count
    Write-Host "`nKeycloak config checks completed: $passedCount/$totalCount passed."
    return
  }

  # ---------------------------------------------------------------------
  # 3. Live realm state: idempotently apply the remaining fix (unless
  #    -SkipApply), then verify the Account Console no longer returns 403.
  # ---------------------------------------------------------------------
  Write-Host "`n[Live Keycloak realm state]"
  $adminToken = Get-AdminToken -BaseUrl $KeycloakBaseUrl -User $AdminUser -Password $AdminPassword
  Add-Check -Name "Obtained Keycloak admin token" -Passed ($adminToken.Trim() -ne "")
  $adminHeaders = @{ Authorization = "Bearer $adminToken" }

  $scopesResp = Invoke-JsonRequest -Method "GET" -Uri "$KeycloakBaseUrl/admin/realms/$Realm/client-scopes" -Headers $adminHeaders
  Add-Check -Name "Fetched live client-scopes list" -Passed ($scopesResp.StatusCode -eq 200)
  $liveRolesScope = $scopesResp.Json | Where-Object { $_.name -eq "roles" }

  if ($null -eq $liveRolesScope -and -not $SkipApply) {
    Write-Host "Creating missing 'roles' client scope on live realm (idempotent apply)..."
    $scopeBody = @{
      name        = "roles"
      description = "OpenID Connect scope for add user roles to the access token"
      protocol    = "openid-connect"
      attributes  = @{
        "include.in.token.scope"    = "false"
        "display.on.consent.screen" = "true"
        "consent.screen.text"       = '${rolesScopeConsentText}'
      }
    } | ConvertTo-Json -Depth 5
    $createResp = Invoke-JsonRequest -Method "POST" -Uri "$KeycloakBaseUrl/admin/realms/$Realm/client-scopes" -Headers $adminHeaders -Body $scopeBody
    Add-Check -Name "Created 'roles' client scope" -Passed ($createResp.StatusCode -eq 201) -Details "status=$($createResp.StatusCode)"

    $scopesResp = Invoke-JsonRequest -Method "GET" -Uri "$KeycloakBaseUrl/admin/realms/$Realm/client-scopes" -Headers $adminHeaders
    $liveRolesScope = $scopesResp.Json | Where-Object { $_.name -eq "roles" }

    $mappers = @(
      @{ name = "audience resolve"; protocolMapper = "oidc-audience-resolve-mapper"; config = @{} },
      @{ name = "realm roles"; protocolMapper = "oidc-usermodel-realm-role-mapper"; config = @{
          "user.attribute" = "foo"; "access.token.claim" = "true"; "id.token.claim" = "false"
          "claim.name" = "realm_access.roles"; "jsonType.label" = "String"; "multivalued" = "true"
          "introspection.token.claim" = "true"
        }
      },
      @{ name = "client roles"; protocolMapper = "oidc-usermodel-client-role-mapper"; config = @{
          "user.attribute" = "foo"; "access.token.claim" = "true"; "id.token.claim" = "false"
          "claim.name" = 'resource_access.${client_id}.roles'; "jsonType.label" = "String"; "multivalued" = "true"
          "introspection.token.claim" = "true"
        }
      }
    )
    foreach ($mapper in $mappers) {
      $mapperBody = ($mapper + @{ protocol = "openid-connect"; consentRequired = $false }) | ConvertTo-Json -Depth 5
      $mapperResp = Invoke-JsonRequest -Method "POST" -Uri "$KeycloakBaseUrl/admin/realms/$Realm/client-scopes/$($liveRolesScope.id)/protocol-mappers/models" -Headers $adminHeaders -Body $mapperBody
      Add-Check -Name "Created '$($mapper.name)' protocol mapper on 'roles' scope" -Passed ($mapperResp.StatusCode -eq 201) -Details "status=$($mapperResp.StatusCode)"
    }
  } else {
    Add-Check -Name "'roles' client scope exists on live realm" -Passed ($null -ne $liveRolesScope)
  }

  $clientsResp = Invoke-JsonRequest -Method "GET" -Uri "$KeycloakBaseUrl/admin/realms/$Realm/clients" -Headers $adminHeaders
  Add-Check -Name "Fetched live clients list" -Passed ($clientsResp.StatusCode -eq 200)
  $accountClient = $clientsResp.Json | Where-Object { $_.clientId -eq "account" }
  $accountConsoleClient = $clientsResp.Json | Where-Object { $_.clientId -eq "account-console" }
  Add-Check -Name "Built-in 'account' client exists on live realm" -Passed ($null -ne $accountClient)
  Add-Check -Name "Built-in 'account-console' client exists on live realm" -Passed ($null -ne $accountConsoleClient)

  foreach ($client in @($accountClient, $accountConsoleClient)) {
    $hasRolesScope = @($client.defaultClientScopes) -contains "roles"
    if (-not $hasRolesScope -and -not $SkipApply) {
      Write-Host "Assigning 'roles' as a default client scope on '$($client.clientId)' (idempotent apply)..."
      $assignResp = Invoke-JsonRequest -Method "PUT" -Uri "$KeycloakBaseUrl/admin/realms/$Realm/clients/$($client.id)/default-client-scopes/$($liveRolesScope.id)" -Headers $adminHeaders
      Add-Check -Name "Assigned 'roles' default scope to '$($client.clientId)'" -Passed (@(200, 204) -contains $assignResp.StatusCode) -Details "status=$($assignResp.StatusCode)"
    } else {
      Add-Check -Name "'$($client.clientId)' has 'roles' in defaultClientScopes" -Passed $hasRolesScope
    }
  }

  $defaultRoleComposites = Invoke-JsonRequest -Method "GET" -Uri "$KeycloakBaseUrl/admin/realms/$Realm/roles/default-roles-$Realm/composites" -Headers $adminHeaders
  $compositeNames = @($defaultRoleComposites.Json | ForEach-Object { $_.name })
  Add-Check -Name "default-roles-$Realm includes 'view-profile' and 'manage-account' (Keycloak's own account bootstrap)" -Passed (
    ($compositeNames -contains "view-profile") -and ($compositeNames -contains "manage-account")
  ) -Details "composites=$($compositeNames -join ', ')"

  # ---------------------------------------------------------------------
  # 4. Live no-403 proof: full PKCE login against account-console, then
  #    call the Account REST API exactly like the SPA does.
  # ---------------------------------------------------------------------
  if ($SkipLiveCheck) {
    Write-Host "`n-SkipLiveCheck set: skipping full login/Account-REST-API proof."
  } else {
    Write-Host "`n[Live Account Console no-403 proof]"

    $usersResp = Invoke-JsonRequest -Method "GET" -Uri "$KeycloakBaseUrl/admin/realms/$Realm/users?username=$VerifyUsername&exact=true" -Headers $adminHeaders
    $verifyUser = $usersResp.Json | Select-Object -First 1
    if ($null -eq $verifyUser) {
      Write-Host "Creating throwaway verification user '$VerifyUsername'..."
      $userBody = @{
        username      = $VerifyUsername
        email         = "$VerifyUsername@team4s.local"
        firstName     = "Keycloak"
        lastName      = "Verify"
        enabled       = $true
        emailVerified = $true
      } | ConvertTo-Json
      $createUserResp = Invoke-JsonRequest -Method "POST" -Uri "$KeycloakBaseUrl/admin/realms/$Realm/users" -Headers $adminHeaders -Body $userBody
      Add-Check -Name "Created throwaway verification user" -Passed ($createUserResp.StatusCode -eq 201) -Details "status=$($createUserResp.StatusCode)"

      $usersResp = Invoke-JsonRequest -Method "GET" -Uri "$KeycloakBaseUrl/admin/realms/$Realm/users?username=$VerifyUsername&exact=true" -Headers $adminHeaders
      $verifyUser = $usersResp.Json | Select-Object -First 1

      $resetBody = @{ type = "password"; value = $VerifyPassword; temporary = $false } | ConvertTo-Json
      $resetResp = Invoke-JsonRequest -Method "PUT" -Uri "$KeycloakBaseUrl/admin/realms/$Realm/users/$($verifyUser.id)/reset-password" -Headers $adminHeaders -Body $resetBody
      Add-Check -Name "Set throwaway verification user password" -Passed (@(200, 204) -contains $resetResp.StatusCode) -Details "status=$($resetResp.StatusCode)"
    }
    Add-Check -Name "Verification user resolved" -Passed ($null -ne $verifyUser)

    # PKCE code_verifier/code_challenge (RNGCryptoServiceProvider for Windows PowerShell 5.1 compatibility).
    $verifierBytes = New-Object byte[] 32
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    try {
      $rng.GetBytes($verifierBytes)
    } finally {
      $rng.Dispose()
    }
    $codeVerifier = [Convert]::ToBase64String($verifierBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $challengeBytes = $sha256.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($codeVerifier))
    $codeChallenge = [Convert]::ToBase64String($challengeBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

    $redirectUri = "$KeycloakBaseUrl/realms/$Realm/account/"
    $authUrl = "$KeycloakBaseUrl/realms/$Realm/protocol/openid-connect/auth?client_id=account-console&redirect_uri=$([uri]::EscapeDataString($redirectUri))&response_type=code&scope=openid&code_challenge=$codeChallenge&code_challenge_method=S256"

    # NOTE: Keycloak issues its session cookies with the `Secure` attribute even on
    # this plain-HTTP local endpoint. Windows PowerShell 5.1's Invoke-WebRequest
    # (backed by .NET Framework's CookieContainer) strictly enforces `Secure` and
    # silently drops such cookies for http:// requests, which breaks a hand-rolled
    # cookie-jar replay of the login form POST. curl.exe (shipped with Git for
    # Windows / Windows 10+) has no such restriction and is used here for the
    # browser-equivalent multi-step login, matching the exact flow that was used
    # to manually reproduce and verify the fix (see 104-01-SUMMARY.md).
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($null -eq $curl) {
      throw "curl.exe not found on PATH; required for the live Account Console login proof. Install Git for Windows or re-run with -SkipLiveCheck."
    }

    $workDir = Join-Path ([System.IO.Path]::GetTempPath()) "team4s-kc-verify-$([guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Path $workDir -Force | Out-Null
    try {
      $cookieJarPath = Join-Path $workDir "cookies.txt"
      $loginPagePath = Join-Path $workDir "login-page.html"
      $loginHeadersPath = Join-Path $workDir "login-headers.txt"
      $loginBodyPath = Join-Path $workDir "login-body.html"
      $tokenResponsePath = Join-Path $workDir "token-response.json"
      $accountBodyPath = Join-Path $workDir "account-body.json"
      $credsBodyPath = Join-Path $workDir "creds-body.json"

      & curl.exe -s -c $cookieJarPath -b $cookieJarPath $authUrl -o $loginPagePath
      $loginPageContent = Get-Content -Raw -Path $loginPagePath
      Add-Check -Name "Loaded Keycloak login page for account-console" -Passed (-not [string]::IsNullOrEmpty($loginPageContent))

      $formActionMatch = [regex]::Match($loginPageContent, 'action="([^"]*)"')
      Add-Check -Name "Login form action discovered" -Passed $formActionMatch.Success
      $formAction = $formActionMatch.Groups[1].Value -replace "&amp;", "&"

      & curl.exe -s -c $cookieJarPath -b $cookieJarPath -D $loginHeadersPath -o $loginBodyPath `
        --data-urlencode "username=$VerifyUsername" `
        --data-urlencode "password=$VerifyPassword" `
        --data-urlencode "credentialId=" `
        $formAction

      $loginHeaders = Get-Content -Raw -Path $loginHeadersPath
      $locationMatch = [regex]::Match($loginHeaders, '(?im)^Location:\s*(\S+)')
      $location = if ($locationMatch.Success) { $locationMatch.Groups[1].Value.Trim() } else { $null }
      Add-Check -Name "Login submitted and redirected with authorization code" -Passed ($null -ne $location -and $location.Contains("code="))

      $code = [System.Web.HttpUtility]::ParseQueryString(([uri]$location).Query)["code"]
      Add-Check -Name "Authorization code extracted" -Passed (-not [string]::IsNullOrEmpty($code))

      & curl.exe -s -c $cookieJarPath -b $cookieJarPath -o $tokenResponsePath `
        --data-urlencode "grant_type=authorization_code" `
        --data-urlencode "client_id=account-console" `
        --data-urlencode "code=$code" `
        --data-urlencode "redirect_uri=$redirectUri" `
        --data-urlencode "code_verifier=$codeVerifier" `
        "$KeycloakBaseUrl/realms/$Realm/protocol/openid-connect/token"

      $tokenJson = Get-Content -Raw -Path $tokenResponsePath | ConvertFrom-Json
      Add-Check -Name "Exchanged authorization code for access token" -Passed (-not [string]::IsNullOrEmpty($tokenJson.access_token))

      $accessToken = $tokenJson.access_token

      $accountStatus = & curl.exe -s -o $accountBodyPath -w "%{http_code}" -H "Authorization: Bearer $accessToken" -H "Accept: application/json" "$KeycloakBaseUrl/realms/$Realm/account"
      Add-Check -Name "GET /realms/$Realm/account returns 200 (no 403)" -Passed ($accountStatus -eq "200") -Details "status=$accountStatus"

      $credsStatus = & curl.exe -s -o $credsBodyPath -w "%{http_code}" -H "Authorization: Bearer $accessToken" -H "Accept: application/json" "$KeycloakBaseUrl/realms/$Realm/account/credentials"
      Add-Check -Name "GET /realms/$Realm/account/credentials returns 200 (no 403)" -Passed ($credsStatus -eq "200") -Details "status=$credsStatus"
    } finally {
      Remove-Item -Path $workDir -Recurse -Force -ErrorAction SilentlyContinue
    }
  }

  $passedCount = ($script:Checks | Where-Object { $_.Passed }).Count
  $totalCount = $script:Checks.Count
  Write-Host "`nKeycloak config checks completed: $passedCount/$totalCount passed."
} finally {
  Pop-Location
}
