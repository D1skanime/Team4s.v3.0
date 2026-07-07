---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "02"
subsystem: public-member-profile
tags: [nextjs, public-profile, fansub-member, ui]
requires:
  - "99-01 additive public member profile DTO fields"
provides:
  - "Top public member profile single-scroll shell"
  - "Current project cards from PublicMemberProfileData.current_projects"
  - "Public badge chain with earned/locked progress"
affects: [public-member-profile-route, profile-components]
tech-stack:
  added: []
  patterns:
    - "Public member page consumes additive profile DTO fields without calling the old contributions timeline endpoint"
    - "Group membership cards stay on the existing MembershipsSection seam"
key-files:
  created:
    - "frontend/src/components/profile/MemberCurrentProjectsSection.tsx"
    - "frontend/src/components/profile/MemberCurrentProjectsSection.module.css"
    - "frontend/src/components/profile/MemberBadgeChain.tsx"
    - "frontend/src/components/profile/MemberBadgeChain.module.css"
  modified:
    - "frontend/src/app/members/[slug]/page.tsx"
    - "frontend/src/app/members/[slug]/page.module.css"
    - "frontend/src/app/members/[slug]/page.test.tsx"
    - "frontend/src/components/profile/MemberProfileHero.tsx"
    - "frontend/src/components/profile/MembershipsSection.tsx"
    - "frontend/src/components/profile/MembershipsSection.test.tsx"
    - "frontend/src/components/profile/MemberBadgeChain.test.tsx"
    - "frontend/src/components/profile/memberBadgeLabels.ts"
key-decisions:
  - "Wave 2 route tests assert only the top shell; full seven-section order remains for Plan 99-03."
  - "Public current projects link to the existing public anime/group route `/anime/{anime_id}/group/{fansub_group_id}`."
metrics:
  duration: 35min
  tasks: 3
  files: 12
completed: 2026-07-07T17:45:10Z
---

# Phase 99 Plan 02: Public Member Profile Top Sections Summary

Single-scroll top profile shell for public Fansub member profiles with real hero, group membership, current project, and badge-chain data.

## Accomplishments

- Removed the public route dependency on the old tab navigation, contributions endpoint fetch, contribution filters, and role timeline.
- Wired the public route to the first four locked sections: Hero, Gruppenzugehörigkeit, Aktuelle Projekte, Auszeichnungen.
- Kept hidden-profile owner preview, own-profile edit link, correction modal, metadata noindex behavior, and optional server-side owner token behavior intact.
- Updated the hero so public “Schwerpunkte” derive from `current_projects` roles instead of the old role timeline and public profiles no longer show a filler bio line.
- Extended `MembershipsSection` with an optional title and member-since/period display while preserving its existing public group-card links.
- Added `MemberCurrentProjectsSection` for real DTO-backed project cards with cover, anime/group link, roles, release-version chips, and project-level marker only when `is_project_level` is true.
- Added `MemberBadgeChain` with horizontal earned/locked badge rendering, `x von y` progress, and no invented tier field.

## Files Changed

- `frontend/src/app/members/[slug]/page.tsx`
- `frontend/src/app/members/[slug]/page.module.css`
- `frontend/src/app/members/[slug]/page.test.tsx`
- `frontend/src/components/profile/MemberProfileHero.tsx`
- `frontend/src/components/profile/MembershipsSection.tsx`
- `frontend/src/components/profile/MembershipsSection.test.tsx`
- `frontend/src/components/profile/MemberCurrentProjectsSection.tsx`
- `frontend/src/components/profile/MemberCurrentProjectsSection.module.css`
- `frontend/src/components/profile/MemberBadgeChain.tsx`
- `frontend/src/components/profile/MemberBadgeChain.module.css`
- `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- `frontend/src/components/profile/memberBadgeLabels.ts`

## Verification

- `cd frontend; npm run test -- src/app/members/[slug]/page.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/profile/MembershipsSection.test.tsx` - passed.
- `cd frontend; npm run typecheck` - passed.
- `git diff --check -- [Plan 99-02 touched files]` - passed with Git CRLF warnings only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Staged the Wave 2 route test away from Plan 99-03 lower sections**
- **Found during:** Task 1
- **Issue:** The existing route test asserted the full seven-section D-01 order, including lower sections intentionally reserved for Plan 99-03.
- **Fix:** Narrowed the route test to Hero, Gruppenzugehörigkeit, Aktuelle Projekte, and Auszeichnungen, and asserted the lower Plan 99-03 headings are absent in Wave 2.
- **Files modified:** `frontend/src/app/members/[slug]/page.test.tsx`

**2. [Rule 3 - Blocking] Aligned membership test with current shared role label**
- **Found during:** Task 2 verification
- **Issue:** `MembershipsSection.test.tsx` expected `Fansub-Lead`, but the existing shared `formatGroupRoleLabel` seam renders `Gruppenleitung`.
- **Fix:** Updated the adjacent test to assert the current shared label and the new member-since line.
- **Files modified:** `frontend/src/components/profile/MembershipsSection.test.tsx`

### Workflow Deviations

- `.planning/STATE.md`, `.planning/ROADMAP.md`, and requirements metadata were not updated because `.planning/STATE.md` was dirty before execution and the user requested committing only Plan 99-02 changes.

## Known Stubs

None. Empty states are scoped UI states for absent public DTO arrays; no placeholder production cards or mock production data were added.

## Threat Flags

None. This plan introduces no backend endpoint, contract change, auth helper, upload flow, media ownership path, schema change, or new trust boundary.

## Self-Check: PASSED

- All created Plan 99-02 component and style files exist on disk.
- Focused route, badge-chain, and membership tests pass.
- Frontend typecheck passes.
- Scoped diff whitespace check passes.
