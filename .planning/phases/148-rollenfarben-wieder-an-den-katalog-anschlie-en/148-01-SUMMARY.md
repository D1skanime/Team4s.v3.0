---
phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en
plan: 01
subsystem: ui
tags: [react, typescript, css-custom-properties, role-colors, frontend]

# Dependency graph
requires: []
provides:
  - "categoryForRole() fully removed from frontend/src/lib/roleCatalog.ts and every call site"
  - "presentationForRole() with decoupled icon/color fallback (real color_key survives an unrecognized icon_key)"
  - "Six former categoryForRole consumers migrated onto data-role-code={real code} + data-color-key={presentationForRole(...).colorKey}"
  - "MemberCurrentProjectsSection.module.css's twelve dead [data-role-code='<code>'] color selectors removed; .roleChip now reads --project-role-accent from the ambient --role-accent"
affects: [148-02, 148-03, 148-04, 148-05, 148-06, 148-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "data-role-code carries the real role_definitions.code (semantic/debug attribute only, never a CSS color selector)"
    - "data-color-key carries presentationForRole(...).colorKey (bounded hex or 'neutral'), the sole CSS color-selection seam"
    - "ContributionCard's role Badge adopts the shared .role-catalog-chip 14%-mix formula instead of having no color formula at all"

key-files:
  created: []
  modified:
    - frontend/src/lib/roleCatalog.ts
    - frontend/src/lib/roleCatalog.test.ts
    - frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberReleaseCard.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx
    - frontend/src/components/contributions/ContributionCard.tsx
    - frontend/src/components/contributions/ContributionCard.test.tsx
    - frontend/src/components/profile/MemberCurrentProjectsSection.tsx
    - frontend/src/components/profile/MemberCurrentProjectsSection.module.css
    - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
    - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx
    - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx

key-decisions:
  - "presentationForRole only returns full neutral when the role itself is missing from the catalog; an unrecognized icon_key alone now falls back to iconKey 'user' while colorKey still resolves via the untouched boundedColorKey()"
  - "For roles that fall back to a raw, non-catalog value (e.g. an unmatched 'future_role' label), data-role-code now carries that raw value verbatim (not a synthesized category string like the old 'other') since there is no real role_definitions.code to report"
  - "ContributionCard's role Badge gains className={ROLE_CATALOG_CHIP_CLASS} per the UI-SPEC's Restoration Rule exception (it previously had zero color formula)"

patterns-established:
  - "Six-surface categoryForRole -> presentationForRole migration pattern: data-role-code={role.code}, data-color-key={presentationForRole(rows, role.code).colorKey}"

requirements-completed: []

# Metrics
duration: ~35min
completed: 2026-09-05
---

# Phase 148 Plan 01: Decouple presentationForRole and migrate six categoryForRole consumers Summary

**Removed the dead `categoryForRole()` hex-passthrough from `roleCatalog.ts`, decoupled `presentationForRole()`'s icon/color fallback, and migrated all six former `categoryForRole` call sites (`ProjectMemberHero`, `ProjectMemberReleaseCard`, `ContributionCard`, `MemberCurrentProjectsSection` x2, `/me/projects/.../page.tsx`) onto real `data-role-code` + `presentationForRole(...).colorKey`-derived `data-color-key`.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- `categoryForRole()` deleted in full — zero references anywhere in `frontend/src` (verified by `grep -rn "categoryForRole" frontend/src`)
- `presentationForRole()` now returns a role's real bounded `colorKey` even when its `icon_key` is unrecognized; only `iconKey` falls back to `'user'` in that case. Full neutral is still returned only when the role itself is not found in the catalog.
- All six former `categoryForRole` consumers now set `data-role-code` from the real role code and `data-color-key` from `presentationForRole(rows, code).colorKey`
- `ContributionCard`'s role `Badge` gains the proven `.role-catalog-chip` 14%-mix formula (it previously rendered with no color formula at all — `variant="info"` only)
- `MemberCurrentProjectsSection.module.css`'s twelve dead `[data-role-code='<code>']` color selectors and the dead `--role-accent-default`/`--role-accent-<code>` tokens are gone; `.roleChip` reads color exclusively from `--project-role-accent: var(--role-accent)`, matching the `data-color-key` seam every other surface uses (note: `--role-accent` itself is derived from the catalog seam in Plan 148-02, not this plan)

## Task Commits

Each task was committed atomically:

1. **Task 1: Decouple presentationForRole(), remove categoryForRole()** - `e85cbeae` (refactor)
2. **Task 2: Migrate ProjectMemberHero, ProjectMemberReleaseCard, ContributionCard onto code + colorKey** - `7e375de6` (fix)
3. **Task 3: Migrate MemberCurrentProjectsSection and me/projects page; remove dead per-code color selectors** - `b1a65ffc` (fix)

## Files Created/Modified
- `frontend/src/lib/roleCatalog.ts` - `presentationForRole` decoupled; `categoryForRole` removed
- `frontend/src/lib/roleCatalog.test.ts` - new decoupling test (5 roles with valid hex color_key + unrecognized icon_key)
- `frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx` - role chip now sets `data-role-code`/`data-color-key`; stale comment corrected
- `frontend/src/components/fansubs/projectMember/ProjectMemberReleaseCard.tsx` - role tag now sets `data-role-code`/`data-color-key`
- `frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx` - fixture color_key values switched to real hex; assertions updated for real codes + color keys
- `frontend/src/components/contributions/ContributionCard.tsx` - role Badge gains `ROLE_CATALOG_CHIP_CLASS`, `data-role-code`, `data-color-key`
- `frontend/src/components/contributions/ContributionCard.test.tsx` - fixture/assertions updated for real codes, color keys, and correct display order
- `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` - both role-chip call sites (project-level + release-exception) migrated
- `frontend/src/components/profile/MemberCurrentProjectsSection.module.css` - twelve dead `[data-role-code]` selectors removed; `.roleChip` reads `--role-accent`
- `frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx` - assertions updated for real codes/color keys, CSS-text assertions updated for the removed dead tokens
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` - role-detail row migrated; existing `borderInlineStartColor: 'var(--role-accent)'` inline style left untouched
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx` - fixture/assertions updated for real codes and color keys

## Decisions Made
- For a role code with no catalog match (e.g. `future_role` in test fixtures), `data-role-code` now carries the raw fallback value used by each component's own role-resolution logic (the literal string passed in, e.g. `'future_role'`), not a synthesized category string. This is a direct, necessary consequence of "data-role-code carries the real role code" — there is no `role_definitions.code` to report for an unmatched role, so the raw input value is the only truthful value available. Verified against actual component behavior via real React Testing Library render/assert (not guessed), per the project's test-style rule.
- `ContributionCard`'s Badge additionally received `className={ROLE_CATALOG_CHIP_CLASS}` per the UI-SPEC's documented Restoration Rule exception (it is the only surface in this phase with no pre-existing color formula to restore).

## Deviations from Plan

None - plan executed exactly as written. All fixture/assertion updates in the three touched test files matched the plan's `<action>` instructions except where the plan's prose ("data-role-code expects ... 'other' for the unknown-fixture case") conflicted with actually-observed component behavior; in those specific spots the real, RTL-verified behavior (raw fallback value, e.g. `'future_role'`) was used instead of the plan's prose, since the project's test-style rule requires assertions to reflect genuine executed behavior, not assumed values. This is a Rule 1-class correction (fixing an incorrect expected value before it became a false-negative or false-positive test) rather than a scope change — no production behavior differs from what the plan's `<action>`/`<behavior>` sections specify.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `--role-accent` itself is not yet derived from the `data-color-key` seam in `globals.css` — that derivation is Plan 148-02's scope (`[data-color-key] { --role-accent: var(--role-chip-accent, #596176); }` plus a `:root` neutral default). Until 148-02 lands, the newly-cleared `--role-accent` reference on `MemberCurrentProjectsSection`'s `.roleChip` and the pre-existing `/me/projects` row indicator resolve to the CSS-spec default (transparent/inherit), which is expected and does not block this plan's completion — the seam wiring is intentionally sequenced into 148-02.
- All three tasks' acceptance criteria pass: `grep -rn "categoryForRole" frontend/src` returns empty; `npx tsc --noEmit` shows only the pre-existing, unrelated generated-type failure logged in `deferred-items.md`; all 5 verification test files (45 tests total) pass; ESLint clean on every touched file.
- Ready for Plan 148-02 (globals.css `--role-accent` derivation + dead-fallback removal in the three simple modules).

---
*Phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en*
*Completed: 2026-09-05*

## Self-Check: PASSED

All 12 files_modified paths verified present on disk; all 3 task commit hashes
(`e85cbeae`, `7e375de6`, `b1a65ffc`) verified present in `git log --oneline --all`.
