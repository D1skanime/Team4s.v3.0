---
phase: 178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-
plan: 02
subsystem: api
tags: [go, pgx, postgres, fansub, contracts, typescript]

# Dependency graph
requires: []
provides:
  - "attachGroupAliases bulk-by-ID repository function wired into ListGroups and hydrateFansubGroup"
  - "models.FansubGroup.Aliases []string json:\"aliases,omitempty\" field"
  - "shared/contracts/fansubs.yaml FansubGroup schema documents both kuerzel and aliases"
  - "frontend/src/types/fansub.ts FansubGroup.aliases?: string[] field"
affects: [178-03, 178-04, 178-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bulk-by-ID attach helper (attachGroupAliases) replicating the existing attachGroupLinks shape: single ANY($1) query, indexByID map, append onto items[index]"

key-files:
  created:
    - backend/internal/repository/phase178_fansub_group_aliases_test.go
    - .planning/phases/178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-/deferred-items.md
  modified:
    - backend/internal/repository/fansub_repository_groups.go
    - backend/internal/models/fansub.go
    - shared/contracts/fansubs.yaml
    - frontend/src/types/fansub.ts

key-decisions:
  - "attachGroupAliases queries ORDER BY alias ASC only (no secondary id tiebreak), matching the plan's exact behavior spec and the existing ListAliases precedent's primary sort key"
  - "Fixed the pre-existing kuerzel documentation drift in shared/contracts/fansubs.yaml's FansubGroup block while touching the same block (D-05), since the Go model/TS type/real JSON response already had it"

patterns-established:
  - "attachGroupAliases: the third bulk-by-ID attach helper alongside attachGroupCounts/attachGroupLinks in fansub_repository_groups.go, called from both the list path (ListGroups) and the single-item path (hydrateFansubGroup)"

requirements-completed: [D-18, D-05]

# Metrics
duration: ~15min
completed: 2026-10-10
---

# Phase 178 Plan 02: FansubGroup.Aliases bulk-load contract Summary

**Bulk-loaded `aliases: string[]` on `FansubGroup` (Go model, repository, OpenAPI-style YAML, TypeScript) so the three upcoming fansub-group filter sites can search Kürzel+Alias with zero extra per-group round trips.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-10T08:43:39Z (immediately after 178-01's metadata commit)
- **Completed:** 2026-10-10T08:48:24Z
- **Tasks:** 2/2 completed
- **Files modified:** 5 (2 backend source, 1 backend test, 1 contract, 1 frontend type)

## Accomplishments

- `attachGroupAliases` bulk-by-ID repository function added to `fansub_repository_groups.go`, replicating `attachGroupLinks`'s exact shape (empty-slice guard, `ANY($1)` query, `indexByID` map), wired into both `ListGroups` and `hydrateFansubGroup` (covering `CreateGroup`/`GetGroupByID`/`GetGroupBySlug`/`UpdateGroup`).
- `models.FansubGroup.Aliases []string json:"aliases,omitempty"` added next to the existing `AliasesCount` field.
- 3 new live-Postgres behavior tests (`phase178_fansub_group_aliases_test.go`) prove: `ListGroups` returns 2 aliases alphabetically ordered, `GetGroupByID` parity with `ListGroups` for the same group, and a 0-alias group returns `nil`/empty `Aliases` without error.
- `shared/contracts/fansubs.yaml`'s `FansubGroup` schema block now documents both the new `aliases: string[]` field and the pre-existing, previously-undocumented `kuerzel: string | null` field (drift from phase 176).
- `frontend/src/types/fansub.ts`'s `FansubGroup` interface gained the matching optional `aliases?: string[]` field.

## Task Commits

1. **Task 1: Add attachGroupAliases and wire it into ListGroups + hydrateFansubGroup** - `6455d368` (feat)
2. **Task 2: Fix shared/contracts/fansubs.yaml drift and extend frontend/src/types/fansub.ts** - `2137175e` (docs)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `backend/internal/repository/fansub_repository_groups.go` - new `attachGroupAliases` function; call sites added to `ListGroups` and `hydrateFansubGroup`
- `backend/internal/models/fansub.go` - `Aliases []string json:"aliases,omitempty"` field added to `FansubGroup`
- `backend/internal/repository/phase178_fansub_group_aliases_test.go` - 3 new live-Postgres behavior tests
- `shared/contracts/fansubs.yaml` - `FansubGroup` schema block: added `kuerzel: string | null` and `aliases: string[]`
- `frontend/src/types/fansub.ts` - `FansubGroup` interface: added `aliases?: string[]`
- `.planning/phases/178-.../deferred-items.md` - new file logging one pre-existing, unrelated `tsc` failure

## Decisions Made

- Fixed the pre-existing `kuerzel` YAML drift in the same edit as the new `aliases` field, per the plan's explicit instruction (same schema block, unrelated to this phase's actual behavior change, D-05).
- Kept the alias-ordering query to `ORDER BY alias ASC` only (no `id` tiebreak), matching the plan's literal behavior spec rather than adding an unrequested secondary sort key.

## Deviations from Plan

### Auto-fixed Issues

None — no bugs, missing functionality, or blocking issues were found during execution. Code matched the plan's literal action/behavior specs on the first pass, confirmed by the live-Postgres test suite.

### Notes on acceptance-criteria grep precision (not a deviation, documented for transparency)

The plan's acceptance-criteria greps count substring occurrences and, due to the existing project pattern (mirrored from `attachGroupLinks`), the function *definition* line itself also contains the substring being grepped for:

- `grep -c "attachGroupAliases(ctx"` returns `3` (function definition + 2 call sites), not the plan's expected `2`. The actual intent — exactly 2 call sites (`r.attachGroupAliases(ctx, ...)` in `ListGroups` and `hydrateFansubGroup`) — is satisfied and verified (`grep -c "r\.attachGroupAliases(ctx"` returns `2`). The identical 3-vs-2 discrepancy exists for the pre-existing `attachGroupLinks` pattern this code replicates, so this is a pre-existing imprecision in how such greps are phrased across the codebase, not a defect introduced here.
- `grep -A2 "^  FansubGroup:" shared/contracts/fansubs.yaml | grep -c "kuerzel"` returns `0`, not the plan's expected `1`, because `-A2` only captures the header plus 2 lines (`id`, `slug`) — `kuerzel` sits on the 4th line (after `name`), per the plan's own placement instruction ("directly after `name: string`"). The field is correctly present in the `FansubGroup` block at the specified location (verified by direct inspection, `sed -n '610,634p'`); this is a grep-line-count mismatch in the plan text, not a placement error.

Both discrepancies were verified by direct inspection to confirm the actual code/contract state matches the plan's intent; no fix was needed because nothing is actually wrong.

## Known Stubs

None.

## Threat Flags

None — the threat model's three registered threats (T-178-04, T-178-15, T-178-05) were all pre-accepted dispositions in the plan and required no new mitigation code; no new, undeclared surface was introduced.

## Verification Results

- `cd backend && go test ./internal/repository/... -run TestPhase178FansubGroupAliases -v` — all 3 tests pass against the live Postgres fixture (`team4s_phase167_test_1` via `TEAM4S_PHASE167_TEST_DSN`, run inside the `team4sv30-backend` container).
- `cd backend && go build ./...` — succeeds.
- `cd frontend && npx tsc --noEmit -p tsconfig.json` — reports one pre-existing, unrelated error in a gitignored `.next/dev/types/.../releaseVersionId]/page.ts` generated artifact (confirmed independent of this plan's change by reverting the new field and reproducing the identical error; logged in `deferred-items.md`, out of scope per the scope-boundary rule).

## Self-Check: PASSED

- FOUND: backend/internal/repository/fansub_repository_groups.go (modified)
- FOUND: backend/internal/models/fansub.go (modified)
- FOUND: backend/internal/repository/phase178_fansub_group_aliases_test.go
- FOUND: shared/contracts/fansubs.yaml (modified)
- FOUND: frontend/src/types/fansub.ts (modified)
- FOUND: commit 6455d368
- FOUND: commit 2137175e
