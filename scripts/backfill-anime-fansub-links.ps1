[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$DbService = 'team4sv30-db',
  [string]$DbUser = 'team4s',
  [string]$DbName = 'team4s_v2dump'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-PsqlQuery {
  param(
    [Parameter(Mandatory = $true)][string]$Sql
  )

  $out = (& docker compose exec -T $DbService psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -c $Sql)
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed (exit=$LASTEXITCODE)"
  }
  return ($out -join "`n")
}

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptPath "..")).Path

$summarySql = @"
WITH source_pairs AS (
  SELECT DISTINCT anime_id, fansub_group_id
  FROM episode_versions
  WHERE fansub_group_id IS NOT NULL
),
missing_links AS (
  SELECT sp.anime_id, sp.fansub_group_id
  FROM source_pairs sp
  LEFT JOIN anime_fansub_groups afg
    ON afg.anime_id = sp.anime_id
   AND afg.fansub_group_id = sp.fansub_group_id
  WHERE afg.anime_id IS NULL
),
primary_candidates AS (
  SELECT
    ev.anime_id,
    ev.fansub_group_id,
    COUNT(*) AS version_count,
    ROW_NUMBER() OVER (PARTITION BY ev.anime_id ORDER BY COUNT(*) DESC, ev.fansub_group_id ASC) AS rank_in_anime
  FROM episode_versions ev
  WHERE ev.fansub_group_id IS NOT NULL
  GROUP BY ev.anime_id, ev.fansub_group_id
),
missing_primary AS (
  SELECT pc.anime_id, pc.fansub_group_id
  FROM primary_candidates pc
  WHERE pc.rank_in_anime = 1
    AND NOT EXISTS (
      SELECT 1
      FROM anime_fansub_groups afg
      WHERE afg.anime_id = pc.anime_id
        AND afg.is_primary = TRUE
    )
)
SELECT
  (SELECT COUNT(*) FROM fansub_groups) AS fansub_groups_count,
  (SELECT COUNT(*) FROM episode_versions WHERE fansub_group_id IS NOT NULL) AS version_rows_with_group,
  (SELECT COUNT(*) FROM source_pairs) AS distinct_source_pairs,
  (SELECT COUNT(*) FROM anime_fansub_groups) AS existing_links,
  (SELECT COUNT(*) FROM missing_links) AS missing_links_to_insert,
  (SELECT COUNT(*) FROM missing_primary) AS anime_without_primary_to_assign;
"@

$applySql = @"
BEGIN;

WITH source_pairs AS (
  SELECT DISTINCT anime_id, fansub_group_id
  FROM episode_versions
  WHERE fansub_group_id IS NOT NULL
),
inserted AS (
  INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary, notes)
  SELECT sp.anime_id, sp.fansub_group_id, FALSE, 'auto-backfill from episode_versions'
  FROM source_pairs sp
  LEFT JOIN anime_fansub_groups afg
    ON afg.anime_id = sp.anime_id
   AND afg.fansub_group_id = sp.fansub_group_id
  WHERE afg.anime_id IS NULL
  RETURNING 1
)
SELECT COUNT(*) AS inserted_links
FROM inserted;

WITH primary_candidates AS (
  SELECT
    ev.anime_id,
    ev.fansub_group_id,
    ROW_NUMBER() OVER (PARTITION BY ev.anime_id ORDER BY COUNT(*) DESC, ev.fansub_group_id ASC) AS rank_in_anime
  FROM episode_versions ev
  WHERE ev.fansub_group_id IS NOT NULL
  GROUP BY ev.anime_id, ev.fansub_group_id
),
missing_primary AS (
  SELECT pc.anime_id, pc.fansub_group_id
  FROM primary_candidates pc
  WHERE pc.rank_in_anime = 1
    AND NOT EXISTS (
      SELECT 1
      FROM anime_fansub_groups afg
      WHERE afg.anime_id = pc.anime_id
        AND afg.is_primary = TRUE
    )
),
updated AS (
  UPDATE anime_fansub_groups afg
  SET is_primary = TRUE
  FROM missing_primary mp
  WHERE afg.anime_id = mp.anime_id
    AND afg.fansub_group_id = mp.fansub_group_id
    AND afg.is_primary = FALSE
  RETURNING 1
)
SELECT COUNT(*) AS newly_assigned_primary_links
FROM updated;

COMMIT;
"@

Push-Location $projectRoot
try {
  Write-Host "Backfill anime_fansub_groups from episode_versions (project: $projectRoot)"

  Write-Host "`n[Summary]"
  $summary = Invoke-PsqlQuery -Sql $summarySql
  $summary | Write-Host

  if (-not $Apply) {
    Write-Host "`n(No changes applied. Re-run with -Apply to write links.)"
    exit 0
  }

  Write-Host "`n[Apply]"
  $result = Invoke-PsqlQuery -Sql $applySql
  $result | Write-Host

  Write-Host "`n[Summary After]"
  (Invoke-PsqlQuery -Sql $summarySql) | Write-Host
} finally {
  Pop-Location
}
