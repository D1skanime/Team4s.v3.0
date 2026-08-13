---
phase: 128-canonical-public-identity-visibility-foundation
plan: 13
subsystem: api-contract
tags: [openapi, typescript, optional-auth, refresh, privacy]
requires:
  - phase: 128-03
    provides: Refresh-only public-member client RED contracts
  - phase: 128-12
    provides: Seven deny-first optional-auth backend member routes
provides:
  - Seven-operation public-member OpenAPI contract with neutral denial and cache isolation
  - Canonical stored-slug and authoritative viewer TypeScript DTOs
  - Token-free central no-store helpers for every public-member read
affects: [128-15, 128-16, public-member-ui, api-client]
tech-stack:
  added: []
  patterns:
    - Duplicate-key-safe focused OpenAPI validation
    - Optional-auth reads through one refresh-capable browser client
key-files:
  created:
    - scripts/validate-phase128-member-openapi.py
    - frontend/src/types/__tests__/phase128-member-contract.test.ts
  modified:
    - shared/contracts/openapi.yaml
    - frontend/src/types/profile.ts
    - frontend/src/lib/api.ts
    - frontend/src/lib/api.auth-refresh.test.ts
key-decisions:
  - "The seven public-member operations retain their backend runtime envelopes while sharing optional bearer, neutral 404, and private no-store semantics."
  - "Public profile ownership is represented only by server-computed viewer facts; the public DTO exposes no app-user identifier."
patterns-established:
  - "Contract validator: recursively reject duplicate YAML keys and duplicate operationIds before asserting exact operation contracts."
  - "Member client boundary: every optional-auth member read is token-free, no-store, and routed through apiClientFetch."
requirements-completed: [PMID-03, PMPR-01, PMPR-03, PMPR-04, PMPR-05]
metrics:
  duration: 15min
  completed: 2026-08-13
---

# Phase 128 Plan 13: Public Member Contract and Client Summary

**Seven public-member surfaces now share one stored-slug OpenAPI/TypeScript contract and one refresh-capable, token-free, no-store browser transport.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-13T16:10:21Z
- **Completed:** 2026-08-13T16:25:05Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Updated six existing OpenAPI operations in place and added only the missing member-contributions operation, preserving all operation IDs and runtime response envelopes.
- Removed hidden-200 unions and stale members-only vocabulary; public profiles now require the stored slug and authoritative is_owner/is_private_preview viewer facts without app-user identity.
- Added duplicate-key and duplicate-operation validation plus compile-time/source DTO parity coverage.
- Routed profile, projects, contributions, project summary, notes, media, and releases through apiClientFetch with cache no-store, preserved cursors and AbortSignal, and removed the profile token parameter.
- Proved missing/expired access-token sessions refresh centrally and attach the new bearer for profile, contribution, and project-member reads.

## Task Commits

1. **Task 1 RED: Public-member contract validation** - `d42517e4` (test)
2. **Task 1 GREEN: Canonical OpenAPI and DTO synchronization** - `1faae30a` (feat)
3. **Task 2 RED: Central client source boundary** - `8cab73df` (test)
4. **Task 2 GREEN: Refresh-capable member helpers** - `6d1bb22c` (feat)

## Files Created/Modified

- `shared/contracts/openapi.yaml` - Exact seven-operation optional-auth contract, neutral denial, viewer cache headers, and runtime schemas.
- `frontend/src/types/profile.ts` - Canonical visibility, required stored slug, and profile viewer envelope.
- `scripts/validate-phase128-member-openapi.py` - Safe duplicate-aware OpenAPI validator for the canonical host Python runtime.
- `frontend/src/types/__tests__/phase128-member-contract.test.ts` - Compile-time DTO parity and forbidden-union source checks.
- `frontend/src/lib/api.ts` - Seven token-free no-store member helpers on the central refresh seam.
- `frontend/src/lib/api.auth-refresh.test.ts` - Refresh-only runtime matrix and central-helper source boundary.
- `.planning/phases/128-canonical-public-identity-visibility-foundation/deferred-items.md` - Out-of-scope baseline and downstream integration notes.

## Decisions Made

- Matched the live backend exactly: profile uses the data/viewer envelope, projects uses the data envelope, contributions remains top-level role_timeline/has_unverified, and project-member resources retain their summary/cursor schemas.
- Documented optional auth and cache isolation on every success and neutral denial response; no public shared-cache fallback was added.
- Kept owner authorization server-computed and excluded app_user_id from the public DTO.
- Left downstream UI migrations to Plans 128-15/16 and did not touch their files or the user's dirty profile/badge work.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unrelated staged files from the first task commit**
- **Found during:** Task 1 RED commit review
- **Issue:** Two pre-existing staged MemberBadgeChain files were included by Git despite path-specific staging.
- **Fix:** Amended the commit to contain only the two Task 1 test files, then restored the user's staged index blobs and additional unstaged test edit exactly.
- **Files modified:** Commit metadata only; user files preserved.
- **Verification:** The amended commit stat lists only the validator and DTO parity test; Git status retains the original M/MM states.
- **Committed in:** `d42517e4`

**2. [Rule 1 - Bug] Corrected stale GSD progress derivation**
- **Found during:** Final planning metadata update
- **Issue:** The handlers counted 14 summaries but left ROADMAP at 9/22, advanced STATE to already-completed Plan 14, and retained Plan 09 as the activity text.
- **Fix:** Set ROADMAP to the verified 14/22 count, advanced past already-completed Plan 14 to next incomplete Plan 15, and recorded Plan 13 activity.
- **Files modified:** `.planning/STATE.md`, `.planning/ROADMAP.md`
- **Verification:** Fourteen checked Phase-128 plan entries and fourteen summaries exist; Plan 15 is the next incomplete plan.
- **Committed in:** Final plan metadata commit

---

**Total deviations:** 2 auto-fixed (2 bugs).
**Impact on plan:** Commit atomicity was restored without changing plan behavior or user-owned files.

## Issues Encountered

- The complete no-token suite has one pre-existing inventory-only failure because two Phase-49 planning documents no longer exist at their old active-phase paths. All eight production security-boundary assertions pass.
- Full frontend typecheck remains red on downstream Phase-128 visibility/page/preview migrations, pre-existing generated Next route-prop errors, and user-owned dirty MemberBadgeChain tests. The plan-owned validator, DTO suite, refresh suite, security boundaries, scoped lint, and diff checks pass.
- Two large patch attempts failed atomically on stale context; smaller targeted patches applied cleanly. No partial changes remained.

## Verification

- `python3 scripts/validate-phase128-member-openapi.py`: passed.
- DTO parity and auth-refresh Vitest suites: 26/26 passed.
- No-token production boundary assertions: 8/8 passed; inventory-only historical path assertion deferred.
- Scoped ESLint on all plan-owned TypeScript files: passed.
- Seven unique operationId inventory, forbidden hidden-union grep, stub scan, and `git diff --check`: passed.
- Full typecheck: expected downstream/pre-existing failures documented in deferred items.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 128-15/16 can consume the authoritative viewer envelope and token-free helper without inventing auth, slug, visibility, or response fallbacks.
- No blocker remains for the remaining Phase-128 plans.

## Self-Check: PASSED

All six plan files exist; all four task commits exist; the exact OpenAPI validator, DTO parity, refresh-only matrix, production no-token boundaries, scoped lint, operation inventory, stub scan, and diff check pass.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
