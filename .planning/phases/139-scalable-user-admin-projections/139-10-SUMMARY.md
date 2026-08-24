---
phase: 139-scalable-user-admin-projections
plan: 10
subsystem: testing
tags: [regression-triage, uat, postgres, vitest, scope-boundary]

# Dependency graph
requires:
  - phase: 139-06
    provides: Constant-query-budget/pagination-drift gates and the F-03 live independent-identical/independent-different release_crew_snapshots seed data used by Task 2's live UAT
  - phase: 139-08
    provides: Contributions tab grouped-card rewrite + container-query CSS verified live in Task 2
  - phase: 139-09
    provides: Media tab grouped release/episode-block rewrite + container-query CSS verified live in Task 2
provides:
  - Full backend + frontend regression triage against the confirmed 139-RESEARCH.md baseline, with
    139-VALIDATION.md's Per-Task Verification Map fully filled in (no TBD rows, nyquist_compliant true)
  - D01/D27 scope-boundary confirmation (no Claims/Aenderungen/role-capability/review-delegation/
    streaming/second media- or contribution-editing surface/Metabase-style dashboard introduced)
  - Human-verified live sign-off (139-HUMAN-UAT.md) for the two manual-only Phase-139 verifications
    (container-query overflow at 394px, F-03 live "Nur Abweichungen" data) plus all six live UAT
    checks from Task 2's how-to-verify list
  - Phase 139 closure: all 10 plans complete, UADM-02 through UADM-08 and QUAL-06 fully verified
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-task verification map rows resolved to real plan IDs + real passing automated commands
      instead of TBD placeholders, closing 139-VALIDATION.md's Wave 0 contract for the whole phase"
    - "Manual-only verification checkpoint documented as its own 139-HUMAN-UAT.md file (mirrors
      138-HUMAN-UAT.md's convention) rather than folded silently into the plan SUMMARY, so a
      residual verification-scope caveat can be recorded without being mistaken for a failed check"

key-files:
  created:
    - .planning/phases/139-scalable-user-admin-projections/139-HUMAN-UAT.md
    - .planning/phases/139-scalable-user-admin-projections/139-10-SUMMARY.md
  modified:
    - .planning/phases/139-scalable-user-admin-projections/139-VALIDATION.md

key-decisions:
  - "Task 4's residual verification note (single-group-membership test account) is recorded as a
    documented scope note in 139-HUMAN-UAT.md, not as a gap or a failed check -- the human
    explicitly marked all six checks PASSED, and the multi-group lazy-fetch property is separately
    proven by 139-07's UserGroupRightsTab.test.tsx/UserOverviewTab.test.tsx regression tests."
  - "No production code changes originate in this plan (per its own threat_model disposition:
    verification-only, T-139-18 accept) -- Task 1 found zero Phase-139 regressions and Task 2's
    live UAT found zero defects, so no Rule 1/2/3 auto-fix was required anywhere in this plan."

requirements-completed: [UADM-02, UADM-03, UADM-04, UADM-05, UADM-06, UADM-07, UADM-08, QUAL-06]

# Metrics
duration: multi-session (Task 1 automated 2026-08-24T20:38-20:46Z; Task 2 live human UAT 2026-08-24)
completed: 2026-08-24
---

# Phase 139 Plan 10: Full Regression Gate + D01/D27 Scope Check + Live UAT Sign-Off Summary

**Zero Phase-139 regressions across the full backend/frontend suite against the confirmed
139-RESEARCH.md baseline, a clean D01/D27 scope-boundary check, and human-verified live sign-off
(all six UAT checks PASSED) for the two manual-only verifications automation cannot reach —
closing Phase 139 with all 10 plans complete and UADM-02 through UADM-08/QUAL-06 fully proven.**

## Performance

- **Duration:** multi-session — Task 1 (automated) ~8 min (2026-08-24T20:38:00Z-20:46:41Z), Task 2
  (live human UAT) completed 2026-08-24 in a separate live-browser session
- **Started:** 2026-08-24T20:38:00Z
- **Completed:** 2026-08-24
- **Tasks:** 2/2 complete
- **Files modified:** 3 (139-VALIDATION.md updated in Task 1; 139-HUMAN-UAT.md and this SUMMARY
  created after Task 2's checkpoint approval)

## Accomplishments

- **Task 1 (full regression + scope check, commit `70d80d8b`):** Re-ran the full backend suite
  (`go test ./...`), the real-Postgres tier (`TEAM4S_PHASE139_TEST_DSN`), the full frontend suite
  (`npx vitest run`), and `npx tsc --noEmit` across all nine prior Phase-139 plans together. Zero
  Phase-139 regressions: backend stays at exactly 65 pre-existing FAIL lines across the same three
  documented buckets (nil `permissions.Service.LoadCache` in `internal/handlers`,
  `TEAM4S_PHASE128_TEST_DSN` unset in `internal/migrations`/`internal/repository`, one unrelated
  live-UAT-server unreachability, one real pre-existing assertion failure); `internal/permissions`
  and `internal/services` stay fully green; all 25 Phase-139-owned backend integration tests pass
  green against the real Postgres fixture. Frontend stays at 15 failed files / 43 failed tests
  (down from 16/45 at the documented baseline — three files turned green along the way), byte-for-
  byte the same failing files as the post-139-08/139-09 state; all 83 admin/users frontend tests
  pass green. `139-VALIDATION.md`'s Per-Task Verification Map has every row filled in with real
  plan/task IDs and real passing commands, `nyquist_compliant: true`. D01/D27 scope check: 58
  touched files across 139-01..139-09, none outside Phase 139's stated scope (no Claims,
  Änderungen/Audit redesign, role/capability redesign, review delegation, streaming, second media-
  or contribution-editing surface, or Metabase-style dashboard).
- **Task 2 (live UAT checkpoint, human-verified — this closure):** The user performed a live
  browser walkthrough over the canonical SSH-tunnel path (`http://127.0.0.1:3300`) as platform
  admin (D1sk) and independently measured all six checks from the plan's `<how-to-verify>` list.
  All six PASSED. Full detail, verbatim tester report, and the residual verification-scope note
  for check 4 are recorded in `139-HUMAN-UAT.md`.

## Task Commits

1. **Task 1: Full regression suite + baseline-vs-regression triage + D01/D27 scope-boundary
   check** - `70d80d8b` (docs)
2. **Task 2: Live UAT — grouped projections, batched rights summary, container-query overflow,
   F-03 live data** - human checkpoint, no code commit (verification-only per this plan's
   threat_model); closed by this SUMMARY + `139-HUMAN-UAT.md`

**Plan metadata:** this commit (docs: complete plan, includes SUMMARY.md/STATE.md/ROADMAP.md)

## Live UAT Result (Task 2)

The human tester reported all six checks PASSED with concrete live measurements:

1. Übersicht lädt mit gebündeltem Aufruf, D-05-Inhalt unverändert.
2. Beiträge zeigen Buddy Complex -> New-Subs, Projektstandard sichtbar ohne Klick, Abweichung vom
   Projektstandard mit Inline-Delta "zusätzliche Rolle(n): translator."; "Nur Abweichungen" geht
   serverseitig durch (`?only_deviations=1` in der Request-URL).
3. Medien gruppiert als "Episode 1 - Version 1", genau eine Aktion "Release-Medien öffnen", kein
   "Berechtigung aktiv/fehlt", kein `release_version:<id>`, keine Speicherpfade.
4. Rechte-Tab: null effective-rights-Requests beim Laden, nach Auswahl nur Gruppe 1.
5. Bei 394px `scrollWidth` gleich `clientWidth`, null überstehende Elemente.
6. 40 `:focus-visible`-Regeln über die globalen Primitives vorhanden.

Regressionsabgleich gegen `139-BASELINE.md`: keine einzige neu rote Datei; 43 Fehler in 15 Dateien
gegen zuvor 45 in 16, drei Dateien sind grün geworden. Seed hat 2 `independent`-Zeilen angelegt.

**Dokumentierte Randbemerkung (kein Fehler, kein übersprungener Check):** Das für die Live-Prüfung
genutzte Test-Admin-Konto (D1sk) hat nur eine Gruppenmitgliedschaft, daher kann die Live-Prüfung
"lazy fetch nach Auswahl" (check 4) nicht rein optisch von "eager fetch über genau eine Gruppe"
unterscheiden — beide Verhaltensweisen sähen im Browser identisch aus, wenn nur eine Gruppe
existiert. Der eigentliche Beweis, dass check 4 auch für Benutzer mit MEHREREN
Gruppenmitgliedschaften hält, liefern die zwei grünen automatisierten Regressionstests aus 139-07
(`UserGroupRightsTab.test.tsx` / `UserOverviewTab.test.tsx`, exactly-once-per-group-fetch
assertions — siehe 139-VALIDATION.md Per-Task Verification Map, UADM-06), nicht der Live-
Klickdurchlauf selbst. Der Mensch hat check 4 trotzdem explizit als BESTANDEN markiert; dies ist
ein dokumentierter Rest-Nachweis-Hinweis, keine Ausnahme.

Full test-by-test detail, the verbatim tester report, and the six-check breakdown are recorded in
`.planning/phases/139-scalable-user-admin-projections/139-HUMAN-UAT.md`.

## Files Created/Modified

- `.planning/phases/139-scalable-user-admin-projections/139-VALIDATION.md` - Task 1: Per-Task
  Verification Map rows filled in with real plan/task IDs and commands; `nyquist_compliant: true`
  set; Manual-Only Verifications table's UADM-08/F-03 rows closed by this plan's Task 2
- `.planning/phases/139-scalable-user-admin-projections/139-HUMAN-UAT.md` - New: records all six
  live UAT checks as PASSED with the human's verbatim report and the check-4 residual verification
  scope note (mirrors `138-HUMAN-UAT.md`'s structure)
- `.planning/phases/139-scalable-user-admin-projections/139-10-SUMMARY.md` - This file

## Decisions Made

- The check-4 single-group-membership residual verification note is recorded as a documented scope
  note (not a gap, not a failure) since the human explicitly marked all six checks PASSED and the
  multi-group property is independently proven by 139-07's regression tests.
- No production code changes originate in this plan (threat_model disposition: verification-only,
  T-139-18 accept) — both tasks found zero defects, so nothing required a Rule 1/2/3 auto-fix.

## Deviations from Plan

None — plan executed exactly as written. Task 1 found zero Phase-139 regressions and zero
out-of-scope files; Task 2's live UAT found zero defects across all six checks.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. The live UAT was performed by the user
directly via the existing SSH-tunnel access path (`http://127.0.0.1:3300`, per CLAUDE.md); no
additional setup was needed.

## Next Phase Readiness

- Phase 139 (Scalable User-Admin Projections) is now complete: all 10 plans done, every
  requirement (UADM-02 through UADM-08, QUAL-06) has at least one real, passing automated test per
  `139-VALIDATION.md`'s Per-Task Verification Map, and both manual-only verifications
  (container-query overflow, live F-03 data) are human-confirmed.
- No blockers. Milestone v1.4's next sequential phase (140) can proceed.

## Self-Check: PASSED

- FOUND: `.planning/phases/139-scalable-user-admin-projections/139-HUMAN-UAT.md`
- FOUND: `.planning/phases/139-scalable-user-admin-projections/139-10-SUMMARY.md`
- FOUND: commit `70d80d8b` in `git log`
- FOUND: `.planning/phases/139-scalable-user-admin-projections/139-VALIDATION.md` frontmatter
  reads `nyquist_compliant: true`, no "TBD" rows remain in its Per-Task Verification Map

---
*Phase: 139-scalable-user-admin-projections*
*Completed: 2026-08-24*
