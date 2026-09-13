---
phase: 157-projekt-memberseite-visuelles-referenzdesign
reviewed: 2026-09-13T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css
  - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx
  - frontend/scripts/shot-projectmember.mjs
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 157: Code Review Report

**Reviewed:** 2026-09-13
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the 157-10 gap-closure fix that converts `ProjectMemberNoteEntry`'s root
element from a whole-row `<Link>` (which illegally nested a `<button>` and
potentially an `<a>`) to a plain `<article>` with a single trailing CSS-only
stretched-link `<a>` (`::after; position:absolute; inset:0`), and consolidates
role color onto the `.dot` element.

I traced the CSS stacking order by hand (`.entry` establishes the positioned
containing block via `position: relative`; `.entryLink` itself stays
`position: static`, so its `::after` inherits `.entry` as its containing
block and correctly stretches over the *whole* card, not just the chevron;
`.body a` and `.toggle` are explicitly raised to `z-index: 2`, above the
overlay's `z-index: 1`, and no intermediate ancestor establishes a new
stacking context that would break that comparison). The core mechanism is
sound and no nested-interactive markup remains — no BLOCKER-level defect was
found in the fix itself.

However, the verification story around this fix is weaker than the test names
imply, and one residual accessibility edge case was introduced/retained. No
critical/security issues were found. Four WARNING-level findings and two INFO
items are listed below — all should be addressed before treating GAP-01 as
fully closed with high confidence, since several of the added tests currently
assert only DOM structure/identity rather than the click-through and
keyboard-activation behavior their titles claim to verify.

## Warnings

### WR-01: Tests claim to verify click-through/keyboard-activation behavior but only assert DOM identity

**File:** `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx:200-215` and `:291-296`

**Issue:** Two tests are named for exactly the behavior this gap-closure plan
was supposed to fix, but neither one actually exercises it:

```tsx
it('keeps the body link independently clickable and does not trigger navigation through it', () => {
  ...
  const bodyLink = screen.getByRole('link', { name: 'Link' })
  const entryLink = screen.getByRole('link', { name: /Beitrag ansehen/ })
  expect(bodyLink).not.toBe(entryLink)
  expect(screen.getAllByRole('link')).toHaveLength(2)
})
```

This only proves two distinct `<a>` nodes exist in the tree. It never clicks
the body link, never checks that clicking it fires its own `href`/`onClick`
instead of the entry's navigation, and never inspects the computed
`position`/`z-index` that make the stretched-link overlay not intercept it.
`fireEvent.click()` in RTL/jsdom dispatches directly on the target node and
bypasses browser hit-testing/layout entirely, so this specific class of bug
(an overlay visually covering and intercepting clicks) is structurally
untestable at the unit-test layer with this approach — the test should not
claim to cover it.

Likewise:

```tsx
it('supports keyboard activation of the whole-card link', () => {
  render(<ProjectMemberNoteEntry note={note()} projectPath="/p" hasMultipleRoles={false} />)
  const entryLink = screen.getByRole('link', { name: /Beitrag ansehen/ })
  entryLink.focus()
  expect(document.activeElement).toBe(entryLink)
})
```

This only proves the link is focusable (true of any native `<a href>`
regardless of this fix); it never simulates `Enter`/`Space` activation or
verifies any resulting effect.

Cross-checking `frontend/scripts/shot-projectmember.mjs` (the real-browser
verification path) confirms the gap: it asserts `noteNestedInteractiveViolations === 0`
(a structural check, good) and does perform a genuine behavioral click-test
for the "Mehr anzeigen"/"Weniger anzeigen" toggle (lines 291-304, measuring
real `getBoundingClientRect()` heights before/after click), but it never
clicks a body-embedded link to confirm it navigates independently instead of
triggering the card's overlay link — the one interaction this whole fix was
about. If no live note in the fixture path
(`/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type`) happens to
contain a body link, this scenario is never exercised in a real browser
either.

**Fix:** Either (a) rename these two unit tests to describe what they
actually assert (structural presence/identity, focusability) so they stop
overclaiming coverage, and/or (b) add a genuine Playwright behavioral check in
`shot-projectmember.mjs` that renders/finds a note with a body link, clicks
directly on the link's text, and asserts `page.url()` changed to the link's
own `href` (not the entry's release href) — mirroring the existing toggle
click-test pattern already used for "Mehr/Weniger anzeigen" in that script.

### WR-02: Color-propagation tests assert on the element that has no effect, not the one that actually carries `--role-accent`

**File:** `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx:108-115`, `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx:66,79`

**Issue:** `data-color-key` is set on *two* elements: the `<article>` root
(line 72, which is what actually needs it — `.dot`'s
`background: var(--role-accent)` relies on `--role-accent` inheriting down
from this attribute via the `[data-color-key]` rule in `globals.css`) and
also on the trailing `<Link>` (line 111). Nothing under `.entryLink` consumes
`--role-accent` — `.chevron` is colored via `var(--text-muted)`, not the role
accent — so the copy on `Link` has zero visual effect. It is dead weight left
over from before the consolidation onto `.dot` (the commit message for
157-10 explicitly says "consolidate role color to dot," but a second,
functionally-inert carrier still exists).

The tests then assert on exactly this dead copy:

```tsx
expect(link.getAttribute('data-color-key')).toBe(boundedColorKey('#6b7f2a'))
```

Both attributes currently hold the same value, so the test passes, but it is
not verifying the thing that actually matters. If a future cleanup removes
the (apparently redundant) attribute from `Link` — matching the stated
"single carrier" design — these tests would report a false regression even
though the dot's color continues to work correctly via `.entry`'s own
attribute. Conversely, if `.entry`'s own `data-color-key` were ever
accidentally dropped while the copy on `Link` remained, these tests would
pass while the dot silently renders with the neutral fallback color in
production.

**Fix:** Remove the redundant `data-color-key` from the `<Link>` (line 111) to
match the stated single-carrier design, and change the tests to assert on the
`article`/`[data-note-entry]` element (or on `.dot`'s resolved
`background-color` in the Playwright script, which already does this
correctly via `getComputedStyle(dotEl).backgroundColor` at
`shot-projectmember.mjs:150-155` — that check is the right pattern to mirror
in the unit tests' target element, even though jsdom can't compute real CSS
values).

### WR-03: Clamped body text can leave a fully/partially clipped link keyboard-focusable

**File:** `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css:96-108`

**Issue:** `.bodyClamped` clips content via `-webkit-line-clamp: 3` +
`overflow: hidden` (reduced from 4 lines by this same change, increasing the
odds that any given rich-text body's inline link ends up clipped). `.body a`
is deliberately raised to `position: relative; z-index: 2` so it stays
clickable when *visible*. But raising `z-index` does not remove a
now-invisible (fully clipped) link from the natural tab order — a keyboard
user can `Tab` onto a link that isn't rendered inside the collapsed preview
at all. The only focus feedback in that state is `.entry:focus-within`'s
card-level `box-shadow` (line 18-21 of the CSS), which indicates "something
in this card has focus" but gives no visual cue as to *what*, since the
actual focused element is not on screen. This is a `WCAG 2.4.7`-adjacent gap:
focus indication exists, but not at the location of the focused control.

**Fix:** When a note is collapsed (`!isExpanded`) and overflowing, either
strip interactive elements inside the clamped preview from the tab order
(`tabIndex={-1}` toggled with the `isExpanded` state, e.g. by post-processing
anchors inside `contentRef.current` when collapsed) or accept this as a
documented limitation — but it should be a conscious tradeoff, not a silent
side effect of dropping the clamp from 4 to 3 lines.

### WR-04: `.entry` does not scope its own stacking context, so the overlay's z-index values leak into the page-global stacking order

**File:** `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css:6-16, 127-132`

**Issue:** `.entry` uses `position: relative` without a `z-index`
(so `z-index: auto`), which per spec does **not** create a new stacking
context. The `z-index: 1` on `.entryLink::after` and `z-index: 2` on
`.body a` / `.toggle` are therefore compared against the *entire* page's
stacking order (whatever ancestor actually does establish a stacking
context, e.g. `<body>` or a distant layout wrapper), not scoped to this
component. In the current page this appears to work correctly, but any
unrelated component sharing this page with an element carrying an explicit
`z-index` of `1` or `2` (a sticky/fixed nav bar, tooltip, modal backdrop,
etc.) will interleave with this card's overlay/interactive-elevation logic in
an unpredictable way, since there is nothing locally containing the
comparison.

**Fix:** Add `isolation: isolate;` to `.entry` so the stacking context (and
its numerically small, easy-to-collide `z-index` values) stays local to the
component, which is the standard hardening step for the CSS-only
stretched-link pattern.

## Info

### IN-01: `shot-projectmember.mjs` gathers role-color proof but never asserts on it

**File:** `frontend/scripts/shot-projectmember.mjs:148-156`

**Issue:** `noteAccentColorSamples` computes each entry's real `.dot`
`background-color` via `getComputedStyle`, which is exactly the right check
for P157-13's "role color MUST remain visible at every entry" requirement —
but the result is only appended to the printed JSON `facts`, never compared
against an expected value or thrown on mismatch (unlike
`noteBorderUniformity` and `noteNestedInteractiveViolations` a few lines
below, which do `throw` on violation).

**Fix:** Add a throwing check, e.g. verifying `dotColor` is not the neutral
fallback (`--role-accent: #596176`) whenever `colorKey !== 'neutral'`, so a
future regression in the color pipeline fails the script instead of relying
on a human reading the JSON output.

### IN-02: Duplicate boundary-style tests without added signal

**File:** `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx:239-263`

**Issue:** "shows no expand control exactly at the clamp boundary"
(`scrollHeight: 79, clientHeight: 79`) and "shows the expand control one
pixel past the clamp boundary" (`scrollHeight: 80, clientHeight: 79`) are
good, legitimate boundary tests. However, they duplicate the same
scroll/client-height mocking pattern already covered by "toggles Mehr/Weniger
anzeigen for overflowing text" and "does not show a redundant expand control
for text that fits on a wider screen" a few lines above, just with different
numeric values close to the same threshold. Not a defect, but worth
consolidating into a single parameterized test (`it.each`) to reduce
duplication per the project's stated preference for maintainable test
suites.

---

_Reviewed: 2026-09-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
