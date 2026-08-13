---
phase: 108-bestehende-beitragsquellen-anbinden
plan: "05"
subsystem: frontend-contract
tags: [openapi, react, auth-refresh, release-crew, tdd]

requires:
  - phase: 108-03
    provides: Atomic complete-set release crew service and protected PUT route
  - phase: 108-04
    provides: Transactional project-note mutation lifecycle
provides:
  - Canonical complete-set release crew contract across backend, YAML, DTO, and client
  - Central-auth refresh-safe protected crew, note, leader-confirm, and member-confirm mutations
  - Existing release contribution drawer backed by one atomic complete-set PUT
affects: [108-06, release-contribution-drawer, protected-browser-auth]

tech-stack:
  added: []
  patterns:
    - Complete-set browser mutation through apiClientFetch
    - Stored inherited or independent snapshot status rendered in the existing drawer

key-files:
  created:
    - frontend/src/lib/api.phase108.test.ts
  modified:
    - shared/contracts/openapi.yaml
    - shared/contracts/admin-content.yaml
    - frontend/src/types/fansub.ts
    - frontend/src/lib/api.ts
    - frontend/src/lib/api.auth-refresh.test.ts
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.test.tsx
    - backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go
    - backend/internal/handlers/admin_content_fansub_releases_contributions_handlers_test.go

key-decisions:
  - "Release crew saves always submit the full normalized member-role set, including a valid empty set."
  - "Protected browser mutations accept a refresh-only session and delegate token refresh to apiClientFetch."
  - "The replace response reuses the effective contribution row DTO and exposes only snapshot_mode metadata."

requirements-completed: [GAM-01, GAM-02, GAM-04, GAM-05]

duration: 12 min
completed: 2026-07-24
---

# Phase 108 Plan 05: Complete-Set Client and Drawer Summary

**The existing release contribution drawer now persists one full stored crew through a typed atomic PUT, with explicit inheritance status and central refresh-session continuity**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-24T15:35:47Z
- **Completed:** 2026-07-24T15:47:47Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Published the protected GET/PUT release crew path and strict allowlisted request/response schemas in both shared contracts.
- Added typed frontend request/response DTOs and one `replaceReleaseCrew` helper using `apiClientFetch`, `parseApiErrorPayload`, and `ApiError`.
- Proved missing-access-token plus valid-refresh-token behavior for crew replacement, project-note save, leader confirmation, and member self-confirmation.
- Replaced the drawer's row-level delete/upsert fan-out with one deterministic complete-set request.
- Rendered inherited versus permanently independent state, including an empty independent snapshot without project fallback or reset action.
- Preserved the exact Gon/Mia/Anton correction: Anton/Edit stays, Mia/QC leaves, and Gon receives QC alongside translation.

## Task Commits

1. **Task 1 RED: Complete-set client contract** - `08802eee`
2. **Task 1 GREEN: Typed contract and central-auth helper** - `d82eca7e`
3. **Task 2 RED: Atomic drawer replacement contract** - `fe081661`
4. **Task 2 GREEN: Single-request complete-set drawer** - `5db53d43`

## Decisions Made

- Complete-set saves run even when the resulting set is empty; the backend marks that snapshot independent.
- Drawer state uses only `snapshot_mode: inherited|independent`; legacy source/is-override fallback metadata is no longer part of the client contract.
- Leader/member confirmation and project-note mutation helpers use the same central browser auth client as crew replacement and expose no token parameters.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Normalized the backend replace response to the documented DTO**
- **Found during:** Task 1 contract alignment
- **Issue:** The PUT handler returned `repository.ReleaseCrewRow` directly, which serializes Go field names rather than the documented snake_case effective contribution fields.
- **Fix:** Mapped stored crew rows to the existing `EffectiveContributionRow` response DTO and added an exact JSON regression test.
- **Files modified:** `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go`, `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers_test.go`
- **Verification:** Focused backend handler tests and frontend response parsing tests pass.
- **Commit:** `d82eca7e`

---

**Total deviations:** 1 auto-fixed bug.
**Impact:** Required for the browser, backend, YAML contracts, and TypeScript DTO to agree; no new API route or domain seam was introduced.

## Issues Encountered

- No local YAML parser package or Ruby runtime was available for an additional parse-only command. Contract structure is covered by focused declarations, TypeScript tests, and diff review.

## Known Stubs

None.

## Threat Review

- The browser request contains only `member_id` and `role_codes`; actor, reviewer, beneficiary, points, rule version, idempotency, status, effective time, and ledger generation remain server-owned.
- Crew, note, leader-confirm, and member-confirm mutations use the central auth-refresh seam with no component-level bearer, cookie, storage, or Keycloak access.
- The user-visible edit route gates on `hasAccessToken || hasRefreshToken`.
- No media ownership, schema, upload, public route, or direct ledger surface was introduced.

## Verification

- `cd frontend && npm test -- ReleaseContributionDrawer api.phase108 api.auth-refresh` - 31/31 passed.
- `cd frontend && npm run typecheck` - passed.
- `cd frontend && npm run lint` - passed.
- `cd backend && go test ./internal/handlers -run 'ReleaseCrewReplace|EffectiveContributions' -count=1` - passed.
- Contract/DTO/helper declaration scan - passed.
- Forbidden row-mutation/reset-action scan - no matches.
- Auth-boundary scan in the new helper test and drawer - no matches.
- Active-session gate scan - `hasAccessToken || hasRefreshToken` present in the edit client and access gate.
- `git diff --check` - passed.

## Self-Check: PASSED

- All key files exist.
- Commits `08802eee`, `d82eca7e`, `fe081661`, and `5db53d43` exist.
- All task acceptance criteria and plan-level verification commands pass.

## Next Phase Readiness

The typed browser integration is ready for Phase 108 Plan 06 generic mutation hardening and production wiring checks. No blockers remain.

---
*Phase: 108-bestehende-beitragsquellen-anbinden*
*Completed: 2026-07-24*
