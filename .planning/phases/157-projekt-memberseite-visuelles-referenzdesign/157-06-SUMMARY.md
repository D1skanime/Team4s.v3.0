---
phase: 157-projekt-memberseite-visuelles-referenzdesign
plan: 06
subsystem: ui
tags: [react, nextjs, vitest, go, live-uat, projectMember]
status: checkpoint-open

# Dependency graph
requires:
  - phase: 157-projekt-memberseite-visuelles-referenzdesign (plans 01-05)
    provides: backend episodes count, hero/stat/nav/band rebuild, note timeline with mandatory role color, media gallery + releases cleanup
provides:
  - Green full frontend suite (lint/typecheck/vitest) and green full backend suite (build/vet/test) for everything Phase 157 touched
  - Extended frontend/scripts/shot-projectmember.mjs live-UAT evidence (before/after facts, both viewports)
  - An OPEN Task-4 live-UAT checkpoint — NOT signed off, per plan's own `checkpoint:human-verify gate="blocking"` design
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx
    - frontend/scripts/shot-projectmember.mjs
    - frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.module.css
    - .planning/phases/157-projekt-memberseite-visuelles-referenzdesign/deferred-items.md
---

<summary>

## Status: Tasks 1-3 complete. Task 4 (Live-UAT sign-off) OPEN — NOT approved, NOT rejected.

Plan 157-06 is Phase 157's closing verification plan. Its Task 4 is an explicit
`checkpoint:human-verify gate="blocking"` — the plan itself requires a human to browse the live
page and compare it point-by-point against 157-CONTEXT.md's "Referenz-Spezifikation in Worten"
before the phase can be considered accepted. That sign-off has not happened. Do not read this
SUMMARY as "phase complete" — `STATE.md`/`ROADMAP.md` deliberately still show 157-06/Phase 157 as
outstanding.

### Tasks 1-3 (automated, complete, committed)

- Task 1: closed the last tracked `tsc --noEmit` gap (`episodes` field missing from two
  `ProjectMemberCounts` fixtures in `page.test.tsx`, tracked since Plan 157-01/04); live-measured
  zero horizontal overflow at 320/390/768/1024/1440px against the real route.
- Task 2: full frontend suite (lint/typecheck/vitest) green, zero regressions; full backend suite
  (`go build`/`go vet`/`go test`) green for every Phase-157-touched package, including the new
  `TestProjectMemberEpisodesCountUnionDedup` and `TestProjectMemberGetSummary_ReturnsEpisodesCount`.
  Pre-existing, environment-caused backend failures (55 total, `internal/migrations` +
  `internal/repository`) documented in `deferred-items.md`, unrelated to any Phase 157 file.
- Task 3: extended (not replaced) `shot-projectmember.mjs` to cover hero/stat/nav/band, notes
  timeline, media, and releases-empty-state at mobile+desktop; produced the before/after table
  below.

### Task 4: independent second-reviewer findings (2026-09-12)

A second, independent reviewer ran their own Playwright pass over the same `127.0.0.1:3300` proxy
(both viewports, fresh frontend restart) and explicitly declined to approve or reject the
checkpoint — Task 4 sign-off is reserved for the actual Auftraggeber. The following was
**independently confirmed** (not just carried over from the executor's self-report):

- Role color (P157-13) is genuinely painted, not merely attribute-present: every visible entry
  has `data-color-key="#7b3c4e"` AND computed `border-inline-start-color: rgb(123, 60, 78)`
  (= `#7B3C4E`, the Typesetting catalog color).
- Role name appears 0× in the notes area (was 5× mobile / 12× desktop before).
- Notes render as compact timeline rows (dot, meta-line "Folge N · vX · Datum", title, body,
  chevron) — no "Notiz zu Folge X" line, no footer-link row.
- Statistikleiste is one card; tab row has a visible active state.
- Summary band present: "Typesetting für 13 Folgen · 12 dokumentierte Arbeitsnotizen · 2 Medien".
- Pager is concrete: "5 von 12 angezeigt" + "Weitere 7 Beiträge anzeigen" (7 = actual remainder).
- Media "Alle 2 angezeigt" is gone; Releases shows the dashed EmptyState with "Noch keine
  öffentlichen Release-Einträge." — the old duplicated text is gone.
- No console errors, no horizontal scroll.
- Desktop hero matches the reference: avatar left, metadata right, both buttons side by side.

### Deviations found (A–F) — none auto-fixed, all held open for the human sign-off decision

**A) Real gap, not covered by the order — section header icon inconsistency.**
Verified directly in source: `ProjectMemberNotesSection.tsx` has zero icon usage in its header;
`ProjectMemberReleasesSection.tsx` imports `Package` but only renders it inside the `EmptyState`
(count === 0 branch) — the header itself (`count > 0` branch, lines ~68-74) has no icon either.
Only `ProjectMemberMediaGallery.tsx` (Plan 157-04) puts an icon in its header (`ImageIcon`,
line 73). The reference spec (157-CONTEXT.md points 6/7/8) shows an icon on all three section
headers. This is a genuine, verified gap against the reference — none of plans 157-02/03/05 added
one to their own section, and it was not called out as an explicit must-have in any single plan,
so it fell through the cracks between plans. Candidate fix (not applied — out of scope for a
verification/documentation-only checkpoint response): add a small header icon to
`ProjectMemberNotesSection.tsx` (e.g. `FileText`/`MessageSquare` from `lucide-react`, matching the
existing `size={18} aria-hidden="true"` pattern from `ProjectMemberMediaGallery.tsx`) and to the
`count > 0` branch of `ProjectMemberReleasesSection.tsx` (reusing the already-imported `Package`
icon there instead of only in the empty state).

**B) Summary band tint — beige vs. reference's light blue.**
`ProjectMemberSummaryBand.module.css` uses `var(--surface-sunken)` (warm beige). The global token
set (`frontend/src/styles/globals.css`) has no dedicated "light blue tint" surface token — the
closest blue-ish values are `--color-primary: #5f84dd` / `--accent-primary` (saturated brand
blue, not a soft tint) and there is no `--surface-info`/`--surface-accent-soft`-style token.
Per the operator's "no new design tokens" constraint (mandatory_run_constraints #11, project-wide
for this phase), introducing a new soft-blue token to chase this one visual detail is not
permitted. **Conclusion: `--surface-sunken` is the correct choice under the current token set, and
the beige-vs-blue deviation from the reference is a forced consequence of "no new tokens", not an
oversight.** This reasoning was not previously written down anywhere in the phase's planning
artifacts — recorded here per the reviewer's explicit request not to leave it undocumented.

**C) Section framing — header outside the card vs. reference's header-inside-one-white-card.**
Confirmed by design: `ProjectMemberPage.module.css`'s `.section` class does not wrap the header
(`.sectionHead`) and the list/grid in a single bordered/background card — only individual entries
(`ProjectMemberNoteEntry`, media tiles) are cards. The reference structure described in
157-CONTEXT.md implies one white card per section containing its own header. This was a structural
choice made across plans 157-02/03/04/05 (each section's `.sectionHead` sits directly on the page
background) and was not flagged as a deviation by any of them. Not changed here — this is a
documentation-only checkpoint response, and reworking section framing would touch
`ProjectMemberPage.module.css` plus three section components at once, which is a real-code change
that belongs in a follow-up decision, not a silent fix folded into a live-UAT report.

**D) Mobile hero stacks the avatar above the name (≤640px), not avatar-left/name-right.**
Already flagged by the 157-06 executor itself (see checkpoint report). Root cause:
`ProjectMemberPage.module.css`'s `@media (max-width: 640px) { .hero { flex-direction: column } }`
(introduced in Plan 157-02) stacks the entire hero, not just the two action buttons. The mandate
explicitly allows buttons to stack under 640px but does not authorize stacking the avatar/name
pairing — the reference screenshot itself is a narrow viewport with avatar-left retained. Confirmed
still present. Not fixed here (out of scope for Plan 157-02, which owns this CSS, and this is a
verification-only response).

**E) Allowed, informational only — Statistik 2×2 wrap and Tab-row two-line wrap on mobile.**
Both are explicitly permitted by the order text ("Statistik darf 2×2 werden"; tab row wrapping to
two lines instead of horizontal scroll, which the order explicitly forbids). Not a defect — logged
for completeness per the reviewer's request that every point in the source list be dispositioned,
not silently dropped.

**F) Investigated and resolved — the "blue vertical stripe" at x≈0-8px near the first two notes
(desktop screenshot) is NOT a Phase 157 component and NOT a screenshot artifact.**
Traced to source: `frontend/src/components/layout/AppShell.module.css` — `.brandMark`/`.userAvatar`
(lines 81-93) render a 42×42px, `border-radius: 14px` block with
`background: var(--color-primary, #2f5fe3)` (a saturated blue). This is part of the pre-existing,
persistent global app-shell sidebar/header chrome that wraps every page in the application,
including the projectMember route — not anything introduced by, or in scope for, Phase 157 (which
only touches `frontend/src/components/fansubs/projectMember/*`). None of `ProjectMemberNoteEntry`,
`ProjectMemberStickyNav`, or any other Phase 157 component references `--color-primary`/
`--accent-primary` as a background or a left-edge border/pseudo-element — confirmed via grep across
every `.module.css` file this phase touched. Verdict: real, pre-existing global-layout element,
correctly ruled out as a Phase 157 defect, not dismissed as "cosmetic" without being named.

### Explicitly NOT done as part of this checkpoint response

Per the reviewer's instruction, none of A-F were auto-fixed or auto-closed as cosmetic. The
checkpoint remains **open**. `STATE.md`/`ROADMAP.md` continue to show 157-06 outstanding and Phase
157 not fully accepted. No commit here changes any production component — only this SUMMARY.md and
`deferred-items.md` (documentation).

### Before/After (measured, unchanged from the executor's Task 3 capture, reproduced for the record)

| Metric | Before (157-CONTEXT.md baseline) | After (measured, confirmed independently) |
|---|---|---|
| Role name repeats in notes | 5× mobile / 12× desktop | 0× / 0× |
| Statistikleiste | 4 separate boxes | 1 card, 4 entries |
| Summary band | did not exist | "Typesetting für 13 Folgen · 12 dokumentierte Arbeitsnotizen · 2 Medien" |
| Pager | generic "Weitere Beiträge laden" | "5 von 12 angezeigt" + "Weitere 7 Beiträge anzeigen" |
| Media pager text | "Alle 2 angezeigt" present | absent |
| Releases text | "Mitwirkung an Releases0Alle 0 angezeigt" | "Mitwirkung an Releases0Noch keine öffentlichen Release-Einträge." |
| Note role color (P157-13) | not measured | `data-color-key="#7b3c4e"` + computed `rgb(123, 60, 78)` on all visible entries |
| Horizontal overflow | — | none at 320/390/768/1024/1440px |
| Doc height | 2996px mobile / 2746px desktop | 2753px mobile (−243) / 2934px desktop (+188, new sections) |

## 2026-09-12 — Operator fix pass: five mandatory corrections, checkpoint re-opened

The operator explicitly rejected ("nicht approved") the Task 4 checkpoint above and ordered
exactly five corrections, implemented and committed individually (`85297f38`, `066568c4`,
`94e406d9`, `998e9e64`, `632d948f`). Scope for this pass was explicitly widened by the operator to
`ProjectMemberNotesSection.tsx/.module.css`, `ProjectMemberReleasesSection.tsx/.module.css`,
`ProjectMemberPage.module.css`, `ProjectMemberSummaryBand.module.css`, and
`shot-projectmember.mjs` — nothing else was touched (confirmed via `git diff --stat` against the
pre-fix commit: exactly those 7 files changed, no `ProjectMemberNoteEntry`/`ProjectMemberHero`/
`ProjectMemberMediaGallery`/`ProjectMemberStickyNav`/`ProjectMemberSummary`/backend files in the
diff).

### 1) Mobile hero: avatar stays left of name/metadata

Root cause confirmed as diagnosed: `ProjectMemberPage.module.css`'s `@media (max-width: 640px) {
.hero { flex-direction: column } }` stacked the entire hero row, not just the action buttons. Fixed
by moving `flex-direction: column` from `.hero` to `.heroActions` — the avatar+name/metadata row is
now a horizontal flex row at every width; only the two action buttons stack under 640px. Verified
live at 390px: avatar circle "TY" sits left of "Type · Verifiziert", exactly matching the reference.

### 2) Unified section header icons (Texte & Notizen / Bilder & Medien / Mitwirkung an Releases)

`ProjectMemberNotesSection.tsx` gained a `FileText` icon (already the established "notes/text"
icon in this codebase — used identically in `ProjectMemberSummary.tsx`'s stat bar and in
`OlderReleasesList.rows.tsx`/`PublicReleaseBlock.tsx` for the same semantics), wrapped in the same
`.titleGroup` flex pattern `ProjectMemberMediaGallery.tsx` already used for its `ImageIcon`.
`ProjectMemberReleasesSection.tsx`'s already-imported `Package` icon now also appears in the
`count > 0` header branch (previously it only rendered inside the empty-state), and a matching
`.titleGroup` was added to its own header for parity with the `count === 0` branch (which now also
carries the icon). No new icon dependency was introduced; each choice reuses an icon already
established in this codebase for the same semantic meaning.

### 3) Sections are now one cohesive card (header + content share one surface)

`.section` in `ProjectMemberPage.module.css` (the direct wrapper `<section>` for all three
sections' header AND content — confirmed identical for Notes/Media/Releases via
`grep -rn "pageStyles.section"`) now carries `background: var(--surface-card)`,
`border: 1px solid var(--color-border)`, `border-radius: var(--radius-md)`, `padding: 22px` — the
exact same token values already used by `ProjectMemberNoteEntry.module.css`'s entry cards, no new
values. Releases' `.list` previously had its own outer card treatment (background/border/radius/
shadow) wrapping the row list; this was removed to avoid a card-inside-a-card look now that
`.section` provides the outer surface — `.row` styling itself (episode/version/roles/date/link,
mobile wrap order) is untouched. Individual entries (`ProjectMemberNoteEntry`, media tiles) keep
their own nested card look unchanged, matching the plan's "structurally unchanged, simply live
inside the section card now" instruction.

### 4) Summary band color: deliberate decision, documented in-code

Chose to reuse `--avatar-4-bg`/`--avatar-4-fg` (an existing light-blue token pair, currently used
in `FansubTeamSection.module.css` as one of several rotating, meaning-free avatar accent colors)
over `--tag-gallery-bg`/`--tag-gallery-fg` (also light blue, but semantically bound to "gallery/
media" in `FansubPublicSections.module.css` — reusing it here would misleadingly imply the band is
about images, when it actually summarizes roles + episodes + notes + media). No new token or hex
literal was introduced; the reasoning is written directly into
`ProjectMemberSummaryBand.module.css` as a code comment, per the operator's requirement that the
decision be visible in-code, not only in planning docs.

### 5) Blue vertical stripe: root cause confirmed with DOM-query evidence, not re-asserted

The prior checkpoint response's disposition ("F", `AppShell.module.css`'s `.brandMark`/
`.userAvatar`) was re-investigated rather than accepted at face value, and turned out to be the
**wrong specific element** even though the overall verdict (pre-existing AppShell chrome, out of
Phase 157 scope) holds. Concrete evidence gathered via an extended `shot-projectmember.mjs` run
(`SHOT_LABEL=fix5`, fresh `docker restart team4sv30-frontend` beforehand):

- `document.elementFromPoint(4, 200)` on the desktop viewport returns
  `AppShell_edgeStrip__8V5n2` (`aria-label="Menü öffnen"`, `role="button"`) — the always-mounted,
  `position: fixed`, 16px-wide sidebar-reveal strip in `AppShell.tsx`/`.module.css`, **not**
  `.brandMark`/`.userAvatar`.
- A companion `drawerDiagnostics` probe confirms the nav drawer (which actually contains
  `.brandMark`/`.userAvatar`) is closed and off-screen at capture time
  (`transform: matrix(1, 0, 0, 1, -260, 0)`, no `drawerOpen` class) — those elements are not
  painted anywhere on screen, ruling out the earlier hypothesis directly.
- `edgeStripDiagnostics.rect` measured `{ x: 0, y: 0, width: 16, height: 1000 }` with
  `matchesViewportHeight: true` (`window.innerHeight` was also 1000) and
  `matchesDocumentHeight: false` (document height was 3065px) — the element is exactly one
  viewport tall in a normal render, not document-tall.
- A pixel scan of the resulting fullPage PNG (via the frontend container's own `sharp` dependency)
  found the blue tint at column x=4 spans **exactly y:0–1000**, i.e. exactly the first viewport
  height, not the full ~3065px document. Combined with the previous point, this shows Playwright's
  `fullPage: true` capture paints the `position: fixed` `.edgeStrip` once, pinned to the top slice
  of the stitched image, rather than following scroll like a real browser does — a screenshot-
  capture-specific rendering quirk for fixed elements, not a per-scroll defect a real user would
  ever see (a real user always sees the strip correctly follow their own viewport, since that is
  the entire purpose of `position: fixed`).
- A companion non-fullPage (`viewportOnlyFile`) screenshot at the same scroll position (top of
  page) shows the same strip, confirming it is a genuine, always-rendered element in normal usage,
  not a Playwright hallucination — it is real AppShell chrome, present on every page in the app,
  not something introduced by or specific to Phase 157.
- On mobile (390px), `edgeStripDiagnostics.rect` is `{ width: 0, height: 0 }` (the
  `@media (max-width: 860px) { .edgeStrip { display: none } }` rule in `AppShell.module.css` hides
  it), matching the original report that this was a desktop-only observation.

**Verdict: confirmed real, pre-existing, always-mounted AppShell chrome (`.edgeStrip`, not
`.brandMark`/`.userAvatar`), out of Phase 157's file scope (`AppShell.module.css` untouched, as
required). The "stripe running down the page" specifically in the fullPage screenshot is an
artifact of how Playwright/Chromium capture `position: fixed` elements during a fullPage capture,
not a real per-scroll rendering defect.** No code fix was applied (none is warranted or
in-scope); the diagnostic capability was added to `shot-projectmember.mjs` as permanent,
reusable evidence-gathering rather than a one-off finding.

### Re-assessment of findings A–D and F (E was not re-assessed, per instruction — already
correctly disposed as an allowed, non-defect deviation)

- **A (section header icons):** **behoben** (fixed) — see correction 2 above.
- **B (summary band color):** **bewusst abweichend mit Begründung** (deliberate deviation,
  documented) — see correction 4 above; `--surface-sunken` was replaced with `--avatar-4-bg/-fg`,
  a closer-to-reference light blue, with the token-reuse reasoning written directly into
  `ProjectMemberSummaryBand.module.css`.
- **C (section framing):** **behoben** (fixed) — see correction 3 above.
- **D (mobile hero avatar stacking):** **behoben** (fixed) — see correction 1 above.
- **F (blue vertical stripe):** **bewusst abweichend mit Begründung** (deliberate deviation,
  documented, not a defect) — re-investigated with concrete DOM-query and pixel-level evidence
  (see correction 5 above); confirmed real, pre-existing, out-of-scope AppShell chrome
  (`.edgeStrip`), and the full-page-screenshot appearance is a capture-tool artifact, not a live
  rendering bug. `AppShell.module.css` was correctly left untouched.

### Full frontend regression suite (re-run after all five corrections)

- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit -p tsconfig.json"`
  — clean, zero errors.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` — 301 passed | 1
  skipped (302 files), 2324 tests passed, 3 todo — identical counts to the pre-fix-pass baseline,
  confirming zero regressions from these five corrections.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run lint"` — 13 pre-existing
  errors, all in files this fix pass never touched (`capture-responsive.cjs`,
  `src/app/admin/episode-versions/**`, `src/app/admin/fansubs/**`, `src/app/admin/groups/**`,
  `src/app/admin/roles/**`, `src/app/admin/users/**`, `tmp-playwright-phase4/**`) — confirmed
  present at the pre-session baseline commit (`git show <baseline>:<file>`, all predate this
  session by weeks), unrelated to `projectMember`/Phase 157, and out of this fix pass's scope per
  the scope-boundary rule. Zero lint errors or warnings in any file this fix pass touched.
- Backend suite not re-run: no backend file was touched by any of the five corrections.

### New Live-UAT screenshots (390px mobile, 1440px desktop)

Captured via `SHOT_LABEL=fix5 node scripts/shot-projectmember.mjs` after a fresh
`docker restart team4sv30-frontend`, against `127.0.0.1:3300` (never `:3000` directly):
`/tmp/pmshots/fix5-mobile.png`, `/tmp/pmshots/fix5-desktop.png` (fullPage), plus
`/tmp/pmshots/fix5-mobile-viewport-only.png`/`fix5-desktop-viewport-only.png` (viewport-only, for
the correction-5 comparison). All facts from that run: `roleRepeatsInNotes: 0`,
`noteAccentColorSamples` all `{"colorKey":"#7b3c4e","borderInlineStartColor":"rgb(123, 60, 78)"}`,
`releasesEmptyStateText` present without "Alle 0 angezeigt", `mediaAllShownTextPresent: false`,
`horizontalOverflow: false` on both viewports, `consoleErrors: []` on both viewports.

### Checkpoint status: still OPEN

This fix pass implements the operator's five ordered corrections and re-assesses findings A–F. It
does **not** constitute human sign-off. Task 4 of Plan 157-06 remains an open
`checkpoint:human-verify gate="blocking"` — the actual Auftraggeber must still review the new
screenshots and confirm or reject. `STATE.md`/`ROADMAP.md` are intentionally left untouched by this
fix pass (per the fix-pass instructions) and continue to show Phase 157 as outstanding.

## 2026-09-12 — Operator polish pass, round 2: five UI-polish corrections, checkpoint still open

The operator did not approve the Task 4 checkpoint and ordered a second, smaller polish round —
five concrete UI-only corrections, no backend change, no role/count/visibility/data-path change.
Implemented and committed individually (`516a40ae`, `34e46ec0`, `ca992dd8`, `5a34dbe2` — plus this
docs-only commit). Scope: `ProjectMemberHero.tsx`, `ProjectMemberSummary.module.css`,
`ProjectMemberPage.module.css`, `ProjectMemberNoteEntry.tsx`, `ProjectMemberNoteEntry.module.css`
— confirmed via `git diff --stat` against the pre-round commit: exactly those 5 files, 63
insertions / 8 deletions, no backend/STATE.md/ROADMAP.md changes.

### 1) Hero back-link: "subtle" instead of "secondary"

`ProjectMemberHero.tsx`'s "← Zurück zum Projekt" now uses `variant="subtle"` (was `"secondary"`,
a full-gradient button as visually heavy as the primary action). `subtle` is already the
established pattern for secondary `href`-based navigation buttons elsewhere in this codebase
(`PublicReleaseBlock.tsx`). `size="sm"` is unchanged, so the touch target stays at
`--control-height-sm` (36px) — measured directly: both buttons remain 36px tall before and after.
On mobile (≤640px), `ProjectMemberPage.module.css`'s `.heroActions` now only forces the PRIMARY
button to full width (`.heroActions > :first-child`, plus `align-items: flex-start` to stop the
column-direction flex default from stretching the second child); the back-link keeps its natural
content width (measured: 150.67px at 390px, vs. the primary's 204px).

**Honest measurement, not just an assertion:** this change does NOT reduce the mobile hero's raw
pixel height. Measured directly via `getBoundingClientRect()` at 390px width: hero height
299.23px, `.heroActions` height 82px, both BEFORE and AFTER this change — the two buttons still
don't fit on one row at 390px (204px + 150.67px + 10px gap = 364.67px, wider than the ~306px
content column), so they still stack, and a stacked pair of 36px buttons is 82px regardless of
either button's width. The achieved goal is de-emphasis (the back-link visibly reads as a lighter,
narrower, less button-like secondary action — confirmed in the new screenshots), not a literal
height reduction. This is reported honestly per the run constraints rather than claiming a
height win that did not occur at the DOM level.

### 2) Mobile 2×2 statistics grid: one cohesive block

Root cause (confirmed, not assumed): the previous mobile rule gave entry 1 (row 1, col 1)
`padding-inline-start: 0` (from the base `:first-child` rule) while entry 3 (row 2, col 1, whose
border was already removed for the 2×2 case) kept `padding-inline-start: 16px` — the two
"column 1" entries were horizontally misaligned against each other, and there was no vertical
`gap` between the two wrapped rows at all (they touched). Fixed in
`ProjectMemberSummary.module.css`: under the existing `@media (max-width: 640px)` block, all four
`.summaryEntry` variants (base, `:first-child`, `:not(:first-child)`) now get identical
`flex: 1 1 calc(50% - 8px)`, `padding-inline: 0`, `border-inline-start: none`, and `.summary`
itself gets `gap: 14px 16px`. Desktop's single-row layout (flex-basis 160px, border separators)
is untouched — confirmed via `git diff` that no rule outside the `@media (max-width: 640px)` block
changed. Verified visually in the new mobile screenshot: icons/numbers in both columns now align
vertically across both rows.

### 3) Section card: visible depth against the page background

`.section` in `ProjectMemberPage.module.css` already had the card surface
(`background: var(--surface-card)` / border / radius) from the first polish round, but
`--surface-card` (`#ffffff`) sits very close to `--surface-canvas` (`#f6f4ef`, the page
background) — the border alone did not read as a clearly separated block. Added
`box-shadow: var(--shadow-sm)` — the exact same token already used by `.hero`, the
Statistikleiste (`.summary`), and `.stickyNav` for the identical purpose (confirmed by reading
`ProjectMemberStickyNav.module.css`) — no new value. Confirmed no card-in-card regression: neither
`ProjectMemberNoteEntry.module.css` nor the media-tile styling was touched, so timeline
entries/media tiles keep their own unchanged nested-card look inside the now-more-defined outer
section.

### 4) Role-color timeline lockdown — verified untouched

Re-ran the live-UAT script after all changes: `roleRepeatsInNotes: 0` (mobile and desktop),
`noteAccentColorSamples` all `{"colorKey":"#7b3c4e","borderInlineStartColor":"rgb(123, 60, 78)"}`
on every visible entry, both viewports. `ProjectMemberNoteEntry.tsx`'s `data-color-key` attribute
and the `var(--role-accent)` CSS seam were not modified — only a new, independent `data-compact`
attribute was added (see point 5) with no interaction with the color seam.

### 5) Short-note compactness: measured first, then fixed, scoped to short content only

Measured (not assumed) a real live example via `getComputedStyle`/`getBoundingClientRect` inside
the running container, against member "Type" (`public_slug = 'type'`, `member_id = 5`),
`release_version_notes.id = 23` (title "test", body_text "test 3" — confirmed via direct
Postgres query, the only such short outlier among this member's 12 notes; the other 11 range
145–189 characters). Findings: no hidden `min-height` exists anywhere in the chain (`.entry`,
`.content`, `.notesGrid`); the chevron (30×30px, `align-self: center`) does not force extra row
height since the content column (78.08px) is taller; the row's total 108.08px height is exactly
14px+14px padding + 2px border + 78.08px of real content (a 19.69px meta line + 4px margin + 24px
title + 4px margin + 26.39px body) — the existing 14px/4px rhythm is appropriate for this member's
other 11 (145–189 char) notes; it only reads as disproportionate on the one 10-character outlier.

Fix, scoped to content length rather than a global padding cut: `ProjectMemberNoteEntry.tsx`
computes `isCompact` (`title.length + plainText.length <= 60`) and sets `data-compact="true"` on
the entry when true. `ProjectMemberNoteEntry.module.css` adds
`.entry[data-compact='true'] { padding-block: 10px }` and
`.entry[data-compact='true'] .meta, .entry[data-compact='true'] .title { margin-bottom: 2px }` —
no rule outside the `[data-compact='true']` selector changed, so all 11 longer notes for this
member are pixel-identical to before (confirmed via `git diff` showing only additive new rules,
no edits to the existing unconditional `.entry`/`.meta`/`.title` rules).

Structure (dot, meta-line, title, text, chevron) is unchanged — `isCompact` only toggles spacing,
never removes or reorders an element, per the P157-13/point-4 lockdown.

### Full frontend regression suite (re-run after all five corrections, this round)

- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit -p tsconfig.json"`
  — clean, zero errors, run after every individual commit in this round.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` — 301 passed | 1
  skipped (302 files), 2324 tests passed, 3 todo — identical counts to the pre-round baseline,
  zero regressions.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run lint"` — same 13
  pre-existing errors as before this round, all in files this round never touched; zero lint
  errors/warnings in any file this round touched.
- Backend suite not re-run: no backend file was touched by any of the five corrections.

### New Live-UAT screenshots (390px mobile, 1440px desktop)

Captured via `SHOT_LABEL=polish2-after node scripts/shot-projectmember.mjs` after a fresh
`docker restart team4sv30-frontend`, against `127.0.0.1:3300` (never `:3000` directly). Measured
`docHeight`: mobile 2992px (baseline for this round: 2990px — effectively unchanged, +2px, from
the new intentional 14px mobile stat-grid row-gap roughly offsetting removed border/padding
elsewhere); desktop 3053px (baseline for this round: 3065px — **-12px**, consistent with point 5's
compact-note padding reduction landing on a visible note in the desktop's fully-expanded 12-note
list). `horizontalOverflow: false` on both viewports, `consoleErrors: []` on both viewports,
`releasesEmptyStateText`/`mediaAllShownTextPresent` unchanged from the prior round.

### Checkpoint status: still OPEN

This second polish round does not constitute human sign-off. Task 4 of Plan 157-06 remains an open
`checkpoint:human-verify gate="blocking"` — the actual Auftraggeber must still review the new
screenshots and confirm or reject. `STATE.md`/`ROADMAP.md` are intentionally left untouched by this
round (explicitly forbidden by the operator for this round) and continue to show Phase 157 as
outstanding.

</summary>
