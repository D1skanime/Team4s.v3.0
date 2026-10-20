---
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
plan: 06
subsystem: ui
tags: [typescript, react, nextjs, permissions, fansub-groups, project-notes]

# Dependency graph
requires:
  - phase: 189-04
    provides: "can_edit_project_notes backend capability field (app_auth_capabilities.go) and requireAnimeProjectNoteWriteAccess server-side guard, which this plan's frontend wiring consumes"
provides:
  - "frontend/src/types/fansub-capabilities.ts / fansub-public-profile.ts / fansub-invitations.ts / fansub-contributions.ts -- fansub.ts split into four thematic files via barrel re-export (415 lines, was 764), unblocking any future content edit to the FansubGroupCapabilities/Merge-type regions"
  - "FansubEditClient.tsx's canEditProjectNotes now reflects the real project-scoped write permission (capabilities.can_edit_project_notes), not the notes-tab-visibility capability it incorrectly reused before"
  - "AnimeProjectNoteWorkspace.tsx's own per-(anime,group) capability fetch, exact mirror of AnimeProjectTimelineSection.tsx, with safe fallback to the canEdit prop on fetch failure"
affects: [189-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fansub.ts barrel re-export split (export * from './fansub-capabilities' etc.), same convention as admin.ts's existing admin-*.ts split -- zero import-site changes needed anywhere in the repo"
    - "Component-owned per-project capability override (projectCanEdit ?? canEdit), now used by both AnimeProjectTimelineSection.tsx and AnimeProjectNoteWorkspace.tsx"

key-files:
  created:
    - frontend/src/types/fansub-capabilities.ts
    - frontend/src/types/fansub-public-profile.ts
    - frontend/src/types/fansub-invitations.ts
    - frontend/src/types/fansub-contributions.ts
  modified:
    - frontend/src/types/fansub.ts
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEditAccessGate.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts

key-decisions:
  - "Split fansub.ts into four thematic files (capabilities, public-profile, invitations, contributions) rather than one, because extracting only the mandated capabilities block (36 lines) left the file at ~728 lines, still over the 450-line limit -- three additional, clearly cohesive, phase-unrelated blocks were extracted to close the gap (final: 415 lines)"
  - "Used the exact barrel re-export convention already established by admin.ts/admin-*.ts (export * from './fansub-capabilities' inside fansub.ts) instead of updating every import site -- zero of the ~20 existing @/types/fansub import sites needed to change"
  - "D-08: canEditProjectNotes fallback mirrors canEditProjectTimeline's existing line exactly (isPlatformAdmin || Boolean(capabilities?.can_edit_project_notes)); tab visibility (can_edit_notes via canUseMainTab) left completely untouched, confirmed via grep both before and after"

patterns-established:
  - "Second component (AnimeProjectNoteWorkspace) now follows the same own-fetch-with-fallback pattern as AnimeProjectTimelineSection -- confirms this is becoming the standard shape for any per-project capability override in the fansub-edit workspace"

requirements-completed: [D-08]

# Metrics
duration: ~30min
completed: 2026-10-20
---

# Phase 189 Plan 06: fansub.ts-Split & Projektnotizen-Frontend-Capability Summary

**fansub.ts in vier Themendateien aufgeteilt (764→415 Zeilen) und `AnimeProjectNoteWorkspace`/`FansubEditClient` auf die neue, projektbezogene `can_edit_project_notes`-Capability umgestellt, statt der fälschlich wiederverwendeten Notizen-Tab-Sichtbarkeits-Capability.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-10-20T14:03:00Z (approx., after 189-05 completion)
- **Completed:** 2026-10-20T14:24:18Z
- **Tasks:** 2
- **Files modified:** 16 (4 created, 12 modified)

## Accomplishments
- `frontend/src/types/fansub.ts` split into `fansub.ts` (415 lines, barrel) + `fansub-capabilities.ts` (35 lines) + `fansub-public-profile.ts` (83 lines) + `fansub-invitations.ts` (53 lines) + `fansub-contributions.ts` (186 lines) — zero behavior change, zero broken imports (all ~20 existing `@/types/fansub` import sites still resolve via the barrel).
- `FansubEditClient.tsx`'s real, previously-undetected symmetric bug (RESEARCH.md finding) is fixed: `canEditProjectNotes` now reads `capabilities?.can_edit_project_notes` instead of conflating it with the group-wide notes-tab-visibility check (`canUseMainTab("notes", ...)`).
- `AnimeProjectNoteWorkspace.tsx` gained its own per-(anime,group) capability fetch (`getFansubGroupCapabilities(fansubId, undefined, { animeId })`), exact mirror of `AnimeProjectTimelineSection.tsx`, with `projectCanEdit ?? canEdit` fallback so a fetch failure never blocks the already-working note display.
- `can_edit_project_notes: boolean` added to `FansubGroupCapabilities` in `fansub-capabilities.ts`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure-refactor split of fansub.ts (no behavior change)** - `0d0f62f6e` (refactor)
2. **Task 2: can_edit_project_notes field + FansubEditClient fix + AnimeProjectNoteWorkspace own-fetch** - `d4f0b2e97` (feat)

## Files Created/Modified
- `frontend/src/types/fansub-capabilities.ts` - `FansubGroupCapabilities`/`FansubGroupCapabilitiesResponse`, moved verbatim + new `can_edit_project_notes` field
- `frontend/src/types/fansub-public-profile.ts` - `PublicFansubStory`/`PublicFansubProject`/`FansubProjectNavigationEntry`/`FansubProjectResolution(Response)`/`PublicFansubHistory`/`PublicFansubMediaItem`/`PublicFansubProfile(Response)`, moved verbatim
- `frontend/src/types/fansub-invitations.ts` - `FansubGroupInvitation` and its 6 request/response/accept siblings, moved verbatim
- `frontend/src/types/fansub-contributions.ts` - `HistFansubGroupMember`/`HistGroupMemberRole`/`AnimeContribution`/`UnifiedGroupMember`/`DefaultCrewEntry`/`EffectiveContribution*`/`ReplaceReleaseCrew*`, moved verbatim
- `frontend/src/types/fansub.ts` - now a barrel (4x `export * from`) plus the remaining, still-cohesive core group/member/alias/invitation-role/media/admin-release/merge types (415 lines; Merge types intentionally left in place for Plan 189-07)
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx` - `canEditProjectNotes` fix; removed now-unused `canUseMainTab` import
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.tsx` - own capability fetch, `effectiveCanEdit`, 3 usage sites switched from `canEdit` to `effectiveCanEdit`
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.test.tsx` - 5 pre-existing tests preserved unchanged (behavior), 3 new tests added for the override/fallback contract
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEditAccessGate.tsx` - static `PLATFORM_ADMIN_CAPABILITIES` fallback object extended with the new required field
- 6 other test fixture files (`AnimeProjectTimelineSection.test.tsx`, `ContributionsReviewSection.test.tsx`, `FansubBasicInfoTab.test.tsx`, `FansubDetailsTab.test.tsx`, `GroupMediaReviewSection.test.tsx`, `ReleaseVersionMediaReviewSection.test.tsx`, `fansubEditAccess.test.ts`) - added the new required `can_edit_project_notes` field to their literal `FansubGroupCapabilities` fixtures (TypeScript compile requirement, no assertion logic changed)

## Decisions Made
No new product decisions — D-08 was already locked in `189-CONTEXT.md`/`189-RESEARCH.md` prior to this plan. The only execution-time judgment call was *which* additional cohesive blocks to extract from `fansub.ts` beyond the mandated capabilities block, since that alone (36 lines) did not get the file under 450 lines — chosen blocks (public-profile, invitations, historical-members/contributions) were selected as genuinely separate domains already delimited by existing `// ---` section comments in the source file, matching the `admin-*.ts` split precedent's granularity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Initial `Write` of `AnimeProjectNoteWorkspace.test.tsx` destroyed 5 pre-existing tests**
- **Found during:** Task 2, immediately after running the targeted test suite and reviewing `git status`/`git diff` before committing
- **Issue:** `AnimeProjectNoteWorkspace.test.tsx` already existed in git history with 5 tests covering the missing-note, read-only, save, and delete flows. The `Write` tool call that added the 3 new override/fallback tests overwrote the entire file instead of appending to it, silently deleting the 5 existing tests.
- **Fix:** Restored the 5 original tests verbatim (via `git show HEAD:...`), added a default `getFansubGroupCapabilitiesMock.mockRejectedValue(...)` in a new `beforeEach` so the component's new, additional capability fetch does not interfere with the untouched existing assertions (which all exercise the `canEdit` prop fallback path), then appended the 3 new tests after them.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.test.tsx`
- **Verification:** `npx vitest run AnimeProjectNoteWorkspace` → 8/8 tests pass (5 original + 3 new); `npx tsc --noEmit` clean.
- **Committed in:** `d4f0b2e97` (Task 2's commit — caught before any commit was made, so no separate fix commit was needed)

---

**Total deviations:** 1 auto-fixed (Rule 1, caught and corrected before commit — no bad state ever reached git history)
**Impact on plan:** None on scope; this was a self-caught execution mistake, not a plan gap. No production/handler code affected.

## Issues Encountered
A full-suite run inside `team4sv30-frontend` showed one flaky failure in `src/app/admin/users/tabs/ReviewDelegationSection.test.tsx` (an unrelated `admin/users` review-delegation toggle test, timing out waiting for an `alert` role under full-suite parallel load). Re-ran in isolation (`npm test -- ReviewDelegationSection`) — passed cleanly (2/2). Confirmed unrelated to this plan's files (not in `files_modified`, no shared imports with `fansub*`/`AnimeProjectNoteWorkspace`/`FansubEditClient`). Not fixed, since it is out of this plan's scope and not reproducible outside the overloaded full-suite run.

## User Setup Required
None - no external service configuration required.

## Verification

- `npx tsc --noEmit` clean (run after each task).
- `npx vitest run AnimeProjectNoteWorkspace AnimeProjectTimelineSection` → 11/11 pass (8 + 3).
- Full frontend suite, `docker exec team4sv30-frontend npm test --`: 396/397 test files pass both before and after Task 2 (1 pre-existing flaky, unrelated test noted above; confirmed passing in isolation).
- `grep -n "canUseMainTab(\"notes\"" FansubEditClient.tsx` → 0 matches (fully replaced).
- `grep -n "can_edit_founding_history\|can_edit_notes" fansubEditAccess.ts` → byte-identical to before this plan (tab-visibility logic untouched).
- `wc -l frontend/src/types/fansub.ts` → 415 (≤450).
- `grep -n "canEditProjectNotes\|canEdit=" AnimeProjectReleaseCard.tsx` → confirms the prop threading into `AnimeProjectNoteWorkspace`'s `canEdit` prop is unchanged, as the plan's `<interfaces>` section specified.

## Next Phase Readiness
D-08 is fully closed end-to-end (backend from 189-04, frontend from this plan). `fansub.ts`'s mandatory split has landed as its own commit, as required by Plan 189-07 (D-11 frontend Merge-type removal), which depends on this split being in place before it touches the same file to delete the now-isolated `MergeFansubsRequest`/`Result`/`Response`/`PreviewConflicts`/`PreviewResult`/`PreviewResponse` block (still present, untouched, in `fansub.ts` per this plan's explicit scope boundary).

## Self-Check: PASSED

All created/modified files confirmed present on disk; both task commit hashes (`0d0f62f6e`, `d4f0b2e97`) confirmed present in git history (see Self-Check section below for command output).

---
*Phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg*
*Completed: 2026-10-20*
