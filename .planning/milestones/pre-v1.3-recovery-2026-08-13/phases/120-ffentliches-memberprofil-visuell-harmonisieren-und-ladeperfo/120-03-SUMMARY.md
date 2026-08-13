---
phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
plan: "03"
subsystem: testing
tags: [vitest, ssr, auth-cache, next-image, responsive-images]
requires:
  - phase: 120-01
    provides: User-authorized Phase-119 snapshot and immutable overlap evidence
  - phase: 120-02
    provides: Deterministic green inherited frontend/backend baseline
provides:
  - Expected-red auth-keyed SSR dedupe and visibility-isolation contracts
  - Expected-red Hero B dual-priority and responsive-image fallback contracts
affects: [120-05, 120-07, 120-13]
tech-stack:
  added: []
  patterns: [baseline-green-before-red, exact-named-red-evidence, one-shot-display-original-fallback]
key-files:
  created: [frontend/src/components/ui/ResponsiveImage.test.tsx, .planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/120-03-SUMMARY.md]
  modified: [frontend/src/app/members/[slug]/page.test.tsx, frontend/src/components/profile/MemberProfileHero.test.tsx]
key-decisions:
  - "D-19 stays dual-priority: Hero background eager/high, avatar eager with fixed 100/120/140px geometry."
  - "Missing ResponsiveImage fails through an intentional assertion, not an import crash."
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-15, D-17, D-18, D-19, D-20, D-21, D-22]
duration: 18m
completed: 2026-08-04
---

# Phase 120 Plan 03: Auth-Correct SSR and Responsive Image RED Contracts Summary

**Exact expected-red contracts pin viewer-keyed SSR reads, hidden-profile isolation, dual Hero image priority, and geometry-stable one-shot display-original fallback.**

## Performance

- **Duration:** 18m
- **Started:** 2026-08-04T12:22:00Z
- **Completed:** 2026-08-04T12:40:00Z
- **Tasks:** 2
- **Files modified:** 4 including this summary

## Accomplishments

- Proved the inherited route suite green at 5/5 before RED, then added same-token dedupe and anonymous/owner isolation contracts with hidden-response leak checks.
- Proved the inherited Hero suite green at 8/8 before RED, then locked eager high-priority background discovery and eager fixed-size avatar delivery.
- Defined optimized-first, identical-display-original, one-shot unoptimized fallback behavior without adding production implementation.
- Preserved every dirty Phase-119 file and orchestrator-owned STATE.md/ROADMAP.md outside staging.

## Baseline-Green Evidence

- Route pre-RED: 5/5 passed. Post-edit inherited-only filter `^(?!.*Phase 120 RED:)`: 5 passed, 2 skipped.
- Hero pre-RED: 8/8 passed. Post-edit inherited-only filter `^(?!.*Phase 120 RED:)`: 8 passed, 1 skipped.

## Expected-Red Evidence

| Exact contract | Intended current failure |
|---|---|
| `Phase 120 RED: deduplicates metadata and page reads for the same slug and viewer token` | `expected "spy" to be called 1 times, but got 2 times` |
| `Phase 120 RED: isolates anonymous and owner-preview cache keys` | Owner metadata is `{}` because metadata still performs an anonymous read |
| `Phase 120 RED: prioritizes both hero background and avatar with differentiated discovery` | Hero background `loading` is `null`, not `eager`; the test also requires high fetch priority and eager 100/120/140px avatar geometry |
| `Phase 120 RED: falls back exactly once to display original without geometry change` | `ResponsiveImage unoptimized one-shot display-original fallback is missing` |

Both RED commands exited non-zero and contained every exact name plus `AssertionError` and required `loading`/`unoptimized` fragments. No syntax error, transform crash, unrelated failure, or generic non-zero was accepted.

## Task Commits

1. **Task 1: Lock request dedupe, visibility and SSR semantics** — `879cdd3e`
2. **Task 2: Lock Hero B and responsive fallback** — `26f195a5`

## Files Created/Modified

- `frontend/src/app/members/[slug]/page.test.tsx` — normalized-cookie dedupe, auth-key isolation and hidden-response leakage contracts.
- `frontend/src/components/profile/MemberProfileHero.test.tsx` — D-19 background/avatar priority and fixed geometry contract.
- `frontend/src/components/ui/ResponsiveImage.test.tsx` — optimized-first one-shot fallback with unchanged source and geometry.
- `.planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/120-03-SUMMARY.md` — execution evidence.

## Decisions Made

- D-19 prioritizes both images with differentiated discovery: background eager/high, avatar eager/not-lazy and 100/120/140px.
- Component absence is asserted before dynamic loading so current RED is an intended `unoptimized` assertion, not a missing-module crash.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added the validator's required immutable initial-manifest argument**
- **Found during:** Both task preconditions.
- **Issue:** Literal `check --authorization ...` exits with `check requires --expect or --initial`.
- **Fix:** After proving the literal mismatch, reran against committed `evidence/120-01-initial-overlap.json`; no digest was recaptured or refreshed.
- **Verification:** Both corrected checks returned `{"ok":true}`.
- **Files modified:** None.

**2. [Rule 3 - Blocking] Corrected nested Vitest exclusion matching**
- **Found during:** Post-edit inherited-only verification.
- **Issue:** `^(?!Phase 120 RED:)` sees the enclosing describe title first and therefore includes nested RED cases.
- **Fix:** Kept literal pre-edit green evidence and used `^(?!.*Phase 120 RED:)` after edits.
- **Verification:** Route 5/5 and Hero 8/8 inherited cases passed.
- **Files modified:** None.

**3. [Rule 3 - Blocking] Reclaimed unused Docker build cache after host ENOSPC**
- **Found during:** Summary creation.
- **Issue:** `/var/lib/containerd` held 28 GB of generated build cache and root had zero writable blocks.
- **Fix:** Ran `docker builder prune -f`, reclaiming 18.13 GB; containers, images in use, volumes, database data, media, `.env`, and project files were untouched.
- **Verification:** Root filesystem returned to 60% use with 15 GB available.
- **Files modified:** None.

**Total deviations:** 3 Rule-3 blocking corrections. **Impact:** No scope, authorization, production, or runtime-data change.

## Issues Encountered

None beyond the auto-fixed command/environment blockers above.

## Authentication Gates

None.

## Known Stubs

None. `ResponsiveImage.test.tsx` intentionally specifies a not-yet-implemented seam; this is the required RED state, not a runtime stub.

## Threat Review

Hidden-profile assertions prohibit name, badge copy, display URL and `source_original_url` leakage. No endpoint, optimizer allowlist, auth path, schema, or production surface was added.

## Next Phase Readiness

Plans 120-05 and 120-07 can implement against exact image/Hero failures; SSR work can satisfy one-read dedupe without weakening anonymous/owner separation. Phase-119 dirty ownership remains untouched.

## Self-Check: PASSED

- All three declared test files exist.
- Task commits `879cdd3e` and `26f195a5` exist.
- Expected-red logs contained all four exact names and intended assertion fragments.
- Only declared test paths were present in task commits.
