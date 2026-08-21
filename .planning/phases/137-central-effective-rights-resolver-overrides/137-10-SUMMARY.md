---
phase: 137-central-effective-rights-resolver-overrides
plan: 10
subsystem: api
tags: [openapi, yaml, contracts, effective-rights, gap-closure]

# Dependency graph
requires:
  - phase: 137 (plans 06/07/09)
    provides: AdminEffectiveRightsHandler GET effective-rights and GET capability-overrides/history endpoints, parseGroupAndTarget's real badRequest behavior
provides:
  - GAP-03 fix: both shared/contracts/admin-capabilities.yaml and shared/contracts/openapi.yaml now document a 400 response on GET .../effective-rights and GET .../capability-overrides/history, matching the handler's actual badRequest(400) behavior for a malformed id or appUserId path parameter
affects: [137-verification, 138-effective-rights-ux]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - shared/contracts/admin-capabilities.yaml
    - shared/contracts/openapi.yaml

key-decisions:
  - "Copied the exact 400 block shape already used for the identical malformed-path-ID case at admin-capabilities.yaml's GET .../capabilities endpoint (description + ErrorResponse $ref), adapting the description text to cover both id and appUserId since parseGroupAndTarget rejects either parameter with the same badRequest call."

requirements-completed: [CAP-01, CAP-02]

# Metrics
duration: ~10min
completed: 2026-08-21
---

# Phase 137 Plan 10: GAP-03 — 400 Response Documentation for Effective-Rights GET Endpoints Summary

**Both GET effective-rights and GET override-history endpoints now document 400 Bad Request in admin-capabilities.yaml and openapi.yaml, closing the contract/handler mismatch identified in 137-REVIEW.md (WR-03) and 137-UAT.md (GAP-03).**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-08-21T21:15:00Z
- **Completed:** 2026-08-21T21:25:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- **GAP-03 closed:** `shared/contracts/admin-capabilities.yaml` and `shared/contracts/openapi.yaml` both gained a `"400"` response block on `GET /api/v1/admin/fansubs/{id}/app-members/{appUserId}/effective-rights` and `GET /api/v1/admin/fansubs/{id}/app-members/{appUserId}/capability-overrides/history`, placed immediately after `"200"` and before `"401"` per each file's existing status-code ordering convention.
- The new blocks match `AdminEffectiveRightsHandler.parseGroupAndTarget`'s real, already-reachable `badRequest(c, ...)` behavior for a malformed `:id` or `:appUserId`, which neither `phase136_contract_parity_test.go` nor `admin_capability_contract_test.go` had previously caught (those tests compare the two YAML files and Go/TS DTOs against each other, not against actual handler status-code behavior).
- German description text (`admin-capabilities.yaml`): "Ungültige Fansubgruppen-ID oder ungültige app_user_id" — matches this file's existing wording convention (the identical-shape 400 block on `GET .../capabilities`). English description text (`openapi.yaml`): "Invalid path parameter (id or appUserId)" — matches this file's existing English phrasing convention on neighboring 401/403 blocks.
- No other endpoint, response code, path item, or schema changed in either file — confirmed via `git diff --stat` (2 files changed, 20 insertions, 0 deletions) and a full `git diff` review showing only the four new 400 blocks.

## Task Commits

1. **Task 1: Add missing 400 response blocks to both GET effective-rights endpoints in both contract files** - `c4c6cf9a` (docs)
2. **Task 2: Re-run contract parity and TypeScript checks** - verification-only, no file changes, no commit (contract parity suite and `tsc --noEmit` both confirmed green against Task 1's committed state)

## Files Created/Modified

- `shared/contracts/admin-capabilities.yaml` - added a `"400"` response entry to both GET effective-rights and GET capability-overrides/history path items, describing the malformed id/appUserId case with the shared `ErrorResponse` schema `$ref`.
- `shared/contracts/openapi.yaml` - added the equivalent `"400"` response entry (English wording) to the same two GET path items.

## Decisions Made

- Reused the existing "malformed path ID" 400 block shape verbatim (description + `$ref: "#/components/schemas/ErrorResponse"`) from `admin-capabilities.yaml`'s `GET .../capabilities` endpoint, rather than inventing new wording, since `parseGroupAndTarget` is the same category of failure (invalid positive-integer path parameter) already documented elsewhere in the same file.

## Deviations from Plan

None - plan executed exactly as written. Both tasks completed with no auto-fixes, no blocking issues, and no architectural questions.

## Issues Encountered

None. Both YAML files parsed successfully via `python3 -c "import yaml; yaml.safe_load(...)"` after editing, `git diff --check` reported no whitespace errors, and `git diff --stat`/`git diff` confirmed no changes outside the four intended 400 blocks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `docker compose exec team4sv30-backend go test ./internal/handlers -run 'TestPhase136ContractParity|Phase136|EffectiveRightState|CapabilityOverrideSchemasUnchanged' -v -count=1` passes 100% green (all subtests, including `TestPhase136ContractParity`'s six cross-file/DTO comparison subtests).
- `docker compose exec team4sv30-frontend npx tsc --noEmit` reports the same pre-existing baseline errors (unrelated Next.js App Router route-type constraint errors on `.next/dev/types/app/...` files) as before this plan, and zero new errors — confirmed via `grep -i "admin-capabilit\|EffectiveRight"` returning no matches in the tsc output.
- GAP-03 is closed. Remaining Phase 137 gap-closure plans (137-11, 137-12 covering GAP-04, GAP-05, GAP-06) proceed independently; this plan touched only the two contract files and made no code changes that affect them.

---
*Phase: 137-central-effective-rights-resolver-overrides*
*Completed: 2026-08-21*

## Self-Check: PASSED

Both modified files (shared/contracts/admin-capabilities.yaml, shared/contracts/openapi.yaml) confirmed present on disk with the expected 400 blocks; commit hash c4c6cf9a confirmed present in `git log --oneline --all`.
