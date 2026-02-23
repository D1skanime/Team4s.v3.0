[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$DbService = 'team4sv30-db',
  [string]$DbUser = 'team4s',
  [string]$DbName = 'team4s_v2dump',
  [string]$LegacySqlPath = '..\Team4s.v2.0\team4sjdgfklfdjsgboidsejk\team4sjdgfklfdjsgboidsejk.sql',
  [string]$TempDir = '.tmp'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptPath '..')).Path
$legacySqlAbsolutePath = (Resolve-Path (Join-Path $projectRoot $LegacySqlPath)).Path
$tempAbsolutePath = Join-Path $projectRoot $TempDir

if (-not (Test-Path -LiteralPath $legacySqlAbsolutePath)) {
  throw "Legacy SQL file not found: $legacySqlAbsolutePath"
}

New-Item -Path $tempAbsolutePath -ItemType Directory -Force | Out-Null

$sqlOutPath = Join-Path $tempAbsolutePath 'legacy-fansub-import.sql'
$summaryOutPath = Join-Path $tempAbsolutePath 'legacy-fansub-import.summary.json'

Push-Location $projectRoot
try {
  Write-Host "Generate legacy fansub import payload (project: $projectRoot)"
  Write-Host "Legacy SQL: $legacySqlAbsolutePath"

  & python (Join-Path $scriptPath 'legacy_fansub_import.py') `
    --legacy-sql $legacySqlAbsolutePath `
    --sql-out $sqlOutPath `
    --summary-out $summaryOutPath

  if ($LASTEXITCODE -ne 0) {
    throw "legacy_fansub_import.py failed (exit=$LASTEXITCODE)"
  }

  $summary = Get-Content -Raw $summaryOutPath | ConvertFrom-Json

  Write-Host ''
  Write-Host '[Prepared]'
  Write-Host "Legacy rows parsed: $($summary.legacy_rows_parsed)"
  Write-Host "Fansub groups prepared: $($summary.fansub_groups_prepared)"
  Write-Host "Anime descriptions prepared: $($summary.anime_descriptions_prepared)"
  Write-Host "Anime-fansub links prepared: $($summary.anime_fansub_links_prepared)"
  Write-Host ''
  Write-Host '[Top Groups]'
  foreach ($item in $summary.top_groups) {
    Write-Host " - $($item.name) [$($item.slug)] | seen=$($item.seen) | anime=$($item.anime_count)"
  }

  if (-not $Apply) {
    Write-Host ''
    Write-Host "(No changes applied. Re-run with -Apply to import into DB.)"
    exit 0
  }

  Write-Host ''
  Write-Host '[Apply]'
  $containerSqlPath = '/tmp/legacy-fansub-import.sql'
  & docker cp $sqlOutPath "${DbService}:$containerSqlPath"
  if ($LASTEXITCODE -ne 0) {
    throw "docker cp failed (exit=$LASTEXITCODE)"
  }

  & docker compose exec -T $DbService psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -f $containerSqlPath
  if ($LASTEXITCODE -ne 0) {
    throw "psql apply failed (exit=$LASTEXITCODE)"
  }

  Write-Host ''
  Write-Host '[Post-Check]'
  & docker compose exec -T $DbService psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -c `
    "SELECT COUNT(*) AS fansub_groups_count FROM fansub_groups;
     SELECT COUNT(*) AS anime_fansub_links_count FROM anime_fansub_groups;
     SELECT COUNT(*) AS anime_with_description FROM anime WHERE description IS NOT NULL AND btrim(description) <> '';"
  if ($LASTEXITCODE -ne 0) {
    throw "psql post-check failed (exit=$LASTEXITCODE)"
  }
}
finally {
  Pop-Location
}
