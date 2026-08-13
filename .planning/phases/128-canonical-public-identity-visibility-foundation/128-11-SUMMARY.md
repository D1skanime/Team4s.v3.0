---
phase: 128-canonical-public-identity-visibility-foundation
plan: 11
subsystem: backend-handler-access
tags: [go, gin, public-member, access-control, privacy, caching]
requires:
  - phase: 128-02
    provides: Public member access matrix, neutral denial, and zero-loader contracts
  - phase: 128-09
    provides: ResolvePublicMemberAccess and member-ID profile/project loaders
provides:
  - Shared optional-auth public member access, neutral unavailable, and cache utility
  - Deny-first public profile and project handlers using member-ID detail loaders
  - Server-computed owner and private-preview viewer facts
affects: [128-12, 128-13, 128-15, 128-16]
tech-stack:
  added: []
  patterns:
    - Resolve raw member slug before protected detail loading
    - Pass only middleware-resolved AppUserID into repository authorization
    - Vary optional-auth responses on Authorization and isolate viewer-dependent data
key-files:
  created:
    - backend/internal/handlers/public_member_access.go
  modified:
    - backend/internal/handlers/app_public_profile.go
    - backend/internal/handlers/app_public_profile_test.go
    - .planning/phases/128-canonical-public-identity-visibility-foundation/deferred-items.md
key-decisions:
  - "Public profile handlers consume one injected resolver plus narrow member-ID loaders; they do not infer authorization from profile data."
  - "Verified app-user identity is the only viewer input passed to the repository resolver; platform-admin and token roles are ignored."
  - "Profile responses expose owner/private-preview as a server-computed viewer object while projects keep their existing data envelope."
patterns-established:
  - "Deny first: resolve access, return the shared neutral 404 on denial, and only then invoke detail loaders."
  - "Cache isolation: every optional-auth response varies on Authorization; authenticated or owner-dependent responses are private, no-store."
requirements-completed: [PMPR-01, PMPR-02, PMPR-05]
metrics:
  duration: 13min
  completed: 2026-08-13
---

# Phase 128 Plan 11: Deny-First Profile Handler Summary

**Shared verified-identity access resolution now gates public profiles and projects before member-ID detail loading, with neutral 404s and owner-safe caching.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-08-13T15:31:51Z
- **Completed:** 2026-08-13T15:44:39Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added one shared handler utility that reads the established optional-auth identity, passes only `AppUserID` to `ResolvePublicMemberAccess`, and ignores admin/global-role state.
- Rewired profile and projects to resolve canonical access before their narrow member-ID loaders, eliminating post-load visibility checks and hidden `200` branches.
- Added byte-identical `404` responses with `Profil nicht verfügbar`, `Vary: Authorization`, and `private, no-store` isolation for viewer-dependent or owner-preview responses.
- Returned authoritative `viewer.is_owner` and `viewer.is_private_preview` facts with profile data while preserving bounded project pagination.

## Task Commits

1. **Task 1 RED: Shared access/neutral/cache behavior** - `d75dc6c6` (test)
2. **Task 1 GREEN: Shared public member access utility** - `c03295f6` (feat)
3. **Task 2 RED: Deny-first profile/projects behavior** - `ff0c0d8c` (test)
4. **Task 2 GREEN: Profile/projects handler rewire** - `66fc02dd` (feat)
5. **Recovery: Exclude pre-staged frontend changes** - `50a536d8` (chore)

## Files Created/Modified

- `backend/internal/handlers/public_member_access.go` - Narrow resolver and loader interfaces, access helper, neutral writer, and cache classification.
- `backend/internal/handlers/app_public_profile.go` - Resolver-first profile/projects handlers and authoritative profile viewer facts.
- `backend/internal/handlers/app_public_profile_test.go` - Focused access identity, denial, order, cache, envelope, and pagination tests.
- `.planning/phases/128-canonical-public-identity-visibility-foundation/deferred-items.md` - Exact Plan-10-to-Plan-12 transient compile gap.

## Decisions Made

- Kept identity authorization in the repository-owned `ResolvePublicMemberAccess` seam and passed no platform-admin, Keycloak-role, legacy-user, or bearer state into it.
- Applied `private, no-store` whenever a valid optional-auth viewer is present, even for a public profile, because the response decision depended on viewer identity.
- Kept the projects payload as its existing `data` envelope; the profile adds the explicit viewer object required by the owner-preview UI and Plan 128-13 contract work.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used file-list tests for the plan-owned handler slice**
- **Found during:** Task 1 verification
- **Issue:** Package-wide handler compilation is transiently broken because Plan 128-10 removed two repository compatibility methods before Plan 128-12 rewires their owning handlers.
- **Fix:** Ran focused production-source file-list tests and vet for the Plan-128-11 access/profile/project slice, plus the independent cross-route reference matrix; did not restore removed compatibility methods or modify Plan-128-12 files.
- **Files modified:** `.planning/phases/128-canonical-public-identity-visibility-foundation/deferred-items.md`
- **Verification:** All Plan-128-11 file-list tests and vet passed; package-wide failure remains exactly the two documented out-of-scope symbols.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** Verification transport was narrowed to the owned slice; all Plan-128-11 behavior is compiled and tested without expanding into Plan 128-12.

## Issues Encountered

- The exact planned package test, whole-backend compile-only test, and package-wide handler/server vet currently fail at `contributions_public_handler.go:67` (`GetPublicMemberContributions`) and `project_member_public_handler.go:66` (`ResolveMemberRelation`). Plan 128-12 explicitly owns replacing both calls with the resolved-ID seams.
- Two early remote commands containing shell regex substitutions were intercepted by local PowerShell quoting. They failed before changing repository state and were rerun with safe scoped commands.
- The first metadata commit captured two unrelated pre-staged frontend files; corrective commit `50a536d8` removed only those committed hunks and restored their exact original staged/unstaged state.

## Verification

- File-list `GetPublicMember`, `ResolvePublicMemberAccess`, `Unavailable`, and `Cache` handler suites: passed.
- Independent seven-route `TestPhase128PublicMemberAccessMatrixReference`: passed.
- File-list `go vet` for access/profile/error sources and focused tests: passed.
- Exact planned handler package tests: blocked only by the two Plan-128-12-owned missing symbols documented above.
- Whole backend compile and handler/server vet: same two out-of-scope missing symbols, no Plan-128-11 error.
- Source invariants: resolver precedes both loaders; no `members_only`, `visible:false`, `AppUserID` comparison, admin/Keycloak role inference, or bearer handling.
- Stub scan across all three production/test files: no TODO, FIXME, placeholder, empty-render, or mock-data stubs.
- Repository `git diff --check`: passed with unrelated user changes preserved.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: optional-auth-response | backend/internal/handlers/public_member_access.go | New shared trust-boundary utility consumes verified middleware identity and controls neutral denial/cache isolation for public member reads. |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 128-12 can reuse the same access resolver, neutral writer, and cache helper for contributions and all four project-member subresources.
- Plan 128-12 must close the documented cross-plan compile gap before package-wide verification can pass.

## Self-Check: PASSED

All three implementation/test files exist, all task and recovery commits exist in Git, focused compilation/tests/vet pass, source/stub/diff checks pass, and the sole package-wide verification gap is precisely documented in its owning next plan.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
