---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
reviewed: 2026-09-18T09:48:18Z
depth: standard
files_reviewed: 58
files_reviewed_list:
  - backend/cmd/server/admin_routes.go
  - backend/internal/handlers/admin_content_episode_classification.go
  - backend/internal/handlers/admin_content_episode_classification_test.go
  - backend/internal/models/episode_classification.go
  - backend/internal/models/episode_version.go
  - backend/internal/repository/episode_classification.go
  - backend/internal/repository/episode_import_repository_apply.go
  - backend/internal/repository/episode_import_repository_apply_test.go
  - backend/internal/repository/episode_import_repository_release_helpers.go
  - backend/internal/repository/episode_import_repository_release_helpers_test.go
  - backend/internal/repository/episode_version_public_group_filter_test.go
  - backend/internal/repository/episode_version_public_integration_test.go
  - backend/internal/repository/episode_version_public_query.go
  - backend/internal/repository/episode_version_public_scale_fixture_test.go
  - backend/internal/repository/episode_version_public_writes_test.go
  - backend/internal/repository/group_repository_test.go
  - backend/internal/repository/public_note_role_code_integration_test.go
  - backend/internal/repository/public_release_name.go
  - backend/internal/repository/release_detail_public_repository.go
  - backend/internal/repository/release_detail_public_repository_helpers.go
  - backend/internal/repository/release_detail_public_repository_test.go
  - database/migrations/0169_episode_classification_labels.down.sql
  - database/migrations/0169_episode_classification_labels.up.sql
  - frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts
  - frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts
  - frontend/src/app/anime/[id]/page.module.css
  - frontend/src/app/dev/episode-windowing-preview/page.tsx
  - frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.test.tsx
  - frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.tsx
  - frontend/src/components/fansubs/EpisodeGlassCard.tsx
  - frontend/src/components/fansubs/episodePreviewFormat.test.ts
  - frontend/src/components/fansubs/episodePreviewFormat.ts
  - frontend/src/components/fansubs/FansubGroupContext.module.css
  - frontend/src/components/fansubs/FansubGroupContext.tsx
  - frontend/src/components/fansubs/FansubGroupPicker.module.css
  - frontend/src/components/fansubs/FansubGroupPicker.tsx
  - frontend/src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx
  - frontend/src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx
  - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
  - frontend/src/components/fansubs/FansubVersionBrowser.windowing.test.tsx
  - frontend/src/components/fansubs/ReleasePreviewRow.module.css
  - frontend/src/components/fansubs/ReleasePreviewRow.tsx
  - frontend/src/components/fansubs/useWindowedEpisodePages.test.ts
  - frontend/src/lib/api.ts
  - frontend/src/types/episodeClassification.ts
  - frontend/src/types/episodeVersion.ts
  - shared/contracts/openapi.yaml
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 164: Code Review Report (gap-closure plans 164-08..164-13)

**Reviewed:** 2026-09-18T09:48:18Z
**Depth:** standard
**Files Reviewed:** 58 (63 changed paths minus 5 planning artifacts excluded per scope rules)
**Status:** issues_found

## Summary

Reviewed the backend (Go/pgx), frontend (Next.js/TS), and migration changes that close
GAP-01 through GAP-12 from the 2026-09-18 live UAT (164-UAT.md). Most of the changes are
solid: the GAP-02 default-release-name logic is centralized in
`public_release_name.go` and reused identically by both call sites, the GAP-11
DB-sourced label plumbing is wired end-to-end with real httptest/DB-fixture behavior
tests (no source-string-grep tests were introduced), and the seven CSS/contrast fixes
(GAP-04..GAP-10) all use global tokens and the `@/components/ui` primitives as required
by CLAUDE.md.

However, two backend defects in the GAP-12 (episode-type-from-anime.type) change are
serious enough to block: (1) the anime-type-to-episode-type mapping checks for a string
that does not exist in this codebase's anime-type vocabulary, so the fix silently does
nothing for movies; and (2) varying the derived `episode_type_id` per anime breaks an
existing-episode matching query that was written assuming a single constant value,
causing duplicate episode rows (and release/variant misattachment) on re-import for any
non-TV anime whose already-imported episodes were not manually re-classified first. Both
are provable from the code and the tables/tests already in the repo; neither is exercised
by the new tests, which only cover the "brand new anime" and "manually overridden" paths.

## Critical Issues

### CR-01: GAP-12 anime-type mapping never fires for movies (`anime.type` uses `"film"`, not `"movie"`)

**File:** `backend/internal/repository/episode_import_repository_apply.go:130-143`
**Issue:** `mapAnimeTypeToEpisodeType` switches on the literal `"movie"`:
```go
func mapAnimeTypeToEpisodeType(animeType string) string {
	switch animeType {
	case "ova":
		return "ova"
	case "ona":
		return "ona"
	case "movie":
		return "movie"
	case "special":
		return "special"
	default:
		return "episode"
	}
}
```
But this codebase's anime-type vocabulary never produces the string `"movie"`. The
`anime_type` Postgres enum is `('tv', 'film', 'ova', 'ona', 'special', 'bonus')`
(`database/migrations/0001_init_anime.up.sql:4`), the normalized `anime_types` lookup
table seeded in `database/migrations/0030_add_anime_types_table.up.sql:12-19` uses the
same `film` spelling, and the existing admin validation allowlist
(`backend/internal/handlers/admin_content_anime_validation.go:11`) confirms `"film"` is
the real value in use, not `"movie"`. Since `episode_import_repository_apply.go:51`
reads `anime.type` straight from the `anime` table and passes it through unchanged,
every movie-type anime's `case "movie"` branch is dead code: `animeType` will always be
`"film"` for a movie, falls through to `default`, and the episode type is silently set
to `"episode"` again — exactly the GAP-12 bug this plan was supposed to fix, but only
for the movie category.

The new test suite masks this: `openEpisodeImportApplyTypeFixture`
(`backend/internal/repository/episode_import_repository_apply_test.go:18-29`) adds
`anime.type` as a **plain nullable TEXT column** instead of reusing the real
`anime_type` enum/lookup, and `TestEpisodeImportRepositoryDerivesEpisodeTypeFromAnimeType`
(same file, line ~39) feeds it the literal string `"movie"` — a value that can never
actually be stored in `anime.type` in production. The test therefore proves the `switch`
statement's own internal logic, not that it matches real data.

**Fix:** Use the real value:
```go
case "film":
    return "movie"
```
And change the test fixture to alter/seed against the actual `film`/`tv`/`ova`/... vocabulary
(or explicitly assert that `"movie"` is never a real `anime.type` value) so a
regression here fails a test again.

### CR-02: Deriving `episode_type_id` per anime breaks the existing-episode match, creating duplicate episode rows on re-import

**File:** `backend/internal/repository/episode_import_repository_apply.go:50-57` (new anime-type lookup) interacting with the untouched `:206-214` matching query in `upsertImportEpisode`
**Issue:** Before this change, `episodeTypeID` passed into `upsertImportEpisode` was
always the id for the constant `"episode"` row, for every anime. The existing-episode
lookup was written around that assumption:
```go
err = tx.QueryRow(ctx, `
    SELECT id
    FROM episodes
    WHERE anime_id = $1 AND number = $2
      AND (episode_type_id = $3 OR episode_type_source = $4)
    ORDER BY (episode_type_id = $3) DESC, id ASC
    LIMIT 1
    FOR UPDATE
`, animeID, canonical.EpisodeNumber, episodeTypeID, models.EpisodeMetadataSourceManual).Scan(&existingID)
```
Now `episodeTypeID` is derived from `anime.type` per anime (line 54:
`lookupIDByName(ctx, tx, "episode_types", mapAnimeTypeToEpisodeType(animeType))`), so it
varies across anime and, for a given anime, differs from whatever value was stored the
first time this anime was imported (which, for every anime imported before this feature
shipped, is always the `"episode"` id, since that used to be the unconditional default).

Concretely: take an existing OVA/ONA/Movie/Special anime that already has episodes in
the DB with `episode_type_id = <"episode" id>` and `episode_type_source` **not**
`'manual'` (i.e. never individually corrected by an admin in the classification UI).
Re-running the import for that anime (e.g. adding a new fansub group's release for an
already-known episode number, which is a normal, expected workflow) now computes a
*different* `episodeTypeID` (e.g. the `"ova"` id). The `WHERE` clause above no longer
matches the pre-existing row (`episode_type_id` mismatches and `episode_type_source`
isn't `'manual'`), so `pgx.ErrNoRows` is returned and the code takes the `INSERT` branch
instead of the intended `UPDATE` branch — creating a **second** `episodes` row for the
same `(anime_id, number)` with a different type. There is no unique constraint on
`(anime_id, number)` alone (only `uq_episodes_anime_number_type` on
`(anime_id, number, episode_type_id)`, `database/migrations/0045_reconcile_db_schema_v2_columns.up.sql:46-48`),
so the `INSERT` succeeds silently. Worse, `episodeIDsByNumber[number]` in
`applyReleaseNative` (line 74/81) is then populated with the **new duplicate ID**, so
the release/variant graph being imported in that same call attaches to the new,
`status='disabled'` duplicate episode instead of the pre-existing episode that already
carries other groups' releases — fragmenting one logical episode's releases across two
DB rows.

The added tests do not cover this: `TestEpisodeImportRepositoryDerivesEpisodeTypeFromAnimeType`
only imports into a brand-new anime once per subtest (no pre-existing row to collide
with), and `TestEpisodeImportRepositoryNeverOverwritesManualEpisodeType` deliberately
sets `episode_type_source='manual'` before the second import, which is exactly the one
case this query *does* still match correctly. The "pre-existing import-sourced episode,
anime type changed/derived differently than before, second import call" case — the
realistic path for exactly the anime described in GAP-12 (11eyes) before an admin
manually fixes every episode — is untested and broken.

**Fix:** Make the existing-episode lookup independent of the *current* derived
`episodeTypeID` value — match on `(anime_id, number)` alone (there can only legitimately
be one canonical episode per anime+number), and only ever let the manual-source guard
prevent an overwrite, e.g.:
```go
err = tx.QueryRow(ctx, `
    SELECT id FROM episodes
    WHERE anime_id = $1 AND number = $2
    ORDER BY id ASC
    LIMIT 1
    FOR UPDATE
`, animeID, canonical.EpisodeNumber).Scan(&existingID)
```
and keep the `episode_type_source = 'manual'` check only in the `UPDATE`'s `SET
episode_type_id = ...` clause (which already exists correctly for `filler_type_id`/
`filler_source` via the `CASE WHEN filler_source = $9 ...` pattern — the same pattern
should be applied to `episode_type_id`/`episode_type_source`, which today only does
`COALESCE(episode_type_id, $2)`, i.e. it can never actually correct a stale value, only
fill a NULL).

## Warnings

### WR-01: New admin endpoint and its schemas are undocumented in the shared OpenAPI contract

**File:** `shared/contracts/openapi.yaml`, `backend/cmd/server/admin_routes.go:104`, `frontend/src/lib/api.ts:5811-5836`
**Issue:** `GET /api/v1/admin/episode-classification-options` was added to the router,
implemented in the handler/repository, and consumed from the frontend
(`getAdminEpisodeClassificationOptions`), but no path, `EpisodeClassificationOption`, or
`EpisodeClassificationOptionsResponse` schema was added to
`shared/contracts/openapi.yaml` (confirmed: `grep -n "classification-options"
shared/contracts/openapi.yaml` returns nothing). CLAUDE.md documents this file as "the
umbrella contract" and a cross-layer reference between backend and frontend; every other
admin endpoint touched by this phase's sibling PATCH (`/admin/episodes/:id`) already has
contract coverage, so this is a real gap, not a pre-existing condition.
**Fix:** Add the path/schema entries mirroring the existing
`/api/v1/admin/anime/{id}/episode-classifications` block.

### WR-02: GAP-01 logo-URL-from-file_path fix is duplicated (and could re-diverge) across two files instead of being centralized like the GAP-02 fix

**File:** `backend/internal/repository/episode_version_public_query.go:122-125`, `backend/internal/repository/release_detail_public_repository_helpers.go:40`
**Issue:** The UAT root-cause note for GAP-01 explicitly flags that the *same* broken
`COALESCE(logo.file_path, fg.logo_url)` SQL fragment existed in both files
(164-UAT.md lines 37-42). The fix for GAP-02 in this same phase set a precedent for
avoiding exactly this kind of drift by extracting `public_release_name.go` as "the
single backend location" (its own doc comment, lines 5-9) reused by both call sites. The
GAP-01 fix does not follow that precedent: the near-identical
`CASE WHEN NULLIF(TRIM(logo.file_path),'') IS NOT NULL THEN '/api/v1/media/files/' ||
regexp_replace(TRIM(logo.file_path), '^.*/', '') ELSE NULLIF(TRIM(fg.logo_url), '') END`
expression is inlined separately in both files. A future edit to one (e.g. adding
`url.PathEscape`-equivalent handling, see WR-03) can easily miss the other, reproducing
the exact "same bug, two places" failure mode GAP-01 itself was.
**Fix:** Extract a `groupLogoURLSQL()` helper (same pattern as `public_release_name.go`)
and call it from both places.

### WR-03: Group-logo URL built via raw SQL string concatenation has no percent-encoding, unlike the existing Go-side URL builders

**File:** `backend/internal/repository/episode_version_public_query.go:123-125`, `backend/internal/repository/release_detail_public_repository_helpers.go:40`
**Issue:** The fix builds the public logo URL as
`'/api/v1/media/files/' || regexp_replace(TRIM(logo.file_path), '^.*/', '')` directly in
SQL. Every other place in the codebase that turns a stored filename into a public media
URL escapes it first: `MediaRepository.buildPublicURL` uses
`url.PathEscape(trimmed)` (`backend/internal/repository/media_repository.go:469-471`),
and `fansub_media_upload.go:322` / `admin_content_anime_themes.go:2462` do the same. The
new SQL expression skips this entirely. If a group logo's stored filename ever contains
characters that need percent-encoding in a URL path segment (a space, `#`, `?`, or
non-ASCII character — plausible for a logo uploaded with its original filename rather
than a generated UUID name), the resulting `logo_url` will be a broken/garbled link on
both the public anime page and the release detail page.
**Fix:** Either escape in SQL (e.g. wrap with a small `encode_uri_component`-style
function, or pgx-side post-processing) or move basename extraction + escaping into Go
using the existing `buildPublicURL` helper instead of raw SQL string concatenation.

### WR-04: Admin classification dropdowns silently lock up (no error shown) if the options endpoint fails, in tension with CLAUDE.md's "operational errors must be visible immediately" rule

**File:** `frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.tsx:66-83, 128-137`
**Issue:** `loadClassificationOptions()` failures are caught and deliberately swallowed:
```ts
.catch(() => {
  // Fehler bleibt still: die Selects zeigen währenddessen nur den
  // aktuell gesetzten Wert (siehe renderOptions unten). ...
})
```
When `optionsLoaded` never becomes `true` (e.g. the endpoint is down, or the admin's
session expires between mount and this request), `renderOptions` only ever returns the
single current value as an `<option>` (or `null` if the value is currently unset) — the
`<Select>` has at most one selectable option for the lifetime of that mount, and the
admin has no way to change the classification and no indication anything went wrong.
This directly conflicts with the project's own stated constraint ("operational errors
must be visible immediately in the UI", CLAUDE.md "Observability"). The existing test
suite (`EpisodeClassificationFields.test.tsx`) does not cover the options-load-failure
path at all, so this regression path has zero test coverage.
**Fix:** Surface a visible (even if non-blocking) message when the options fetch fails,
e.g. reuse the existing `errorMessage`/`role="alert"` slot already present in this
component for save failures.

### WR-05: `isTechnicalReleaseFilename`'s extension heuristic in the admin editor is looser than — and inconsistent with — the newly authoritative backend rule from the same GAP-02 work

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts:164-166` (used by `buildInitialFormState` at line 170)
**Issue:** This phase's GAP-02 backend rule (`public_release_name.go:28-29`) treats a
title as "looks like a filename" only if it ends in one of a specific, known video
container extension list: `\.(mkv|avi|mp4|m4v|webm|ts|wmv|mov)$`. The admin editor's
sibling heuristic, touched by the same GAP-02 rework (`defaultReleaseTitle` a few lines
above was rewritten in this diff to mirror the backend format), still uses a much
broader pattern:
```ts
function isTechnicalReleaseFilename(value?: string | null): boolean {
  return Boolean(value && /\.[a-z0-9]{2,5}$/i.test(value.trim()))
}
```
This matches *any* trailing `.` + 2-5 alphanumeric characters, not just video
extensions. A legitimately group-entered title such as `"OVA.01"` or `"Special.02"` (a
plausible fansub versioning/naming convention) would be misclassified as "technical" and
`buildInitialFormState` (line 170) would present the edit form's title field as **empty**
instead of showing the real title. If an admin doesn't notice the field is unexpectedly
blank and saves, `normalizeOptional('') → null` (line 201/24-27) is submitted, silently
overwriting the group's real, previously-entered title with `NULL` — the exact kind of
title-integrity loss GAP-02 exists to prevent, just from the opposite direction (hiding
a real title instead of showing a filename).
**Fix:** Reuse the same extension whitelist as the backend (or better, don't duplicate
the rule client-side at all — since the backend now always computes/serves
`release_name`, the editor could special-case only the known video extensions, matching
`public_release_name.go`'s regex exactly).

## Info

### IN-01: Pre-existing native `<button>` in a file touched by this diff (CLAUDE.md UI-primitive rule)

**File:** `frontend/src/components/fansubs/EpisodeGlassCard.tsx:41`
**Issue:** `EpisodeGlassCard`'s disclosure toggle uses a raw `<button type="button" ...>`
rather than the mandatory `@/components/ui` `Button` primitive. This line predates
164-08..13 (only the `classificationAndTypeLine(episode)` call on the line above it was
touched by this phase), so it is not a regression introduced by these commits, but it is
a violation of CLAUDE.md's "Frontend-UI" rule in a file this review was asked to cover,
and is worth flagging for a future pass since the file is now on this phase's radar.

### IN-02: `release_detail_public_repository.go` remains over the 450-line modularity cap

**File:** `backend/internal/repository/release_detail_public_repository.go` (521 lines)
**Issue:** CLAUDE.md caps production files at 450 lines. This file was already at 519
lines before this phase's 4-line GAP-02 edit (now 521); the growth from this diff is
negligible, but the file is directly edited here and remains meaningfully over budget.
Not a regression from this phase, flagged for visibility only.

---

_Reviewed: 2026-09-18T09:48:18Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
