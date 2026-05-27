---
phase: 53-rollenuebergreifendes-mein-profil-als-member-identity-hub
plan: "01"
subsystem: frontend-ui-api-contract
tags: [nextjs, react, profile, app-shell, openapi, auth-boundary]
requires:
  - phase: 47-member-profile-und-historical-identity
    provides: Existing own-profile runtime aggregate and profile mutation/avatar API.
  - phase: 48-meine-gruppen-und-contributor-dashboard
    provides: Contributor group roles, capability patterns, and Mein-Bereich navigation context.
  - phase: 52-profile-account-return-refresh-flow
    provides: Keycloak-return refresh and dirty-form preservation behavior.
provides:
  - Role-neutral `/me/profile` Member Identity Hub foundation.
  - Reusable authenticated `AppShell` first consumed by `/me/profile`.
  - `/admin/profile` transition wrapper without independent admin profile implementation.
  - OpenAPI documentation for own-profile read, update, and avatar upload runtime endpoints.
affects: [profile, member-identity-hub, frontend-navigation, openapi, auth-api-client]
tech-stack:
  added: []
  patterns:
    - Global reusable app shell with disabled future targets instead of fake routes.
    - Profile page orchestrator split into focused section components under `/me/profile/components`.
    - Profile-facing label helpers in `frontend/src/lib/profileLabels.ts`.
key-files:
  created:
    - frontend/src/components/layout/AppShell.tsx
    - frontend/src/components/layout/AppShell.module.css
    - frontend/src/components/layout/AppShell.test.tsx
    - frontend/src/app/me/profile/page.tsx
    - frontend/src/app/me/profile/page.module.css
    - frontend/src/app/me/profile/page.test.tsx
    - frontend/src/app/me/profile/components/*
    - frontend/src/lib/profileLabels.ts
  modified:
    - frontend/src/app/admin/profile/page.tsx
    - frontend/src/app/admin/profile/page.test.tsx
    - frontend/src/app/admin/page.tsx
    - frontend/src/app/admin/my-groups/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/lib/api.no-token-boundary.test.ts
    - shared/contracts/openapi.yaml
key-decisions:
  - "`/admin/profile` uses an internal transition wrapper around `/me/profile`, not a redirect and not a duplicate admin implementation."
  - "Future shell targets remain disabled with `bald` badges until real routes/contracts exist."
  - "`member_story` remains plain-text persistence in 53A while the UI keeps it structurally separate for the later TipTap contract."
  - "Public-profile preview and contribution detail actions stay disabled because no stable public slug/detail route contract exists."
patterns-established:
  - "Own-profile pages use token-free `useAuthSession()` plus central profile API helpers; no page-local bearer handling."
  - "Profile account data stays in `AccountSecurityCard`, isolated from public-profile-ready sections."
requirements-completed: [MEMBER-PROFILE-HUB-01]
duration: 19 min
completed: 2026-05-27
---

# Phase 53 Plan 01: Member Identity Hub Summary

**Role-neutral `/me/profile` Member Identity Hub with reusable authenticated shell, real profile data sections, and documented own-profile API contract**

## Performance

- **Duration:** 19 min
- **Started:** 2026-05-27T17:05:09Z
- **Completed:** 2026-05-27T17:24:15Z
- **Tasks:** 6 completed
- **Files modified:** 25 code/contract files plus planning summary/deferred notes

## Accomplishments

- Added global `AppShell` with Public-Bereich, Verwaltung, Mein Bereich, Einstellungen, user footer, disabled future destinations, and a non-admin path to `Mein Profil`.
- Moved the own-profile implementation to `/me/profile`; `/admin/profile` is now only an internal transition wrapper.
- Rebuilt the profile surface as a GDS-based hub: hero, basis data, story, avatar, visibility, account/security, memberships, and contribution summary.
- Kept Team4s-owned editable fields separate from read-only Keycloak account data and preserved the Phase 52 dirty-form refresh behavior.
- Added profile-facing label helpers so platform/group/status/visibility codes are rendered as German labels.
- Documented `GET /api/v1/me/profile`, `PUT /api/v1/me/profile`, and `POST /api/v1/me/profile/avatar` in `shared/contracts/openapi.yaml`.

## Task Commits

1. **Task 0: Reusable authenticated app shell** - `182d6055` (`feat`)
2. **Tasks 1-4: Route transition, hub recomposition, semantic controls, roles/memberships/contributions** - `a056903f` (`feat`)
3. **Task 5: Own-profile API contract alignment** - `04c4b3f5` (`docs`)
4. **Follow-up fix: stale import from link migration** - `809c5b4d` (`fix`)
5. **CSS ownership cleanup** - `dff32c99` (`refactor`, intentional deletion of obsolete `frontend/src/app/admin/profile/page.module.css`)

## Files Created/Modified

- `frontend/src/components/layout/AppShell.tsx` - reusable authenticated shell/navigation seam.
- `frontend/src/app/me/profile/page.tsx` - role-neutral own-profile client orchestrator.
- `frontend/src/app/me/profile/components/*` - focused hub sections for hero, basics, story, avatar, visibility, account, memberships, and contributions.
- `frontend/src/app/admin/profile/page.tsx` - thin transition wrapper around `/me/profile`.
- `frontend/src/lib/profileLabels.ts` - German profile-facing label mappings.
- `shared/contracts/openapi.yaml` - own-profile API paths and schemas.

## Decisions Made

- `/admin/profile` remains import-wrapper based for testability and transition clarity.
- AppShell exposes future destinations as disabled `bald` items instead of fake links.
- Contribution detail and public-profile preview actions remain disabled until a stable route/slug/detail contract exists.
- `member_story` is visibly separate but still persisted as plain text in 53A.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed stale unused import after profile link migration**
- **Found during:** Overall lint check after Tasks 1-4
- **Issue:** Changing `admin/my-groups` profile actions from `/admin/profile` to `/me/profile` left `next/link` unused.
- **Fix:** Removed the stale import.
- **Files modified:** `frontend/src/app/admin/my-groups/page.tsx`
- **Verification:** Targeted eslint for changed profile/shell files passed.
- **Committed in:** `809c5b4d`

---

**Total deviations:** 1 auto-fixed (Rule 1 bug)
**Impact on plan:** No scope expansion; the fix was required to keep the changed files clean.

## Issues Encountered

- Full `npm run lint` still fails on existing out-of-scope files unrelated to 53-01. Details are recorded in `deferred-items.md`.
- Targeted lint for changed profile/shell files passed.

## Known Stubs

None that block the plan goal. Disabled `bald` shell destinations and disabled preview/contribution detail actions are intentional honest deferred states required by the plan because the corresponding routes/contracts do not exist yet.

## Threat Flags

None. This plan documented existing profile endpoints but did not add new backend endpoints, auth paths, database schema, or file-access behavior.

## Authentication Gates

None.

## Verification

- `npm run test -- --run "src/components/layout/AppShell.test.tsx"` - passed
- `npm run test -- --run "src/app/me/profile/page.test.tsx"` - passed
- `npm run test -- --run "src/app/admin/profile/page.test.tsx"` - passed
- `npm run test -- --run "src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx"` - passed
- `npm run test -- --run "src/lib/api.no-token-boundary.test.ts"` - passed
- `npm run typecheck` - passed
- `npx eslint "src/app/me/profile/page.tsx" "src/app/admin/profile/page.tsx" "src/app/admin/my-groups/page.tsx" "src/components/layout/AppShell.tsx" "src/lib/profileLabels.ts"` - passed
- `git diff --check` - passed
- `npm run lint` - failed on pre-existing out-of-scope files; see `deferred-items.md`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 53-02 hardening: avatar crop/source retention, richer visibility/month-year contracts, TipTap persistence, mobile shell hardening, and accessibility QA can build on the `/me/profile` route and shell foundation.

## Self-Check: PASSED

- Created files exist.
- Task commits exist in git history.
- Summary documents the intentional admin profile CSS deletion and out-of-scope lint failures.

---
*Phase: 53-rollenuebergreifendes-mein-profil-als-member-identity-hub*
*Completed: 2026-05-27*
