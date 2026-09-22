---
phase: 165-library-discovery-assisted-anime-creation
reviewed: 2026-09-22T12:20:39Z
depth: deep
files_reviewed: 43
files_reviewed_list:
  - backend/go.mod
  - backend/internal/handlers/admin_content_anime.go
  - backend/internal/handlers/admin_content_anime_create_duplicate_integration_test.go
  - backend/internal/handlers/admin_content_anime_create_duplicate_test.go
  - backend/internal/handlers/admin_content_handler.go
  - backend/internal/handlers/admin_content_handler_deps.go
  - backend/internal/handlers/admin_content_test.go
  - backend/internal/handlers/admin_episode_import.go
  - backend/internal/handlers/admin_episode_import_folder_filter.go
  - backend/internal/handlers/admin_episode_import_folder_filter_test.go
  - backend/internal/handlers/admin_episode_import_ownership_test.go
  - backend/internal/handlers/jellyfin_discovery.go
  - backend/internal/handlers/jellyfin_discovery_cache.go
  - backend/internal/handlers/jellyfin_discovery_cache_test.go
  - backend/internal/handlers/jellyfin_discovery_test.go
  - backend/internal/handlers/jellyfin_metadata_resync.go
  - backend/internal/handlers/jellyfin_source_folder_management.go
  - backend/internal/handlers/jellyfin_source_folder_management_integration_test.go
  - backend/internal/handlers/jellyfin_source_folder_management_test.go
  - backend/internal/models/admin_content.go
  - backend/internal/repository/anime_source_links.go
  - backend/internal/repository/anime_source_links_integration_test.go
  - backend/internal/services/anime_create_enrichment.go
  - backend/internal/services/anime_create_enrichment_candidates.go
  - backend/internal/services/anime_create_enrichment_test.go
  - backend/internal/testsupport/phase165_postgres.go
  - backend/internal/testsupport/phase165_postgres_test.go
  - frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.test.tsx
  - frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.tsx
  - frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx
  - frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx
  - frontend/src/app/admin/anime/create/DiscoveryEntryCard.test.tsx
  - frontend/src/app/admin/anime/create/DiscoveryEntryCard.tsx
  - frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx
  - frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.tsx
  - frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.test.ts
  - frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.ts
  - frontend/src/app/admin/anime/create/page.tsx
  - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts
  - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
  - frontend/src/lib/api.admin-anime.test.ts
  - frontend/src/lib/api/admin-anime-intake.ts
  - frontend/src/types/admin.ts
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 165 (Gap Closure 165-14..165-19): Code Review Report

**Reviewed:** 2026-09-22T12:20:39Z
**Depth:** deep
**Files Reviewed:** 43 (production + test, backend/frontend)
**Status:** issues_found

## Summary

Reviewed the full diff `2b7ed45b..HEAD` (23 commits, GAP-05 through GAP-16 plus D-30/D-31) for
backend/ and frontend/. Backend build/vet/tests were executed inside the project's own Docker
backend container (`docker compose exec team4sv30-backend go build/vet/test ./...`); frontend
vitest suites for every touched test file were executed via the frontend container. All
in-scope new/changed tests pass; the two pre-existing unrelated failures observed
(`TestCreateAnimeThemeAllowsSegmentManagerWithReleaseVariantContext`,
`TestCreateAnimeThemeRejectsSegmentManagerWhenReleaseVariantBelongsToOtherAnime`, plus fixture-path
failures under `docs/audits/2026-09-15-jellyfin12/`) are untouched by this diff and reproduce on
files this round never modified — not in scope.

Most of the individual GAP items (GAP-06/D-30 409-vs-500 hardening, GAP-07 folder-scoped preview,
GAP-09 filter-aware empty states, GAP-10 ownership-conflict propagation, GAP-11 URL-persisted
cursor history, GAP-12 post-connect navigation, GAP-14 search-scope fix, GAP-15 singleflight
dedup, GAP-16 card styling, D-31 annotate-not-filter) are implemented correctly, are covered by
tests that genuinely execute the code under test (httptest + real repos, several with dedicated
real-Postgres integration tests), and were verified independently by direct execution in this
review, not just by reading the diff.

However, the **GAP-05 refactor (`connectJellyfinFolderAdditively`, 165-17) introduces a real data-
ownership regression** that reopens the exact RESEARCH.md "Pitfall 3" bug 165-07/D-05 originally
closed, for AniSearch-sourced anime specifically, via the two callers that were NOT the intended
target of the GAP-05 fix. This is a BLOCKER; see CR-01 below with a proven, directly-executed repro.

## Structural Findings (fallow)

None provided for this review (no `<structural_findings>` block was supplied).

## Narrative Findings (AI reviewer)

### CR-01: GAP-05's `connect`-flag refactor reopens Pitfall-3 — AniSearch-sourced `anime.source`/`folder_name` is silently force-overwritten by the routine edit-page "Jellyfin-Metadaten anwenden" flow

**File:** `backend/internal/handlers/jellyfin_source_folder_management.go:59-89` (introduced by commit `2db32bb9`, "fix(165-17): connect-flag drives additive-vs-force-write and audit gating")

**Issue:**

165-17 replaced the old `additive` decision:
```go
additive := strings.HasPrefix(currentSource, "anisearch:") && strings.TrimSpace(explicitSeriesID) != ""
```
with:
```go
additive := connect && currentSource != ""
```
`connect` is `true` **only** for the discovery-duplicate "Mit bestehendem Anime verbinden" caller
(`AniSearchDuplicateDecision.tsx`). It is (correctly) never sent by the two OTHER callers of
`ApplyAnimeMetadataFromJellyfin`:
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx:135-142`
  (`handleApply`, the routine edit-page "Jellyfin-Metadaten anwenden" button)
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx:229-239`
  (`handleSave`, the "adopt a searched Jellyfin candidate's assets" flow — reachable for **any**
  anime via an independent title search, `useJellyfinIntakeImpl.ts:91-111`, completely decoupled
  from whether the anime has ever been Jellyfin-linked)

Both of these callers **always** send a non-empty `jellyfin_series_id` (`preview.jellyfin_series_id`
/ `adoptedJellyfinPreview.jellyfin_series_id` are populated on every successful preview). That means,
for these two callers, `explicitSeriesID != ""` is unconditionally true, which in turn makes
`forceSourceUpdate` (the 7th arg to `ApplyJellyfinSyncMetadata`,
`backend/internal/handlers/jellyfin_source_folder_management.go:85`) unconditionally `true` too.

Combined with `connect == false` for these callers, `additive` is now **always `false`** for them,
regardless of `currentSource`. Before 165-17, `additive` was `true` whenever `currentSource` started
with `"anisearch:"` and an explicit series ID was present — i.e. the OLD code correctly routed this
exact "routine resync on an AniSearch-sourced anime" case into the protective additive branch. The
165-17 comment block (lines 51-53) explicitly (and incorrectly) claims:

> "When `connect == false` (the routine edit-page 'Jellyfin-Metadaten anwenden' resync, the only
> OTHER caller of this function), the force-write path is always used and no audit entry is
> written (GAP-13) -- **byte-identical to this function's pre-165-17 behavior for that caller.**"

This claim is false specifically for anime whose `anime.source` is `anisearch:<id>`. Proven by
direct execution (fake-repo unit test, run inside the project's own backend container against the
current code, not a hypothetical):

```go
source := "anisearch:5170"
animeSource := &models.AdminAnimeSyncSource{ID: 42, Source: &source}
preview := models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "abc123"}
err := h.connectJellyfinFolderAdditively(ctx, testAdminIdentity, 42, animeSource, preview, "abc123", false)
// err == nil
// repo.applyCalls == 1, repo.linkCalls == 0, repo.applyForceSourceUpdate == true
```
`ApplyJellyfinSyncMetadata`'s query (`backend/internal/repository/admin_content_sync.go:212-233`)
unconditionally overwrites `source`/`folder_name` when `forceSourceUpdate == true` and the incoming
value is non-empty — `WHEN $7 = true AND $2 <> '' THEN $2`. So this call would rewrite `anime.source`
from `anisearch:5170` to `jellyfin:abc123` and stomp `folder_name`, with **zero audit entry** (since
`connect == false` also gates the audit write, per GAP-13's own logic at line 91).

**Realistic trigger, no malicious intent required:**
1. Admin uses "Mit bestehendem Anime verbinden" (`connect: true`) to additively link a Jellyfin
   folder to an AniSearch-sourced anime — this is the intended, GAP-05-hardened happy path and
   correctly stays additive. `anime.source` remains `anisearch:X`; `anime_source_links` gains
   `jellyfin:Y`.
2. The anime is now "linked" (`jellyfinSeriesIDFromAnimeSource` finds `jellyfin:Y` in
   `SourceLinks`), so the edit page's "Jellyfin Provenance" card's "Metadaten preview laden" button
   (previously disabled while `context.linked == false`) becomes enabled.
3. Admin later opens the anime's edit page and clicks "Metadaten preview laden" then "Jellyfin-
   Metadaten anwenden" — an ordinary, expected "pull in cover/banner/description" action, with UI
   copy that only talks about protecting/filling individual **fields**, never mentioning that
   `anime.source` itself is at stake.
4. `anime.source` silently flips from `anisearch:X` to `jellyfin:Y`, `folder_name` is overwritten,
   and no audit entry is written.

Independently, `AnimeEditWorkspace.tsx`'s "search Jellyfin by title and adopt assets" flow reaches
the same code path even for an anime that was **never** "Verbunden" at all (it only requires the
admin to search Jellyfin by title and click Save) — an even more common workflow than the discovery-
duplicate screen for existing anime records.

This directly violates the core project constraint "Manual edits must remain authoritative over
Jellyfin imports" (CLAUDE.md) and reintroduces RESEARCH.md Pitfall 3 for exactly the caller 165-17's
own commit message claims is unaffected.

**Test-suite gap that let this ship:** the pre-165-17 test
`TestConnectJellyfinFolderAdditively_ProtectsExistingAniSearchSource` (which asserted an
`anisearch:`-sourced `animeSource` + explicit series ID stayed additive) was deleted outright and
never replaced by an equivalent `connect=false` case. Its replacement,
`TestConnectJellyfinFolderAdditively_UsesForceWritePathWhenNotConnecting`
(`backend/internal/handlers/jellyfin_source_folder_management_test.go:144-180`), only covers
`{empty source}` and `{jellyfin source}` — the `anisearch:` source case was silently dropped from
coverage, which is exactly why this regression shipped despite the round's otherwise strong
real-Postgres/httptest test discipline.

**Fix:** `additive` must protect a non-Jellyfin-prefixed `currentSource` regardless of `connect`,
not only when `connect == true`. For example:
```go
additive := currentSource != "" && (connect || !strings.HasPrefix(currentSource, "jellyfin:"))
```
i.e. always additive when there's a non-Jellyfin source to protect (restoring the old anisearch-
prefix protection for ALL callers), and additionally additive whenever `connect == true` even for a
jellyfin-prefixed `currentSource` (the actual GAP-05 fix for the jellyfin-sourced-anime case). Add
back a `connect=false` + `currentSource="anisearch:..."` regression test asserting `applyCalls == 0`
/ `linkCalls == 1` (or, if product intent is genuinely to allow the routine resync to convert an
AniSearch-owned anime to Jellyfin-owned, that must be an explicit, visible confirmation step in
`AnimeJellyfinMetadataSection.tsx`/`AnimeEditWorkspace.tsx`, not a silent side effect of an assets-only
action).

## Warnings

### WR-01: Misleading code comment asserts an incorrect "byte-identical" behavior guarantee

**File:** `backend/internal/handlers/jellyfin_source_folder_management.go:51-53`
**Issue:** The doc comment on `connectJellyfinFolderAdditively` states the `connect == false` path
is "byte-identical to this function's pre-165-17 behavior for that caller." As shown in CR-01, this
is false for `anisearch:`-sourced anime. A future maintainer reading only this comment (not tracing
the actual `additive` boolean against the old implementation) would reasonably conclude the routine
edit-page resync path was proven unaffected, when it was not.
**Fix:** Correct the comment once CR-01 is fixed, and explicitly document the AniSearch-protection
invariant the function must uphold regardless of `connect`.

### WR-02: `TestConnectJellyfinFolderAdditively_UsesForceWritePathWhenNotConnecting` silently dropped its AniSearch-source case during the 165-17 refactor

**File:** `backend/internal/handlers/jellyfin_source_folder_management_test.go:144-180`
**Issue:** The old test `TestConnectJellyfinFolderAdditively_ProtectsExistingAniSearchSource`
(asserting protection for an AniSearch-sourced anime under a non-additive/force-write scenario) was
deleted rather than adapted to the new `connect` parameter. The renamed replacement test's `cases`
table only exercises `{nil source}` and `{"jellyfin:old"}` — losing test coverage for exactly the
scenario that regressed (see CR-01). This is the direct mechanism by which CR-01 escaped this
round's otherwise thorough gap-closure verification.
**Fix:** Re-add a `{name: "anisearch source, explicit id", source: stringPtrFromValue("anisearch:5170"), explicitSeriesID: "new123", wantForce: false}` (or equivalent additive-path) case to this
table once CR-01 is fixed, so a future refactor cannot silently regress this again.

## Info

### IN-01: `writeJellyfinFolderOwnershipConflict`'s `existing_anime_id`/`existing_title` payload has no frontend consumer yet

**File:** `backend/internal/handlers/jellyfin_source_folder_management.go:115-136`,
`frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.tsx:72-77`
**Issue:** GAP-10's 409 response is documented as being built "so the frontend can offer the same
'Verbinden' decision for that owner," but `AniSearchDuplicateDecision.handleConnect`'s catch block
only surfaces the raw `ApiError` message text — it never reads `error` body's `data.existing_anime_id`/
`existing_title`. Not a bug (the backend-only defense is complete and tested), but the richer payload
is currently unused; worth tracking as follow-up UI work rather than assuming it's already wired up.
**Fix:** No action required for this round; flag for a future UI plan if the "offer to connect to the
actual owner" UX is still desired.

### IN-02: `hist` URL param (GAP-11) grows without an upper bound across repeated pagination

**File:** `frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.ts:140-153`
**Issue:** `handleCursorChange` always appends to `cursorHistory` and `writeParams` always persists
the full array into the `hist` query param; there is no cap. In practice this is bounded by Jellyfin
library size (~2111 items / 50-per-page ⇒ ~42 stack entries in the current largest known dataset,
D-29), so this is unlikely to cause real problems, but there is no defensive upper bound if a much
larger library is imported later.
**Fix:** Optional: cap `cursorHistory` length (e.g. drop the oldest entry once a page-count ceiling is
exceeded) if very large libraries become common; low priority.

---

_Reviewed: 2026-09-22T12:20:39Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
