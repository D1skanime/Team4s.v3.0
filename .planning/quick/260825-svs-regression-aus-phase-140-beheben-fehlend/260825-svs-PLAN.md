---
phase: 260825-svs-regression-aus-phase-140-beheben-fehlend
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "UserGroupRightsTab.test.tsx renders every group section (which mounts ReviewDelegationSection) without throwing 'No getReviewDelegations export is defined on the @/lib/api mock'"
    - "All six existing UserGroupRightsTab tests still pass with byte-identical assertions"
    - "No production code file is modified"
  artifacts:
    - path: "frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx"
      provides: "Complete @/lib/api mock including getReviewDelegations and mutateReviewDelegation"
      contains: "mockGetReviewDelegations"
  key_links:
    - from: "frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx"
      to: "frontend/src/app/admin/users/tabs/ReviewDelegationSection.tsx"
      via: "vi.mock('@/lib/api', ...) factory used by the ReviewDelegationSection useEffect"
      pattern: "getReviewDelegations: \\(...args"
---

<objective>
Fix a test-mock-only regression introduced by Phase 140: `ReviewDelegationSection` (wired into every `GroupSection` rendered by `UserGroupRightsTab`) calls `getReviewDelegations`/`mutateReviewDelegation` from `@/lib/api`, but `UserGroupRightsTab.test.tsx`'s `vi.mock('@/lib/api', ...)` factory does not declare those two exports. Every test in the file that renders a group section throws "No getReviewDelegations export is defined on the @/lib/api mock".

Purpose: Restore a green test suite for `frontend/src/app/admin/users/tabs/` without touching any production code or weakening any existing assertion.
Output: Updated `UserGroupRightsTab.test.tsx` with a complete `@/lib/api` mock; `0 failures` when running vitest against the `tabs` directory.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<interfaces>
<!-- Existing mock pattern already used in UserGroupRightsTab.test.tsx (lines 13-34) -->
```typescript
const mockGetAdminUserGroupMemberships = vi.fn()
const mockGetEffectiveRights = vi.fn()
const mockListRoleCapabilities = vi.fn()
const mockListOverrideHistory = vi.fn()
const mockMutateCapabilityOverride = vi.fn()
const mockGetRoleAssignmentImpactPreview = vi.fn()
const mockUpdateFansubAppMemberRole = vi.fn()

vi.mock('@/lib/api', () => ({
  getAdminUserGroupMemberships: (...args: unknown[]) => mockGetAdminUserGroupMemberships(...args),
  getEffectiveRights: (...args: unknown[]) => mockGetEffectiveRights(...args),
  listRoleCapabilities: (...args: unknown[]) => mockListRoleCapabilities(...args),
  listOverrideHistory: (...args: unknown[]) => mockListOverrideHistory(...args),
  mutateCapabilityOverride: (...args: unknown[]) => mockMutateCapabilityOverride(...args),
  getRoleAssignmentImpactPreview: (...args: unknown[]) => mockGetRoleAssignmentImpactPreview(...args),
  updateFansubAppMemberRole: (...args: unknown[]) => mockUpdateFansubAppMemberRole(...args),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

beforeEach(() => {
  mockListOverrideHistory.mockResolvedValue([])
})
```

From `frontend/src/app/admin/users/tabs/ReviewDelegationSection.tsx` (the consumer that currently breaks the mock):
```typescript
import { getReviewDelegations, mutateReviewDelegation } from '@/lib/api'
// useEffect on mount: getReviewDelegations(fansubGroupId, appUserId)
// on switch toggle: mutateReviewDelegation(fansubGroupId, appUserId, { action_code, grant })
```

From `frontend/src/types/admin-review-delegation.ts`:
```typescript
export interface ReviewDelegationRow { action_code: string; granted: boolean; membership_active: boolean; app_user_active: boolean; has_verified_claim: boolean; eligible_for_grant: boolean }
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Complete the @/lib/api mock in UserGroupRightsTab.test.tsx</name>
  <files>frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx</files>
  <action>
Fix the incomplete `vi.mock('@/lib/api', ...)` factory so it covers the two exports `ReviewDelegationSection` needs, without touching any other line of test logic.

1. Near the top of the file, alongside the existing `const mock*` declarations (lines 13-19), add two more declarations following the identical naming convention: `const mockGetReviewDelegations = vi.fn()` and `const mockMutateReviewDelegation = vi.fn()`.
2. Inside the `vi.mock('@/lib/api', () => ({ ... }))` factory (lines 21-34), add two more entries following the identical wiring pattern used for the other seven exports: `getReviewDelegations: (...args: unknown[]) => mockGetReviewDelegations(...args),` and `mutateReviewDelegation: (...args: unknown[]) => mockMutateReviewDelegation(...args),`. Placement within the object literal does not matter functionally; add them adjacent to the other data-fetch exports (e.g., right after `getAdminUserGroupMemberships`) for readability.
3. In the existing `beforeEach` block (currently only `mockListOverrideHistory.mockResolvedValue([])` at line 41), add `mockGetReviewDelegations.mockResolvedValue([])` as a second default. An empty array is the correct default: `ReviewDelegationSection` renders the three fixed `ACTIONS` rows in a disabled/no-row state (`row` undefined -> `disabled=true`, no ineligible-note text) when it resolves to `[]`, which does not add or remove any text node the existing six tests assert on.
4. Do NOT set a default `mockMutateReviewDelegation.mockResolvedValue(...)` — none of the six existing tests click a `ReviewDelegationSection` switch, so it stays an uncalled `vi.fn()`, matching current behavior for the other unused-by-default mocks like `mockMutateCapabilityOverride`.
5. Do NOT modify any `it(...)` test body, any `makeMembership`/`makeMembershipsResponse`/`makeState`/`makeMatrix` helper, any existing assertion, or any other file. This is strictly an additive fix to the mock factory and its `beforeEach` default.
6. Verify no other test file in this directory needs the same fix (already confirmed during planning via grep: only `UserGroupRightsTab.test.tsx` mocks `@/lib/api` while rendering a component tree that includes `GroupSection`/`ReviewDelegationSection` — `CapabilityHistoryPanel.test.tsx`, `GuidedGrantFlow.test.tsx`, `GuidedRevokeFlow.test.tsx`, `RoleAssignmentImpactModal.test.tsx`, `UserClaimsTab.test.tsx`, `UserContributionsTab.test.tsx`, `UserGlobalRolesTab.test.tsx`, and `UserMediaTab.test.tsx` mock `@/lib/api` but never render `GroupSection`; `ReviewDelegationSection.test.tsx` already has its own complete, correct mock). If this grep re-check surfaces a different result during execution (a second affected file), apply the identical fix pattern to that file too and add it to `files_modified` in the SUMMARY.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/users/tabs --reporter=basic"</automated>
  </verify>
  <done>All tests under frontend/src/app/admin/users/tabs/ pass (0 failures), including all six existing UserGroupRightsTab describe blocks with unchanged assertions, and no file outside test files was modified.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| N/A | Test-file-only change; no runtime trust boundary crossed, no production code path affected. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260825svs-01 | N/A | UserGroupRightsTab.test.tsx | accept | Test-mock-only fix; no new dependency, no new input surface, no production code touched. |
</threat_model>

<verification>
Run `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/users/tabs --reporter=basic"` and confirm 0 failures across the entire directory (not just UserGroupRightsTab.test.tsx), since a sibling file could theoretically need the same fix. Confirm via `git diff` that only test file(s) were touched — no changes under `frontend/src/app/admin/users/tabs/ReviewDelegationSection.tsx`, `GroupSection.tsx`, or `UserGroupRightsTab.tsx`.
</verification>

<success_criteria>
- `getReviewDelegations` and `mutateReviewDelegation` are present and correctly wired in `UserGroupRightsTab.test.tsx`'s `@/lib/api` mock
- All six pre-existing `UserGroupRightsTab` tests pass with their original assertions untouched
- `npx vitest run src/app/admin/users/tabs` reports 0 failures
- No production file was modified
</success_criteria>

<output>
Create `.planning/quick/260825-svs-regression-aus-phase-140-beheben-fehlend/260825-svs-SUMMARY.md` when done
</output>
