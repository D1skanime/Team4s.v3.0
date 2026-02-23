[CmdletBinding()]
param(
  [int]$WindowMinutes = 5,
  [int]$AuthStateUnavailableWarnThreshold = 1,
  [int]$CommentRateLimitDegradedWarnThreshold = 3,
  [switch]$NoFailOnWarn
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($WindowMinutes -le 0) {
  throw "WindowMinutes must be greater than 0."
}
if ($AuthStateUnavailableWarnThreshold -lt 0) {
  throw "AuthStateUnavailableWarnThreshold must be >= 0."
}
if ($CommentRateLimitDegradedWarnThreshold -lt 0) {
  throw "CommentRateLimitDegradedWarnThreshold must be >= 0."
}

function Write-Status {
  param(
    [string]$Label,
    [string]$Value
  )
  Write-Host ("{0,-42} {1}" -f "${Label}:", $Value)
}

Set-Location -Path (Resolve-Path (Join-Path $PSScriptRoot ".."))

$sinceArg = "{0}m" -f $WindowMinutes
$logs = (& docker compose logs backend --since $sinceArg --no-color 2>&1)
if ($LASTEXITCODE -ne 0) {
  throw "Failed to read backend logs via docker compose."
}

$authStatePattern = "event=redis_auth_state_unavailable"
$limiterPattern = "event=redis_comment_rate_limit_degraded"

$authStateCount = @($logs | Select-String -Pattern $authStatePattern).Count
$limiterCount = @($logs | Select-String -Pattern $limiterPattern).Count

$authStateWarn = $authStateCount -ge $AuthStateUnavailableWarnThreshold
$limiterWarn = $limiterCount -ge $CommentRateLimitDegradedWarnThreshold
$warn = $authStateWarn -or $limiterWarn

Write-Host ("Redis Observability Alert Check ({0}m window)" -f $WindowMinutes)
Write-Status -Label "redis_auth_state_unavailable count" -Value "$authStateCount (warn >= $AuthStateUnavailableWarnThreshold)"
Write-Status -Label "redis_comment_rate_limit_degraded count" -Value "$limiterCount (warn >= $CommentRateLimitDegradedWarnThreshold)"

if ($warn) {
  Write-Host "STATUS: WARN"
  if (-not $NoFailOnWarn) {
    exit 2
  }
  exit 0
}

Write-Host "STATUS: OK"
exit 0
