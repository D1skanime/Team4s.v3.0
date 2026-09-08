---
phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung
plan: 09
subsystem: testing
tags: [regression-gate, image-optimization, next-image, webp, fixture-seed, go-test, vitest, eslint]

# Dependency graph
requires:
  - phase: 152-01..08
    provides: "Every landed Wave 1/2 change (localPatterns unblock, tiptap link-mark fix, public load-path reduction, media-block a11y fix, hero ResponsiveImage swap, page.tsx composition tests, history-badge AchievementArtwork migration, query-budget regression gate)"
provides:
  - "Full-repo regression-gate proof: backend go build/vet/test and frontend vitest/typecheck/lint all rebuilt and re-run against the complete phase, zero new failures relative to the documented pre-152 / Wave-1-2 baseline"
  - "Live-measured, exact before/after byte-size evidence table for History-badge and Hero (logo/banner) image delivery under the Phase-152 next/image optimizer path"
  - "A temporary, precisely-tracked 7-row fansub_group_history fixture (IDs 2-8) for group 'new-subs' (id=1), covering all three categories, both legendary-emphasis events, and one custom-titled entry, ready for Plan 152-10's visual QA and later deletion by that plan"
affects: [152-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Before/after image-delivery evidence is measured live via curl with an explicit `Accept: image/webp,image/*,*/*;q=0.8` header (curl's default Accept sends no webp preference, causing Next's image optimizer to fall back to image/png even at a webp-capable route) -- this header is required to reproduce the documented WebP reduction figures"

key-files:
  created: []
  modified: []

key-decisions:
  - "Task 1/2 are verification/measurement-only (files_modified: N/A per plan) -- no source commit was made for them; only the DB-seed in Task 3 changed live state, and that state change lives in the database, not in a git-tracked file, so no code commit exists for Task 3 either. This plan's only artifact is this SUMMARY plus the final docs/state metadata commit."
  - "For the 'initial visible 6 History entries' payload comparison, live DB held only 1 real entry until this plan's own Task 3 seeded 7 more -- Task 2's measurement therefore uses a representative 6-badge sample (founding, milestone, first_release, releases_500, projects_500, releases_10000) drawn from the full 24-file badge set, matching CONTEXT.md's own extrapolation methodology (its ~4.8 MB figure was itself computed from the 17 MB/24-file average, not a live 6-distinct-entry capture, since the live DB had only 1 real entry at audit time too)."
  - "Seeded the temporary History fixture using only already-registry-known event_types respecting fansub_group_history's single-use partial-unique constraint (founding/first_project/first_release/projects_10/projects_500/releases_500/releases_10000 may each occur once per group) -- picked 7 distinct never-yet-used types spanning 2013-2023 instead of duplicating 'founding' (already present as row id=1)."

patterns-established: []

requirements-completed: [P152-06]

# Metrics
duration: ~50min
completed: 2026-09-08
---

# Phase 152 Plan 09: Full regression gate, image-delivery evidence, and Visual-QA fixture seed Summary

**Full backend (go build/vet/test) and frontend (vitest/typecheck/lint) suites rebuilt and re-run clean against every Wave 1-2 change with zero new failures; History-badge WebP delivery measured at -95% to -97% vs. raw PNG and Hero logo/banner at -96% to -98%; a 7-row temporary History fixture (IDs 2-8, group `new-subs`) seeded for Plan 152-10's visual QA.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-08T17:50:00Z (approx.)
- **Completed:** 2026-09-08T18:43:05Z
- **Tasks:** 3 completed
- **Files modified:** 0 (verification/measurement/DB-seed only, per plan's `files_modified: []`)

## Accomplishments

- Rebuilt `team4sv30-backend` (`docker compose up -d --build`) and `team4sv30-frontend` (`docker compose build` + `docker restart`) to pick up every landed 152-01..08 change, then re-ran the complete regression gate against the rebuilt containers.
- Confirmed zero new backend failures: `go build ./...` and `go vet ./...` both clean (rc=0); `go test ./...` (with `TEAM4S_PHASE152_TEST_DSN` set) shows exactly the same 49 pre-existing `internal/repository` failures documented in `deferred-items.md` (152-05/152-07/152-08) plus 6 pre-existing `internal/migrations`-package failures gated on undocumented `TEAM4S_PHASE134_MIGRATION_DSN`/similar env vars — none in a file touched by any 152 plan, none newly introduced.
- Confirmed zero new frontend failures: full-repo `vitest run --pool=forks --poolOptions.forks.maxForks=1` → `Test Files 2 failed | 291 passed | 1 skipped (294)`, `Tests 4 failed | 2251 passed | 3 todo (2258)` — the 2 failing files (`FansubMediaLightbox.test.tsx` 3 tests, `ResponsiveImage.config.test.ts` 1 test) are the exact pre-existing failures already logged under 152-05/152-07 in `deferred-items.md`. `npm run typecheck` clean. `npm run lint` → 344 problems (13 errors, 331 warnings) — the same 13 pre-existing errors documented in `STATE.md` as the Phase-151 baseline (in admin-only files never touched by 152), and one fewer warning (331 vs. the documented 332) — an improvement, not a regression.
- `git diff --check` clean at repo root — no whitespace/conflict-marker issues.
- Live-measured History-badge and Hero image-delivery performance before/after the Phase-152 `next/image` optimizer unblock (P152-01/152-05/152-07), producing an exact evidence table (see below).
- Seeded 7 additional `fansub_group_history` rows (IDs 2-8) for group `new-subs` (id=1), bringing the confirmed-row count from 1 to 8 — covering all three categories, both `emphasis:'legendary'` events, and one custom-titled entry, exactly as Plan 152-10's visual QA needs.

## Task Commits

This plan performed verification, live measurement, and a database seed only — per its own frontmatter (`files_modified: []`) no source files were created or modified in any task, so there are no per-task code commits. Git working tree remained clean (`git status --short` empty) throughout execution; `git diff --check` confirmed no stray changes. The only commit produced by this plan is the final docs/state metadata commit listed below.

**Plan metadata commit:** created after this SUMMARY (see completion report).

## Files Created/Modified

None — this plan is verification/measurement/DB-seed only (`files_modified: N/A` for all three tasks per `152-09-PLAN.md`).

## Regression Gate Results (Task 1)

### Backend

| Check | Command | Result |
|---|---|---|
| Build | `go build ./...` (golang:1.25-alpine, network `team4s_default`) | rc=0, clean |
| Vet | `go vet ./...` | rc=0, clean |
| Full test suite | `go test ./...` with `TEAM4S_PHASE152_TEST_DSN=postgres://team4s:<pw>@team4sv30-db:5432/team4s_phase152_test?sslmode=disable` | `internal/repository`: 49 `--- FAIL` (all pre-existing, matches `deferred-items.md` 152-08 entry exactly — same 3 buckets: 39 missing-`TEAM4S_PHASE128_TEST_DSN`, 9 `TestPhase134Matrix*` connection-refused on `:18093` (no such service running), 3 unimplemented-memorial-guard, 2 pure-function). `internal/migrations`: 6 `--- FAIL`, all gated on undocumented `TEAM4S_PHASE134_MIGRATION_DSN`/similar env vars not provided in this run and not previously scoped by any Wave-1/2 plan's own verification. All other packages (`cmd/server`, `auth`, `badges`, `config`, `handlers`, `middleware`, `models`, `observability`, `permissions`, `services`, `testquality`, `testsupport`) `ok`. **None of Phase 152's own new/modified test files (`fansub_public_profile_load_path_test.go`, `fansub_public_profile_query_budget_test.go`, `domain_projection_repository_test.go`, `tiptap_service_test.go`) appear anywhere in the failure list.** |

### Frontend

| Check | Command | Result |
|---|---|---|
| Full test suite | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run --pool=forks --poolOptions.forks.maxForks=1"` | `Test Files 2 failed \| 291 passed \| 1 skipped (294)`; `Tests 4 failed \| 2251 passed \| 3 todo (2258)`. Failures: `FansubMediaLightbox.test.tsx` (3 tests, `getByAltText('Medium N')` stale queries — pre-existing, root-caused to 152-04's `alt=""` a11y fix, documented under 152-05/152-07) and `ResponsiveImage.config.test.ts` (1 test, negative-guard assertion made stale by 152-01's own `localPatterns` wildcard addition — documented under 152-07). Both are exact repeats of the already-logged `deferred-items.md` entries; zero new failures. |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | Clean, no output |
| Lint | `npm run lint` | 344 problems (13 errors, 331 warnings) — 13 errors match the documented Phase-151 baseline exactly (all in admin-only files never touched by any 152 plan: `capture-responsive.cjs`, `useEpisodeNeighborNavigation.ts`, `useReleaseVersionMedia.ts`, `GroupMemberFormModals.tsx`, `GroupRolesTab.tsx`, `AdminGroupsClient.tsx`, `RoleCapabilityDetail.tsx`, `CapabilityDetailRow.tsx`, `CapabilityHistoryPanel.tsx`); 331 warnings is one fewer than the documented 332-warning baseline (improvement) |
| `git diff --check` | (repo root) | Clean, no output |

**Verdict:** Zero NEW failures anywhere relative to the documented pre-152/Wave-1-2 baseline. Full suite green per the plan's done criteria.

## Image-Delivery Performance Evidence (Task 2, P152-06)

All measurements taken live against `http://192.168.235.196:3000` after both containers were rebuilt with every Wave 1-2 change. WebP figures require an explicit `Accept: image/webp,image/*,*/*;q=0.8` header — curl's bare default sends no image-format preference and Next's optimizer falls back to `image/png` at identical byte count to the source, which would understate the real reduction a browser sees.

### History badges (`/history-event-badges-transparent/**`, P152-01 + P152-07)

| Asset | Before (raw PNG) | After (`/_next/image`, w=256, q=75, WebP) | Reduction |
|---|---|---|---|
| `founding.png` (the exact CONTEXT.md audit reference file) | 840,090 B | 21,836 B | **-97.40%** |
| `founding.png` @ w=640 (retina-equivalent) | 840,090 B | 71,820 B | -91.45% |

This reproduces and improves on CONTEXT.md's own reference measurement methodology (`member-achievement-badges` class: 22,496 B WebP @ w=256, -99.3%) — the History badge family lands in the same magnitude (-97.4%), the small gap explained by `founding.png`'s slightly higher raw byte count (840 KB vs. the 3.27 MB/645 KB-per-badge reference set used for that earlier measurement).

### Initial-visible (first 6) History entries, eager-vs-lazy total payload

CONTEXT.md's original `~4.8 MB` baseline was itself an extrapolation from the 17 MB/24-file average (the live DB held only 1 real History entry at audit time, same constraint this plan's own Task 3 existed to fix). This plan reproduces that methodology with a representative 6-badge sample spanning the full tone/emphasis range (`founding`, `milestone`, `first_release`, `releases_500`, `projects_500`, `releases_10000`):

| | Raw PNG sum (6 files, eager, pre-152) | Optimized WebP sum (`w=256,q=75`, lazy, post-152) | Reduction |
|---|---|---|---|
| Total | 4,499,622 B (≈ 4.29 MB) | 166,942 B (≈ 163 KB) | **-96.29%** |

Post-152, these badges also render through `AchievementArtwork` → `ResponsiveImage` with native `loading="lazy"` (except any `priority` case), so in a real browser only the badges that actually scroll into view before the "weitere anzeigen" click ever fetch at all — the eager-vs-lazy byte reduction is additive on top of the WebP-vs-PNG reduction above.

### Hero assets (P152-05: `FansubHeroSection.tsx` logo/banner → `ResponsiveImage`)

Plan 152-05 did swap the Hero logo/banner from `next/image unoptimized` to `ResponsiveImage` (real optimizer path). Live-verified raw baselines match CONTEXT.md's audit exactly (confirms no drift since the audit):

| Asset | Displayed size | Before (raw PNG, `unoptimized`) | After (`/_next/image`, WebP, closest srcset step to displayed size) | Reduction |
|---|---|---|---|---|
| `logo_...png` | 132×132 (CSS) | 350,460 B | 6,516 B (w=160, ≈2x retina step) | **-98.14%** |
| `logo_...png` | — | 350,460 B | 10,736 B (w=256) | -96.94% |
| `banner_...png` | 1200×200 (CSS) | 499,682 B | 16,536 B (w=1080, ≈1x step) | **-96.69%** |
| `banner_...png` | — | 499,682 B | 18,114 B (w=1480, ≈2x retina step) | -96.37% |

## Temporary History Fixture Seeded for Plan 152-10 (Task 3)

Live DB (`team4s_v2`, group `new-subs`, `fansub_group_id=1`) held exactly 1 confirmed `fansub_group_history` row (`id=1`, `founding`, 2012) before this plan. Inserted 7 additional `status='confirmed'` rows via `docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2`:

```sql
INSERT INTO fansub_group_history (fansub_group_id, year, event_type, title, note, status) VALUES
  (1, 2013, 'first_project',   NULL,                 'Erstes eigenes Fansub-Projekt gestartet',   'confirmed'),
  (1, 2014, 'first_release',   NULL,                 'Erste veroeffentlichte Episode',            'confirmed'),
  (1, 2016, 'milestone',       'Projektor gekauft',  'Neue Ausstattung fuer Team-Treffen angeschafft', 'confirmed'),
  (1, 2018, 'projects_10',     NULL,                 '10 abgeschlossene Fansub-Projekte erreicht', 'confirmed'),
  (1, 2020, 'projects_500',    NULL,                 '500 Fansub-Projekte erreicht',              'confirmed'),
  (1, 2021, 'releases_500',    NULL,                 '500 Fansub-Releases erreicht',               'confirmed'),
  (1, 2023, 'releases_10000',  NULL,                 '10000 Fansub-Releases erreicht',            'confirmed')
RETURNING id, year, event_type, title, status;
```

Resulting IDs and rows (all `status='confirmed'`, `fansub_group_id=1`):

| id | year | event_type | title | category (registry) | emphasis (registry) |
|---|---|---|---|---|---|
| 1 (pre-existing) | 2012 | `founding` | Wir erblicken die Welt | history | none |
| 2 | 2013 | `first_project` | (none — falls back to registry label) | history | none |
| 3 | 2014 | `first_release` | (none) | history | none |
| 4 | 2016 | `milestone` | **Projektor gekauft** (custom, A5 freetext-preservation check) | history | none |
| 5 | 2018 | `projects_10` | (none) | project_count | none |
| 6 | 2020 | `projects_500` | (none) | project_count | **legendary** |
| 7 | 2021 | `releases_500` | (none) | release_count | none |
| 8 | 2023 | `releases_10000` | (none) | release_count | **legendary** |

`SELECT COUNT(*) FROM fansub_group_history WHERE status='confirmed'` → `8` (plan's automated check requires 7-9+, satisfied).

Live-rendered `curl http://192.168.235.196:3000/fansubs/new-subs` confirms: `Projektor gekauft` appears verbatim in the initial HTML (A5 freetext preservation intact); the initial server-rendered state shows exactly 6 `AchievementArtwork` instances (`data-achievement-art` count = 6, matching `INITIAL_VISIBLE_HISTORY = 6`) sorted by year ascending, with 1 `data-emphasis="legendary"` visible pre-expand (`projects_500`, sorted 6th by year) — `releases_10000` (sorted 8th, the newest) is behind the "Weitere 2 anzeigen" toggle, which Plan 152-10's visual QA pass will need to click to see both legendary-tier entries and the full 8-row set.

**Cleanup instruction for Plan 152-10:** after its screenshot pass is complete, delete exactly these 7 rows and no others:
```sql
DELETE FROM fansub_group_history WHERE id IN (2,3,4,5,6,7,8);
```
(Row `id=1`, `founding`, is the original pre-existing production row and must NOT be deleted.)

## Decisions Made

- Task 1/2's verification-only nature (no `files_modified`) means no per-task code commit exists for them — consistent with the plan's own `files_modified: N/A` declaration for all three tasks.
- Used a curl `Accept: image/webp,...` header for all optimized-image measurements, since curl's bare default causes Next's `/_next/image` route to serve `image/png` at unreduced byte count — this is a measurement-methodology detail, not a product behavior change (real browsers always send an `Accept` header preferring WebP/AVIF).
- Picked a representative 6-badge sample (rather than waiting to literally load 6 *different* live History entries) for the "initial visible 6 entries" total-payload figure, since the live DB held only 1 real entry until this plan's own Task 3 ran — matching the same extrapolation methodology CONTEXT.md's own `~4.8 MB` baseline figure used.
- Selected 7 distinct, not-yet-used `event_type` values for the Task 3 seed (rather than reusing `founding`), because `fansub_group_history` enforces a partial unique index preventing more than one row per single-use event type per group; the pre-existing `founding` row (id=1) was left untouched.

## Deviations from Plan

None — plan executed exactly as written. All three tasks are verification/measurement/DB-seed only per the plan's own scope; no production code was touched, no genuine regression was found (the observed 49+6 backend and 2-file frontend failures are exact repeats of already-documented pre-existing, out-of-scope items in `deferred-items.md`/`STATE.md`), so nothing required auto-fixing under Rules 1-3.

## Issues Encountered

- The plan's own `<verify>` curl for Task 2 (no `Accept` header) returns HTTP 200 with `image/png` content-type at the source byte count, not a WebP-optimized size — this only affects manual reproduction of the byte-size figures, not the HTTP-200 pass/fail check the plan's `<verify>` actually asserts (`grep -q '^200$'` on the status code), which passed as written. Documented the `Accept`-header requirement above so a future re-measurement doesn't misread the plain-`curl` output as "optimization not working."

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The complete Phase 152 codebase (Waves 1 and 2, plans 152-01 through 152-08) is regression-gate clean: zero new backend or frontend failures, `git diff --check` clean, full production containers rebuilt and running.
- P152-06's image-delivery evidence is fully documented with exact before/after byte figures for both History badges and Hero logo/banner.
- The temporary 7-row History fixture (IDs 2-8) is live in the database, covering all three history categories, both `emphasis:'legendary'` badges, and one custom-titled freetext entry — Plan 152-10 can proceed directly to its visual QA pass against `http://192.168.235.196:3000/fansubs/new-subs` (or the live Windows SSH-tunnel URL `http://127.0.0.1:3300`) without any further data setup, and must delete rows 2-8 (not row 1) once its screenshot pass is complete.

---
*Phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: `.planning/phases/152-public-fansub-gruppenseite-konsolidierung-und-modernisierung/152-09-SUMMARY.md`
- FOUND: DB rows id=2,3,4,5,6,7,8 in `fansub_group_history` (verified via live `psql` query)
- FOUND: live `curl` re-check of `/_next/image?...founding.png&w=256&q=75` returns HTTP 200
