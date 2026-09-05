---
phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en
plan: 03
subsystem: ui
tags: [css-custom-properties, role-colors, member-profile, frontend]

# Dependency graph
requires: ["148-01", "148-02"]
provides:
  - "RoleBadgeCard.module.css with zero [data-role-code] color selectors and zero --role-accent-<code>/-default token references"
  - "MemberBadgeChain.tsx role-card Card element carries data-color-key={presentationForRole(contributionRoles, row.key).colorKey} alongside the existing data-role-code"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The role-progress badge card now derives --role-accent purely from the [data-color-key] seam (globals.css, Plan 148-02) instead of a dead per-code selector table, matching the pattern already used by every other restored surface."

key-files:
  created: []
  modified:
    - frontend/src/components/profile/RoleBadgeCard.module.css
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.test.tsx

key-decisions:
  - "The plan's illustrative test example used role code 'fansub_lead', but that exact code is already used elsewhere in this test file as a legacy alias that another test (`zeigt exakt 11 verdiente Rollenfamilien...`) explicitly asserts must NOT render a card. Reusing it for the new data-color-key fixture would have silently broken that unrelated assertion (adding it to the shared contributionRoles fixture makes it earnable). Used a fresh, uncollided fixture code `catalog_hex_role` (icon_key: 'other', color_key: '#183b7c') instead, preserving the exact behavior intent (icon_key='other' leadership-style role still carries its own catalog hex)."
  - "The plan's second behavior test description ('a role not present in the fixture catalog still renders with data-color-key=neutral') is architecturally impossible to trigger through MemberBadgeChain's own render path: a role card only ever renders for a code present in both `contributionRoles` (the catalog) and `roleCounts` (earned badges) -- orderedRoleCodes is their intersection. A role code absent from the catalog therefore never produces a card at all, matching pre-change behavior. Implemented the equivalent, actually-reachable regression proof instead: `timer`, whose fixture `color_key` is the placeholder string 'other' (not one of the 15 catalog hexes), still renders `data-color-key='neutral'` via the same `presentationForRole` -> `boundedColorKey` fallback path `presentationForRole` uses for a genuinely absent role -- proving the fallback is unchanged post-restoration."

requirements-completed: []

# Metrics
duration: ~20min
completed: 2026-09-05
---

# Phase 148 Plan 03: Connect the role-progress badge card to the data-color-key catalog seam Summary

**Removed RoleBadgeCard.module.css's twelve dead `[data-role-code]` `--role-accent-<code>` selectors (plus `.roleBadgeRowCompact`'s own dead `--role-accent-default`) and wired `MemberBadgeChain.tsx`'s role-card `<Card>` element to carry `data-color-key={presentationForRole(contributionRoles, row.key).colorKey}`, so the role-progress badge card now derives its `--role-accent` from the same working `[data-color-key]` seam every other restored surface uses — proven by a new behavior test for a role whose `icon_key` is `'other'`.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- `RoleBadgeCard.module.css` no longer contains any `[data-role-code="..."]` color selector or any `--role-accent-<code>`/`--role-accent-default` reference; every other declaration in `.roleBadgeRow`/`.roleBadgeRowCompact` (position, min-height, background gradients, breakpoints) is untouched.
- `MemberBadgeChain.tsx`'s role-card `<Card>` element now additionally carries `data-color-key={presentationForRole(contributionRoles, row.key).colorKey}`, alongside its existing `data-role-code={row.key}` — no new import needed, `contributionRoles`/`presentationForRole` were already in scope.
- `LayeredBadgeArtwork.module.css` confirmed untouched: its own hardcoded `--role-accent: #17a7a5` (line 8) remains the only match for that string in the file, byte-identical.
- New tests in `MemberBadgeChain.test.tsx` (`describe('Phase 148-03 data-color-key auf der Rollenfortschritt-Karte', ...)`) prove: (1) a role with `icon_key: 'other'` (fixture `catalog_hex_role`, `color_key: '#183b7c'`) renders `data-color-key="#183b7c"` while `data-role-code` stays unchanged, and (2) a role whose fixture `color_key` doesn't match any of the 15 catalog hexes (`timer`, `color_key: 'other'`) still falls back to `data-color-key="neutral"`, matching `presentationForRole`'s existing fallback behavior.
- Full `MemberBadgeChain.test.tsx` suite: 110 passed, 1 skipped (pre-existing skip, unrelated) — zero regressions across all 111 tests in the file, which cover the badge chain's full role/points/contribution/membership surface, not just this plan's change.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove RoleBadgeCard.module.css's dead per-code selectors; wire data-color-key in MemberBadgeChain.tsx** - `f3af7ffd` (fix)

## Files Created/Modified

- `frontend/src/components/profile/RoleBadgeCard.module.css` - twelve dead `[data-role-code]` color selectors removed; `.roleBadgeRowCompact`'s dead `--role-accent: var(--role-accent-default);` line removed; every other declaration byte-for-byte unchanged
- `frontend/src/components/profile/MemberBadgeChain.tsx` - role-card `<Card>` gained `data-color-key={presentationForRole(contributionRoles, row.key).colorKey}`
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - fixture `contributionRoles` gained one new entry (`catalog_hex_role`, `icon_key: 'other'`, `color_key: '#183b7c'`) plus a new `describe` block with two behavior tests

## Decisions Made

See `key-decisions` in the frontmatter above for the full rationale on: (1) why the fixture role code `catalog_hex_role` was used instead of the plan's illustrative `fansub_lead` example (collision avoidance with an existing, unrelated negative assertion), and (2) why the second behavior test targets `timer`'s unmatched-`color_key` fallback rather than a literally catalog-absent role code (architecturally unreachable through `MemberBadgeChain`'s own render path, since a role card only ever renders for codes present in both the catalog and the earned-badge set).

## Deviations from Plan

### Auto-fixed Issues

None — this was a byte-for-byte, single-source-swap restoration exactly as specified by the Restoration Rule; no bugs were found requiring an inline fix.

### Test-target adaptation (documented, not a Rule 1-4 deviation)

Both new tests implement the plan's `<behavior>` intent using concrete, actually-reachable fixture scenarios rather than the plan's illustrative wording verbatim — see `key-decisions` above. No test coverage was reduced; both assertions are stronger than the plan's literal wording would have allowed (the plan's literal second scenario cannot be constructed at all through this component's real render path).

### Out-of-scope discoveries (logged, not fixed)

None new. The pre-existing `tsc --noEmit` failure in a generated Next.js route-type file (already logged in `deferred-items.md` from Plan 01) is unrelated and unaffected by this plan; confirmed still the only `tsc` error after this plan's changes.

## Issues Encountered

None beyond the test-target adaptation documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All of Task 1's acceptance criteria pass: `grep -c 'data-role-code="fansub_lead"'` on `RoleBadgeCard.module.css` returns 0; `grep -n -- "--role-accent-"` on the same file returns empty; `grep -n -- "--role-accent: #17a7a5"` on `LayeredBadgeArtwork.module.css` still returns exactly 1 match; `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` exits 0 (110 passed, 1 pre-existing skip).
- `npx tsc --noEmit` shows only the one pre-existing, unrelated route-type error already logged in earlier plans' `deferred-items.md`.
- `npx eslint` reports zero errors on the touched `.tsx`/`.test.tsx` files (the `.module.css` file is correctly unmatched by the JS/TS lint config, not an error).
- Ready for the remaining Phase 148 plans (04+): `RoleBadgeCard.stages.module.css` and `RoleBadgeCard.status.module.css` already only consumed `var(--role-accent)` with no dead self-assignment (per this plan's objective note), so this plan's `data-color-key` attribute now correctly feeds all three RoleBadgeCard-family CSS modules through the one `[data-color-key]` seam.
- The Phase 148-02 contrast-formula finding (several restored, locked-ratio formulas measurably fail WCAG for some/all 15 catalog hexes, including `RoleBadgeCard.stages.module.css` and `MemberBadgeChain.module.css`) is unaffected by this plan — this plan only swapped the dead color source for the role-progress card shell (`RoleBadgeCard.module.css`), it did not touch any color-mix ratio in `.stages`/`.status`/`MemberBadgeChain.module.css`. That open question remains tracked in `deferred-items.md` for phase-level closure.

---
*Phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en*
*Completed: 2026-09-05*

## Self-Check: PASSED

All 3 `files_modified` paths verified present on disk; task commit hash `f3af7ffd` verified
present in `git log --oneline --all`.
