---
phase: 150-badge-regeln-eine-autoritative-schwellenquelle
plan: 01
subsystem: api
tags: [go, badges, gamification, thresholds, member-profile]

# Dependency graph
requires: []
provides:
  - "backend/internal/badges package: the ONE authoritative Go threshold registry (RoleVolume, Points, Progress, ContributionProjects, ContributionChronicle, ContributionArchivist, Membership families + MembershipLongTermYears/Membership7Years/Membership10Years constants) with CurrentTier/NextTier/Remaining boundary-math helpers"
  - "Real 'before' evidence baseline (public profile SSR capture + authenticated dashboard JSON) for member `type`, used by Plan 150-06's Live-UAT to prove zero visible change"
affects: [150-02, 150-03, 150-04, 150-05, 150-06, 150-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "backend/internal/badges: small explicit-struct Go package (Tier{Code,Threshold}, Family{Tiers []Tier}) matching this codebase's small-package convention; no I/O, no DB access"

key-files:
  created:
    - backend/internal/badges/thresholds.go
    - backend/internal/badges/thresholds_test.go
    - .planning/phases/150-badge-regeln-eine-autoritative-schwellenquelle/evidence/before-member-type-profile.txt
    - .planning/phases/150-badge-regeln-eine-autoritative-schwellenquelle/evidence/before-dashboard.json
  modified: []

key-decisions:
  - "Used member `type` (not sheppert/csubs-leader) for BOTH evidence captures A and B -- sheppert and csubs-leader no longer exist in this environment's database (12 members total, verified by direct query); member `type` (id=5, login type@team4s.de / password 123) has real non-trivial activity (total_points=39, role_volume typesetter=13, all three contribution families non-zero) and is already the plan's chosen public-profile ground-truth member, so one member covers both captures."
  - "Force-added (git add -f) the two evidence files despite the repo-wide .planning/**/evidence/** .gitignore rule (2026-08-21 cleanup) -- these are point-in-time 'before' snapshots the phase's final Live-UAT (150-06) must diff against AFTER production code changes land in 150-02/150-03; unlike other generated evidence artifacts that .gitignore rule targets, this snapshot cannot be regenerated later once the badge-threshold source code changes."
  - "MembershipLongTermYears/Membership7Years/Membership10Years are declared as independent int64 constants (not derived from the Membership var) with a doc comment explaining why, per the plan's explicit escape hatch for Go's const-from-slice limitation; TestMembershipYearConstantsMatchFamily proves they stay in lockstep with the Membership family's own tier thresholds."

requirements-completed: [SC-1, SC-7, SC-9]

# Metrics
duration: 9min
completed: 2026-09-06
---

# Phase 150 Plan 01: Badge Threshold Registry + Before-Evidence Baseline Summary

**New `backend/internal/badges` package holding all seven badge-family threshold ladders as one Go source of truth, plus a real before-change evidence snapshot (SSR profile capture + authenticated dashboard JSON) for member `type`.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-06T22:14:40Z
- **Completed:** 2026-09-06T22:23:48Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `backend/internal/badges/thresholds.go`: the one authoritative registry for RoleVolume (12/108/320/510), Points (1/50/200/500/1000/2500), Progress (1/10/25/50), ContributionProjects (1/5/15), ContributionChronicle (10/50/150), ContributionArchivist (10/50/150, kept as an independent value copy from Chronicle), and Membership (5/7/10 years) plus three bare `int64` constants mirroring the Membership family for `badge_service.go`'s SQL-argument call sites. Every number was verified against current production code before being transcribed (per D-01/D-02).
- Proved the registry's `CurrentTier`/`NextTier`/`Remaining` boundary math with a full table-driven test suite across all seven families (below-first-tier, exact-threshold, one-below-max, at-max), an exact-value lock test transcribing every number verbatim from the plan's `<interfaces>` block, a storage-independence proof for Chronicle vs. Archivist, and a proof that the Membership year constants match the Membership family.
- Captured a real "before" evidence baseline for member `type`: a Playwright SSR capture of the public profile (`/members/type`) including the raw SSR payload snippet that proves today's `role_entry_typesetter` duplicate-emission defect (D-10) and the `role_volume_typesetter_bronze` regression numbers (13/bronze/108/95/silver) named in ROADMAP.md/150-UI-SPEC.md, plus the authenticated `GET /api/v1/me/dashboard` JSON response (total_points=39, role_volume, category_progress for all three contribution families).

## Task Commits

Each task was committed atomically:

1. **Task 1: Capture pre-change UAT evidence baseline** - `fd3e02df` (docs)
2. **Task 2: Create the single Go threshold registry package** - `8a6153e6` (feat)

_Note: no plan-metadata-only commit exists yet -- this SUMMARY.md itself is committed as part of this plan's completion step (see final commit below)._

## Files Created/Modified
- `backend/internal/badges/thresholds.go` - the one authoritative badge threshold registry (7 families + 3 bare constants + CurrentTier/NextTier/Remaining helpers)
- `backend/internal/badges/thresholds_test.go` - table-driven boundary-math proofs for all 7 families/constants, no Postgres dependency
- `.planning/phases/150-badge-regeln-eine-autoritative-schwellenquelle/evidence/before-member-type-profile.txt` - real Playwright SSR capture of member `type`'s public profile (h1/h3/badge-item DOM + raw SSR payload snippet with role_volume_typesetter_bronze ground truth + full `document.body.innerText`)
- `.planning/phases/150-badge-regeln-eine-autoritative-schwellenquelle/evidence/before-dashboard.json` - real authenticated `GET /api/v1/me/dashboard` response for member `type`

## Decisions Made
- Member `type` used for both evidence captures instead of the UI-SPEC's default `sheppert`/`csubs-leader` fixtures, because those two accounts no longer exist in this environment's database (see key-decisions above for full rationale).
- Evidence files force-added past the repo's generated-evidence `.gitignore` rule, since they are a required point-in-time baseline, not a regenerable artifact (see key-decisions above).
- Membership year constants kept as independent literals with a test-enforced lockstep guarantee, per the plan's own documented escape hatch for Go's const-from-var limitation.

## Deviations from Plan

None of Rules 1-4 triggered — no bugs found, no missing critical functionality, no blocking issues beyond the two documented Claude's-Discretion resolutions above (member-fixture substitution and the gitignore force-add), both of which the plan explicitly anticipated and delegated to Claude's Discretion / the executor's judgment (150-UI-SPEC.md's Parity Verification Method section B "Default (Claude's Discretion...)" and the plan's own evidence-directory path convention).

## Issues Encountered
- `sheppert@team4s.local` / `csubs-leader@team4s.local` Keycloak logins failed (`invalid_grant`) because those member rows do not exist in the current database (only 12 members total, confirmed by direct `psql` query). Resolved by using member `type` (`type@team4s.de` / password `123`, discovered via `member_claims` -> `app_users` lookup) for the dashboard capture, which the plan's Claude's-Discretion clause explicitly permits ("If neither has meaningful role-volume or points data ... use any real member account with real activity and record which one in the plan's SUMMARY").
- The plan's `<done>` criterion required the literal string `"role_volume_typesetter_bronze"` to appear in the profile-capture text file. `document.body.innerText` alone does not contain badge codes (they are only in `data-badge-code` DOM attributes and the escaped SSR RSC payload embedded in a `<script>` tag). Resolved by additionally capturing all `[data-badge-code]` elements and a raw-HTML snippet search for the exact string, both written into the evidence file alongside the innerText capture.
- Two throwaway Playwright inspection/capture scripts were created under `frontend/scripts/tmp-150-01-*.mjs` to perform the capture (the existing `collect-member-profile-evidence.mjs` is a 992-line Phase-120 CLS/LCP/multi-viewport harness that does not fit a simple single-member innerText+badge capture, matching the plan's own "if its flags do not fit ... a minimal Playwright script following the same page-object pattern" allowance). All three temp scripts were deleted from both the frontend container and the host working tree after use; none were committed.

## Next Phase Readiness
- `backend/internal/badges` is ready for Plan 150-02/150-03 to import and repoint the six existing hardcoded threshold call sites at.
- Both evidence files exist on disk and in git history for Plan 150-06's Live-UAT diff.
- No blockers. One operational note carried forward: this environment's `sheppert`/`csubs-leader` UAT fixtures are currently absent from the database — any later plan or UAT step in this phase that assumes their existence should re-verify first (member `type` remains a reliable substitute with real, non-trivial activity across all badge families).

---
*Phase: 150-badge-regeln-eine-autoritative-schwellenquelle*
*Completed: 2026-09-06*

## Self-Check: PASSED

All created files found on disk; both task commits (`fd3e02df`, `8a6153e6`) found in git history.
