---
phase: 59-ffentliches-fansub-member-profil
plan: 04
subsystem: public-member-profile-frontend
tags: [nextjs, server-component, public-profile, api-helper]

requires:
  - phase: 59-02
    provides: GET /api/v1/members/:slug runtime endpoint
  - phase: 59-03
    provides: shared profile render components
provides:
  - /members/[slug] public member profile route
  - getMemberProfile(slug, authToken?) frontend API helper
affects: [phase-59-public-member-profile, member-profile, public-api]

tech-stack:
  added: []
  patterns:
    - Public member route is a Next.js Server Component
    - Optional SSR token forwarding uses cookies() and the central authorizedFetch authToken seam
    - Hidden members_only responses render a notice without profile data

key-files:
  created:
    - frontend/src/app/members/[slug]/page.tsx
    - frontend/src/app/members/[slug]/page.module.css
    - .planning/phases/59-ffentliches-fansub-member-profil/59-04-SUMMARY.md
  modified:
    - frontend/src/lib/api.ts

key-decisions:
  - "The server route reads AUTH_TOKEN_COOKIE_NAME first and falls back to access_token so it follows the existing Team4s cookie seam while satisfying the plan's access_token forwarding requirement."
  - "The public route resolves profile avatar URLs through resolveApiUrl before passing them to the shared MemberProfileHero, matching the established /me/profile avatar rendering pattern."

requirements-completed: [D-01, D-02, D-05, D-06, D-07, D-09, D-10, D-11, D-12, D-15, D-17]

duration: 15min
completed: 2026-05-29T12:39:41Z
---

# Phase 59 Plan 04: Public Member Profile Route Summary

**Next.js Server Component route for `/members/[slug]` backed by the public member profile API helper**

## Accomplishments

- Added `getMemberProfile(slug, authToken?)` to `frontend/src/lib/api.ts` using `authorizedFetch`, `cache: "no-store"`, URL-encoded slugs, and the existing `ApiError` payload handling.
- Added `/members/[slug]` as a Server Component with slug validation, optional token forwarding from cookies, 404 handling, hidden `members_only` handling, and profile rendering.
- Rendered public profiles with `MemberProfileHero`, `MembershipsSection`, `RecentMediaSection`, and `RecentContributionsSection` using `isPublicView={true}` where applicable.
- Added focused route CSS for page width, breadcrumb, notice box, and responsive section layout.

## Task Commits

No commits were created. The user explicitly requested uncommitted worktree changes for orchestrator integration.

## Files Created/Modified

- `frontend/src/lib/api.ts` - Adds `PublicMemberProfileResponse` import and `getMemberProfile`.
- `frontend/src/app/members/[slug]/page.tsx` - New public member profile Server Component.
- `frontend/src/app/members/[slug]/page.module.css` - New route-local layout and notice styles.
- `.planning/phases/59-ffentliches-fansub-member-profil/59-04-SUMMARY.md` - Execution summary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical functionality] Reused the canonical Team4s auth cookie constant before the literal fallback**
- **Found during:** Task 2
- **Issue:** The plan named `access_token`, while the current frontend auth seam stores the access token under `AUTH_TOKEN_COOKIE_NAME`.
- **Fix:** The Server Component reads `AUTH_TOKEN_COOKIE_NAME` first and falls back to `access_token`, then passes the value to `getMemberProfile(..., authToken)`.
- **Files modified:** `frontend/src/app/members/[slug]/page.tsx`
- **Verification:** Targeted grep confirmed `cookies()`, `AUTH_TOKEN_COOKIE_NAME`, `access_token`, and `getMemberProfile` are present.

**2. [Rule 2 - Critical functionality] Resolved avatar URLs before rendering shared hero**
- **Found during:** Task 2
- **Issue:** The shared `MemberProfileHero` expects a renderable avatar URL; `/me/profile` already resolves backend-relative media URLs through `resolveApiUrl`.
- **Fix:** The public route mirrors that pattern and passes `resolveApiUrl(profile.avatar?.public_url || '')`.
- **Files modified:** `frontend/src/app/members/[slug]/page.tsx`
- **Verification:** `npm run typecheck` and `npm run build` passed.

## Known Stubs

None blocking the plan goal. The nullable local variables in `page.tsx` are render-state branches, not placeholder UI data.

## Threat Flags

None beyond the plan's listed trust boundaries. The new route forwards an optional existing token to the backend and does not add upload, mutation, file access, or schema behavior.

## Issues Encountered

- Existing unrelated dirty files from prior Phase 59 work and local skill edits remain in the worktree. They were not modified, reverted, staged, or committed.
- `npm run typecheck` generated `frontend/tsconfig.tsbuildinfo`; that generated file was restored because it is outside this plan's write scope.

## Verification

- `cd frontend && npm run typecheck` passed.
- `cd frontend && npm run build` passed; build output includes dynamic route `/members/[slug]`.
- `git diff --check -- frontend/src/lib/api.ts ...` passed for the tracked API helper with the existing CRLF warning; `git diff --check --no-index` passed for the new route, CSS, and summary files with CRLF warnings only.
- Targeted grep confirmed `getMemberProfile`, `PublicMemberProfileResponse`, and `/api/v1/members` in `frontend/src/lib/api.ts`.
- Targeted grep confirmed `cookies()`, token forwarding, `getMemberProfile`, `Mitglied nicht gefunden.`, `Profil konnte nicht geladen werden.`, and `Dieses Profil ist nicht öffentlich zugänglich.` in `frontend/src/app/members/[slug]/page.tsx`.
- Targeted grep confirmed no `'use client'` directive in `frontend/src/app/members/[slug]/page.tsx`.
- Targeted German-copy check found no ASCII replacements such as `oeffentlich`, `zugaenglich`, `ungueltig`, `Beitraege`, `fuer`, or `waehlen` in the new route.

## Self-Check: PASSED

- Found `frontend/src/app/members/[slug]/page.tsx`.
- Found `frontend/src/app/members/[slug]/page.module.css`.
- Found `getMemberProfile` in `frontend/src/lib/api.ts`.
- Found `.planning/phases/59-ffentliches-fansub-member-profil/59-04-SUMMARY.md`.
- No commits were expected or created because the user requested uncommitted worktree changes.

---
*Phase: 59-ffentliches-fansub-member-profil*
*Completed: 2026-05-29*
