---
phase: 157-projekt-memberseite-visuelles-referenzdesign
plan: 10
subsystem: ui
tags: [react, nextjs, css-modules, testing-library, playwright, accessibility]

# Dependency graph
requires:
  - phase: 157-projekt-memberseite-visuelles-referenzdesign (plans 157-01..09)
    provides: the Texte-&-Notizen timeline (ProjectMemberNoteEntry), the shared useClampedOverflow
      hook, the role-color data-color-key -> --role-accent seam, and the 157-UAT.md GAP-01 finding
      this plan closes
provides:
  - A markup-valid ProjectMemberNoteEntry (<article> root, single trailing stretched-link <a>) with
    zero nested-interactive-markup, proven on real rendered DOM and in a live browser
  - Role color consolidated onto the timeline dot alone; a single uniform subtle card border
  - 3-line (was 4-line) collapsed preview clamp
  - Extended ProjectMemberNotesSection.test.tsx test matrix (17 tests, 9 pre-existing + 8 new)
  - Extended shot-projectmember.mjs live-UAT script assertions (dot-color, border uniformity,
    zero nested-interactive violations, 3-line clamp bound)
affects: [157-UAT.md GAP-01, any future projectMember timeline work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS-only stretched-link pattern: a position:static trailing <Link> whose ::after
       (position:absolute; inset:0) escapes to the position:relative .entry ancestor, giving a
       full-card click target without wrapping interactive children in an <a>"
    - "z-index escape for interactive descendants above a stretched-link overlay (.toggle and
       .body a get position:relative; z-index:2, above the overlay's z-index:1)"

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx
    - frontend/scripts/shot-projectmember.mjs

key-decisions:
  - "Root element changed from a whole-row <Link> to a plain <article>; the release-detail link is
     now a single trailing <Link> (.entryLink) wrapping only the chevron, using a CSS ::after
     stretched-link overlay so it stays the sole <a> in the entry while the whole card remains
     clickable/keyboard-reachable."
  - "Role color now flows through exactly one carrier (.dot's background: var(--role-accent));
     .entry's border-inline-start was removed entirely and its remaining border switched from
     var(--color-border) to var(--border-subtle)."
  - "Clamp reduced from 4 to 3 lines per 157-UAT.md's explicit '2-3 Zeilen' target, implemented as
     exactly 3 (max-height: calc(3 * 1.65em), -webkit-line-clamp: 3)."
  - "The 'Contribution ohne Zielroute' GAP-01 test-matrix item is documented as not representable
     today (release_version_id is a non-nullable number in ProjectMemberNote) rather than
     fabricating an optional/nullable prop to satisfy the letter of the matrix."

patterns-established:
  - "Whole-card-navigable + independently-interactive-children: CSS-only stretched-link overlay
     (::after inset:0, z-index:1) with explicit z-index:2 escapes for any interactive descendant,
     instead of wrapping everything in one <a> and using preventDefault/stopPropagation to patch
     around invalid nested markup."

requirements-completed: [P157-05, P157-06, P157-13]

# Metrics
duration: ~27min
completed: 2026-09-13
---

# Phase 157 Plan 10: GAP-01 Contribution-Timeline Markup + Visual Consolidation Summary

**Fixed the nested-interactive-markup defect in ProjectMemberNoteEntry with a CSS-only
stretched-link pattern, consolidated role color onto the timeline dot alone (removed the
competing colored left border), and reduced the collapsed preview clamp from 4 to 3 lines.**

## Performance

- **Duration:** ~27 min
- **Started:** 2026-09-13T11:15:00Z (approx.)
- **Completed:** 2026-09-13T11:42:00Z
- **Tasks:** 3/3 completed
- **Files modified:** 4

## Accomplishments

- `ProjectMemberNoteEntry` no longer renders a `<button>` or a body-content `<a>` nested inside its
  own whole-row `<a>` — the previous `<Link>`-wraps-everything shape is replaced with a plain
  `<article>` root plus a single trailing stretched-link `<Link>` (wrapping only the chevron), with
  the toggle button and any body-HTML links raised above the overlay via `position: relative;
  z-index: 2`. Verified structurally (grep-level `<Link>` count = 1) and behaviorally (real-DOM
  `querySelector('a, button')` absence test, plus a live-browser
  `noteNestedInteractiveViolations === 0` assertion).
- Role color now has exactly one carrier: `.dot`'s `background: var(--role-accent)`. The
  `border-inline-start: 3px solid var(--role-accent)` double-marking flagged in `157-UAT.md` is
  gone; `.entry`'s remaining border uses the existing `--border-subtle` token (uniform on all four
  sides, confirmed live via `noteBorderUniformity`: `borderTopWidth === borderInlineStartWidth`
  for every entry across mobile/tablet/desktop).
- Collapsed preview clamp reduced from 4 to 3 lines (`-webkit-line-clamp: 3`,
  `max-height: calc(3 * 1.65em)`), matching `157-UAT.md`'s "2-3 sichtbare Zeilen" target.
- `.entry:focus-within` now shows the focus ring/border-outline on the whole card whenever the
  toggle button or the entry link has focus (keyboard operability preserved and made visually
  explicit at the card level, not just on the individual focused control).
- All 9 pre-existing `ProjectMemberNotesSection.test.tsx` tests (8 in the `ProjectMemberNoteEntry`
  describe block + 1 in `ProjectMemberNotesSection`) pass unmodified — they already queried
  `getByRole('link')`/`getAllByRole('link')`, which after the change resolves to the new sole
  `entryLink` anchor. 8 new tests added (17 total), covering the full GAP-01 matrix item list from
  the run instructions.
- Live `shot-projectmember.mjs` script extended with three new proof points, run against the real
  dev stack for all three viewports (mobile/tablet/desktop), all green: dot-color diagnostic
  (replacing the removed border-inline-start-color read), border-uniformity check, and
  nested-interactive-violation count (0).

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix nested-interactive markup and consolidate role-color/border markers** -
   `51f76589` (fix)
2. **Task 2: Adapt existing tests to the new anchor structure and add the full GAP-01 test matrix** -
   `05b24745` (test)
3. **Task 3: Extend the live-UAT screenshot script, run full verification, capture before/after
   metrics** - `d1ccda03` (test)

**Plan metadata:** (this commit, following this SUMMARY)

## Files Created/Modified

- `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx` - root changed from
  `<Link>` to `<article>`; single trailing stretched-link `<Link>` wraps only the chevron; toggle
  `onClick` simplified (no more `preventDefault`/`stopPropagation`, unnecessary once the button is
  no longer nested inside an anchor)
- `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css` - removed
  `border-inline-start`; `.entry` border switched to `--border-subtle`; added `.entry:focus-within`,
  `.entryLink`/`.entryLink::after` (stretched-link overlay), `.body a` and `.toggle` z-index
  escapes; `.bodyClamped` reduced from 4 to 3 lines
- `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx` - 8 new tests
  appended (nested-interactive-markup absence, independent body-link clickability, very-short/
  very-long entry compactness, clamp-boundary both sides, multi-entry independent state, keyboard
  focus reachability) plus a documentation comment for the non-representable "no target route"
  matrix item
- `frontend/scripts/shot-projectmember.mjs` - `noteAccentColorSamples` now reads the dot's computed
  background color instead of the removed `border-inline-start-color`; new `noteBorderUniformity`
  and `noteNestedInteractiveViolations` facts with throw-on-violation checks; `notePreviews` bound
  updated from `4 * lineHeight` to `3 * lineHeight`

## Decisions Made

- Kept the release-detail navigation target on a `<Link>` (Next.js router-aware) rather than a
  plain `<a>`, preserving client-side navigation; only its DOM position/scope changed (trailing
  chevron-only anchor instead of whole-row wrapper).
- Did not touch `useClampedOverflow.ts`, `PublicNoteCard.tsx`, `ReleaseNotesList.tsx`, the Hero, or
  any backend/data-model file, per the run's hard scope boundary.
- Documented rather than implemented the "Contribution ohne Zielroute" GAP-01 matrix item: no
  fabrication of an optional/nullable `release_version_id`.

## Deviations from Plan

None - plan executed exactly as written. No Rule 1-4 auto-fixes were needed during implementation;
the two full-suite test failures discovered while re-verifying no regressions were pre-existing,
unrelated to any file this plan touched, and were logged (not fixed) — see "Backend/Test Gaps
Discovered (Documented, Not Fixed)" below.

## Backend/Test Gaps Discovered (Documented, Not Fixed)

No backend or data-model gap was discovered in this plan's scope (GAP-01 is purely a frontend
markup/CSS defect, and `release_version_id`'s non-nullability was already known and is explicitly
out of scope — see Task 2's documentation comment).

Two pre-existing, unrelated test failures were found while running the full frontend suite (not
part of this plan's targeted verification, but run as an extra regression check) and are logged in
`.planning/phases/157-projekt-memberseite-visuelles-referenzdesign/deferred-items.md` under
"2026-09-13 — Plan 157-10 (GAP-01): two pre-existing full-suite failures unrelated to this plan":

1. `frontend/src/lib/cssCustomProperties.guard.test.ts` — a hardcoded line number (282) in its own
   `KNOWN_NON_CSS_TEXTUAL_MENTIONS` allow-list no longer matches the actual line (268) of the
   referenced string in `roleCatalog.accessibility.test.ts`, because that file was edited by an
   earlier, unrelated commit (`1332686b`, plans 157-07/08/09). Not fixed here — neither file is in
   this plan's `files_modified`.
2. `frontend/src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx` — 2 tests time out
   at the default 5000ms under full-suite parallel load; last touched by an unrelated Phase 151
   commit (`f4b8b560`). Not fixed here.

Neither failure appears in this plan's own scoped verification (targeted `vitest run` of
`ProjectMemberNotesSection.test.tsx`, which is fully green at 17/17).

## Live-UAT Verification (Task 3)

Ran `docker restart team4sv30-frontend && node scripts/shot-projectmember.mjs` against the real
dev stack (`http://127.0.0.1:3300` proxy, per project convention) for all three viewports. Exit
code 0, no thrown assertion errors, for two separate runs (label `before` and a `recheck` rerun
used to confirm a one-off desktop screenshot timing flake was not systemic — see below).

**Before/after metrics (mobile, matching `157-UAT.md`'s documented before-state from Plan 157-09,
commit `1332686b`):**

| Metric | Before (157-09, 4-line clamp) | After (157-10, 3-line clamp) |
|---|---|---|
| Mobile preview height, overflowing (clamped) entry | 105.56px | **79.17px** |
| Mobile preview height, short (non-overflowing) entry | 26.39px | 26.39px (unchanged, honestly — a short entry was never clamped and has no reason to shrink further) |
| Hero height, mobile/tablet | 196px | 196px (unchanged — Hero is out of scope for this plan) |
| Hero height, desktop | 212px | 212px (unchanged — Hero is out of scope for this plan) |
| Card border | 1px `--color-border` + 3px colored `border-inline-start` (double marker) | 1px `--border-subtle`, uniform on all sides (single marker, color moved entirely to `.dot`) |
| Nested interactive violations | not previously measured (this plan added the assertion) | **0** across all 3 viewports |

The clamped-entry height dropped from 105.56px to 79.17px (-25%), directly reflecting the 4→3 line
change (3 × 1.65em ≈ 79.2px, matching the measured 79.171875px almost exactly). The short entry's
height is unchanged because it was never clamped in the first place — stated plainly rather than
implying an improvement that did not occur for that case.

**Structural proofs (all three viewports, live browser):**
- `noteBorderUniformity`: `borderTopWidth === borderInlineStartWidth` (both `"1px"`) for every
  entry — no second colored edge.
- `noteAccentColorSamples`: `dotColor` (e.g. `rgb(123, 60, 78)` for `#7b3c4e`) correctly resolves
  per entry via the `data-color-key` seam; the removed `border-inline-start-color` read was
  replaced, not just deleted.
- `noteNestedInteractiveViolations`: `0` for all three viewports.
- `horizontalOverflow`: `false` for all three viewports.
- `notePreviews`: heights bounded by `3 * lineHeight + 1` for every entry; `overflow === hasToggle`
  holds (a "Mehr anzeigen" toggle appears if and only if the content actually overflows the new
  3-line bound).

**Browser visual sign-off:** Screenshots captured for mobile (390×844), tablet (768×1024), and
desktop (1440×900), each showing Hero → Tabs → the Texte-&-Notizen timeline (multiple text
contributions, one member with a single role, `#7b3c4e` Typesetting color) → the transition into
Bilder & Medien. Visually confirmed: uniform subtle card borders (no doubled colored edge), the
role color visible only as the small timeline dot, short entries compact, longer entries clamped
to 3 lines with a "Mehr anzeigen" toggle, no console errors, no horizontal overflow, and the
Team4s design language (surface/border/radius tokens) preserved with zero new tokens or
project-specific CSS. One incidental observation: a single desktop `fullPage` screenshot capture
(from the first `before` run) showed the Notizen/Medien sections still in their "Wird geladen …"
loading state — a pre-existing timing characteristic of the (untouched, out-of-scope per this
plan's constraints) screenshot mechanic's `networkidle` wait not covering a subsequent client fetch
round-trip; a `recheck` rerun of the identical unmodified script against the identical page
reproduced the fully-loaded desktop state cleanly, confirming this was a one-off capture-timing
flake, not a rendering regression from this plan's changes (the `facts` extraction step later in
the same script run, which runs after the screenshot, always saw the fully-loaded 12-entry list in
both runs).

**Keyboard/focus/accessibility (unit-test-level, matching the run's mandated matrix):**
- `supports keyboard activation of the whole-card link` proves the entry link is
  `.focus()`-reachable and becomes `document.activeElement`.
- `.entry:focus-within` (CSS, verified by inspection) shows the whole-card focus ring whenever the
  toggle button or entry link is focused.
- `renders no nested interactive markup even when the body contains a link` and `keeps the body
  link independently clickable and does not trigger navigation through it` jointly prove links
  inside note content remain independently operable and do not collapse into the entry's own
  anchor.

**Mandated matrix coverage (157-UAT.md "Tests (Pflicht)" list), mapped to concrete tests/checks:**
very-short entry / very-long entry / clamp boundary → the 4 new `ProjectMemberNoteEntry` unit
tests; expand/collapse → pre-existing toggle tests (unmodified, still green) plus the live script's
expand/collapse round-trip; multiple entries → the new multi-entry independent-state test plus the
pre-existing `ProjectMemberNotesSection` pagination test; single/multiple roles + correct role
colors → the pre-existing single-role and `hasMultipleRoles` tests plus the unmodified P157-13
Nachtrag 2 mixed-role regression test (still green, unaffected — `data-color-key` stayed on the
anchor, only the anchor's DOM position changed); contribution with a target route → every existing
test (all notes have `release_version_id`); contribution without a target route → documented as
not representable (see Task 2's comment, not fabricated); links within content →
the two new body-link tests; keyboard navigation/focus → the new keyboard-focus test plus
`.entry:focus-within`; mobile/tablet/desktop → the live script's 3-viewport run; browser zoom →
out of this plan's tooling (no automated 200%-zoom check was added or run for this plan; the
existing zoom-reflow check in the script's `SHOT_VERIFY_HERO` branch tests the Hero, which is
explicitly out of scope here — this specific matrix cell is therefore honestly reported as
**not independently re-verified by this plan** rather than claimed); no horizontal overflow → the
live script's `horizontalOverflow` fact, `false` on all three viewports.

## Issues Encountered

None blocking. See "Backend/Test Gaps Discovered" above for the two pre-existing, unrelated
full-suite failures found during an extra (non-mandated) full regression pass, and the desktop
screenshot timing note in "Live-UAT Verification" above.

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data sources were introduced.

## Threat Flags

None. This plan is purely presentational/markup — no new endpoint, query parameter, or trust
boundary was introduced (matches the plan's own `<threat_model>` disposition of "accept, no new
surface").

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

GAP-01 from `157-UAT.md` is closed at the implementation/automated-verification level. Phase 157
as a whole is **NOT** marked complete — the phase's final Live-UAT checkpoint (human
`checkpoint:human-verify gate="blocking"` sign-off, tracked separately in `157-06`'s Task 4 and
carried forward) remains an explicit human acceptance step outside this plan's authority to close.
`STATE.md` and `ROADMAP.md` are updated to reflect plan 157-10 itself as complete, without altering
Phase 157's overall "NICHT vollstaendig abgenommen" status.

---
*Phase: 157-projekt-memberseite-visuelles-referenzdesign*
*Completed: 2026-09-13*

## Self-Check: PASSED

All 4 modified files confirmed present on disk; all 4 commit hashes
(`51f76589`, `05b24745`, `d1ccda03`, `0c41981a`) confirmed present in `git log --oneline --all`.
