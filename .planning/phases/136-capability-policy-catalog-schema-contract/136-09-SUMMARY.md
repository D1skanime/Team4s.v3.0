---
phase: 136-capability-policy-catalog-schema-contract
plan: 09
subsystem: authorization
tags: [go, permissions, capability-catalog, postgres, security]
requires: [136-01]
provides:
  - exact narrow capability enforcement for confirmed role defaults
  - seed-to-handler contract coverage
  - mixed-field fansub patch authorization
affects: [136-02, 137]
tech-stack:
  added: []
  patterns: [bind-validate-authorize-mutate, exact-action-audit, fail-closed-seed-contract]
key-files:
  created:
    - backend/internal/handlers/phase136_narrow_role_defaults_enforcement_test.go
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/handlers/fansub_groups.go
    - backend/internal/handlers/fansub_group_links.go
    - backend/internal/handlers/fansub_media_review_handler.go
    - backend/internal/handlers/fansub_group_history_handler.go
    - database/migrations/0146_capability_policy_catalog.up.sql
    - backend/internal/migrations/phase136_capability_policy_catalog_test.go
key-decisions:
  - Fansub group patches derive and require every narrow action from validated fields before repository mutation.
  - Link updates use fansub_group_links.update while create/delete retain the existing manage action.
  - History create/update use founding-history edit while deletion remains excluded from the narrow founder default.
metrics:
  duration: 18m
  completed: 2026-08-20
---

# Phase 136 Plan 09: Narrow Role Defaults Enforcement Summary

Confirmed operative defaults for `gfxler`, `techadmin`, `founder`, and `co_leader` now reach exact group-scoped mutation guards without granting broad edit, delete, member-admin, or role-admin authority.

## Accomplishments

- Added compile-time action identifiers and a seed-to-handler contract covering all 16 confirmed role/action mappings.
- Split `UpdateFansub` authorization by actual validated fields; mixed patches require every applicable action before mutation.
- Separated media reorder from metadata update, link update from link deletion, and history editing from member administration.
- Seeded only the confirmed narrow mappings and asserted destructive/broad exclusions in migration coverage.

## Task Commits

1. `92cb2dc6` — `test(136-09): specify narrow role enforcement contract`
2. `4d3409d8` — `feat(136-09): enforce narrow role default capabilities`

## Verification

- `docker compose exec -T team4sv30-backend go test ./internal/handlers -run 'Phase136NarrowRoleDefaults|FansubMedia|FansubGroupHistory|FansubLink|UpdateFansub' -count=1` — passed.
- `docker compose exec -T team4sv30-backend go test ./internal/migrations -run Phase136 -count=1` — passed (source contract; live DSN-dependent checks are skipped by the focused environment).
- `docker compose exec -T team4sv30-backend go test ./internal/permissions -count=1` — passed after clearing a stale Go build cache.
- `git diff --check` — passed.

The broader handlers/migrations package run still reports pre-existing failures outside this plan: Phase-128 public-access source expectations, contract paths unavailable inside the backend container, and migration suites requiring dedicated Phase-128/134 DSNs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cleared stale container Go build cache**

- **Found during:** Task 2 verification
- **Issue:** The backend container compiled an older `permissions.go` after the mounted source had changed.
- **Fix:** Ran `go clean -cache` inside the Compose backend container and reran the focused suites.
- **Files modified:** None
- **Commit:** N/A

## Security Notes

- Authorization occurs after request binding and validation but before repository mutation.
- Foreign-group ownership checks remain unchanged.
- Exact denied and allowed actions are preserved in audit entries.
- Per-user Allow/Deny resolution remains exclusively Phase 137 scope.

## Known Stubs

None.

## Self-Check: PASSED

- All plan-owned implementation and test files exist.
- Both task commits exist in Git history.
- No tracked files were deleted by either task commit.
