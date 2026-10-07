---
phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-
verified: 2026-10-07T10:18:31Z
status: passed
score: 9/9 must-haves verified (across 9 plans, all 3 D-07 artifacts + 10 decisions)
overrides_applied: 0
---

# Phase 175: Inventur „Doppelungen nach Fachaufgaben" Verification Report

**Phase Goal:** Für jede der 12 in D-02 benannten Fachaufgaben liegt eine fundstellenbelegte, per
Skript reproduzierbare Inventur aller UI-Flächen, Frontend-API-Funktionen, Backend-Endpunkte,
Anzeige- und Durchsetzungs-Rechte, Datenhaltung und Verhaltensabweichungen vor; jede
Rechte-Inkonsistenz ist in einer konsolidierten Matrix markiert; ein vom Auftraggeber bestätigter
Zuschnitt der Zusammenführungs-Folgephasen liegt vor — reine Analyse, keine Code-Änderung (D-01).

**Verified:** 2026-10-07T10:18:31Z
**Status:** passed
**Re-verification:** No — initial verification (no prior 175-VERIFICATION.md existed)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 12 D-02 Fachaufgaben have a complete, evidence-backed inventory (UI, Frontend-API, Backend, Rechte Anzeige+Durchsetzung, Daten, Verhalten) | ✓ VERIFIED | `175-INVENTORY.md` has one section per Fachaufgabe 1-12 (lines 12-301), each with a table covering columns (a)-(f) per D-03, citing `data/NN-*.md` fragments. Spot-checked file:line citations against live code (see Artifacts table) — all matched exactly, including non-trivial line counts (`EpisodeVersionEditorPage.tsx`=966, `useEpisodeVersionEditor.ts`=416, `workspace/page.tsx`=448, all exact). |
| 2 | Every finding carries a D-04 classification (Duplikat/Variante/legitim getrennt), with Vorbild/Altlast named for duplicates | ✓ VERIFIED | Every row across all 12 sections of `175-INVENTORY.md` carries a `D-04` column value from the exact 3 allowed values; duplicate rows explicitly name "(Vorbild)" / "(Altlast)" (e.g. Fachaufgabe 1 row 1 "Duplikat (Vorbild)", row 2 "Duplikat (Altlast)"; Fachaufgabe 3 Admin-Editor "Duplikat (Vorbild)" vs. `/me`-Workspace "Duplikat (Altlast)"). |
| 3 | Counts in inventory/matrix are script-reproducible, not hand-typed | ✓ VERIFIED | Ran all 12 `scripts/count-NN-*.sh` scripts live against the current codebase; every printed number matched the corresponding "Summenzeilen"/"Zusammenfassung" claims in `175-INVENTORY.md` word-for-word (e.g. count-01 → 15 UI/12 API/11 Backend handlers, exactly as documented; count-08 → 5 hard-delete/2 soft-delete/2 FK-unassign/1 status-transition/2 cleanup-jobs/1 orphan/1 ambiguity, exactly as documented). |
| 4 | Every Rechte-Inkonsistenz (Anzeige vs. Durchsetzung) is marked in one consolidated matrix with severity and pattern reference | ✓ VERIFIED | `175-PERMISSION-MATRIX.md` has a single table with 44 rows (lines 24-67), 6 marked `**abweichend**` + 2 marked `**n/a**` (informative, structurally inconsistent but currently unreachable), each with a dedicated "Befund"-paragraph (severity + root cause + affected role) below the table. Totals table at the end (lines 236-263) cross-foots to 44/36/6/2, matching. Several deviations spot-checked directly against source (`fansub_media_upload.go:54-72` Custom-Permission-Fallback confirmed present; `fansubEditAccess.ts:46` OR-gate confirmed `can_edit_notes \|\| can_edit_founding_history`; `NotesTab.tsx` confirmed to use only `hasActiveSession`, no capability check). |
| 5 | No deviation is fixed in this phase (D-01) — matrix/inventory are pure documentation | ✓ VERIFIED | Confirmed via git: no commit in Phase 175 (commits `5e23cf67`..`c6eb9cc7`) touches any path under `frontend/`, `backend/`, `database/`, or `shared/`. The one commit in the relevant date window that does touch `frontend/`/`backend/` (`0754cc5d`, "fix(174): ...") predates Phase 175's first commit by 36 minutes and is explicitly a Phase 174 commit, not part of this phase. |
| 6 | A user-confirmed cut of the follow-up merge phases exists (D-09) | ✓ VERIFIED | `175-09-SUMMARY.md` documents the checkpoint verbatim: user responded "approved with changes" with 6 binding changes (lines 90-99 of SUMMARY). `175-ROADMAP-PROPOSAL.md` section "Nutzer-Bestätigung" (lines 472-511) reproduces the same 6 points verbatim and lists the final confirmed order 176-183. Content cross-checked: Phase 176 risk = "mittel" (line 29, 89-92), 5 internally blocked Arbeitspakete A-E (lines 47-101), F-15 split into Phase 179 (Backend/Rechte) and 180 (Frontend/Workflow) with 180→179 dependency (lines 32-33, 187-281), Phase 181 (Release-Bearbeitung) and 179/180 (Media-Upload) explicitly sequential not parallel (lines 34, 217-219, 263-266, 301-306), Phase 182 (Bildspeicher/F-01) added with explicit "fehlte im Vorschlag" provenance note (lines 35, 329-341), final order table matches exactly (lines 491-507). |
| 7 | Phase 175 itself creates no new ROADMAP.md phase entries (D-09) | ✓ VERIFIED | `grep -n -E "Phase 17[6-9]\|Phase 18[0-3]" .planning/ROADMAP.md` returns zero matches. `.planning/ROADMAP.md`'s only change attributable to Phase 175 is its own section (line 2411 ff.) tracking 9/9 plans complete — no new phase sections for 176-183 exist anywhere in the file. |
| 8 | 175-USER-DECISIONS.md's binding decisions are reflected in 175-ROADMAP-PROPOSAL.md | ✓ VERIFIED | Member-Group-Story removal → Phase 176 Paket A (lines 52-58), explicitly "kein Nutzer-Checkpoint nötig", matrix row 6.4 marked resolved by deletion (line 426). OUTRO DB-fix + `segmenteTabUtils.ts` removal → Phase 176 Paket B (lines 59-61). F-05 root-cause (code fix without checkpoint, data cleanup with blocking checkpoint) → Phase 176 Paket C (lines 62-68), reiterated in Nutzer-Bestätigung point 2 (lines 482-484). Bug-phase-first ordering → Phase 176 placed first in the 176-183 sequence (lines 86-87, 491-507). |
| 9 | 12 Fachaufgaben-Katalog complete, no additional Fachaufgabe missed without justification (D-02) | ✓ VERIFIED | `175-INVENTORY.md` section "Zusätzliche Fachaufgaben" (lines 282-293) names 5 candidate cross-cutting concerns and explicitly rules each out with reasoning (Fansub-CRUD, Episoden anlegen, Rollenverwaltung, Mail/Toast, searchArchive) — concludes "Keine zusätzliche Fachaufgabe identifiziert". |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `175-INVENTORY.md` | D-07-Artefakt 1: per-Fachaufgabe table + classification + evidence, min 150 lines | ✓ VERIFIED | 301 lines, exceeds min. All 12 Fachaufgaben present with (a)-(f) tables, D-04 classifications, Summenzeilen cross-checked against live scripts. |
| `175-PERMISSION-MATRIX.md` | D-07-Artefakt 2: Aktion → Anzeige-Recht vs. Durchsetzungs-Recht, deviations marked, min 60 lines | ✓ VERIFIED | 270 lines, exceeds min. 44 rows, 6 deviations + 2 informative findings, each with severity + dedicated Befund paragraph. Totals cross-foot correctly. |
| `175-ROADMAP-PROPOSAL.md` | D-07-Artefakt 3: cut follow-up phases with legacy-removal naming per phase, min 60 lines | ✓ VERIFIED | 512 lines, exceeds min. Covers 8 phases (176-183), overview table + per-phase detail sections, each naming the specific legacy code/table/endpoint to be removed (D-06). Content reflects the POST-checkpoint revision (commit `ad1b1904`), not the pre-checkpoint draft (commit `d1953c0f`) — verified by reading current file content, which contains the "Nutzer-Bestätigung" section and concrete 176-183 numbering. |
| `data/01-*.md` .. `data/12-*.md` (12 fragments) | Wave-1 raw inventory per Fachaufgabe | ✓ VERIFIED | All 12 present (71-195 lines each, 1554 total), each cited by both 175-INVENTORY.md and 175-PERMISSION-MATRIX.md. |
| `scripts/count-01-*.sh` .. `scripts/count-12-*.sh` (12 scripts) | Reproduction scripts for every claimed count | ✓ VERIFIED | All 12 present and executable; all 12 ran successfully in this verification and produced output matching the documented Summenzeilen exactly. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `data/01-*.md` .. `data/12-*.md` | `175-INVENTORY.md` (175-07) | Fragment merged into combined inventory | ✓ WIRED | Every Fachaufgabe section in `175-INVENTORY.md` opens with "Quelle:... Details: `data/NN-*.md`, `scripts/count-NN-*.sh`." — explicit citation present for all 12. |
| `175-INVENTORY.md` / `175-PERMISSION-MATRIX.md` | `175-ROADMAP-PROPOSAL.md` (175-09) | Duplicate clusters and matrix deviations assigned to concrete phases | ✓ WIRED | "Zuordnung der Permission-Matrix-Abweichungen" table (lines 416-427) maps all 8 marked matrix rows (1.2, 1.4, 1.6, 5.3, 6.1, 6.2, 6.4, 8.4) to a specific phase (176 or 179) with justification. Every phase's "Umfang" section cites the originating Fachaufgabe number from `175-INVENTORY.md`. |
| `175-ROADMAP-PROPOSAL.md` | `.planning/ROADMAP.md` | NOT wired in this phase (deliberately, per D-09) | ✓ CONFIRMED ABSENT (as required) | `grep` for "Phase 176".."Phase 183" in `.planning/ROADMAP.md` returns 0 matches — the proposal is correctly NOT yet materialized into the roadmap, exactly as D-09 requires. |
| 175-09 checkpoint response | `175-ROADMAP-PROPOSAL.md` current content | User's 6 binding changes applied to the document | ✓ WIRED | Checkpoint response verbatim in `175-09-SUMMARY.md` (lines 90-99) matches the "Nutzer-Bestätigung" section verbatim in `175-ROADMAP-PROPOSAL.md` (lines 478-496); all 6 points are traceable to specific document changes (phase numbering, risk level, Paket structure, F-15 split, sequential ordering, Phase 182 addition). |

### Requirements / Decision Coverage (D-01 – D-10, no REQUIREMENTS.md mapping)

Per PLAN frontmatter (`requirements: []` in all 9 plans) and ROADMAP.md's own Requirements line
("D-01 - D-10 (Decision-Coverage via 175-CONTEXT.md, kein REQUIREMENTS.md-Mapping vorhanden)"),
this phase has no REQUIREMENTS.md entries to cross-reference. Confirmed: `grep -n "Phase 175"
.planning/REQUIREMENTS.md` returns no match — no orphaned requirement exists for this phase.
Decision coverage verified directly against 175-CONTEXT.md / 175-USER-DECISIONS.md instead:

| Decision | Description | Status | Evidence |
|----------|-------------|--------|----------|
| D-01 | Analysis only, no code changes | ✓ SATISFIED | No commit in Phase 175's commit range touches `frontend/`, `backend/`, `database/`, `shared/`. |
| D-02 | Catalog of ≥12 Fachaufgaben, extras justified | ✓ SATISFIED | All 12 covered; "Zusätzliche Fachaufgaben" section explicitly rules out 5 candidates. |
| D-03 | Per Fachaufgabe: UI, FE-API, Backend, Rechte (Anzeige+Durchsetzung), Daten, Verhalten, all evidence-backed | ✓ SATISFIED | All 12 sections in 175-INVENTORY.md have (a)-(f) columns with Datei:Zeile citations; spot-checked citations are accurate. |
| D-04 | Classification: Duplikat/Variante/legitim getrennt, Vorbild/Altlast named | ✓ SATISFIED | Every inventory row carries exactly one of the 3 allowed values; duplicates name Vorbild/Altlast. |
| D-05 | Rechte-consistency checked first, every deviation documented with severity | ✓ SATISFIED | 175-PERMISSION-MATRIX.md documents 8 marked rows (6 deviating + 2 informative) each with severity and root-cause paragraph; none fixed (per D-01). |
| D-06 | Merge goal: ONE rights-based implementation, legacy removed (no side-by-side) | ✓ SATISFIED | Every phase proposal in 175-ROADMAP-PROPOSAL.md has an explicit "Vorbild/Altlast (D-06)" subsection naming exactly what gets removed. |
| D-07 | 3 deliverables: INVENTORY.md, PERMISSION-MATRIX.md, ROADMAP-PROPOSAL.md | ✓ SATISFIED | All 3 exist, substantive, cross-linked (see Artifacts table). |
| D-08 | Input material referenced (174-FOLLOWUPS.md etc.), sketch read-only not modified | ✓ SATISFIED | F-01/F-02/F-05/F-13/F-15/F-16/F-18 references verified to exist verbatim in `174-FOLLOWUPS.md`. Sketch directory `.planning/sketches/010-galerie-detailansicht` untouched by any Phase 175 commit (still untracked in working tree, exactly as it was before Phase 175 began — explicitly disclaimed as out-of-scope in 175-09-SUMMARY.md "Issues Encountered"). |
| D-09 | Checkpoint before any follow-up phase is created; Phase 175 creates no ROADMAP.md phase entries itself | ✓ SATISFIED | Checkpoint executed and documented verbatim; `.planning/ROADMAP.md` contains zero "Phase 176".."Phase 183" matches. |
| D-10 | Git discipline: main branch, exact paths only, no `git add .`/`git stash`, sketches untouched | ✓ SATISFIED | All 28 Phase 175 commits checked individually — none touch `.planning/sketches/` or `frontend/backend/database/shared/`. Working tree's pre-existing uncommitted sketch changes (visible in `git status`) predate and are unrelated to Phase 175. |

### Anti-Patterns Found

None. Scanned all `data/*.md` and `175-*.md` artifacts for `TBD|FIXME|XXX`, `TODO|HACK|PLACEHOLDER`,
and "not yet implemented"/"coming soon" patterns. The only "placeholder" hits are legitimate
documentation of HTML `placeholder` attributes found during the search-filter inventory (Fachaufgabe
7), not debt markers in the phase's own deliverables.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| count-01 script reproduces documented UI/API/Backend counts | `bash scripts/count-01-medien-hochladen.sh` | 15 UI / 12 API / 11 Backend — matches INVENTORY.md Summenzeile exactly | ✓ PASS |
| count-08 script reproduces documented delete-mechanism counts | `bash scripts/count-08-loeschen-aufraeumen.sh` | 5 hard-delete / 2 soft-delete / 2 FK-unassign / 1 status-transition / 2 cleanup-jobs / 1 orphan / 1 ambiguity — all match | ✓ PASS |
| All remaining 10 count scripts (02-07, 09-12) execute cleanly and match documented numbers | `bash scripts/count-NN-*.sh` for each | All 10 ran with exit 0, all printed numbers matched the corresponding data/NN-*.md and 175-INVENTORY.md claims | ✓ PASS |
| File:line citations in INVENTORY.md/PERMISSION-MATRIX.md are accurate | `sed -n` on cited files/lines (fansub_media_upload.go, member_claim_invitations_handler.go, fansubEditAccess.ts, NotesTab.tsx, ReleaseVersionMediaSection.tsx, EpisodeVersionEditorPage.tsx, useEpisodeVersionEditor.ts, workspace/page.tsx) | All citations matched exactly, including exact line-count claims (966/416/448 lines) | ✓ PASS |
| ROADMAP.md contains no new Phase 176-183 sections (D-09 compliance) | `grep -n -E "Phase 17[6-9]\|Phase 18[0-3]" .planning/ROADMAP.md` | 0 matches | ✓ PASS |
| No Phase 175 commit touches frontend/backend/database/shared/sketches (D-01/D-10) | `git show --stat` for all 28 Phase 175 commits, checked against disallowed path prefixes | 0 violations found | ✓ PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` convention; the 12
`scripts/count-NN-*.sh` reproduction scripts were executed directly above (see Behavioral
Spot-Checks) and all passed (exit 0).

### Human Verification Required

None. This is a pure documentation/analysis phase; the one planned human-interaction point
(Task 2, `checkpoint:decision` in 175-09) has already been resolved during execution — the
user's verbatim response is recorded in `175-09-SUMMARY.md` and its content is reflected in
`175-ROADMAP-PROPOSAL.md`. No further human testing is needed to confirm goal achievement.

### Gaps Summary

No gaps found. All 9 observable truths verified, all 3 mandatory D-07 artifacts exist and are
substantive (and the ROADMAP-PROPOSAL.md content reflects the post-checkpoint revision, not the
pre-checkpoint draft), all 10 locked decisions (D-01–D-10) are satisfied, D-09 roadmap-isolation
is confirmed by direct grep against `.planning/ROADMAP.md`, and spot-checks of file:line evidence
against the live codebase found zero fabricated or stale citations across 8 independently checked
files plus all 12 reproduction scripts.

---

_Verified: 2026-10-07T10:18:31Z_
_Verifier: Claude (gsd-verifier)_
