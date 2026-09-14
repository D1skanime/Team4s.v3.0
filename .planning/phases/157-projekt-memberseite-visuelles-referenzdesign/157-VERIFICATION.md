---
phase: 157-projekt-memberseite-visuelles-referenzdesign
verified: 2026-09-14T19:40:01Z
status: human_needed
score: 13/13 must-haves verified (3 via documented, DECISIONS.md-recorded override)
overrides_applied: 3
overrides:
  - must_have: "P157-02: Eine kompakte Statistikleiste mit Icon+Zahl+Label in Referenz-Reihenfolge (Rolle, Beitraege, Medien, Releases), korrekter Singular/Plural; keine vier grossen Boxen"
    reason: >
      Superseded by explicit user decision. The 2026-09-13 user order's binding starting point was
      verbatim "Kennzahlen direkt im Hero: Folgen / Beiträge / Medien", implemented by Plan 157-07
      (folded into ProjectMemberHero/HeroMetrics) and confirmed/extended by the 2026-09-14 V6
      decision (Plan 157-14, clickable hero metrics). Documented in DECISIONS.md's 2026-09-14 entry
      and ROADMAP.md's annotated P157-02 row ("— Ersetzt durch Nutzerentscheid ..."). The dedicated
      ProjectMemberSummaryBar component was confirmed orphaned and deleted by Plan 157-16.
    accepted_by: "Auftraggeber (2026-09-13 / 2026-09-14 user orders, recorded retroactively by executor in DECISIONS.md per GAP-03 F5)"
    accepted_at: "2026-09-14T00:00:00Z"
  - must_have: "P157-04: Beitragszusammenfassung liest z. B. 'Rolle fuer N Folgen · M dokumentierte Arbeitsnotizen · K Medien'"
    reason: >
      Superseded by the same 2026-09-13/2026-09-14 user decisions as P157-02 (Hero-inline metrics
      replace the separate summary band). Documented in DECISIONS.md's 2026-09-14 entry and
      ROADMAP.md's annotated P157-04 row. ProjectMemberSummaryBand confirmed orphaned and deleted by
      Plan 157-16; the underlying episodes count (Plan 157-01) is unaffected and still feeds "13
      Folgen" in the hero.
    accepted_by: "Auftraggeber (2026-09-13 / 2026-09-14 user orders, recorded retroactively by executor in DECISIONS.md per GAP-03 F5)"
    accepted_at: "2026-09-14T00:00:00Z"
  - must_have: "P157-09: Bei 0 Releases kompakter Empty-State statt grosser Leerflaeche; keine Doppelinformation aus Zaehler und 'Alle 0 angezeigt'"
    reason: >
      The entire Releases section/tab/counter/empty-state was intentionally and completely removed
      by Plan 157-08 per an explicit, separately dated user order ("ausdrücklichen Nutzerauftrag vom
      2026-09-13"). There is no empty state to build because the feature no longer exists on the
      page by design. Documented in DECISIONS.md's 2026-09-14 entry (the first durable written
      record of this 2026-09-13 order, closing a discrepancy where it had only ever been cited by
      name) and ROADMAP.md's annotated P157-09 row ("— Entfällt: ...").
    accepted_by: "Auftraggeber (2026-09-13 user order, recorded retroactively by executor in DECISIONS.md per GAP-03 F5)"
    accepted_at: "2026-09-14T00:00:00Z"
re_verification:
  previous_status: gaps_found
  previous_score: 10/13
  gaps_closed:
    - "P157-02 / P157-04 / P157-09: reclassified from undocumented FAIL to documented, DECISIONS.md-recorded override (Plan 157-16, GAP-03 F5) — no code change was required or made to these three, only the documentation reconciliation and orphan-component deletion"
    - "GAP-03 F1 (SectionHeader underline stopped at icon, counter wrapped to its own line on mobile/200% zoom) — closed by Plan 157-15 Tasks 1-2 (additive SectionHeader icon/counter slots)"
    - "GAP-03 F2 (hero jump-metrics '12 Beiträge'/'2 Medien' only showed clickability on :hover, invisible on touch) — closed by Plan 157-15 Task 3 (permanent .buttonText underline + :focus-visible ring)"
    - "GAP-03 F3 (157-REVIEW.md WR-03: fully clipped links inside a collapsed note preview stayed Tab-reachable) — closed by Plan 157-15 Task 3 (tabindex=\"-1\" toggling)"
    - "GAP-03 F4 (157-REVIEW.md WR-04: .entry had no isolated stacking context) — closed by Plan 157-15 Task 3 (isolation: isolate)"
    - "Two orphaned dead-code components (ProjectMemberSummary.tsx/ProjectMemberSummaryBand.tsx plus CSS/test files) deleted by Plan 157-16 after a pre-deletion grep re-confirmed zero other importers"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Live Auftraggeber Sign-off (checkpoint:human-verify, Plan 157-06 Task 4, gate=\"blocking\") plus a full human re-run of 157-UAT.md's GAP-02 checklist points 1-9 and GAP-03 findings F1-F5"
    expected: "The Auftraggeber opens http://127.0.0.1:3300/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type through the SSH tunnel, walks the (now-corrected, superseded-flag-annotated) 157-06-PLAN.md Task 4 checklist and the GAP-02/GAP-03 human-observable points, and explicitly signs off that the shipped page matches the reference design and the accumulated gap-closure work."
    why_human: >
      This is a stakeholder acceptance decision, not a programmatically verifiable fact — and it is
      explicitly out of scope for this automated verification pass per this run's own instructions.
      It has NOT happened yet: STATE.md, 157-15-SUMMARY.md, and 157-16-SUMMARY.md all consistently
      and explicitly state that this checkpoint remains open. This verifier does not mark it passed
      under any circumstance, including when every automated/must-have criterion below is green.
---

# Phase 157: Projekt-Memberseite visuell auf Referenzdesign umbauen — Verification Report

**Phase Goal:** Die öffentliche Projekt-Member-Seite entspricht in Informationshierarchie,
Reihenfolge, Kartengrößen, Abständen und Typografie dem vom Auftraggeber beigefügten
Referenzdesign — mit den ROADMAP.md-dokumentierten Supersessionen: Hero-Kennzahlen statt
Statistikleiste/Beitragszusammenfassung (2026-09-13/2026-09-14 Nutzerentscheid), Releases-Sektion
vollständig entfernt (2026-09-13 Nutzerauftrag) — bei unveränderter fachlicher Semantik.

**Verified:** 2026-09-14T19:40:01Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (Plans 157-15 and 157-16, both executed 2026-09-14).
This supersedes the stale 2026-09-13 `gaps_found` (10/13) snapshot, whose P157-02/P157-04/P157-09
findings are now formally reconciled as documented overrides rather than left as unexplained fails.

## Goal Achievement

### Observable Truths (ROADMAP P157-01 .. P157-13)

| # | Truth (ROADMAP wording, abbreviated) | Status | Evidence |
|---|---|---|---|
| P157-01 | Hero: avatar left, name/verified/context/role-chip right, actions side-by-side (stack on narrow) | ✓ VERIFIED | `ProjectMemberHero.tsx` renders the hero with avatar/status/roles/context/metrics/actions slots; unchanged since prior verification, re-confirmed present and wired |
| P157-02 | ONE stat-bar card, 4 entries, order Rolle/Beiträge/Medien/Releases | ✓ **VERIFIED (override)** | Superseded by Hero-inline metrics per explicit 2026-09-13/2026-09-14 user decision, documented in `DECISIONS.md` (2026-09-14 entry) and `ROADMAP.md`'s annotated row. Orphaned `ProjectMemberSummaryBar` component (and its file) deleted by Plan 157-16; `grep -rln "ProjectMemberSummaryBar" frontend/src` returns zero hits, confirmed live in this session |
| P157-03 | Tab nav, visible active state, no clipping at 390px | ✓ VERIFIED | `ProjectMemberStickyNav.tsx` scrollspy + click-to-activate; unchanged since prior verification |
| P157-04 | Beitragszusammenfassung band, real episodes count sentence | ✓ **VERIFIED (override)** | Superseded by the same Hero-inline-metrics decision as P157-02. `ProjectMemberSummaryBand.tsx` and its test/CSS deleted by Plan 157-16; `grep -rln "ProjectMemberSummaryBand" frontend/src` returns zero hits, confirmed live in this session. The `episodes` count (Plan 157-01) is unaffected — `git diff` on `ProjectMemberHero.tsx` is empty for Plan 157-16, and "13 Folgen" still renders from live code read of `ProjectMemberHero.tsx` |
| P157-05 | Notes as compact timeline rows, no role header, no double episode line | ✓ VERIFIED | `ProjectMemberNoteEntry.tsx` renders meta/title/clamped-body/chevron with no role-header block, unless `hasMultipleRoles` gates a small chip; live-read this session, no regression |
| P157-06 | Role name only shown when >1 project role; role color always | ✓ VERIFIED | `hasMultipleRoles` prop gates `showRoleChip`; `data-color-key` unconditional on both `<article>` and the anchor; live-read this session |
| P157-07 | Pager: "Weitere N Beiträge anzeigen" with real batch size | ✓ VERIFIED | Unchanged since prior verification; not touched by 157-15/157-16 |
| P157-08 | Media header icon+count, 2-3 col gallery, no "Alle N angezeigt" once fully loaded | ✓ VERIFIED | `ProjectMemberMediaGallery.tsx` now calls `SectionHeader` directly with `icon=`/`counter=` (Plan 157-15 Task 2); local `sectionHeadRow` wrapper markup/CSS fully removed, confirmed via live `grep` in this session (zero hits) |
| P157-09 | 0-Releases compact empty state, no "Alle 0 angezeigt" duplication | ✓ **VERIFIED (override)** | Entire Releases section/tab/counter/empty-state intentionally removed by Plan 157-08 per an explicit, separately-dated user order. Documented in `DECISIONS.md`'s 2026-09-14 entry (first durable written record of this order — previously only cited by name, per GAP-03 F5's discovered discrepancy) and `ROADMAP.md`'s annotated row. Live-read `ProjectMemberPage.tsx` this session: page renders only Hero → Notes → Media, no Releases import anywhere |
| P157-10 | Info hierarchy Person→Rolle→Umfang→Beiträge→Medien→Releases; clean 320-1440px, no horizontal scrollbar | ✓ VERIFIED (per superseded scope) | Hierarchy now reads Person→Rolle→Umfang(Hero jump-metrics, clickable)→Beiträge→Medien, with the Releases step intentionally absent per the P157-09 override above — this is the accepted, documented shape of the hierarchy, not an unexplained gap. `horizontalOverflow` behavior unchanged since prior verification (no touched files in this session affect layout width) |
| P157-11 | Design language/tokens preserved; no regressions; no backend parallel structure | ✓ VERIFIED | Live-run in this session: `npx tsc --noEmit` clean (zero output); `go build ./...` clean (zero output); full frontend `vitest run`: 320 passed / 1 failed test file, 2708 passed / 2 failed / 3 todo — the 1 failed file and 2 failed tests are the pre-existing, documented `cssCustomProperties.guard.test.ts` baseline failures (unrelated `--surface-muted` fallback finding), zero NEW failures |
| P157-12 | Test matrix adapted + green; Live-UAT screenshots vs. reference documented | ⚠️ PARTIAL (tests green; sign-off pending) | Test matrix green, confirmed live this session (`SectionHeader.test.tsx`, `HeroMetrics.test.tsx`, `ProjectMemberNotesSection.test.tsx`, `ProjectMemberMediaGallery.test.tsx`: 40/40 passing; full suite baseline-only failures). Screenshot evidence exists per 157-15-SUMMARY.md's documented live `shot-projectmember.mjs` runs (not independently re-run against the live browser by this verification pass — see Human Verification). **Final stakeholder sign-off has not happened** and is explicitly out of scope for this verification run |
| P157-13 | Role color mandatory at every entry via the single central seam, regardless of role count | ✓ VERIFIED | `data-color-key` unconditional in `ProjectMemberNoteEntry.tsx`; exactly one `role-accent` reference (`.dot`'s `background`) confirmed live-read this session; unchanged since prior verification |

**Score:** 13/13 truths verified (10 directly, 3 via documented DECISIONS.md-recorded override).
P157-12 carries a caveat: automated test evidence is fully green, but the human sign-off component
of this truth is explicitly not resolved by this pass (see Human Verification below), which is why
overall phase status is `human_needed` rather than `passed`.

### GAP-03 Closure (Plans 157-15, 157-16) — Verified Independently This Session

All four F1-F4 findings and the F5 documentation/cleanup finding were independently re-verified by
reading the actual code and running the actual test/build commands in this session — not trusted
from either SUMMARY.md:

- **F1 (SectionHeader underline stopped at icon; counter wrapped on mobile/200% zoom):**
  `SectionHeader.tsx` read directly — `icon`/`counter` props exist, both render inside one new
  `sectionHeaderTitleRow` div only when `hasTitleRow` is true; the byte-identical else-branch for
  existing consumers is intact. `ui.module.css` contains `.sectionHeaderTitleRow`/
  `.sectionHeaderIcon`/`.sectionHeaderCounter` rules (confirmed via `grep`, lines 1103/1109/1115).
  `grep -rn "sectionHeadRow" frontend/src/components/fansubs/projectMember/` returns zero
  production-code hits (only test-file references confirming the classes are *absent*).
- **F2 (hero metrics not recognizable as clickable without hover):** `ui.module.css`'s
  `.buttonText` base rule (read directly, lines 126-144) now contains a permanent
  `text-decoration: underline` declaration outside the `:hover` block, plus a separate
  `.buttonText:focus-visible { box-shadow: var(--focus-ring); ... }` rule (lines 155-159). "13
  Folgen" is plain text, untouched, confirmed by reading `ProjectMemberHero.tsx`'s git history
  (last touched by 157-14, not 157-15/16).
- **F3 (fully clipped links in a collapsed note preview stayed Tab-reachable):**
  `ProjectMemberNoteEntry.tsx` read directly — a `useEffect` keyed on `[contentRef, isExpanded,
  isOverflowing]` sets `tabindex="-1"` on every `<a>` inside the clamped content when collapsed
  and overflowing, removing the attribute otherwise. `useClampedOverflow` itself is untouched
  (confirmed by scope, not re-read in full since it's explicitly out of this plan's scope).
- **F4 (`.entry` had no isolated stacking context):** `ProjectMemberNoteEntry.module.css` read
  directly — `.entry` rule (lines 6-21) contains exactly one `isolation: isolate;` declaration;
  `.entryLink::after`/`.body a`/`.toggle` z-index rules unchanged.
- **F5 (undocumented P157-02/04/09 FAILs; orphaned components):** `ROADMAP.md`'s Phase 157 section
  read directly — all three rows carry the required "Ersetzt"/"Entfällt" annotations with the
  original requirement wording preserved verbatim ahead of the appended clause; a new "Nachtrag
  GAP-03 F5 (2026-09-14)" paragraph follows the table. `DECISIONS.md`'s tail read directly — exactly
  one new `## 2026-09-14: Phase 157 Statistikleiste and Beitragszusammenfassung superseded...` entry
  exists, additive-only (all three pre-existing entries visually confirmed untouched immediately
  above it). `157-06-PLAN.md` read directly — one XML comment block immediately precedes Task 4's
  `<how-to-verify>`, flagging the stale Statistikleiste/Beitragszusammenfassung wording as
  superseded without altering the existing task text. `ls
  frontend/src/components/fansubs/projectMember/ProjectMemberSummary*` returns "No such file or
  directory" (both `ProjectMemberSummary.tsx` and `ProjectMemberSummaryBand.tsx` plus their CSS/test
  files are gone); `grep -rln "ProjectMemberSummaryBar\|ProjectMemberSummaryBand" frontend/src`
  returns zero results, confirmed live in this session.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `frontend/src/components/ui/SectionHeader.tsx` | Additive `icon`/`counter` slots, backward-compatible | ✓ VERIFIED | Read directly; byte-identical else-branch confirmed by code structure, not just test claim |
| `frontend/src/components/ui/ui.module.css` | `.sectionHeaderTitleRow`/`.sectionHeaderIcon`/`.sectionHeaderCounter`, permanent `.buttonText` underline, `.buttonText:focus-visible` ring | ✓ VERIFIED | All rules present and correctly scoped, confirmed via direct read |
| `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx` | `tabIndex` containment for clamped-preview links | ✓ VERIFIED | `useEffect` present exactly as specified |
| `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css` | `isolation: isolate` on `.entry` | ✓ VERIFIED | Present, exactly one declaration, no other rules disturbed |
| `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.tsx` / `ProjectMemberMediaGallery.tsx` | Call `SectionHeader` directly with `icon=`/`counter=`, no local wrapper | ✓ VERIFIED | `grep` for `sectionHeadRow` in production files returns zero hits |
| `frontend/src/components/fansubs/projectMember/ProjectMemberSummary.tsx` (`ProjectMemberSummaryBar`) | Removed (superseded by Hero metrics) | ✓ VERIFIED DELETED | File does not exist on disk; zero remaining references anywhere in `frontend/src` |
| `frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.tsx` | Removed (superseded by Hero metrics) | ✓ VERIFIED DELETED | File does not exist on disk; zero remaining references anywhere in `frontend/src` |
| `.planning/ROADMAP.md` | P157-02/P157-04/P157-09 rows annotated as replaced-by-decision | ✓ VERIFIED | Confirmed via direct read of the Phase 157 requirements table and the new "Nachtrag GAP-03 F5" paragraph |
| `.planning/DECISIONS.md` | New dated 2026-09-14 entry documenting the supersession + retroactive Releases-removal record | ✓ VERIFIED | Confirmed via direct read of the file tail; additive-only, prior three entries untouched |
| `.planning/phases/.../157-06-PLAN.md` | Task 4's stale wording flagged superseded | ✓ VERIFIED | XML comment present immediately before `<how-to-verify>`; Task 4's own text unmodified |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `ProjectMemberNotesSection.tsx` | `SectionHeader.tsx` | `icon={<FileText .../>} counter={<span>{count}</span>}` | ✓ WIRED | Confirmed by test `'uses the global SectionHeader icon/counter slots exclusively...'` passing live and by direct code read |
| `ProjectMemberMediaGallery.tsx` | `SectionHeader.tsx` | same pattern with `ImageIcon` | ✓ WIRED | Same, confirmed live |
| `frontend/scripts/shot-projectmember.mjs` | full-width underline + same-row counter + permanent hero-metric affordance | DOM geometry + computed-style assertions | ✓ WIRED (per SUMMARY, not independently re-run against a live browser in this pass) | 157-15-SUMMARY.md documents a live run with exit code 0 and specific measured deltas (0px); this verification pass re-ran the unit-test suite and `tsc`/`go build` live but did not itself re-run the Playwright screenshot script against the dev server — flagged under Human Verification |
| `ProjectMemberPage.tsx` | `ProjectMemberSummaryBar`/`ProjectMemberSummaryBand` | import + render | ✓ CORRECTLY NOT WIRED | Confirmed both components are deleted from disk; `ProjectMemberPage.tsx` read directly renders only Hero → Notes → Media |
| `ProjectMemberPage.tsx` | Releases section | import + render | ✓ CORRECTLY NOT WIRED | No Releases import anywhere in `ProjectMemberPage.tsx`, confirmed by direct read; intentional per documented override |

### Data-Flow Trace (Level 4)

The `episodes` count (Plan 157-01) → `ProjectMemberHero`/`HeroMetrics` → "13 Folgen" data path was
not re-touched by Plans 157-15/157-16; `git diff` on `ProjectMemberHero.tsx` for Plan 157-16's
commits is empty (confirmed via commit history: last touch was 157-14). The new `tabindex`
DOM-attribute toggle (F3) operates on already-rendered, already-sanitized `RichTextRenderer` output
— no new data source, confirmed FLOWING correctly by direct code read of the `useEffect`
dependency array and body.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| SectionHeader/HeroMetrics/notes/media unit tests pass for real | `npx vitest run` on the 4 touched test files (live, this session) | 4 files / 40 tests, all passed | ✓ PASS |
| No stray `sectionHeadRow` markup remains in production code | `grep -rn "sectionHeadRow" frontend/src/components/fansubs/projectMember/` (live, this session) | Zero production-file hits (only test-file assertions of absence) | ✓ PASS |
| Orphaned components fully removed | `ls .../ProjectMemberSummary*` + `grep -rln "ProjectMemberSummaryBar\|ProjectMemberSummaryBand" frontend/src` (live, this session) | "No such file or directory"; zero grep hits | ✓ PASS |
| TypeScript compiles cleanly project-wide | `npx tsc --noEmit` (live, this session) | Zero output (clean) | ✓ PASS |
| Backend builds cleanly | `go build ./...` (live, this session) | Zero output (clean) | ✓ PASS |
| Full frontend suite, no new regressions | `npx vitest run` (live, this session, all 322 files) | 320 passed / 1 failed test file, 2708 passed / 2 failed / 3 todo tests — both failures are the documented pre-existing `cssCustomProperties.guard.test.ts` baseline (`--surface-muted` missing-fallback finding), zero new failures | ✓ PASS (baseline-only) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention found for this project. Plans 157-15/157-16's own
`<verify>` blocks (vitest, tsc, lint, live `shot-projectmember.mjs` screenshot script) were treated
as the phase's probes. The vitest/tsc/go-build probes were independently re-run live in this
session (see Behavioral Spot-Checks above). The live `shot-projectmember.mjs` Playwright screenshot
script was **not** independently re-run by this verification pass (it requires a running dev
container with a real browser and takes several minutes); its results are taken from
157-15-SUMMARY.md's documented live run (exit code 0, all measured deltas within bounds) and are
NOT independently confirmed here — flagged explicitly under Human Verification for a fresh
confirmatory pass alongside the human sign-off, since visual/keyboard-affordance correctness is
exactly the kind of claim this verification process should not take on faith from a SUMMARY.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| P157-01 | 157-02, 157-07 | Hero layout | ✓ SATISFIED | Observable Truths table |
| P157-02 | 157-02 (superseded by 157-07, formally documented 157-16) | Statistikleiste | ✓ SATISFIED (override) | DECISIONS.md 2026-09-14 entry; ROADMAP.md annotated row |
| P157-03 | 157-02 | Tab nav active state | ✓ SATISFIED | Observable Truths table |
| P157-04 | 157-01, 157-02 (superseded by 157-07, formally documented 157-16) | Beitragszusammenfassung | ✓ SATISFIED (override) | Same as P157-02 |
| P157-05, P157-06, P157-13 | 157-03, 157-09, 157-10, 157-15 | Notes timeline, role color/name rules | ✓ SATISFIED | Observable Truths table + GAP-03 F3/F4 closure |
| P157-07 | 157-03 | Pager copy | ✓ SATISFIED | Unchanged, previously verified |
| P157-08 | 157-04, 157-15 | Media header/pager | ✓ SATISFIED | SectionHeader migration confirmed live |
| P157-09 | 157-05 (reversed by 157-08, formally documented 157-16) | Releases empty state | ✓ SATISFIED (override) | DECISIONS.md 2026-09-14 entry; ROADMAP.md annotated row |
| P157-10, P157-11 | 157-06, 157-15, 157-16 | Info hierarchy, tokens, no regressions | ✓ SATISFIED | Full suite green (baseline-only failures); hierarchy shape now matches the documented, overridden scope |
| P157-12 | 157-06, 157-15, 157-16 | Test matrix + Live-UAT sign-off | ⚠️ PARTIAL | Tests green; sign-off explicitly pending, out of scope for this pass |

**Known finding — orphaned requirement-ID tracking scheme (pre-existing, not introduced by this
run):** `grep -n "P157" .planning/REQUIREMENTS.md` returns **zero matches**. The P157-01..P157-13
requirement IDs declared across all 14 phase-157 plans' `requirements:` frontmatter fields (and
reconfirmed above in this table) are **not registered in `.planning/REQUIREMENTS.md` at all** — they
exist only in this phase's own local `157-USER-REQUEST.md`-derived tracking table inside
`ROADMAP.md`. This is a pre-existing tracking-scheme gap that predates both this verification run and
the GAP-03 closure plans (it was already true at the 2026-09-13 verification snapshot, which used the
same phase-local ROADMAP table as its requirements source and did not itself flag the
`REQUIREMENTS.md` absence). It is reported here as a known finding for awareness, not as a fresh
blocker introduced by this run, and is not something this verification pass will attempt to fix.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `ProjectMemberPage.tsx` | 58-62 | Hand-rolled empty-state `<div>` instead of the global `EmptyState` primitive (157-REVIEW.md WR-02) | ⚠️ WARNING | CLAUDE.md's Frontend-UI rule requires global primitives; not a functional defect, does not block the phase goal, but is a real design-system-consistency gap independently confirmed live in this session (`ProjectMemberPage.tsx:58-62` still shows the hand-rolled block) |
| `ProjectMemberNoteEntry.tsx` | 64 | `metaLead` can render a stray `"Folge "` fragment when `episode_label` is empty (157-REVIEW.md WR-01) | ⚠️ WARNING | Real edge-case text bug, not touched by GAP-03 closure work, does not block the phase goal |
| `ProjectMemberPage.module.css` / `ProjectMemberNotesSection.module.css` / `ProjectMemberMediaGallery.module.css` | various | Dead CSS left behind by the SectionHeader-primitive migration (157-REVIEW.md WR-03) | ⚠️ WARNING | Confirmed by the code review; unused rules, no functional impact, cosmetic tech-debt |
| `frontend/src/lib/cssCustomProperties.guard.test.ts` | 138, 142 | Pre-existing `--surface-muted` dead-reference finding | ℹ️ INFO | Confirmed pre-existing and unrelated to Phase 157 (documented baseline, reconfirmed live in this session's full-suite run) |
| `backend/internal/handlers/project_member_public_handler_test.go` | 67-97, 233-295 | Legacy `os.ReadFile`+`strings.Contains` test pattern (157-REVIEW.md IN-01) | ℹ️ INFO | Pre-existing Altlast (tracked separately per CLAUDE.md's Teststil section), not a regression from this phase |
| `backend/internal/repository/project_member_public_repository.go` | 269-271, 320-321, 373-374 | Cursor seek values interpolated via `fmt.Sprintf` instead of query parameters (157-REVIEW.md IN-02) | ℹ️ INFO | Not currently exploitable (strongly-typed inputs), flagged as future-hardening by the review |

No `TBD`/`FIXME`/`XXX` unresolved debt markers found in any file touched by Plans 157-15/157-16.

### Human Verification Required

### 1. Live Auftraggeber Sign-off (checkpoint:human-verify, Plan 157-06 Task 4, blocking) + full 157-UAT.md GAP-02/GAP-03 re-run

**Test:** Open `http://127.0.0.1:3300/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type`
through the Windows SSH tunnel. Walk the (now `<!-- Nachtrag GAP-03 F5 -->`-annotated) 157-06-PLAN.md
Task 4 checklist, substituting the superseded Statistikleiste/Beitragszusammenfassung-band wording
with the documented Hero-inline-metrics behavior. Separately re-confirm 157-UAT.md's GAP-02 checklist
points 1-9 (full-width section-header underline, in-row counter at every viewport including 200%
zoom, permanently visible hero-metric underline affordance, visible keyboard focus ring, Tab
containment for clipped note links) and GAP-03 findings F1-F5 as actually resolved when viewed live
by a human in a real browser.

**Expected:** Explicit stakeholder approval that the shipped page matches the reference design and
the full accumulated gap-closure work (GAP-01 through GAP-03).

**Why human:** Stakeholder acceptance is a judgment call, not a programmatic fact, and this
verification session's explicit instructions require this checkpoint to remain unresolved by the
verifier regardless of how the automated evidence reads. Additionally, this verification pass did
not itself re-run the live `shot-projectmember.mjs` Playwright screenshot script against a real
browser (see Probe Execution above) — its passing result is taken from 157-15-SUMMARY.md, not
independently re-confirmed. A human sign-off pass should include a fresh live screenshot/visual
check, not rely solely on this verifier's static-code-and-unit-test confirmation.

## Gaps Summary

No unresolved automated gaps remain. All previously-open findings are closed:

- The two real GAP-01/GAP-02-era-adjacent code fixes from GAP-03 (F1: SectionHeader underline/
  counter regression; F2: hero-metric clickability affordance) and the two review-sourced hardening
  fixes (F3: clamped-link Tab containment; F4: isolated stacking context) are all independently
  confirmed present and correct in the live codebase by direct code inspection and a live test run
  in this session — not trusted from either SUMMARY.md.
- The three previously-undocumented "FAILED" findings from the 2026-09-13 verification snapshot
  (P157-02, P157-04, P157-09) are now formally reconciled: `ROADMAP.md` legibly annotates all three
  as replaced-by-decision (never silently marked passed), `DECISIONS.md` carries a new durable
  2026-09-14 entry recording both the Hero-metrics supersession and — for the first time — the
  2026-09-13 Releases-removal order that had previously only been cited by name. The two resulting
  orphaned components are confirmed deleted from disk with zero remaining references. This
  verification pass accepts these three as `VERIFIED (override)` given the explicit, dated,
  DECISIONS.md-recorded stakeholder authorization — this is a materially different situation from
  the 2026-09-13 snapshot, where no such authorization existed for P157-02/P157-04.
- Full frontend `vitest run`, `tsc --noEmit`, and backend `go build ./...` were independently re-run
  live in this session (not taken from SUMMARY.md) and confirm zero new regressions beyond the
  pre-existing, documented baseline (2 `cssCustomProperties.guard.test.ts` failures, 3 todo tests).

The phase's own blocking Live-UAT sign-off checkpoint (157-06 Task 4) remains open, as it has
throughout every prior verification pass of this phase, and this run's explicit instructions require
it to stay that way — hence `status: human_needed`, not `passed`, despite every automated/must-have
criterion resolving green.

## Addendum: Orchestrator-level live screenshot pass (post-verification)

The gsd-verifier agent above noted it had not itself re-run the live `shot-projectmember.mjs`
Playwright script. Immediately after that verification pass, the orchestrating session closed that
gap directly (`docker restart team4sv30-frontend`, then a fresh in-container Playwright run):

- `node scripts/shot-projectmember.mjs` — exit 0, zero thrown assertions. Captured
  mobile/tablet/desktop viewports plus the dedicated `desktop-zoom200` (200%) pass of
  `/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type` after a full scroll-through.
  `sectionHeaderTitleRowAlignment*` facts report a `0px` heading/counter top-delta for both "Texte &
  Notizen" and "Bilder & Medien" at every viewport including 200% zoom. `heroMetricFocusAffordance`
  confirms `beforeHoverDecoration: "underline"` (permanent, pre-hover) and a real Tab-triggered
  `boxShadow` focus ring.
- Visual review of the captured PNGs confirms: full-width underline under both section headers with
  the icon+title+counter on one row at mobile/tablet/desktop/200%-zoom; "12 Beiträge" and "2 Medien"
  visibly underlined in the hero while "13 Folgen" stays plain, unstyled text.
- **"Karas" sample (Release-Seite Stichprobe):** a live release page with populated Kara/OP-ED
  segments was located via direct DB query (anime `Buddy Complex` id=1, group `New-Subs` id=1,
  release_version id=27 — the only realistic populated fixture in this environment) and screenshotted
  fresh at `/anime/1/group/1/releases/27` (`#op-ed-middle` section) at mobile/tablet/desktop. The
  `SectionHeader` there renders `class="sectionHeader sectionHeaderUnderline"` with **no**
  `sectionHeaderTitleRow`/`sectionHeaderIcon`/`sectionHeaderCounter` present — byte-identical to its
  pre-GAP-03 output, confirming the additive `icon`/`counter` props left this and all other untouched
  `SectionHeader` consumers unaffected.

This closes the one open verification caveat from the automated pass above without altering its
`status: human_needed` verdict — the blocking Live-UAT sign-off (157-06 Task 4) is still a required,
separate human step and is explicitly NOT marked passed by this addendum.

---

_Verified: 2026-09-14T19:40:01Z_
_Verifier: Claude (gsd-verifier)_
_Addendum: 2026-09-14, orchestrator session (live screenshot closure)_
