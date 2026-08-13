---
phase: 20-release-native-episode-import-schema
created: 2026-04-21
status: planned
source: User schema review request after Phase 18/19 UAT
---

# Phase 20: Release-Native Episode Import Schema - Context

## Trigger

Phase 18 and Phase 19 made the episode import flow usable enough to test with real files, but verification of episode 1 showed that apply still writes the old `episode_versions` path as the primary persisted model.

The desired product model is richer:

- canonical episodes come from AniSearch
- episode titles are multilingual and stored separately
- filler information must be retained
- real media files are releases, versions, variants, and streams
- one canonical episode can have multiple releases from different groups
- one real file can cover multiple canonical episodes, for example Naruto 9 and 10 as one file

## Current Schema Audit

Canonical target schema source:

- `docs/architecture/db-schema-v2.md`

The live database already contains much of the target shape:

- `episode_titles`, `languages`, and `episode_types` exist, but import does not consistently populate multilingual titles.
- `fansub_releases`, `release_sources`, `release_versions`, `release_variants`, `release_version_groups`, `stream_sources`, `stream_types`, and `release_streams` exist.
- `release_streams` is closer to the desired `Stream` model than the older `streams` table because it references `stream_source_id`.
- `episode_version_episodes` exists, but it only covers the legacy `episode_versions` model.
- `release_variants` is missing the locked unique constraint on `(release_version_id, filename)` in the observed schema.
- `release_sources` currently carries both `source_type` and `type`; code must choose one canonical write field and keep compatibility deliberate.
- The active import repository still writes legacy `episodes` plus `episode_versions` rather than the normalized release graph as the authoritative target.

## Locked Product Decisions

### Release Graph Becomes Authoritative For New Imports

New episode import apply work must write the normalized release graph:

- `Episode`
- `EpisodeTitle`
- `FansubRelease`
- `ReleaseSource`
- `ReleaseVersion`
- `ReleaseVariant`
- `ReleaseVersionGroup`
- `StreamSource`
- `ReleaseStream`

Legacy `episode_versions` may remain as a read compatibility bridge during migration, but it must not remain the only durable representation of imported media.

### Add Release Coverage For Multi-Episode Files

The user-provided schema has `FansubRelease.episode_id`, but the Naruto requirement needs one file to cover several canonical episodes. Therefore Phase 20 adds one small missing table to the target model:

`ReleaseVariantEpisode`

- `release_variant_id`
- `episode_id`
- `position`

This preserves the user's model while making `9,10` mapping representable without duplicating a file or losing canonical episode coverage.

Because `docs/architecture/db-schema-v2.md` is the canonical target draft, Phase 20 must update that document before creating the migration.

### Filler Metadata Is Episode Metadata

Filler status belongs on canonical episodes, not on release files.

Phase 20 should add the filler shape now documented in `docs/architecture/db-schema-v2.md`:

- `episodes.filler_type_id`
- `episodes.filler_source`
- `episodes.filler_note`
- `EpisodeFillerType` with `unknown`, `canon`, `filler`, `mixed`, and `recap`

If the source can distinguish anime-canon, mixed canon/filler, recap, or special later, that can be widened after the first Naruto verification.

The architecture schema now defines filler fields and the normalized `ReleaseVariantEpisode` coverage join, so Phase 20 implementation must follow those names unless a later decision updates the schema first.

### AniSearch Titles Persist In All Languages We Can Parse

Import should store every parsed title language in `EpisodeTitle`, with display preference:

1. German
2. English
3. Japanese
4. fallback generated title

The existing `episodes.title` field may remain a compatibility/display cache while frontend and APIs migrate.

### Fresh Verification Starts From A Clean Local DB

Before implementing or verifying this phase, clear local dev anime/episode/release/media import state in a controlled reset step. This must only target the local Docker/dev database and project-owned generated media state.

## Naruto Verification Target

The target live scenario is Naruto with roughly 360 canonical episodes available from AniSearch and a Jellyfin library split into seasons.

Verification must prove:

- AniSearch canonical numbering is used instead of Jellyfin season numbering.
- Filler flags are visible/persisted for known filler episodes.
- Multiple files/releases for the same canonical episode persist as distinct releases/versions.
- A single file can map to more than one canonical episode, for example `9,10`.
- The operator can correct season-based Jellyfin numbering into canonical AniSearch numbers before applying.

## Out Of Scope

- Public playback redesign.
- Full anime edit redesign beyond the episode import surfaces needed to verify the schema.
- Removing legacy tables in this phase.
- Production data migration beyond safe additive migrations and local dev reset.
