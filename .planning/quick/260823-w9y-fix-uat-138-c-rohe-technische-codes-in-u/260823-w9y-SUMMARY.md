---
phase: quick-w9y
plan: 01
subsystem: ui
tags: [react, nextjs, go, gin, postgres, admin, i18n]

requires:
  - phase: 138-effective-rights-administration-impact-ux
    provides: RoleCapabilityMatrix (getEffectiveRights/listRoleCapabilities), EffectiveRightState, translateChangeEntry, GET /admin/changes
provides:
  - "roleLabelFor/actionLabelFor-based German-label mapping in decisiveSourceLabel, CapabilityDetailRow, GroupRolesSection, GuidedRevokeFlow, and ChangeEntryTranslator"
  - "actor_display_name/target_display_name additive fields on GET /admin/changes (Go DTO -> OpenAPI -> TS -> UI)"
affects: [139-scalable-user-admin-projections]

tech-stack:
  added: []
  patterns:
    - "roleLabelFor/actionLabelFor remain the single shared label-lookup source against RoleCapabilityMatrix; never invent a second label table"
    - "Optional matrix parameter defaulting to null preserves backward compatibility for existing one-argument callers (translateChangeEntry)"
    - "Additive nullable LEFT JOIN fields on an existing list-row DTO, honest NULL fallback when no match exists"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/users/tabs/userGroupRightsHelpers.ts
    - frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx
    - frontend/src/app/admin/users/tabs/CategoryTable.tsx
    - frontend/src/app/admin/users/tabs/GroupSection.tsx
    - frontend/src/app/admin/users/tabs/GroupRolesSection.tsx
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx
    - frontend/src/app/admin/users/tabs/GuidedRevokeFlow.tsx
    - frontend/src/app/admin/changes/ChangeEntryTranslator.ts
    - frontend/src/app/admin/changes/ChangeEntryTranslator.test.ts
    - frontend/src/app/admin/changes/ChangesClient.tsx
    - shared/contracts/admin-capabilities.yaml
    - backend/internal/repository/audit_logs_query.go
    - backend/internal/repository/audit_logs_query_test.go
    - frontend/src/types/admin-users.ts

key-decisions:
  - "decisiveSourceLabel's group_role case and every granting_roles render site (CapabilityDetailRow, GroupRolesSection, GuidedRevokeFlow) map through the existing roleLabelFor -- no second label table introduced anywhere."
  - "actionLabelFor mirrors roleLabelFor's exact fallback pattern and is reused by ChangeEntryTranslator's role_capability.granted/revoked and effective_rights.override.mutated cases."
  - "translateChangeEntry's new matrix parameter defaults to null, keeping GroupChangesTab.tsx's existing one-argument call compiling and behaviorally unchanged."
  - "target_user LEFT JOIN condition in audit_logs_query.go hardcodes the same four target_types as ChangesClient.tsx's USER_TARGET_TYPES set, with an in-code comment cross-referencing it to prevent drift."

requirements-completed: []

duration: 15min
completed: 2026-08-23
---

# Quick Task 260823-w9y: Fix UAT-138-C rohe technische Codes in UI Summary

**Wired existing RoleCapabilityMatrix/app_users.display_name label lookups into 5 previously raw-code render sites across the user-in-group rights editor, guided revoke dialog, and Aenderungen sentence translator, plus an additive actor/target display-name contract extension for GET /admin/changes.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-23T23:24:00Z
- **Completed:** 2026-08-23T23:39:00Z
- **Tasks:** 4
- **Files modified:** 14

## Accomplishments
- Role codes (e.g. `co_leader`) no longer render as raw text anywhere in the User-in-Group rights editor's Rollenquellen, Quelle column, guided revoke dialog, or role chip -- all map through `roleLabelFor`/`RoleCapabilityMatrix`.
- Translated Aenderungen sentences (`role_capability.granted/revoked`, `effective_rights.override.mutated`) now show German role/capability labels via a new shared `actionLabelFor` helper, with an honest raw-code fallback when the matrix is unavailable or a code is unknown.
- `GET /admin/changes` additively returns `actor_display_name`/`target_display_name` resolved from `app_users.display_name` via two LEFT JOINs, closing the "Benutzer #<id>" gap end-to-end (Go DTO -> OpenAPI -> TS -> UI) while preserving the existing `#<id>` fallback when no name resolves.

## Task Commits

Each task was committed atomically:

1. **Task 1: Role-code label mapping in the User-in-Group rights editor** - `964e7fbb` (fix)
2. **Task 2: Role-code label mapping in the guided revoke dialog** - `5e7905d2` (fix)
3. **Task 3: Role/capability label mapping in the translated Änderungen sentences** - `a25c9c25` (fix)
4. **Task 4: Additive actor_display_name/target_display_name contract chain** - `66164839` (feat)

**Plan metadata:** (docs commit handled separately by orchestrator)

## Files Created/Modified
- `frontend/src/app/admin/users/tabs/userGroupRightsHelpers.ts` - `decisiveSourceLabel` gained a `matrix` param mapping `group_role` granting_roles via `roleLabelFor`; new `actionLabelFor` helper added
- `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx` - `matrix` prop threaded; Rollenquellen line maps through `roleLabelFor`
- `frontend/src/app/admin/users/tabs/CategoryTable.tsx` - `matrix` prop threaded to `CapabilityDetailRow` and `decisiveSourceLabel`
- `frontend/src/app/admin/users/tabs/GroupSection.tsx` - forwards already-received `matrix` prop to `CategoryTable`
- `frontend/src/app/admin/users/tabs/GroupRolesSection.tsx` - role chip Badge now renders `roleLabelFor(role, matrix)`
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx` - assertion updated from raw `co_leader` to mapped `Co-Leitung`
- `frontend/src/app/admin/users/tabs/GuidedRevokeFlow.tsx` - both granting-role render sites (non-deniable paragraph, sources-step list) map through `roleLabelFor`
- `frontend/src/app/admin/changes/ChangeEntryTranslator.ts` - `translateChangeEntry` gains optional `matrix` param (default `null`); `role_capability.*`/`effective_rights.override.mutated` cases map role/action codes
- `frontend/src/app/admin/changes/ChangeEntryTranslator.test.ts` - 2 new tests proving matrix-fed label mapping and honest unknown-code fallback
- `frontend/src/app/admin/changes/ChangesClient.tsx` - loads `RoleCapabilityMatrix` once (fail-open), threads it into `ChangeEntryCard`/`translateEntry`; actor/target buttons use `actor_display_name`/`target_display_name` with existing `#<id>` fallback
- `shared/contracts/admin-capabilities.yaml` - `ChangeListRow` schema gains nullable `actor_display_name`/`target_display_name`
- `backend/internal/repository/audit_logs_query.go` - `ChangeListRow` gains `ActorDisplayName`/`TargetDisplayName`; `ListChanges` SQL gains two LEFT JOINs against `app_users`
- `backend/internal/repository/audit_logs_query_test.go` - seed extended with `display_name`; new subtest proves honest NULL propagation across 3 seeded rows
- `frontend/src/types/admin-users.ts` - `AdminChangeEntry` gains `actor_display_name`/`target_display_name` (string | null)

## Decisions Made
- No new label table was introduced anywhere; `roleLabelFor`/`actionLabelFor` remain the single shared lookup against the already-loaded `RoleCapabilityMatrix`.
- `translateChangeEntry`'s new `matrix` parameter defaults to `null` so `GroupChangesTab.tsx`'s existing one-argument call site keeps compiling and its current fallback-to-raw-code behavior is unchanged (out of this plan's file scope, verified untouched).
- The backend's `target_user` LEFT JOIN condition hardcodes the identical four `target_type` values as the frontend's `USER_TARGET_TYPES` set, with an in-code comment cross-referencing it to prevent future drift.

## Deviations from Plan

None - plan executed exactly as written across all 4 tasks.

## Issues Encountered

None. `TestListChanges`'s new subtest (`audit_logs_query_test.go`) runs against the existing SKIP-not-FAIL `testsupport.OpenPhase137Postgres` harness (requires `TEAM4S_PHASE137_TEST_DSN`, not set in this environment) -- this is the project's established pre-existing convention (see STATE.md Phase 138 entries) and matches the plan's own literal `<verify>` command, which does not set that env var either. The SQL was verified for correctness via source inspection of the query text and Scan-order alignment.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All 4 tasks complete and independently committed; both full verification commands from the plan's `<verification>` section pass with zero new regressions beyond the 5 pre-existing known-red test files (`FansubAppMembersSection.test.tsx`, `fansubs/[id]/edit/page.test.tsx`, `useGroupMembersTab.test.ts`, `UserContributionsTab.test.tsx` -- all confirmed still exactly as red as before this plan; `ResponsiveImage.config.test.ts` is outside `src/app/admin` and not exercised by the frontend command run). Backend container rebuilt (`docker compose up -d --build team4sv30-backend`) and confirmed healthy (`/health` returns `{"status":"ok"}`) after Task 4's changes.

---
*Phase: quick-w9y*
*Completed: 2026-08-23*

## Self-Check: PASSED

All 14 modified files and this SUMMARY.md confirmed present on disk; all 4 task commit hashes (964e7fbb, 5e7905d2, a25c9c25, 66164839) confirmed present in git log.
