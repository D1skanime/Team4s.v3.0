---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
plan: 01
subsystem: ui
tags: [nextjs, react, vitest, routing, return_to, allowlist]

# Dependency graph
requires:
  - phase: 181-CONTEXT (Neustart D-01..D-05)
    provides: binding decisions that the one surviving editing surface is
      /admin/episode-versions/[versionId]/edit, and that the 5 workspace
      entry points must retarget there with matching return_to values
provides:
  - "getSafeReturnPath() in EpisodeVersionEditorPage.tsx accepts exact
     /me/dashboard and /me/contributions in addition to its two existing
     regex-based accepted origins"
  - "All 5 former /me/releases/[id]/workspace entry points now build
     /admin/episode-versions/{id}/edit hrefs with an appropriate return_to"
affects: [181-02 (workspace redirect + code removal)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exact-pathname allowlist checks (=== comparison) alongside existing
       regex checks in a fail-closed return_to validator — no wildcard/prefix
       matching introduced"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx
    - frontend/src/app/me/dashboard/components/attentionHelpers.ts
    - frontend/src/app/me/dashboard/components/attentionHelpers.test.ts
    - frontend/src/app/me/dashboard/components/AttentionSection.tsx
    - frontend/src/app/me/dashboard/components/AttentionSection.test.tsx
    - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx
    - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx
    - frontend/src/components/contributions/ContributionCard.tsx
    - frontend/src/components/contributions/ContributionCard.test.tsx
    - frontend/src/components/contributions/AnimeGroupCard.tsx
    - frontend/src/components/contributions/AnimeGroupCard.test.tsx

key-decisions:
  - "Used the editor's German tab vocabulary (segmente, notizen) for the two
     dashboard links that previously carried a tab param, per the plan's
     interfaces block — not the retired English workspace vocabulary"
  - "Kept the project-page link tab-less (as it was before) and the two
     contributions-page links tab-less (as they were before) — only the
     project-page link's return_to was pre-existing; the two
     contributions-page links newly gained return_to=/me/contributions"

requirements-completed: [D-01, D-02, D-04]

# Metrics
duration: ~12min
completed: 2026-10-14
---

# Phase 181 Plan 01: Retarget workspace links to the episode-version editor Summary

**All 5 frontend entry points that pointed at the retired `/me/releases/[id]/workspace` route now open `/admin/episode-versions/[versionId]/edit` instead, each carrying a `return_to` back to its origin, and the editor's `getSafeReturnPath` allowlist fail-closed-accepts the two new origins (`/me/dashboard`, `/me/contributions`).**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-10-14T10:05:00Z (approx.)
- **Completed:** 2026-10-14T10:16:38Z
- **Tasks:** 3 completed
- **Files modified:** 12

## Accomplishments
- `getSafeReturnPath()` in `EpisodeVersionEditorPage.tsx` now accepts exact `/me/dashboard` and `/me/contributions` paths alongside its two existing regex-matched origins, remaining fail-closed for everything else (3 new tests: 2 acceptance, 1 rejection)
- Both dashboard-originated links (new-assignment card via `resolveWorkspaceHref()`, rejected-note-revision link in `AttentionSection.tsx`) now build `/admin/episode-versions/{id}/edit` hrefs with the editor's German tab vocabulary (`segmente`, `notizen`) and `return_to=%2Fme%2Fdashboard`
- The project-page "Notizen & Medien" link, and both contributions-page "Arbeitsfläche öffnen" links (`ContributionCard.tsx`, `AnimeGroupCard.tsx`), now build `/admin/episode-versions/{id}/edit` hrefs — the project-page link keeps its pre-existing project `return_to`, the two contributions-page links gain `return_to=%2Fme%2Fcontributions`
- Zero remaining dynamic `/me/releases/${...}/workspace` hrefs outside the workspace route's own internal directory (which Plan 02 removes next, per D-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend the editor's return_to allowlist with /me/dashboard and /me/contributions** - `5fcdec889` (feat)
2. **Task 2: Retarget the 2 dashboard-originated links (D-02)** - `c662ee868` (feat)
3. **Task 3: Retarget the project-page and contributions-page links (D-02, D-04)** - `7bbdb9b37` (feat)

**Plan metadata:** (final commit follows this summary)

## Files Created/Modified
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` - `getSafeReturnPath()` gains two exact-pathname checks (`isMemberDashboard`, `isMemberContributions`); no other line changed
- `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx` - 3 new tests for the extended allowlist (2 acceptance, 1 rejection)
- `frontend/src/app/me/dashboard/components/attentionHelpers.ts` - `resolveWorkspaceHref()`'s release-version branch now builds an editor href with `tab=segmente&return_to=%2Fme%2Fdashboard`
- `frontend/src/app/me/dashboard/components/attentionHelpers.test.ts` - updated 2 assertions to the new href shape
- `frontend/src/app/me/dashboard/components/AttentionSection.tsx` - rejected-own-note-revision link now builds an editor href with `tab=notizen&return_to=%2Fme%2Fdashboard`
- `frontend/src/app/me/dashboard/components/AttentionSection.test.tsx` - updated 4 assertions to the new href shape
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` - "Notizen & Medien" button now targets the editor route, keeping its existing `projectReturnHref`
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx` - updated 1 href assertion
- `frontend/src/components/contributions/ContributionCard.tsx` - "Arbeitsfläche öffnen" button now targets the editor route with `return_to=%2Fme%2Fcontributions`
- `frontend/src/components/contributions/ContributionCard.test.tsx` - updated 1 href assertion
- `frontend/src/components/contributions/AnimeGroupCard.tsx` - per-role-range "Arbeitsfläche öffnen" button now targets the editor route with `return_to=%2Fme%2Fcontributions`
- `frontend/src/components/contributions/AnimeGroupCard.test.tsx` - added 1 new href assertion test (none existed for this button before)

## Decisions Made
- Followed the plan's interfaces block exactly for tab-vocabulary translation (German `segmente`/`notizen`, not the retired English `segments`/`notes`)
- No deviations needed — the plan's exact old/new string values and line references matched the current codebase precisely

## Deviations from Plan

None - plan executed exactly as written. All `<action>` instructions, exact string replacements, and test-assertion updates in `181-01-PLAN.md` applied without requiring any auto-fix (Rules 1-4 not triggered).

## Issues Encountered

One verification nuance, not a code issue: the plan's documented final-verification grep (`grep -rn "me/releases/\$\{" frontend/src`) behaves unexpectedly under this host's `grep` binary, which is actually `ugrep` 7.5.0 — `ugrep` interprets `${` specially in a basic/extended regex context and silently fails to match the literal substring, making the command appear to return zero matches even when one does exist. Re-running with fixed-string mode (`grep -rFn 'me/releases/${' frontend/src`) correctly surfaces exactly one match: `frontend/src/app/me/releases/[versionId]/workspace/workspaceHelpers.ts:43`, inside the workspace route's own directory. This is the expected, documented exception from the plan's own verification text ("the only remaining literal `/me/releases/[versionId]/workspace` references left in the repo are the route's own directory, which Plan 02 removes next") — not a regression, not in this plan's `files_modified` scope, and no action was taken on it.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 5 former workspace entry points now point at the surviving editor, each retaining its original visibility condition (own confirmed `anime_contribution`), per D-04
- The editor's `getSafeReturnPath` allowlist is extended and fail-closed; `EpisodeVersionEditorPage.tsx`'s own markup/tabs/behavior are untouched (D-01/D-05 preserved — diff confirmed to touch only the allowlist function body)
- Plan 02 can now safely implement the permanent `/me/releases/[id]/workspace` → editor redirect (D-03) and remove the workspace page's own code, since `workspaceHelpers.ts` is the only remaining internal self-reference and lives entirely inside the directory Plan 02 will remove
- No blockers

## Self-Check: PASSED

All 13 files listed under "Files Created/Modified" confirmed present on disk. All 4 commit
hashes (`5fcdec889`, `c662ee868`, `7bbdb9b37`, `755b3c850`) confirmed present in `git log`.

---
*Phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-*
*Completed: 2026-10-14*
