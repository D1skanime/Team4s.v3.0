---
phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-
plan: 03
subsystem: docs
tags: [permissions, review-workflow, capability-resolver, inventory, grep-analysis]

# Dependency graph
requires:
  - phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
    provides: BUG-174-02/BUG-174-04 (rights display-vs-enforcement mismatches, both documented as fixed) and D-07 "Rights Resolution: false positive" hotspot classification
provides:
  - data/04-pruefen-freigeben.md — Fachaufgabe 4 (Prüfen & Freigeben) full inventory with 11 display-vs-enforcement rights comparisons across 4 review surfaces
  - data/10-rechte-anzeigen-durchsetzen.md — Fachaufgabe 10 (Rechte anzeigen vs. durchsetzen) capability-infrastructure inventory with a 9-action cross-Fachaufgabe sample
  - Re-verification of BUG-174-02/BUG-174-04 against current code (not just cited from 174-BUGS.md)
affects: [175-08-permission-matrix, 175-09-roadmap-proposal]

# Tech tracking
tech-stack:
  added: []
  patterns: [grep-based reproducible inventory scripts under phase scripts/ directory]

key-files:
  created:
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/04-pruefen-freigeben.md
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-04-pruefen-freigeben.sh
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/10-rechte-anzeigen-durchsetzen.md
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-10-rechte-anzeigen-durchsetzen.sh
  modified: []

key-decisions:
  - "BUG-174-02 and BUG-174-04 re-verified against current code (not re-cited from 174-BUGS.md): both confirmed still fixed and consistent across every consumer, including sections 174 did not check (release notes review, group-media review section itself, not just the dashboard hint)."
  - "9-action cross-Fachaufgabe sample for Fachaufgabe 10 found 0 new display-vs-enforcement string mismatches, confirming the 174-HOTSPOTS D-07 'false positive' classification of the central rights resolver still holds."
  - "Documented two non-rights observations for the roadmap proposal instead of fixing them (D-01): a dead anime_contributions.review_status_id column never written by Confirm/Reject, and a missing dashboard attention hint for pending contribution proposals (the only one of 4 review surfaces without one)."

requirements-completed: []

# Metrics
duration: ~25min
completed: 2026-10-07
---

# Phase 175 Plan 03: Fachaufgabe 4 + 10 Inventory (Prüfen & Freigeben / Rechte anzeigen vs. durchsetzen) Summary

**Full display-vs-enforcement rights audit of all 4 review surfaces (group media, release images, release notes, contribution proposals) plus a 9-action cross-Fachaufgabe capability sample — both found 0 new Anzeige/Durchsetzung mismatches, confirming BUG-174-02/BUG-174-04 fixes hold and the central rights resolver remains a legitimate single implementation.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-10-07
- **Tasks:** 2/2 completed
- **Files created:** 4 (2 data fragments + 2 count scripts)

## Accomplishments

- Documented all 4 "Prüfen & Freigeben" review surfaces (Gruppenmedien, Release-Bilder, Release-Notizen, Beiträge) with 11 explicit display-vs-enforcement rights comparisons, each backed by file:line citations on both sides.
- Re-verified BUG-174-02 (dashboard group-media review hint) and BUG-174-04 (non-uploader edit resubmission) against the *current* code rather than trusting 174-BUGS.md's "behoben" claim — confirmed both fixes are complete and propagated to every consumer, not just the originally-reported one.
- Extended the audit to two review surfaces 174 never checked (release-notes review, contribution-proposal review) — both found consistent.
- Sampled 9 actions across 4 Fachaufgaben (Gruppenverwaltung, Prüfen & Freigeben, Release bearbeiten, Mitglieder/Claims) for Fachaufgabe 10, each with a display-field citation and an enforcement-handler citation — 0 string mismatches, reconfirming 174-HOTSPOTS D-07's "Rights Resolution: false positive" verdict.
- Identified two non-rights findings for the upcoming `175-ROADMAP-PROPOSAL.md`: a dead `anime_contributions.review_status_id` column, and a missing dashboard attention lane for pending contribution proposals (the only one of 4 review surfaces without a "me/dashboard" hint).

## Task Commits

1. **Task 1: Fachaufgabe 4 — Prüfen & Freigeben inventory** - `86b29196` (docs)
2. **Task 2: Fachaufgabe 10 — Rechte anzeigen vs. durchsetzen inventory** - `ca470361` (docs)

**Plan metadata:** committed with this SUMMARY.

_Note: pure read/analysis plan (D-01) — no feat/fix/test/refactor commits, only docs commits containing the markdown fragments and their reproducible count scripts._

## Files Created/Modified

- `data/04-pruefen-freigeben.md` - Fachaufgabe 4 full inventory: 4 review surfaces, 11 rights comparison points, 4 review_status storage locations, bulk/dashboard-hint behavior matrix
- `scripts/count-04-pruefen-freigeben.sh` - reproduces all summary numbers from the fragment via grep against the current codebase
- `data/10-rechte-anzeigen-durchsetzen.md` - Fachaufgabe 10 capability-infrastructure inventory: 2 capability endpoints, 9-action display-vs-enforcement sample, cache/startup-gate behavior
- `scripts/count-10-rechte-anzeigen-durchsetzen.sh` - reproduces all summary numbers from the fragment via grep against the current codebase

## Decisions Made

- Re-verified rather than re-cited: both named prior bugs (BUG-174-02, BUG-174-04) were checked against the live code paths again, confirming they generalize correctly to consumers beyond the one originally reported.
- Scope-difference observation (not a finding): `release_version_media.upload`'s display capability resolves via `CanForFansubGroup` while enforcement resolves via `CanForReleaseVersion` — same action constant, different resolver entry point, but both consult the identical cached role-capability entry, so no divergence is possible. Documented, not flagged as a bug.
- Non-rights observations deferred to `175-ROADMAP-PROPOSAL.md` rather than fixed in this phase (D-01 boundary): the dead `anime_contributions.review_status_id` column, and the missing "Beiträge" dashboard attention lane.

## Deviations from Plan

None - plan executed exactly as written. Both tasks required only reading (grep/file reads) and writing analysis artifacts under the phase's `data/` and `scripts/` directories; no files under `frontend/`, `backend/`, `database/`, or `shared/` were touched.

## Known Stubs

None - this plan produces only markdown inventory fragments and shell count scripts, no application code.

## Threat Flags

None - pure analysis plan (D-01), no new network endpoints, auth paths, file-access patterns, or schema changes introduced. The plan's own `threat_model` (T-175-03, Elevation of Privilege disposition "mitigate via documentation") is satisfied: every display-vs-enforcement comparison point in both fragments is documented with its outcome (11/11 and 9/9 consistent), none left silently unchecked.

## Self-Check: PASSED

- FOUND: `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/04-pruefen-freigeben.md`
- FOUND: `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-04-pruefen-freigeben.sh` (executable, runs clean, numbers match document)
- FOUND: `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/10-rechte-anzeigen-durchsetzen.md`
- FOUND: `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-10-rechte-anzeigen-durchsetzen.sh` (executable, runs clean, numbers match document)
- FOUND commit `86b29196` in `git log --oneline --all`
- FOUND commit `ca470361` in `git log --oneline --all`
- CONFIRMED: `git diff --stat -- frontend/ backend/ database/ shared/` is empty (only pre-existing, unrelated `.planning/sketches/MANIFEST.md`/`010-galerie-detailansicht` changes remain untouched, per D-08 "nicht verändern, nicht committen")
