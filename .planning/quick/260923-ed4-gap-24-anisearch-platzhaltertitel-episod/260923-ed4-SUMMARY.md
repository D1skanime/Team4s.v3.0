---
phase: quick-260923-ed4
plan: 01
subsystem: api
tags: [go, postgres, episode-import, release-name, anisearch, regex]

requires:
  - phase: quick-260923-amz
    provides: "GAP-22 (episodeImportDisplayTitle film-title fallback) and GAP-23 (publicReleaseNameSQL filmEpisodeSQL/filmTitleSQL) that this plan extends and refines"
provides:
  - "isPlaceholderEpisodeTitle/isEinteilerAnimeType (episode_placeholder_title.go) — single Go placeholder/einteiler detection"
  - "episodeImportDisplayTitle treats an AniSearch placeholder title on an einteiler as no real title (import-time)"
  - "einteilerEpisodeSQL/einteilerAnimeTitleSQL/episodeTitlePlaceholderSQL (public_release_name.go) — read-time equivalent, works on existing legacy data without migration"
affects: [episode-import, public-release-name, admin-anime-episodes]

tech-stack:
  added: []
  patterns:
    - "Go regexp and Postgres ~* regex kept as two independently-maintained but fall-identical implementations, cross-referenced by comment, with parallel unit/integration test coverage to prevent drift"

key-files:
  created:
    - backend/internal/repository/episode_placeholder_title.go
    - backend/internal/repository/episode_placeholder_title_test.go
    - backend/internal/repository/release_detail_public_repository_gap24_test.go
  modified:
    - backend/internal/repository/episode_import_repository_apply.go
    - backend/internal/repository/episode_import_repository_test.go
    - backend/internal/repository/episode_import_repository_apply_test.go
    - backend/internal/repository/public_release_name.go
    - .planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md

key-decisions:
  - "Einteiler = anime.type='film' (always) OR type IN ('ova','ona','special','bonus') with exactly one canonical episode; tv is never an einteiler"
  - "A placeholder title never overrides a real title, even on an einteiler — isPlaceholderEpisodeTitle only fires on litte-endian number matches or the bare prefix form"
  - "public_release_name.go's read-time SQL fix works on already-stored legacy placeholder data (anime #6/#7/#9) without any migration — purely a query-time rule"

patterns-established:
  - "GAP-24 refines GAP-23's earlier 'films always show the anime title' claim — a genuine film-segment episode title now correctly wins over the anime title"

requirements-completed: [GAP-24]

duration: ~40min
completed: 2026-09-23
---

# Phase quick-260923-ed4: GAP-24 AniSearch-Platzhaltertitel bei Einteilern Summary

**AniSearch-Platzhaltertitel wie "Episode 1" zählen bei Einteilern (Film immer; OVA/ONA/Special/Bonus mit genau einer kanonischen Episode) nicht mehr als echter Titel — weder beim Import noch beim Lesen des Standard-Release-Namens, auch nicht für bereits gespeicherte Bestandsdaten.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-09-23T10:38:00Z (first file read/context gathering)
- **Completed:** 2026-09-23T10:57:00Z (task 4 UAT commit)
- **Tasks:** 4/4
- **Files modified:** 8 (3 new, 5 modified)

## Accomplishments

- Single canonical Go placeholder/einteiler detection (`episode_placeholder_title.go`): `isPlaceholderEpisodeTitle` recognizes "Episode N"/"Folge N"/"Ep. N" (case-insensitive, leading zeros, with/without period, with/without space) plus the bare "Episode"/"Folge"/"Ep." forms; `isEinteilerAnimeType` derives the einteiler predicate from anime type + canonical episode count.
- Import-time wiring (`episode_import_repository_apply.go`): `applyReleaseNative` now derives `isEinteiler` via `countEffectiveCanonicalEpisodes` (union of already-stored + currently-batched canonical episode numbers) instead of the old film-only `isFilm`; `episodeImportDisplayTitle` treats a placeholder title on an einteiler as if no real title existed (falls back to the anime title), while a genuine scraped title (e.g. "Parody Mode") always wins.
- Read-time wiring (`public_release_name.go`): `einteilerEpisodeSQL` (renamed from `filmEpisodeSQL`) adds a third OR-branch for `ova`/`ona`/`special`/`bonus` with exactly one canonical episode (`COUNT(*)`-based, independent of `episode_type_id`); new `episodeTitlePlaceholderSQL` mirrors the Go regex in Postgres `~*` syntax; `publicReleaseNameSQL`'s CASE expression now prefers the anime title only when the einteiler's episode title is NULL or a placeholder, otherwise uses the real episode title — this works read-only on already-stored placeholder legacy data (verified live against anime #6/#7/#9) without any migration.
- `165-UAT.md` records GAP-24 as `status: resolved`.
- Live proof against the rebuilt backend: anime #9's release name changed from `"Episode 1 · (...) · v1"` to `"Accel World: Infinite Burst · (Dragon-Subs × Red-Panda Fansubs) · 1"`; anime #6's GAP-23 fix (`".hack//G.U. Trilogy · (Generation: Anime Xtreme) · v1"`) remains unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Gemeinsame Platzhalter-/Einteiler-Erkennung (Go)** - `75b78258` (feat)
2. **Task 2: Import-Zeit-Verdrahtung — Einteiler-Ableitung und platzhalter-bewusster Fallback** - `da2ef68a` (feat)
3. **Task 3: Lese-Zeit-Verdrahtung — Release-Name-SQL für Einteiler-Platzhalter** - `a85e76e3` (feat)
4. **Task 4: 165-UAT.md-Eintrag** - `e5c0f058` (docs)

**Plan metadata:** this SUMMARY.md + STATE.md update (committed separately by the orchestrator)

## Files Created/Modified

- `backend/internal/repository/episode_placeholder_title.go` - single Go implementation of `isPlaceholderEpisodeTitle`/`isEinteilerAnimeType`
- `backend/internal/repository/episode_placeholder_title_test.go` - table-driven unit tests for both functions
- `backend/internal/repository/episode_import_repository_apply.go` - `countEffectiveCanonicalEpisodes`, `isEinteiler` derivation, `firstScrapedEpisodeTitle` extraction, placeholder-aware `episodeImportDisplayTitle`
- `backend/internal/repository/episode_import_repository_test.go` - four new GAP-24 cases in `TestEpisodeImportDisplayTitle_UsesFilmTitleFallback`
- `backend/internal/repository/episode_import_repository_apply_test.go` - two new Postgres integration tests (film vs. series placeholder, single- vs. two-episode OVA einteiler boundary)
- `backend/internal/repository/public_release_name.go` - `einteilerEpisodeSQL`/`einteilerAnimeTitleSQL` (renamed), new `episodeTitlePlaceholderSQL`, extended `publicReleaseNameSQL` CASE expression
- `backend/internal/repository/release_detail_public_repository_gap24_test.go` - new Postgres integration test file, five cases (film placeholder, film real title, OVA single-episode placeholder, OVA multi-episode series behavior, group-title priority)
- `.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md` - GAP-24 `status: resolved` entry

## Decisions Made

- Einteiler predicate centralized in Go (`isEinteilerAnimeType`) and duplicated (not shared) in Postgres SQL, since Go `regexp` and Postgres `~*` are two different regex engines — cross-referenced by comment on both sides, with parallel test coverage (`TestIsPlaceholderEpisodeTitle` and the new Postgres integration test) covering the identical case list to prevent drift.
- `countEffectiveCanonicalEpisodes` takes the union of already-stored episode numbers and the current import batch's canonical numbers, since an anime can be imported in partial batches — a single-episode batch for an anime that already has a second stored episode must not be misclassified as an einteiler.
- The read-time SQL fix intentionally does not migrate any stored data (per the plan's explicit "no migration" constraint) — it recomputes the release name on every read, so already-affected anime (#6/#7/#9) get the correct name immediately without any backfill.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `docker compose watch` not running — container source was stale relative to host**

- **Found during:** Task 1 (first `go test` invocation returned "no tests to run" for the new file)
- **Issue:** `docker-compose.override.yml` only live-syncs `./backend` into the running dev container via `docker compose watch`'s sync action, which was not running in this session. `docker exec ... go test` was silently running against the container's build-time-baked copy of the source, not the just-edited host files.
- **Fix:** Used `docker cp` to push each edited/created backend file into the running container before every `go build`/`go vet`/`go test` verification step during Tasks 1-3. Task 4's `docker compose up -d --build` performs the real, permanent rebuild that the live container now runs against.
- **Files modified:** none (tooling workaround only, no source change)
- **Verification:** `go build ./...`/`go vet ./...` clean after each sync; final `docker compose up -d --build team4sv30-backend` + `/health` 200 confirms the permanent rebuild picked up all changes.
- **Committed in:** n/a (not a code change)

**2. [Rule 1 - Bug] Incomplete `MediaCandidate` fixtures caused new integration tests to fail with "incomplete jellyfin source: conflict"**

- **Found during:** Task 2 (first Postgres integration test run for the two new tests)
- **Issue:** The initial minimal `MediaCandidate{MediaItemID, MediaSourceID}` literals omitted `StreamsComplete`/`SourceFileNameUnique`/stream-track fields that `jellyfin_source_repository.go`'s snapshot-write path requires; every new test failed with `incomplete jellyfin source: conflict`.
- **Fix:** Added `gap24MediaCandidate`/`gap24FansubGroup` test helpers mirroring the existing `episodeSourceInput()` fixture shape (full `MediaCandidate` with `Container`/`VideoQuality`/`VideoCodec`/`AudioCodec`/`DurationSeconds`/`StreamURL`/`StreamsComplete`/`SelectedAudioIndex`/`AudioTracks`/`SubtitleTracks`) and used them in all four new integration test cases.
- **Files modified:** `backend/internal/repository/episode_import_repository_apply_test.go`
- **Verification:** all four new subtests pass against the real Postgres fixture.
- **Committed in:** `da2ef68a` (part of Task 2 commit)

**3. [Rule 1 - Bug] Plan's literal port `8092` does not match this environment's actual `BACKEND_PORT`**

- **Found during:** Task 4 (health check / live read check)
- **Issue:** `.env` sets `BACKEND_PORT=18092`, so the backend is reachable at `http://192.168.235.196:18092`, not `:8092` as literally written in the plan's verification commands.
- **Fix:** Used the actual configured port (`18092`) for the `/health` check and the live episode-read checks; both succeeded (200, correct release names).
- **Files modified:** none (verification-command adjustment only)
- **Verification:** `curl -sf http://192.168.235.196:18092/health` returned `200`; live episode reads for anime #6/#9 returned the expected release names.
- **Committed in:** n/a (not a code change)

**4. [Rule 3 - Blocking issue] Stale Next.js `.next/dev/types` artifact broke `tsc --noEmit`**

- **Found during:** Task 4 (frontend typecheck)
- **Issue:** `tsc --noEmit` failed with `Property 'buildCreateSuccessMessage' is incompatible with index signature` in a Next.js-generated `.next/dev/types/app/admin/anime/create/page.ts` file — this is the same recurring, already-documented artifact class from Phase 165 (165-05/165-16/165-17/165-18-SUMMARY.md, `deferred-items.md`), unrelated to any file this plan touches (confirmed via `git diff --stat` showing zero changes to `page.tsx`).
- **Fix:** `rm -rf .next/dev/types` inside the frontend container (gitignored, container-local generated artifact, regenerates automatically), then re-ran `tsc --noEmit`, which passed cleanly.
- **Files modified:** none (generated artifact, not tracked in git)
- **Verification:** `npm run typecheck` clean after removing the stale directory.
- **Committed in:** n/a (not a code change)

---

**Total deviations:** 4 auto-fixed (2x Rule 3 tooling/verification workarounds, 1x Rule 1 test-fixture bug fix, 1x Rule 1 verification-command port correction)
**Impact on plan:** All auto-fixes were necessary to actually execute and verify the plan in this environment; no scope creep, no production-code deviation from the plan's specified behavior.

## Issues Encountered

None beyond the deviations documented above.

## Pre-existing, Out-of-Scope Test Failures (confirmed unrelated, not fixed)

Full backend `go test ./...` and frontend `npm run test`/`typecheck`/`lint` were run per the plan's Task 4 verification. The following failures are pre-existing, already documented in `STATE.md`/prior quick-task summaries (most recently `260923-amz-SUMMARY.md`), and confirmed via `git diff --stat` to be in files this plan did not touch:

- **Backend:** `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`, `Test11eyesSourceSelection_AllActualItemsAndPermutations/*`, `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery` — missing `docs/audits/2026-09-15-jellyfin12/fixtures/*.json` files in the Docker build context.
- All `TestPhase128*` — require `TEAM4S_PHASE128_TEST_DSN` (not set for `go test ./...` without explicit DSN export).
- All `TestPhase134*` — require a live server on port 18093 and/or working Keycloak password-grant credentials (`sheppert@team4s.local` `invalid_grant`).
- `TestPhase134MigrationFreshUpDownProof`, `TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible` — require `TEAM4S_PHASE134_MIGRATION_DSN`.
- `TestEvaluateMemberMutationConflictBlocksLastActiveManager`, `TestFansubRepository_PublicProfileSourceInvariants` — untouched files, pre-existing failures.
- `TestEpisodeVersionDateEditorContextBothSurfacesAndFailure/admin=true` — pre-existing unrelated `column e.filler_source does not exist` schema-drift in `episode_classification.go` (untouched file).
- `TestClaimSubmitBlockedForMemorialProfile`, `TestClaimBlockWritesDeniedAudit`, `TestClaimBlockDeniedAuditOutcomeColocated`, `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers` — pre-existing, untouched files.
- **Frontend:** 2 pre-existing `cssCustomProperties.guard.test.ts` failures (documented dead custom-property reference in `roleCatalog.accessibility.test.ts`, out of any plan's editable scope).
- **Frontend lint:** 3 pre-existing errors (1 `react/no-unescaped-entities` in `CapabilityDetailRow.tsx`) + ~320 pre-existing `no-restricted-syntax`/unused-var/`no-img-element` warnings across untouched files — same count class as documented in `260923-amz-SUMMARY.md`.

None of the above were caused by this plan; all were confirmed pre-existing via `git diff --stat` against files this plan's `files_modified` list touches.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

GAP-24 is fully resolved at both the import layer and the read layer, and the fix applies retroactively (read-only) to already-stored legacy placeholder data without any migration. No known blockers. `165-UAT.md`'s Gaps list now shows GAP-22/GAP-23/GAP-24 all `status: resolved`.

---
*Phase: quick-260923-ed4*
*Completed: 2026-09-23*

## Self-Check: PASSED

All created/modified files verified present on disk; all four task commit hashes (`75b78258`, `da2ef68a`, `a85e76e3`, `e5c0f058`) verified present in `git log`.
