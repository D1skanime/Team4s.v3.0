---
phase: 108-bestehende-beitragsquellen-anbinden
plan: "03"
subsystem: backend
tags: [postgresql, pgx, release-crew, point-ledger, tdd]

requires:
  - phase: 108-02
    provides: Confirmed-only stored release crew snapshots
provides:
  - Atomic complete-set release crew replacement with permanent independence
  - Append-only role awards, reversals, and generation-based restorations
  - Group-scoped leader/member confirmation through the same transaction service
affects: [108-05, 108-06, release-crew-api, contribution-confirmation]

tech-stack:
  added: []
  patterns:
    - Semantic Member x Release Version x Role set diff
    - Caller-owned pgx transaction spanning confirmed snapshot and PointService ledger mutations

key-files:
  created:
    - backend/internal/services/release_crew_service.go
    - backend/internal/services/release_crew_service_test.go
  modified:
    - backend/internal/repository/release_crew_snapshot_repository.go
    - backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go
    - backend/internal/handlers/contribution_review_handler.go
    - backend/internal/handlers/contributions_me_handler.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - shared/contracts/admin-content.yaml

key-decisions:
  - "Each restored role receives a new lifecycle generation and source identity."
  - "The complete-set browser contract contains only member IDs and role codes."
  - "Leader and eligible member confirmations share the release crew transaction boundary."

requirements-completed: [GAM-01, GAM-02, GAM-03, GAM-04, GAM-05]

duration: 14 min
completed: 2026-07-24
---

# Phase 108 Plan 03: Atomic Release Crew Lifecycle Summary

**Complete confirmed release crews now update atomically with exact worker-owned awards, append-only reversals/restorations, and group-scoped confirmation**

## Performance

- **Duration:** 14 min
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Added semantic member/release-version/role set diffing so unchanged Gon/Übersetzung and Anton/Edit units receive no ledger writes while removed and added units are handled independently.
- Made the first manual full-set replace permanently independent, including a valid empty set.
- Added generation-backed restoration awards after reversal, with server-derived source identity and PointService-only ledger access.
- Added a strict permission-first PUT endpoint and routed production leader/member confirmation through the shared transactional service.
- Preserved proposed/draft/disputed/history rows by limiting snapshot replacement and effective point behavior to confirmed work.

## Task Commits

1. **Task 1 RED: Release crew lifecycle contract** - `7dda3917`
2. **Task 1 GREEN: Atomic crew and point lifecycle** - `41248eae`
3. **Task 2 RED: Strict replace DTO contract** - `cf6c9731`
4. **Task 2 GREEN: Replace API and confirmation bindings** - `7852e6dc`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Exposed snapshot context IDs in repository changes**
- **Found during:** Task 2 project-confirmation binding
- **Issue:** Inherited synchronization returned diffs without the release/group identity required to apply matching ledger mutations.
- **Fix:** Added canonical release-version and fansub-group IDs to each snapshot change.
- **Files modified:** `backend/internal/repository/release_crew_snapshot_repository.go`
- **Verification:** Full repository/service/handler/server suites pass.
- **Commit:** `7852e6dc`

**Total deviations:** 1 missing critical correctness fix.

## Known Stubs

None.

## Threat Review

- Permission is checked before replace payload mutation.
- Release/group context is validated through the canonical `release_version_groups` join under the transaction lock.
- The DTO rejects actor, reviewer, point, rule, status, effective-time, and idempotency overrides.
- Ledger writes occur only through `PointService.CreditInTx` and `PointService.ReverseInTx`.
- No migration, data backfill, media path, or release-note/media credit seam was added.

## Verification

- Focused plan service/handler command passed.
- Concurrency/retry/rollback/restoration sampling command passed with `-count=20`.
- Full affected repository, service, handler, and server suites passed.
- Direct ledger SQL scan returned no matches.
- `git diff --check` passed.

## Self-Check: PASSED

- All key files exist.
- Commits `7dda3917`, `41248eae`, `cf6c9731`, and `7852e6dc` exist.
- All plan verification commands and acceptance scans pass.

---
*Phase: 108-bestehende-beitragsquellen-anbinden*
*Completed: 2026-07-24*
