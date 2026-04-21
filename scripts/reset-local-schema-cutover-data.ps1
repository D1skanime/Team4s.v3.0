param(
    [switch]$ConfirmLocal
)

$ErrorActionPreference = "Stop"

if (-not $ConfirmLocal) {
    throw "Refusing to reset data without -ConfirmLocal. This script is destructive and local-dev only."
}

function Invoke-LocalPsql {
    param([Parameter(Mandatory = $true)][string]$Sql)

    $result = docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 -At -F "`t" -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "psql command failed"
    }
    return @($result)
}

$identity = Invoke-LocalPsql "SELECT current_database(), current_user;"
$identityValue = ($identity | Where-Object { $_.Trim().Length -gt 0 } | Select-Object -First 1).Trim()
if ($identityValue -ne "team4s_v2`tteam4s") {
    throw "Refusing to reset unexpected database identity: $($identity -join '; ')"
}

$runtimeProfile = docker compose exec -T team4sv30-backend printenv RUNTIME_PROFILE 2>$null
if ($LASTEXITCODE -eq 0 -and $runtimeProfile.Trim() -notin @("local", "development", "dev", "")) {
    throw "Refusing to reset while backend RUNTIME_PROFILE is '$($runtimeProfile.Trim())'"
}

$tablesToClear = @(
    "release_member_roles",
    "member_episode_notes",
    "member_anime_notes",
    "episode_theme_overrides",
    "theme_segments",
    "release_theme_assets",
    "themes",
    "theme_types",
    "release_streams",
    "streams",
    "stream_sources",
    "release_media",
    "release_version_groups",
    "release_variant_episodes",
    "release_variants",
    "release_versions",
    "fansub_releases",
    "episode_version_episodes",
    "episode_version_images",
    "episode_versions",
    "episode_media",
    "episode_titles",
    "episodes",
    "anime_background_assets",
    "anime_media",
    "media_external",
    "media_files",
    "media_assets",
    "anime_tags",
    "anime_genres",
    "anime_relations",
    "anime_fansub_groups",
    "comments",
    "watchlist_entries",
    "admin_anime_mutation_audit",
    "anime"
)

$existingRows = Invoke-LocalPsql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
$existingTables = @{}
foreach ($row in $existingRows) {
    if ($row.Trim().Length -gt 0) {
        $existingTables[$row.Trim()] = $true
    }
}

$quotedTables = $tablesToClear | Where-Object { $existingTables.ContainsKey($_) } | ForEach-Object { "public.$_" }
$truncateSql = "TRUNCATE TABLE $($quotedTables -join ', ') RESTART IDENTITY CASCADE;"

Write-Output "Resetting disposable local anime/import/media state in team4s_v2..."
Invoke-LocalPsql $truncateSql | Out-Null

$countSql = @"
WITH tracked(table_name) AS (
    VALUES
        ('anime'),
        ('episodes'),
        ('episode_titles'),
        ('episode_versions'),
        ('episode_version_images'),
        ('episode_version_episodes'),
        ('fansub_releases'),
        ('release_versions'),
        ('release_variants'),
        ('release_streams'),
        ('stream_sources'),
        ('media_assets'),
        ('media_files'),
        ('media_external'),
        ('anime_media'),
        ('episode_media'),
        ('release_media')
)
SELECT tracked.table_name,
       COALESCE(stats.row_count, 0) AS row_count
FROM tracked
LEFT JOIN LATERAL (
    SELECT (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I', tracked.table_name), false, true, '')))[1]::text::bigint AS row_count
    WHERE to_regclass('public.' || tracked.table_name) IS NOT NULL
) stats ON true
ORDER BY tracked.table_name;
"@

Invoke-LocalPsql $countSql
