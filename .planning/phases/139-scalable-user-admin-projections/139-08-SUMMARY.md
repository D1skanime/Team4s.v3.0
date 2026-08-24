---
phase: 139-scalable-user-admin-projections
plan: 08
subsystem: frontend
tags: [react, nextjs, typescript, admin-ui, container-queries, ui-spec]

# Dependency graph
requires:
  - phase: 139-scalable-user-admin-projections
    plan: 02
    provides: "useUserContributionsFilters URL-synced filter hook and AdminContributionProjectBlock/AdminContributionRangeEntry/AdminUserContributionsPage TS DTOs this plan's component consumes directly"
  - phase: 139-scalable-user-admin-projections
    plan: 07
    provides: "api.ts's real paginated getAdminUserContributions(userId, params) signature this plan builds against, replacing 139-07's explicitly-disposable compile-compatibility placeholder"
provides:
  - "UserContributionsTab.tsx: the UI-SPEC-compliant grouped-card projection (Card variant=nestedFlat per Anime+Projekt block, always-visible project standard, standard-equivalent vs. deviation range rows, five server-side filters, Pagination bound to meta.total)"
  - "contributionsTab.module.css: the container-query responsive layer (container-name: admin-user-projection, 760px/600px breakpoints) other Phase-139 tabs (139-09 Media) can mirror"
affects: [139-09-media-tab-rewrite]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grouped-card admin projection: one Card variant=nestedFlat per pagination-unit block, always-visible standard row + inline never-click-gated deviation rows (UI-SPEC D04/D05/D06 pattern), reusable by 139-09's Media tab"
    - "Thin file-local URL-reset wrapper: deletes only the filter-owned query keys from the current useSearchParams snapshot rather than calling every per-field hook setter in sequence (which would race against the hook's stale closure and only the last call would stick) or blanket-clearing the pathname (which would also drop unrelated params like ?tab=)"
    - "CSS container-query responsive tab root (container-type: inline-size; container-name: admin-user-projection), deliberately bypassing the admin area's dominant useIsMobile()/matchMedia(759px) JS-breakpoint convention per D26"

key-files:
  created:
    - frontend/src/app/admin/users/tabs/contributionsTab.module.css
  modified:
    - frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
    - frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx

key-decisions:
  - "Every project block always shows the 'Projekt öffnen' secondary CTA (not conditionally on a computed single-project count): the block's own grouping key IS (anime_id, fansub_group_id), so every rendered block is by construction exactly one project -- the plan's conditional language ('if the block maps to exactly one project') is trivially always true for this endpoint's shape, unlike AnimeGroupCard.tsx's client-side aggregation across multiple groups per anime"
  - "SectionHeader's actions Badge and the Toolbar's trailing count Badge both show data.meta.total (not the current page's array length) -- the plan's <interfaces> block explicitly specifies both locations independently (SectionHeader actions AND Toolbar trailing), so both are wired to the same meta.total-derived value rather than treating one as redundant"
  - "Rejected calling each per-field filter setter in sequence for the reset button: useUserContributionsFilters' handlers each close over the same useSearchParams() snapshot from the current render, so five sequential calls in one click handler would only make the LAST call's field change stick (each starts from the same pre-click URL). Added a thin, file-local handleResetFilters using the hook's own useRouter/usePathname/useSearchParams import pattern that deletes exactly the seven filter-owned query keys in one router.replace call, matching the plan's explicit escape hatch ('add a thin local reset wrapper here if needed') without modifying the 139-02-owned hook file"
  - "Rewrote the pre-existing role-catalog regression tests (Karaoke FX/Typesetting/unknown-code fixtures) using real ROLE_COLOR_KEYS hex values and ICON_KEYS icon codes instead of the old fixture's semantic-name color_key values ('creative'/'technical') -- those old fixtures never actually matched presentationForRole's real hex-only bounded-color-key logic (a genuine pre-existing Phase-136 fixture bug documented in 139-BASELINE.md/139-CONTEXT.md), so the rewrite closes that debt rather than reproducing it"

requirements-completed: [UADM-02, UADM-03, UADM-04, UADM-06, UADM-07, UADM-08]

# Metrics
duration: 70min
completed: 2026-08-24
---

# Phase 139 Plan 08: Contributions Tab Grouped-Card Rewrite Summary

**UserContributionsTab.tsx is fully rewritten from a flat, filterless, unpaginated `Table` into the UI-SPEC-locked grouped-card projection — one `Card variant="nestedFlat"` per Anime+Projekt block with an always-visible project standard, inline (never click-gated) deviation rows, and five server-side `@/components/ui`-only filters driving a real refetch through `useUserContributionsFilters`.**

## Performance

- **Duration:** ~70 min
- **Completed:** 2026-08-24
- **Tasks:** 2/2 completed
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments

- `UserContributionsTab.tsx` fully replaces 139-07's explicitly-disposable flat-`Table` placeholder: `SectionHeader` (locked UADM-07 informational purpose banner + `Badge` showing `meta.total`), a `Toolbar` with `FormField`+`Select` (Anime/Projekt-Gruppe/Beitragsrolle), `Switch` ("Nur Abweichungen"), and two `FormField`+`DatePicker` (Von/Bis) — every filter control is a real `@/components/ui` primitive, zero hand-built native `<select>/<input>/<button>`.
- Each `AdminContributionProjectBlock` renders as `Card variant="nestedFlat"` with the anime title (Heading 16/700) + `Badge variant="neutral"` group name in the header, an always-visible project-standard row with role chips (exact `AnimeGroupCard.tsx` `ROLE_CATALOG_CHIP_CLASS`/`data-color-key` chip pattern), and one row per range entry: `Badge variant="muted"` "Entspricht Projektstandard" for standard-equivalent ranges, or `Badge variant="warning"` "Abweichung vom Projektstandard" plus the `deviation_detail` text directly beneath — always visible, no `useState` toggle gates it.
- `Pagination` and both count `Badge`s derive from `data.meta.total`/`meta.limit`/`meta.offset`, never the current page's array length.
- New `contributionsTab.module.css` declares the D26-locked `container-type: inline-size; container-name: admin-user-projection` root plus the two named breakpoints (760px: filter fields stack to one column, reset+count move below; 600px: block header and role-chip rows wrap) — `min-width: 0`/`flex-wrap: wrap` applied defensively on every text+badge row per RESEARCH.md's cited overflow pattern.
- `UserContributionsTab.test.tsx` fully rewritten (9/9 tests): standard-vs-deviation always-visible rendering, `meta.total`-driven count/pagination independent of page length, a real `only_deviations=true` server refetch on `Switch` toggle (verified via the mocked `getAdminUserContributions` call args after simulating the URL round-trip, not client-side filtering), distinct true-empty vs. filtered-to-zero `EmptyState`s, and `ErrorState`'s "Erneut versuchen" re-invoking the load function.

## Task Commits

Each task was committed atomically, following a real RED→GREEN TDD cycle for Task 1 (verified genuinely RED by temporarily reverting the implementation file and confirming 7/9 new tests failed against the old flat-table component, before restoring and re-verifying GREEN):

1. **Task 1 (RED): add RED tests for grouped-card contributions projection** - `652a50c1` (test)
2. **Task 1 (GREEN): rewrite UserContributionsTab.tsx as grouped-card projection** - `ccbd9e32` (feat)
3. **Task 2: add container-query CSS module for contributions grouped-card layout** - `1527119c` (feat)

**Plan metadata:** (pending — this SUMMARY's own commit)

## Files Created/Modified

- `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` — full rewrite (372 lines, under CLAUDE.md's 450-line cap): grouped-card projection, five filters, thin local URL-reset wrapper, Pagination/EmptyState/ErrorState/LoadingState wiring
- `frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx` — full rewrite (9 tests): mocks `next/navigation` (required since `useUserContributionsFilters` now drives the component), real `ROLE_COLOR_KEYS`/`ICON_KEYS`-based role fixtures, new assertions for meta.total/pagination, only_deviations refetch, distinct empty states, retry
- `frontend/src/app/admin/users/tabs/contributionsTab.module.css` — new file: container-query responsive layer, 760px/600px breakpoints

## Decisions Made

See `key-decisions` in frontmatter for the full list. Most consequential: the thin, file-local `handleResetFilters` wrapper (not calling each per-field setter in sequence, not blanket-clearing the pathname) — this was the plan's own explicitly anticipated escape hatch, and getting it wrong would have either silently failed to reset every filter (stale-closure race) or dropped the unrelated `?tab=` query param that `UserDetailPageClient.tsx`'s `Tabs` component relies on.

## Deviations from Plan

None beyond the decisions already documented above (which the plan text itself explicitly anticipated as permitted local escape hatches, not out-of-scope changes). No Rule 1/2/3/4 auto-fixes were required — 139-07 had already prepared a compiling foundation (api.ts, filter hook, TS DTOs), so this plan's scope stayed exactly what the `<tasks>` block specified.

## Known Stubs

None — every rendered field (anime title, project/group name, role chips, range labels, deviation detail, filter options) is wired to the real server response; no hardcoded empty value, placeholder text, or unwired mock data path exists in the shipped component.

## Threat Flags

None. The plan's own threat register (T-139-15, accept) covers the only new surface this plan introduces — client-supplied filter query params, which the server independently validates/parameterizes (139-03). No new endpoint, auth path, or file-access pattern is introduced by this plan; it consumes an already-shipped, already-threat-modeled backend endpoint (139-03/139-04) and hook (139-02).

## Self-Check: PASSED

- FOUND: `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` (rewritten, contains `useUserContributionsFilters`, `Entspricht Projektstandard`, `Abweichung vom Projektstandard`, no `Table`/`TableRow` import)
- FOUND: `frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx` (rewritten, 9 tests)
- FOUND: `frontend/src/app/admin/users/tabs/contributionsTab.module.css` (created, contains `container-type: inline-size` and two `@container admin-user-projection` blocks)
- FOUND: commit `652a50c1` in `git log`
- FOUND: commit `ccbd9e32` in `git log`
- FOUND: commit `1527119c` in `git log`
- FOUND: `npx tsc --noEmit` — exactly the 4 pre-existing `139-BASELINE.md` diagnostics remain, zero new
- FOUND: `npx eslint` clean for both touched `.tsx` files
- FOUND: `docker compose build team4sv30-frontend` — succeeds
- FOUND: full `npx vitest run` — 15 failed files / 43 failed tests, all belonging to the exact 16-file `139-BASELINE.md` list minus this plan's now-green `UserContributionsTab.test.tsx` (zero new regressions)
- FOUND: `npx vitest run src/app/admin/users/tabs/UserContributionsTab` — 9/9 passing
