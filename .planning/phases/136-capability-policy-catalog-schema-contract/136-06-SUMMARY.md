---
phase: 136-capability-policy-catalog-schema-contract
plan: 06
subsystem: authorization-ui
tags: [postgres, role-catalog, react, archive, karaoke-fx]
requires:
  - phase: 136-02
    provides: canonical role_definitions policy catalog
  - phase: 136-03
    provides: public role contract and catalog adapter
  - phase: 136-11
    provides: root RoleCatalogProvider with scoped contexts
provides:
  - catalog-context validation for historical group roles and claim activation
  - catalog-driven historical picker and archive role filter
  - catalog labels with neutral unknown-role fallback in archive member cards
affects: [136-07, 136-08, phase-137, archive, member-claims]
tech-stack:
  added: []
  patterns: [parameterized role context lookup, scoped catalog consumption, neutral unknown fallback]
key-files:
  created: [frontend/src/app/archiv/page.test.tsx, frontend/src/components/archive/MemberSearchCard.test.tsx]
  modified: [backend/internal/repository/hist_group_member_roles_repository.go, backend/internal/repository/member_claims_role_activation_repository.go, frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx, frontend/src/app/archiv/page.tsx, frontend/src/components/archive/MemberSearchCard.tsx]
key-decisions:
  - "Historical writes accept only role_definitions rows declaring group_history; karaoke_fx therefore follows seeded contexts instead of a special case."
  - "Archive filters merge the public anime_contribution and group_history catalogs while unknown persisted codes use the neutral readable adapter fallback."
patterns-established:
  - "Role acceptance is a parameterized role_definitions context query, never a Go slice or switch."
  - "Catalog failure leaves scoped selectors empty and visible rather than restoring static choices."
requirements-completed: [CAP-11, CAP-13, QUAL-01]
duration: 22min
completed: 2026-08-20
---

# Phase 136 Plan 06: Historical and Archive Role Catalog Summary

**Historical writes, archive filters, and archive role chips now derive role acceptance, labels, and ordering from the canonical context catalog with neutral future-role fallback.**

## Performance

- **Duration:** 22 min
- **Completed:** 2026-08-20T18:08:41Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Removed the backend historical role whitelist and validated writes through the parameterized `role_definitions.contexts` seam.
- Replaced historical-picker and archive-filter role lists with scoped catalog rows, including catalog-controlled `karaoke_fx` visibility.
- Replaced archive chip labels with the shared catalog adapter while keeping unknown persisted codes readable and neutral.

## Task Commits

1. **Task 1 RED: require catalog-backed historical validation** — `56df8f3b`
2. **Task 1 GREEN: validate historical and claim roles from catalog** — `b983b8f1`
3. **Task 2 RED: require catalog-backed archive roles** — `771ffdc6`
4. **Task 2 GREEN: drive archive roles from catalog** — `3efb64c2`

## Files Created/Modified

- `backend/internal/repository/hist_group_member_roles_repository.go` — context-only historical catalog listing and validation.
- `backend/internal/repository/member_claims_role_activation_repository.go` — assignable `fansub_group` catalog guard for claimed roles.
- `backend/internal/repository/hist_group_member_roles_whitelist_test.go` — source-contract regression against static authorities.
- `backend/internal/repository/role_definitions_context_test.go` — seeded `karaoke_fx` context and generic query coverage.
- `backend/internal/repository/member_claims_repository_claim_activation_test.go` — claim activation catalog regression.
- `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx` — provider-backed historical picker with neutral persisted-code fallback.
- `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx` — context, ordering, error, karaoke, and unknown-code tests.
- `frontend/src/app/archiv/page.tsx` — public context-catalog archive filter.
- `frontend/src/app/archiv/page.test.tsx` — catalog success and failure coverage.
- `frontend/src/components/archive/MemberSearchCard.tsx` — shared catalog label adapter consumer.
- `frontend/src/components/archive/MemberSearchCard.test.tsx` — karaoke and future-role label coverage.

## Decisions Made

- `group_history` remains the sole historical-write context. `karaoke_fx` is accepted on fansub/contribution surfaces because its seed declares those contexts, but it is not silently broadened into group history.
- Public archive filters merge only `anime_contribution` and `group_history`; no admin catalog or protected bearer path is introduced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed the hidden whitelist authority from member-claim activation**
- **Found during:** Task 1
- **Issue:** `member_claims_role_activation_repository.go` called the removed `IsGroupHistoryWhitelistRole`, so removing the whitelist would break compilation and retain a second static authority.
- **Fix:** Joined `role_definitions`, required the `fansub_group` context and `assignable`, and added focused regression coverage.
- **Files modified:** `backend/internal/repository/member_claims_role_activation_repository.go`, `backend/internal/repository/member_claims_repository_claim_activation_test.go`
- **Verification:** Focused repository tests pass.
- **Committed in:** `b983b8f1`

**2. [Rule 3 - Blocking] Corrected the planned Vitest filter syntax**
- **Found during:** Task 2
- **Issue:** Vitest treats the plan's quoted pipe expression as a literal file filter and reports no tests.
- **Fix:** Ran the three exact repository-relative test paths.
- **Verification:** 3 files and 7 tests pass.

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both changes were necessary to remove the static authority completely and execute the intended verification; no legacy route or unrelated UI was touched.

## Issues Encountered

- The working tree contains pre-existing user changes and deleted temporary evidence files. They were preserved and excluded from every commit.

## Verification

- Backend repository tests: passed.
- Frontend focused Vitest suite: 7/7 passed.
- Frontend TypeScript typecheck: passed.
- Frontend ESLint (`--quiet`): passed.
- `git diff --check`: passed.

## Known Stubs

None. Existing semantic form placeholders and the established fallback avatar are not implementation stubs.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Historical and archive consumers no longer need local role knowledge.
- Badge/points and remaining cross-surface evidence can consume the same catalog contract.

## Self-Check: PASSED

- All created files exist.
- All four task commits exist.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
