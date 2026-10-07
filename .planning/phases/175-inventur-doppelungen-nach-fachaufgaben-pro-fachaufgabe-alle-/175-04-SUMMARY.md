---
phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-
plan: 04
subsystem: analysis
tags: [fansub-invitations, member-claims, notes, permissions, dead-code-audit]

# Dependency graph
requires:
  - phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
    provides: "174-REPORT.md Abschlussaudit (F-09 on history.ts), 174-BUGS.md (BUG-174-02/04 rights-consistency patterns), 135-RESEARCH.md Open Question 2 (ClaimManagementPanel kept-but-unmounted)"
provides:
  - "data/05-mitglieder-einladen-claims.md — full D-03 inventory of Fachaufgabe 5 (invites/claims/member-requests), confirms Phase-135 InviteAcceptFlow consolidation is complete, 2 new findings (disabled-check asymmetry, duplicated memorial-guard)"
  - "data/06-notizen-schreiben.md — full D-03 inventory of Fachaufgabe 6 (notes), splits 174-REPORT's single note bucket into 3 rights-distinct clusters, confirms+refines F-09, identifies 1 fully-dead feature (member-group-story) and 1 new Anzeige/Durchsetzung gap"
  - "count-05-mitglieder-einladen-claims.sh / count-06-notizen-schreiben.sh — reproducible grep-based verification scripts"
affects: [175-07-inventory-merge, future-merge-phases-for-invites-and-notes]

tech-stack:
  added: []
  patterns: ["D-03/D-04/D-05 inventory methodology applied to two more Fachaufgaben, reusing 175-01..03's fragment+script format"]

key-files:
  created:
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/05-mitglieder-einladen-claims.md
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-05-mitglieder-einladen-claims.sh
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/06-notizen-schreiben.md
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-06-notizen-schreiben.sh
  modified: []

key-decisions:
  - "Classified member_group_stories as a fully-built, zero-consumer dead feature rather than a duplicate — no competing implementation exists, just an orphaned one"
  - "Split 174-REPORT's single 'Fansub-Notizen/Historie' (15-function) bucket into 3 Fachaufgaben-distinct clusters once their rights models were compared, refining (not contradicting) F-09"
  - "Treated searchArchive's presence in history.ts as an unrelated misplacement (not a notes-type duplication question) — strengthens rather than weakens the F-09 case against artificial splitting of the actual note clusters"

patterns-established:
  - "Rights-consistency verification requires reading each sibling handler's actual auth-check call, not inferring from capability names — two of three new findings in this plan (claim-accept disabled-check asymmetry; notes tab OR-gate vs single-action enforcement) only surfaced by diffing the exact Go/TSX lines against their nearest sibling"

requirements-completed: []

duration: ~95min
completed: 2026-10-07
---

# Phase 175 Plan 04: Fachaufgabe 5+6 Inventory (Mitglieder einladen/Claims, Notizen schreiben) Summary

**Confirmed Phase-135's invite-accept consolidation is complete, found 2 new rights/duplication gaps in claim handling, and split 174-REPORT's single notes bucket into 3 rights-distinct clusters while uncovering a fully dead member-story feature.**

## Performance

- **Duration:** ~95 min
- **Started:** 2026-10-07T08:28:00Z (approx, continuing from 175-03 session)
- **Completed:** 2026-10-07
- **Tasks:** 2
- **Files modified:** 4 (all new)

## Accomplishments

- **Fachaufgabe 5 (Mitglieder einladen/Claims/Mitgliedsanfragen):** Verified Phase 135's
  `InviteAcceptFlow` consolidation holds — zero new parallel accept implementations found via
  grep across all `*accept*`/`*invite*` routes. Documented all 6 UI surfaces (2 accept pages,
  admin claim management, invite create/cancel, self-service claim form, and the
  documented-but-unmounted `ClaimManagementPanel.tsx`). Found 2 new issues: (1) the claim-invite
  accept path skips the disabled-user check its sibling app-member-invite accept performs
  (`requireMeIdentity` vs `CanAcceptInvitation`), and (2) the memorial-profile guard business
  rule is implemented twice, verbatim, in two independent repository files with no shared helper.
  Also documented that `member_claims` is reused for two fachlich-different purposes (claim-link
  vs. Neuanlage-Antrag) under two independent, differently-scoped rights models.
- **Fachaufgabe 6 (Notizen schreiben):** Read `history.ts` end-to-end (30 exports, matches
  174-REPORT.md's count) and mapped every export to its backend handler, table, and rights model.
  Found that 174-REPORT's single "Fansub-Notizen/Historie" bucket actually spans 3 different
  rights models (group-scoped `ActionFansubGroupNotesWrite`, dynamic per-event-type action, and
  flat `requireAdmin`/platform-admin for member-group-stories) — refining F-09 rather than
  contradicting it. Discovered `member_group_stories` is a complete, unused feature: table,
  repository, 5 routes, and 5 frontend API functions exist with **zero** `.tsx` consumers
  anywhere in the app. Found a new Anzeige/Durchsetzung gap: the "Notizen" tab's visibility gate
  is an OR of two capabilities (`can_edit_notes || can_edit_founding_history`), but the
  `NotesTab` component itself performs no further button-level restriction — unlike its sibling
  `GroupHistorySection`, which received an explicit `foundingOnly` prop for exactly this case.
  Confirmed F-09's "Trennung wäre nicht künstlich" verdict and flagged `searchArchive`'s presence
  in `history.ts` as an unrelated misplacement (not a notes-duplication finding).

## Task Commits

Each task was committed atomically:

1. **Task 1: Fachaufgabe 5 — Mitglieder einladen/Claims/Mitgliedsanfragen inventory** - `e7fb84ae` (docs)
2. **Task 2: Fachaufgabe 6 — Notizen schreiben inventory** - `0e2a6689` (docs)

**Plan metadata:** pending (this summary + STATE.md/ROADMAP.md commit)

## Files Created/Modified

- `data/05-mitglieder-einladen-claims.md` - Full D-03 inventory of invite/claim/member-request surfaces with 7 verified rights-comparison points
- `scripts/count-05-mitglieder-einladen-claims.sh` - Reproduces the fragment's counts via grep (6 UI surfaces, 3 tables, consistency checks)
- `data/06-notizen-schreiben.md` - Full D-03 inventory of the 5 note-type clusters in `history.ts`, each with its own rights model documented
- `scripts/count-06-notizen-schreiben.sh` - Reproduces the fragment's counts via grep (30 exports, 5 clusters, dead-feature absence check, rights-model belt)

## Decisions Made

- Documented `member_group_stories` as a dead/orphaned feature (not a duplicate) since no competing live implementation exists — it is simply unreachable from any UI.
- Split the single 174-REPORT "Fansub-Notizen/Historie" bucket into 3 Fachaufgaben-distinct clusters for this inventory, because their rights models differ materially even though their line-count-based D-24 grouping was identical.
- Treated `searchArchive`'s co-location in `history.ts` as a file-placement issue orthogonal to the note-type-separation question F-09 addresses, rather than folding it into the same classification.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' `<action>` instructions (grep for additional parallel invite routes; confirm/refute F-09 from a Fachaufgaben perspective; classify each cluster under D-04) were followed, and the acceptance criteria (Datei:Zeile coverage for (a)-(e), explicit consolidation verdict, script/fragment number parity) are met by both fragments.

## Issues Encountered

None. All referenced files (`InviteAcceptFlow.tsx`, `app_auth_invitations.go`, `member_claims_handler.go`, `member_requests_handler.go`, `history.ts`, `admin_content_member_stories.go`, `fansub_group_history_handler.go`, `fansubEditAccess.ts`) existed as named in the plan's `<read_first>` blocks and were readable without workarounds.

## User Setup Required

None - no external service configuration required. This is a read-only analysis plan (D-01); no code, migration, or UI changes were made.

## Next Phase Readiness

- Both fragments are ready for the Welle-2 merge into `175-INVENTORY.md` (plan 175-07), tagged with their D-04 classifications per the plan's `key_links`.
- Two findings in this plan (claim-accept disabled-check asymmetry; notes-tab Anzeige/Durchsetzung gap) are new candidates for `175-PERMISSION-MATRIX.md` alongside the already-known BUG-174-02/04 pattern.
- The dead `member_group_stories` feature and the misplaced `searchArchive` function are candidates for `175-ROADMAP-PROPOSAL.md` scoping (either build the missing UI or remove the feature; relocate `searchArchive` to `search.ts`).
- No blockers for subsequent 175-05/06 plans — this plan touched only `data/05-*` and `data/06-*`, leaving `data/08`, `data/09` (owned by other plans) untouched.

## Self-Check: PASSED

- All 4 task-deliverable files + this SUMMARY.md verified present on disk.
- Both task commits (`e7fb84ae`, `0e2a6689`) verified present in `git log --all`.
- Both verification scripts re-run clean with no `WARN:` lines; printed counts match the
  corresponding fragment files' "Zusammenfassung" sections.
- `git status --short` shows only the plan's 4 new files as staged/committed; pre-existing
  unrelated changes (`.planning/sketches/`) were left untouched per D-01/D-10.

---
*Phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-*
*Completed: 2026-10-07*
