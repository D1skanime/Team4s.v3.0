---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 01
subsystem: auth
tags: [go, gin, handlers, refactor, modularity]

# Dependency graph
requires: []
provides:
  - app_auth.go reduced from 1308 lines to a 450-line-cap-compliant core (struct, constructor, store interfaces, GetCurrentUser, ListAppUsers, HandleKeycloakBackchannelLogout)
  - app_auth_invitations.go with fansub group invitation lifecycle (List/Create/Cancel/Accept)
  - app_auth_group_members.go with member listing/search/creation + role normalizer
  - app_auth_group_member_roles.go with role/status/media-permission mutation handlers
  - app_auth_capabilities.go with GetFansubGroupCapabilities
affects: [143-nacharbeit-remaining-plans, backend-internal-handlers]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Handler package split by responsibility while keeping one shared struct receiver across sibling files (Go same-package method distribution)"]

key-files:
  created:
    - backend/internal/handlers/app_auth_invitations.go
    - backend/internal/handlers/app_auth_group_members.go
    - backend/internal/handlers/app_auth_group_member_roles.go
    - backend/internal/handlers/app_auth_capabilities.go
  modified:
    - backend/internal/handlers/app_auth.go

key-decisions:
  - "Split the group-members bucket into two files (app_auth_group_members.go + app_auth_group_member_roles.go) instead of the plan's single app_auth_group_members.go, because the plan's own exact function/type assignment for that bucket produces ~500 lines, exceeding the 450-line CLAUDE.md cap the plan itself sets as an acceptance criterion."

patterns-established:
  - "Pattern 1: Oversized Go handler files split by CRUD/lifecycle responsibility (list/search/create vs. mutate-role/status/permissions vs. capability-read), all sharing one struct/constructor file and the same *AppAuthHandler receiver — no interfaces or DI needed since Go allows methods on the same struct to live in separate files within one package."

requirements-completed: ["Randbedingung-450-line-app_auth-split"]

# Metrics
duration: 7min
completed: 2026-09-01
---

# Phase 143 Plan 01: Split app_auth.go Summary

**Split the 1308-line `app_auth.go` handler monolith into five ≤450-line files by responsibility (auth/constructor core, invitations, member listing/creation, member role/status mutations, capabilities), with zero signature, route, or behavior change.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-01T20:30:42Z
- **Completed:** 2026-09-01T20:37:16Z
- **Tasks:** 2 completed
- **Files modified:** 5 (1 modified, 4 created)

## Accomplishments
- `app_auth.go` cut from 1308 lines to 183 lines, containing only the `AppAuthHandler` struct, `NewAppAuthHandler` constructor, store interfaces, `GetCurrentUser`, `ListAppUsers`, `HandleKeycloakBackchannelLogout`
- Four new sibling files created, all `package handlers`, all methods still on `(h *AppAuthHandler)`: `app_auth_invitations.go` (390 lines), `app_auth_group_members.go` (207 lines), `app_auth_group_member_roles.go` (306 lines), `app_auth_capabilities.go` (272 lines) — every file at or below the 450-line CLAUDE.md modularity cap
- Zero identifier renamed, zero route changed, zero behavior changed — pure code relocation with per-file trimmed import blocks
- `app_auth_test.go` (2030 lines) confirmed byte-identical (`git diff --stat` shows no changes) and its full test suite passes unmodified after the split

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2 combined: Split app_auth.go into five files + format/build/verify** - `1cdba33b` (refactor)

_Note: Task 2 (gofmt/go vet/go build/go test verification) required no additional code changes — the split files were already gofmt-clean and go vet-clean on first write, so verification was folded into the same commit as Task 1's file move._

## Files Created/Modified
- `backend/internal/handlers/app_auth.go` - trimmed to struct/constructor/auth-core (183 lines, was 1308)
- `backend/internal/handlers/app_auth_invitations.go` - invitation request types + List/Create/Cancel/Accept (390 lines)
- `backend/internal/handlers/app_auth_group_members.go` - member listing/search/creation + role normalizer (207 lines)
- `backend/internal/handlers/app_auth_group_member_roles.go` - role/status/media-permission mutation handlers (306 lines)
- `backend/internal/handlers/app_auth_capabilities.go` - `fansubGroupCapabilitiesResponse` + `GetFansubGroupCapabilities` (272 lines)

## Decisions Made
- Split the group-members bucket into two files instead of the plan's mandated single `app_auth_group_members.go`. The plan's own exact function/type assignment for that bucket (ListFansubGroupAppMembers, SearchFansubGroupAppMemberCandidates, CreateFansubGroupAppMember, SetFansubGroupMemberRole, SetFansubLead, setFansubGroupMemberRole, UpdateFansubGroupMemberStatus, SetFansubGroupMemberMediaPermissions, normalizeRequestedFansubRoles, plus 4 request types) totals ~500 lines with a per-file import block — over the 450-line cap the plan's own acceptance criteria requires. Split by CRUD lifecycle: `app_auth_group_members.go` keeps list/search/create + the role normalizer; `app_auth_group_member_roles.go` keeps the role/status/media-permission mutation methods. No identifier was renamed and no plan-mandated file (`app_auth.go`, `app_auth_invitations.go`, `app_auth_capabilities.go`) was affected by this split.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Split app_auth_group_members.go into two files to satisfy the 450-line cap**
- **Found during:** Task 1 (line-count verification after the initial 4-file split)
- **Issue:** Following the plan's exact function-to-file assignment literally, `app_auth_group_members.go` came out to 500 lines — 50 lines over both the plan's own `<=450` acceptance criterion and CLAUDE.md's Modularity constraint. The plan's ~400-line estimate for this bucket was an underestimate of the actual moved content plus its own import block.
- **Fix:** Split the bucket into `app_auth_group_members.go` (207 lines: listing/search/creation + role normalizer) and `app_auth_group_member_roles.go` (306 lines: role/status/media-permission mutations). Zero identifier renamed; all methods remain on `(h *AppAuthHandler)` in the same `handlers` package.
- **Files modified:** backend/internal/handlers/app_auth_group_members.go, backend/internal/handlers/app_auth_group_member_roles.go (new)
- **Verification:** `wc -l` confirms all five files at or under 450 lines; `go build ./...`, `go vet ./internal/handlers/...`, and `gofmt -l ./internal/handlers/` all clean; method-count parity check (`grep -c "^func (h \*AppAuthHandler)"` across all app_auth*.go files) sums to 16, matching the original monolith's 16.
- **Committed in:** 1cdba33b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical / modularity-constraint compliance)
**Impact on plan:** The fix produces one extra file beyond the plan's stated four, but stays fully within the plan's objective (get every file under 450 lines with zero behavior change) and its own acceptance criteria. No scope creep — same functions, same package, same receiver, just one more file boundary.

## Issues Encountered
- Running `go test ./internal/handlers/... -run TestAppAuth` (the plan's literal verify command) matched zero tests since no test function in the package is literally named `TestAppAuth*`. Ran the full `go test ./internal/handlers/...` package suite instead, which is a superset covering all `app_auth_test.go` cases and passed cleanly (`ok`).
- Running a narrower `-run` filter targeting just 3 specific `TestCreateFansubGroupAppMember*` tests failed with `403 insufficient_role` instead of the expected `409`/`201`. Investigated by temporarily restoring the original pre-split monolithic `app_auth.go` (via `git show HEAD:...`, no `git stash`/`reset` used) and re-running the same narrow `-run` filter against it — same 3 failures occurred. This confirms the failures are a pre-existing test-order/fixture-isolation issue independent of this plan's pure code-move (these 3 tests only pass when run as part of the full package suite, not in isolation), present at HEAD before this plan touched anything. Restored the split files afterward; the full `./internal/handlers/...` suite (the actual, complete pass/fail set) passes with `ok` both before and after the split.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `app_auth.go` and its four new siblings are all under the 450-line CLAUDE.md cap; the file is no longer a candidate for future 450-line-limit violations from Phase-142-era growth.
- No blockers for subsequent 143-NN plans — this plan's file set (`app_auth*.go`) is not touched by any other plan named in `143-PATTERNS.md`.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: backend/internal/handlers/app_auth.go
- FOUND: backend/internal/handlers/app_auth_invitations.go
- FOUND: backend/internal/handlers/app_auth_group_members.go
- FOUND: backend/internal/handlers/app_auth_group_member_roles.go
- FOUND: backend/internal/handlers/app_auth_capabilities.go
- FOUND commit: 1cdba33b
