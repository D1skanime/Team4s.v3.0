---
phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme
reviewed: 2026-07-27T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - backend/internal/models/member_profile.go
  - backend/internal/repository/member_profile_repository.go
  - backend/internal/repository/member_profile_repository_postgres_test.go
  - frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx
  - frontend/src/app/members/[slug]/page.test.tsx
  - frontend/src/app/members/ranking/RankingPaginationNav.tsx
  - frontend/src/app/members/ranking/page.module.css
  - frontend/src/app/members/ranking/page.test.tsx
  - frontend/src/app/members/ranking/page.tsx
  - frontend/src/components/layout/AppShell.test.tsx
  - frontend/src/components/layout/AppShell.tsx
  - frontend/src/components/profile/MemberBadgeChain.module.css
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
  - frontend/src/components/profile/MemberBadgeChain.tsx
  - frontend/src/components/profile/MemberProfileHero.test.tsx
  - frontend/src/components/profile/MemberProfileHero.tsx
  - frontend/src/components/profile/memberBadgeLabels.ts
  - frontend/src/types/profile.ts
  - shared/contracts/openapi.yaml
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 110: Code Review Report

**Reviewed:** 2026-07-27
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed the D-01..D-04 ranking/badges UI slice plus the D-02/D-03 backend additions
(`total_points` projection, live-computed `role_entry_*` badges). The backend changes are
solid: `loadTotalPoints` is a pure read against the trigger-maintained `member_point_totals`
table with a safe zero-fallback, and `loadPublicBadges` correctly never persists role-entry
badges to `member_badges` — they are recomputed on every read from
`release_role_credit_lifecycles WHERE lifecycle_status='awarded'`, which is exactly what
D-03 requires and is exercised by dedicated Postgres lifecycle tests (awarded → visible →
reversed → invisible). The frontend badge-grouping refactor (D-04) is a clean, pure,
unit-tested function (`buildMemberBadgeGroups`) with correct empty-category hiding and
generic same-`roleCode` row merging for future badge families.

The one BLOCKER is in the new `/members/ranking` page: it renders row rank numbers and the
pagination component's `currentPage` from the raw, unclamped `page` query-string value
instead of from the backend-authoritative `result.page` the same response already returns.
Since the backend (`MemberPointRankingHandler.GetMemberPointRanking`) silently clamps
out-of-range `page` values (< 1 → 1, > 1000 → 1000) and still returns HTTP 200 with the
clamped page's data, any user who edits the `?page=` query string to an out-of-range value
gets a page of real data labeled with wrong rank numbers and a mismatched "current page" in
the pagination control. No test in `page.test.tsx` exercises this mismatch, which is why it
shipped.

## Critical Issues

### CR-01: Ranking page renders rank numbers/current-page from the unclamped client `page`, not the backend-authoritative `result.page`

**File:** `frontend/src/app/members/ranking/page.tsx:33,73,86`
**Issue:**
`page` is derived directly from the raw URL query string via `toNumber(resolved.page, 1)`
(no upper bound, no relationship to the actual data returned). The backend
(`backend/internal/handlers/member_point_totals_handler.go:30-45`) clamps `page` server-side
(`page < 1` → 1, `page > 1000` → 1000) and always returns HTTP 200 with `{ data, total, page }`
— `page` in the response is the *clamped* value that was actually used to build `data`.

`page.tsx` ignores `result.page` entirely and instead uses the unclamped local `page` for:
- the row rank number: `(page - 1) * RANKING_PAGE_SIZE + index + 1` (line 73)
- `RankingPaginationNav currentPage={page}` (line 86)

Example: a user requests `/members/ranking?page=99999`. `getMemberPointRanking(99999)` sends
`page=99999`, the backend clamps to `page=1000` and returns page-1000 data with
`result.page === 1000`. The component still computes rank numbers as
`(99999 - 1) * 50 + index + 1` (≈4,999,901+) and passes `currentPage={99999}` to the
pagination control — both wildly wrong relative to the data actually shown. This directly
violates the project rule that "the ranking `page` param clamp is the backend's source of
truth" by treating the unclamped client value as authoritative for rendering, even though the
authoritative value is already present in `result.page`.

**Fix:**
```tsx
export default async function MemberRankingPage({ searchParams }: RankingPageProps) {
  const resolved = ((await searchParams) ?? {}) as ResolvedRankingSearchParams
  const requestedPage = toNumber(resolved.page, 1)

  let result: Awaited<ReturnType<typeof getMemberPointRanking>> | null = null
  let fetchError: unknown = null

  try {
    result = await getMemberPointRanking(requestedPage)
  } catch (error) {
    fetchError = error
  }

  // Use the backend-clamped page for anything rendered from `result`.
  const effectivePage = result?.page ?? requestedPage
  ...
  <TableCell>{(effectivePage - 1) * RANKING_PAGE_SIZE + index + 1}</TableCell>
  ...
  <RankingPaginationNav currentPage={effectivePage} totalPages={Math.ceil(result.total / RANKING_PAGE_SIZE)} />
```
Also add a regression test in `page.test.tsx` that mocks `getMemberPointRanking` returning
`page: 1000` while the search param requests `page: '99999'`, and asserts the rendered rank
numbers and pagination `currentPage` reflect `1000`, not `99999`.

## Warnings

### WR-01: `member_profile_repository.go` is 1875 lines — over 4x the 450-line project limit, and this phase adds to it

**File:** `backend/internal/repository/member_profile_repository.go`
**Issue:** CLAUDE.md states production code files should stay at or below 450 lines and
"larger implementations must be split before they become monolithic." This file is already
1875 lines pre-phase-110 and this phase adds another 52 lines (`loadTotalPoints`, the
role-entry badge query in `loadPublicBadges`) without splitting it. It is not a regression
introduced by this phase, but the phase had an opportunity to extract read-only projection
helpers (e.g. `loadTotalPoints`, `loadPublicBadges`, `loadCurrentProjects`,
`loadCurrentProjectReleaseVersions`, `loadLatestContributions`, `loadPreviousContributions`,
`loadRecentContributions` — all read-only, member-profile-projection helpers) into a
sibling file (e.g. `member_profile_projection_repository.go`) instead of growing the
existing monolith further.
**Fix:** In a follow-up phase, split the read-only "public profile projection" load
functions (everything below `GetPublicMemberProfile`'s own-profile-specific helpers) into a
new file in the same package, keeping `MemberProfileRepository` as the receiver so no public
API changes are needed.

### WR-02: `AppShell.tsx` still hand-rolls native `<button>` elements the design system already covers

**File:** `frontend/src/components/layout/AppShell.tsx:260-269,381-391,393-399`
**Issue:** CLAUDE.md's global UI primitives rule forbids hand-built native `<button>`
markup for a primitive type `@/components/ui` already provides (`Button` is imported and used
elsewhere in this same phase's diff, e.g. `MemberProfileHero.tsx`). `AppShell.tsx` uses raw
`<button type="button">` for the logout action, the mobile nav toggle, and the drawer
backdrop-close control. This predates phase 110 (the phase's only change to this file was
adding the "Rangliste" nav entry), so it is not a regression, but the file was in this
phase's review scope and the violation is real and current (ESLint's
`no-restricted-syntax` rule for native `<button>` is currently `warn`, not `error`, so it did
not block this phase).
**Fix:** Migrate these three raw `<button>` usages to `@/components/ui`'s `Button` primitive
(with `variant`/`className` props for the drawer-specific styling) in a follow-up UI-system
migration pass, consistent with the project's stated intent to eventually raise the ESLint
rule to `error`.

### WR-03: `getMemberPointRanking` silently drops the page parameter for any non-positive or fractional-looking value without surfacing that to the caller

**File:** `frontend/src/lib/api.ts:9398-9401` (helper consumed by `page.tsx`)
**Issue:** `if (page && page > 1) query.set('page', String(page))` — this is fine for the
happy path, but combined with CR-01 it means the *only* signal the frontend has about
whether the server-side clamp fired is `result.page`, which the ranking page currently
discards. This isn't a bug in `api.ts` itself, but it means the fix for CR-01 is the sole
place this information can be recovered — flagging so the fix isn't limited to just the rank
number and is also applied to any future consumer of `getMemberPointRanking`.
**Fix:** Covered by the CR-01 fix; no change needed in `api.ts` itself.

## Info

### IN-01: `MemberProfileHero.tsx`'s `getTotalPoints` returns `number | null`, but the public DTO field is now non-optional and always a number (never null)

**File:** `frontend/src/components/profile/MemberProfileHero.tsx:57-59`
**Issue:** `total_points` in `PublicMemberProfileData` (see `frontend/src/types/profile.ts`)
and in the Go model (`models.PublicMemberProfile.TotalPoints int64`) is always present and
always a real integer (0 as a legitimate value, never `null`/`undefined`). `getTotalPoints`
narrows via `'total_points' in profile ? profile.total_points : null`, so the `null` branch
is reachable only for `MemberProfileData` (own-profile), which correctly has no
`total_points` field — this is intentional and correct, not a bug. Noting only because the
naming (`| null`) could read as "points can be absent for a public profile," which is not the
case; a code comment clarifying that `null` here only ever means "own-profile view, field not
applicable" would prevent future confusion.
**Fix:** Optional: add a one-line comment above `getTotalPoints` clarifying the `null` case is
own-profile-only, not a public-profile absence case.

### IN-02: `role_entry_*` badge codes assume the DB's `role_code` values in `release_role_credit_lifecycles` match the frontend's 8 hardcoded role codes, with no defensive fallback tested here

**File:** `backend/internal/repository/member_profile_repository.go:597-616`,
`frontend/src/components/profile/memberBadgeLabels.ts:99-109`
**Issue:** `loadPublicBadges` builds badge codes as `"role_entry_" + roleCode` directly from
whatever distinct `role_code` values exist in `release_role_credit_lifecycles` for a member,
with no allow-list against the 8 known roles. If a future contributor role is added to that
table's `role_code` domain without a corresponding entry in
`MEMBER_BADGE_PRESENTATIONS`/`PUBLIC_MEMBER_BADGE_CATALOG`, `getMemberBadgePresentation`'s
fallback path (`memberBadgeLabels.ts:99-109`) silently renders it into the `special` group
under the raw `badgeCode` as its label rather than surfacing a clear signal that a badge
catalog entry is missing. This is defensive/graceful behavior (no crash), but worth flagging
as a silent-drift risk given the review focus on 1:1 role-code alignment between the two
layers.
**Fix:** Optional: add a unit test in `MemberBadgeChain.test.tsx` (or a Go test) asserting the
full set of expected `role_code` values in `release_role_credit_lifecycles`'s check constraint
(if one exists) is exactly covered by `PUBLIC_MEMBER_BADGE_CATALOG`'s `role_entry_*` entries,
so a new role_code triggers an intentional catalog update instead of a silent generic-label
fallback in production.

---

_Reviewed: 2026-07-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
