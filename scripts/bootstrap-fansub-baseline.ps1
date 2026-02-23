[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$DbService = 'team4sv30-db',
  [string]$DbUser = 'team4s',
  [string]$DbName = 'team4s_v2dump',
  [string]$GroupSlug = 'team4s-selfsub',
  [string]$GroupName = 'Team4s Selfsub (Legacy)',
  [ValidateSet('active', 'inactive', 'dissolved')]
  [string]$GroupStatus = 'active'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Escape-SqlLiteral {
  param(
    [Parameter(Mandatory = $true)][string]$Value
  )
  return $Value.Replace("'", "''")
}

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

$slugSql = Escape-SqlLiteral $GroupSlug.Trim()
$nameSql = Escape-SqlLiteral $GroupName.Trim()
$statusSql = Escape-SqlLiteral $GroupStatus.Trim()

$summarySql = @"
WITH baseline_group AS (
  SELECT id
  FROM fansub_groups
  WHERE slug = '$slugSql'
  LIMIT 1
),
candidate_rows AS (
  SELECT
    e.id AS episode_id,
    e.anime_id,
    NULLIF(regexp_replace(e.episode_number, '[^0-9]', '', 'g'), '')::int AS episode_number_int,
    NULLIF(btrim(e.title), '') AS title,
    CASE
      WHEN e.stream_links IS NOT NULL AND cardinality(e.stream_links) > 0 AND btrim(COALESCE(e.stream_links[1], '')) <> ''
        THEN btrim(e.stream_links[1])
      WHEN e.stream_links_legacy IS NOT NULL AND btrim(e.stream_links_legacy) <> ''
        THEN btrim(e.stream_links_legacy)
      ELSE NULL
    END AS stream_url,
    e.status
  FROM episodes e
  JOIN anime a ON a.id = e.anime_id
  WHERE a.is_self_subbed = TRUE
),
candidate_versions AS (
  SELECT DISTINCT ON (anime_id, episode_number_int)
    episode_id,
    anime_id,
    episode_number_int AS episode_number,
    title,
    stream_url
  FROM candidate_rows
  WHERE episode_number_int IS NOT NULL
    AND episode_number_int > 0
    AND stream_url IS NOT NULL
  ORDER BY anime_id, episode_number_int, CASE WHEN status = 'public' THEN 0 ELSE 1 END, episode_id DESC
),
existing_baseline_versions AS (
  SELECT COUNT(*) AS count
  FROM episode_versions ev
  JOIN baseline_group bg ON bg.id = ev.fansub_group_id
  WHERE ev.media_provider = 'legacy'
),
missing_baseline_versions AS (
  SELECT COUNT(*) AS count
  FROM candidate_versions cv
  JOIN baseline_group bg ON true
  WHERE NOT EXISTS (
    SELECT 1
    FROM episode_versions ev
    WHERE ev.anime_id = cv.anime_id
      AND ev.episode_number = cv.episode_number
      AND ev.fansub_group_id = bg.id
      AND ev.media_provider = 'legacy'
      AND ev.video_quality = 'legacy'
      AND ev.subtitle_type IS NULL
      AND ev.stream_url = cv.stream_url
  )
)
SELECT
  (SELECT COUNT(*) FROM fansub_groups) AS fansub_groups_count,
  (SELECT COUNT(*) FROM episode_versions) AS episode_versions_count,
  (SELECT COUNT(*) FROM anime_fansub_groups) AS anime_fansub_links_count,
  (SELECT COUNT(*) FROM anime WHERE is_self_subbed = TRUE) AS self_subbed_anime_count,
  (SELECT COUNT(*) FROM candidate_rows) AS candidate_episode_rows,
  (SELECT COUNT(*) FROM candidate_versions) AS candidate_version_rows,
  (SELECT id FROM baseline_group) AS baseline_group_id,
  (SELECT count FROM existing_baseline_versions) AS existing_baseline_versions,
  COALESCE((SELECT count FROM missing_baseline_versions), 0) AS missing_baseline_versions;
"@

$applySql = @"
BEGIN;

WITH upsert_group AS (
  INSERT INTO fansub_groups (
    slug, name, description, history, status
  )
  SELECT
    '$slugSql',
    '$nameSql',
    'Auto-created baseline group for legacy self-subbed episode mapping.',
    'Auto-created by scripts/bootstrap-fansub-baseline.ps1.',
    '$statusSql'
  WHERE NOT EXISTS (SELECT 1 FROM fansub_groups WHERE slug = '$slugSql')
  RETURNING id
),
baseline_group AS (
  SELECT id FROM upsert_group
  UNION ALL
  SELECT id
  FROM fansub_groups
  WHERE slug = '$slugSql'
  ORDER BY id
  LIMIT 1
),
candidate_rows AS (
  SELECT
    e.id AS episode_id,
    e.anime_id,
    NULLIF(regexp_replace(e.episode_number, '[^0-9]', '', 'g'), '')::int AS episode_number_int,
    NULLIF(btrim(e.title), '') AS title,
    CASE
      WHEN e.stream_links IS NOT NULL AND cardinality(e.stream_links) > 0 AND btrim(COALESCE(e.stream_links[1], '')) <> ''
        THEN btrim(e.stream_links[1])
      WHEN e.stream_links_legacy IS NOT NULL AND btrim(e.stream_links_legacy) <> ''
        THEN btrim(e.stream_links_legacy)
      ELSE NULL
    END AS stream_url,
    e.status
  FROM episodes e
  JOIN anime a ON a.id = e.anime_id
  WHERE a.is_self_subbed = TRUE
),
candidate_versions AS (
  SELECT DISTINCT ON (anime_id, episode_number_int)
    episode_id,
    anime_id,
    episode_number_int AS episode_number,
    title,
    stream_url
  FROM candidate_rows
  WHERE episode_number_int IS NOT NULL
    AND episode_number_int > 0
    AND stream_url IS NOT NULL
  ORDER BY anime_id, episode_number_int, CASE WHEN status = 'public' THEN 0 ELSE 1 END, episode_id DESC
),
inserted_versions AS (
  INSERT INTO episode_versions (
    anime_id,
    episode_number,
    title,
    fansub_group_id,
    media_provider,
    media_item_id,
    video_quality,
    subtitle_type,
    release_date,
    stream_url
  )
  SELECT
    cv.anime_id,
    cv.episode_number,
    cv.title,
    bg.id,
    'legacy',
    CONCAT('legacy-episode-', cv.episode_id::text),
    'legacy',
    NULL,
    NULL,
    cv.stream_url
  FROM candidate_versions cv
  JOIN baseline_group bg ON true
  WHERE NOT EXISTS (
    SELECT 1
    FROM episode_versions ev
    WHERE ev.anime_id = cv.anime_id
      AND ev.episode_number = cv.episode_number
      AND ev.fansub_group_id = bg.id
      AND ev.media_provider = 'legacy'
      AND ev.video_quality = 'legacy'
      AND ev.subtitle_type IS NULL
      AND ev.stream_url = cv.stream_url
  )
  RETURNING id
)
SELECT
  (SELECT COUNT(*) FROM upsert_group) AS created_groups,
  (SELECT id FROM baseline_group) AS baseline_group_id,
  (SELECT COUNT(*) FROM inserted_versions) AS inserted_episode_versions;

COMMIT;
"@

Push-Location $projectRoot
try {
  Write-Host "Bootstrap fansub baseline from legacy self-subbed episodes (project: $projectRoot)"
  Write-Host "Group slug: $GroupSlug"

  Write-Host "`n[Summary]"
  Invoke-PsqlQuery -Sql $summarySql | Write-Host

  if (-not $Apply) {
    Write-Host "`n(No changes applied. Re-run with -Apply to write baseline data.)"
    exit 0
  }

  Write-Host "`n[Apply]"
  Invoke-PsqlQuery -Sql $applySql | Write-Host

  Write-Host "`n[Summary After]"
  Invoke-PsqlQuery -Sql $summarySql | Write-Host
} finally {
  Pop-Location
}
