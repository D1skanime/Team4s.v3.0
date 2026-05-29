---
phase: 58-profil-hub-content-membership-cards-activity-preparation
plan: 03
subsystem: ui
tags: [app-shell, navigation, memberships, profile]

requires:
  - phase: 53-rollenuebergreifendes-mein-profil-als-member-identity-hub
    provides: memberships on the authenticated own-profile aggregate
provides:
  - AppShell can render dynamic member group links.
  - AppShellClientWrapper forwards memberships from getOwnProfile without a second request.
  - Static disabled "Meine Gruppen" drawer placeholder is removed.
affects: [member-navigation, app-shell, profile-hub]

tech-stack:
  added: []
  patterns: [token-free shell profile mapping, drawer membership links]

key-files:
  created: []
  modified:
    - frontend/src/components/layout/AppShell.tsx
    - frontend/src/components/layout/AppShellClientWrapper.tsx
    - frontend/src/components/layout/AppShell.test.tsx
    - frontend/src/components/layout/AppShellClientWrapper.test.tsx

key-decisions:
  - "Group links use the existing /admin/fansubs/[id]/edit route and rely on existing route/backend authorization."
  - "The shell reuses the existing getOwnProfile call rather than adding a membership-specific read."
  - "No Meine Gruppen section is rendered when memberships are empty."

patterns-established:
  - "AppShell receives optional membership DTOs and renders a separate dynamic drawer group."
  - "AppShellClientWrapper maps only shell-owned profile fields from the profile aggregate."

requirements-completed: [P58-SC1, P58-SC2, P58-SC3, P58-SC4, P58-SC5]

duration: 20min
completed: 2026-05-29
---

# Phase 58 Plan 03: Drawer Membership Navigation Summary

**The app drawer now shows real member group links from the existing own-profile aggregate.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-05-29T00:25:00Z
- **Completed:** 2026-05-29T00:45:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added an optional `memberships` prop to `AppShell`.
- Rendered dynamic "Meine Gruppen" links only when memberships exist.
- Extended `AppShellClientWrapper` to pass memberships from `getOwnProfile()` without another API call.

## Task Commits

No per-task commits were created in this inline Codex execution; changes remain in the working tree for phase-level review.

## Files Created/Modified

- `frontend/src/components/layout/AppShell.tsx` - Adds dynamic drawer membership rendering.
- `frontend/src/components/layout/AppShellClientWrapper.tsx` - Maps memberships from the own-profile response into shell props.
- `frontend/src/components/layout/AppShell.test.tsx` - Covers hidden empty groups and real group links.
- `frontend/src/components/layout/AppShellClientWrapper.test.tsx` - Covers membership forwarding and single API-call behavior.

## Decisions Made

- Drawer links point to `/admin/fansubs/${fansub_group_id}/edit`, the existing group edit route.
- The disabled "Meine Beiträge" future target remains unchanged because Phase 58 only makes group navigation real.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Membership cards are no longer needed on `/me/profile`; the drawer owns group navigation, and public-profile work can treat memberships separately without inheriting the old admin-style profile section.

---
*Phase: 58-profil-hub-content-membership-cards-activity-preparation*
*Completed: 2026-05-29*
