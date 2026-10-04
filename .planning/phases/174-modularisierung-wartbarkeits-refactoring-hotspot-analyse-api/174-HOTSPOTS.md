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
