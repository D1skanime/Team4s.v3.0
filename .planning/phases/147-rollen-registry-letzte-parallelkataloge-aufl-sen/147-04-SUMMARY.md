---
phase: 147-rollen-registry-letzte-parallelkataloge-aufl-sen
plan: 04
subsystem: auth
tags: [go, models, authz, admin-users, capability-matrix, source-contract-test]

# Dependency graph
requires:
  - phase: 147-01
    provides: role_code plumbing precedent for public note repositories (parallel HC finding in same phase, no direct code dependency)
provides:
  - models.AppGlobalRoles as the single exported Go source of the three global App-Rollen (platform_admin, content_admin, user)
  - four consumers (admin_capability_handler.go, admin_users_handler.go, admin_users_repository.go, admin_users_mutations_handler.go) deriving from it with zero string-literal duplication
  - a source-contract test (TestPhase147AppGlobalRolesSourceContract) locking models.AppGlobalRoles to migration 0072's chk_app_user_global_roles_role CHECK constraint
affects: [147-05, 147-06, future-global-role-changes]

# Tech tracking
tech-stack:
  added: []
  patterns: ["derive literal-list from a canonical models.* slice", "regex-extraction-and-compare source-contract test for DB CHECK constraint vs Go slice agreement"]

key-files:
  created:
    - backend/internal/migrations/phase147_app_global_roles_source_contract_test.go
  modified:
    - backend/internal/models/app_auth.go
    - backend/internal/handlers/admin_capability_handler.go
    - backend/internal/handlers/admin_users_handler.go
    - backend/internal/repository/admin_users_repository.go
    - backend/internal/handlers/admin_users_mutations_handler.go

key-decisions:
  - "models.AppGlobalRoles declared above KeycloakManagedGlobalRoles in the same file; KeycloakManagedGlobalRoles = AppGlobalRoles keeps its own name/doc-comment because it documents a different authority (Keycloak-JIT-sync whitelist) even though the value is currently identical"
  - "admin_users_handler.go's validGlobalRoles built via a new small buildRoleSet(roles []string) helper (no existing IIFE-var pattern found in that file to copy, so a plain helper function was used instead)"
  - "Source-contract test uses one shared regex (CHECK \\(role IN \\(([^)]+)\\)\\)) plus split/trim, matching CONTEXT.md's exact-set-equality requirement, not substring presence"

requirements-completed: [HC-03]

# Metrics
duration: 3min
completed: 2026-09-05
---

# Phase 147 Plan 04: Single Go Source for Global App-Rollen Summary

**`models.AppGlobalRoles` is now the one exported Go source of `platform_admin`/`content_admin`/`user`; all four former literal copies derive from it, and a regex-based source-contract test locks it to migration 0072's `chk_app_user_global_roles_role` CHECK constraint.**

## Performance

- **Duration:** ~3 min (14:53:18 -> 14:56:09 UTC)
- **Started:** 2026-09-05T14:53:18Z
- **Completed:** 2026-09-05T14:56:09Z
- **Tasks:** 2 completed
- **Files modified:** 6 (5 modified, 1 created)

## Accomplishments
- `backend/internal/models/app_auth.go` gained the exported `AppGlobalRoles` slice; `KeycloakManagedGlobalRoles` now derives from it (`= AppGlobalRoles`) with an updated doc comment clarifying its distinct Keycloak-JIT-sync purpose.
- All four literal-copy consumers (`admin_capability_handler.go`'s `globalAppRoleCodes`, `admin_users_handler.go`'s `validGlobalRoles`, `admin_users_repository.go`'s `AssignableRoles`, `admin_users_mutations_handler.go`'s invalid-role error text) now derive from `models.AppGlobalRoles` with zero remaining string-literal duplication.
- The German error text (`"Ungültige Rolle. Erlaubte Werte: ..."`) is now built via `strings.Join(models.AppGlobalRoles, ", ")`, byte-identical to the prior hand-typed text, umlauts preserved.
- A new source-contract test (`TestPhase147AppGlobalRolesSourceContract`) proves `models.AppGlobalRoles` set-equals the three values inside migration 0072's `CHECK (role IN (...))` clause, with no runtime DB query introduced.

## Task Commits

Each task was committed atomically:

1. **Task 1: Export AppGlobalRoles and derive its four consumers** - `d369bbe4` (feat)
2. **Task 2: Source-contract test locking models.AppGlobalRoles to migration 0072's CHECK constraint** - `99b31d1a` (test)

## Files Created/Modified
- `backend/internal/models/app_auth.go` - added exported `AppGlobalRoles` slice; `KeycloakManagedGlobalRoles` now derives from it
- `backend/internal/handlers/admin_capability_handler.go` - added `models` import; `globalAppRoleCodes = models.AppGlobalRoles`
- `backend/internal/handlers/admin_users_handler.go` - `validGlobalRoles` built from `models.AppGlobalRoles` via new `buildRoleSet` helper
- `backend/internal/repository/admin_users_repository.go` - `AssignableRoles: models.AppGlobalRoles` (was a 3-value literal)
- `backend/internal/handlers/admin_users_mutations_handler.go` - added `strings` import; both `AssignGlobalRole`/`RevokeGlobalRole` error texts now derive via `strings.Join(models.AppGlobalRoles, ", ")`
- `backend/internal/migrations/phase147_app_global_roles_source_contract_test.go` (new) - regex-extraction-and-compare test proving DB/Go agreement, reusing the existing `phase136MigrationPath(t, name)` helper

## Decisions Made
- Placed `AppGlobalRoles` directly above `KeycloakManagedGlobalRoles` in the same file (mirrors PATTERNS.md's recommended ordering) rather than appending it after.
- Used a plain `buildRoleSet` helper function in `admin_users_handler.go` instead of an IIFE-initialized var, since no existing IIFE-var pattern was found in that file to match against (PLAN.md left this as Claude's discretion).
- Kept `globalAppRoleLabels` (the German display-name map) untouched — only the code list (`globalAppRoleCodes`) was migrated, per CONTEXT.md's explicit scope note that the label map is a different concern.

## Deviations from Plan

None - plan executed exactly as written. The one explicit development step called for by the plan itself (Task 2's acceptance criteria: "deliberately break the test once during development... to confirm it fails loudly before restoring the correct assertion") was performed as instructed: the assertion was temporarily changed to compare against a 2-element slice, confirmed a real `require.ElementsMatch` failure with a clear diff, then restored to the correct 3-element comparison before the final commit. No temporary break remains in the diff.

## Issues Encountered

None. `docker exec team4sv30-backend go build ./...` and `go vet ./internal/models/... ./internal/handlers/... ./internal/repository/... ./internal/migrations/...` both exited clean; the full targeted test suite (`AdminUsers|AdminCapability|GlobalRole|Phase147AppGlobalRoles`) passed with all prior assertions (including the byte-identical German error message) unchanged.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HC-03 is fully closed: no string-literal copies of the three global App-Rollen remain anywhere in the four originally-flagged consumer files, and a regression-proof test guards against future silent widening/narrowing of the set (T-147-07/T-147-08 from the plan's threat register).
- The DB CHECK constraint `chk_app_user_global_roles_role` remains the untouched, final persistence-layer invariant; no runtime query was added to derive the role set, matching the plan's explicit constraint.
- No blockers for subsequent phase-147 plans (HC-01/HC-02/HC-09 are handled in sibling plans 147-01/147-03/others, not touched here).

---
*Phase: 147-rollen-registry-letzte-parallelkataloge-aufl-sen*
*Completed: 2026-09-05*

## Self-Check: PASSED

All 6 modified/created files found on disk; both task commits (`d369bbe4`, `99b31d1a`) verified present in `git log --oneline --all`.
