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

</summary>
