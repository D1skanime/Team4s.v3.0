---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
plan: 12
subsystem: ui
tags: [react, typescript, next.js, public-read-model, gap-closure]

# Dependency graph
requires:
  - phase: 164-08
    provides: PublicEpisodeVersion.release_name (always-populated backend default-name field)
  - phase: 164-10
    provides: PublicGroupedEpisode.filler_type_label/episode_type_label (DB-backed classification/type display names)
provides:
  - "episodePreviewFormat.ts's resolveReleaseName/classificationAndTypeLine/formatTechValue/formatSubtitleType consuming the new backend fields instead of client-side fallback/hardcoded-map logic"
  - "episodeVersionEditorUtils.ts's defaultReleaseTitle mirroring the same coop-capable format as the public release name"
affects: [164-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Classification/type label resolution takes the resolved PublicGroupedEpisode object
      (or a Pick of its label fields) instead of two bare enum codes, so labels always come
      from the API response, never a parallel frontend lookup table"
    - "Tech-line construction: helper functions return string | null (omit signal) instead of
      a display-ready string with a hardcoded fallback; the caller filters nulls before
      joining and conditionally renders the whole line"

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/episodePreviewFormat.ts
    - frontend/src/components/fansubs/ReleasePreviewRow.tsx
    - frontend/src/components/fansubs/EpisodeGlassCard.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts
    - frontend/src/components/fansubs/episodePreviewFormat.test.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts
    - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx

key-decisions:
  - "classificationAndTypeLine takes a Pick<PublicGroupedEpisode, 'filler_type' |
    'filler_type_label' | 'episode_type_label'> instead of two bare codes -- kept the
    unknown-hides-classification suppression keyed on the filler_type code (not the label
    text), since the DB now returns a non-null label ('Unbekannt') even for the unknown case"
  - "classificationLabel/episodeTypeLabel and their hardcoded CLASSIFICATION_LABELS/
    EPISODE_TYPE_LABELS maps were deleted outright (not kept as thin DB-passthrough
    wrappers) since classificationAndTypeLine was their only caller -- smallest diff per the
    plan's own stated discretion"
  - "defaultReleaseTitle keeps the existing 'Episode NNN' padded-number wording as the
    <Episodentitel> placeholder position (no new EpisodeVersionEditorContext field added) --
    matches the plan's documented discretion that only the format/coop-capability needed
    fixing for this admin-only placeholder, not a new backend round trip"
  - "Fixed FansubVersionBrowser.test.tsx's D-48 visual-catalog block (DEFAULT_CLASSIFICATION
    fixture + 3 it.each blocks) as an unavoidable Rule 1 regression fix, not a scope
    expansion: those tests render classificationAndTypeLine's actual output and asserted the
    exact removed hardcoded labels ('Filler'/'Gemischt'/'Film'); updated to the real 164-10
    DB-backfilled labels ('Zusatzfolge'/'Teilweise Zusatzfolge'/'Movie')"
  - "Left five other pre-existing PublicGroupedEpisode fixtures (episode-windowing-preview
    page, FansubVersionBrowser.filterSwitch/.groupSwitch/.windowing.test.tsx,
    useWindowedEpisodePages.test.ts) with tsc-only (non-runtime) gaps for the two 164-10
    required fields untouched -- confirmed via a full vitest sweep (520/520 fansubs+admin
    tests, then the whole frontend suite) that none of them exercise
    classificationAndTypeLine at runtime, and 164-10's own SUMMARY.md already explicitly
    assigns this fixture cleanup to 164-13; logged to deferred-items.md instead of
    expanding this plan's scope"

patterns-established:
  - "GAP-03 tech-line omission: formatTechValue/formatSubtitleType return string | null;
    callers filter(v => v !== null).join(' · ') and conditionally render the paragraph only
    when non-empty -- reusable template for any future 'omit missing values entirely'
    display rule"

requirements-completed: [REQ-164-02, REQ-164-03, REQ-164-04, REQ-164-08, REQ-164-11, REQ-164-12, REQ-164-14]

# Metrics
duration: 25min
completed: 2026-09-18
---

# Phase 164 Plan 12: Frontend Consumption of release_name / Classification Labels / Tech-Line Omission Summary

**episodePreviewFormat.ts and the admin editor placeholder now read the backend-computed release_name and DB-sourced classification/episode-type labels shipped by 164-08/164-10 instead of a client-side title fallback and a hardcoded frontend label map, and the release tech line omits missing values entirely instead of ever showing "Unbekannt".**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-18T09:06:00Z (approx, first file reads)
- **Completed:** 2026-09-18T09:19:00Z
- **Tasks:** 2 (both `auto`, both `tdd="true"`)
- **Files modified:** 7 (6 in-scope per plan frontmatter, 1 direct-regression fix)

## Accomplishments
- GAP-02 (frontend half): `resolveReleaseName` now returns `version.release_name` verbatim, with no more client-side title/"Release #ID" fallback logic; the admin editor's `defaultReleaseTitle` placeholder mirrors the identical `"<Episodentitel> · (<Gruppe(n)>) · <Version>"` format and is now coop-capable (builds the group segment from *all* `selected_groups`, sorted name-then-id, `× `-joined — not just the first group).
- GAP-03: the release tech line (resolution/container/codec/subtitle) omits any missing value instead of rendering "Unbekannt"; when all four values are missing, the whole `techLine` paragraph is omitted, not just its contents.
- GAP-11 (frontend half): the classification/type line ("Filler · Episode") is sourced from the API response's `filler_type_label`/`episode_type_label` (164-10's DB-backed lookup), never a hardcoded frontend map; the unknown-classification-hides-its-label rule (UI-SPEC decision 4) stays keyed on the stable `filler_type` code, not the label text.

## Task Commits

1. **Task 1: Consume backend-computed release_name and remove the tech-line "Unbekannt" fallback** — `8fea05de` (feat)
2. **Task 2: Consume DB-sourced classification/episode-type labels and mirror the format in the admin placeholder** — `78a0a5cc` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified
- `frontend/src/components/fansubs/episodePreviewFormat.ts` — `resolveReleaseName` returns `version.release_name`; `formatTechValue`/`formatSubtitleType` return `string | null` (omit signal); `classificationAndTypeLine` reads `filler_type_label`/`episode_type_label` from the episode object; `CLASSIFICATION_LABELS`/`EPISODE_TYPE_LABELS` and `classificationLabel`/`episodeTypeLabel` deleted
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx` — techLine construction filters `null` entries before joining, paragraph renders conditionally
- `frontend/src/components/fansubs/EpisodeGlassCard.tsx` — `classificationAndTypeLine` call site passes the whole episode object
- `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts` — `defaultReleaseTitle` builds the coop-capable `(<Gruppe(n)>)` segment from all `selected_groups`, sorted name-then-id
- `frontend/src/components/fansubs/episodePreviewFormat.test.ts` — rewrote stale `formatTechValue`/`formatSubtitleType`/`resolveReleaseName`/`classificationLabel`/`episodeTypeLabel`/`classificationAndTypeLine` blocks for the new behavior/signatures; added the plan's Test 1-4 coverage plus a techLine-construction test; fixed the pre-existing `resolveEpisodeTitle` `baseEpisode` fixture (missing `filler_type_label`/`episode_type_label`, a 164-10 gap in a file this plan owns)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts` — added `defaultReleaseTitle` describe block (Test 3-4: two-group coop case, single-group case)
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx` — fixed a direct runtime regression in the "D-48 visueller Testfall-Katalog" block (see Deviations)

## Decisions Made
See `key-decisions` in the frontmatter above (signature shape for `classificationAndTypeLine`, deletion vs. wrapper choice for `classificationLabel`/`episodeTypeLabel`, admin placeholder wording discretion, the direct-regression test fix, and the deliberate non-fix of five out-of-scope tsc-only fixture gaps).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `episodePreviewFormat.test.ts`'s pre-existing `resolveEpisodeTitle` fixture was missing the two 164-10 required fields**
- **Found during:** Task 1, `tsc --noEmit` verification
- **Issue:** `resolveEpisodeTitle`'s `baseEpisode` test fixture predates 164-10's `filler_type_label`/`episode_type_label` required fields and failed type-checking.
- **Fix:** Added `filler_type_label: 'Unbekannt', episode_type_label: 'Episode'` to the fixture (no behavior change).
- **Files modified:** `frontend/src/components/fansubs/episodePreviewFormat.test.ts`
- **Commit:** `8fea05de`

**2. [Rule 1 - Bug] `FansubVersionBrowser.test.tsx`'s D-48 visual-catalog block asserted the exact hardcoded labels this plan removes**
- **Found during:** Task 2, full `src/components/fansubs` + admin editor vitest sweep (post-implementation regression check)
- **Issue:** `DEFAULT_CLASSIFICATION` lacked `filler_type_label`/`episode_type_label` entirely (undefined at runtime once `classificationAndTypeLine`'s signature changed), and three `it.each` blocks asserted the old hardcoded German labels ("Filler", "Gemischt", "Film") that Task 2 deletes from the frontend — 9 tests failed.
- **Fix:** Added `filler_type_label`/`episode_type_label` to `DEFAULT_CLASSIFICATION`; updated the three `it.each` blocks to assert the real 164-10 DB-backfilled labels ("Zusatzfolge", "Teilweise Zusatzfolge", "Movie" for filler/mixed/movie respectively) and pass the matching label override per test case.
- **Files modified:** `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`
- **Commit:** `78a0a5cc`

---

**Total deviations:** 2 auto-fixed (1 Rule 1 pre-existing-fixture type gap in an owned file + 1 Rule 1 direct-regression fix in a sibling file whose tests exercise this plan's changed function at runtime)
**Impact on plan:** Both fixes are direct, unavoidable consequences of this plan's own mandated signature/behavior changes. No scope creep: five other pre-existing `PublicGroupedEpisode` fixtures with the same 164-10 required-field gap were deliberately left untouched (tsc-only, no runtime failures, explicitly deferred to 164-13 by 164-10's own SUMMARY.md) — see `deferred-items.md`.

## Issues Encountered
None beyond the deviations above. No auth gates, no checkpoints.

## User Setup Required
None — no external service configuration required.

## Verification

- `npx vitest run src/components/fansubs/episodePreviewFormat.test.ts` — 24/24 then 21/21 pass across both tasks (final: 21 tests after Task 2's rewrite reduced/reorganized describe blocks).
- `npx vitest run src/components/fansubs/episodePreviewFormat.test.ts "src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts"` (plan's own `<verification>` command) — 49/49 pass.
- `npx vitest run src/components/fansubs "src/app/admin/episode-versions"` (broader regression sweep) — 41 files, 520/520 tests pass (0 failures after the Deviation #2 fix).
- Full frontend suite `npx vitest run` — 331 passed | 1 skipped test files, 2917 passed | 3 todo tests; the only failing file (`src/lib/cssCustomProperties.guard.test.ts`, 2 tests) is the pre-existing, already-documented 164-04 line-drift issue (unrelated to `roleCatalog.accessibility.test.ts`/`cssCustomProperties.guard.test.ts`, neither touched by this plan) — 0 new regressions.
- `npx tsc --noEmit -p .` — same pre-existing baseline as before this plan's Task 1 (2 unrelated `.next/dev/types`/Next.js 16 route-prop generated-artifact errors, already documented across 164-02/164-04/164-06/164-07/164-08/164-10) plus 5 pre-existing 164-10 fixture gaps (`filler_type_label`/`episode_type_label` missing on object literals in files not owned by this plan) — explicitly logged to `deferred-items.md` per 164-10's own next-phase-readiness note assigning that cleanup to 164-13. `FansubVersionBrowser.test.tsx` no longer appears in the tsc error list after this plan's fix (Deviation #2).
- `npx eslint` on all files touched by this plan — clean (0 warnings/errors).
- Acceptance-criteria greps (all plan-specified) confirmed: `TECH_VALUE_FALLBACK` count 0, `release_name` count ≥1, `'Unbekannt'` count 0 in `episodePreviewFormat.ts`; `CLASSIFICATION_LABELS|EPISODE_TYPE_LABELS` count 0, `filler_type_label|episode_type_label` count ≥2 in `episodePreviewFormat.ts`; `selected_groups\[0\]` count 0, `localeCompare` count ≥1 in `episodeVersionEditorUtils.ts`.
- `docker restart team4sv30-frontend` performed at the end; confirmed `http://192.168.235.196:3000/` returns `200` post-restart, so this plan's changes are live for the orchestrator's later live-UAT checklist.
- No `team4s_v2` writes — this plan touched only frontend TypeScript/TSX files.

## Next Phase Readiness
- 164-13 (the remaining gap-closure plan, GAP-12 and the wave-3 admin-frontend consumption of `GET /api/v1/admin/episode-classification-options`) is unblocked and can proceed independently.
- **Known follow-up for 164-13 (unchanged from 164-10's own note, narrowed by this plan's fix):** five `PublicGroupedEpisode` object-literal fixtures still lack `filler_type_label`/`episode_type_label` for `tsc --noEmit` purposes only (no runtime impact): `frontend/src/app/dev/episode-windowing-preview/page.tsx`, `FansubVersionBrowser.filterSwitch.test.tsx`, `FansubVersionBrowser.groupSwitch.test.tsx` (7 sites), `FansubVersionBrowser.windowing.test.tsx`, `useWindowedEpisodePages.test.ts`. `FansubVersionBrowser.test.tsx` itself was already fixed in this plan (Deviation #2) since its own tests broke at runtime.
- A live human UAT re-check of GAP-02/GAP-03/GAP-11 (release name, tech-line omission, and classification/type labels on `/anime/4`, Naruto) is still required before this closes the loop with the 2026-09-18 UAT report — this plan only proves the automated frontend portion, per the operational constraints for this run ("Do not mark anything as human-accepted").

---
*Phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll*
*Completed: 2026-09-18*

## Self-Check: PASSED

All 7 created/modified files listed above verified present on disk; both task-commit hashes (`8fea05de`, `78a0a5cc`) verified present in `git log`.
