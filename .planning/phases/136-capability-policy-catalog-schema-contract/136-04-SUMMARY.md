---
phase: 136-capability-policy-catalog-schema-contract
plan: 04
subsystem: frontend-role-catalog
tags: [roles, catalog, members, auth]
requires: [136-02, 136-03, 136-11]
provides: [catalog-driven-member-role-selector, neutral-role-presentation]
affects: [138-effective-rights-administration, 139-user-admin-projections]
tech-stack:
  added: []
  patterns: [server-catalog-adapter, fail-closed-selector, progressive-disclosure]
key-files:
  modified:
    - frontend/src/lib/profileLabels.ts
    - frontend/src/lib/roleColors.ts
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.test.tsx
decisions:
  - Member role choices fail closed when the protected scoped catalog is unavailable.
  - Zero-right information stays contextual and appears only for a selected zero-right role.
metrics:
  tasks: 2
  completed: 2026-08-20
---

# Phase 136 Plan 04: Catalog-driven member roles Summary

The canonical fansub member editor now receives assignable roles and presentation metadata solely from the protected group-scoped catalog, including automatic `karaoke_fx` support and a compact zero-right notice.

## Tasks Completed

1. Shared group-role label and color helpers now delegate to `roleCatalog`; the separate Keycloak platform-role labels remain explicit.
2. The member add/editor surface filters server rows by context and `assignable`, preserves catalog order, removes the static fallback and exposes a local German error plus contextual zero-right status.

## Commits

- `15ac1f3d` — `refactor(136-04): use catalog role presentation helpers`
- `bff0cec6` — `feat(136-04): drive member roles from scoped catalog`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Catalog ownership lived in the parent member section**
- **Found during:** Task 2
- **Issue:** `FansubAppMemberEditorPanel` is rendered by `FansubAppMembersSection`, not `GroupMembersTab`; changing only the files stated in the plan could not deliver catalog rows to the active-member editor.
- **Fix:** Updated the existing parent-owned protected catalog load and passed its exact filtered definitions into the editor. No second request/catalog was added.
- **Files modified:** `FansubAppMembersSection.tsx`
- **Commit:** `bff0cec6`

## Verification

- PASS: `vitest --run FansubAppMemberEditorPanel.test.tsx` (4/4)
- PASS: the production auth-boundary assertions in `api.no-token-boundary.test.ts` (8/8 relevant assertions)
- PASS: `git diff --check`
- BLOCKED by concurrent Phase-136 work: full typecheck currently reports unresolved contribution-role exports/signatures in files outside this plan.
- PRE-EXISTING test-fixture failure: the no-token suite's docs allowlist expects a removed `docs/api/openapi.json`; production boundary scans pass.

## Known Stubs

None.

## Self-Check: PASSED

All modified files and both task commits exist. The plan goal is implemented; unrelated concurrent typecheck failures are not in the 136-04 ownership set.
