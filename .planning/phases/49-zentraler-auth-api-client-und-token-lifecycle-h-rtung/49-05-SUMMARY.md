---
phase: 49-zentraler-auth-api-client-und-token-lifecycle-h-rtung
plan: "05"
subsystem: frontend-auth-api-client
status: complete
tags:
  - auth
  - api-client
  - helper-contract
  - upload-auth
dependency_graph:
  requires:
    - 49-02
    - 49-03
    - AUTH-API-CLIENT-01
  provides:
    - token-free admin anime intake helper path
    - central-only upload bearer attachment for existing XHR helpers
    - focused helper/upload regression coverage
  affects:
    - frontend/src/lib/api.ts
    - frontend/src/lib/api/admin-anime-intake.ts
    - 49-06
    - 49-08
tech_stack:
  added: []
  patterns:
    - apiClientFetch-owned helper requests
    - deprecated positional token compatibility ignored by helper modules
    - unsafe upload no-replay behavior
key_files:
  created:
    - .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-05-SUMMARY.md
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/lib/api/admin-anime-intake.ts
    - frontend/src/lib/api.auth-refresh.test.ts
    - frontend/src/lib/api.admin-anime.test.ts
key_decisions:
  - Admin anime intake helpers ignore deprecated positional token arguments and route through apiClientFetch without authToken options.
  - Existing upload helper option shapes stay caller-compatible, but authorizedUploadXhr resolves bearer state centrally and ignores page-owned upload authToken values.
  - Unsafe upload endpoints retain retryEligibility 'never' and still surface the re-auth upload error instead of replaying FormData.
requirements-completed:
  - AUTH-API-CLIENT-01
metrics:
  duration: 6 min
  completed: 2026-05-20
---

# Phase 49 Plan 05: Helper/API Contract Migration Summary

Admin anime intake helpers now use the central API client without token forwarding, and XHR uploads ignore legacy page-owned upload tokens while preserving unsafe no-replay behavior.

## Performance

- **Duration:** 6 min implementation window after context/scope gate
- **Started:** 2026-05-20T15:14:56Z
- **Completed:** 2026-05-20T15:20:21Z
- **Tasks:** 3
- **Files modified:** 4 source/test files plus this summary

## Outcome

Status: COMPLETE

Plan 49-05 stayed inside the four listed source/test files. No pages, components, hooks, streaming routes, backend code, database schema, or media ownership files were edited.

## Tasks Completed

| Task | Result | Commit | Files |
|---|---|---|---|
| Task 1: Enforce helper/API split scope before edits | PASS | `4dfe2f4b` | scoped to four listed files |
| Task 2: Remove normal browser authToken helper signatures where safe | PASS | `4dfe2f4b` | `api/admin-anime-intake.ts`, tests |
| Task 3: Preserve unsafe upload no-replay behavior in helper tests | PASS | `4dfe2f4b` | `api.ts`, auth refresh test |

## Files Changed

- `frontend/src/lib/api/admin-anime-intake.ts` - Removed local cookie/header helper path from the committed diff baseline and routed intake calls through `apiClientFetch`; remaining deprecated positional token arguments are ignored for caller compatibility until 49-08 removes the caller-side threading.
- `frontend/src/lib/api.ts` - Removed `authToken` from the internal `authorizedUploadXhr` contract and stopped forwarding public upload option tokens into central bearer resolution.
- `frontend/src/lib/api.auth-refresh.test.ts` - Locks that unsafe upload 401 handling does not replay even when a stale page-owned upload token is supplied.
- `frontend/src/lib/api.admin-anime.test.ts` - Exercises create/search intake helpers without token arguments.

## Decisions Made

- Deprecated token arguments in `admin-anime-intake.ts` remain as ignored compatibility parameters so later caller plans can remove page/component token threading without breaking this helper slice.
- Upload helper option objects still accept their existing `authToken` field for now, but central upload auth no longer consumes it. This avoids touching page/component callers assigned to 49-06 through 49-09.
- The upload retry policy remains conservative: all current XHR upload helper calls use `retryEligibility: 'never'`.

## Deviations from Plan

None - plan executed within the split scope.

## Known Stubs

None found in files created or modified for this plan.

## Threat Flags

None. This plan changed frontend helper/auth routing only and introduced no new endpoint, file access path, schema change, backend permission behavior, streaming behavior, release media ownership path, or group media ownership path.

## Verification

Automated checks run:

- `cd frontend && npm run test -- api.auth-refresh.test.ts api.admin-anime.test.ts` - PASS
- `cd frontend && npm run typecheck` - PASS
- `cd frontend && npx eslint src/lib/api.ts src/lib/api/admin-anime-intake.ts src/lib/api.auth-refresh.test.ts src/lib/api.admin-anime.test.ts` - PASS
- `git diff --check -- frontend/src/lib/api.ts frontend/src/lib/api/admin-anime-intake.ts frontend/src/lib/api.auth-refresh.test.ts frontend/src/lib/api.admin-anime.test.ts` - PASS
- Static scope checks confirmed no `authToken`, direct `fetch`, local cookie helper, or local auth header helper remains in `frontend/src/lib/api/admin-anime-intake.ts`.
- Static upload check confirmed no `authToken: options.authToken` or `resolveAuthToken(options.authToken)` forwarding remains in `authorizedUploadXhr` call paths.

## Residual Risks

- `frontend/src/lib/api.ts` still contains many legacy `authToken?: string` helper parameters and direct `withAuthHeader(..., authToken)` paths outside this helper/upload slice. They are owned by later split plans, not 49-05.
- `frontend/src/lib/api/admin-anime-intake.ts` already had uncommitted earlier auth cleanup before this plan; the implementation commit includes that same-file baseline plus this plan's token-forwarding cleanup.
- `.planning/STATE.md` and `.planning/ROADMAP.md` were already stale/dirty before this plan, so this execution did not mutate them to avoid mixing unrelated tracking drift into the narrow helper slice.

## Commits

- `4dfe2f4b` - `feat(49-05): migrate auth api helper contract`

## Self-Check: PASSED

- Found `frontend/src/lib/api.ts`.
- Found `frontend/src/lib/api/admin-anime-intake.ts`.
- Found `frontend/src/lib/api.auth-refresh.test.ts`.
- Found `frontend/src/lib/api.admin-anime.test.ts`.
- Found `49-05-SUMMARY.md`.
- Found implementation commit `4dfe2f4b`.
- Scoped tests, typecheck, targeted lint, and diff whitespace checks passed.
