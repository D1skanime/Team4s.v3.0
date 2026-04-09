---
phase: 10-create-tags-and-metadata-card-refactor
plan: "02"
subsystem: backend-tags-persistence
tags: [tags, migrations, repository, normalization, tdd]
dependency_graph:
  requires:
    - 10-01 (AdminTagToken model, ListTagTokens repo stub, handler stub, route registration)
  provides:
    - tags and anime_tags normalized tables in database migrations
    - replaceAuthoritativeAnimeTags repository helper
    - normalizeTagList normalization helper
    - TagsSet/Tags fields on authoritativeAnimeMetadataWrite
    - Tags wired into create and patch persistence paths
    - anime_tags cleanup in both hybrid and V2 delete paths
    - hasAnyAdminAnimePatchField includes Tags.Set
    - TDD test coverage for all tag persistence and token behaviors
  affects:
    - Phase 10 plan 03 (frontend tag UI can now rely on durable backend tag persistence)
tech_stack:
  added: []
  patterns:
    - normalizeTagList mirrors normalizeGenreList for structural consistency
    - replaceAuthoritativeAnimeTags mirrors replaceAuthoritativeAnimeGenres (authoritative replace semantics)
    - TagsSet/Tags on write struct follows existing GenresSet/Genres pattern
    - TDD RED then GREEN: tests added first, then implementation made them pass
key_files:
  created: []
  modified:
    - database/migrations/0019_add_reference_data_tables.up.sql
    - database/migrations/0019_add_reference_data_tables.down.sql
    - database/migrations/0022_add_junction_tables.up.sql
    - database/migrations/0022_add_junction_tables.down.sql
    - backend/internal/repository/admin_content.go
    - backend/internal/repository/admin_content_anime_metadata.go
    - backend/internal/repository/admin_content_anime_delete.go
    - backend/internal/handlers/admin_content_anime_validation.go
    - backend/internal/repository/admin_content_test.go
    - backend/internal/handlers/admin_content_test.go
decisions:
  - normalizeTagList uses strings.Fields for internal whitespace collapse (vs normalizeGenreList which splits on comma — tags arrive as a slice not a CSV string)
  - TagsSet is always true on create (analogous to GenresSet=true) so empty tag lists explicitly clear stored links
  - anime_tags delete cleanup added to both hybrid (legacy) and V2 delete paths for consistency
  - hasAnyAdminAnimePatchField extended to include Tags.Set so a tags-only patch is accepted as a valid update
metrics:
  duration_minutes: 25
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_changed: 10
  files_created: 0
---

# Phase 10 Plan 02: Backend Normalized Tag Persistence Summary

**One-liner:** Normalized `tags` and `anime_tags` schema, authoritative repository write helpers, delete cleanup, and TDD test coverage making tags durable backend metadata parallel to genres.

## What Was Done

### Task 1: TDD failing tests (RED phase)

Added repository tests in `backend/internal/repository/admin_content_test.go`:

- **TestAdminContentRepository_NormalizeTagList_TrimsDedupesSorts** — asserts that `normalizeTagList([]string{" Mecha ", "mecha", "Classic", " classic ", "sci-fi"})` deduplicates case-insensitively and returns a sorted slice of 3 values.
- **TestAdminContentRepository_NormalizeTagList_EmptyInput** — asserts nil return for nil, empty slice, and whitespace-only input.
- **TestAdminContentRepository_BuildAuthoritativeAnimeMetadataCreate_TagsSet** — asserts that a create input with tags produces `TagsSet=true` and a deduplicated normalized slice.
- **TestAdminContentRepository_BuildAuthoritativeAnimeMetadataPatch_TagsSetOnly** — asserts that a patch with tags sets `TagsSet=true` and a patch without tags leaves it false.
- **TestAdminContentRepository_BuildAuthoritativeTagTokensQuery_UsesNormalizedTagStore** — asserts the SQL joins `anime_tags` and `tags` tables with `GROUP BY`.
- **TestAdminContentRepository_FilterTagTokens_PrioritizesPrefixMatches** — mirrors the genre token prefix-priority test for tag tokens.
- **TestAdminContentRepository_DeleteSource_ClearsAnimeTagsLinks** — asserts `admin_content_anime_delete.go` source contains `DELETE FROM anime_tags WHERE anime_id`.

Added handler tests in `backend/internal/handlers/admin_content_test.go`:

- **TestListTagTokens_RejectsUnauthenticatedRequest** — asserts 401 for unauthenticated requests.
- **TestListTagTokens_RejectsOversizedQueryParam** — asserts 400 for query strings over 100 chars.
- **TestListTagTokens_RejectsInvalidLimitParam** — asserts 400 for non-integer limit.
- **TestListTagTokens_RouteDoesNotReuseGenreEndpoint** — asserts the tag handler file calls `ListTagTokens` and does not delegate to `ListGenreTokens`.
- Extended **TestHasAnyAdminAnimePatchField** table with `{"tags set", ..., true}` case.

Also added `"os"`, `"path/filepath"`, and `"runtime"` to handler test imports for `readHandlerSource` helper.

### Task 2: Implementation (GREEN phase)

**Migrations:**

- `database/migrations/0019_add_reference_data_tables.up.sql`: Added `tags (id, name, created_at, updated_at)` table with `UNIQUE (name)` constraint and `idx_tag_name` index.
- `database/migrations/0019_add_reference_data_tables.down.sql`: Added `DROP TABLE IF EXISTS tags` before genres rollback.
- `database/migrations/0022_add_junction_tables.up.sql`: Added `anime_tags (anime_id, tag_id)` junction table with `PRIMARY KEY (anime_id, tag_id)`, cascade deletes, and indexes.
- `database/migrations/0022_add_junction_tables.down.sql`: Added `DROP TABLE IF EXISTS anime_tags` before anime_genres rollback.

**Repository (`admin_content_anime_metadata.go`):**

- Added `TagsSet bool` and `Tags []string` fields to `authoritativeAnimeMetadataWrite`.
- Added `normalizeTagList([]string) []string` helper: trims/collapses internal whitespace with `strings.Fields`, dedupes case-insensitively (first-seen casing wins), sorts ascending.
- Updated `buildAuthoritativeAnimeMetadataCreate` to set `TagsSet: true, Tags: normalizeTagList(input.Tags)`.
- Updated `buildAuthoritativeAnimeMetadataPatch` to set `TagsSet: true, Tags: normalizeTagList(input.Tags.Value)` when `input.Tags.Set`.

**Repository (`admin_content.go`):**

- Added `replaceAuthoritativeAnimeTags(ctx, tx, animeID, tags []string)`: clears `anime_tags` for the anime, upserts each tag into `tags` table, then inserts `anime_tags` links — mirrors `replaceAuthoritativeAnimeGenres`.
- Updated `syncAuthoritativeAnimeMetadata` to call `replaceAuthoritativeAnimeTags` when `write.TagsSet`.

**Repository (`admin_content_anime_delete.go`):**

- Added `DELETE FROM anime_tags WHERE anime_id = $1` to both the hybrid (legacy) and V2 delete association statement slices.

**Handler validation (`admin_content_anime_validation.go`):**

- Extended `hasAnyAdminAnimePatchField` to include `req.Tags.Set` so a tags-only patch request is accepted as a valid update instead of being rejected with "mindestens ein feld ist erforderlich".

## Decisions Made

1. **`normalizeTagList` takes `[]string` not `*string`**: Tags arrive from the API as a JSON array (`[]string`) unlike genres which arrive as a CSV `*string`. The normalization logic uses `strings.Fields` for internal whitespace collapse rather than `strings.Split` on comma.

2. **`TagsSet` always true on create**: Mirrors `GenresSet: true` on create so an empty tag list from a create request explicitly clears any pre-existing links (safe no-op for new records).

3. **Both delete paths updated**: `deleteAnimeAssociations` (hybrid/legacy) and `deleteAnimeAssociationsV2` both received the `anime_tags` delete statement, keeping the two paths symmetric.

4. **`hasAnyAdminAnimePatchField` extended**: This was a Rule 2 auto-fix (missing correctness requirement) — without it a valid tags-only patch would be rejected before reaching the repository.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Correctness] Extended hasAnyAdminAnimePatchField to include Tags.Set**
- **Found during:** Task 2 implementation
- **Issue:** `hasAnyAdminAnimePatchField` in `admin_content_anime_validation.go` did not check `req.Tags.Set`, so any patch request that only set tags would be rejected with a validation error before reaching the repository.
- **Fix:** Added `req.Tags.Set` to the boolean OR chain.
- **Files modified:** `backend/internal/handlers/admin_content_anime_validation.go`

## Known Stubs

None — all tag persistence paths are fully wired. The `tags` and `anime_tags` tables do not exist in the live database until migrations are applied, but the code is complete and correct against the schema defined in the migrations.

## Threat Flags

None — no new network endpoints or auth paths introduced. The `GET /api/v1/admin/tags` route was already registered in Plan 01. The new migration tables are internal data storage with no new trust boundaries.

## Self-Check

- [x] `database/migrations/0019_add_reference_data_tables.up.sql` contains `CREATE TABLE IF NOT EXISTS tags`
- [x] `database/migrations/0022_add_junction_tables.up.sql` contains `CREATE TABLE IF NOT EXISTS anime_tags`
- [x] `backend/internal/repository/admin_content.go` contains `replaceAuthoritativeAnimeTags`
- [x] `backend/internal/repository/admin_content.go` contains `ListTagTokens`
- [x] `backend/internal/repository/admin_content_anime_metadata.go` contains `normalizeTagList`
- [x] `backend/internal/repository/admin_content_anime_metadata.go` applies `normalizeTagList` in both create and patch paths
- [x] `backend/internal/repository/admin_content_anime_delete.go` deletes `anime_tags` in both hybrid and V2 paths
- [x] `backend/cmd/server/admin_routes.go` registers `GET /admin/tags` (from Plan 01, unchanged)
- [x] `backend/internal/handlers/admin_content_anime_validation.go` includes `Tags.Set` in `hasAnyAdminAnimePatchField`
- [x] All 11 tag tests pass: `go test ./internal/repository ./internal/handlers -run "Test.*Tag" -count=1`
- [x] Full test suite passes: `go test ./internal/repository ./internal/handlers ./cmd/server -count=1`
- [x] All modified production files are under 450 lines

## Self-Check: PASSED
