---
phase: 136-capability-policy-catalog-schema-contract
plan: 15
subsystem: api
tags: [postgresql, transactions, audit, authorization, gin]
requires:
  - phase: 136-08
    provides: group-link update capability and allowed/denied audit baseline
provides:
  - Transactional scoped group-link updates with exact no-op detection
  - Successful-transition-only fansub link audit ordering
  - Handler and repository regression coverage for failure and rollback paths
affects: [phase-137, audit-history, fansub-group-links]
tech-stack:
  added: []
  patterns: [narrow transaction adapter for deterministic repository tests, mutation-before-domain-audit]
key-files:
  created:
    - backend/internal/handlers/fansub_group_links_test.go
    - backend/internal/repository/fansub_repository_group_links_test.go
  modified:
    - backend/internal/handlers/fansub_admin.go
    - backend/internal/handlers/fansub_group_links.go
    - backend/internal/repository/fansub_repository.go
key-decisions:
  - "Exact no-op patches commit the read transaction but perform neither UPDATE nor legacy projection and return changed=false."
  - "Allowed fansub_group_link.updated audit records are emitted only after UpdateGroupLink returns a committed changed=true result."
patterns-established:
  - "Repository mutation results expose changed explicitly so idempotent requests cannot create false domain history."
  - "Group-link row mutation and legacy fansub_groups URL projection share one transaction."
requirements-completed: [CAP-13, QUAL-01]
duration: 14min
completed: 2026-08-20
---

# Phase 136 Plan 15: Truthful Group-Link Audit Summary

**Scoped link patches now lock, compare, update, synchronize legacy URL projections, and commit before one truthful allowed audit record can be written.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-08-20T20:14:00Z
- **Completed:** 2026-08-20T20:28:00Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments

- Replaced the non-transactional link patch with a scoped `FOR UPDATE` transaction returning `(*FansubGroupLink, bool, error)`.
- Prevented allowed audit entries for validation failures, permission denials, missing rows, conflicts, repository failures, and exact no-ops.
- Kept canonical link mutation and the legacy `website_url`/`discord_url`/`irc_url` projection atomic, including rollback coverage.

## Task Commits

1. **Task 1: Move allowed audit behind the real link transition** - `ad49d38e` (fix)

## Files Created/Modified

- `backend/internal/handlers/fansub_admin.go` - Adds narrow injectable update and audit function seams initialized by the production constructor.
- `backend/internal/handlers/fansub_group_links.go` - Validates and persists first, then audits only committed changed results.
- `backend/internal/handlers/fansub_group_links_test.go` - Covers ordering and every false-success path, including retained denied audit behavior.
- `backend/internal/repository/fansub_repository.go` - Implements scoped locking, normalized no-op comparison, transactional update, legacy synchronization, and changed result.
- `backend/internal/repository/fansub_repository_group_links_test.go` - Covers not-found, no-op, changed commit, uniqueness conflict, legacy-sync failure, and commit failure.

## Decisions Made

- Used a narrow internal `groupLinkTx` interface instead of widening the repository's general database abstraction; production still delegates directly to `pgx.Tx`.
- A no-op completes its lock transaction successfully but skips every write and returns the current canonical row with `changed=false`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The full handler/repository package run compiles but has unrelated baseline failures from the process-global unloaded capability cache, missing contract mounts/test DSNs, and Phase-134 live-fixture credentials. The two plan-anchored suites pass independently.

## Verification

- `docker compose exec -T team4sv30-backend go test ./internal/handlers -run '^TestPhase136GroupLinkAudit' -count=1` — PASS
- `docker compose exec -T team4sv30-backend go test ./internal/repository -run '^TestPhase136UpdateGroupLink' -count=1` — PASS
- `git diff --check` — PASS
- Full `go test ./internal/handlers ./internal/repository -count=1` — baseline failures documented above; no compile failure from Plan 136-15.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- D-11 link audit evidence now represents persisted state transitions and is ready for Phase 137 policy work.
- No Plan 136-15 blocker remains.

## Self-Check: PASSED

- All five key files exist.
- Task commit `ad49d38e` exists.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
