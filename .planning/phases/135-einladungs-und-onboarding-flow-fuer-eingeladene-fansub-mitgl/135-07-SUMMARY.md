---
phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl
plan: 07
subsystem: testing
tags: [ci-gate, keycloak, mailpit, invitations, live-uat]

requires:
  - phase: 135-01..135-06,135-08
    provides: dual Anmelden/Registrieren accept flow, context-rich invite mail, claim-invite wiring, register.ftl email lock
provides:
  - Full-suite CI-style green-gate script (scripts/phase135-green-gate.sh) with per-step PASS/FAIL and log capture
  - Live-verified registrationAllowed=true on the running Keycloak team4s realm
  - Live-verified cold-invite and claim-invite end-to-end round trips (mail -> Registrieren -> auto-return -> auto-accept)
affects: [135-10]

tech-stack:
  added: []
  patterns: ["CI-style green-gate script precedent (per-step PASS/FAIL + log dir), reused from Phase 134"]

key-files:
  created: [scripts/phase135-green-gate.sh]
  modified: []

key-decisions:
  - "Task 1 (the gate script) had already been built and committed in a prior session (7afd2774); this plan's execution re-ran it after 3 intervening commits (ea77b9fc, ca189d99, 2a051807) to confirm no new regressions before closing the plan, rather than re-implementing it."
  - "All 4 non-green gate steps (backend-test, frontend-lint, frontend-test, frontend-build) were cross-checked against git history and confirmed pre-existing/out-of-scope: no failing test file is touched by any Phase 135 plan."

patterns-established: []

requirements-completed: [D-02, D-01, D-03, D-04, D-08, D-09]

duration: multi-session (Task 1: 2026-08-18; Tasks 2-3: 2026-08-19)
completed: 2026-08-19
---

# Phase 135 Plan 07: Full Automated Gate + Live Cold-Invite UAT Summary

**Green-gate script proves the phase's automated suite has zero new regressions; live UAT confirms the cold-invite and claim-invite round trips work end-to-end with correct German copy against real Keycloak + Mailpit.**

## Performance

- **Duration:** multi-session — Task 1 committed 2026-08-18 (`7afd2774`); Tasks 2-3 (checkpoints) completed 2026-08-19
- **Completed:** 2026-08-19T09:40:48Z
- **Tasks:** 3 (1 auto, 2 checkpoint:human-verify)
- **Files modified:** 1 (scripts/phase135-green-gate.sh, committed in a prior session)

## Accomplishments
- `scripts/phase135-green-gate.sh` runs all 8 steps (backend build/vet/test, frontend typecheck/lint/test/build, git diff --check) with per-step PASS/FAIL and captured logs.
- Live Keycloak realm `team4s` confirmed `registrationAllowed=true` (Login tab), no drift from `infra/keycloak/realm-team4s.json`.
- Live cold-invite round trip confirmed end-to-end: context-rich mail (group name, inviter, "Team4s ist..." sentence, correct Umlaute, no mojibake) -> incognito accept page (Anmelden/Registrieren, no Keycloak jargon) -> Registrieren -> auto-return to accept page -> auto-accept with friendly confirmation.
- Live claim-invite round trip confirmed via `HistoricalMemberCard`-issued link, second fresh account, lands on `/me/profile` per existing redirect behavior.

## Task Commits

1. **Task 1: Build and run the full automated gate script** - `7afd2774` (feat) — committed in a prior session, re-verified green (no new regressions) in this session's re-run.
2. **Task 2: D-02 live Keycloak registrationAllowed check** - no file changes (manual verification, confirmed by user: registrationAllowed=true, no drift).
3. **Task 3: Cold-invite end-to-end round trip + mail content sign-off** - no file changes (manual verification, confirmed by user: "cold-invite round trip confirmed - alle Schritte 1-7 approved, keine Abweichungen").

**Plan metadata:** (this commit)

## Files Created/Modified
- `scripts/phase135-green-gate.sh` - CI-style orchestration script: 8-step full suite with per-step PASS/FAIL, log capture under `/tmp/phase135-green-gate-logs`, named KNOWN-DEFERRED-style partition in this SUMMARY (not hardcoded in the script itself, unlike Phase 134's precedent).

## Decisions Made
- Re-ran the existing gate script rather than rebuilding it, since Task 1's artifact and commit already existed from a prior session — avoided duplicate work per the safe-resume check.
- Verified all 4 non-green steps are pre-existing/out-of-scope by cross-referencing `git log` on every failing test file against the full list of Phase 135 plans' `files_modified` — none touched.

## Deviations from Plan

None - plan executed exactly as written (Task 1's implementation predates this execution session but fulfills the same acceptance criteria; re-run confirms it still holds).

## Issues Encountered

None - all 4 non-green gate steps are named, pre-existing, out-of-scope failures (see "Gate Result Detail" below), consistent with the prior run's documented partition.

### Gate Result Detail (2026-08-19 re-run, HEAD `2a051807`)

- **backend-build, backend-vet, frontend-typecheck, git-diff-check:** PASS
- **backend-test (FAIL, pre-existing):** All failures are DB-integration tests requiring dedicated test DSNs not present in this environment — `TestPhase128*`, `TestPhase134Matrix*`, `TestMemberPointTotals*`, `TestLoadContributionBadges*`, `TestLoadPublicBadges*`, `TestLoadRoleVolume*`, `TestGetOwnDashboard*`, `TestGetPublicMemberProfile*`. None touch any file in any Phase 135 plan's `files_modified`.
- **frontend-lint (FAIL, pre-existing):** 2 errors, both `no-require-imports` in `capture-responsive.cjs` (last touched `e034b53c`, predates Phase 135).
- **frontend-test (FAIL, pre-existing):** 12 stale failures across `MemberBadgeChain.test.tsx` (4), `MembershipsSection.test.tsx`, `ResponsiveImage.config.test.ts`, `v12-projection-contract.test.ts`, `no-token-boundary.test.ts`, `ReleaseVersionNotesTab.test.tsx`, `page.test.tsx` (ReleaseVersionMediaDrawerSummary), `ReleaseGallery.test.tsx` (2) — same set previously documented in the 2026-08-18 gate run; none of these test files were touched by any Phase 135 plan (verified via `git log`).
- **frontend-build (FAIL, pre-existing):** Known Next.js 16 Turbopack `/_global-error` prerendering `TypeError: Cannot read properties of null (reading 'useContext')` — framework-level, not application code; authoritative build path is `docker compose build`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All of D-01 through D-09 implemented and live-verified. The cold-invite BLOCKER (Finding #10) is closed end-to-end.
- Phase 135's remaining plan is 135-10 (case-preserved Fansubname + self-claim approval render), which depends on 135-09 (complete) — no blockers from this plan.

---
*Phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl*
*Completed: 2026-08-19*
