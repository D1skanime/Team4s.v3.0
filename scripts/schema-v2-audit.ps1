param(
    [string]$OutputPath = ".planning/phases/20.1-db-schema-v2-physical-cutover/20.1-01-schema-audit.md"
)

$ErrorActionPreference = "Stop"

function Invoke-LocalPsql {
    param([Parameter(Mandatory = $true)][string]$Sql)

    $result = docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 -At -F "`t" -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "psql command failed"
    }
    return @($result)
}

$dbIdentity = Invoke-LocalPsql "SELECT current_database(), current_user;"
$dbIdentityValue = ($dbIdentity | Where-Object { $_.Trim().Length -gt 0 } | Select-Object -First 1).Trim()
if ($dbIdentityValue -ne "team4s_v2`tteam4s") {
    throw "Refusing to audit unexpected database identity: $($dbIdentity -join '; ')"
}

$tableRows = Invoke-LocalPsql @"
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
"@
$tables = @{}
foreach ($row in $tableRows) {
    if ($row.Trim().Length -gt 0) {
        $tables[$row.Trim()] = $true
    }
}

$columnRows = Invoke-LocalPsql @"
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
"@
$columns = @{}
foreach ($row in $columnRows) {
    if ($row.Trim().Length -eq 0) { continue }
    $parts = $row -split "`t"
    if (-not $columns.ContainsKey($parts[0])) {
        $columns[$parts[0]] = @{}
    }
    $columns[$parts[0]][$parts[1]] = $true
}

$constraintRows = Invoke-LocalPsql @"
SELECT conrelid::regclass::text AS table_name, contype, conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY table_name, contype, conname;
"@
$constraints = @{}
foreach ($row in $constraintRows) {
    if ($row.Trim().Length -eq 0) { continue }
    $parts = $row -split "`t", 4
    $key = "$($parts[0])|$($parts[1])"
    if (-not $constraints.ContainsKey($key)) {
        $constraints[$key] = @()
    }
    $constraints[$key] += [pscustomobject]@{
        Name = $parts[2]
        Definition = $parts[3]
    }
}

$indexRows = Invoke-LocalPsql @"
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"@
$indexes = @{}
foreach ($row in $indexRows) {
    if ($row.Trim().Length -eq 0) { continue }
    $parts = $row -split "`t", 3
    if (-not $indexes.ContainsKey($parts[0])) {
        $indexes[$parts[0]] = @()
    }
    $indexes[$parts[0]] += [pscustomobject]@{
        Name = $parts[1]
        Definition = $parts[2]
    }
}

$targetTables = @(
    @{ Target = "Anime"; Live = "anime"; Columns = @("id","anime_type_id","anisearch_id","year","description","folder_name","slug","created_at","modified_at","modified_by") },
    @{ Target = "AnimeTitle"; Live = "anime_titles"; Columns = @("id","anime_id","language_id","title","title_type_id") },
    @{ Target = "TitleType"; Live = "title_types"; Columns = @("id","name") },
    @{ Target = "AnimeType"; Live = "anime_types"; Columns = @("id","name") },
    @{ Target = "Genre"; Live = "genres"; Columns = @("id","name") },
    @{ Target = "AnimeGenre"; Live = "anime_genres"; Columns = @("anime_id","genre_id") },
    @{ Target = "AnimeRelation"; Live = "anime_relations"; Columns = @("source_anime_id","target_anime_id","relation_type_id") },
    @{ Target = "RelationType"; Live = "relation_types"; Columns = @("id","name") },
    @{ Target = "MediaAsset"; Live = "media_assets"; Columns = @("id","media_type_id","file_path","caption","mime_type","format","uploaded_by","created_at","modified_at","modified_by") },
    @{ Target = "MediaExternal"; Live = "media_external"; Columns = @("id","media_id","provider","external_id","external_type","metadata") },
    @{ Target = "MediaFile"; Live = "media_files"; Columns = @("id","media_id","variant","storage_id","path","width","height","size") },
    @{ Target = "AnimeMedia"; Live = "anime_media"; Columns = @("anime_id","media_id","sort_order") },
    @{ Target = "EpisodeMedia"; Live = "episode_media"; Columns = @("episode_id","media_id","sort_order") },
    @{ Target = "FansubGroupMedia"; Live = "fansub_group_media"; Columns = @("group_id","media_id") },
    @{ Target = "ReleaseMedia"; Live = "release_media"; Columns = @("release_id","media_id","sort_order") },
    @{ Target = "MediaType"; Live = "media_types"; Columns = @("id","name") },
    @{ Target = "Episode"; Live = "episodes"; Columns = @("id","anime_id","number","number_decimal","number_text","episode_type_id","filler_type_id","filler_source","filler_note","sort_index","created_at","modified_at","modified_by") },
    @{ Target = "EpisodeTitle"; Live = "episode_titles"; Columns = @("id","episode_id","language_id","title") },
    @{ Target = "Language"; Live = "languages"; Columns = @("id","code") },
    @{ Target = "EpisodeType"; Live = "episode_types"; Columns = @("id","name") },
    @{ Target = "EpisodeFillerType"; Live = "episode_filler_types"; Columns = @("id","name","is_filler") },
    @{ Target = "FansubRelease"; Live = "fansub_releases"; Columns = @("id","episode_id","source","created_at","modified_at","modified_by") },
    @{ Target = "ReleaseSource"; Live = "release_sources"; Columns = @("id","name","type") },
    @{ Target = "ReleaseVersion"; Live = "release_versions"; Columns = @("id","release_id","version","created_at","modified_at","modified_by") },
    @{ Target = "ReleaseVariant"; Live = "release_variants"; Columns = @("id","release_version_id","container","resolution","video_codec","audio_codec","file_size","filename","created_at","modified_at","modified_by") },
    @{ Target = "ReleaseVariantEpisode"; Live = "release_variant_episodes"; Columns = @("release_variant_id","episode_id","position") },
    @{ Target = "ReleaseVersionGroup"; Live = "release_version_groups"; Columns = @("release_version_id","fansubgroup_id") },
    @{ Target = "Stream"; Live = "release_streams"; Columns = @("id","variant_id","stream_type_id","stream_source_id","jellyfin_item_id","subtitle_language_id","audio_language_id","visibility_id","created_at","modified_at","modified_by") },
    @{ Target = "Visibility"; Live = "visibilities"; Columns = @("id","name") },
    @{ Target = "StreamSource"; Live = "stream_sources"; Columns = @("id","provider_type","external_id","url","metadata") },
    @{ Target = "StreamType"; Live = "stream_types"; Columns = @("id","name") },
    @{ Target = "Theme"; Live = "themes"; Columns = @("id","anime_id","theme_type_id","title") },
    @{ Target = "ThemeType"; Live = "theme_types"; Columns = @("id","name") },
    @{ Target = "ReleaseThemeAsset"; Live = "release_theme_assets"; Columns = @("release_id","theme_id","media_id","created_at") },
    @{ Target = "ThemeSegment"; Live = "theme_segments"; Columns = @("id","theme_id","start_episode_id","end_episode_id") },
    @{ Target = "EpisodeThemeOverride"; Live = "episode_theme_overrides"; Columns = @("release_id","episode_id","theme_id") },
    @{ Target = "FansubGroup"; Live = "fansub_groups"; Columns = @("id","name","founded_year","closed_year","history_description") },
    @{ Target = "FansubGroupAlias"; Live = "fansub_group_aliases"; Columns = @("id","group_id","alias") },
    @{ Target = "FansubGroupLink"; Live = "fansub_group_links"; Columns = @("id","group_id","link_type","name","url") },
    @{ Target = "GroupMember"; Live = "group_members"; Columns = @("id","group_id","member_id","joined_year","left_year") },
    @{ Target = "Member"; Live = "members"; Columns = @("id","user_id","nickname","member_history_description","slogan","avatar_media_id") },
    @{ Target = "User"; Live = "users"; Columns = @("id","username","email","password_hash","created_at") },
    @{ Target = "Role"; Live = "contributor_roles"; Columns = @("id","name") },
    @{ Target = "ReleaseMemberRole"; Live = "release_member_roles"; Columns = @("release_id","member_id","role_id") },
    @{ Target = "MemberAnimeNote"; Live = "member_anime_notes"; Columns = @("member_id","anime_id","text","created_at","modified_at","modified_by") },
    @{ Target = "MemberEpisodeNote"; Live = "member_episode_notes"; Columns = @("id","release_id","member_id","role_id","text","created_at","modified_at","modified_by") }
)

$legacyTables = @("episode_version_episodes","episode_version_images","episode_versions")
$audit = New-Object System.Collections.Generic.List[object]

function Add-AuditRow {
    param(
        [string]$Kind,
        [string]$Target,
        [string]$Live,
        [string]$Status,
        [string]$Detail
    )
    $script:audit.Add([pscustomobject]@{
        Kind = $Kind
        Target = $Target
        Live = $Live
        Status = $Status
        Detail = $Detail
    })
}

foreach ($spec in $targetTables) {
    $live = $spec.Live
    if ($tables.ContainsKey($live)) {
        $detail = if ($spec.Target -eq $live) { "table exists" } else { "documented as $($spec.Target), implemented as $live" }
        Add-AuditRow "table" $spec.Target $live "present" $detail
        foreach ($column in $spec.Columns) {
            if ($columns.ContainsKey($live) -and $columns[$live].ContainsKey($column)) {
                Add-AuditRow "column" "$($spec.Target).$column" "$live.$column" "present" "column exists"
            } else {
                Add-AuditRow "column" "$($spec.Target).$column" "$live.$column" "missing" "required by db-schema-v2.md"
            }
        }
    } else {
        Add-AuditRow "table" $spec.Target $live "missing" "required by db-schema-v2.md"
    }
}

foreach ($legacy in $legacyTables) {
    if ($tables.ContainsKey($legacy)) {
        Add-AuditRow "legacy-to-delete" $legacy $legacy "legacy-to-delete" "allowed future drop target after local reset"
    } else {
        Add-AuditRow "legacy-to-delete" $legacy $legacy "present" "already absent"
    }
}

if ($tables.ContainsKey("streams")) {
    Add-AuditRow "table" "Stream" "streams" "divergent" "older stream table still exists beside target-mapped release_streams"
}
if ($columns.ContainsKey("fansub_releases") -and $columns["fansub_releases"].ContainsKey("source_id") -and -not $columns["fansub_releases"].ContainsKey("source")) {
    Add-AuditRow "column" "FansubRelease.source" "fansub_releases.source_id" "divergent" "live schema uses source_id while db-schema-v2.md documents source"
}
if ($columns.ContainsKey("release_version_groups") -and $columns["release_version_groups"].ContainsKey("fansub_group_id") -and -not $columns["release_version_groups"].ContainsKey("fansubgroup_id")) {
    Add-AuditRow "column" "ReleaseVersionGroup.fansubgroup_id" "release_version_groups.fansub_group_id" "divergent" "live schema uses fansub_group_id while db-schema-v2.md documents fansubgroup_id"
}

foreach ($spec in $targetTables) {
    $live = $spec.Live
    if (-not $tables.ContainsKey($live)) { continue }

    $fkKey = "$live|f"
    $uniqueKey = "$live|u"
    $primaryKey = "$live|p"
    $tableIndexes = if ($indexes.ContainsKey($live)) { $indexes[$live] } else { @() }

    if ($constraints.ContainsKey($primaryKey)) {
        Add-AuditRow "constraint" "$($spec.Target) primary key" $live "present" (($constraints[$primaryKey] | Select-Object -ExpandProperty Definition) -join "; ")
    } else {
        Add-AuditRow "constraint" "$($spec.Target) primary key" $live "missing" "primary key expected"
    }

    $referenceColumns = @($spec.Columns | Where-Object { $_ -ne "id" -and ($_ -match "_id$" -or $_ -in @("source")) })
    if ($constraints.ContainsKey($fkKey)) {
        Add-AuditRow "constraint" "$($spec.Target) foreign keys" $live "present" (($constraints[$fkKey] | Select-Object -ExpandProperty Definition) -join "; ")
    } elseif ($referenceColumns.Count -gt 0) {
        Add-AuditRow "constraint" "$($spec.Target) foreign keys" $live "missing" "foreign keys expected for referenced columns where documented"
    }

    if ($constraints.ContainsKey($uniqueKey)) {
        Add-AuditRow "constraint" "$($spec.Target) unique constraints" $live "present" (($constraints[$uniqueKey] | Select-Object -ExpandProperty Definition) -join "; ")
    }

    if ($tableIndexes.Count -gt 0) {
        Add-AuditRow "index" "$($spec.Target) indexes" $live "present" (($tableIndexes | Select-Object -ExpandProperty Name) -join ", ")
    } else {
        Add-AuditRow "index" "$($spec.Target) indexes" $live "missing" "documented indexes need migration review"
    }
}

$missing = @($audit | Where-Object { $_.Status -eq "missing" })
$present = @($audit | Where-Object { $_.Status -eq "present" })
$legacy = @($audit | Where-Object { $_.Status -eq "legacy-to-delete" })
$divergent = @($audit | Where-Object { $_.Status -eq "divergent" })

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# DB Schema v2 Live-vs-Target Audit")
$lines.Add("")
$lines.Add("Generated: $((Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))")
$lines.Add("")
$lines.Add('Database identity: `team4s_v2` as `team4s` via Docker Compose service `team4sv30-db`.')
$lines.Add("")
$lines.Add("## Summary")
$lines.Add("")
$lines.Add("| Category | Count |")
$lines.Add("|---|---:|")
$lines.Add("| Present artifacts | $($present.Count) |")
$lines.Add("| Missing artifacts | $($missing.Count) |")
$lines.Add("| Divergent artifacts | $($divergent.Count) |")
$lines.Add("| Legacy deletion targets still present | $($legacy.Count) |")
$lines.Add("")
$lines.Add("## Missing")
$lines.Add("")
$lines.Add("| Kind | Target | Live expectation | Detail |")
$lines.Add("|---|---|---|---|")
foreach ($row in $missing) {
    $lines.Add("| $($row.Kind) | $($row.Target) | $($row.Live) | $($row.Detail) |")
}
$lines.Add("")
$lines.Add("## Divergent")
$lines.Add("")
$lines.Add("| Kind | Target | Live | Detail |")
$lines.Add("|---|---|---|---|")
foreach ($row in $divergent) {
    $lines.Add("| $($row.Kind) | $($row.Target) | $($row.Live) | $($row.Detail) |")
}
$lines.Add("")
$lines.Add("## Legacy To Delete")
$lines.Add("")
$lines.Add("| Table | Status | Detail |")
$lines.Add("|---|---|---|")
foreach ($row in $legacy) {
    $lines.Add("| $($row.Target) | $($row.Status) | $($row.Detail) |")
}
$lines.Add("")
$lines.Add("## Present Or Mapped")
$lines.Add("")
$lines.Add("| Kind | Target | Live | Detail |")
$lines.Add("|---|---|---|---|")
foreach ($row in $present) {
    $lines.Add("| $($row.Kind) | $($row.Target) | $($row.Live) | $($row.Detail) |")
}

$parent = Split-Path -Parent $OutputPath
if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent | Out-Null
}
$lines | Set-Content -Path $OutputPath -Encoding UTF8
Write-Output "Wrote $OutputPath"
