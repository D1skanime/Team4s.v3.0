---
phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl
plan: 04
subsystem: ui
tags: [react, nextjs, typescript, vitest, fansub-admin, claim-invitations]

# Dependency graph
requires:
  - phase: 135 (prior plans)
    provides: useGroupMembersClaimActions hook, member_claim_invitations_handler.go backend, GroupMembersTab.tsx prop wiring
provides:
  - HistoricalMemberCard renders the claim-generate/copy/cancel UI for unlinked historical members
  - GroupMembersHistTable.test.tsx component coverage for the claim-invite render gate
  - In-code documentation that ClaimManagementPanel.tsx is an intentionally unmounted reference/future surface
affects: [135-05, 135-06, admin fansub group edit UI]

# Tech tracking
tech-stack:
  added: []
  patterns: [render-only wiring of already-tested hook state into a presentational card component]

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.test.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx

key-decisions:
  - "The generate/copy/cancel block is gated on canCreateClaimInvitation && !member.app_username, matching historicalMemberMeta's existing app_username check."
  - "The invite-link Input id uses the hist-claim-invite-link- prefix (not ClaimManagementPanel's claim-invite-link-) to match useGroupMembersClaimActions.ts's markVisibleInviteLink DOM lookup."
  - "ClaimManagementPanel.tsx is kept, not deleted, despite having no mounted consumer -- documented in-code as retained for a possible future dedicated claims/requests/role-assignment admin view (135-RESEARCH.md Open Question 2)."

patterns-established:
  - "New CSS classes for this component follow the file's fansubEdit-prefixed naming convention (fansubEditClaimInviteLinkRow, fansubEditClaimPendingInviteRow) rather than importing ClaimManagementPanel.module.css."

requirements-completed: [D-05, D-07]

# Metrics
duration: 18min
completed: 2026-08-17
---

# Phase 135 Plan 04: Wire claim-invite UI into HistoricalMemberCard Summary

**HistoricalMemberCard now renders the previously-orphaned claim-invite generate/copy/cancel block by destructuring 8 already-declared-but-unused props, closing the "generate + display" gap for the claim flow that unlocks historical members.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-08-17T13:05:00Z
- **Completed:** 2026-08-17T13:23:00Z
- **Tasks:** 2
- **Files modified:** 4 (1 created)

## Accomplishments
- Admins viewing an unlinked historical member (no `app_username`) now see an "Einladungslink generieren" button; after generating, a copyable, read-only invite link renders inline on the card.
- Members already linked to an app account never show the claim UI (gate: `canCreateClaimInvitation && !member.app_username`).
- Admins can see an "Aktive Einladung bis ..." badge and cancel an already-active claim invitation for an unlinked member.
- `ClaimManagementPanel.tsx`'s intentional non-mount status is now documented in-code, resolving `135-RESEARCH.md` Open Question 2 (keep, do not delete).

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire the claim-invite UI into HistoricalMemberCard** - `38bc136f` (feat)
2. **Task 2: New component test + document ClaimManagementPanel.tsx's intentional non-mount** - `2ad3dcb2` (test)

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx` - `HistoricalMemberCard` now destructures the 8 claim-related props, computes `invite`/`inviteLink`/`activeInvitation`, and renders the gated generate/copy/cancel block using `Toolbar`, `Input`, `Badge`, `Button` from `@/components/ui`.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` - Added `.fansubEditClaimInviteLinkRow` and `.fansubEditClaimPendingInviteRow`, mirroring `ClaimManagementPanel.module.css`'s structure under this file's naming convention.
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.test.tsx` (new) - 4 Vitest/jsdom cases: generate button + callback for unlinked members, button absence for linked members, invite-link input + copy callback, pending-invitation badge + cancel callback.
- `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` - Added a header comment above the component export documenting its intentional non-mount status and the Phase 135 port of its claim UI into `HistoricalMemberCard`.

## Decisions Made
- Used the `hist-claim-invite-link-` id prefix per the plan's pitfall note, since `useGroupMembersClaimActions.ts`'s `markVisibleInviteLink` DOM fallback specifically looks up that prefix (not `ClaimManagementPanel`'s `claim-invite-link-`).
- Kept the new claim block inside a second `fansubEditMemberCompactBody`-classed `div` (mirroring the card's existing structure) rather than introducing a new wrapper class, per the plan's "render a new block after the existing body div" instruction.
- Retained `ClaimManagementPanel.tsx` and its existing `ClaimManagementPanel.test.tsx` unchanged (beyond the new header comment) rather than deleting either, per the plan's explicit "keep, do not delete" resolution.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Full-project `npx tsc --noEmit` surfaces several pre-existing Next.js App Router route-type errors in unrelated files (`admin/anime/[id]/edit/page.ts`, `admin/anime/create/page.ts`, `admin/anime/page.ts`, `fansubs/[slug]/page.ts`, `members/ranking/page.ts`). These are unrelated to this plan's two touched files and match the pattern already noted as pre-existing in Plan 135-01's summary; confirmed via targeted grep that neither `GroupMembersHistTable.tsx` nor `ClaimManagementPanel.tsx` appear in the error output.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The claim-invite generate/copy/cancel flow is now fully reachable end-to-end from the admin fansub group edit UI (backend, hook, and render all connected).
- Plans 135-05/06 (returnPath-carrying `beginKeycloakLogin` calls per Plan 135-01's shared foundation) are unaffected by this plan and remain ready to proceed independently.
- No blockers identified for subsequent Phase 135 plans.

---
*Phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl*
*Completed: 2026-08-17*
