# Phase 174 — Abschlussbericht (Welle 6 / D-23)

**Produced by:** 174-25 (Welle 6 — Abschlussaudit)
**Date:** 2026-10-06
**Status:** Authoritative closing artifact. Supersedes nothing — this is the final evidence-backed before/after account `174-CONTEXT.md`'s D-23 mandates, re-measuring everything `174-HOTSPOTS.md` (174-01) captured as baseline and comparing it explicitly against the live, current `main` tree after all 24 execution plans (174-02 through 174-24).

This report answers D-02's question with real evidence, not narrative: **did Phase 174 objectively improve understandability/testability/changeability, without regressing behavior, performance, or query counts?**

---

## Before / After — Re-measured Baseline Comparison

Every command below is the *identical* command `174-HOTSPOTS.md` (174-01) used, re-run live against the current `main` tree on 2026-10-06.

### Frontend TS/TSX production files (`find frontend/src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -name "*.test.*" | xargs wc -l`)

| Metric | Before (174-01, 2026-10-04) | After (174-25, 2026-10-06) | Delta |
|---|---|---|---|
| Total production files | 678 | 730 | +52 (new `lib/api/*` modules, new section components, new characterization tests excluded) |
| Total lines | 121,435 | 123,511 | +2,076 (net — accounts for new per-module headers/imports/D-24 justification comments across ~70 new files, while the monoliths themselves shrank dramatically; see per-file deltas below) |
| Files exceeding 450 lines | 33 | 35 | +2 (see "D-24 Exceptions" section — all 2 new exceeding-files are explicitly justified, not silent) |

**The largest single file in the repo (`frontend/src/lib/api.ts`) collapsed from 11,508 lines to 34 lines** — see the dedicated api.ts section below. The pre-174 list of 33 oversized files has been replaced almost entirely: `api.ts`, `useAdminAnimeCreateController.ts`, `GroupMediaReviewSection.tsx`, and `admin/fansubs/create/page.tsx` are **no longer in the oversized list in their original form** (their successor files are evaluated individually below). The 35 files currently over 450 lines are: 28 pre-existing P2/P3-deferred files untouched by this phase (`types/admin.ts`, `types/fansub.ts`, `EpisodeVersionEditorPage.tsx`, `admin/fansubs/merge/page.tsx`, `AnimeEditWorkspace.tsx`, `ReleaseVersionMediaSection.tsx`, `admin/fansubs/page.tsx`, `me/profile/page.tsx`, `ReleaseVersionNotesTab.tsx`, and 19 further pre-existing files never named as a Phase 174 hotspot) plus 7 new/changed files produced directly by this phase's splits, each with an explicit D-24 justification (see below).

### Backend Go production files (`find backend/internal -type f -name "*.go" -not -name "*_test.go" | xargs wc -l`)

| Metric | Before (174-01) | After (174-25) | Delta |
|---|---|---|---|
| Total production files | 521 | 547 | +26 (net new sibling files from the 4 P1 repository/handler splits, minus 1 deleted file: `admin_content_anime_themes.go`) |
| Total lines | 113,621 | 113,971 | +350 (near-neutral — every split is a verbatim relocation; the small increase is new package-doc headers and D-24 justification comments) |
| Files exceeding 450 lines | 46 | 46 | 0 (net unchanged — the 4 removed P1 monoliths are replaced by 5 new sibling files that individually exceed 450, each with an explicit D-24 justification; see below) |

All 4 named P1 backend hotspots are now gone from the oversized list in their original monolithic form: `fansub_repository.go` (2,657 → 37 lines), `admin_content_anime_themes.go` (2,482 → **deleted**, 0 lines), `anime_assets.go` (1,880 → 400 lines), `admin_content_release_version_media.go` (1,358 → 37 lines).

### CSS module files (`find frontend/src -name "*.module.css" | xargs wc -l`)

| Metric | Before (174-01) | After (174-25) | Delta |
|---|---|---|---|
| Total `.module.css` files | 155 | 196 | +41 (15 from `FansubEdit.module.css`'s split in 174-22, 26 from `ui.module.css`'s split in 174-23) |
| Total lines | 41,201 | 41,140 | -61 (near-neutral; small reduction net of a few byte-identical comma-selector-split duplications) |
| Files exceeding 450 lines | 25 | 23 | -2 |

`ui.module.css` dropped out of the oversized list entirely (2,085 → 219 lines, now well under budget — the only one of the two Welle-5 P1 CSS targets to fully exit the list). `FansubEdit.module.css` remains oversized (4,568 → 3,379 lines, -26%) by design — this is 174-HOTSPOTS.md's own pre-approved P1 verdict ("deliberately left as the shared catch-all"), not a silent miss; see "D-24 Exceptions" below for the full class-level audit trail.

### `frontend/src/lib/api.ts` — the monolith's reduction

| Metric | Before (174-01) | After (174-25) |
|---|---|---|
| `api.ts` line count | 11,508 | **34** (pure barrel — `export * from "./api/..."` lines only, zero domain-function definitions) |
| `api.ts` top-level exports | 371 | 34 barrel re-export statements covering ~385 unique names (174-08's export-parity audit confirmed **zero dropped, zero renamed**; 18 legitimate new D-09 shared-infra cross-module exports, 4 unintended leaks found and closed) |
| New module count under `frontend/src/lib/api/` | 0 (did not exist) | 36 non-test files (`client.ts`, `auth.ts`, `permissions.ts`, `reviews.ts`, `history.ts`, `search.ts`, `watchlist.ts`, `comments.ts`, `media.ts`, `members.ts`, `members-me.ts`, `members-media.ts`, `projects.ts`, `episodes.ts`, `releases.ts`, 4× `fansubs-*.ts`, 2× `contributions-*.ts`, plus 13 files under `admin/`), totaling 12,024 lines |

The split used the project's existing `components/ui/index.ts` barrel pattern (no new module system) and preserved every Vitest mock shape (`vi.mock` literal-factory, `vi.importActual` partial mock, `vi.spyOn` namespace mock, plain real import) — proven by 4 dedicated canary tests in 174-02, still passing today.

### Dependency cycles (`npx --yes madge --circular --extensions ts,tsx <path>`, re-run live inside `team4sv30-frontend`)

| Scope | Before (174-01) | After (174-25) | Delta |
|---|---|---|---|
| `frontend/src/lib` (74→113 files) | **0** circular dependencies | **0** circular dependencies | Confirmed still 0 (D-11 held) |
| Full `frontend/src` (1,192→1,292 files) | **7** circular dependencies | **7** circular dependencies, byte-identical list | Confirmed unchanged — none involve any `lib/api/*` file |

The 7 unchanged cycles: `ReleaseVersionMediaSection.helpers.tsx`↔`useReleaseVersionMedia.ts`, `SegmentEditPanel.tsx`↔`SegmentAssetSection.tsx`, `SegmentEditPanel.tsx`↔`SegmentBasicFieldsSection.tsx`, `GroupMemberFormModals.tsx`↔`useGroupMembersTab.ts`, `GroupMembersTab.tsx`→`GroupMemberFormModals.tsx`→`useGroupMembersTab.ts` (transitive), `MediaUpload.tsx`↔`MediaUploadCore.tsx`, `memberBadgeFamilies.ts`↔`memberBadgeLabels.ts` — all pre-existing, none touched by any Phase 174 plan. Backend: `go build ./...` remains clean (exit 0), confirming zero cycles by construction.

### Frontend test suite (`npx vitest run` inside `team4sv30-frontend`)

| Metric | Before (174-01) | After (174-25) |
|---|---|---|
| Passed test files | 353 | 360 |
| Passed tests | 3,186 | 3,250 |
| Failed test files | 4 | 4 (same 4, unchanged) |
| Failed tests | 6 | 6 (same 6, unchanged) |
| Skipped / Todo | 1 / 3 | 1 / 3 |

The **exact same 6 failing tests** remain, byte-identical to 174-01's documented baseline: `cssCustomProperties.guard.test.ts` (2 — a dead `--surface-muted` custom-property reference, unrelated to any Phase-174 file), `PublicReleaseSurfacesShowcase.test.tsx` (1 — a static showcase page with hardcoded mock data, no `@/lib/api` import), `EpisodeImportEpisodeGroup.test.tsx` (2 — DOM-structure assertion mismatches, no file this phase touched), `mitwirkende/[memberSlug]/page.test.tsx` (1 — a stale label-text expectation predating Phase 174). The +7 passed files / +64 passed tests are new test files this phase added (characterization tests, canary tests, helper/hook unit tests) — not pre-existing tests that started passing.

### Backend test suite (`go test ./... -v`, re-run inside `team4sv30-backend` — ffmpeg/vips already present in this image, unlike 174-01's throwaway `golang:1.25-alpine` container)

| Metric | Before (174-01, `golang:1.25-alpine`, no ffmpeg) | After (174-25, `team4sv30-backend`, ffmpeg/vips present) |
|---|---|---|
| `go build ./...` | Clean (exit 0) | Clean (exit 0) |
| Total individually-named failures | 87 (Category A 50, B 12, C 16, D 4, E 5) | 65 (Category A 41, B 13, D 4, E 4, +3 "11eyes" Jellyfin-fixture gap) |

The raw count difference (87 vs. 65) is **not a code regression** — it is an artifact of measuring in two different containers: this run's container already has `ffmpeg`/`vipsthumbnail` installed (closing all 16 of 174-01's Category C failures outright) and surfaces a different, independently pre-existing gap instead (3 "11eyes" Jellyfin-fixture tests failing on a missing `docs/audits/2026-09-15-jellyfin12/fixtures/*.json` mount — documented in `.planning/STATE.md`'s Phase-165 entry, unrelated to Phase 174). **Zero of the 65 failures trace to any file Phase 174 touched** — verified individually against the categorization below. Phase 174 itself **resolved** 3 self-inspection-staleness failures that were part of 174-01's original Category E count: `TestFansubRepository_PublicProfileSourceInvariants` (174-17, per 174-01's own documented "safe-to-fix-test" verdict — the fragment assertion was stale relative to Phase 173's already-shipped SQL rewrite, not a latent bug), `TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers` / `TestAttachGroupCounts_ProjectsCountExcludesDisabledAnime` (174-16), and `TestListAnimeFansubs_SummaryIncludesFansubStoryFacts` (174-17) — all 4 confirmed `PASS` in this run's log. The remaining Category E failures (4: `TestClaimSubmitBlockedForMemorialProfile`, `TestClaimBlockWritesDeniedAudit`, `TestClaimBlockDeniedAuditOutcomeColocated`, `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers`) are a **different, pre-Phase-174** self-inspection-staleness case caused by Phase 143's `member_claims_repository.go` split (174-01 documented this as the independent precedent proving the pitfall class is real, not hypothetical) — out of this phase's scope to fix. All new characterization tests added by this phase (`TestAdminContentAnimeThemes_ThemeCRUD`, `TestAdminContentAnimeThemes_SegmentCRUD` — 174-15; the `TestAnimeAsset*`/`TestAssignManualCoverV2*`/`TestClearCoverV2*` suite — 174-19) pass cleanly.

### Welle-4 Endpoint Query-Count — D-17/D-21 (already measured and recorded live in `174-HOTSPOTS.md` by 174-21; summarized here as the authoritative closing evidence)

| Endpoint | Before (min of 3) | After (min of 3) | Verdict |
|---|---|---|---|
| `GET /api/v1/fansub-slugs/strawhat-subs/public-profile` | 8 | 8 | Neutral |
| `GET /api/v1/anime/2/backdrops` | 8 | 8 | Neutral |
| `GET /api/v1/admin/anime/2/themes` | 8 | 7 | Neutral (measurement-window-granularity artifact, not a code change — `ListAdminAnimeThemes` confirmed byte-identical pre/post-split via direct `git show` diff against commit `dbf8680d`) |
| `GET /api/v1/admin/release-versions/27/media` | 13 | 13 | Neutral |

**Zero endpoints regressed.** No D-17 violation across any of the 4 Welle-4-touched hotspots.

---

## P1 Hotspot Outcomes

Every P1 hotspot `174-HOTSPOTS.md` named now has a concrete, evidence-backed outcome.

### Welle 2 — `frontend/src/lib/api.ts` (174-02 through 174-08)

**11,508 lines, 371 exports, 1 file → 34-line pure barrel + 36 domain modules (12,024 lines).** Executed in 7 plans: 174-02 (shared client/auth infra carve-out + barrel-path collision empirically resolved + 4 Vitest-mock-shape canary tests), 174-03 (admin anime/segments/episodes/users/fansub-members, 96 functions), 174-04 (fansubs/episodes/members/projects/contributions, 89 functions), 174-05 (auth/session/permissions/reviews/history/search, 68 functions — discovered the plan's own interface list was stale against an earlier commit, re-verified live before moving anything), 174-06 (the explicitly-hardest media/assets triage — 46 functions grep-classified by real call-site evidence, landing only 1 genuinely shared function, 2%, falsifying the god-module risk this plan existed to prevent), 174-07 (final 27-name "unclear" bucket triage, reducing `api.ts` to a pure barrel), 174-08 (closing export-parity audit against the pre-split git baseline: zero dropped/renamed names, 4 unintended barrel leaks found and closed). Key decision: D-24 sub-split by sub-concern whenever a bucket would exceed 450 lines in one file (6 files for admin-anime, 4 for fansubs/groups, 2 for contributions) rather than one oversized catch-all. `client.ts`, `history.ts`, `permissions.ts`, and `admin/fansub-members.ts` remain single-file D-24 cohesion exceptions (see table below). Zero new dependency cycles, zero dropped exports, full regression-suite parity, and a successful `docker compose build --no-cache` production rebuild all confirmed.

### Welle 3 — `useAdminAnimeCreateController.ts` (174-10, 174-11)

**1,505 lines, 1 hook → 9-line facade + 1,054-line impl (D-14/D-21 cohesion exception, all state stays centralized) + 4 composed sub-hooks** (`useJellyfinIntakeActions`, `useAniSearchIntakeActions` — 174-10; `useAssetStagingActions`, `useCreateSubmitAction` — 174-11), replicating the production-proven `useEpisodeManager` facade+impl+sub-hooks shape. All 25 pre-existing tests pass unmodified against the restructured code; the impl file's final returned object is key-for-key identical to the original (verified via structural diff).

### Welle 3 — `GroupMediaReviewSection.tsx` (174-12, 174-13)

**1,415 lines, 1 component → 632-line orchestrator (D-14 cohesion exception, logic-free JSX composition) + `useGroupMediaReviewActions` hook (9 async handlers, 174-12) + 5 named presentational section components** (`GroupMediaReviewUploadPanel`, `FilterBar`, `Grid`, `BulkActionBar`, `DetailDrawer` — 174-13). The full pre-existing 605-line, 23-test suite passes unmodified; zero markup/behavior change. The 632-line orchestrator residual is a known, explicitly-flagged D-24 exception (see table below) — this phase's scope was logic extraction + JSX decomposition, not further state-splitting (which D-14/D-21 forbid).

### Welle 3 — `admin/fansubs/create/page.tsx` (174-09 characterization, 174-14 split)

**1,172 lines, 0 pre-existing tests → thin orchestrator (610 lines, D-14 cohesion exception) + `useAdminFansubCreateActions` hook + `adminFansubCreateHelpers.ts` (16 pure helpers) + 3 named section components, backed by 7 stable characterization tests + 49 new direct unit tests.** Key decision, user-directed (D-25, 2026-10-05): the executor's initial 13 characterization tests included 6 that were either flaky (3 hanging in an infinite loop at 100% CPU) or red against unmodified code (3) — a characterization test that doesn't pass against unchanged code secures nothing. The user decided interaction-level click-throughs (alias add/remove, second save, validation errors, first-render defaults) are verified via **live UAT**, not new click-simulation tests; all of these were subsequently confirmed in `174-UAT-CHECKLIST.md`, approved by the user 2026-10-05, including the real bug this exposed (BUG-174-01, an infinite-render loop, pre-existing since before Phase 174, fixed during this live-UAT pass).

### Welle 4 — `backend/internal/repository/fansub_repository.go` (174-16, 174-17)

**2,657 lines, 61 functions → 37-line struct/constructor-only core + 8 sibling files** (Groups, Links, Aliases — 174-16; Public-Profile, Members, Anime-Links, Merge-Core, Merge-Duplicates — 174-17), zero new struct, all on the same `*FansubRepository` receiver. Resolved `TestFansubRepository_PublicProfileSourceInvariants` per 174-01's own documented "safe-to-fix-test" verdict (the fragment assertion was stale relative to Phase 173's already-shipped SQL rewrite) and fixed 3 further self-inspection tests broken by the physical move, each a pure D-03 import-path adjustment. D-17's `ANY($1)` batch-query pattern in the merge-duplicate-detection helpers was verified to survive the move unmodified — no new N+1 introduced.

### Welle 4 — `backend/internal/repository/admin_content_anime_themes.go` (174-15 characterization, 174-18 split)

**2,482 lines, 39 methods → fully deleted (0 lines) → 5 sibling files** (`_core` Theme-CRUD, `_segments_crud`, `_segments_library`, `_segments_playback`, `_release_theme_assets`), backed by 174-15's first-ever repository-layer characterization suite for this file (24 real-Postgres sub-tests). The highest-risk cluster (segment-playback-source-sync, transaction-boundary-sensitive) landed with its exact decision-tree logic untouched. 4 pre-existing source-string-assertion tests (the Teststil Altlast CLAUDE.md documents as tolerated-pre-existing-debt) had their `os.ReadFile` targets updated under the D-03 exception — zero assertion content changed.

### Welle 4 — `backend/internal/repository/anime_assets.go` (174-19)

**1,880 lines, 34 methods → 400-line core (struct, constructor, cross-type resolver, schema helpers) + 7 sibling files by asset type** (cover, banner+logo, background, background-video, background-reconcile, provider-generic-dispatch, URL-resolve-generic). Every legacy/V2 method pair stayed co-located per RESEARCH.md's explicit Pitfall-4 warning (legacy and V2 target different schema generations — not D-07 duplication). All 7 resulting files are at or under the 450-line ceiling; 2 pre-existing self-inspection tests fixed under D-03.

### Welle 4 — `backend/internal/handlers/admin_content_release_version_media.go` (174-20)

**1,358 lines → 37-line shared-constants remainder + 7 (effectively 8, after a mid-plan D-24 split) new sibling files** (upload, upload-process, permissions, list, patch, delete, capabilities), extending the file's own already-live `rvm`-prefix sibling-file convention. The rights-adjacent permission-annotation cluster was verified **byte-for-byte identical** via direct diff before/after the move (T-174-04-01) — no new authorization risk.

### Welle 4 closing verification (174-21)

Live, measured before/after query counts for all 4 concrete D-17 risk-area endpoints Welle 4 touched: **3 exactly neutral, 1 neutral-after-correction** (see table above). Full backend suite: zero unexplained new failures across 174-16 through 174-20.

### Welle 5 — `FansubEdit.module.css` (174-22)

**4,568 → 3,379 lines (-26%), 97 grep-verified single-owner classes extracted into 15 new per-component `.module.css` files.** Full class-by-class audit of all 386 classes: 97 extracted, 33 genuinely shared (2+ consumers), 132 used by 15 files outside the plan's originally-declared 22-consumer universe (discovered via prop-drilling and a sibling-route import leak, corrected before commit), 5 deliberately kept in place due to CSS-Modules compound-selector hashing (a split would have silently disabled the rule), 119 flagged dead (not deleted, per D-01). One real bug (`fansubEditToast` incorrectly classified as single-owner, caught and rolled back before commit) and one lint cleanup were found and fixed during execution.

### Welle 5 — `ui.module.css` (174-23)

**2,085 → 219 lines (-89%), 163 grep-verified single-owner classes extracted into 26 new per-primitive `.module.css` files.** Found and fixed a critical, project-wide-relevant runtime bug: the `{ ...sharedStyles, ...ownStyles }` object-spread merge pattern (already in live use across 16 files from 174-22) silently loses **all** CSS-Modules classes under Vitest/jsdom, because the CSS-Modules mock there has zero enumerable own keys (only a `get` trap) — a spread copies nothing. Replaced with a real `Proxy`-based merge in all 9 affected `components/ui/` files, verified correct under both Vitest and a real production Webpack build. The 16 files from 174-22 using the same vulnerable pattern remain unfixed (out of this CSS-only plan's scope) — flagged explicitly in "Open Technical Debt" below (F-12).

### Welle 5 closing checkpoint (174-24)

Visual-equality human sign-off: **approved 2026-10-06.** 5 of 8 before/after screenshot pairs byte-for-byte identical (button hover/focus/disabled, input focus, select focus); the other 3 differ only by a documented real data change (New-Subs group banner/logo content, DB-verified) or capture noise (30 bytes out of 7.3 MB with no visible difference) — zero CSS regressions. One pre-existing, unrelated side finding (mobile sticky-save-button overlap) logged as a backlog item, not fixed here.

---

## P2 Hotspots — Follow-up Recommendations

Every P2 hotspot `174-HOTSPOTS.md` named gets an explicit one-sentence follow-up recommendation. None are silently omitted.

| File | Lines | Follow-up recommendation |
|---|---|---|
| `frontend/src/types/admin.ts` | 1,169 | Needs a dedicated planning pass to derive fresh module boundaries (no in-repo types-file-split precedent exists) before any split is attempted. |
| `frontend/src/types/fansub.ts` | 765 | Same follow-up as `types/admin.ts` — plan the two together since they likely share cross-cutting boundary decisions. |
| `EpisodeVersionEditorPage.tsx` | 966 | Already delegates to many sibling tab components; a dedicated plan should formalize its own module-boundary analysis along the same lines as 174-13's `GroupMediaReviewSection` split. |
| `admin/fansubs/merge/page.tsx` | 965 | Needs a Characterization-Test-first split (same D-06 safety-net gap as `fansubs/create/page.tsx` had) before any structural change. |
| `AnimeEditWorkspace.tsx` | 846 | Needs its own dedicated scoping pass to identify genuinely separable sub-components before splitting. |
| `ReleaseVersionMediaSection.tsx` | 826 | Should resolve its pre-existing dependency cycle (#1 in the madge list, `.helpers.tsx`↔`useReleaseVersionMedia.ts`) in the same pass as any structural split. |
| `admin/fansubs/page.tsx` | 816 | Needs a dedicated scoping pass; real size hotspot with no assigned module boundary yet. |
| `me/profile/page.tsx` | 783 | Public-facing, cross-cutting page with an existing test file — plan a dedicated split with its own characterization-test review. |
| `ReleaseVersionNotesTab.tsx` | 743 | Needs a dedicated scoping pass; real candidate, no assigned boundary yet. |
| `backend/internal/services/anisearch_client.go` | 1,217 | Needs dedicated characterization of its retry/error-handling edges before any split, given higher functional risk than the locked P1 repository candidates. |
| `backend/internal/repository/media_repository.go` | 1,153 | Needs a dedicated plan accounting for its broader blast radius (many call sites across multiple handler families) before splitting. |
| `backend/internal/repository/fansub_group_app_members_repository.go` | 1,083 | Should wait until the permission-cache-cascade environment issue (174-HOTSPOTS Category B) is independently resolved, since this file's test suite is entangled with it. |
| `backend/internal/services/anime_create_enrichment.go` | 1,059 | Needs a dedicated scoping pass for its cross-cutting AniSearch enrichment logic. |
| `backend/internal/handlers/app_profile.go` | 1,042 | Needs a dedicated scoping pass; real handler-file candidate, no assigned boundary yet. |
| `backend/internal/handlers/admin_content_anime_theme_segments.go` | 967 | Should be revisited now that 174-18's companion repository split has landed, since this handler directly overlaps that repository's Segment cluster. |
| `frontend/src/app/admin/anime/create/page.module.css` | 1,773 | Needs its own component-boundary grep audit using the exact methodology 174-22/174-23 established (single-owner classification, compound-selector protection, comma-selector split). |
| `frontend/src/components/contributions/contributions.module.css` | 1,018 | Needs the same grep-audit methodology as the CSS P1s — real candidate, not yet scoped. |
| `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` | 961 | Needs the same grep-audit methodology as the CSS P1s — real candidate, not yet scoped. |

## P3 Hotspots — Follow-up Recommendations

| File | Lines | Follow-up recommendation |
|---|---|---|
| `backend/internal/permissions/permissions.go` | 968 | Needs dedicated Characterization-Test-first treatment with a real before/after effective-rights comparison before any split is attempted — explicitly deferred due to its central, cross-cutting rights-resolution role and the complete absence of any same-shape split precedent in this codebase. |
| `frontend/src/app/dev/ui-system/page.module.css` | 1,868 | No action recommended — this is a dev-only internal showcase route never shipped to end users; splitting it provides no end-user-facing maintainability gain proportional to the effort. |

---

## D-24 Exceptions

Every new/changed production file from this phase's execution that stays over 450 lines, with its explicit justification and originating plan. No silent new exceptions.

### Frontend

| File | Lines | Plan | Justification |
|---|---|---|---|
| `frontend/src/lib/api/client.ts` | 1,095 | 174-02 | `authorizedFetch`'s auth-refresh-on-401 retry chain is one cohesive, verbatim-relocated unit; splitting it mid-chain would fragment a single logical flow with no independent reason for either half to exist on its own. |
| `frontend/src/lib/api/history.ts` | 1,020 | 174-05 | 5 near-identical raw-DTO-to-domain mapper pairs must travel with their sole callers (D-09, no duplication); sub-splitting would scatter each note/story CRUD group across multiple files for no cohesion benefit. |
| `frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts` | 1,054 | 174-10 / 174-11 | D-14/D-21 mandate all `useState`/`useRef` ownership stay in one impl file; splitting state across hooks would change re-render behavior, which D-14/D-21 explicitly forbid. This is the exact, intentional interim shape `174-PATTERNS.md` documents for the `useEpisodeManagerImpl.ts` analog. |
| `frontend/src/lib/api/admin/fansub-members.ts` | 757 | 174-03 | The plan's own `files_modified` frontmatter locked this as a single artifact path (unlike the admin-anime bucket, which explicitly offered a sub-split escape hatch) — kept as a single-file D-24 cohesion exception. |
| `frontend/src/lib/api/permissions.ts` | 610 | 174-05 | Same class of exception as `fansub-members.ts` — the plan's locked artifact-path list offered no sub-split option for this bucket. |
| `frontend/src/app/admin/fansubs/create/page.tsx` | 610 | 174-14 | The orchestrator retains state declarations, effects, validation, and the core form fields + save/cancel row per D-14 ("component stays a recognizable domain unit"); delegating further would mean extracting single-line JSX fragments with no independent reason to exist (D-02 forbids this). **Not previously flagged as an explicit D-24 exception in 174-14-SUMMARY.md — identified and documented here for the first time by this closing report.** |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` | 632 | 174-12 / 174-13 | The orchestrator retains all state ownership, memoized derivations, and the `useGroupMediaReviewActions` hook call per the plan's explicit scope (JSX decomposition + logic extraction only, not further state-splitting, which D-14/D-21 forbid). Flagged as a known residual in 174-13-SUMMARY.md's "Issues Encountered" section; formalized as an explicit D-24 exception here. |

### Backend

| File | Lines | Plan | Justification |
|---|---|---|---|
| `backend/internal/repository/fansub_repository_groups.go` | 705 | 174-16 | Groups CRUD plus two cross-cluster-shared helpers (`populateCountMap`, `applyLegacyLinkProjection`, needed by the not-yet-split public-profile cluster at the time this plan ran) form one real, cohesive cluster. **Not previously flagged as an explicit D-24 exception in 174-16-SUMMARY.md — identified and documented here for the first time by this closing report.** |
| `backend/internal/repository/admin_content_anime_segments_crud.go` | 694 | 174-18 | Segment-CRUD cluster plus the shared source-codec helpers that travel with their majority-caller per the plan's explicit cross-file-call guidance — each sibling file is already a single, real-world-cohesive cluster (174-18-SUMMARY.md's own "Known File-Size Note"). |
| `backend/internal/repository/admin_content_anime_segments_library.go` | 570 | 174-18 | Same cluster-cohesion justification as `_segments_crud.go` above. |
| `backend/internal/repository/admin_content_anime_segments_playback.go` | 535 | 174-18 | Same cluster-cohesion justification; additionally the highest-risk cluster (transaction-boundary-sensitive playback-source sync) — further splitting would separate a decision tree from its supporting helpers. |
| `backend/internal/repository/admin_content_release_theme_assets.go` | 472 | 174-18 | Only slightly over budget; the release-theme-asset/fansub-anime-release cluster is kept as one cohesive unit. |

### CSS

| File | Lines | Plan | Justification |
|---|---|---|---|
| `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` | 3,379 (down from 4,568) | 174-22 | This is `174-HOTSPOTS.md`'s own pre-approved P1 verdict — the file is explicitly designated the directory's shared catch-all. Remaining content is grep-confirmed either shared (33 classes), used by 15 files outside the originally-declared 22-consumer universe (132 classes), compound-selector-entangled (5 classes — splitting would silently disable the CSS rule due to CSS-Modules per-file class-name hashing), or dead-but-undeleted (119 classes, per D-01 behavior preservation). Full class-by-class audit trail recorded in 174-22-SUMMARY.md. |

---

## Open Technical Debt

Per D-23, every item below is named explicitly — no silent omissions.

- **F-12 (Proxy-spread bug, partial fix only):** 174-23 found and fixed a critical runtime bug where `{ ...sharedStyles, ...ownStyles }` silently produces empty class names under Vitest/jsdom (the CSS-Modules mock has no enumerable own keys) in all 9 affected `components/ui/` files. **16 files under `admin/fansubs/[id]/edit/` from 174-22 use the identical vulnerable pattern and remain unfixed** (e.g. `GroupMembersTab.tsx`, `NotesTab.tsx`, `FansubEditClient.tsx`) — their tests happen to never assert against a class sourced exclusively from the merged (not base) object, so the bug is latent but undetected. Needs a targeted follow-up pass or inclusion in a future hardening phase.
- **Dead CSS, not deleted (D-01):** 119 classes in `FansubEdit.module.css` + 2 class-groups in `ui.module.css` (`breadcrumbs`, `datePickerClear`) have zero confirmed consumers anywhere in `frontend/src`, flagged during 174-22/174-23's grep audits but deliberately not removed (deletion was out of scope for a behavior-preserving refactor). Candidate for a dedicated dead-code-removal pass.
- **D-07 copy/paste findings not yet merged:**
  - **Pagination page-window math** (`components/ui/Pagination.tsx` vs. `components/anime/Pagination.tsx`) — byte-identical computation, different rendering mechanism (client callback vs. SSR `Link`). Recommend extracting the shared `computePageWindow(currentPage, totalPages)` pure helper.
  - **`formatDate` — 4 byte-identical copies** (`UserClaimsTab.tsx`, `ClaimsClient.tsx`, `ReviewQueue.tsx`, `ContributionsReviewSection.tsx`). Recommend merging into one shared helper.
  - **`getTypeBadgeLabel` OUTRO behavioral drift (real bug, not a style duplicate):** `SegmenteTab.helpers.tsx` returns `'OUT'` for an `OUTRO`-containing type name; `segmenteTabUtils.ts` returns `'PV'` for the identical input. This is a genuine semantic inconsistency between two call sites — flagged for explicit user/follow-up-phase resolution, deliberately not silently merged (merging would change one site's behavior without a decision on which is correct).
- **P2/P3 hotspots:** 18 P2 + 2 P3 files remain unmodularized by design — see the dedicated follow-up tables above, each with its own named recommendation.
- **Files still over 450 lines after Phase 174 (D-24 exceptions):** see the full table above (7 frontend, 5 backend, 1 CSS — all justified, none silent).
- **N+1 / query-in-loop:** no new N+1 found or introduced. "Episodes" and "Imports" (two of D-17's named risk areas) had no concrete currently-registered endpoint overlapping any Welle-4-touched file — explicitly noted in `174-HOTSPOTS.md` rather than a forced mapping.
- **BUG-174-04 follow-up (revision-conflict protection gap):** fixing BUG-174-04 (leadership edits to another member's release-version media) intentionally bypasses `SubmitMedia`'s revision-conflict check for non-uploader edits. If two non-uploader editors race, there is no conflict guard today. Recommend a dedicated revision-check extension in a follow-up phase.
- **F-14 (pre-existing, environment-dependent):** 8 RVM-handler integration tests fail with `db_schema_mismatch` against the Phase-107 test DB (`TestRVMTitlePatchPersistsIndependentMetadata` and the Reorder/SoftDelete/Category families) — a test-fixture-schema drift, not a Phase 174 regression (confirmed byte-identical before/after every Welle-4 split, per each plan's SUMMARY).
- **F-05 (data-quality, out of refactoring scope):** member `timer` has 9 duplicate `anime_contributions` entries for Anime 1 / Group 1 (same roles) — the root cause of the duplication needs investigation and a data cleanup pass, unrelated to this phase's modularization work.
- **F-06 / Category D (pre-existing, confirmed real bug, deliberately not fixed per D-01):** `shared/contracts/openapi.yaml` has a genuine duplicate YAML key (`"description"` at line ~2205, already defined at line ~2167), causing 4 backend contract tests to fail. This predates Phase 174 and is out of Welle 1's analysis-only scope to fix — flagged for a dedicated quick-fix.
- **F-03 / F-04 (deferred by explicit D-25 user decision):** ASCII-umlaut UI strings and native `<input>`/`<select>` elements on the fansub-create page remain unfixed — pre-existing, unrelated to this phase's refactoring scope, tracked as a UI-polish follow-up.

---

## D-04 Non-Goal Compliance (Phase Close)

This is the phase-wide gate — not a restatement of 174-01's planning-time verdict, but a check of what was **actually executed** across all 24 prior plans.

### Command 1 — dependency manifest diff

```
$ git diff --name-only fdb9f610 -- frontend/package.json backend/go.mod
(empty output)
```

Zero lines changed in either `package.json` or `go.mod` since the pre-Welle-2 baseline commit (`fdb9f610`) — no dependency was added, removed, or version-bumped by any Phase 174 plan.

### Command 2 — forbidden-pattern grep

```
$ grep -rEil "typeorm|prisma-client|sequelize|cqrs|aggregateroot|new design system" frontend/src backend/internal
(no matches, exit code 1)
```

Zero matches across the entire frontend and backend source tree.

### Manual checklist — one line per D-04 non-goal category

| # | Non-goal category | Status | Evidence |
|---|---|---|---|
| 1 | New design system | **Not introduced** | 174-22/174-23 extracted existing CSS classes verbatim into new `.module.css` files, reusing every existing design token/variable (confirmed via the grep-verified single-owner extraction methodology); zero new visual components, zero new token definitions. The `components/ui/` design-system primitives themselves were only split file-by-file, never redesigned (174-23). |
| 2 | DDD or CQRS layering | **Not introduced** | Every repository/handler split (174-16 through 174-20) is a same-package, same-struct, same-receiver file move — confirmed via `grep` showing zero new struct or constructor declarations anywhere in any of the 20 new backend sibling files. No command/query separation, no aggregate roots, no domain-event bus. |
| 3 | ORM swap | **Not introduced** | 174-16 through 174-20 kept `pgx` raw-SQL queries byte-for-byte verbatim (confirmed via explicit SQL-byte-diff acceptance criteria in each plan — e.g. 174-20's byte-for-byte diff of the permission-annotation cluster, 174-21's `git show`-diffed `ListAdminAnimeThemes` body). `go.mod` diff above confirms zero new DB-driver dependency. |
| 4 | Fetch-library swap | **Not introduced** | Every one of the ~385 relocated `frontend/src/lib/api/*` functions still calls the same `apiClientFetch`/`authorizedFetch`/raw-`fetch` primitives relocated verbatim in 174-02; 174-08's export-parity audit proved zero renamed implementations. `package.json` diff above confirms zero new HTTP-client dependency. |
| 5 | Routing-library swap | **Not introduced** | Zero Next.js route files were relocated or restructured by this phase; all splits operate on sibling files within the same route directory (`page.tsx` orchestrators stay at their existing route paths in 174-09/174-14, 174-12/174-13). `package.json` diff above confirms zero new routing dependency. |
| 6 | New permission architecture | **Not introduced** | `backend/internal/permissions/permissions.go` (the central `Can*`/`ResolveGroupRights` rights-resolution file) was explicitly classified P3 and left completely untouched (174-01's verdict, reconfirmed in this report's P3 follow-up table). 174-20's rights-adjacent permission-annotation cluster move was verified byte-for-byte identical before/after (T-174-04-01). No new role model, no new capability-check mechanism. |

---

## Recommendations for Follow-up Phases

Per the user's explicit 2026-10-05 PFLICHT instruction, every item from `174-FOLLOWUPS.md` (F-01 through F-18) and every `174-BUGS.md` item (including open Gegenproben) is folded in here, with priority. **F-01 is recommended as the first follow-up phase**, per the user's explicit instruction.

### Priority 1 — recommended as the very next phase

1. **F-01 — Remove the legacy image store.** Live production only uses V2 (`anime_media` + `media_assets`); the legacy `cover_image`-column path is dead weight. Recommended 3-step rollout: (1) remove dead legacy branches in `backend/internal/repository/anime_assets*.go` plus the per-call `hasV2AssetSchema` extra-query check; (2) migrate all 29 backend readers of `anime.cover_image` to `anime_media` (`anime.go`, `anime_v2.go`, watchlist, fansub-project-resolver, AniSearch import, anime create/delete); (3) drop the column via migration and audit the 55 frontend call sites of the `cover_image` contract field.

### Priority — hoch (user-flagged, 2026-10-06)

2. **F-18 — One unified image viewer/lightbox everywhere.** Currently 7+ independent image-viewer implementations exist across the public release gallery, episode screenshots, fansub media lightbox, project-member media viewer, group-assets experience, and 3 separate admin edit-dialog image stages. Recommended: one shared viewer primitive in `@/components/ui` (stage, display-then-original-reload, keyboard/swipe/zoom, metadata overlay), adopted everywhere, with every old implementation removed afterward (no side-by-side legacy). Design input: the uncommitted sketch at `.planning/sketches/010-galerie-detailansicht` (public release gallery only — the full unification is additional scope).
3. **F-16 — Unify search/filter behavior.** The global search library (`pg_trgm`/`f_unaccent`, umlaut-tolerant, ranked, indexed) coexists with 7 independently-built browser filters using plain `toLowerCase().includes()` (no umlaut folding, no typo tolerance, no ranking) across `AdminGroupsClient.tsx`, `admin/fansubs/page.tsx`, `admin/fansubs/merge/page.tsx`, `GroupMediaReviewSection.tsx`, and 3 more. Recommended: (a) one shared frontend filter helper reusing the search library's own normalization, unit-tested; (b) migrate the largest lists (fansub list, merge, groups) onto the backend search library outright.
4. **F-15 — One global uploader instead of parallel upload systems.** Release-version media uploads and fansub-group-media uploads are two independent systems sharing only the low-level `authorizedUploadXhr` primitive — different queueing (replace vs. append), different title/description handling, different backend image processing paths. Recommended: one reusable upload-queue component (collect-don't-replace, per-file title/description, retry) for all media surfaces; consolidate backend image processing onto one path. A fuller inventory of other upload call sites (`uploadAdminAnimeMedia`, `uploadSegmentAsset`, theme-asset uploads, profile uploads, suggestion uploads) should assess convertibility to the shared component.
5. **F-13 — Merge the two release-editing surfaces.** `/admin/episode-versions/[id]/edit` and `/me/releases/[id]/workspace` duplicate loading/form-state/save/tab/navigation/header logic around the same underlying content blocks and endpoints. Recommended: one capability-gated release-editing page reachable from every entry point, with the old workspace URL redirecting. This changes routes/links/flows — requires its own phase with UX sign-off, not a quick fix.

### Priority — normal

6. **F-11 — Rewrite the README** (to be done right after Phase 174, together with the push): a non-technical German entry-point document (what Team4s is, stack overview, few-step installation, first-admin-steps walkthrough), moving today's technical content (ports, smoke checks, migrations, contracts, auth) into `docs/ENTWICKLUNG.md`. Several documented details are already stale (GSD container script, fast-refresh claim, ports, auth dev-key, `AUTH_ADMIN_ROLE_NAME`) and need re-verification against the live Keycloak setup before writing. Push to GitHub only on explicit user instruction.
7. **F-17 — Inventory "duplication by business task."** 174's own D-07 pass (Welle 1) only found duplicate *functions*, not duplicate *systems* — the real system-level duplications (F-13, F-15, F-16) only surfaced during live UAT. Recommended: a dedicated count-per-business-task inventory (upload, release-editing, review/approve, invite-member, write-note, search/filter, …) as the basis for prioritizing the consolidation phases above.
8. **F-07 — Merge the duplicate logic found but not merged in 174:** Pagination page-window math (2 components) and `formatDate` (4 identical copies) — see "Open Technical Debt" above for the specifics; this is a small, low-risk follow-up.
9. **F-08 — Execute the 18 P2 hotspots documented in this report's P2 table** (`types/admin.ts`, `EpisodeVersionEditorPage.tsx`, `fansubs/merge/page.tsx` without tests, `media_repository.go`, `anisearch_client.go`, and 13 more) — each already has an individual one-sentence recommendation above.
10. **F-09 — Track the files still over 450 lines after Phase 174** as a living list for a future tightening pass: `lib/api/client.ts` (1,095), `lib/api/history.ts` (1,020), `lib/api/admin/fansub-members.ts` (757), `lib/api/permissions.ts` (610), `useAdminAnimeCreateControllerImpl.ts` (1,054), `GroupMediaReviewSection.tsx` (632), `admin/fansubs/create/page.tsx` (610) — plus this report's additionally-identified Welle-4 backend D-24 exceptions (`fansub_repository_groups.go` 705, the 3 `admin_content_anime_segments_*.go` files, `admin_content_release_theme_assets.go` 472) and `FansubEdit.module.css` (3,379, by design). The complete, current table is in this report's "D-24 Exceptions" section above.
11. **F-10 — Optional: a small number of real Playwright end-to-end tests** for core admin workflows (real page + real backend), as a complement to the D-25-mandated live-UAT approach, rather than relying purely on click-simulation or manual review.
12. **F-12 (carried forward, see "Open Technical Debt")** — fix the remaining 16 files under `admin/fansubs/[id]/edit/` using the vulnerable `{ ...sharedStyles, ...ownStyles }` object-spread pattern 174-23 found and fixed in `components/ui/`.
13. **F-02 (carried forward, see "Open Technical Debt")** — resolve the `getTypeBadgeLabel` OUTRO behavioral drift bug between `SegmenteTab.helpers.tsx` and `segmenteTabUtils.ts` once a product decision is made on the correct label.
14. **F-05 (carried forward, see "Open Technical Debt")** — investigate and clean up member `timer`'s 9 duplicate `anime_contributions` rows.
15. **F-06 (carried forward, see "Open Technical Debt")** — fix the genuine `shared/contracts/openapi.yaml` duplicate-key bug (line ~2205) as a dedicated quick-fix; it is unrelated to Phase 174 but independently confirmed real.
16. **F-03 / F-04 (carried forward)** — fix ASCII-umlaut UI strings and native `<input>`/`<select>` elements on the fansub-create page as a small UI-polish follow-up.

17. **F-14 (carried forward)** — 8 release-version-media handler integration tests fail with `db_schema_mismatch` against the Phase-107 test DB (pre-existing; e.g. `TestRVMTitlePatchPersistsIndependentMetadata`, reorder/soft-delete/category tests): bring the test fixture schema up to date. Also review whether non-uploader edits of release media (no longer routed through `SubmitMedia` since BUG-174-04) need their own revision-conflict guard.
18. **F-19 (UI polish)** — on mobile (~375 px) the sticky “Speichern” button on `/admin/fansubs/[id]/edit` covers form fields (e.g. “Gruppentyp”); already present in the BEFORE baseline, found during the 174-24 comparison.

### BUGS — status (all items from `174-BUGS.md`)

All 5 bugs found during live UAT were fixed — BUG-174-01 (render loop on fansub create), BUG-174-02 (dashboard group-media review gate), BUG-174-03 (release-media gallery stale after delete/edit), BUG-174-04 (leads could not edit others’ release media), BUG-174-05 (fansub display variants overwriting each other, incl. data repair) — none caused by 174’s refactoring; all were fixed within Phase 174 itself and are documented in detail in `174-BUGS.md`. Per `174-UAT-CHECKLIST.md`, **both previously-open Gegenproben are now closed**: BUG-174-02's post-backend-rebuild re-check (timer's dashboard no longer shows "Gruppenbild prüfen" for New-Subs; platform-admin/leadership still sees and can approve it) and BUG-174-05's re-check (New-Subs's own banner persists correctly after a further gallery upload) were both approved by the user 2026-10-06 — **superseding `174-FOLLOWUPS.md`'s "Erledigt in 174"/"Gegenprobe ... offen" note, which is now stale.** The one still-open follow-up item from the BUGS file is the revision-conflict-protection gap BUG-174-04's fix intentionally left open for non-uploader edits — carried forward above under "Open Technical Debt".

---

*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Report completed: 2026-10-06*
