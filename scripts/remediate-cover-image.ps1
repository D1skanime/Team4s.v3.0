[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$DbUser = 'team4s',
  [string]$DbName = 'team4s'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-PsqlQuery {
  param(
    [Parameter(Mandatory = $true)][string]$Sql
  )

  $out = (& docker compose exec -T team4sv30-db psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -c $Sql)
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed (exit=$LASTEXITCODE)"
  }
  return ($out -join "`n")
}

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptPath "..")).Path

Push-Location $projectRoot
try {
  Write-Host "Cover image remediation (project: $projectRoot)"

  Write-Host "`n[Before]"
  Invoke-PsqlQuery -Sql @"
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE cover_image IS NULL) AS null_count,
  COUNT(*) FILTER (WHERE cover_image IS NOT NULL AND btrim(cover_image) = '') AS empty_string_count,
  COUNT(*) FILTER (WHERE cover_image ~* '^https?://') AS url_count,
  COUNT(*) FILTER (WHERE cover_image IS NOT NULL AND cover_image !~* '^https?://' AND btrim(cover_image) <> '') AS filenameish_count
FROM anime;
"@ | Write-Host

  $urlRows = Invoke-PsqlQuery -Sql "SELECT id, title, cover_image FROM anime WHERE cover_image ~* '^https?://' ORDER BY id LIMIT 10;"
  if ($urlRows -and $urlRows.Trim() -ne "") {
    Write-Host "`nURL samples:"
    $urlRows | Write-Host
  }

  if (-not $Apply) {
    Write-Host "`n(No changes applied. Re-run with -Apply to update DB rows.)"
    exit 0
  }

  Write-Host "`n[Applying]"
  Invoke-PsqlQuery -Sql "UPDATE anime SET cover_image = btrim(cover_image) WHERE cover_image IS NOT NULL AND cover_image <> btrim(cover_image);" | Write-Host
  Invoke-PsqlQuery -Sql "UPDATE anime SET cover_image = NULL WHERE cover_image IS NOT NULL AND btrim(cover_image) = '';" | Write-Host
  Invoke-PsqlQuery -Sql "UPDATE anime SET cover_image = NULL WHERE cover_image ~* '^https?://';" | Write-Host

  Write-Host "`n[After]"
  Invoke-PsqlQuery -Sql @"
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE cover_image IS NULL) AS null_count,
  COUNT(*) FILTER (WHERE cover_image IS NOT NULL AND btrim(cover_image) = '') AS empty_string_count,
  COUNT(*) FILTER (WHERE cover_image ~* '^https?://') AS url_count,
  COUNT(*) FILTER (WHERE cover_image IS NOT NULL AND cover_image !~* '^https?://' AND btrim(cover_image) <> '') AS filenameish_count
FROM anime;
"@ | Write-Host
} finally {
  Pop-Location
}
