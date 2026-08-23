---
phase: 138-effective-rights-administration-impact-ux
plan: 13
subsystem: ui
tags: [react, nextjs, capability-matrix, impact-preview, admin]

# Dependency graph
requires:
  - phase: 138-effective-rights-administration-impact-ux
    provides: "Plan 138-07's PreviewGroupRightsCapabilityChange batch impact-preview endpoint (GET /admin/role-capabilities/:roleCode/:actionCode/impact-preview); Plan 138-02's honest RoleCapabilityMutationResult.cache_reload_succeeded + ActivationStatusIndicator; Plan 138-01's ListRoleHolders/listRoleHolders for display-name/group joins"
provides:
  - "getRoleCapabilityImpactPreview(roleCode, actionCode, add) in frontend/src/lib/api.ts"
  - "RoleCapabilityImpactPreviewModal.tsx: the mandatory preview-before-mutation gate for every role-to-capability toggle in the Capabilities split-view"
  - "7-category CATEGORY_LABEL_MAP / CATEGORY_ORDER covering all real action_definitions categories (gruppe/gruppenmedien/gruppenseite/projekt/rechteverwaltung/release/review)"
affects: [139, future-capability-ux-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Impact-preview-before-mutation modal gate (D-18/D-20): fetch preview + holder list in parallel on open, block confirm until both resolve, compute pure display arithmetic over already-resolved EffectiveRightState fields (no new precedence logic, D-14), only THEN call the real grant/revoke mutation."
    - "Index-zip join between a batch impact-preview response (target_user_id only, no group id in the wire DTO) and the exact same-order role-holder list the backend iterated -- avoids a redundant backend join for a multi-group-membership user."
    - "Modal stays open after a confirmed mutation, swapping its body to ActivationStatusIndicator instead of auto-closing (D-21) -- CAP-10 honesty extends past the mutation call itself."

key-files:
  created:
    - frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.test.tsx
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/role-capabilities/capabilityCategories.ts
    - frontend/src/app/admin/role-capabilities/capabilityCategories.test.ts
    - frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.test.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx

key-decisions:
  - "RoleCapabilityImpactPreviewModal fetches getRoleCapabilityImpactPreview + listRoleHolders itself (not passed in as a prop) since RoleCapabilityClient.tsx, unlike RolesClient.tsx (Plan 138-12), does not already hold a loaded RoleHolderEntry[] -- matches the plan's literal Task 2 action text over the interfaces block's prop-passing suggestion."
  - "Preview items are joined to role holders by array INDEX, not a target_user_id map, because the backend's wire DTO carries no group id and a user holding the role in multiple groups produces multiple same-target_user_id items in the same order listRoleHolders returned them; a map would silently collapse or misassign multi-group rows."
  - "RoleCapabilityClient.tsx's handleGrant/handleRevoke/capabilityError/isMutating were removed entirely rather than left as dead code -- all capability mutation now lives inside the modal; inlineError is still accepted by RoleCapabilityDetail.tsx's props for interface stability but the parent now always passes null."

patterns-established:
  - "Impact-preview-before-mutation modal gate (see tech-stack.patterns)"

requirements-completed: [CAP-09, CAP-10]

# Metrics
duration: 42min
completed: 2026-08-23
---

# Phase 138 Plan 13: Capability Impact Preview + 7-Category Fix Summary

**Every role-to-capability Switch toggle in the Capabilities split-view now opens a resolver-backed Impact Preview modal (real holder counts, sorted detail table, honest CAP-10 activation status) before any mutation is sent, closing the direct-mutate D-18 violation found this session.**

## Performance

- **Duration:** 42 min
- **Started:** 2026-08-23T18:05:00Z (approx.)
- **Completed:** 2026-08-23T18:47:49Z
- **Tasks:** 2 (Task 2 is TDD: RED + GREEN)
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments

- Added `getRoleCapabilityImpactPreview(roleCode, actionCode, add)` to `frontend/src/lib/api.ts`, consuming Plan 138-07's backend batch impact-preview endpoint.
- Fixed the capability-category label map/order to cover all 7 real `action_definitions.category` values (`gruppe`, `gruppenmedien`, `gruppenseite`, `projekt`, `rechteverwaltung`, `release`, `review`) instead of the stale 3-category set that let 4 real categories fall through to the `capitalizeFirst` fallback (138-RESEARCH.md Pitfall 2).
- Built `RoleCapabilityImpactPreviewModal.tsx`: fetches the impact preview + role-holder list in parallel, computes the five locked D-19 header counts (Rolleninhaber / verlieren / gewinnen / behalten-über-Rolle / behalten-über-Abweichung) and a sorted (loss-first), paginated (page size 25) `Benutzer | Gruppe | vorher | nachher | Grund` detail table as pure display arithmetic over already-resolved `EffectiveRightState` fields — never a second precedence engine.
- Replaced `RoleCapabilityDetail.tsx`'s direct `onGrant`/`onRevoke` Switch wiring with `onRequestChange(actionCode, add)`, which only opens the preview modal; the Switch's `checked` state is never optimistically flipped (T-138-24) and only reflects the last successfully refreshed matrix.
- `RoleCapabilityClient.tsx` now owns the modal's open/selected-action state, mounts it only while a change is pending, and refreshes the matrix via the existing `loadData(false)` once the modal reports a successful mutation — the modal itself stays open afterward, rendering `ActivationStatusIndicator` in place (D-21) instead of auto-closing.
- Corrected the page-level stale hint copy ("...nach dem Cache-Reload... typisch innerhalb weniger Sekunden") to the real synchronous-reload finding: "Änderungen werden nach Bestätigung sofort im Rechte-Cache aktualisiert."

## Task Commits

Each task was committed atomically:

1. **Task 1: api.ts wiring + capabilityCategories.ts fix** - `52346d9d` (feat)
2. **Task 2 RED: failing RoleCapabilityImpactPreviewModal tests** - `4960d7bf` (test)
3. **Task 2 GREEN: modal implementation + Switch/Client rewiring + existing-test updates** - `d35ed045` (feat)
4. **Doc-only clarity fix (no behavior change)** - `dff5ddb4` (docs)

**Plan metadata:** (this commit) `docs(138-13): complete plan`

_TDD Task 2 followed RED -> GREEN; no REFACTOR commit was needed (implementation passed cleanly on first GREEN attempt, and the doc-only follow-up was committed separately as `docs`, not `refactor`, since it changes zero behavior)._

## TDD Gate Compliance

- RED gate: `4960d7bf` (`test(138-13): add failing tests for RoleCapabilityImpactPreviewModal`) — confirmed genuinely failing (`Failed to resolve import` — component did not exist) before any implementation was written.
- GREEN gate: `d35ed045` (`feat(138-13): gate every capability toggle on a resolver-backed Impact Preview`) — all 6 new tests plus 15 existing tests across the three touched files passed (21/21).
- No REFACTOR commit — not needed.

## Files Created/Modified

- `frontend/src/lib/api.ts` - added `getRoleCapabilityImpactPreview`
- `frontend/src/app/admin/role-capabilities/capabilityCategories.ts` - 7-category label map
- `frontend/src/app/admin/role-capabilities/capabilityCategories.test.ts` - 4 new category-label assertions
- `frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.tsx` - new preview/confirm/activation-status modal
- `frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.test.tsx` - new test suite (6 tests)
- `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx` - Switch wiring replaced (`onGrant`/`onRevoke` -> `onRequestChange`), 7-category `CATEGORY_ORDER`
- `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.test.tsx` - harness/tests updated to the new `onRequestChange` contract
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` - owns modal state, removed now-obsolete `handleGrant`/`handleRevoke`/`capabilityError`/`isMutating`, corrected stale hint copy
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx` - 3 tests rewritten to the modal-gated mutation flow

## Decisions Made

See `key-decisions` in frontmatter:
- Modal self-fetches preview + holders rather than receiving holders as a prop (matches Task 2's literal action text; `RoleCapabilityClient.tsx` doesn't already have a loaded holder list the way `RolesClient.tsx` does).
- Preview items are joined to holders by array index (backend iteration order), not a `target_user_id` map, to correctly handle a user holding the same role across multiple fansub groups.
- Obsolete direct-mutation state (`handleGrant`/`handleRevoke`/`capabilityError`/`isMutating`) was deleted rather than left dead, since all mutation now happens inside the modal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated `RoleCapabilityDetail.test.tsx` and `RoleCapabilityClient.test.tsx` to match the new Switch->modal contract**
- **Found during:** Task 2
- **Issue:** These two pre-existing test files (not listed in this plan's frontmatter `files_modified`) directly asserted the OLD, now-removed behavior: clicking a Switch called `onGrant`/`onRevoke` immediately, and 422/409 mutation errors appeared as an immediate inline alert. Since the plan's entire point is to remove that direct-mutate path, leaving these tests unchanged would either fail outright or (worse) silently keep asserting stale/incorrect behavior if the props happened to still typecheck.
- **Fix:** `RoleCapabilityDetail.test.tsx`'s harness and one test now use `onRequestChange` instead of `onGrant`/`onRevoke`, and assert the Switch's `aria-checked` does NOT flip on click (no optimistic mutation). `RoleCapabilityClient.test.tsx`'s two 422/409 tests and the accordion-persistence test now mock `getRoleCapabilityImpactPreview`/`listRoleHolders`, open the modal via the Switch click, wait for "Änderung übernehmen" to become enabled, then click it — the error/refresh assertions moved from immediate-inline to inside-the-confirmed-modal.
- **Files modified:** `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.test.tsx`, `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx`
- **Verification:** All 21 tests across the three route-owned test files pass; full `admin/role-capabilities` sibling sweep is 38/38 green.
- **Committed in:** `d35ed045` (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — stale-contract test updates)
**Impact on plan:** Necessary to keep the test suite honest about the new, intentional behavior; no scope creep — no new features were added beyond what the plan specified.

## Issues Encountered

- The plan's literal verification command `npm test -- --run "RoleCapabilityImpactPreviewModal|RoleCapabilityDetail|RoleCapabilityClient"` (pipe-joined pattern as ONE quoted argument) exits 1 with `No test files found` — Vitest's CLI treats a single positional argument as one literal filename substring, not a regex-OR. Passing the three patterns as separate arguments (`--run "A" "B" "C"`) is the correct Vitest syntax and produces the intended result: all 3 files, 21/21 tests pass. This is a plan-authoring quirk in the verification command's shell syntax, not a real test failure — confirmed by running both forms side by side.
- `docker compose exec team4sv30-frontend npx tsc --noEmit` does not exit 0 project-wide, but zero of its 5 errors touch any file this plan modified — all 5 are the same pre-existing `.next/dev/types/app/**` Next.js App Router `PageProps` generated-type errors already documented as unrelated in `138-02-SUMMARY.md` and `138-03-SUMMARY.md` for this same phase.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CAP-09 and CAP-10 are now fully closed end-to-end on the role-capability matrix path: no capability toggle can reach `grantRoleCapability`/`revokeRoleCapability` without first passing through a resolver-backed, blocking Impact Preview, and the post-mutation state shown is always the real `cache_reload_succeeded` value.
- `RevokeCapabilityModal.tsx`/`GrantCapabilityModal.tsx` remain untouched and orphaned per Plan 138-08's prior finding — this plan's new modal never routes through them, so their stale copy is naturally never shown (no separate fix needed there).
- No blockers for subsequent Phase 138 plans.

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*

## Self-Check: PASSED

All created/modified files verified present on disk; all 4 task commits (`52346d9d`, `4960d7bf`, `d35ed045`, `dff5ddb4`) verified present in `git log`.
