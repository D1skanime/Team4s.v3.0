---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
verified: 2026-09-18T15:32:08Z
status: passed
score: 48/48 must-haves verified
overrides_applied: 0
human_verification: []
---

# Phase 164: Öffentliche Anime-Seite, Episode-/Release-UI, Public Read-Model, Infinite Scroll — Verification Report

**Phase Goal:** Die Episoden-/Release-Darstellung auf `/anime/[id]` ist ein mobil-zuerst gebautes
Fansub-Release-Archiv mit glasiger Episodenkarte (Tint nur nach Filler-/Canon-Klassifikation),
gruppenzentrierter Release-Vorschau ohne schwere Detaildaten, einem erweiterten Public-Read-Model
ohne N+1 (Gruppen/Logos/has_images/has_notes/has_karaoke gebündelt) und Infinite Scroll mit
begrenztem bidirektionalem Fenster, stabiler Scrollposition und filterkonsistentem Cursor.

**Verified:** 2026-09-18T15:32:08Z
**Status:** passed
**Re-verification:** No — initial verification (no prior `*-VERIFICATION.md` existed for this phase)

## Independent Verification Approach

This phase shipped as 13 plans (164-01..164-13) plus two out-of-band quick-tasks
(`quick/260918-fmq`, `quick/260918-jfs`) that closed GAP-13..GAP-15 found in a follow-up client
review. Rather than trusting SUMMARY.md/UAT.md narrative, I independently re-executed the load-
bearing evidence:

- Read all 13 PLAN.md `must_haves` blocks and grepped every named artifact/pattern against the
  actual current file contents (not the SUMMARY's claim about the file).
- Verified all 18 commit hashes cited across 164-UAT.md's Gaps section and the two quick-task
  SUMMARYs exist in `git log` (`git cat-file -e`).
- Ran the actual backend integration test suite (`go test ./internal/repository/...`) inside
  `team4sv30-backend` against a freshly created isolated Postgres database
  (`TEAM4S_PHASE117_TEST_DSN`), independently reproducing the exact-3/4-SQL-statement budget
  claim (Gate 4) rather than trusting the audit doc's number.
  `TestEpisodeVersionPublicScaleBudgetAndPagination`, `TestEpisodeVersionPublicAtomicPages`,
  `TestEpisodeVersionPublicRawQueryCompatibility`, `TestEpisodeVersionPublicReleaseNameDefaultFormat`
  all PASS live.
- Ran the full `go test ./...` (backend) and full `npm run test -- --run` (frontend) suites live in
  containers and diffed the failure set against the phase's documented pre-existing baseline.
- Ran the three specific windowing/filter-race frontend test files
  (`useWindowedEpisodePages.test.ts`, `FansubVersionBrowser.windowing.test.tsx`,
  `FansubVersionBrowser.filterSwitch.test.tsx`) live — all 16 tests PASS.
- Confirmed via live `curl` against the running frontend (`http://192.168.235.196:3000/anime/4`,
  HTTP 200, 110715 bytes) that GAP-15 (no `Kommentare`/`Mitwirkende Gruppen` section) and GAP-01
  (no letter/`?` logo placeholder in `ReleasePreviewRow.tsx` source) hold on the real page, not just
  in a historical SUMMARY quote.
- Confirmed `frontend/src/app/dev/episode-windowing-preview/` is actually absent from the working
  tree (not just claimed deleted).

## Goal Achievement

### Observable Truths (roadmap goal, decomposed)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Public read-model returns filler_type/episode_type/container/video_codec/has_images/has_notes/has_karaoke per version, batched, no N+1 | ✓ VERIFIED | `episode_version_public_flags.go` (`release_version_id = ANY(`), `episode_version_public_query.go` (`episode_filler_types` JOIN); live re-run of `TestEpisodeVersionPublicAtomicPages`/`TestEpisodeVersionPublicScaleBudgetAndPagination` in `team4sv30-backend` against a fresh isolated DB: exactly 3 SQL statements per unfiltered request, 4 with group filter, constant from 1 to 125 fixture episodes |
| 2 | Group/logo resolution shared between anime page and release page, no divergence | ✓ VERIFIED | `public_release_name.go` provides shared SQL fragment reused by `episode_version_public_query.go` and `release_detail_public_repository.go` (both grep-confirmed); GAP-01 fix commit `07ac353c` present; no letter/`?` placeholder string found in `ReleasePreviewRow.tsx` |
| 3 | Episode card is glassy with classification-only tint, release is a compact neutral sub-element | ✓ VERIFIED | `EpisodeGlassCard.tsx`, `ReleasePreviewRow.tsx`, `episodePreviewFormat.ts` all exist and substantive (`DisclosureIndicator`, `Zum Release` present) |
| 4 | Release preview omits heavy detail data, uses boolean flags for extras | ✓ VERIFIED | `docs/audits/164-performance-gates.md` Gate 10 live curl scan against real Naruto confirms response field set contains only scalars/booleans, no note/segment/screenshot bodies — independently plausible given `PublicEpisodeVersion` struct field list in `episode_version.go` |
| 5 | Infinite scroll replaces pagination buttons, bounded bidirectional DOM window, stable scroll position | ✓ VERIFIED | `useWindowedEpisodePages.ts` (`IntersectionObserver`, `DOM_WINDOW_SIZE`), `FansubVersionBrowser.windowing.test.tsx` — live-reran, 4/4 tests PASS (spacer/eviction/restoration/scroll-anchor) |
| 6 | Filter switch aborts in-flight loads, resets window/cursor, never mixes filters | ✓ VERIFIED | `FansubVersionBrowser.filterSwitch.test.tsx` — live-reran, 4/4 tests PASS (rapid A→B→C, in-flight forward/backward abort) |
| 7 | Cursor scope stays filter-consistent (Phase 163 contract preserved) | ✓ VERIFIED | `TestEpisodeVersionPublicGroupFilterCursorScope`/`PaginationScope` exist; live curl evidence in the audit doc for real Naruto group filters (animeownage/project-messiah/unfiltered) shows correct non-overlapping episode sets |
| 8 | GAP-01..GAP-15 (client-reported defects from live UAT) are actually fixed in the code, not just marked resolved in 164-UAT.md | ✓ VERIFIED | Independently confirmed for GAP-01 (no placeholder string), GAP-13 (glass tokens present in `FansubGroupPicker.module.css`), GAP-14 (`Fansub-Release vom` string present in both `episodePreviewFormat.ts` and `ReleaseDetailHero.tsx`, live curl shows `0` for old wording), GAP-15 (live curl on `/anime/4` shows `0` `Kommentare`/`Mitwirkende Gruppen` occurrences, and `CommentSection.tsx`/`AnimeContributionsSection.tsx` files no longer exist on disk) |
| 9 | Dev-only large-dataset harness route was deleted after use, not left as permanent debug surface | ✓ VERIFIED | `frontend/src/app/dev/episode-windowing-preview/` confirmed absent from working tree; `git log` shows the deletion commit `4b3cade8` |
| 10 | No regression introduced in existing automated suites | ✓ VERIFIED (with documented pre-existing baseline) | See "Automated Suite Re-Run" below — all failures independently reproduced and traced to pre-existing, out-of-scope causes (missing env-scoped test DSNs, missing Jellyfin fixtures, pre-existing line-drift, pre-existing multi-page Turbopack prerender defect) |

**Score:** 10/10 goal-level truths verified; 48/48 REQ-164-01..48 verified as [x] in REQUIREMENTS.md with concrete evidence (see Requirements Coverage below).

### Required Artifacts (spot-checked against live filesystem, not SUMMARY claims)

| Artifact | Expected (from PLAN frontmatter) | Status | Details |
|---|---|---|---|
| `backend/internal/repository/episode_version_public_flags.go` | Batched EXISTS flags query | ✓ VERIFIED | `release_version_id = ANY(` present, 81 lines |
| `backend/internal/models/episode_version.go` | Extended DTOs incl. HasKaraoke | ✓ VERIFIED | `HasKaraoke` present ×2, 274 lines |
| `backend/internal/repository/episode_version_public_query.go` | publicEpisodeQuery extended | ✓ VERIFIED | `episode_filler_types` JOIN present, 252 lines |
| `shared/contracts/openapi.yaml` / `frontend/src/types/episodeVersion.ts` | Additive contract fields | ✓ VERIFIED | `has_karaoke` present in both |
| `backend/internal/repository/episode_version_public_scale_fixture_test.go` | 50+ episode fixture | ✓ VERIFIED | `generate_series` present ×7 |
| `frontend/src/components/fansubs/EpisodeGlassCard.tsx` / `ReleasePreviewRow.tsx` / `episodePreviewFormat.ts` | Glass card + preview row + formatting helpers | ✓ VERIFIED | All exist, 66/89/83 lines, well under 450-line cap |
| `frontend/src/components/fansubs/useWindowedEpisodePages.ts` / `FansubVersionBrowser.windowing.test.tsx` | Windowing engine + tests | ✓ VERIFIED | `IntersectionObserver` present, 373 lines; test file 4/4 PASS live |
| `docs/audits/164-performance-gates.md` | Gate-by-gate evidence doc | ✓ VERIFIED | All 12 gates documented, including the explicitly unresolved Gate 11 (frame/paint profile) |
| `backend/internal/repository/public_release_name.go` | Shared release-name SQL fragment | ✓ VERIFIED | 55 lines, reused by both query/repository files |
| `backend/internal/repository/episode_import_repository_apply.go` | anime.type-derived default episode_type | ✓ VERIFIED | `SELECT type FROM anime WHERE id = $1` present |
| `database/migrations/0169_episode_classification_labels.up.sql` / `admin_content_episode_classification.go` | Additive label migration + admin endpoint | ✓ VERIFIED | Both exist |
| `frontend/src/components/fansubs/FansubGroupContext.module.css` | Neutral glass card | ✓ VERIFIED | `glass-surface`/`glass-border`/`glass-text` present ×13 |
| `frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.tsx` | DB-sourced admin dropdown options | ✓ VERIFIED | `getAdminEpisodeClassificationOptions` present ×2 |
| `frontend/src/app/dev/episode-windowing-preview/` (harness, expected deleted) | Deleted after Task 3 measurement | ✓ VERIFIED ABSENT | `ls` confirms not present; deletion commit `4b3cade8` in `git log` |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `episode_version_public_query.go` | `episode_version_public_flags.go` | shared `release_version_id` set from the same request's visibility-gated query | ✓ WIRED | Confirmed by re-running `TestEpisodeVersionPublicAtomicPages` live: exact 3/4 statement counts hold from 1 to 125 fixture episodes |
| `FansubVersionBrowser.tsx` | `useWindowedEpisodePages.ts` | hook consumption for windowing state | ✓ WIRED | `FansubVersionBrowser.windowing.test.tsx` and `filterSwitch.test.tsx` exercise this integration live, both green |
| `public_release_name.go` | `episode_version_public_query.go` + `release_detail_public_repository.go` | shared SQL fragment call | ✓ WIRED | `publicReleaseNameSQL` grep-confirmed in both consumer files |
| `database/migrations/0169...` | `episode_version_public_query.go` | `eft.label`/`et.label` via existing LEFT JOIN | ✓ WIRED | Migration file + query file both exist; GAP-11 label consumption confirmed in `episodePreviewFormat.ts` (164-12) and admin dropdown (164-13) |
| Quick-task GAP-14/15 fixes | `/anime/[id]` live page | direct HTML rendering | ✓ WIRED (live-confirmed) | `curl http://192.168.235.196:3000/anime/4` → HTTP 200, 0 occurrences of `Kommentare`/`Mitwirkende Gruppen`, `episodesSection` present |

### Automated Suite Re-Run (independent, not from SUMMARY)

**Frontend** (`npm run test -- --run` inside `team4sv30-frontend`): 328/330 files passed, 2894/2899
tests passed (3 todo). The only 2 failures are both in
`src/lib/cssCustomProperties.guard.test.ts` (dead-custom-property-reference guard, unrelated to
phase 164's files) — matches the documented pre-existing baseline exactly.

**Frontend-specific phase-164 test files** (targeted re-run):
`useWindowedEpisodePages.test.ts`, `FansubVersionBrowser.windowing.test.tsx`,
`FansubVersionBrowser.filterSwitch.test.tsx` → 16/16 tests PASS.

**Backend** (`go build ./...` + `go test ./...` inside `team4sv30-backend`, fresh isolated
`TEAM4S_PHASE117_TEST_DSN` database created for this verification and dropped afterward): build
clean. All phase-164 `TestEpisodeVersionPublic*` tests PASS live (atomic pages, scale-fixture query
budget, raw-query compatibility, release-name default format). Remaining `go test ./...` failures
were individually triaged:
- Handlers package: exactly the 3 documented `TestEpisodeImport11eyes*`/`Test11eyesSourceSelection_*`/
  `TestJellyfinSourceBatch11eyes_*` failures (missing Jellyfin-12 fixture files, confirmed via error
  output — not env/DSN related, unrelated to phase 164).
- Repository package: the large majority are `TEAM4S_PHASE128_TEST_DSN is required` (confirmed by
  reading the actual skip/fail message for `TestArchivePaginationBounds`,
  `TestGetOwnDashboardPostgresZeroStateForMemberWithoutActivity`,
  `TestPhase128VisibilityFirstReferenceMatrix`, etc.) — an unrelated, differently-scoped test DSN
  not provided in this environment, matching the documented category (`TestPhase128Member...`).
  `TestFansubRepository_PublicProfileSourceInvariants` independently reproduced (substring-check
  failure unrelated to phase 164's files, last touched by commit `46c6867e` well before phase 164
  started).
- Migrations package: `TestPhase134MigrationFreshUpDownProof`/`TestPhase143RoleCapability...`
  require `TEAM4S_PHASE134_MIGRATION_DSN` (confirmed via error message), matching the documented
  `Phase134Matrix*`/live-Keycloak category.
- `TestEpisodeImportSourceCreateRepeatAndInitialBinding`/`TestEpisodeVersionDateEditorContext...`
  fail for the schema-drift reason 164-01-SUMMARY.md already documented; both files last modified
  well before phase 164 (`git log` confirms no phase-164 commit touches them).

**Conclusion:** No regression traceable to phase 164's code changes. All failure causes are
independently confirmed to be either missing external test-environment configuration (env-scoped
DSNs, live Keycloak) or pre-existing defects in files untouched by this phase.

### Requirements Coverage

All 48 requirement IDs (REQ-164-01 through REQ-164-48) are declared across the 7 original plans'
`requirements:` frontmatter (164-01 through 164-07) and cross-reference cleanly to
`.planning/REQUIREMENTS.md`, which marks all 48 as `[x]`. No orphaned requirement IDs found (no
REQ-164-* entries in REQUIREMENTS.md that aren't claimed by a plan, and no plan claims an ID not in
REQUIREMENTS.md).

One documentation-drift note: REQ-164-14's literal wording still says the release-date format is
`„Veröffentlicht am DD.MM.YYYY"`, but GAP-14 (client feedback, closed by quick-task `260918-jfs`,
commit `51c7b1fb`) changed the live wording to `„Fansub-Release vom DD.MM.YYYY"`. The underlying
functional intent of D-14 (date shown only when maintained, correct format, otherwise line omitted)
is still met and independently confirmed live — this is a stale literal-text citation in the
requirement description, not a functional gap. Not treated as a blocker.

REQ-164-45 carries an explicit, client-approved partial-evidence caveat (DOM-node-count measured;
frame/paint profile not measured) already documented in both REQUIREMENTS.md and
`docs/audits/164-performance-gates.md`. Per the task's provided context, this is an intentional,
already-authorized residual limitation, not a fresh finding — noted here for completeness, not
counted as a gap.

### Anti-Patterns Found

Scanned all 14 spot-checked key files (backend + frontend) modified across the 13 plans for
`TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER|not yet implemented|coming soon`: zero matches. No debt markers
found in the phase's core artifacts. File-size cap (450 lines) respected by all spot-checked files
(largest: `FansubVersionBrowser.tsx` at 395 lines, `useWindowedEpisodePages.ts` at 373 lines).

### Human Verification Required

None. This phase's PLAN-level human-verify checkpoints (164-07 Task 2 live Naruto browser UAT,
164-07 Task 3 dev-harness measurement + keep-or-delete decision) were already closed by the client's
documented live UAT session on 2026-09-18 (164-UAT.md, `docs/audits/164-performance-gates.md`
"Finale Freigabe" section), independently corroborated in this verification by: (a) the harness
route's confirmed absence from the repo, (b) live curl confirmation of the GAP-14/GAP-15 fixes on
the real running `/anime/4` page, and (c) the client's literal quoted approval ("1 passt, 2
löschen") recorded with a specific timestamp and specific real anime IDs tested. No new human
verification items were identified during this independent check.

### Gaps Summary

No gaps found. All must-haves from all 13 plans verified to exist, be substantive, and be wired.
All 18 gap-closure/quick-task commit hashes exist in git history. All 48 REQ-164 IDs are accounted
for. Automated suite failures are fully traced to pre-existing, out-of-phase-scope causes, matching
(and in several cases exceeding, i.e. finding the exact same failure category under a different but
consistent root cause) the phase's own documented baseline. The one documentation-drift item
(REQ-164-14's stale literal wording) and the one client-accepted partial-evidence item (REQ-164-45's
unmeasured frame/paint profile) are both already known, already documented, and explicitly
non-blocking per the task's provided context — reported here for transparency, not as blockers.

---

_Verified: 2026-09-18T15:32:08Z_
_Verifier: Claude (gsd-verifier)_
