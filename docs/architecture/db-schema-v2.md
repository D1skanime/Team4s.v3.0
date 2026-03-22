# DB Schema v2 Draft

**Status:** Working draft
**Date:** 2026-03-13 (Updated: 2026-03-22)
**Purpose:** Canonical target-model draft for the normalized Team4s schema migration

## Phase Status

| Phase | Status | Date |
|-------|--------|------|
| **A** Reference & Metadata | ✅ Complete | 2026-03-22 |
| **B** Episode Identity | ⏳ Pending | - |
| **C** Release Decomposition | ⏳ Pending | - |
| **D** Media Normalization | ✅ Complete | 2026-03-20 |
| **E** Contributor/Notes | ⏳ Pending | - |

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

### Anime Fansub Relational Schema Notation

# Ein Anime hat **1 bis n Episoden**.

```
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

PRIMARY KEY(id)

FOREIGN KEY (anime_type_id) REFERENCES AnimeType(id)
FOREIGN KEY (modified_by) REFERENCES User(id)

UNIQUE (anisearch_id)
UNIQUE (slug)

INDEX idx_anime_slug (slug)
```

## anime_titles
```
AnimeTitle
- id
- anime_id
- language_id
- title
- title_type_id

PRIMARY KEY(id)

FOREIGN KEY (anime_id) REFERENCES Anime(id)
FOREIGN KEY (language_id) REFERENCES Language(id)
FOREIGN KEY (title_type_id) REFERENCES TitleType(id)

UNIQUE (anime_id, language_id, title_type_id)

INDEX idx_anime_title_anime (anime_id)
INDEX idx_anime_title_language (language_id)
```
### title_type
```
TitleType
- id
- name

PRIMARY KEY(id)

UNIQUE (name)
```

```
type values
- main
- official
- short
- synonym
- romaji  
- japanese  
```
## anime_type

```
AnimeType
- id
- name

PRIMARY KEY(id)

UNIQUE (name)
```

```
AnimeType values
TV  
OVA  
ONA  
Movie  
Special
Bonus
Web
```

## Anime Genre
 ```
Genre
- id
- name

PRIMARY KEY(id)

UNIQUE (name)
 ```

```
AnimeGenre
- anime_id
- genre_id

PRIMARY KEY(anime_id, genre_id)

FOREIGN KEY (anime_id) REFERENCES Anime(id)
FOREIGN KEY (genre_id) REFERENCES Genre(id)

INDEX idx_anime_genre_anime (anime_id)
INDEX idx_anime_genre_genre (genre_id)
```

# AnimeRelation
```
AnimeRelation
- source_anime_id
- target_anime_id
- relation_type_id

PRIMARY KEY(source_anime_id, target_anime_id, relation_type_id)

FOREIGN KEY (source_anime_id) REFERENCES Anime(id)
FOREIGN KEY (target_anime_id) REFERENCES Anime(id)
FOREIGN KEY (relation_type_id) REFERENCES RelationType(id)

INDEX idx_target_anime (target_anime_id)
INDEX idx_relation_type (relation_type_id)
CHECK (source_anime_id != target_anime_id)
```

```
RelationType
- id
- name

PRIMARY KEY(id)

UNIQUE (name)
```
# media_asset
```
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

PRIMARY KEY(id)

FOREIGN KEY (media_type_id) REFERENCES MediaType(id)
FOREIGN KEY (uploaded_by) REFERENCES User(id)
FOREIGN KEY (modified_by) REFERENCES User(id)

INDEX idx_media_asset_type (media_type_id)  
```

## MediaExternalSource
```
MediaExternal
- id
- media_id
- provider
- external_id
- external_type
- metadata

PRIMARY KEY(id)

FOREIGN KEY (media_id) REFERENCES MediaAsset(id)

UNIQUE(provider, external_id, external_type)

INDEX idx_media_external_media (media_id)
INDEX idx_media_external_provider (provider)
INDEX idx_media_external_external (external_id)
```

```
MediaFile
- id
- media_id
- variant
- storage_id
- path
- width
- height
- size

PRIMARY KEY(id)

FOREIGN KEY (media_id) REFERENCES MediaAsset(id)

INDEX idx_media_file_media (media_id)
INDEX idx_media_file_storage (storage_id)
```

```
AnimeMedia
- anime_id
- media_id
- sort_order

PRIMARY KEY(anime_id, media_id)

FOREIGN KEY (anime_id) REFERENCES Anime(id)
FOREIGN KEY (media_id) REFERENCES MediaAsset(id)

INDEX idx_anime_media_anime (anime_id)
INDEX idx_anime_media_media (media_id)
```

```
EpisodeMedia
- episode_id
- media_id
- sort_order

PRIMARY KEY(episode_id, media_id)

FOREIGN KEY (episode_id) REFERENCES Episode(id)
FOREIGN KEY (media_id) REFERENCES MediaAsset(id)

INDEX idx_episode_media_episode (episode_id)
INDEX idx_episode_media_media (media_id)    
```

```
FansubGroupMedia
- group_id
- media_id

PRIMARY KEY(group_id, media_id)

FOREIGN KEY (group_id) REFERENCES FansubGroup(id)
FOREIGN KEY (media_id) REFERENCES MediaAsset(id)

INDEX idx_fansub_group_media_group (group_id)
INDEX idx_fansub_group_media_media (media_id) 
```

```
ReleaseMedia
- release_id
- media_id
- sort_order

PRIMARY KEY(release_id, media_id)

FOREIGN KEY (release_id) REFERENCES FansubRelease(id)
FOREIGN KEY (media_id) REFERENCES MediaAsset(id)

INDEX idx_release_media_release (release_id)
INDEX idx_release_media_media (media_id)   
```

### MediaType
```
MediaType
- id
- name

PRIMARY KEY(id)

UNIQUE (name)
```
#### MediaTypeValues
```
media_type values
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

---
# Episode

```
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
  
PRIMARY KEY(id)  
  
FOREIGN KEY (anime_id) REFERENCES Anime(id)  
FOREIGN KEY (episode_type_id) REFERENCES EpisodeType(id)  
FOREIGN KEY (modified_by) REFERENCES User(id)  
  
UNIQUE (anime_id, number, episode_type_id)  
  
INDEX idx_episode_anime (anime_id)  
INDEX idx_episode_sort (anime_id, sort_index) 
```

```
EpisodeTitle
- id
- episode_id
- language_id
- title

PRIMARY KEY(id)

FOREIGN KEY (episode_id) REFERENCES Episode(id)
FOREIGN KEY (language_id) REFERENCES Language(id)

UNIQUE (episode_id, language_id)

INDEX idx_episode_title_episode (episode_id)
INDEX idx_episode_title_language (language_id)
```

```
Language
- id
- code

PRIMARY KEY(id)

UNIQUE (code)
```

```
EpisodeType
- id
- name

PRIMARY KEY(id)

UNIQUE (name)
```
# FansubRelease

- von **0 bis n Fansubgruppen** gesubbt sein
- Fansubgruppen können **kooperieren**

```
FansubRelease
- id
- episode_id
- source
- created_at
- modified_at
- modified_by

PRIMARY KEY(id)

FOREIGN KEY (episode_id) REFERENCES Episode(id)
FOREIGN KEY (source) REFERENCES ReleaseSource(id)
FOREIGN KEY (modified_by) REFERENCES User(id)

INDEX idx_release_episode (episode_id)
INDEX idx_release_source (source)
```

```
ReleaseSource
- id
- name
- type

PRIMARY KEY(id)

UNIQUE (name)

INDEX idx_release_source_type (type)
```
### ReleaseVersion
```
ReleaseVersion
- id
- release_id
- version
- created_at
- modified_at
- modified_by

PRIMARY KEY(id)

FOREIGN KEY (release_id) REFERENCES FansubRelease(id)
FOREIGN KEY (modified_by) REFERENCES User(id)

UNIQUE (release_id, version)

INDEX idx_release_version_release (release_id) 
```

### ReleaseVariant
```
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

PRIMARY KEY(id)

FOREIGN KEY (release_version_id) REFERENCES ReleaseVersion(id)
FOREIGN KEY (modified_by) REFERENCES User(id)

UNIQUE (release_version_id, filename)

INDEX idx_release_variant_version (release_version_id) 
```
## ReleaseVersionGroup
```
ReleaseVersionGroup
- release_version_id
- fansubgroup_id

PRIMARY KEY(release_version_id, fansubgroup_id)

FOREIGN KEY (release_version_id) REFERENCES ReleaseVersion(id)
FOREIGN KEY (fansubgroup_id) REFERENCES FansubGroup(id)

INDEX idx_release_version_group_version (release_version_id)
INDEX idx_release_version_group_group (fansubgroup_id) 
```

### Stream
```
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
  
PRIMARY KEY(id)  
  
FOREIGN KEY (variant_id) REFERENCES ReleaseVariant(id)  
FOREIGN KEY (stream_type_id) REFERENCES StreamType(id)  
FOREIGN KEY (stream_source_id) REFERENCES StreamSource(id)  
FOREIGN KEY (audio_language_id) REFERENCES Language(id)  
FOREIGN KEY (subtitle_language_id) REFERENCES Language(id)
FOREIGN KEY (visibility_id) REFERENCES Visibility(id)  
  
UNIQUE (variant_id, stream_type_id, audio_language_id, subtitle_language_id)  
  
INDEX idx_stream_variant (variant_id)  
INDEX idx_stream_source (stream_source_id)
INDEX idx_stream_jellyfin (jellyfin_item_id)
```

## Visibility Tabelle
```
Visibility
- id
- name

PRIMARY KEY(id)

UNIQUE(name)
```
#### Visibility Values
```
public  
registered  
fansubber  
staff  
private
```

#### StreamSource
```
StreamSource
- id
- provider_type
- external_id
- url
- metadata

PRIMARY KEY(id)

UNIQUE(provider_type, external_id)

INDEX idx_stream_source_provider (provider_type)
INDEX idx_stream_source_external (external_id)
```

##### provider_type values
```
provider_type values
- jellyfin  
- youtube  
- vimeo  
- direct
```
#### stream_type

```
StreamType values
- episode  
- preview
```
# Opening / Ending / Kara


```
Theme
- id
- anime_id
- theme_type_id
- title

PRIMARY KEY(id)

FOREIGN KEY (anime_id) REFERENCES Anime(id)
FOREIGN KEY (theme_type_id) REFERENCES ThemeType(id)

INDEX idx_theme_anime (anime_id)
INDEX idx_theme_type (theme_type_id)
```

```
ThemeType
- id
- name

PRIMARY KEY(id)

UNIQUE (name)
```

#### ThemeType   values
```
- opening  
- ending  
- insert_song 
```
## ReleaseThemeAsset
```
ReleaseThemeAsset
- release_id
- theme_id
- media_id
- created_at

PRIMARY KEY(release_id, theme_id, media_id)

FOREIGN KEY (release_id) REFERENCES FansubRelease(id)
FOREIGN KEY (theme_id) REFERENCES Theme(id)
FOREIGN KEY (media_id) REFERENCES MediaAsset(id)

INDEX idx_release_theme_stream_release (release_id)
INDEX idx_release_theme_stream_theme (theme_id)
```

```
ThemeSegment
- id
- theme_id
- start_episode_id
- end_episode_id

PRIMARY KEY(id)

FOREIGN KEY (theme_id) REFERENCES Theme(id)
FOREIGN KEY (start_episode_id) REFERENCES Episode(id)
FOREIGN KEY (end_episode_id) REFERENCES Episode(id)


INDEX idx_theme_segment_theme (theme_id)
INDEX idx_theme_segment_start (start_episode_id)
INDEX idx_theme_segment_end (end_episode_id)
```
#### EpisodeThemeOverride
```
EpisodeThemeOverride
- release_id
- episode_id

- theme_id

PRIMARY KEY(release_id, episode_id, theme_id)

FOREIGN KEY (release_id) REFERENCES FansubRelease(id)
FOREIGN KEY (episode_id) REFERENCES Episode(id)
FOREIGN KEY (theme_id) REFERENCES Theme(id)

INDEX idx_episode_theme_override_release (release_id)
INDEX idx_episode_theme_override_episode (episode_id)
```


---

# FansubGroup

```
FansubGroup
- id
- name
- founded_year
- closed_year
- history_description

PRIMARY KEY(id)

UNIQUE (name)

INDEX idx_fansub_group_name (name)
```

## FansubGroupAlias
```
FansubGroupAlias
- id
- group_id
- alias

PRIMARY KEY(id)

FOREIGN KEY (group_id) REFERENCES FansubGroup(id)

UNIQUE (group_id, alias)

INDEX idx_fansub_group_alias_group (group_id)
```

## Group Links
```
FansubGroupLink
- id
- group_id
- link_type
- name
- url

PRIMARY KEY(id)

FOREIGN KEY (group_id) REFERENCES FansubGroup(id)

UNIQUE(group_id, link_type, url)

INDEX idx_fansub_group_link_group (group_id)
INDEX idx_fansub_group_link_type (link_type)
```

### link_type values
```
website  
discord  
twitter  
github  
irc
```

---

## GroupMember
```
GroupMember
- id
- group_id
- member_id
- joined_year
- left_year

PRIMARY KEY(id)

FOREIGN KEY (group_id) REFERENCES FansubGroup(id)
FOREIGN KEY (member_id) REFERENCES Member(id)

UNIQUE (group_id, member_id, joined_year)

INDEX idx_group_member_group (group_id)
INDEX idx_group_member_member (member_id)
```
### Member

Eine Fansubgruppe hat:
- **1 bis n Members**


```
Member
- id
- user_id
- nickname
- member_history_description
- slogan
- avatar_media_id

PRIMARY KEY(id)

FOREIGN KEY (user_id) REFERENCES User(id)
FOREIGN KEY (avatar_media_id) REFERENCES MediaAsset(id)


INDEX idx_member_user (user_id)
INDEX idx_member_avatar (avatar_media_id)
```

# User

```
User
- id
- username
- email
- password_hash
- created_at

PRIMARY KEY(id)

UNIQUE (username)
UNIQUE (email)
```

```
UserRole value
- Admin  
- Moderator  
- Editor  
- User

```

### Rollen / Rechte
```
Role
- id
- name

PRIMARY KEY(id)

UNIQUE (name)
```

```
ReleaseMemberRole
- release_id
- member_id
- role_id

PRIMARY KEY(release_id, member_id, role_id)

FOREIGN KEY (release_id) REFERENCES FansubRelease(id)
FOREIGN KEY (member_id) REFERENCES Member(id)
FOREIGN KEY (role_id) REFERENCES Role(id)

INDEX idx_release_member_role_release (release_id)
INDEX idx_release_member_role_member (member_id)
INDEX idx_release_member_role_role (role_id)
```
### Member Dashboard
```
My Contributions
z.b
Naruto  
13 Episodes  
Role: Translator  
  
Attack on Titan  
12 Episodes  
Role: Typesetter  
  
Bleach  
10 Episodes  
Role: Timer
--------------------------------
Der Member klickt einen Anime.

General Anime Notes
[ Write something about working on this Anime ]


--------------------------------
Episodes
--------------------------------

Episode 1   [ Edit ]
Episode 2   [ Edit ]
Episode 3   [ Edit ]
Episode 4   [ Edit ]
Episode 5   [ Edit ]
Episode 6   [ Edit ]
Episode 7   [ Edit ]
Episode 8   [ Edit ]
Episode 9   [ Edit ]
Episode 10  [ Edit ]
Episode 11  [ Edit ]
Episode 12  [ Edit ]
Episode 13  [ Edit ]

```

```
Episodes  
--------------------------------  
  
Episode 1  
[ textarea ]  
  
Episode 2  
[ textarea ]  
  
Episode 3  
[ textarea ]
```

```
Episode 1   ✏
Episode 2   ✏
Episode 3   ○
Episode 4   ○
```

```
Filter
--------------------------------

[ All ]
[ Missing Notes ]
[ Completed ]
[ Current Project ]
```

### Anime Kommentar by Member
```
MemberAnimeNote
- member_id
- anime_id
- text
- created_at
- modified_at
- modified_by

PRIMARY KEY(member_id, anime_id)

FOREIGN KEY (member_id) REFERENCES Member(id)
FOREIGN KEY (anime_id) REFERENCES Anime(id)
FOREIGN KEY (modified_by) REFERENCES User(id)

INDEX idx_member_anime_note_member (member_id)
INDEX idx_member_anime_note_anime (anime_id)
```

### Episode Kommentar by member

```
MemberEpisodeNote
- id
- release_id
- member_id
- role_id
- text
- created_at
- modified_at
- modified_by

PRIMARY KEY(id)

FOREIGN KEY (release_id) REFERENCES FansubRelease(id)
FOREIGN KEY (member_id) REFERENCES Member(id)
FOREIGN KEY (role_id) REFERENCES Role(id)
FOREIGN KEY (modified_by) REFERENCES User(id)

UNIQUE (release_id, member_id, role_id)

INDEX idx_member_episode_note_release (release_id)
INDEX idx_member_episode_note_episode (episode_id)
INDEX idx_member_episode_note_member (member_id)
```

Ein Member kann mehrere Rollen haben:

- Translator
- Timer
- Typesetter
- Encoder
- QC
- Karaoke




---
# Upload-Workflow

```
User Upload
    │
    ▼
Upload API
    │
    ▼
Temporary Storage
    │
    ▼
Image Processor
    │
    ├─ Original speichern
    ├─ Thumbnail erzeugen
    ├─ Metadaten lesen
    │
    ▼
Filesystem speichern
    │
    ▼
DB Eintrag erstellen
```

### thumbnail generator
code to be find

### Dateiformate Sharp (Node.js)

```
image/jpeg
image/png
image/webp
image/gif
image/animated_gif
```

### Dateibenennung
```
uuid
```
## Security

```
MIME Type
Dateigröße
Dateiendung
```

#### animated GIF Handling

```
GIF → Thumbnail nur erstes Frame
Original → unverändert speichern
```
### löschen
```
DELETE /api/media_asset/{id}
```

#### Server löscht:
```
thumb on file_path
preview on file_path
original on file_path
```

#### CDN oder Reverse Proxy

---

---

# Jellyfin Integration
```
scan jellyfin
parse filenames
create releases
attach media files
```


---

# Performance
```
Redis Cache  
Lazy Loading  
Pagination
Bild-Caching

Lazy Loading
Thumbnail Strategy
Infinite Scroll
Virtualized Lists
CDN Media Delivery
```

```
Content max width 1200–1600px
+ responsive layout
+ optional side panels
  max-width + fluid scaling
```

Beim BIlder 
```
thumb sofort  
preview beim Scrollen  
original beim Klick
```

## Known Review Notes

- `MemberEpisodeNote` is now treated as a blocker-level modeling decision: for migration planning it stays release-scoped, and the stale `episode_id` index reference must not be treated as a valid implementation detail.
- `Role` inside contributor workflow is planning-wise separate from the live authz `roles` / `user_roles` tables unless a later migration phase intentionally unifies them.
- Theme-segment and delete/update rules remain deferred unless they block the core migration slices below; destructive cleanup is not allowed until those rules are explicit for the affected slice.

## Planning Blockers Resolved For This Brief

### `MemberEpisodeNote`
- Planning stance: keep the concept release-scoped unless a future phase explicitly introduces a separate episode-scoped note model.
- Migration impact: later plans must not mix release notes and episode notes into one unresolved table contract.

### Contributor roles vs live authz roles
- Planning stance: admin authorization remains owned by live `roles` / `user_roles`.
- Migration impact: contributor participation roles are a separate domain concept for now and should not drive authz-table changes inside the core migration sequence.

### Constraint and cleanup posture
- Planning stance: delete/update behavior must be defined per migration slice before cleanup, not assumed globally.
- Migration impact: every cleanup step is a late, gated activity that follows schema readiness, backfill checks, and adapter/API parity.

## API And Repository Impact Map

### Stable for now
- Public read routes whose current response shapes still satisfy product needs during early migration slices
- Admin flows that can remain on current contracts while new tables are introduced behind adapters

### Internally adapted
- Repository reads currently centered on `episode_versions`
- Release and group presentation flows that can keep their outward behavior while being served from adapter-backed composition
- Canonical contracts and docs that need migration-aware commentary before any public contract break happens

### Candidate breakpoint surfaces
- Public routes that eventually need to expose release/version/variant/stream distinctions the flat model cannot express cleanly
- Admin mutation surfaces that currently collapse release, stream, and provider identity into one write path

### Likely future API areas
- Richer release/variant/stream inspection surfaces
- Normalized media ownership and linking surfaces
- Contributor-role or notes surfaces only if a later phase keeps those ideas in scope

## Recommended Rollout Phases

### Phase A. Reference and metadata groundwork

**Goal**
- Introduce low-risk reference structures before touching the main coupling seam.

**Primary scope**
- anime titles
- genres and relations
- language / type / lookup entities

**Backfill posture**
- Backfill-only by default
- No dual-write unless a later execution phase proves a specific lookup cannot be cut over safely

**Compatibility stance**
- Public APIs remain stable
- Existing repositories may continue reading old tables while new metadata tables are populated

**Validation gates**
- schema readiness for new reference tables
- backfill correctness for migrated metadata rows
- adapter parity for any repository method that starts reading normalized metadata

**Cleanup eligibility**
- No destructive cleanup in this slice

### Phase B. Episode identity normalization

**Goal**
- Establish a stable episode identity layer before splitting release semantics out of `episode_versions`.

**Primary scope**
- normalized episode identity
- episode titles and episode typing
- clarified boundary between `episodes` and release-bearing rows

**Backfill posture**
- Backfill old episode references into the normalized identity layer
- Keep temporary adapters rather than introducing long-lived parallel write rules by default

**Compatibility stance**
- Stable public APIs where episode identity can remain implicit
- Repository internals may adapt first so downstream release decomposition has a clear base

**Validation gates**
- schema readiness for normalized episode structures
- reconciliation of old episode-number usage against normalized episode identity
- parity checks for repository queries that join episodes to release data

**Cleanup eligibility**
- Only after all consumers stop depending on ambiguous episode-number joins

### Phase C. Release decomposition

**Goal**
- Split current `episode_versions` responsibilities into explicit release, version, variant, and stream layers.

**Primary scope**
- release identity
- release version
- release variant
- stream / provider source

**Backfill posture**
- Backfill-first remains the default
- Dual-write is exceptional and must be justified per execution plan if backfill plus cutover is insufficient

**Compatibility stance**
- Adapter-backed compatibility is expected for early reads and writes
- Public API breakpoints are allowed only as named future slices once the new semantics need exposure

**Validation gates**
- schema readiness for new release/version/variant/stream tables
- backfill correctness between `episode_versions` and normalized release layers
- repository parity for current release/group read paths
- API parity for stable public routes still backed by the old contract

**Cleanup eligibility**
- Cleanup of `episode_versions` responsibilities is a separate late action after parity gates pass

### Phase D. Media normalization

**Goal**
- Normalize media ownership and linking after the release core has been made explicit.

**Primary scope**
- media asset ownership
- anime / episode / release media joins
- external media source references

**Backfill posture**
- Backfill media link tables from existing release- or episode-bound records
- Avoid early media-specific dual-write unless needed to preserve a still-active write surface

**Compatibility stance**
- Existing media-facing routes may stay stable while adapters translate old joins into normalized media ownership
- Future richer media APIs should be called out explicitly before any breakpoint

**Validation gates**
- media-link row reconciliation
- parity for image/video lookup paths affected by the new joins
- explicit contract review before any surface begins exposing richer media distinctions

**Cleanup eligibility**
- Old media attachment paths can only be retired after repository and API parity are proven

### Phase E. Contributor, member, and note alignment

**Goal**
- Bring contributor-tail concepts into the target model only if they are still required once the migration core is complete.

**Primary scope**
- contributor participation roles
- member-note relationships
- non-blocking target-model extensions

**Backfill posture**
- Defer by default
- Only plan backfills here when the core migration has shown these concepts are still required

**Compatibility stance**
- Live authz remains separate unless a dedicated later phase intentionally changes that decision
- Public API additions here should be treated as new capability surfaces, not accidental fallout of core migration

**Validation gates**
- explicit scope confirmation that these concepts still matter after Phases A-D
- separation between contributor workflow roles and live authz roles remains clear
- parity or breakpoint checks for any surviving surface in this slice

**Cleanup eligibility**
- No cleanup of authz or contributor concepts without an explicit unification or retirement decision

## Compatibility And Breakpoint Rules

- Expand-and-migrate remains the default operating model even with selective breakpoints.
- Stable surfaces must be named explicitly.
- Internally adapted surfaces must name the repository or handler seam carrying the compatibility burden.
- Breakpoint surfaces must be called out as intentional future migration slices, never as incidental implementation fallout.
- Public API changes require contract updates before rollout whenever a stable surface stops being stable.

## Validation Gates

Every migration slice above must define and pass all four gate classes before destructive cleanup:

1. **Schema readiness**
   - new tables, constraints, and indexes exist
   - old structures remain intact unless that slice is explicitly a cleanup slice
2. **Backfill correctness**
   - migrated row counts or reconciliation checks are explained
   - foreign-key and nullability assumptions are verified
3. **Adapter or API parity**
   - repository outputs remain behaviorally equivalent where the surface is still stable
   - public API parity is checked for every route that remains contract-stable
   - breakpoint surfaces are documented as such before rollout
4. **Cleanup eligibility**
   - cleanup happens only after schema readiness, backfill correctness, and parity have all passed

## Immediate Next Step

Execute this migration brief in later phases by:

- producing a blocker audit against the target model
- mapping stable, adapted, breakpoint, and future API surfaces to concrete Team4s repositories and handlers
- using the rollout phases above as the canonical sequence for later execution planning
