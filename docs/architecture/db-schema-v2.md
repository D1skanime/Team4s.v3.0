# DB Schema v2 Draft

**Status:** Working draft  
**Date:** 2026-03-13  
**Purpose:** Canonical target-model draft for the normalized Team4s schema migration

## Why This File Exists

This file captures the proposed normalized database schema discussed during the 2026-03-13 planning session so it survives restarts, handoffs, and future milestone planning.

This is the **target architecture**, not an immediate migration script.

## Migration Principles

- Keep the current production schema running while new tables and adapters are introduced.
- Prefer expand-and-migrate over destructive rewrites.
- Move one domain at a time: anime metadata, episodes, releases, media, contributors, notes.
- Keep API and repository compatibility phases explicit before deleting old columns or tables.

## Canonical Placement

- **Canonical draft:** `docs/architecture/db-schema-v2.md`
- **Planning support:** workspace `.planning/` and local GSD artifacts
- **Executable migrations:** `database/migrations/`

## Proposed Domain Outline

### Anime

```text
Anime
- id
- anime_type_id
- anisearch_id
- year
- description
- folder_name
- slug
- created_at
- modified_at
- modified_by
```

### Anime Titles

```text
AnimeTitle
- id
- anime_id
- language_id
- title
- title_type_id
```

```text
TitleType values
- main
- official
- short
- synonym
- romaji
- japanese
```

```text
AnimeType values
- TV
- OVA
- ONA
- Movie
- Special
- Bonus
- Web
```

### Anime Genre / Relations

```text
Genre
- id
- name

AnimeGenre
- anime_id
- genre_id
```

```text
AnimeRelation
- source_anime_id
- target_anime_id
- relation_type_id
```

### Media

```text
MediaAsset
- id
- media_type_id
- file_path
- caption
- mime_type
- format
- uploaded_by
- created_at
- modified_at
- modified_by
```

```text
MediaExternal
- id
- media_id
- provider
- external_id
- external_type
- metadata
```

```text
MediaFile
- id
- media_id
- variant
- storage_id
- path
- width
- height
- size
```

```text
AnimeMedia
- anime_id
- media_id
- sort_order

EpisodeMedia
- episode_id
- media_id
- sort_order

FansubGroupMedia
- group_id
- media_id

ReleaseMedia
- release_id
- media_id
- sort_order
```

```text
MediaType values
- poster
- banner
- background
- logo
- preview
- screenshot
- avatar
- thumbnail
- karaoke_background
- video
```

### Episode

```text
Episode
- id
- anime_id
- number
- number_decimal
- number_text
- episode_type_id
- sort_index
- created_at
- modified_at
- modified_by
```

```text
EpisodeTitle
- id
- episode_id
- language_id
- title
```

```text
Language
- id
- code
```

```text
EpisodeType
- id
- name
```

### Release Model

```text
FansubRelease
- id
- episode_id
- source
- created_at
- modified_at
- modified_by
```

```text
ReleaseSource
- id
- name
- type
```

```text
ReleaseVersion
- id
- release_id
- version
- created_at
- modified_at
- modified_by
```

```text
ReleaseVariant
- id
- release_version_id
- container
- resolution
- video_codec
- audio_codec
- file_size
- filename
- created_at
- modified_at
- modified_by
```

```text
ReleaseVersionGroup
- release_version_id
- fansubgroup_id
```

### Stream

```text
Stream
- id
- variant_id
- stream_type_id
- stream_source_id
- jellyfin_item_id
- subtitle_language_id
- audio_language_id
- visibility_id
- created_at
- modified_at
- modified_by
```

```text
Visibility values
- public
- registered
- fansubber
- staff
- private
```

```text
StreamSource
- id
- provider_type
- external_id
- url
- metadata
```

```text
provider_type values
- jellyfin
- youtube
- vimeo
- direct
```

```text
StreamType values
- episode
- preview
```

### Themes / OP / ED / Kara

```text
Theme
- id
- anime_id
- theme_type_id
- title
```

```text
ThemeType values
- opening
- ending
- insert_song
```

```text
ReleaseThemeAsset
- release_id
- theme_id
- media_id
- created_at
```

```text
ThemeSegment
- id
- theme_id
- start_episode_id
- end_episode_id
```

```text
EpisodeThemeOverride
- release_id
- episode_id
- theme_id
```

### Fansub Groups / Members

```text
FansubGroup
- id
- name
- founded_year
- closed_year
- history_description
```

```text
FansubGroupAlias
- id
- group_id
- alias
```

```text
FansubGroupLink
- id
- group_id
- link_type
- name
- url
```

```text
link_type values
- website
- discord
- twitter
- github
- irc
```

```text
GroupMember
- id
- group_id
- member_id
- joined_year
- left_year
```

```text
Member
- id
- user_id
- nickname
- member_history_description
- slogan
- avatar_media_id
```

### Users / Roles / Contributions

```text
User
- id
- username
- email
- password_hash
- created_at
```

```text
Role
- id
- name
```

```text
ReleaseMemberRole
- release_id
- member_id
- role_id
```

### Member Notes

```text
MemberAnimeNote
- member_id
- anime_id
- text
- created_at
- modified_at
- modified_by
```

```text
MemberEpisodeNote
- id
- release_id
- member_id
- role_id
- text
- created_at
- modified_at
- modified_by
```

## Known Review Notes

- `MemberEpisodeNote` still needs review because the earlier discussion referenced an `episode_id` index while the drafted table shape is release-scoped.
- `Role` and broader user-role modeling still need consolidation against the current auth model.
- The theme segment and migration delete/update strategies still need explicit constraints.

## Recommended Rollout Phases

1. Add lookup/reference tables and metadata joins that do not break current readers.
2. Normalize anime titles, genres, and relations.
3. Introduce the new episode model alongside compatibility adapters.
4. Split `episode_versions` responsibilities into release, version, variant, and stream layers.
5. Normalize media assets and ownership joins.
6. Add contributor notes, roles, and member-facing workflow tables.
7. Migrate readers/writers fully, then remove obsolete columns and tables.

## Immediate Next Step

Turn this draft into a phased migration brief with:

- compatibility strategy
- backfill order
- API/repository impact
- verification gates per phase
