# Phase 174 — Hotspot Analysis (Welle 1)

**Produced by:** 174-01 (Welle 1 — Analyse, kein Refactoring per D-05)
**Date:** 2026-10-04
**Status:** Authoritative. Supersedes `174-RESEARCH.md`'s own first-pass judgment on `api.ts` domain bucketing and D-07 semantic-identity verdicts (RESEARCH.md explicitly flags those as LOW-confidence drafts requiring this plan's re-verification).

This is the single source of truth every subsequent Phase 174 plan (174-02 through 174-26) cites for "which exact file is this wave touching, and why." No refactoring happened to produce this document (D-05).

---

## Baseline Measurements (re-verified 2026-10-04)

All commands below were re-run live against the current `main` working tree (not copied from `174-RESEARCH.md` without re-confirming), per this task's explicit instruction. **No deltas found** — every number below matches `174-RESEARCH.md`'s original measurement exactly, confirming no other work landed on `main` touching these files between the research pass and this plan's execution (same calendar day, 2026-10-04).

### Frontend TS/TSX files (production only, `*.test.*` excluded)

Command: `find frontend/src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -name "*.test.*" | xargs wc -l | sort -rn`

- **678 production files, 121,435 total lines** [RE-VERIFIED, matches RESEARCH.md exactly]
- **33 files exceed the CLAUDE.md 450-line rule.**
- Largest: `frontend/src/lib/api.ts` (11,508), `useAdminAnimeCreateController.ts` (1,505), `GroupMediaReviewSection.tsx` (1,415), `admin/fansubs/create/page.tsx` (1,172), `types/admin.ts` (1,169), `EpisodeVersionEditorPage.tsx` (966), `admin/fansubs/merge/page.tsx` (965), `AnimeEditWorkspace.tsx` (846), `ReleaseVersionMediaSection.tsx` (826), `admin/fansubs/page.tsx` (816), `me/profile/page.tsx` (783), `types/fansub.ts` (765), `ReleaseVersionNotesTab.tsx` (743) — full list in the raw scan, not reproduced here for brevity (unchanged from RESEARCH.md's table).

### Backend Go files (production only, `_test.go` excluded)

Command: `find backend/internal -type f -name "*.go" -not -name "*_test.go" | xargs wc -l | sort -rn`

- **521 production files, 113,621 total lines** [RE-VERIFIED, matches RESEARCH.md exactly]
- **46 files exceed the CLAUDE.md 450-line rule.**
- Largest: `fansub_repository.go` (2,657), `admin_content_anime_themes.go` (2,482), `anime_assets.go` (1,880), `admin_content_release_version_media.go` (1,358), `anisearch_client.go` (1,217), `media_repository.go` (1,153), `fansub_group_app_members_repository.go` (1,083), `anime_create_enrichment.go` (1,059), `app_profile.go` (1,042), `permissions.go` (968), `admin_content_anime_theme_segments.go` (967).

### CSS module files (`*.module.css`)

Command: `find frontend/src -name "*.module.css" | xargs wc -l | sort -rn`

- **155 total files, 41,201 total lines** [RE-VERIFIED, matches RESEARCH.md exactly]
- **25 files exceed 450 lines.**
- Largest: `FansubEdit.module.css` (4,568), `ui.module.css` (2,085), `dev/ui-system/page.module.css` (1,868), `admin/anime/create/page.module.css` (1,773), `contributions.module.css` (1,018), `episodes/import/page.module.css` (961).

### Dependency cycles (madge 8.0.0, re-run live)

Command: `npx --yes madge --circular --extensions ts,tsx <path>` inside `team4sv30-frontend` (rebuilt fresh during this plan — see "Container freshness" note below; re-run again post-rebuild to confirm no drift).

- `frontend/src/lib` (74 files, contains `api.ts`): **0 circular dependencies.** [RE-VERIFIED] This is Welle 2's pre-split baseline — D-23's closing audit must reconfirm 0, D-11 forbids introducing any.
- Full `frontend/src` (1,192 files): **7 circular dependencies**, identical list to RESEARCH.md, none involving `lib/api.ts` [RE-VERIFIED twice — once before, once after the frontend container rebuild below, same 7 cycles both times]:
  1. `ReleaseVersionMediaSection.helpers.tsx` ↔ `useReleaseVersionMedia.ts`
  2. `SegmentEditPanel.tsx` ↔ `SegmentAssetSection.tsx`
  3. `SegmentEditPanel.tsx` ↔ `SegmentBasicFieldsSection.tsx`
  4. `GroupMemberFormModals.tsx` ↔ `useGroupMembersTab.ts`
  5. `GroupMembersTab.tsx` → `GroupMemberFormModals.tsx` → `useGroupMembersTab.ts` (transitive)
  6. `MediaUpload.tsx` ↔ `MediaUploadCore.tsx`
  7. `memberBadgeFamilies.ts` ↔ `memberBadgeLabels.ts`

Backend: no cycle-detection tooling needed — `go build ./...` succeeds cleanly (re-verified live, exit 0), confirming zero cycles by construction (Go's compiler rejects import cycles).

### Container freshness (methodology note — relevant to the test-failure enumeration below)

`team4sv30-frontend`'s running image was **4 days stale** relative to `main` at the start of this task (`docker inspect .Created` = 2026-09-30T20:42, vs. 64 frontend files changed on `main` since then, including files directly relevant to one of the failures found below). Rebuilt (`docker compose build team4sv30-frontend && docker compose up -d --no-deps team4sv30-frontend`) before trusting any frontend test result, per this task's own instruction to re-verify rather than trust stale numbers. `team4sv30-backend`'s image was only 2 days stale and the only 2 backend files that changed in that window (`backend/cmd/migrate-display-backfill/backfill_generic.go` and its test) are unrelated to any P1 candidate or measured endpoint — not rebuilt, no measurement risk. All Go test runs in this document used a throwaway `golang:1.25-alpine` container bind-mounting the **host's live working tree** directly (`-v /home/d1sk/team4s:/workspace`), which is never stale regardless of the running `team4sv30-backend` container's image age.

---

## Pre-Existing Baseline Test Failures

Per D-19: these are the known pre-existing failures as of 2026-10-04, enumerated so later Welle 2-5 plans do not misread them as regressions they introduced. Both full suites were re-run under the exact protocols `174-CONTEXT.md`'s "Verifikation" section specifies (frontend: `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` against the freshly-rebuilt image; backend: `golang:1.25-alpine` container on the `team4s_default` network, `DATABASE_URL` sourced from the backend container, bind-mounting the host's live `backend/` directory — not ad hoc `docker compose exec` into the running service, which RESEARCH.md's Pitfall 3 already warned produces false failures).

### Frontend (Vitest) — 6 failing tests across 4 files, 353 passed files / 3,186 passed tests / 1 skipped / 3 todo

Re-run twice (once against the pre-rebuild stale image, once against the freshly-rebuilt current-source image) to separate genuine failures from resource-contention flakes. The pre-rebuild full run additionally showed 2 extra failures (`src/app/members/[slug]/page.test.tsx` and `ReleaseVersionNotesTab.test.tsx`, both `Error: Test timed out in 5000ms`) that **disappeared** on the post-rebuild run and in isolated single-file reruns — classified as **environment-dependent flakes under full-suite CPU contention**, not genuine failures, and excluded from the baseline below.

| Test | File | Root cause | Classification |
|---|---|---|---|
| `finds zero fallback-free dead custom-property references...` | `src/lib/cssCustomProperties.guard.test.ts` | Scanner finds a real dead CSS custom-property reference: `--surface-muted` at `lib/roleCatalog.accessibility.test.ts:268`, no fallback | Genuine pre-existing code issue (unrelated test-file CSS-var reference), deterministic, reproduces in isolation |
| `the known-non-CSS-textual-mentions allow-list stays exactly as small as documented` | `src/lib/cssCustomProperties.guard.test.ts` | Same scanner, allow-list count off-by-one as a direct consequence of the above | Genuine pre-existing code issue, same root cause as above |
| `dokumentiert die produktive Release-Listenkarte mit Kara- und Leer-Timeline` | `src/app/dev/ui-system/showcase/PublicReleaseSurfacesShowcase.test.tsx` | `Unable to find an accessible element with the role "link" and name "Release öffnen"` | Genuine pre-existing code issue, deterministic |
| `single file: header shows filename/path, row does not repeat them` | `src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx` | `expected null not to be null` — DOM structure assertion mismatch | Genuine pre-existing code issue, deterministic |
| `two files: header stays clean, each row keeps its own filename/path` | `src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx` | `Unable to find an element with the text: Anime.TV.Sub/GhostFile` | Genuine pre-existing code issue, same file as above |
| `renders roles, notes and media without a second release history` | `src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx` | Test expects `'Vollständiges Memberprofil'`; actual rendered `aria-label` is `"Vollständiges Fansubberprofil"` (confirmed in current source) — stale test expectation vs. a since-changed label string | Genuine pre-existing code issue, deterministic |

None of these 6 overlap any P1/P2 hotspot candidate file named below. None require fixing in Welle 1 (D-05 forbids refactoring here) — later waves should simply not score them as new regressions if they reappear unchanged.

### Backend (Go) — enumerated via `go test ./... -v` under the documented protocol

`go build ./...` is clean (exit 0, no compile errors). The full test run shows four distinct, well-evidenced categories of non-code-regression failures, plus two confirmed self-inspection-test-staleness cases:

**Category A — missing per-phase dedicated test-DSN env vars (fail-hard, not skip):** 50 tests fail with `TEAM4S_PHASE128_TEST_DSN is required for Phase-128 PostgreSQL tests` (48 tests across `member_point_totals_repository_test.go`, `member_archive_repository_test.go`, badge/dashboard projection test families) or `TEAM4S_PHASE134_MIGRATION_DSN is required...` (`TestPhase134MigrationFreshUpDownProof`, `TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible`). This is the exact "PHASE128-DSN" precedent `174-CONTEXT.md`'s D-19 names explicitly as a known baseline class — environment-dependent (dedicated fixture DSNs not provisioned in this measurement session), not a code regression. Contrast with ~500+ other tests across the same packages that cleanly `SKIP` (not `FAIL`) when their own `TEAM4S_PHASE1xx_TEST_DSN` is unset — an inconsistency in how different phases' test helpers handle a missing DSN, itself worth a follow-up-phase cleanup note but out of scope here.

**Category B — RESEARCH.md's Pitfall 3, confirmed verbatim:** 12 tests fail reaching for the backend's own externally-exposed port from inside the measurement container (`dial tcp 192.168.235.196:18093: connect: connection refused` — all 9 `TestPhase134Matrix*` tests in `phase134_verification_matrix_access_test.go`) or aborting permission-cache startup (`permission cache: Action "release_version_media.reorder" fehlt in role_capabilities und ist keine standalone-Action — Startup abgebrochen` — `TestPhase141RevokedDelegationImmediateEffect`, `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes`, `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke`). The permission-cache abort has a **downstream cascade**: once that package-level cache fails to load, `permissions.RoleAllowsAction` silently returns `false` for every role (its internal cache is `nil`), which is the actual reason `TestEvaluateMemberMutationConflictBlocksLastActiveManager` (a pure in-memory unit test, no DB) also fails — traced and confirmed via direct code read of `permissions.roleAllows`/`loadedCache`. All of these are environment/DB-seed-state dependent, exactly matching RESEARCH.md's documented Pitfall 3, not caused by this session.

**Category C — missing `ffmpeg` binary in the throwaway measurement container (this session's own tooling gap, not present in the real `team4sv30-backend` image):** 16 tests fail with `installed FFmpeg is required for this test` (or `...for backfill proof`/`...for redirect proof`): `TestRunBackfill_GenericAnimatedGIFProducesAnimatedWebPDisplay`, `TestRunBackfill_PopulatesAutoPreviewForReadySegment`, `TestRunBackfill_IdempotentOnSecondRun`, `TestRunBackfill_PicksLatestCompletedRender`, `TestUploadFansubMedia_CroppedAnimatedBannerDisplayStaysAnimated`, `TestMediaUploadHandler_AnimatedDisplayGeneratesAnimatedWebP`, `TestMediaUploadHandler_AnimatedDisplayCapsLongEdge`, `TestExecuteSegmentRender_AutoPreview`, `TestExecuteSegmentRender_PreservesManualPreview`, `TestGenerateAnimatedDisplayViaVips_PreservesFramesAndCapsEdge`, `TestExtractFirstFrameViaVips_ReturnsStaticJPEGFrame0`, `TestSaveUpload_AnimatedWebPDisplayStaysAnimated`, `TestSaveUpload_AnimatedWebPDisplayFallsBackToOriginalWithoutVips`, `TestSaveUpload_AnimatedGIFDisplayStaysAnimated`, `TestSaveSegmentVideoPreview_ExtractsAt35Percent`, `TestExtractImageFrame_WritesFrameToDestPath`, `TestFFmpegExecutableAuthenticatedInputRejectsCrossOriginRedirect`. Confirmed: `ffmpeg 8.1.2` **is** installed in the real `team4sv30-backend` container (`which ffmpeg` → `/usr/bin/ffmpeg`), just not in the ad hoc `golang:1.25-alpine` container used for this measurement (only `build-base pkgconfig vips-dev` were installed, not `ffmpeg`). Future Welle-4 verification runs should `apk add ffmpeg` in the throwaway container to avoid this entirely-avoidable false-failure class.

**Category D — a genuine, pre-existing `shared/contracts/openapi.yaml` defect (NOT environment-dependent):** 4 tests fail with `yaml: unmarshal errors: line 2205: mapping key "description" already defined at line 2167`: `TestPhase136ContractParity/group_capability_response`, `TestPublicMemberProfileMatchesOpenAPIAllowList`, `TestPublicBadgeNextTierEnumParity`, `TestJellyfinSourceContractSchemas`. This is a real duplicate-YAML-key bug in the contract file itself, unrelated to Phase 174 and pre-dating this session (no files were edited to produce this). Per D-01, `shared/contracts/` must not change in this phase without a clearly-proven bug exception — this IS a clearly-proven bug, but fixing it is out of Welle-1's scope (no refactoring here); flagged for a follow-up quick-fix, not fixed in Phase 174.

**Category E — self-inspection (`os.ReadFile` + `strings.Contains`) test staleness after a PRIOR phase's repository split — confirmed real precedent for RESEARCH.md's Pitfall 1, independent of anything Phase 174 has done:**

- `TestFansubRepository_PublicProfileSourceInvariants` (`fansub_repository_test.go`) — see the dedicated verdict section below.
- `TestClaimSubmitBlockedForMemorialProfile`, `TestClaimBlockWritesDeniedAudit`, `TestClaimBlockDeniedAuditOutcomeColocated` (`member_claims_memorial_guard_test.go`) and `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers` (`member_claims_repository_test.go`) all `os.ReadFile("member_claims_repository.go")` and search for `SubmitClaim`-related fragments (`profile_status`, `memorial_not_claimable`, `409`, `member_claim.memorial_blocked`). **Confirmed via `git log`:** commit `8bd28db6 refactor(143-02): split member_claims_repository.go by responsibility` physically moved `SubmitClaim` (and its memorial-guard logic) into the sibling file `member_claims_submit_repository.go` — same package, same receiver, exactly the D-15 split shape Phase 174's Welle 4 will itself apply to `fansub_repository.go`. **Verified the actual behavior is correct and present** (`grep -in "profile_status|memorial_not_claimable|409" member_claims_submit_repository.go` finds all required fragments in the sibling file). These 4 tests are stale self-inspection assertions that were never updated to look at the new file location after Phase 143's split — **this is a real, independent precedent proving RESEARCH.md's Pitfall 1 concern is not hypothetical**: a same-package repository split by a PRIOR phase already broke this exact test pattern once. Welle 4's `fansub_repository.go` plan (174-17) must budget for the same class of breakage and treat it as D-03's "pure import-path adjustment" exception (the underlying behavior is unchanged, only the file-layout the assertion mechanically reads).

**Full backend tally:** 50 (Category A) + 12 (Category B, incl. the 1 cascaded pure-unit-test failure) + 16 (Category C) + 4 (Category D) + 5 (Category E, incl. the PublicProfileSourceInvariants case detailed below) = 87 individually-named failing tests, all classified, none scored as a Phase-174-caused regression, `go build ./...` clean.

### `TestFansubRepository_PublicProfileSourceInvariants` — explicit verdict (RESEARCH.md Open Question 1)

**Verdict: safe-to-fix-test, NOT a real regression.**

The test (`fansub_repository_test.go`) does `os.ReadFile("fansub_repository.go")` and asserts the literal fragment `"FROM anime_media am"` is present. It is absent. SQL evidence read directly from the current `GetPublicProfileBySlug` → `getPublicGroupBase` implementation (`fansub_repository.go:333-349`):

```sql
SELECT
    id, slug, name, logo_id, banner_id, logo_url, banner_url, ...
    logo_display.path AS logo_display_path,
    banner_display.path AS banner_display_path
FROM fansub_groups
LEFT JOIN LATERAL (
    SELECT path FROM media_files
    WHERE media_id = fansub_groups.logo_id AND variant = 'display' AND status = 'ready'
    ORDER BY id ASC LIMIT 1
) logo_display ON true
LEFT JOIN LATERAL (
    SELECT path FROM media_files
    WHERE media_id = fansub_groups.banner_id AND variant = 'display' AND status = 'ready'
    ORDER BY id ASC LIMIT 1
) banner_display ON true
WHERE slug = $1
```

The code comment directly above this function (lines 327-332) explains why: *"logo_url/banner_url prefer the group's own 'display' media_files variant (D-02) over the stored column when one exists, via two LEFT JOIN LATERALs... SVG logos (no display row ever generated, per 173-04) and pre-backfill groups fall back to the unchanged stored column."* This is Phase 173's (`öffentliche Bildqualität zusätzliche Display-Variante Backend`, completed 2026-10-02) own intentional, documented SQL rewrite — it replaced an older `anime_media`/`media_type`-joined query shape with the current `media_files`/`variant = 'display'` LATERAL-join shape as part of that phase's shipped display-variant feature. The test's fragment assertion is simply stale relative to that already-shipped, already-tested (Phase 173 has its own passing tests covering this exact code path) rewrite — not a latent bug in `GetPublicProfileBySlug`. **Recommendation for 174-17** (Welle 4, `fansub_repository.go` split): treat updating this test's fragment list as D-03's explicit "pure import-path/fragment adjustment" exception (behavior is unchanged and independently verified elsewhere; only the brittle self-inspection assertion needs to track the current SQL shape), and document that exception individually in 174-17's SUMMARY per D-03's requirement.

---

## P1 Hotspots

Locked. These are the exact targets Welle 2-5 plans (174-02 through 174-20, 174-22, 174-23) must cite — no other file may be silently substituted. Each verdict cites the specific D-06 criterion that drove the P1 classification (size alone is never the reason).

| Wave | File | D-06 rationale |
|---|---|---|
| 2 | `frontend/src/lib/api.ts` (11,508 lines) | **D-08 mandates this as highest priority regardless of score.** Independently justified anyway: (1) size — 371 top-level exports, by far the largest file in the repo; (2) multiple responsibilities — 18+ distinct domain buckets (admin anime, fansubs, media, auth, permissions, episodes, etc.) in one file; (3) coupling — imported by effectively every frontend route/component; (4) functional risk — low for the split *mechanism* (pure move, barrel re-export is a proven in-repo pattern via `components/ui/index.ts`), though D-10's barrel+Vitest-mock interaction needs an empirical canary (RESEARCH.md); (5) existing module boundaries — none today, D-08 defines the target `lib/api/*` shape; (6) safety-net tests — thin direct coverage (164 lines) but 133 test files depend on the import surface staying stable, making the barrel-compatibility requirement (D-10) the real risk to manage, not the split itself. |
| 3 | `useAdminAnimeCreateController.ts` (1,505 lines) | (1) size — 1,309-line single hook body after 4 pure helpers are already extracted; (2) multiple responsibilities — D-13 names form-state/API/validation/episodes/media/mapping/submit, all genuinely present in the one hook body; (5) existing module boundary — `useEpisodeManager.ts`'s facade+impl+composed-sub-hooks shape (PATTERNS.md) is an exact, already-proven in-repo analog for this precise split; (6) safety net — 1,032-line test file (0.69:1 ratio), well covered, low regression risk. |
| 3 | `GroupMediaReviewSection.tsx` (1,415 lines) | Same shape as above: 9 pure helpers already extracted, remaining 1,222-line `GroupMediaReviewSectionInner` mixes List/Item/Actions/Dialog responsibilities (D-14); (5) existing module boundary — the same directory already demonstrates component-scoped CSS modules (`CoverageMatrix.module.css` etc.) and this file's own CSS is *already* single-owner (no shared-file entanglement, verified via grep); (6) safety net — 605-line test file (0.43:1), reasonably covered. |
| 3 | `frontend/src/app/admin/fansubs/create/page.tsx` (1,172 lines) | (1)/(2) — 872-line `AdminFansubCreateContent` body after 16 pure helpers extracted, mixing form-state/alias-management/save-submission (D-14); (5) — sibling `[id]/edit/FansubEditClient.tsx` + named section components is a proven page-as-orchestrator analog in the very next directory over; (6) safety net — **zero tests exist today** (RESEARCH.md Open Question 2), objectively the highest-risk P1 candidate; kept in P1 (not demoted) specifically because 174-09 is scoped to add Characterization Tests *before* this file's split, resolving the risk rather than deferring the file. |
| 4 | `backend/internal/repository/fansub_repository.go` (2,657 lines, 61 functions) | (1)/(2) — clean named domain seams already visible by function name: Groups/Links/Aliases/Members/public-profile-cluster/Merge; (3) coupling — same-package split carries zero cross-package risk; (5) — `anime.go` + 4 sibling files (`anime_relations.go` etc.) is an exact, already-proven same-struct multi-file split in the very same package; (6) safety net — 426-line test file including the one stale self-inspection test (see Pre-Existing Failures section), 0.16:1 ratio, thin but not zero. |
| 4 | `backend/internal/repository/admin_content_anime_themes.go` (2,482 lines, 45 functions) | (1)/(2) — two clearly separable clusters (Theme CRUD vs. the internally-cohesive Segment cluster: playback-source sync, library-asset binding, ~15 helper functions); (5) — same `anime.go`-family analog, plus `anime_metadata.go` already proves cross-struct helper files are an accepted shape in this exact package; (6) safety net — **effectively uncovered at the repository layer** (only integration/handler-level tests exist), the other objectively-highest-risk P1 candidate — kept in P1 because 174-15 is scoped to add a repository-level Characterization Test suite *before* the split, same resolution pattern as the fansubs-create page above. |
| 4 | `backend/internal/repository/anime_assets.go` (1,880 lines, 56 functions) | (1)/(2) — legacy/V2 method-pair-per-asset-type structure (Cover/Banner/Logo/Background), each pair a cohesive, independently-splittable unit; (3)/(4) — **explicitly NOT a D-07 merge candidate** (Pitfall 4: legacy and V2 target different schema generations, not duplicated logic) — the correct split axis is by asset type, keeping each type's legacy+V2 pair together, never splitting legacy-vs-V2 apart; (5) — same `anime.go`-family same-struct analog; (6) — 196 lines of tests (0.10:1), thin. |
| 4 | `backend/internal/handlers/admin_content_release_version_media.go` (1,358 lines) | **RESEARCH.md's own extension beyond CONTEXT.md's named list, promoted to P1 because it has the single strongest existing precedent of any candidate in this document.** (5) — this file is **already partially split**: 6 live sibling files (`_category.go`, `_display.go`, `_highlight.go`, `_reorder.go`, `_replace.go`, `_replace_display.go`) already attach to the same `AdminContentHandler` struct using the established `rvm`-prefix naming convention; this plan's job is purely *extending an already-proven, already-shipped pattern* to the remaining core file, the lowest-risk, highest-pattern-match Welle-4 candidate in this document; (1)/(2) — the core file still mixes HTTP parsing/validation/business-logic/persistence/response for the remaining un-split concerns (D-16). |
| 5 | `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` (4,568 lines) | (5) — the containing directory **already demonstrates the exact target shape**: 7 sibling CSS modules already extracted as single-owner (`CoverageMatrix.module.css`, `FansubOpEdSection.module.css`, `ContributionsReviewSection.module.css`, `AnimeProjectTimelineSection.module.css`, `ReleaseVersionMediaReviewSection.module.css`, `GroupMediaReviewSection.module.css`), with this one file deliberately left as the shared catch-all — Welle 5's job is to extend the *same* class-usage-site-grep-verified extraction to the remaining single-owner classes within this file, not invent a new approach; (2) — D-18 explicitly scopes this to "split only where JSX already has logically separated components/features," which this directory's own prior history already demonstrates is possible here. |
| 5 | `frontend/src/components/ui/ui.module.css` (2,085 lines) | (5) — same analog shape: `ArtworkHero.module.css` and `FocalCarousel.module.css` already exist as single-owner per-primitive modules in the *same directory*, alongside a per-primitive `.tsx` file for every component (`Button.tsx`, `Modal.tsx`, etc.) re-exported via `index.ts`; this is design-system infrastructure with a proven, live precedent for exactly this split, not a novel pattern. |

---

## P2 Hotspots

Documented, **not implemented this phase** — flagged for follow-up-phase recommendation per D-23's closing report. Each entry gets a one-sentence D-06 rationale; none are silently omitted.

| File | Lines | D-06 rationale (why P2, not P1/P3) |
|---|---|---|
| `frontend/src/types/admin.ts` | 1,169 | Type-only file with many cross-cutting consumers across the whole admin surface; no in-repo precedent anywhere in `frontend/src/types/` for splitting a types file (PATTERNS.md: "No Analog Found"), so module boundaries would need to be derived fresh rather than copied — real gain, but needs its own dedicated planning pass, not a Welle-3/5 afterthought. |
| `frontend/src/types/fansub.ts` | 765 | Same reasoning as `types/admin.ts` — next-largest, same no-precedent gap, same follow-up-phase recommendation. |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` | 966 | Orchestrator page already delegating to many sibling tab components (SegmenteTab, ReleaseVersionMediaSection, ReleaseVersionNotesTab); real split candidate, but not named in CONTEXT.md's locked list and needs its own module-boundary analysis in a follow-up phase. |
| `frontend/src/app/admin/fansubs/merge/page.tsx` | 965 | Admin merge workflow with no existing test file (same `D-06` safety-net gap pattern as `fansubs/create/page.tsx`, but not elevated to P1 since it wasn't in CONTEXT.md's named list and doing a third Characterization-Test-first split in one phase raises blast radius beyond what Welle 3 scoped). |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx` | 846 | Admin anime-edit orchestrator; cross-cuts many sub-components, real candidate but needs dedicated scoping, not named in CONTEXT.md. |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` | 826 | Already involved in dependency cycle #1 (`ReleaseVersionMediaSection.helpers.tsx` ↔ `useReleaseVersionMedia.ts`) — any split here should resolve that pre-existing cycle in the same pass, which is cross-cutting enough to warrant its own follow-up-phase scoping rather than folding into Welle 3's three named P1 candidates. |
| `frontend/src/app/admin/fansubs/page.tsx` | 816 | Admin list page, real size hotspot, not named in CONTEXT.md's locked list, follow-up phase. |
| `frontend/src/app/me/profile/page.tsx` | 783 | Public-facing profile page; cross-cutting, has its own test file, but not named in CONTEXT.md's locked list — follow-up phase. |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx` | 743 | Admin tab component, real candidate, not named in CONTEXT.md's locked list — follow-up phase. |
| `backend/internal/services/anisearch_client.go` | 1,217 | External API client; functional risk if split touches retry/error-handling edges is higher than the locked P1 repository candidates — follow-up phase with dedicated characterization. |
| `backend/internal/repository/media_repository.go` | 1,153 | Shared repository with many call sites across multiple handler families; real candidate but broader blast radius than the locked P1 list — follow-up phase. |
| `backend/internal/repository/fansub_group_app_members_repository.go` | 1,083 | Real candidate; this exact file's test suite is also entangled with the permission-cache-cascade failure class documented above, so a split here should happen after that environment issue is independently resolved — follow-up phase. |
| `backend/internal/services/anime_create_enrichment.go` | 1,059 | Cross-cutting AniSearch enrichment service logic; real candidate, not named in CONTEXT.md's locked list — follow-up phase. |
| `backend/internal/handlers/app_profile.go` | 1,042 | Handler file, real candidate, not named in CONTEXT.md's locked list — follow-up phase. |
| `backend/internal/handlers/admin_content_anime_theme_segments.go` | 967 | Directly overlaps the locked P1 `admin_content_anime_themes.go` repository split's Segment cluster — deliberately deferred to avoid compounding two related-but-distinct splits (handler + repository) in the same wave; revisit once 174-15's repository split has landed. |
| `frontend/src/app/admin/anime/create/page.module.css` | 1,773 | Large admin-create-page CSS, real candidate, needs its own component-boundary grep audit (same method as the locked P1 CSS candidates) — follow-up phase, not named in CONTEXT.md's locked list. |
| `frontend/src/components/contributions/contributions.module.css` | 1,018 | Shared component CSS, real candidate, follow-up phase. |
| `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` | 961 | Admin import-page CSS, real candidate, follow-up phase. |

---

## P3 Hotspots

Deliberately not touched this phase or recommended for near-term follow-up, each with an explicit rationale.

| File | Lines | D-06 rationale (why P3) |
|---|---|---|
| `backend/internal/permissions/permissions.go` | 968 | (4) High functional risk — central, cross-cutting rights-resolution logic that every `Can*` entry point depends on; (5) no split precedent exists for this *specific* file family anywhere in the repo (PATTERNS.md: "No Analog Found" — `authz_permissions.go`/`authz_permissions_batch.go` are already-separate siblings, not a template for splitting the core file itself); any split here needs dedicated Characterization-Test-first treatment per D-20's "Rights" risk area, with real before/after effective-rights comparison, not just unit tests — explicitly out of scope for this phase's blast radius. |
| `frontend/src/app/dev/ui-system/page.module.css` | 1,868 | Dev-only internal showcase route, never shipped to end users; splitting it provides no end-user-facing maintainability gain proportional to the effort, and D-24's "justify why a file stays larger" bar is trivially met here (it's a showcase-only aggregation file by design). |

---

## D-07 Copy/Paste Verdicts

CONTEXT.md's D-07 text names 9 distinct sub-areas inside one comma-separated list (the plan's own prose rounds this to "eight," likely folding "Anime/Release/Media/Fansub-Group-Mapping" as a single combined item while still itemizing all named concerns individually below — doing so here ensures nothing is silently skipped). Per D-07: merge only on verified, truly identical semantics — "looks similar" is explicitly insufficient.

| Area | Verdict | Evidence |
|---|---|---|
| **Permission Checks** | False positive (not a copy/paste pattern) | No duplicated `CheckPermission`/`HasPermission`-style function exists anywhere (`grep -rn "func.*HasPermission\|func.*CheckPermission\|func.*RequirePermission" backend/internal` → 0 matches). The actual risk profile is "one large central file" (`permissions.go`, P3 above), not duplication across files — confirms RESEARCH.md's own finding. |
| **Rights Resolution** | False positive | Single central resolver confirmed: `ResolveGroupRights` (Phase 137, `backend/internal/permissions/effective_rights.go`) and `EffectiveRightsService` (`backend/internal/services/effective_rights_service.go`) are singular, not duplicated. No second implementation found. |
| **Anime/Release/Media/Fansub-Group-Mapping** | False positive | Backend row-scan/mapping helpers (`episode_version_repository_read_helpers.go`, `fansub_group_invitations_repository.go`, `release_review_query_scan_helpers.go`, `anime_contributions_repository.go`, `fansub_repository.go`, etc.) each map a *different* table's row shape to a *different* domain struct — not duplicated logic, just one mapping function per domain, which is exactly what a correctly-organized repository layer should look like. |
| **API Error Handling** | False positive | Confirmed via direct read: `writePermissionInternalError`, `writeJellyfinErrorResponse`, `writeInternalErrorResponse`, and the `classifyJellyfinUpstreamError`/`classifyJellyfinTransportError`/`classifyJellyfinResolutionError` chain are a deliberate, purpose-specific classification hierarchy, not copy/paste duplication — matches RESEARCH.md's finding exactly. |
| **Pagination** | **Merge-candidate (narrow)** | `frontend/src/components/ui/Pagination.tsx` (global primitive, callback-driven) and `frontend/src/components/anime/Pagination.tsx` (SSR `Link`-href-driven) implement **byte-identical page-window math** (`const from = Math.max(1, currentPage - 2); const to = Math.min(totalPages, currentPage + 2)`, then the same `for` loop building the `pages` array) — read both function bodies directly, confirmed identical. The *rendering* mechanism legitimately differs (client callback vs. SSR `Link`), so only the page-window *computation* should be extracted into one shared pure helper (e.g. `computePageWindow(currentPage, totalPages)`), not the whole component. Two other candidates checked and ruled out as false positives: `RankingPaginationNav.tsx` is already a thin wrapper around `@/components/ui`'s `Pagination` (the correct reuse pattern, not a duplicate), and `AnimeBrowserPagination.tsx` has no page-window logic at all (prev/next/search/reset buttons only). Recommend as a small, low-risk follow-up-phase item — not part of any locked P1 scope. |
| **Sorting** | False positive | No shared, duplicated sorting *utility function* exists — `grep` found 31 inline `.sort((a, b) => ...)` call sites across the frontend, each comparing different domain-specific fields inline (not a copy/pasted shared function). This is scattered inline logic, not the "parallel implementation of the same domain logic" D-07 targets. |
| **Date Formatting** | **Merge-candidate** | Read 6 of the 18 `formatDate`/`formatDateTime` definitions in full. `UserClaimsTab.tsx`, `ClaimsClient.tsx`, `ReviewQueue.tsx`, and `ContributionsReviewSection.tsx` all define **byte-identical** `formatDate(iso: string): string` bodies (`try { return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return iso }`) — genuine, verified duplicate, true merge-candidate (not part of any locked P1 scope; recommend for follow-up). Two explicit false positives confirmed by reading: `ChangesClient.tsx`'s version adds `hour`/`minute` fields via `toLocaleString` (different output contract — date+time, not date-only); `ProjectMemberNoteEntry.tsx` uses manual `padStart`-based formatting with different invalid-date handling (returns `''` instead of falling back to the raw ISO string) — different semantics despite a similar happy-path output, correctly NOT merged. |
| **Status Mapping** | **Mixed — one real bug found, one true-but-low-priority duplicate, rest false positives** | (a) The ~15 `getXLabel`/`getXStatus*` functions RESEARCH.md flagged are, as predicted, false positives — different domain enums (fansub-media-category ≠ kara-status ≠ profile-status). (b) **One pair revealed an actual semantic drift, not just "looks similar":** `getTypeBadgeLabel` in `SegmenteTab.helpers.tsx` vs. `segmenteTabUtils.ts` are near-identical EXCEPT for the `OUTRO` case — one returns `'OUT'` for a type name containing `OUTRO`, the other returns `'PV'` for the exact same input. This is a genuine behavioral inconsistency between two call sites, not a copy/paste-to-merge candidate as-is (merging would silently change one site's behavior) — **flagged as a real bug finding for the user/a follow-up phase to resolve explicitly**, not silently merged per D-07's "no merge without verified identical semantics" rule. (c) `getTableStatusVariant` (`CompositionShowcase.tsx` vs. `dev/ui-system/page.tsx`) IS a true, byte-identical duplicate — but both are dev-only showcase code (P3 territory), low-priority follow-up only. |
| **User/Member Representation** | False positive (no duplication found) | Only one `getInitials`-named function exists repo-wide (`ReleaseVersionNotesTab.tsx:154`); other grep hits were unrelated `initials`-mentioning identifiers/comments, not duplicate implementations. No merge candidate. |

---

## D-04 Non-Goal Compliance

Every P1 verdict above was re-read against D-04's six named non-goal categories: **(1)** new design system, **(2)** frontend/repository re-architecture (microservices/DDD/CQRS), **(3)** new state-management library, **(4)** fetch/ORM/routing-library swap, **(5)** new test framework, **(6)** new permission architecture. **None of the P1 verdicts proposes any of these.** Every P1 recommendation is explicitly a split/move/rename of existing code along an already-proven, already-live in-repo pattern (barrel re-export, same-struct multi-file split, facade+impl+sub-hooks, or single-owner CSS-module extraction) — no new abstraction layer, no new library, no architectural shift. This holds specifically for the two candidates where D-04 compliance is least obvious on the surface: the `api.ts` barrel split (D-08-mandated) reuses the *exact* `components/ui/index.ts` barrel mechanism already live in this codebase, not a new module system; and the `useAdminAnimeCreateController.ts` facade+sub-hooks split reuses the *exact* `useEpisodeManager.ts`/`internal/episode-manager/*` shape already live in the same directory family, not a new state-management approach.

