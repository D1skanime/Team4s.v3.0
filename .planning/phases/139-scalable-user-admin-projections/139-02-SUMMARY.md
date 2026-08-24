---
phase: 139-scalable-user-admin-projections
plan: 02
subsystem: frontend
tags: [typescript, nextjs, react-hooks, url-sync, admin-ui]

# Dependency graph
requires:
  - phase: 139-scalable-user-admin-projections
    plan: 01
    provides: "AdminUserContributionsPage/AdminUserMediaPage/AdminUserRightsSummaryPage and nested Go DTOs (admin_users.go) this plan's TS types mirror field-for-field"
provides:
  - "Fourteen new TS interfaces + two filter-param interfaces in frontend/src/types/admin-users.ts, locking the exact frontend contract shape for 139-08/139-09's tab rewrites"
  - "useUserContributionsFilters.ts / useUserMediaFilters.ts — URL-synced filter hooks ready for 139-08/139-09 to consume without re-deriving useClaimsListFilters.ts's URL-sync logic"
affects: [139-07-rights-tab-lazy-fetch, 139-08-contributions-tab-rewrite, 139-09-media-tab-rewrite]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AdminListMeta{total,limit,offset} named shared TS envelope, mirrors 139-01's Go AdminListMeta"
    - "URL-synced filter hook (useUserContributionsFilters/useUserMediaFilters) copies useClaimsListFilters.ts's exact writeParams/useMemo/router.replace-only shape for two new filter sets"

key-files:
  created:
    - frontend/src/app/admin/users/useUserContributionsFilters.ts
    - frontend/src/app/admin/users/useUserMediaFilters.ts
  modified:
    - frontend/src/types/admin-users.ts

key-decisions:
  - "only_deviations URL param encoded as '1'/absent (not 'true'/'false' string), matching the existing has_conflicts boolean-URL-param convention already used by ListUsers's filter handling, per the plan's explicit instruction"
  - "Fixed stray ASCII-substituted umlauts (ae/oe/ue) in this plan's own new doc comments for consistency with the file's existing German comment style; left untouched the same substitutions in pre-existing 138-05 comments (out of this plan's scope) since CLAUDE.md's umlaut rule scopes only user-facing strings, not comments"

requirements-completed: [UADM-02, UADM-03, UADM-04, UADM-05, UADM-06, UADM-08, QUAL-06]

# Metrics
duration: 35min
completed: 2026-08-24
---

# Phase 139 Plan 02: Frontend Types + Filter Hooks Summary

**Fourteen new TS interfaces mirroring 139-01's Go DTOs field-for-field, plus two URL-synced filter hooks (contributions, media) cloned from useClaimsListFilters.ts's proven pattern — zero component rendering changes, pure interface-first foundation for 139-08/139-09's tab rewrites.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-08-24
- **Tasks:** 2/2 completed
- **Files modified:** 3 (1 modified, 2 new)

## Accomplishments
- Extended `frontend/src/types/admin-users.ts` additively with `AdminListMeta`, `AdminFilterOption`, `AdminContributionStandardSummary`, `AdminContributionRangeEntry`, `AdminContributionProjectBlock`, `AdminContributionFilterOptions`, `AdminUserContributionsPage`, `AdminMediaItem`, `AdminMediaReleaseBlock`, `AdminMediaFilterOptions`, `AdminUserMediaPage`, `AdminHeadlineCapabilityState`, `AdminUserGroupRightsSummaryItem`, `AdminUserRightsSummaryPage`, plus `AdminUserContributionsParams`/`AdminUserMediaParams` — verified field-for-field against the actual Go structs added by 139-01 (`backend/internal/models/admin_users.go`), not just the plan's `<interfaces>` block
- Created `useUserContributionsFilters.ts` and `useUserMediaFilters.ts`, both structurally identical to `useClaimsListFilters.ts` (URL param reads, `writeParams` merge-and-clean, `handlePageChange` with `resetOffset=false`, `router.replace(..., { scroll: false })` only, `useMemo`-stabilized `params` object)
- Zero existing interface, hook, or component touched — this plan has zero file overlap with sibling Wave-1 plan 139-01

## Task Commits

Each task was committed atomically:

1. **Task 1: Add new TypeScript DTO mirrors to admin-users.ts** - `ffe07f4d` (feat)
2. **Task 2: Create useUserContributionsFilters.ts + useUserMediaFilters.ts** - `0c43882f` (feat)
3. **Polish: correct umlaut ASCII substitutions in this plan's new comments** - `fc162e6a` (style)

**Plan metadata:** (pending — this SUMMARY's own commit)

## Files Created/Modified
- `frontend/src/types/admin-users.ts` - added 14 new interfaces + `AdminUserContributionsParams`/`AdminUserMediaParams`, all additive; existing `AdminContributionItem`/`AdminUserContributionsResponse`/`AdminMediaItemSummary`/`AdminClaim*`/`AdminChanges*` interfaces byte-unchanged
- `frontend/src/app/admin/users/useUserContributionsFilters.ts` - new hook: anime/group/role/only_deviations/from/to/offset URL-synced filters
- `frontend/src/app/admin/users/useUserMediaFilters.ts` - new hook: anime/group/release-or-episode/media_type/from/to/offset URL-synced filters

## Decisions Made
- `only_deviations` is encoded on the URL as `'1'`/absent rather than the string `'true'`/`'false'`, per the plan's explicit instruction to match the existing `has_conflicts` boolean-URL-param convention (`ListUsers`'s own filter handling) — keeps the URL-encoding convention consistent across this admin area rather than introducing a second boolean-URL-param style.
- Both hooks' `writeParams`/`params` `useMemo` dependency arrays list every underlying URL-derived value (mirrors `useClaimsListFilters.ts` exactly) — this is load-bearing per the plan's own interface note: an unstable `params` reference would cause an infinite refetch loop in a consuming tab's `loadData` `useCallback` once 139-08/139-09 wire these hooks in.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - style/consistency] Stray ASCII-substituted umlauts in this plan's own new doc comments**
- **Found during:** Post-task review of Tasks 1/2's newly added German doc comments
- **Issue:** Comments added by Tasks 1/2 used ASCII substitutions (`ueber`, `Beitraege`, `aendern`, `wuerde`, `haelt`, `ausloesen`, `beschraenkt`, `verfuegbaren`, `Faehigkeit`, `gebuendelte`, `Uebersicht`) for umlauts, inconsistent with the surrounding file's existing German comment style (which uses real `ä/ö/ü`). CLAUDE.md's umlaut rule technically scopes only user-facing strings (comments are explicitly exempted), so this was not a hard violation, but the inconsistency was corrected for code-quality consistency with this file's own established convention.
- **Fix:** Replaced `ueber`→`über`, `Beitraege`→`Beiträge`, `aendern`→`ändern`, `wuerde`→`würde`, `haelt`→`hält`, `ausloesen`→`auslösen`, `beschraenkt`→`beschränkt`, `verfuegbaren`→`verfügbaren`, `Faehigkeit`→`Fähigkeit`, `gebuendelte`→`gebündelte`, `Uebersicht`→`Übersicht` — only within the doc comments this plan itself added (Task 1's Phase-139 section header, Task 2's two hook doc comments). Pre-existing 138-05 comments (`gruppenuebergreifenden`, lines 238/281 of `admin-users.ts`) were deliberately left untouched — out of this plan's scope, not introduced by this plan.
- **Files modified:** `frontend/src/types/admin-users.ts`, `frontend/src/app/admin/users/useUserContributionsFilters.ts`, `frontend/src/app/admin/users/useUserMediaFilters.ts`
- **Verification:** `npx tsc --noEmit` re-run clean for all three files after the fix; no functional change (comment-only edit).
- **Committed in:** `fc162e6a`

## Known Stubs

None — this plan adds only TypeScript type definitions and pure state-management hooks; no component rendering or data-wiring stubs are introduced.

## Threat Flags

None — the threat model's own disposition (T-139-03, accept) applies unchanged: these hooks only shape outgoing query params, perform no authorization decision, and render no untrusted data. Server-side validation of these filter values happens in 139-03/139-04's Go handlers, tracked in those plans' own threat models.

## Self-Check: PASSED

- FOUND: `frontend/src/types/admin-users.ts` (modified, contains `AdminUserContributionsPage`, `AdminUserMediaPage`, `AdminUserRightsSummaryPage`)
- FOUND: `frontend/src/app/admin/users/useUserContributionsFilters.ts` (created)
- FOUND: `frontend/src/app/admin/users/useUserMediaFilters.ts` (created)
- FOUND: commit `ffe07f4d` in `git log`
- FOUND: commit `0c43882f` in `git log`
- FOUND: commit `fc162e6a` in `git log`
- FOUND: `npx tsc --noEmit` clean for all three touched files (4 pre-existing, unrelated errors remain elsewhere — Next.js route-type errors + `ChangeEntryTranslator.test.ts`, matching 139-RESEARCH.md's documented baseline)
