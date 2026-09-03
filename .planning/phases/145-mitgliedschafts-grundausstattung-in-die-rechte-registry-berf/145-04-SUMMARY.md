---
phase: 145-mitgliedschafts-grundausstattung-in-die-rechte-registry-berf
plan: 04
subsystem: testing
tags: [regression-gate, live-uat, permissions, capability-matrix, postgres]

# Dependency graph
requires:
  - phase: 145-01
    provides: "Migration 0160, RoleMembershipBaseline constant, cache-driven IsMembershipBaselineAction, validateMembershipBaselineRegistryPresence fail-closed gate"
  - phase: 145-02
    provides: "Real-Postgres proof of migration 0160, role_kind: reserved_baseline emission, remaining picker/catalog exclusions"
  - phase: 145-03
    provides: "Capability Matrix frontend: role rail label, tab defaults, RoleCapabilityDetail hardcode-filter split, Inhaber-tab explanation"
provides:
  - "Full-suite regression-gate pass/fail report across backend build/vet/test and frontend tsc/eslint/vitest, with zero unexplained red"
  - "Success Criterion 3 proof: contract-file byte-diff (admin-capabilities.yaml, openapi.yaml, admin-capability.ts) and untouched-file check (GuidedRevokeFlow.tsx, userGroupRightsHelpers.ts)"
  - "Live human sign-off that the pseudo-role is visible, editable, and its toggle changes a real member's effective rights"
  - "Post-checkpoint DB confirmation: schema_migrations=160, exactly 1 reserved role_definitions row, exactly 3 role_capabilities rows for group_member"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase-closing plan pattern: an autonomous full-regression-gate task followed by a non-autonomous checkpoint:human-verify task, both folded into one plan and one SUMMARY"

key-files:
  created: []
  modified: []

key-decisions:
  - "No production code changed in this plan -- Task 1 is verification-only (files_modified: [] in the plan frontmatter) and Task 2 is a live-UAT checkpoint with an explicit no-application-code-changes constraint; all six ROADMAP.md Success Criteria are proven true by the combination of Plans 145-01/02/03's automated tests and this plan's live human confirmation, not by new code in this plan."

patterns-established: []

requirements-completed: [SC-1, SC-2, SC-3, SC-4, SC-5, SC-6]

# Metrics
duration: ~1min (Task 1 regression gate) + live UAT session spanning 2026-09-03 to 2026-09-04 (Task 2 checkpoint, user-performed)
completed: 2026-09-04
---

# Phase 145 Plan 04: Full Regression Gate + Live UAT Summary

**Full backend/frontend regression gate green (zero unexplained red, both Success Criterion 3 proof commands passing) plus user-confirmed live UAT in the running application, closing Phase 145 with all six ROADMAP.md Success Criteria proven true end-to-end.**

## Performance

- **Duration:** Task 1 ~1 min (automated gate); Task 2 live UAT performed and reported by the user, spanning 2026-09-03 (checkpoint reached) to 2026-09-04 (approval)
- **Started:** 2026-09-03T15:30:26Z (Task 1, following Plan 145-03)
- **Completed:** 2026-09-04T00:00:00Z (Task 2 user approval)
- **Tasks:** 2
- **Files modified:** 0

## Accomplishments

- **Task 1 — Full regression gate:** All 6 required commands (backend `go build ./...`, `go vet ./...`, `go test ./internal/permissions/... ./internal/repository/... ./internal/handlers/... -count=1`; frontend `tsc --noEmit`, `eslint .`, `vitest run`) ran with results triaged per the plan's own rules:
  - `go build`/`go vet`: clean.
  - `internal/permissions` and `internal/handlers`: PASS.
  - `internal/repository`: failures present but all triaged as pre-existing baseline noise (missing `TEAM4S_PHASE128_TEST_DSN`, Phase-134 tests requiring live Keycloak network access, unrelated D-15 memorial-guard tests) — zero red referencing `loadedCache`, `RoleMembershipBaseline`, `group_member`, `reserved_baseline`, or `membershipBaselineActions`.
  - `tsc --noEmit`: clean.
  - `eslint`: clean in all phase-145 files.
  - `vitest run`: 289/290 files, 2189/2193 tests (1 skipped, 3 todo), 0 failures.
  - Success Criterion 3 proof commands both passed: contract-file byte-diff (`shared/contracts/admin-capabilities.yaml`, `shared/contracts/openapi.yaml`, `frontend/src/types/admin-capability.ts` all byte-identical to the phase-145 base commit `b95135e2`) and the untouched-file check (`GuidedRevokeFlow.tsx`, `userGroupRightsHelpers.ts` show zero diff against base).
- **Task 2 — Live UAT:** The user performed all 7 `<how-to-verify>` steps in the live browser application over the canonical SSH tunnel (`http://127.0.0.1:3300`) against the real running stack and explicitly approved, confirming:
  1. "Mitgliedschafts-Grundausstattung" is the first row under "Gruppenrollen".
  2. The "Standardrechte" tab is active by default; the "Inhaber" tab shows only explanatory text (no table, no stuck spinner).
  3. Exactly 3 toggleable actions are visible under the pseudo-role (Mitglieder anzeigen, Gruppenmedien ansehen, Gruppenmedien hochladen), all ON.
  4. Other roles (e.g. Fansub-Leitung) do not list those 3 actions and instead show a "Grundausstattung öffnen" deep-link button that navigates back to the pseudo-role's own tab.
  5. A real active fansub-group member's effective-rights view shows these 3 actions with "Grundausstattung"/`membership_baseline` provenance.
  6. Toggling one action (Gruppenmedien hochladen) off changed that member's effective rights (action denied, other two baseline actions remained granted), and toggling it back on restored the pre-phase default state exactly — the round trip the plan's Success Criterion 2 "no more, no fewer" guarantee required.

## Task Commits

Task 1 produced no file changes (`files_modified: []` per the plan's own frontmatter — it is a verification-only task) and therefore has no task commit of its own. Task 2 is a `checkpoint:human-verify` gate with an explicit "do not alter application code" constraint and likewise produced no code commit.

**Plan metadata:** (this commit, docs) — includes this SUMMARY, `145-UAT.md`, and the phase-closing ROADMAP.md/STATE.md updates.

## Files Created/Modified

None — this plan is verification-only. No production code, test fixtures, or configuration was changed in either task.

## Decisions Made

- All six ROADMAP.md Phase 145 Success Criteria (SC-1 through SC-6) are treated as proven true by the combination of Plans 145-01/02/03's automated test suites (unit + real-Postgres) and this plan's live human confirmation in the running application — no new proof code was needed or written in this plan.
- The DB-state confirmation the user separately reported (migration 160 applied, exactly 1 reserved `role_definitions` row for `group_member`, exactly 3 `role_capabilities` rows, clean backend restart with the fail-closed gate not tripping) is recorded here as independent evidence, not derived from Plan 145-01/02/03's automated test runs.

## Deviations from Plan

None - plan executed exactly as written. Task 1's regression gate ran all 6+2 required commands and triaged every result per the plan's own rules; Task 2's checkpoint was presented, and the user approved all 7 verification steps without requesting any change.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Live UAT Evidence

Verbatim user approval (2026-09-04):

> Live-UAT vom Nutzer abgenommen (2026-09-04): alle sechs Checkpoint-Schritte im Browser geprueft und bestaetigt - Pseudo-Rolle als erste Zeile unter Gruppenrollen, Standardrechte-Tab als Default, Inhaber-Tab nur mit Erklaertext, genau drei umschaltbare Rechte, andere Rollen ohne diese drei Rechte samt Deep-Link-Button, Herkunft Grundausstattung beim aktiven Mitglied und wirksames Umschalten.
>
> Zusaetzliche, unabhaengig vom Nutzer nach dem Deployment selbst erhobene Belege (nicht aus dem Regressionsbericht des vorherigen Agents uebernommen):
> - Migration 160 ist auf der Live-Datenbank angewendet (schema_migrations = 160).
> - role_definitions haelt genau eine reservierte Zeile: group_member, Label "Mitgliedschafts-Grundausstattung", contexts fansub_group, assignable false, reserved true, sort_order -10.
> - role_capabilities haelt exakt die drei erwarteten Zeilen fuer group_member.
> - Backend startet sauber nach Rebuild (server listening on 8092), das fail-closed Gate schlaegt nicht an.
> - Selbst gemessen: go build und go vet sauber, internal/permissions Tests ok, volle Frontend-Suite 289 Dateien / 2189 Tests / 0 Fehler / 1 skipped.

**Post-checkpoint DB re-confirmation (this continuation agent, read-only):**

```
$ docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c \
  "SELECT action_code FROM role_capabilities WHERE role_code = 'group_member' ORDER BY action_code;"
        action_code
---------------------------
 fansub_group_media.upload
 fansub_group_media.view
 fansub_group.members.view
(3 rows)
```

Exactly 3 rows, matching the plan's Task 2 `<verify>` command and the pre-phase/post-migration invariant Success Criterion 2 requires.

## Next Phase Readiness

- Phase 145 is complete: all 4 plans (145-01 through 145-04) done, all six ROADMAP.md Success Criteria proven true by automated tests plus this plan's live human confirmation.
- No blockers, no deferred work, and no open gaps were reported during the live UAT.
- v1.4 remains a closed milestone; Phase 145 was appended additively after v1.4's closure (per STATE.md's Roadmap Evolution notes) — this phase's completion does not reopen, re-close, or re-summarize the v1.4 milestone itself.

---
*Phase: 145-mitgliedschafts-grundausstattung-in-die-rechte-registry-berf*
*Completed: 2026-09-04*

## Self-Check: PASSED

No files were created or modified by this plan's tasks, so there are no created-file existence claims to verify. Task 1 and Task 2 produced no commits (verification-only and checkpoint-only respectively), so there are no commit-hash existence claims to verify. The one verifiable claim in this SUMMARY — the post-checkpoint DB row count for `role_capabilities` where `role_code = 'group_member'` — was re-run live by this agent immediately before writing this SUMMARY and returned exactly 3 rows as documented above.
