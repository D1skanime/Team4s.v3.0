---
phase: quick-260812-bqs
plan: 01
subsystem: frontend-profile-achievements
tags: [react, css-modules, accessibility, responsive, tdd]
status: complete
requires: [quick-260811-lck]
provides: [neutral-locked-achievement-hero]
affects: [public-member-profile]
tech-stack:
  added: []
  patterns: [shared LockedStageArtwork hero variant, neutral locked-state presentation]
key-files:
  created: []
  modified:
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
key-decisions:
  - Completely unearned points, contribution, and membership heroes reuse the existing LockedStageArtwork seam.
  - Future tier labels remain factual but use muted styling while locked; future artwork and palette stay absent.
metrics:
  tasks: 3
  completed: 2026-08-12
---

# Quick 260812-bqs: Gesperrte Auszeichnungs-Heroes Summary

A shared responsive mystery medal now gives all completely unearned profile heroes a deliberate neutral state without revealing future badge artwork or color palettes.

## Tasks Completed

1. Added focused RED tests for five fully unearned hero instances, SSR secrecy, accessible copy, and compact-lock geometry preservation.
2. Extended `LockedStageArtwork` with an explicit hero variant containing a prominent question mark, subordinate lock, and visible `Noch nicht freigeschaltet` copy.
3. Applied the variant only to zero-points, fully unearned contribution families, and fully unearned membership; received explicit user approval after live Sheppert inspection.

## Verification

- Focused Quick tests: 3 passed.
- Scoped ESLint for component and test: passed.
- `git diff --check`: passed.
- Live Sheppert DOM audit: 3 applicable locked heroes, exact copy present, 0 locked hero images/artwork nodes, and no horizontal overflow at the successful 1265 px viewport.
- Responsive screenshots at 390/768/1024/1440/1920 could not be captured because the shared in-app browser timed out. Exact failures are recorded in `evidence/uat/MANIFEST.md`; no substitute images were fabricated.
- User approval: exact standalone `approved` received on 2026-08-12.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test accuracy] Scoped SSR secrecy assertion to actual artwork leakage**
- **Found during:** Task 2
- **Issue:** The initial RED assertion rejected factual tier words such as Bronze and Gold anywhere in SSR, conflicting with the locked compact tier labels that the scope explicitly preserves.
- **Fix:** Kept assertions against image URLs, achievement-art nodes, motif/frame artwork, and Hero-specific palette classes while allowing factual tier copy.
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- **Commit:** `04c8258d`

## Existing Issues Outside Scope

- The full component suite has five failures caused by incoming/predecessor profile changes captured before this Quick.
- Global typecheck has pre-existing Next page-prop errors and one unrelated unstaged test typing error.
- `STATE.md` already contains unrelated unstaged work. Its Quick completion table was not modified because an isolated safe state edit could not be guaranteed.

## Known Stubs

None.

## Threat Flags

None. No network, authentication, file-access, schema, API, or persistence surface was introduced.

## Commits

- `a3047881` — test(quick-260812-bqs-01): lock mystery hero contract
- `04c8258d` — feat(quick-260812-bqs-01): add neutral mystery heroes

## Self-Check: PASSED

All three scoped files exist, both task commits exist, UAT approval is recorded, and the implementation contains no placeholder data flow or future-art asset reference.