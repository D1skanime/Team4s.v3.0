---
phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en
plan: 02
subsystem: ui
tags: [css-custom-properties, role-colors, accessibility, frontend]

# Dependency graph
requires: ["148-01"]
provides:
  - "--role-accent derived in globals.css from the existing [data-color-key]/--role-chip-accent seam, with a :root neutral (#596176) default"
  - "PublicNoteCard/ProjectMemberPage/ProjectMemberReleasesSection modules read var(--role-accent) with zero dead --role-accent-default fallback references, formulas byte-for-byte unchanged"
  - "roleCatalog.accessibility.test.ts extended with real-CSS-text-driven WCAG contrast proofs for every restored formula across the whole phase (15 catalog hexes each)"
affects: [148-03, 148-04, 148-06, 148-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single --role-accent derivation point in globals.css: :root default + [data-color-key] { --role-accent: var(--role-chip-accent, #596176); }"
    - "Contrast proofs extract color-mix percentages from real CSS text via regex (never hand-copied), then compute WCAG contrast in test code per the existing precedent's hexRgb/mix/luminance/contrast helpers"
    - "Genuine formula-level contrast failures are asserted as an explicit, currently-measured failing-hex list (a regression-detecting 'known gap' snapshot) rather than silently forced to pass or hidden behind a loosened threshold"

key-files:
  created: []
  modified:
    - frontend/src/styles/globals.css
    - frontend/src/components/public/PublicNoteCard.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.module.css
    - frontend/src/lib/roleCatalog.accessibility.test.ts
    - .planning/phases/148-rollenfarben-wieder-an-den-katalog-anschlie-en/deferred-items.md

key-decisions:
  - "The :root default and [data-color-key] rule were added as two new, standalone rules immediately after the existing neutral seam line, per the plan's exact interface spec - the existing top-level :root block at the top of globals.css was left untouched."
  - "For non-text indicators with no explicit paired background declaration in their own CSS rule (RoleBadgeCard.stages.module.css's connector line/marker ring/border-top mixes), the comparison background used for contrast proofs is --surface-card - chosen because MemberBadgeChain.module.css's own analogous rule explicitly pairs its role-accent/--border-subtle border-color mix with background: var(--surface-card) in the same declaration block, confirming this as the family's intended ambient surface."
  - "For the /me/projects role-row indicator, whose own CSS sets background: var(--surface-muted) (an undefined custom property - see Deviations), the contrast proof approximates the row's 'own background' as --surface-card, the closest resolvable concrete ambient surface."
  - "Every restored formula that provably falls short of its locked WCAG threshold is asserted via its exact, currently-measured failing-hex set (not silently passed, not loosened) - extending UI-SPEC's own explicit failure-reporting instruction for the FansubEdit toggle 'highest-risk row' consistently to every other formula found to fail the same way."

requirements-completed: []

# Metrics
duration: ~70min
completed: 2026-09-05
---

# Phase 148 Plan 02: Derive --role-accent from the data-color-key seam and prove restored contrast Summary

**Added the single `--role-accent` derivation point in `globals.css` (feeding it from the already-working `[data-color-key]`/`--role-chip-accent` catalog seam), removed the dead `--role-accent-default` fallback from the three simple CSS modules whose only defect was that dead source, and extended `roleCatalog.accessibility.test.ts` with real-CSS-text-driven WCAG contrast proofs for every restored formula across the whole phase — discovering that several of those pre-existing, locked-ratio formulas (not just the UI-SPEC's predicted FansubEdit "highest-risk row") measurably fall short of their contrast threshold, and flagging each explicitly rather than hiding it.**

## Performance

- **Duration:** ~70 min
- **Tasks:** 2
- **Files modified:** 5 (+ 1 planning doc)

## Accomplishments

- `globals.css` now derives `--role-accent` from the catalog seam via exactly two new rules (`:root { --role-accent: #596176; }` and `[data-color-key] { --role-accent: var(--role-chip-accent, #596176); }`), placed immediately after the existing neutral seam line — no new hex chosen, no `[data-role-code]` selector introduced.
- `PublicNoteCard.module.css`, `ProjectMemberPage.module.css`, and `ProjectMemberReleasesSection.module.css` all read `var(--role-accent)` with the dead `, var(--role-accent-default)` fallback removed at every site (4 + 3 + 3 = 10 sites); every color-mix ratio is byte-for-byte unchanged per the Restoration Rule.
- `ProjectMemberPage.module.css`'s stale comment now correctly names `data-color-key` (not `data-role-code`) as the actual color driver.
- `roleCatalog.accessibility.test.ts` grew from 2 to 17 tests, covering `PublicNoteCard` (`.head`/`.role`/`.avatar`/stripe), the three role-chip surfaces (`ProjectMemberPage`, `ProjectMemberReleasesSection`, `MemberCurrentProjectsSection`), `RoleBadgeCard.stages.module.css` + `MemberBadgeChain.module.css`'s non-text border/box-shadow mixes, `FansubEdit.module.css`'s role-toggle (both states) and historical-role label, and the `/me/projects` role-row border indicator — all 15 `ROLE_COLOR_KEYS` per surface, with every color-mix percentage extracted from the real CSS/TSX text via regex (never hand-copied).
- **Major finding, honestly reported rather than hidden:** several restored formulas — all locked, pre-existing ratios per the Restoration Rule — do not meet their WCAG threshold for some or all 15 catalog hexes. See Deviations below and `deferred-items.md` for the full breakdown.

## Task Commits

Each task was committed atomically:

1. **Task 1: globals.css derivation plus fallback removal in the three simple modules** - `42afd13b` (fix)
2. **Task 2: Extend roleCatalog.accessibility.test.ts with contrast proofs for every restored formula** - `281182d1` (test)

## Files Created/Modified

- `frontend/src/styles/globals.css` - new `:root`/`[data-color-key]` `--role-accent` derivation
- `frontend/src/components/public/PublicNoteCard.module.css` - dead fallback removed at 4 sites
- `frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css` - dead fallback removed at 3 sites; stale comment corrected
- `frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.module.css` - dead fallback removed at 3 sites
- `frontend/src/lib/roleCatalog.accessibility.test.ts` - 15 new contrast-proof `it()` blocks across 6 new `describe()` groups
- `.planning/phases/148-rollenfarben-wieder-an-den-katalog-anschlie-en/deferred-items.md` - documents the undefined `--surface-muted` token and the full known-gap formula list

## Decisions Made

See `key-decisions` in the frontmatter above for the full rationale on: (1) rule placement in `globals.css`, (2) the `--surface-card` comparison-background choice for `RoleBadgeCard.stages.module.css`'s indicators (justified by `MemberBadgeChain.module.css`'s own paired `background: var(--surface-card)` declaration), (3) the same `--surface-card` approximation for `/me/projects`' row (whose real background token is undefined), and (4) the decision to generalize UI-SPEC's FansubEdit-specific failure-reporting instruction to every formula that provably fails, rather than silently forcing a pass.

## Deviations from Plan

### Auto-fixed Issues

None — Task 1 was a byte-for-byte, single-source-swap restoration exactly as specified; no bugs were found requiring an inline fix.

### Major finding (not a deviation from the plan's instructions, but a significant discovery made *by* following them)

Task 2 required computing genuine WCAG contrast (not trusting ratios by eye), extracting every percentage from real CSS text. Doing so surfaced that several restored formulas — **all pre-existing, locked ratios that Task 1 was expressly forbidden from changing (Restoration Rule)** — measurably fail their locked threshold:

**Fails for all 15 catalog hexes:**
- `PublicNoteCard.module.css` `.head`/`.role` (55%/38% ratio pair): every hex measures ~4.01:1-4.37:1, short of the 4.5:1 AA text floor.
- `ProjectMemberPage.module.css`, `ProjectMemberReleasesSection.module.css`, `MemberCurrentProjectsSection.module.css` — all three `.roleChip`/`.roleTag` borders (`color-mix(role-accent 32-34%, transparent)`, composited over the chip's own tinted background): 0 of 15 pass 3:1.
- `RoleBadgeCard.stages.module.css` (4 formulas at 42%/36%/30%/32%) and `MemberBadgeChain.module.css` (1 formula at 32%), all mixed with `--border-subtle` and composited over `--surface-card`: 0 of 15 pass 3:1, for all 5 formulas.

**Fails for 1-2 specific hexes** (`#c26a2e`, and `#6b7f2a` for the FansubEdit toggle):
- `PublicNoteCard` stripe vs the secondary `--color-border` adjacency (passes comfortably vs the primary `--surface-card`).
- `ProjectMemberPage .roleChip` text.
- `FansubEdit` role-toggle, both unselected and selected states — **this confirms the UI-SPEC's own prediction** that this is the phase's highest-risk row.
- `FansubEdit` historical-role small label.

Per the UI-SPEC's own explicit instruction for the FansubEdit toggle ("if any of the 15 hex values fails ... report the failing hex(es) ... rather than silently forcing the assertion to pass"), this same treatment was applied consistently to every formula that provably fails the same way: `roleCatalog.accessibility.test.ts` asserts the exact, currently-measured failing-hex set per formula (a regression-detecting "known gap" snapshot), never hidden behind a loosened threshold or a fabricated pass. None of these ratios were changed — fixing them is a formula-level change outside both tasks' file scope (Task 1 touched only `globals.css` + 3 simple modules; Task 2 touched only the test file), and the UI-SPEC pre-authorizes a formula fix (without touching the locked hex palette) only for the FansubEdit toggle specifically.

**This needs a follow-up decision**, tracked in `deferred-items.md`: either accept the restored-to-parity (also non-compliant) visual state as sufficient for this phase's goal, or add a dedicated remediation plan that raises these mix percentages using the same locked-hex-preserving pattern UI-SPEC pre-authorized for the FansubEdit row.

### Out-of-scope discoveries (logged, not fixed)

- Pre-existing `tsc --noEmit` failure in a generated Next.js route-type file (already logged in `deferred-items.md` from Plan 01; unaffected by this plan).
- `--surface-muted` (used by `/me/projects`' `.roleDetailRow` and `GroupMediaReviewSection.module.css`) is referenced but never defined anywhere in `globals.css` — a pre-existing, out-of-scope gap. Newly documented in `deferred-items.md` this plan, since Task 2's contrast proof for the `/me/projects` role row needed a concrete background to test against and had to approximate it as `--surface-card`.

## Issues Encountered

None beyond the contrast-formula finding documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Task 1's acceptance criteria all pass: the `[data-color-key]` derivation rule exists exactly once with the correct neutral fallback; zero `, var(--role-accent-default)` references remain in the three simple modules; the pre-existing accessibility test (now folded into the extended suite) still passes.
- Task 2's acceptance criteria pass: `npx vitest run src/lib/roleCatalog.accessibility.test.ts` exits 0 (17/17 tests); every behavior-listed surface has at least one assertion looping over all 15 `ROLE_COLOR_KEYS`, reading real CSS/TSX text via regex.
- `npx tsc --noEmit` and `npx eslint` are clean on every file this plan touched (the one pre-existing route-type error is unrelated and already logged).
- Ready for Plan 148-03 (`RoleBadgeCard.module.css` + `MemberBadgeChain.tsx` — connects the role-progress badge card's dead per-code selectors to the same `data-color-key` seam this plan built) and Plan 148-04 (`FansubEdit.module.css` + `FansubAppMembersOverview.tsx` — removes the toggle's dead `--role-accent-default` self-assignment and the third broken `getRoleClassName()` color mapping). Both depend on this plan (`depends_on: ["148-01", "148-02"]`) and can now build on the working `--role-accent` derivation.
- The major contrast finding above should be surfaced to the user/orchestrator as a phase-level open question before Phase 148 is considered fully closed, since it affects several of the phase's "restored" surfaces beyond the one row the UI-SPEC anticipated.

---
*Phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en*
*Completed: 2026-09-05*

## Self-Check: PASSED

All 5 `files_modified` paths plus `deferred-items.md` verified present on disk; both task commit
hashes (`42afd13b`, `281182d1`) verified present in `git log --oneline --all`.
