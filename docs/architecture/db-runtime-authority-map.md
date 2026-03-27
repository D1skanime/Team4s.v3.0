# DB Runtime Authority Map

**Date:** 2026-03-22  
**Purpose:** Record which tables and repository seams are authoritative today for the A-C migration lane  
**Status:** Recovery snapshot, not a final cutover declaration

## Authority Classification

The categories used in this map are:

- **legacy-first:** runtime reads/writes still primarily use pre-normalized tables
- **adapter-backed:** normalized structures may exist, but the runtime still resolves through legacy-compatible seams
- **normalized-first:** runtime primarily trusts the newer normalized tables
- **blocked:** schema exists, but the current runtime does not yet prove the seam is safe to treat as authoritative

## Anime Detail and List Reads

**Classification:** legacy-first

**Primary code path**
- `backend/internal/repository/anime.go`

**Why**
- `List` selects directly from `anime`
- `GetByID` selects direct flat columns from `anime`:
  - `title`
  - `title_de`
  - `title_en`
  - `genre`
  - `description`
- genre arrays are still synthesized from the flat `genre` string in code

**Recovery reading**
- Normalized metadata tables exist, but anime detail/list runtime has not cut over to them.

## Admin Anime Create and Patch

**Classification:** legacy-first

**Primary code path**
- `backend/internal/repository/admin_content.go`

**Why**
- `CreateAnime` inserts into flat `anime` columns
- `UpdateAnime` patches flat `anime` columns including:
  - `title`
  - `title_de`
  - `title_en`
  - `genre`
  - `description`
  - `cover_image`

**Recovery reading**
- Admin mutation flows still treat the flat anime record as canonical write authority.

## Metadata Backfill Services

**Classification:** normalized-first for backfill targets, but not for core read authority

**Primary code path**
- `backend/internal/repository/anime_metadata.go`
- `backend/internal/services/anime_metadata_backfill.go`

**Why**
- The backfill service writes to:
  - `anime_titles`
  - `genres`
  - `anime_genres`
- The service reads from legacy anime columns and normalizes them into the new structures

**Recovery reading**
- This seam proves normalized metadata population exists, but it does not prove the main runtime reads now trust those tables first.

## Episode Grouping and Version Reads

**Classification:** adapter-backed

**Primary code path**
- `backend/internal/repository/episode_version_repository.go`

**Why**
- Episode grouping still resolves versions from `episode_versions`
- Episode titles are joined indirectly from `episodes`
- The repository composes grouped episode results from the legacy transition seam instead of the new release tables

**Recovery reading**
- This is not purely legacy flat anime metadata anymore, but it is still not a normalized release-runtime cutover.

## Group Release Pages

**Classification:** adapter-backed

**Primary code path**
- `backend/internal/repository/group_repository.go`

**Why**
- Group detail stats count distinct `episode_versions`
- Group release listing queries `episode_versions` and only laterally resolves matching `episodes`
- Screenshot counts still derive from `episode_version_images`

**Recovery reading**
- The public group-release experience still rides on the legacy release/version seam plus compatibility joins.

## Release Streaming

**Classification:** legacy-first

**Primary code path**
- `backend/internal/repository/episode_version_repository.go`
- `backend/internal/handlers/episode_version_stream.go`

**Why**
- `GetReleaseStreamSource` selects `media_provider`, `media_item_id`, and `stream_url` directly from `episode_versions`
- The stream handler uses that repository method to build provider proxy URLs

**Recovery reading**
- Even after Phase C schema work, actual stream resolution still trusts `episode_versions`, not normalized `streams`.

## Release Assets Endpoint

**Classification:** legacy-first

**Primary code path**
- `backend/internal/handlers/release_assets_handler.go`

**Why**
- The handler validates release existence by calling `episodeVersionRepo.GetReleaseStreamSource`
- It does not read from `fansub_releases`, `release_versions`, `release_variants`, or `streams`

**Recovery reading**
- The public release-assets contract still uses the legacy release ID seam for existence and access control.

## Phase B Episode Identity Tables

**Classification:** blocked

**Primary schema**
- `episode_types`
- `episode_titles`
- extended `episodes` columns from `0033`

**Why**
- The schema exists and is additive
- Current repository code does not yet demonstrate broad normalized-first usage of these tables in the main runtime seams inspected for recovery

**Recovery reading**
- The structures are available, but the runtime cutover story is not yet proven enough to call them authoritative.

## Phase C Release Tables

**Classification:** blocked

**Primary schema**
- `fansub_releases`
- `release_versions`
- `release_variants`
- `streams`
- `release_version_groups`

**Why**
- The migration set creates and backfills these tables
- The runtime seams inspected during recovery still resolve releases and streams through `episode_versions`
- The current evidence does not yet prove safe parity for normalized release-backed runtime reads

**Recovery reading**
- Phase C schema is present, but runtime authority remains on the transition seam until the cutover brief says otherwise.

## Overall Recovery Verdict

- **Anime/admin metadata authority:** legacy-first
- **Episode/group composition:** adapter-backed
- **Release stream/assets authority:** legacy-first
- **Normalized Phase B and C structures:** blocked for primary runtime authority

## Implication For Phase 05.1

The migration lane should not assume that A-C completion means runtime cutover completion. The next decision has to be made explicitly in the Phase C cutover-recovery brief, using this authority map together with the validation baseline.
