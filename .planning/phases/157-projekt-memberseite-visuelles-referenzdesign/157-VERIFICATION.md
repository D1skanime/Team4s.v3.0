---
phase: 157-projekt-memberseite-visuelles-referenzdesign
verified: 2026-09-13T12:07:05Z
status: gaps_found
score: 10/13 roadmap requirements verified
overrides_applied: 0
gaps:
  - truth: "P157-02: Eine kompakte Statistikleiste mit Icon+Zahl+Label in Referenz-Reihenfolge (Rolle, Beitraege, Medien, Releases), korrekter Singular/Plural; keine vier grossen Boxen"
    status: failed
    reason: >
      The dedicated stat-bar component (ProjectMemberSummaryBar, exported from
      ProjectMemberSummary.tsx, built and tested in Plan 157-02) is no longer imported or
      rendered anywhere in the app. It was removed from ProjectMemberPage.tsx by commit
      1332686b (Plan 157-07's Hero consolidation), which folded a 3-metric inline row
      (Folgen / Beiträge / Medien -- no numeric "Rolle(n)" count, no Releases count, different
      order than specified) directly into ProjectMemberHero via HeroMetrics variant="inline"
      instead. This is confirmed in 157-07-SUMMARY.md itself ("Separate Statistik-Card und
      Summary-Band werden auf dieser Seite nicht mehr gerendert ... keine Nebenbereinigung")
      and self-verified by the screenshot script's own SHOT_VERIFY_HERO assertion, which
      throws unless statBarEntryCount === 0 -- i.e. the script now asserts the stat bar's
      ABSENCE as the expected state. Unlike the Releases-section removal (157-08), which
      DECISIONS.md explicitly ties to "ausdruecklichen Nutzerauftrag", no equivalent
      authorization is recorded for dropping the stat bar. ROADMAP.md's P157-02 row and phase
      goal text were never amended to reflect this, and the still-open 157-06 Task 4
      checkpoint instructions still tell the human reviewer to check for "Statistikleiste (one
      card, 4 entries, correct order/labels)", which no longer exists as specified.
    artifacts:
      - path: "frontend/src/components/fansubs/projectMember/ProjectMemberSummary.tsx"
        issue: "Exports ProjectMemberSummaryBar; zero importers anywhere in frontend/src (orphaned, dead code)"
      - path: "frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx"
        issue: "Does not import or render ProjectMemberSummaryBar; only 3 inline Hero metrics remain (Folgen/Beiträge/Medien), missing Rolle(n) and Releases counts from the required order"
    missing:
      - "Either re-wire ProjectMemberSummaryBar back into ProjectMemberPage.tsx per the original P157-02 spec, or obtain an explicit, ROADMAP-recorded stakeholder decision (equivalent to the 157-08 Releases-removal authorization) accepting the Hero-inline-metrics replacement, then update ROADMAP.md's P157-02 row and the phase goal text to match reality"
  - truth: "P157-04: Beitragszusammenfassung liest z. B. 'Rolle fuer N Folgen · M dokumentierte Arbeitsnotizen · K Medien'"
    status: failed
    reason: >
      The dedicated ProjectMemberSummaryBand component (built and tested in Plan 157-02,
      consuming the real episodes count from Plan 157-01) is no longer imported or rendered
      anywhere in the app. It was removed from ProjectMemberPage.tsx in the same commit
      (1332686b / Plan 157-07) as the stat bar, for the same undocumented reason. The
      component and its test file still exist and still pass in isolation
      (ProjectMemberSummaryBand.test.tsx, 3/3 green), proving the feature works correctly but
      is simply disconnected from the page. The screenshot script's SHOT_VERIFY_HERO check
      throws unless summaryBandText === null, i.e. it now asserts the band's ABSENCE. The
      still-open 157-06 Task 4 checkpoint instructions still tell the human reviewer to check
      for the band text ("...für 13 Folgen · 12 dokumentierte Arbeitsnotizen · 2 Medien"),
      which cannot be found on the live page today.
    artifacts:
      - path: "frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.tsx"
        issue: "Fully implemented and unit-tested component; zero importers anywhere in frontend/src (orphaned, dead code)"
      - path: "frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx"
        issue: "Does not import or render ProjectMemberSummaryBand"
    missing:
      - "Either re-wire ProjectMemberSummaryBand back into ProjectMemberPage.tsx per the original P157-04 spec, or obtain an explicit, ROADMAP-recorded stakeholder decision accepting its removal, then update ROADMAP.md's P157-04 row and the phase goal text to match reality"
  - truth: "P157-09: Bei 0 Releases kompakter Empty-State statt grosser Leerflaeche; keine Doppelinformation aus Zaehler und 'Alle 0 angezeigt'"
    status: failed
    reason: >
      Plan 157-05 correctly implemented this exact requirement (EmptyState primitive, Package
      icon, 'Noch keine öffentlichen Release-Einträge.' sentence) and it was verified working.
      However, Plan 157-08 (a later, separate "Folgeauftrag" dated 2026-09-13, explicitly
      attributed in DECISIONS.md to "ausdruecklichen Nutzerauftrag") removed the entire
      Releases section, tab, counter, and this empty-state component from the page
      (ProjectMemberReleasesSection.tsx and its card/CSS/tests were deleted outright). This
      specific deviation IS traceable to an explicit user order (unlike the P157-02/P157-04
      findings above), so it is lower-severity than those two, but ROADMAP.md's P157-09 row
      and the phase goal text ("... und ein kompakter Releases-Empty-State ...") were never
      amended to reflect the pivot, so the roadmap's own success-criteria table is now stale
      and literally unsatisfiable as written.
    artifacts:
      - path: "frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx"
        issue: "No Releases section, tab, or empty-state renders anywhere on the page (feature deliberately removed by Plan 157-08, per DECISIONS.md's 2026-09-13 entry)"
    missing:
      - "Update ROADMAP.md's phase-157 goal text and P157-09 row (or add a formal override in this VERIFICATION.md's frontmatter) to record that the Releases section -- and therefore any Releases-Empty-State -- was intentionally removed per the 2026-09-13 follow-up user order, so the roadmap contract matches the shipped product"
deferred: []
human_verification:
  - test: "Live Auftraggeber Sign-off (checkpoint:human-verify, Plan 157-06 Task 4, gate=\"blocking\")"
    expected: "The Auftraggeber opens http://127.0.0.1:3300/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type through the SSH tunnel and explicitly approves the page against 157-CONTEXT.md's reference spec"
    why_human: "This is a stakeholder acceptance decision (explicit sign-off), not a programmatically verifiable fact. It has NOT happened yet -- STATE.md and ROADMAP.md both currently and correctly record Phase 157 as open pending this sign-off. NOTE: the checkpoint's own how-to-verify checklist (157-06-PLAN.md Task 4) is now stale -- it instructs the reviewer to check for a 'Statistikleiste (one card, 4 entries...)' and a 'Beitragszusammenfassung band' that no longer render on the page (see gaps above), so the checklist itself needs correction before a meaningful sign-off pass can occur."
---

# Phase 157: Projekt-Memberseite visuell auf Referenzdesign umbauen — Verification Report

**Phase Goal:** Die oeffentliche Projekt-Member-Seite entspricht in Informationshierarchie,
Reihenfolge, Kartengroessen, Abstaenden und Typografie dem vom Auftraggeber beigefuegten
Referenzdesign: kompakter Profilkopf, eine Statistikleiste statt vier Karten, Tab-Navigation mit
Aktivzustand, eine Beitragszusammenfassung, Notizen als kompakte Timeline ohne redundanten
Rollen-Header je Beitrag, Medienbereich nach Referenz und ein kompakter Releases-Empty-State — bei
unveraenderter fachlicher Semantik.

**Verified:** 2026-09-13T12:07:05Z
**Status:** gaps_found
**Re-verification:** No — initial verification of the full phase (10/10 plans executed, including
the just-completed Plan 157-10 GAP-01 gap-closure)

## Goal Achievement

### Observable Truths (ROADMAP P157-01 .. P157-13, the phase's own requirement table)

| # | Truth (ROADMAP wording, abbreviated) | Status | Evidence |
|---|---|---|---|
| P157-01 | Hero: avatar left, name/verified/context/role-chip right, actions side-by-side (stack on narrow) | ✓ VERIFIED | `ProjectMemberHero.tsx` renders `ArtworkHero` with avatar/status/roles/context/metrics/actions slots; `.actions { flex-wrap: wrap }` in `ArtworkHero.module.css`; mobile avatar/name-row stacking fix confirmed in `deferred-items.md` "D (mobile hero stacking): fixed" |
| P157-02 | ONE stat-bar card, 4 entries, order Rolle/Beiträge/Medien/Releases | ✗ **FAILED** | `ProjectMemberSummaryBar` (in `ProjectMemberSummary.tsx`) is built + tested but has **zero importers** anywhere in `frontend/src` — confirmed via `grep`. Removed from `ProjectMemberPage.tsx` by commit `1332686b`. See gap below. |
| P157-03 | Tab nav, visible active state, no clipping at 390px | ✓ VERIFIED | `ProjectMemberStickyNav.tsx` uses `IntersectionObserver` scrollspy + click-to-activate (`stickyNavItemActive` class), `flex-wrap` instead of `overflow-x` (code read directly) |
| P157-04 | Beitragszusammenfassung band, real episodes count sentence | ✗ **FAILED** | `ProjectMemberSummaryBand` is built + unit-tested (3/3 green in isolation) but has **zero importers** anywhere in `frontend/src`. Removed from `ProjectMemberPage.tsx` in the same commit. See gap below. |
| P157-05 | Notes as compact timeline rows, no role header, no double episode line | ✓ VERIFIED | `ProjectMemberNoteEntry.tsx` renders meta/title/clamped-body/chevron with no role-header block; `screen.queryByText('Notiz zu Folge')` asserted null in tests; live shot script confirms `roleRepeatsInNotes` behavior |
| P157-06 | Role name only shown when >1 project role; role color always | ✓ VERIFIED | `hasMultipleRoles` prop gates `showRoleChip`; `data-color-key` unconditional on both `<article>` and the anchor; live dot color `rgb(123,60,78)` confirmed across all 3 viewports |
| P157-07 | Pager: "Weitere N Beiträge anzeigen" with real batch size | ✓ VERIFIED | `ProjectMemberNotesSection.test.tsx` asserts literal text `'Weitere 9 Beiträge anzeigen'` against a real 24-item/15-shown fixture; test passes |
| P157-08 | Media header icon+count, 2-3 col gallery, no "Alle N angezeigt" once fully loaded | ✓ VERIFIED | `ProjectMemberMediaGallery.tsx` renders `ImageIcon` header; live shot facts show `mediaAllShownTextPresent: false` on all 3 viewports |
| P157-09 | 0-Releases compact empty state, no "Alle 0 angezeigt" duplication | ✗ **FAILED** (documented, authorized deviation — see below) | Entire Releases section/tab/counter/empty-state was deleted in Plan 157-08 per an explicit later user order (`DECISIONS.md` 2026-09-13 entry: "Auf ausdrücklichen Nutzerauftrag"). Feature literally does not exist to have an empty state. ROADMAP.md was never amended. |
| P157-10 | Info hierarchy Person→Rolle→Umfang→Beiträge→Medien→Releases; clean 320-1440px, no horizontal scrollbar | ⚠️ PARTIAL | `horizontalOverflow: false` confirmed live on all 3 viewports (mobile/tablet/desktop) via `shot-projectmember.mjs`. The "Umfang" (Beitragszusammenfassung) step of the hierarchy is missing per the P157-04 gap above, so the hierarchy itself is incomplete, not just narrower-than-planned |
| P157-11 | Design language/tokens preserved; no regressions; no backend parallel structure | ✓ VERIFIED (with the P157-02/04 caveat) | Single `data-color-key → globals.css → --role-accent` seam confirmed (no hex literals in touched CSS); `tsc --noEmit` clean; `go build ./...` clean; full frontend suite 2332/2339 passing (4 pre-existing unrelated flakes, confirmed not introduced by Phase 157 — see Anti-Patterns section) |
| P157-12 | Test matrix adapted + green; Live-UAT screenshots vs. reference documented | ⚠️ PARTIAL | Test matrix green (verified: `ProjectMemberNotesSection.test.tsx` 17/17, full suite 2332/2339 with only pre-existing unrelated flakes). Live-UAT screenshots exist and were run live by this verification (exit code 0, all 3 viewports). **Final stakeholder sign-off has not happened** — this is the still-open blocking checkpoint (see Human Verification below) |
| P157-13 | Role color mandatory at every entry via the single central seam, regardless of role count | ✓ VERIFIED | Live `dotColor: rgb(123, 60, 78)` (= `#7b3c4e`) confirmed on every note entry across all 3 viewports; `ProjectMemberNoteEntry.module.css` has exactly one `role-accent` reference (`.dot`'s `background`); mixed-role regression test (`P157-13 Nachtrag 2`) passes |

**Score:** 10/13 roadmap requirements verified (2 real, undocumented-authorization FAILs: P157-02,
P157-04; 1 documented-but-unreconciled FAIL: P157-09; 1 PARTIAL structural consequence: P157-10;
1 PARTIAL pending-signoff: P157-12)

### GAP-01 Closure (Plan 157-10) — Verified In Depth

This session's actual deliverable, the GAP-01 nested-interactive-markup + role-color
double-marking fix from `157-UAT.md`, was independently re-verified (not trusted from
157-10-SUMMARY.md) and holds up:

- `ProjectMemberNoteEntry.tsx` root is now `<article>` (not `<Link>`); exactly one `<Link>`
  remains (`grep -c "<Link"` = 1), wrapping only the chevron with a CSS-only stretched-link
  overlay (`.entryLink::after { position: absolute; inset: 0; z-index: 1 }`).
- `border-inline-start` fully removed from the CSS module (`grep -c` = 0); `role-accent` appears
  exactly once (`.dot`'s `background`); border is `1px solid var(--border-subtle)` uniformly.
- `-webkit-line-clamp` reduced from 4 to 3 (confirmed both in source and live: overflowing entries
  now cap at 52.78px vs. the previously measured 105.56px at 4 lines).
- `ProjectMemberNotesSection.test.tsx`: **17/17 tests pass** (9 pre-existing + 8 new GAP-01 tests),
  run live in this verification session, not taken from the SUMMARY.
- `npx tsc --noEmit`: clean. `npx eslint` on the 3 touched files: clean (0 errors).
- `frontend/scripts/shot-projectmember.mjs` run live against the real dev stack in this
  verification session (not trusted from SUMMARY): exit code 0 for all 3 viewports;
  `noteNestedInteractiveViolations: 0` and uniform `noteBorderUniformity` (`top === inlineStart`)
  confirmed on every entry, every viewport; `dotColor: rgb(123, 60, 78)` confirmed on every entry.
- An independent code review (`157-REVIEW.md`, run earlier this session) found **no BLOCKER**
  in the GAP-01 fix itself, only 4 WARNING-level test-coverage/robustness gaps (tests assert DOM
  identity rather than exercising real click-through behavior; a redundant/dead `data-color-key`
  copy on the entryLink; a focus-order edge case for links inside a collapsed/clipped preview; a
  missing `isolation: isolate` on `.entry` for z-index hygiene). None of these block the phase
  goal, but they should be tracked as follow-up hardening (see Anti-Patterns table below).

GAP-01 itself is **closed and verified**. The gaps below are pre-existing, phase-goal-level issues
this verification uncovered independently of GAP-01.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `ProjectMemberNoteEntry.tsx` | Compact timeline row, single anchor, no nested interactive markup | ✓ VERIFIED | Code-read + live-browser confirmed |
| `ProjectMemberNoteEntry.module.css` | Single role-color carrier, uniform border, 3-line clamp | ✓ VERIFIED | grep counts + live computed styles confirmed |
| `ProjectMemberNotesSection.test.tsx` | Full GAP-01 test matrix + existing tests | ✓ VERIFIED | 17/17 passing, live run |
| `frontend/scripts/shot-projectmember.mjs` | Extended live-UAT assertions | ✓ VERIFIED | Live run, exit 0, all 3 viewports |
| `ProjectMemberSummary.tsx` (`ProjectMemberSummaryBar`) | Rendered single-card stat strip on the live page | ✗ **ORPHANED** | Component exists, compiles, has no test file of its own, but is imported nowhere |
| `ProjectMemberSummaryBand.tsx` | Rendered contribution-summary sentence on the live page | ✗ **ORPHANED** | Component exists, has 3 passing unit tests, but is imported nowhere |
| `ProjectMemberReleasesSection.tsx` | Compact 0-count empty state | ✗ **DELETED** | File no longer exists (removed by Plan 157-08 per explicit later user order) |
| `backend/internal/repository/project_member_public_repository.go` (`countEpisodes`) | Additive `episodes` count, one query, reused predicates | ✓ VERIFIED | `countEpisodes` present, wired into `GetSummary`, `go build ./...` clean |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `ProjectMemberNoteEntry.tsx` | `globals.css` role-accent seam | `data-color-key` attribute | ✓ WIRED | Live dot color confirmed non-neutral, matches catalog hex |
| `ProjectMemberNotesSection.test.tsx` | `ProjectMemberNoteEntry.tsx` | `getByRole('link')` | ✓ WIRED | Resolves to the single stretched-link anchor per entry |
| `ProjectMemberPage.tsx` | `ProjectMemberSummaryBar` (`ProjectMemberSummary.tsx`) | import + render | ✗ **NOT WIRED** | Import removed by commit `1332686b`; component is dead code |
| `ProjectMemberPage.tsx` | `ProjectMemberSummaryBand.tsx` | import + render | ✗ **NOT WIRED** | Import removed by commit `1332686b`; component is dead code |
| `ProjectMemberPage.tsx` | `ProjectMemberReleasesSection.tsx` | import + render | ✗ **NOT WIRED (file deleted)** | Deliberate removal, Plan 157-08 |

### Data-Flow Trace (Level 4)

Not applicable in the failing direction (the orphaned components' own data flow — `counts` →
`ProjectMemberSummaryBar`/`summary` → `ProjectMemberSummaryBand` — is intact and unit-tested; the
break is entirely at the render-tree wiring level: `ProjectMemberPage.tsx` never instantiates
either component). The notes timeline's role-color data flow (`role_color_key` →
`boundedColorKey` → `data-color-key` → `globals.css` → `--role-accent` → `.dot`) was traced and
confirmed FLOWING with real per-role hex values live in the browser.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Note timeline test suite passes for real | `vitest run ProjectMemberNotesSection.test.tsx` (live) | 17/17 passed | ✓ PASS |
| No nested interactive markup, live browser | `shot-projectmember.mjs` (live, all 3 viewports) | `noteNestedInteractiveViolations: 0` everywhere | ✓ PASS |
| No horizontal scrollbar, live browser | `shot-projectmember.mjs` (live, all 3 viewports) | `horizontalOverflow: false` everywhere | ✓ PASS |
| Media "Alle N angezeigt" absent once fully loaded | `shot-projectmember.mjs` (live) | `mediaAllShownTextPresent: false` everywhere | ✓ PASS |
| Backend builds | `go build ./...` (live) | exit 0, no output | ✓ PASS |
| Full frontend suite | `vitest run` (live, all 302 files) | 2332 passed / 4 failed / 3 todo | ⚠️ 4 pre-existing, unrelated flakes (see below) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention found for this project; Plan 157-10's own `<verify>`
blocks (tsc, eslint, vitest, live screenshot script) were treated as the phase's probes and were
all re-run live in this session rather than trusted from SUMMARY.md, per above.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| P157-01 | 157-02, 157-07 | Hero layout | ✓ SATISFIED | see Observable Truths table |
| P157-02 | 157-02 (removed by 157-07) | Statistikleiste | ✗ **BLOCKED** | orphaned `ProjectMemberSummaryBar` |
| P157-03 | 157-02 | Tab nav active state | ✓ SATISFIED | see Observable Truths table |
| P157-04 | 157-01, 157-02 (removed by 157-07) | Beitragszusammenfassung | ✗ **BLOCKED** | orphaned `ProjectMemberSummaryBand` |
| P157-05, P157-06, P157-13 | 157-03, 157-09, 157-10 | Notes timeline, role color/name rules | ✓ SATISFIED | see GAP-01 section + Observable Truths |
| P157-07 | 157-03 | Pager copy | ✓ SATISFIED | test assertion, live |
| P157-08 | 157-04 | Media header/pager | ✓ SATISFIED | live facts |
| P157-09 | 157-05 (reversed by 157-08) | Releases empty state | ✗ **BLOCKED** (documented deviation) | feature deleted, ROADMAP not reconciled |
| P157-10, P157-11 | 157-06 | Info hierarchy, tokens, no regressions | ⚠️ PARTIAL | hierarchy incomplete per P157-02/04 gap |
| P157-12 | 157-06 | Test matrix + Live-UAT sign-off | ⚠️ PARTIAL | tests green, sign-off pending |

No orphaned requirement IDs found outside the P157-01..P157-13 set declared across the 10 plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `ProjectMemberSummary.tsx` | whole file | Orphaned/dead component (no importer) | 🛑 BLOCKER | Directly causes the P157-02 gap |
| `ProjectMemberSummaryBand.tsx` | whole file | Orphaned/dead component (no importer) | 🛑 BLOCKER | Directly causes the P157-04 gap |
| `ProjectMemberNoteEntry.tsx` | 108-115 | Redundant `data-color-key` on the entryLink `<Link>` (has zero visual effect; `.dot`'s copy on `<article>` is the only one that matters) | ⚠️ WARNING | Not a functional defect today, but tests assert on the dead copy (157-REVIEW.md WR-02); a future cleanup could silently break color regression coverage |
| `ProjectMemberNoteEntry.module.css` | 6-16, 127-132 | `.entry` establishes `position: relative` without `isolation: isolate`, so the stretched-link overlay's `z-index` values are not locally scoped | ⚠️ WARNING | 157-REVIEW.md WR-04; works today, fragile against future unrelated `z-index` additions elsewhere on the page |
| `ProjectMemberNoteEntry.module.css` | 96-103 | `.bodyClamped` can visually hide (fully clip) a body-embedded `<a>` while leaving it keyboard-focusable, with no location-specific focus indicator | ⚠️ WARNING | 157-REVIEW.md WR-03; WCAG 2.4.7-adjacent gap, pre-existing pattern made slightly worse by the 4→3 line clamp reduction |
| `ProjectMemberNotesSection.test.tsx` | 200-215, 291-296 | Two new GAP-01 tests are named for click-through/keyboard-activation behavior but only assert DOM identity/focusability | ⚠️ WARNING | 157-REVIEW.md WR-01; overclaiming test coverage, not a functional defect |
| `frontend/src/lib/cssCustomProperties.guard.test.ts` | 142 | Pre-existing line-number-hardcoded allow-list drifted (line 282→268) after an unrelated file edit | ℹ️ INFO | Confirmed pre-existing (commit `1332686b`, before Plan 157-10's scope), not a Phase 157 regression |
| `frontend/src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx` | — | 2 tests time out under full-suite parallel load | ℹ️ INFO | Confirmed pre-existing (commit `f4b8b560`, Phase 151), not a Phase 157 regression |
| `frontend/src/app/me/profile/page.test.tsx` | — | 1 test timed out under full-suite parallel load, passes 46/46 in isolation | ℹ️ INFO | Confirmed flake, unrelated file (last touched by Phase 153/136/128 commits), not a Phase 157 regression |

No `TBD`/`FIXME`/`XXX` unresolved debt markers found in any file touched by Plan 157-10.

### Human Verification Required

### 1. Live Auftraggeber Sign-off (checkpoint:human-verify, Plan 157-06 Task 4, blocking)

**Test:** Open `http://127.0.0.1:3300/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type`
through the Windows SSH tunnel and walk the reference-spec checklist from `157-CONTEXT.md`.
**Expected:** Explicit stakeholder approval that the page matches the reference design.
**Why human:** Stakeholder acceptance is a judgment call, not a programmatic fact — and per this
verification session's explicit instructions, this outstanding checkpoint must not be resolved by
the verifier itself. **Additional finding to flag to the human before this sign-off is meaningful:**
the checkpoint's own how-to-verify checklist (157-06-PLAN.md Task 4) still asks the reviewer to
confirm a "Statistikleiste (one card, 4 entries, correct order/labels)" and a "Beitragszusammenfassung
band" — both of which were removed from the page by the later Plan 157-07 and no longer exist to be
checked. The checklist should be corrected (or the removal formally re-approved) before running this
sign-off, otherwise the human will be verifying against stale instructions.

## Gaps Summary

Plan 157-10's actual assignment (closing GAP-01 — invalid nested-interactive markup and role-color
double-marking in the note timeline) is fully and independently verified as closed: real code
inspection, a live test run (17/17), clean `tsc`/`eslint`, and a live browser run of the extended
`shot-projectmember.mjs` script all confirm the fix, corroborated by an independent code review that
found no blocker in the fix itself.

However, goal-backward verification of the **whole phase** (not just this session's plan) surfaced
two undocumented regressions that block the ROADMAP's own phase goal: the dedicated Statistikleiste
(`ProjectMemberSummaryBar`, P157-02) and Beitragszusammenfassung (`ProjectMemberSummaryBand`,
P157-04) were both fully built and unit-tested in Plan 157-02, then silently disconnected from the
live page by Plan 157-07's Hero-consolidation commit (`1332686b`) — confirmed by `grep`-verified
zero importers, a diff showing their imports/JSX being deleted, and the screenshot script's own
`SHOT_VERIFY_HERO` check now asserting their absence as correct. Unlike the Releases-section removal
(Plan 157-08), which DECISIONS.md explicitly ties to a stakeholder order, no equivalent authorization
exists for dropping these two elements, and ROADMAP.md's phase goal text and requirement rows for
P157-02/P157-04/P157-09 were never reconciled with the shipped product. The phase cannot be
considered goal-achieved until either the components are re-wired or the roadmap/requirement
contract is formally amended to match an approved, authorized new design. Separately, the phase's
own blocking Live-UAT sign-off checkpoint (157-06 Task 4) remains open and — because its checklist
still references the now-removed elements — needs correction before it can be run meaningfully.

---

_Verified: 2026-09-13T12:07:05Z_
_Verifier: Claude (gsd-verifier)_
