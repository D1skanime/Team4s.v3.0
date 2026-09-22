---
phase: 165-library-discovery-assisted-anime-creation
verified: 2026-09-22T12:30:00Z
status: passed
score: 13/13 must-haves verified (GAP-05, GAP-06/D-30, GAP-07, GAP-09, GAP-10, GAP-11, GAP-12, GAP-13, GAP-14, GAP-15, GAP-16, D-31/GAP-08, admin_content_fansub_releases_test.go pre-existence claim)
overrides_applied: 0
scope_note: >
  This is a supplementary verification pass, scoped specifically to the gap-closure round
  (plans 165-14..165-19, closing GAP-05..GAP-16 from 165-UAT.md plus the D-30/D-31 addendum).
  It does not superseed the existing 165-VERIFICATION.md (round 2, 2026-09-21T21:05:53Z, 20/20
  REQ-165-01..22), which remains the authoritative record for plans 165-01..165-13 and
  GAP-01..GAP-04. This file is named 165-GAP-CLOSURE-VERIFICATION.md specifically to avoid
  overwriting that prior verification history.
gaps: []
warnings:
  - truth: "No already-oversized file grew further during this round (project constraint, explicitly checked)"
    status: partial
    reason: "Two of the three named oversized files grew slightly during 165-17: jellyfin_metadata_resync.go 620 -> 629 lines (+9), admin_episode_import.go 771 -> 775 lines (+4, from 165-14). Both are pre-existing CLAUDE.md 450-line violations from before this round; growth is minimal, transparently documented in the SUMMARYs as an unavoidable minimum (call-site glue that could not be moved to a sibling file without harming readability or duplicating an existing error-response block), and the larger new logic in both cases WAS correctly extracted to new sibling files (admin_episode_import_folder_filter.go, and the new writeJellyfinFolderOwnershipConflict helper placed in the already-under-limit jellyfin_source_folder_management.go rather than growing jellyfin_metadata_resync.go further). anime_create_enrichment.go (the third named file) did NOT grow -- it shrank from 1770 to 1765 lines across 165-18/165-19."
    severity: warning
    artifacts:
      - path: "backend/internal/handlers/jellyfin_metadata_resync.go"
        issue: "620 -> 629 lines (+9), pre-existing violation grew further"
      - path: "backend/internal/handlers/admin_episode_import.go"
        issue: "771 -> 775 lines (+4), pre-existing violation grew further"
    missing:
      - "A future dedicated cleanup plan to split both files back under 450 lines (already flagged as out-of-scope debt by both 165-14-SUMMARY.md and 165-17-SUMMARY.md)"
---

# Phase 165 Gap-Closure Round (165-14..165-19) Verification Report

**Scope:** Plans 165-14 through 165-19, closing GAP-05, GAP-06, GAP-07, GAP-09, GAP-10, GAP-11,
GAP-12, GAP-13, GAP-14, GAP-15, GAP-16 (165-UAT.md) and implementing the D-30/D-31 addendum from
165-CONTEXT.md. GAP-08 is closed via D-31 (annotate-not-filter). REQ-165-15/D-15 (Mehrstaffel,
"teilweise" status) remains an approved deferral, unaffected by this round.

**Verified:** 2026-09-22
**Status:** passed
**Re-verification:** No — this is the first verification pass of the gap-closure round specifically
(165-VERIFICATION.md covers 165-01..165-13 + GAP-01..GAP-04 and is left untouched).

## Goal Achievement

### Observable Truths — Gap Closures

| # | Truth (Gap) | Status | Evidence |
|---|---|---|---|
| 1 | GAP-05: "Verbinden" is always additive to `anime_source_links`; `anime.source`/`folder_name` never overwritten, even when the anime's existing source is `jellyfin:<A>` | ✓ VERIFIED | `connectJellyfinFolderAdditively` (`jellyfin_source_folder_management.go:70`): `additive := connect && currentSource != ""` — no more `strings.HasPrefix(currentSource, "anisearch:")` sniffing. `grep -n "HasPrefix(currentSource"` returns no matches. `TestConnectJellyfinFolderAdditively_AlwaysAdditiveWhenConnecting/jellyfin_source,_explicit_id_(GAP-05...)` executed live — PASS. Real-Postgres proof `TestPhase165Postgres_ConnectJellyfinFolderAdditively_JellyfinMainSourceStaysAdditive` executed live against `team4s_phase165_test_1` — PASS. |
| 2 | GAP-06/D-30: "Trotzdem als neuen Anime anlegen" removed entirely (frontend button + backend ForceNew/ConfirmDuplicate bypass); duplicate AniSearch source returns clean 409, never 500 | ✓ VERIFIED | `grep -rn "ForceNew\|force_new\|ConfirmDuplicate\|confirm_duplicate" backend/internal/{models,services,handlers} frontend/src/app/admin/anime/create frontend/src/types/admin.ts` → zero matches (independently re-run). `syncAnimeSourceLinks` (`anime_source_links.go:46-51`) converts a global `UNIQUE(source)` violation into `ErrConflict` via `isUniqueViolation`. `TestCreateAnime_RealPostgresDuplicateAniSearchSourceReturns409NotInternalError` executed live against real Postgres — PASS. `AniSearchDuplicateDecision.tsx` only renders "Mit bestehendem Anime verbinden" / "Zum vorhandenen Anime wechseln" — read confirmed. |
| 3 | GAP-07: Episode-import preview for an explicitly-selected, additionally-connected Jellyfin folder returns THAT folder's own episodes (not the main folder's, not empty) | ✓ VERIFIED | `resolveEpisodeImportFolderFilterPath` (`admin_episode_import_folder_filter.go`) resolves the selected folder's own path via a single `getJellyfinSeriesByID` call only for a non-main selection. `TestPreviewEpisodeImport_ExplicitAdditionalFolderReturnsThatFoldersEpisodes` executed live against real Postgres (`TEAM4S_PHASE117_TEST_DSN=team4s_phase117_test_164`) — PASS, together with all 6 sibling `TestPreviewEpisodeImport_*` tests including the main-folder regressions. |
| 4 | GAP-09: Status filter applied before pagination (whole scan window resolved, then filtered, then truncated); filter-dependent empty-state copy | ✓ VERIFIED | Backend: `buildJellyfinDiscoveryFilteredPage` (`jellyfin_discovery.go:159-204`) resolves status for the whole remaining scan window before truncating to `limit` — pre-existing from `bf6cc886`, reconfirmed green by `TestJellyfinDiscovery_HasMoreReflectsGenuineFilterMatches`/`_FilteredPaginationAdvancesAcrossRawWindow`, both executed live — PASS. Frontend: `resolveDiscoveryEmptyFilterCopy` (`DiscoveryLibraryPanel.tsx`) replaces the hardcoded "Keine offenen Einträge" with filter-dependent copy for all 4 filters; 3 new tests executed live via `npx vitest run` — PASS. |
| 5 | GAP-10: "Verbinden" only reports success when the link was actually written; owning-anime conflict returns a clear error, no `connected` audit entry | ✓ VERIFIED | `linkAdditionalJellyfinSource` (`anime_source_links.go:94-128`) checks `RowsAffected()`; on zero rows, a same-tx follow-up SELECT distinguishes idempotent retry (nil) from a genuine different-anime conflict (`ErrConflict`), mapped to HTTP 409 with `existing_anime_id`/`existing_title`. `TestConnectJellyfinFolderAdditively_OwnershipConflictReturnsErrorNoAudit` and `TestPhase165Postgres_ConnectJellyfinFolderAdditively_OwnershipConflictReturns409NoAudit` (real Postgres) both executed live — PASS. |
| 6 | GAP-11: Page number and "Zurück"-button survive a full remount after "Zurück zur Bibliothek" | ✓ VERIFIED | `useDiscoveryLibraryFilters.ts`: `cursorHistory` derived from a new URL `hist` param (`decodeHistoryParam`, strict `raw === null` check) instead of local `useState`. 5 new/rewritten GAP-11 tests executed live via `npx vitest run` — PASS (11/11 in `useDiscoveryLibraryFilters.test.ts`). |
| 7 | GAP-12: Successful "Verbinden" navigates the admin away from the stale create draft (to the connected anime, preserving a validated `?return=`) | ✓ VERIFIED | `AniSearchDuplicateDecision.tsx:64-71`: `handleConnect` sends `connect: true`, then `window.location.href` navigates to `conflict.redirectPath` (with `?return=` appended only when `isValidDiscoveryReturnURL` accepts it, reusing `DiscoveryReturnLink`'s own open-redirect guard verbatim). 3 new navigation tests in `AniSearchDuplicateDecision.test.tsx` executed live — PASS. |
| 8 | GAP-13: `jellyfin_discovery.connected` audit event fires only on an explicit "Verbinden", not on every routine edit-page metadata resync | ✓ VERIFIED | `connectJellyfinFolderAdditively` (`jellyfin_source_folder_management.go:91`): `if connect && h.auditLogRepo != nil` gates the audit write. `TestConnectJellyfinFolderAdditively_NoAuditWhenNotConnecting` executed live — PASS. |
| 9 | GAP-14: Library search matches title or the item's own folder name, not a shared path prefix like `/media/Anime/...` | ✓ VERIFIED | `jellyfin_discovery.go:137`: `path.Base(strings.ReplaceAll(strings.TrimSpace(item.Path), "\\", "/"))` — own folder name only, no full-path match. `TestJellyfinDiscovery_SearchMatchesTitleOrFolderNameNotFullPath` (q=`media` → 0 hits; q=`legacy` folder-only hit) executed live — PASS. |
| 10 | GAP-15: Concurrent Discovery snapshot rebuilds are bundled into one real Jellyfin request (single-flight), not N parallel requests | ✓ VERIFIED | `AdminContentHandler.discoverySnapshotGroup singleflight.Group` (`admin_content_handler.go:235`); `buildJellyfinDiscoverySnapshot` wraps the fetch in `h.discoverySnapshotGroup.Do(...)` (`jellyfin_discovery_cache.go:90`). `TestJellyfinDiscoveryCache_ConcurrentRebuildsSingleFlight` (5 parallel goroutines, exactly 1 upstream request asserted) executed live — PASS. |
| 11 | GAP-16: "Aus meiner Bibliothek" card matches the AniSearch/Jellyfin sibling provider cards (default variant, normal-size footer button, full width only on narrow screens) | ✓ VERIFIED | `DiscoveryEntryCard.tsx` no longer sets `variant="elevated"`; the "Bibliothek durchsuchen" `Button` moved into the `Card`'s `footer` slot (existing `.cardFooter` flex layout, no new CSS). `DiscoveryEntryCard.test.tsx` asserts className parity against a reference `Card variant="default"` and `Button variant="primary"`, plus correct footer-slot placement — 3/3 tests executed live — PASS. |
| 12 | D-31/GAP-08: AniSearch candidate search never filters out already-imported anime; annotates with `ExistingAnimeID`/`ExistingTitle` via one batched lookup (no N+1); selecting such a candidate routes to the connect decision | ✓ VERIFIED | `annotateExistingAniSearchCandidates` (new sibling file `anime_create_enrichment_candidates.go`) never skips a candidate — confirmed by direct read (no `continue`/filter in the annotate path). `grep -n "continue"` inside `SearchAniSearchCandidates` shows only the pre-existing, unrelated empty-ID-skip. Frontend: `CreateAniSearchIntakeCard.tsx` renders a per-row "Existiert schon als „…" (#…)" hint using real German quotes/Umlaute (verified: `7eccf8db` diff shows only this addition, the file's pre-existing `Laedt...` ASCII string is untouched by this round). Selection reaches the connect decision through the unchanged `handleAniSearchCandidateSelect` -> `loadAniSearchDraftByID` -> `Enrich()` redirect chain (verified by code read, no new branching needed or added). |
| 13 | `admin_content_fansub_releases_test.go` failures ("unrelated, pre-existing") — independent confirmation | ✓ VERIFIED | `git log -- backend/internal/handlers/admin_content_fansub_releases_test.go` shows the last commit touching this file is `58ea729d` (2026-09-14), well before any 165-14..165-19 commit (all dated 2026-09-22). Re-ran both flagged tests independently in an isolated container with NO `TEAM4S_*_TEST_DSN` set (baseline, unrelated to this round's DB work): both fail identically with `expected 201/404, got 403 ... insufficient_role`, confirming the failure is a pre-existing role-checker/RBAC-fixture issue, reproducible before and unrelated to this round's diff. |

**Score:** 13/13 verified.

### Constraint Checks (explicitly requested)

| # | Constraint | Result | Evidence |
|---|---|---|---|
| 1 | No production file grew past 450 lines; no already-oversized named file grew further | ⚠️ PARTIAL (see warnings in frontmatter) | `anime_create_enrichment.go`: 1770 -> 1765 (shrank, OK). `jellyfin_metadata_resync.go`: 620 -> 629 (+9, grew). `admin_episode_import.go`: 771 -> 775 (+4, grew). Both violations are minimal, transparently self-documented as unavoidable call-site glue in 165-14-SUMMARY.md/165-17-SUMMARY.md, and the bulk of new logic in both cases correctly landed in new/under-limit sibling files. Classified as a WARNING (not a BLOCKER) — does not affect any GAP closure's correctness. |
| 2 | Real Postgres integration tests actually ran for 165-17/165-18/165-19 (not DSN-gate-skipped) | ✓ VERIFIED | Independently re-executed (not SUMMARY-trusted) against the actual `team4s_phase165_test_1` DB (confirmed present via `psql -lqt`) and `team4s_phase117_test_164`: `TestPhase165Postgres_ConnectJellyfinFolderAdditively_JellyfinMainSourceStaysAdditive`, `TestPhase165Postgres_ConnectJellyfinFolderAdditively_OwnershipConflictReturns409NoAudit`, `TestCreateAnime_RealPostgresDuplicateAniSearchSourceReturns409NotInternalError`, `TestPreviewEpisodeImport_ExplicitAdditionalFolderReturnsThatFoldersEpisodes` all executed and PASSED with a live DSN; the same tests SKIP cleanly with the DSN unset (spot-checked for the Phase165 tests), confirming the DSN gate is real, not a no-op. |
| 3 | No existing anime/episode/source data mutated — additive only | ✓ VERIFIED | `git diff --stat` for `database/migrations/` across this round shows zero new migrations (only the pre-existing `0170_library_discovery_ignored_items` from 165-02). All new write paths in this round (`linkAdditionalJellyfinSource`, `syncAnimeSourceLinks`) are `INSERT ... ON CONFLICT DO NOTHING`; no new `UPDATE`/`DELETE` statements against `anime`/`anime_source_links` were added by 165-14..165-19 (the pre-existing folder-removal DELETE is unchanged 165-07/165-10 code, untouched this round). |
| 4 | German UI text uses real umlauts in new/changed strings (165-16/165-18/165-19) | ✓ VERIFIED | Spot-checked new/changed strings: `AniSearchDuplicateDecision.tsx` ("verknüpft", "Verknüpfung fehlgeschlagen", "Änderungen"), `CreateAniSearchIntakeCard.tsx`'s new hint (`Existiert schon als „…" (#…)`, real „ " German quotes), `AnimeJellyfinFolderList.tsx`'s prior fix, `DiscoveryEntryCard.tsx` ("Jellyfin-Bibliothek durchsuchen"). No ASCII ae/oe/ue/ss substitutions found in any string touched by this round's diff (the one pre-existing "Laedt..." instance in `CreateAniSearchIntakeCard.tsx` was NOT touched by 165-19's diff — confirmed via `git show 7eccf8db` showing only the new hint `<span>` added). |
| 5 | Only `@/components/ui` primitives used in new/changed frontend UI code | ✓ VERIFIED | `grep -n "<button\|<input\|<select\|<textarea"` across all new/modified 165-14..165-19 frontend files (`DiscoveryEntryCard.tsx`, `AniSearchDuplicateDecision.tsx`, `DiscoveryLibraryPanel.tsx`, `useDiscoveryLibraryFilters.ts`) → zero matches. `CreateAniSearchIntakeCard.tsx` retains its pre-existing native `<input>`/`<button>` elements (documented D-13 legacy exception, unrelated to this round's own added `<span>` hint, which needs no primitive). ESLint run on all touched files — 0 errors. |
| 6 | `admin_content_fansub_releases_test.go` pre-existing-failure claim | ✓ CONFIRMED INDEPENDENTLY | See Observable Truth #13 above. |

### Required Artifacts (spot-checked)

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend/internal/handlers/admin_episode_import_folder_filter.go` | GAP-07 folder-scoped path resolver | ✓ VERIFIED | 58 lines, new sibling file, wired into `PreviewEpisodeImport` |
| `backend/internal/handlers/jellyfin_discovery.go` | GAP-14 folder-name-only search | ✓ VERIFIED | `path.Base` extraction confirmed, 283 lines |
| `backend/internal/handlers/jellyfin_discovery_cache.go` + `admin_content_handler.go` | GAP-15 singleflight dedup | ✓ VERIFIED | `discoverySnapshotGroup singleflight.Group` field + `.Do(...)` wrap confirmed |
| `frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.ts` | GAP-11 URL-derived cursor history | ✓ VERIFIED | `hist` param encode/decode confirmed, 11 tests pass |
| `frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.tsx` | GAP-09 filter-dependent empty state | ✓ VERIFIED | `resolveDiscoveryEmptyFilterCopy` confirmed |
| `frontend/src/app/admin/anime/create/DiscoveryEntryCard.tsx` | GAP-16 provider-card-consistent styling | ✓ VERIFIED | 31 lines, `variant="elevated"` removed, footer-slot button |
| `backend/internal/handlers/jellyfin_source_folder_management.go` | GAP-05/GAP-10/GAP-13 connect-flag hardening | ✓ VERIFIED | 212 lines, `additive := connect && currentSource != ""` confirmed |
| `backend/internal/repository/anime_source_links.go` | GAP-06/GAP-10 ErrConflict conversion | ✓ VERIFIED | `isUniqueViolation`/RowsAffected-based conflict detection confirmed |
| `frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.tsx` | D-30 two-action-only UI + GAP-12 navigation | ✓ VERIFIED | 126 lines, no "Als neuen Anime anlegen" button present |
| `backend/internal/services/anime_create_enrichment_candidates.go` | D-31 annotate-not-filter helper | ✓ VERIFIED | 30 lines, new sibling file, no filtering logic |

### Behavioral Spot-Checks / Independently Executed Tests

| Check | Command | Result | Status |
|---|---|---|---|
| Backend build (full repo) | `go build ./...` (golang:1.25-alpine, repo mounted) | Clean | ✓ PASS |
| Backend vet | `go vet ./...` | Clean | ✓ PASS |
| GAP-05/06/09/10/13/14/15 handler suite | `go test ./internal/handlers/... -run 'Phase165Postgres\|ConnectJellyfinFolderAdditively\|CreateAnime_RealPostgres\|RemoveAnimeJellyfinFolder\|PreviewEpisodeImport\|JellyfinDiscovery' -v` (real DSN) | 60+ tests, all PASS or correctly SKIP (Phase117-gated, separate DSN) | ✓ PASS |
| GAP-07 real-Postgres suite | `go test ./internal/handlers/... -run PreviewEpisodeImport -v` with `TEAM4S_PHASE117_TEST_DSN` set | 13/13 PASS, 0 skipped | ✓ PASS |
| Frontend Discovery/create suite | `npx vitest run src/app/admin/anime/create` (live container) | 14 files, 165 tests, all PASS | ✓ PASS |
| ESLint (new/changed round files) | `npx eslint DiscoveryEntryCard.tsx AniSearchDuplicateDecision.tsx DiscoveryLibraryPanel.tsx useDiscoveryLibraryFilters.ts` | 0 errors/warnings | ✓ PASS |
| `admin_content_fansub_releases_test.go` baseline reproduction | `go test ./internal/handlers/... -run 'TestCreateAnimeThemeAllowsSegmentManagerWithReleaseVariantContext\|TestCreateAnimeThemeRejectsSegmentManagerWhenReleaseVariantBelongsToOtherAnime' -v` (no DSN, no repo changes) | Both FAIL with identical 403/insufficient_role, confirming pre-existing/unrelated | ✓ CONFIRMED (expected failure, not a regression) |
| `grep` acceptance criteria (ForceNew/ConfirmDuplicate absence) | `grep -rn "ForceNew\|force_new\|ConfirmDuplicate\|confirm_duplicate" backend/internal/{models,services,handlers} frontend/src/app/admin/anime/create frontend/src/types/admin.ts` | Zero matches | ✓ PASS |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `backend/internal/handlers/jellyfin_metadata_resync.go` | whole file, 629 lines | CLAUDE.md ≤450-line limit; pre-existing violation grew by 9 lines this round | ⚠️ Warning | Minimal, documented, unavoidable call-site glue; larger new logic correctly placed in a sibling file instead |
| `backend/internal/handlers/admin_episode_import.go` | whole file, 775 lines | CLAUDE.md ≤450-line limit; pre-existing violation grew by 4 lines this round | ⚠️ Warning | Same pattern — new helper logic correctly extracted to a new sibling file, only minimal glue remains inline |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` debt markers found in any file created/modified by 165-14..165-19 (checked via word-boundary grep across the full round's file list).

### Requirements Coverage

REQ-165-05, REQ-165-06, REQ-165-07, REQ-165-11, REQ-165-13, REQ-165-14, REQ-165-19, REQ-165-20,
REQ-165-02 all have direct gap-closure evidence in this round's diff, confirming/hardening their
original 165-VERIFICATION.md `✓ VERIFIED` status rather than reopening it. No new requirement IDs
were introduced by this round (165-14..165-19 close bugs found in the already-shipped
implementation, not new scope). REQUIREMENTS.md's REQ-165-19 wording still literally says "dieselbe
Verbinden/Neu-Wahl" (old D-20 phrasing, pre-dating D-30's removal of "Neu"); this is a documentation
wording drift, not a code gap — D-30 supersedes that clause and the code correctly implements the
D-30 (verbinden-only) behavior.

### Human Verification Required

None. All 13 truths and all 6 explicitly-requested constraints in this round were machine-verifiable
and independently confirmed by direct code reads plus live test execution (not SUMMARY.md trust).

### Gaps Summary

No blocking gaps. One WARNING-level constraint deviation (two pre-existing oversized files grew
minimally, +9 and +4 lines respectively, both transparently documented as unavoidable in their
SUMMARYs) — does not affect the correctness of any of the 11 closed GAPs. Recommend a future
dedicated cleanup plan to bring `jellyfin_metadata_resync.go` and `admin_episode_import.go` back
under the 450-line limit (both were already over-limit before this round began).

---

_Verified: 2026-09-22T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
