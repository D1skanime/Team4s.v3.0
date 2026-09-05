---
phase: 147-rollen-registry-letzte-parallelkataloge-aufl-sen
plan: 05
subsystem: auth
tags: [go, permissions, dead-code-removal, role-registry]

# Dependency graph
requires: []
provides:
  - "permissions.go's role-constant block carries only Go-comparison-referenced role codes, with a clarifying non-authoritative comment"
  - "Four package-internal test fixtures (permissions_test.go, effective_rights_test.go, effective_rights_capability_impact_preview_test.go, capability_registry_test.go) use raw string literals instead of the removed constants"
affects: [147-02]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/permissions/permissions_test.go
    - backend/internal/permissions/effective_rights_test.go
    - backend/internal/permissions/effective_rights_capability_impact_preview_test.go
    - backend/internal/permissions/capability_registry_test.go

key-decisions:
  - "Deleted RoleTranslator/RoleTypesetter from the first const block and the entire RoleTechadmin/RoleGfxler const block (HC-09); the four test fixtures that referenced them now use raw string literals \"translator\"/\"typesetter\"/\"techadmin\"/\"gfxler\""
  - "Left the fully commented-out /* ... */ roleMatrix block (lines 98-200) untouched even though it still contains RoleTranslator/RoleTypesetter as dead text -- it does not compile, per CONTEXT.md's explicit scope note"

patterns-established: []

requirements-completed: [HC-09]

# Metrics
duration: 6min
completed: 2026-09-05
---

# Phase 147 Plan 05: Remove Unreferenced Role Constants (HC-09) Summary

**Removed four dead Go role constants from `permissions.go` and converted their only remaining consumers (four package-internal test fixtures) to raw string literals, closing HC-09 without introducing a new Go role list.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-09-05T14:54:00Z (approx)
- **Completed:** 2026-09-05T14:59:55Z
- **Tasks:** 2/2 completed
- **Files modified:** 5

## Accomplishments
- `RoleTranslator`, `RoleTypesetter`, `RoleTechadmin`, `RoleGfxler` no longer exist as Go constants in `backend/internal/permissions/permissions.go`.
- The remaining role-constant block now carries a comment clarifying it is not an authoritative role list, that `role_definitions` is the catalog, and that it holds only codes directly referenced in Go comparisons.
- The four package-internal test fixtures that referenced the removed constants now use the equivalent raw string literals and pass unchanged.
- All other constants in the same block (`RolePlatformAdmin`, `RoleFansubLead`, `RoleProjectLead`, `RoleTimer`, `RoleEditor`, `RoleEncoder`, `RoleRawProvider`, `RoleQualityChecker`, `RoleDesigner`) remain byte-identical.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove the four unreferenced constants and clarify the remaining block** - `19be3be3` (feat)
2. **Task 2: Convert the four package-internal test fixtures to string literals** - `79bbdff9` (test)

_Note: Task 2 was flagged `tdd="true"` in the plan, but its `<behavior>` block described a pure literal-for-constant substitution with identical outcome (not new behavior) — no separate RED/GREEN cycle applied; the single `test(...)` commit captures the fixture conversion directly, verified against the existing (already-passing) test suite._

## Files Created/Modified
- `backend/internal/permissions/permissions.go` - Removed `RoleTranslator`/`RoleTypesetter` from the first const block and the entire `RoleTechadmin`/`RoleGfxler` const block (and its now-stale `// Neue Gruppenrollen (D-07)` comment); added a clarifying non-authoritative comment above the remaining block.
- `backend/internal/permissions/permissions_test.go` - `RoleTranslator` → `"translator"` (line 466).
- `backend/internal/permissions/effective_rights_test.go` - `RoleTranslator` → `"translator"` (line 325); `RoleFansubLead` untouched.
- `backend/internal/permissions/effective_rights_capability_impact_preview_test.go` - `RoleTranslator` → `"translator"` (line 183).
- `backend/internal/permissions/capability_registry_test.go` - Map keys `RoleTranslator`/`RoleTypesetter`/`RoleGfxler`/`RoleTechadmin` → `"translator"`/`"typesetter"`/`"gfxler"`/`"techadmin"`; corrected the stale "gfxler/techadmin sind Go-Konstanten..." comment to reflect the literal style.

## Decisions Made
- Left the inert `/* Historical bootstrap grants retained as documentation only ... */` `roleMatrix` block (permissions.go lines 98-200) fully untouched per plan/CONTEXT.md instruction — it is a block comment that does not compile, and its textual references to `RoleTranslator`/`RoleTypesetter` are dead text, not a compiled reference. Verified: `grep -n "RoleTranslator\|RoleTypesetter\|RoleTechadmin\|RoleGfxler" permissions.go` returns exactly lines 164 and 175, both inside the comment block that opens at line 98 and closes at line 200.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' acceptance criteria were verified directly:
- `grep -c "RoleTranslator\|RoleTypesetter\|RoleTechadmin\|RoleGfxler" permissions.go` → 2 hits, both inside the inert `/* ... */` block (inspected and confirmed).
- `grep -q 'RolePlatformAdmin  = "platform_admin"'` → matched, untouched constants confirmed present.
- `docker exec team4sv30-backend go build ./...` → exit 0.
- `grep -n "RoleTranslator\|RoleTypesetter\|RoleTechadmin\|RoleGfxler"` across the four test files → no matches.
- `docker exec team4sv30-backend go test ./internal/permissions/... -v` → all tests pass, 0 failures.
- `docker exec team4sv30-backend go vet ./internal/permissions/...` → clean.

## Issues Encountered
None.

## User Setup Required
None — this plan required no environment variables, external services, or manual configuration.

## Self-Check: PASSED

- FOUND: backend/internal/permissions/permissions.go (verified clarifying comment and constant removal present)
- FOUND: backend/internal/permissions/permissions_test.go (verified literal substitution present)
- FOUND: backend/internal/permissions/effective_rights_test.go (verified literal substitution present)
- FOUND: backend/internal/permissions/effective_rights_capability_impact_preview_test.go (verified literal substitution present)
- FOUND: backend/internal/permissions/capability_registry_test.go (verified literal substitution present)
- FOUND commit 19be3be3 (git log --oneline --all | grep 19be3be3)
- FOUND commit 79bbdff9 (git log --oneline --all | grep 79bbdff9)

## Next Steps
This was the last Wave 1 plan for Phase 147 (147-01, 147-03, 147-04, 147-05 all complete). Wave 2 (147-02, HC-02 frontend catalog migration) is next.
