---
phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel
verified: 2026-10-19T00:00:00Z
status: passed
score: 14/14 must-haves verified
overrides_applied: 0
---

# Phase 187: Gruppenwechsel bei bestehenden Releases Verification Report

**Phase Goal:** Gruppenwechsel bei bestehenden Releases (release_versions / release_version_groups):
Fansub-Gruppe eines bestehenden Releases nur änderbar solange nichts dranhängt; sonst serverseitige
Sperre mit deutscher Meldung statt FK-Fehler/stillem CASCADE-Löschen; Partnergruppe hinzufügen statt
Wechsel; kein Umzugs-Assistent.

**Verified:** 2026-10-19
**Status:** passed
**Re-verification:** No — initial verification.

This phase has no formal `REQ-187-*` entries in `.planning/REQUIREMENTS.md` (confirmed — zero matches
for "Phase 187" or "REQ-187" in that file). This is expected for this additive, non-roadmapped-
requirements phase per the task brief. The 14 locked decisions D-01..D-14 from `187-CONTEXT.md` are
treated as this phase's de facto requirement IDs, exactly as `187-VALIDATION.md`'s per-decision test
map already does.

## Goal Achievement

### Observable Truths (D-01 .. D-14)

| # | Decision | Truth | Status | Evidence |
|---|----------|-------|--------|----------|
| 1 | D-01 | Gruppenwechsel frei erlaubt, solange nichts dranhängt | ✓ VERIFIED | `countReleaseVersionGroupDependents` + `ensureRemovedReleaseVersionGroupsHaveNoDependents` (`release_version_group_guard.go:62-183`); re-ran `TestReleaseVersionGroupGuardCountDependents`/`TestEnsureRemovedReleaseVersionGroupsHaveNoDependents` live against a real Postgres fixture during this verification — PASS |
| 2 | D-02 | Server-seitige Sperre mit deutscher Anhangs-Auskunft statt FK-Fehler/CASCADE | ✓ VERIFIED | `episode_version_update.go:79-91` maps `repository.ErrGroupHasDependents` → `409` with `GermanReasonFragment()`; `repository.ErrReleaseVersionGroupsEmpty` → `400`. Re-ran `TestUpdateEpisodeVersion_GroupGuard` live — PASS (409/200/400 branches all exercised against real Postgres) |
| 3 | D-03 | Partnergruppe hinzufügen statt Wechsel (N-Gruppen-Modell) | ✓ VERIFIED | `FansubGroupsSection.tsx` heading "Partnergruppe hinzufügen"; `addGroup`/`removeGroup` wired to chip list; `release_version_groups` already supports N rows, guard logic treats add-only as a no-op |
| 4 | D-04 | Kein Umzugs-Assistent (Stufe 3) in dieser Phase | ✓ VERIFIED | No migration-assistant UI/code found anywhere in the diff; 187-CONTEXT.md and all 8 plans explicitly scope this out and no plan implements one |
| 5 | D-05 | Bestehendes Suchfeld+Chip bleibt einziger Weg, beschriftet als "Partnergruppe hinzufügen" | ✓ VERIFIED | `FansubGroupsSection.tsx:36` — exact heading text; no second/parallel button exists; live-UAT step 1 ("bestanden") in `187-08-SUMMARY.md` |
| 6 | D-06 | Letzte Gruppe darf nicht entfernt werden (nie 0 Gruppen) | ✓ VERIFIED | `ensureReleaseVersionGroupsNotReducedToEmpty` (`release_version_group_guard.go:156-161`); unit-tested (`TestEnsureReleaseVersionGroupsNotReducedToEmpty`, re-run PASS) and handler-tested (400 case, re-run PASS); live-UAT step 5 "bestanden" |
| 7 | D-07 | Entfernen einer Partnergruppe folgt derselben Stufe-2-Logik, keine Sonderregel | ✓ VERIFIED | `countReleaseVersionGroupDependents` takes no "sole vs partner" parameter by construction (code comment + `TestReleaseVersionGroupGuardCountDependents` subtest explicitly named "(D-07)", re-run PASS) |
| 8 | D-08 | Medien/Notizen zählen als "hängt dran" (kein stilles Verwaisen mehr) | ✓ VERIFIED | SQL in `countReleaseVersionGroupDependents` counts non-deleted `release_version_media`/`release_version_notes` rows; subtest "(D-08)" re-run PASS |
| 9 | D-09 | Leerer `inherited`-Snapshot zählt NICHT als "hängt dran" | ✓ VERIFIED | `DependencySummary` deliberately omits `release_crew_snapshots` from its query entirely (code + comment); subtest "(D-01/D-09)" explicitly inserts an inherited empty snapshot and asserts `HasAny()==false`, re-run PASS |
| 10 | D-10 | Doppelte Durchsetzung: Chip im Editor vorab deaktiviert mit Begründung + serverseitige 409-Prüfung | ✓ VERIFIED (client via live-UAT, server via automated test) | Server: see D-02 evidence. Client: `FansubGroupsSection.tsx:90-91` (`disabled={blockingReason != null}`, `title={blockingReason ?? ...}`); data flow: `GetReleaseVersionGroupDependents` → `selected_group_dependents` (`admin_content_episode_version_editor_helpers.go:64-90`, proven non-static by `TestEpisodeVersionEditorContextDependents`, re-run PASS) → `useEpisodeVersionEditor.ts:130` → `FansubGroupsSection`. Human-verify checkpoint (187-08) explicitly approved the rendered tooltip live: *"Kann nicht entfernt werden: 1 Credit, 0 Medien, 0 Notizen hängen noch daran."* |
| 11 | D-11 | Sperre gilt für alle, auch Platform-Admins | ✓ VERIFIED | `TestUpdateEpisodeVersion_GroupGuard`'s 409 subtest uses an `IsPlatformAdmin: true` identity explicitly; re-run PASS confirms 409 still fires |
| 12 | D-12 | Guard im Import "Übernehmen", aber zeilen-scoped (Update/Add erlaubt, nur Replace gesperrt, Zeilen-Konflikt statt Batch-Abbruch) | ✓ VERIFIED | `upsertReleaseVersionGroup` (`episode_import_repository_release_groups.go`) shares the identical guard sequence as the editor path — same-group/add-only yields an empty `removed` set (no-op by construction); `applyReleaseNative`'s `errors.As(err, &depErr)` / `errors.Is(err, ErrReleaseVersionGroupsEmpty)` branches `continue` past a rejected row instead of aborting (`episode_import_repository_apply.go:121-144`). Re-ran `TestApplyEpisodeImportConflict` live — both subtests PASS, proving per-row conflict + batch continuation + no partial writes on the rejected row. Frontend conflict panel renders `conflict_details` (`admin/anime/[id]/episodes/import/page.tsx:309-324`) |
| 13 | D-13 | Fansub-Gruppen-Merge-Pfad NICHT berührt | ✓ VERIFIED | `fansub_repository_merge_core.go` has zero references to `ErrGroupHasDependents`/`countReleaseVersionGroupDependents`/`ensureRemovedReleaseVersionGroupsHaveNoDependents`/`ensureReleaseVersionGroupsNotReducedToEmpty` (grep confirmed directly + `TestFansubRepositoryMergeCoreHasNoGuardReferences` absence check, re-run PASS — CLAUDE.md-permitted absence-check exception) |
| 14 | D-14 | Editor und Import lehnen beide eine leere Zielgruppenliste identisch ab | ✓ VERIFIED | Both `syncEpisodeVersionSelectedGroups` and `upsertReleaseVersionGroup` call the identical `ensureReleaseVersionGroupsNotReducedToEmpty` function before any write; editor path returns 400, import path returns a per-row conflict — same guard, call-site-appropriate surfacing |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/repository/release_version_group_guard.go` | Core dependents-guard logic (D-01/06/07/08/09/14) | ✓ VERIFIED | Exists, 183 lines (under 450-line limit), substantive, wired into both write paths, data-flow confirmed via re-run tests |
| `backend/internal/repository/episode_version_repository_group_sync.go` | Editor-path guard wiring | ✓ VERIFIED | Exists, 119 lines, calls guard functions before any DELETE/INSERT |
| `backend/internal/repository/episode_import_repository_release_groups.go` | Import-path guard wiring, asymmetric per D-12 | ✓ VERIFIED | Exists, 153 lines, shares identical guard sequence, verified by re-run test |
| `backend/internal/repository/episode_import_repository_apply.go` | Row-scoped conflict continuation (D-12) | ✓ VERIFIED | Exists, 418 lines, `continue`-past-guard logic confirmed and exercised by `TestApplyEpisodeImportConflict` (re-run PASS) |
| `backend/internal/handlers/episode_version_update.go` | 409/400 HTTP mapping (D-02/D-06/D-10 server) | ✓ VERIFIED | Exists, 113 lines, error mapping confirmed and exercised by handler test (re-run PASS) |
| `frontend/.../FansubGroupsSection.tsx` | Disabled chip + "Partnergruppe hinzufügen" heading (D-05/D-10 client) | ✓ VERIFIED | Exists, 106 lines, uses `@/components/ui` `Button`/`Input` primitives exclusively, disabled-chip wiring confirmed, data-flow traced to real backend-computed dependents (not hardcoded) |
| `frontend/.../episodeVersionEditorUtils.ts` | `formatGermanCount`/`formatDependentsReason` (shared pluralization) | ✓ VERIFIED | Exists, 344 lines, correct singular/plural logic matches backend `GermanReasonFragment`, covered by table tests |
| `backend/internal/repository/fansub_repository_merge_core.go` | Must remain untouched by new guard identifiers (D-13) | ✓ VERIFIED | Zero guard-identifier references confirmed directly via grep and via absence test |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `episode_version_update.go` handler | `release_version_group_guard.go` | `errors.Is`/`errors.As` on `ErrGroupHasDependents`/`ErrReleaseVersionGroupsEmpty` | WIRED | Confirmed by code read + live re-run of `TestUpdateEpisodeVersion_GroupGuard` (409/400/200 all correctly routed) |
| `episode_import_repository_apply.go` | guard functions | `diffRemovedReleaseVersionGroupIDs` → `ensureRemovedReleaseVersionGroupsHaveNoDependents` pre-check | WIRED | Confirmed by code read + live re-run of `TestApplyEpisodeImportConflict` (conflict counted, other rows unaffected, rejected group's data survives) |
| `FansubGroupsSection.tsx` chip | `groupDependents` state | `formatDependentsReason(dependents)` → `disabled`/`title` props | WIRED | Confirmed by code read; `groupDependents` populated from `context.selected_group_dependents`, not hardcoded |
| `admin_content_episode_version_editor_helpers.go` | `GetReleaseVersionGroupDependents` (Plan 01 guard) | Called once per selected group, included even at zero | WIRED, DATA FLOWS | Confirmed by code read + live re-run of `TestEpisodeVersionEditorContextDependents` (both zero-dependents and real-credit groups present and distinguishable) |
| Import "Übernehmen" success panel | `applyResult.conflict_details` | Rendered as a `<ul>` list with media-item-id + reason | WIRED | Confirmed by code read (`import/page.tsx:309-324`) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `FansubGroupsSection.tsx` chip disabling | `groupDependents` | `useEpisodeVersionEditor.ts:130` ← `nextContext.selected_group_dependents` ← backend `resolveEpisodeVersionSelectedGroupDependents` ← `GetReleaseVersionGroupDependents` ← real SQL COUNT against `release_role_credit_lifecycles`/`release_version_media`/`release_version_notes` | Yes — proven by `TestEpisodeVersionEditorContextDependents` with a real credit row | ✓ FLOWING |
| Editor 409 response body | `depErr.Summary` | Same guard SQL, populated from `errors.As` on the dependents error returned by the repository | Yes — re-run handler test shows actual "1 Credit," substring from a real inserted `release_role_credit_lifecycles` row | ✓ FLOWING |
| Import conflict panel | `applyResult.conflict_details` | `episode_import_repository_apply.go` guard rejection path, populated per-row | Yes — re-run `TestApplyEpisodeImportConflict` confirms non-empty `Reason`/`MediaItemID` for the rejected row | ✓ FLOWING |

### Behavioral Spot-Checks (Live Re-Run, Real Postgres Fixture)

This verification independently re-ran a representative subset of the phase's own automated tests
against a real, freshly created throwaway Postgres database (`team4s_phase187_test_spotchk`,
`team4s_phase117_test_spotchk`) rather than trusting SUMMARY.md's PASS claims. All re-run commands
and their actual exit/PASS output are recorded below.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| D-01/D-07/D-08/D-09 dependents counting | `go test ./internal/repository/... -run TestReleaseVersionGroupGuardCountDependents -v` | `--- PASS` all 3 subtests | ✓ PASS |
| D-06/D-14 empty-reduction guard (pure) | `go test ./internal/repository/... -run TestEnsureReleaseVersionGroupsNotReducedToEmpty -v` | `--- PASS` all 4 subtests | ✓ PASS |
| D-07 removed-group dependents gate (real Postgres, incl. zero-query no-op proof) | `go test ./internal/repository/... -run TestEnsureRemovedReleaseVersionGroupsHaveNoDependents -v` | `--- PASS` all 3 subtests | ✓ PASS |
| D-13 absence check | `go test ./internal/repository/... -run TestFansubRepositoryMergeCoreHasNoGuardReferences -v` | `--- PASS` | ✓ PASS |
| D-12 row-scoped conflict continuation | `go test ./internal/repository/... -run TestApplyEpisodeImportConflict -v` | `--- PASS` both subtests | ✓ PASS |
| D-02/D-06/D-10/D-11 HTTP-layer guard (409/400/200, incl. platform-admin identity) | `go test ./internal/handlers/... -run TestUpdateEpisodeVersion_GroupGuard -v` | `--- PASS` all 3 subtests | ✓ PASS |
| D-10 dependents in editor context (data-flow, not omitted/static) | `go test ./internal/handlers/... -run TestEpisodeVersionEditorContextDependents -v` (via package build) | `--- PASS` | ✓ PASS |
| German pluralization (shared backend helper) | `go test ./internal/repository/... -run TestDependencySummaryGermanReasonFragment -v` | `--- PASS` all 8 subtests | ✓ PASS |

Throwaway databases created for this re-run were dropped immediately afterward; no state was left
behind.

### Requirements Coverage

No `REQ-187-*` entries exist in `.planning/REQUIREMENTS.md` — confirmed by direct grep (zero matches
for "Phase 187"/"REQ-187"). This phase's requirement surface is exclusively the 14 locked decisions
D-01..D-14 in `187-CONTEXT.md`, all mapped to code/tests above. No orphaned requirements.

### Anti-Patterns Found

None. Zero `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any of the 7 directly-
inspected core phase files. All files touched by this phase are at or under the 450-line limit
(largest confirmed: `episode_import_repository_release_helpers.go` at 436 lines,
`EpisodeVersionEditorPage.tsx` at 422 lines). No native `<select>/<input>/<textarea>` found in the
phase's actual UI-facing change (`FansubGroupsSection.tsx` uses `@/components/ui` `Button`/`Input`
exclusively).

### Human Verification Required

None. The phase's one manual-only item (187-VALIDATION.md's "Chip im Editor vorab deaktiviert ...
Beschriftung 'Partnergruppe hinzufügen' ... Klickabläufe") was already executed as a blocking
human-verify checkpoint in Plan 187-08 and explicitly approved by the human operator. Confirmed by
reading `187-08-SUMMARY.md` directly (not trusted on claim alone): it contains a structured
"Approval Record" YAML block (`status: passed`, `approved_by: user`, `approved_at: 2026-10-19`), an
itemized walkthrough of all 6 `<how-to-verify>` steps (5 "bestanden" live, 1 explicitly deferred with
documented reason and automated-test coverage substituted), and the user's verbatim approval message
quoting the live-verified corrected tooltip text. This satisfies D-05/D-10's manual-only verification
requirement; no further human check is requested by this verification.

### Gaps Summary

No gaps. All 14 locked decisions (D-01..D-14) are implemented in the codebase (not just claimed),
independently re-run and confirmed green against a real Postgres fixture during this verification
(not merely trusted from SUMMARY.md), data-flow-traced from real DB-backed dependents counts through
to both the HTTP 409 response and the frontend chip tooltip, and the one phase-level human-verify
checkpoint carries a genuine, specific, quoted approval record rather than a bare claim. The code
review (187-REVIEW.md, 0 findings across 40 files) is corroborated, not merely trusted — this
verification independently confirmed the guard-core logic, the editor/import asymmetry, the D-13
absence, the 450-line compliance, and the pluralization fix by reading the actual source and by
re-executing representative tests live.

---

_Verified: 2026-10-19_
_Verifier: Claude (gsd-verifier)_
