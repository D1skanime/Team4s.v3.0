---
phase: 169-release-medienrechte-projektleiter-preview-highlights-und-bi
plan: 02
subsystem: api
tags: [go, gin, permissions, release-version-media, highlights, openapi, contracts]

requires:
  - phase: 169-release-medienrechte-projektleiter-preview-highlights-und-bi
    provides: canonical release-version media highlight persistence and dedicated curation actions
provides:
  - authenticated highlight set/remove and complete highlight-order mutation endpoints
  - dedicated reorder/highlight capability flags and audit actions
  - synchronized admin-content and OpenAPI contracts for independent preview/highlight state
affects: [169-03, 169-04, release-version-media, admin-api, permissions]

tech-stack:
  added: []
  patterns:
    - central permissionActorFromContext and CanForReleaseVersion authorization at mutation entry
    - transactional repository ownership checks with complete-list validation for highlight reorder
    - shared DTO and contract parity for independent preview/highlight fields

key-files:
  created:
    - backend/internal/handlers/admin_content_release_version_media_highlight.go
    - backend/internal/handlers/admin_content_release_version_media_highlight_test.go
  modified:
    - backend/internal/handlers/admin_content_release_version_media.go
    - backend/internal/handlers/admin_content_release_version_media_reorder.go
    - backend/internal/handlers/app_auth_test.go
    - backend/internal/handlers/dashboard_me_handler_test.go
    - backend/cmd/server/admin_routes.go
    - shared/contracts/admin-content.yaml
    - shared/contracts/openapi.yaml

key-decisions:
  - "Highlight mutations use release_version_media.highlight; media order uses release_version_media.reorder, and preview remains independent."
  - "Highlight reorder requires the complete currently highlighted relation set, rejects duplicates/foreign/non-highlighted relations, and commits through the repository transaction."
  - "No release_media route, legacy fansubgroup_id seam, data reset, or new media ownership structure was introduced."

patterns-established:
  - "Every new admin mutation enters through the central auth/session identity seam and CanForReleaseVersion."
  - "Allowed and denied curation operations use separate audit event/action values."

requirements-completed: [REQ-169-02, REQ-169-03, REQ-169-04, REQ-169-05]

metrics:
  duration: 22min
  completed: 2026-09-28
---

# Phase 169 Plan 02: Release-Medienrechte, Projektleiter, Preview, Highlights und Bildreihenfolge Summary

**Secure release-version media curation API with independent preview/highlights, project-scoped authorization, and synchronized contracts**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-28T18:05:00Z
- **Completed:** 2026-09-28T18:27:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added authenticated set/remove and complete-list reorder endpoints for independent release-version highlights, with typed JSON validation, version ownership checks, duplicate/order validation, atomic transactions, and separate audits.
- Changed existing media reorder authorization from generic media update to release_version_media.reorder; exposed can_reorder_media and can_manage_highlights through the existing capabilities endpoint.
- Synchronized shared/contracts/admin-content.yaml and shared/contracts/openapi.yaml with highlight fields, capabilities, endpoints, response/error shapes, complete-list semantics, and preview independence.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add highlight mutations and dedicated reorder authorization** - f1b89df8 (test RED), bd4fb43c (feat), 87b57fcb (test correction)
2. **Task 2: Synchronize admin contracts and security tests** - 116a8bba (contracts/parity tests)

No separate plan metadata commit exists yet; it will be created after this summary and GSD tracking updates.

## Files Created/Modified

- backend/internal/handlers/admin_content_release_version_media_highlight.go - authenticated highlight set/remove and complete highlight reorder handlers.
- backend/internal/handlers/admin_content_release_version_media.go - capability response fields and dedicated capability checks.
- backend/internal/handlers/admin_content_release_version_media_reorder.go - dedicated reorder authorization/action and nil-safe audit write.
- backend/cmd/server/admin_routes.go - authenticated highlight mutation routes.
- backend/internal/handlers/admin_content_release_version_media_highlight_test.go - TDD auth gate and DTO parity coverage.
- backend/internal/handlers/app_auth_test.go, backend/internal/handlers/dashboard_me_handler_test.go - disposable capability-cache fixtures aligned with the actions introduced by Plan 01.
- shared/contracts/admin-content.yaml, shared/contracts/openapi.yaml - synchronized API/DTO/capability/error documentation.

## Decisions Made

- Preview candidacy is never cleared or changed by highlight set/remove/reorder.
- Highlight and media order use separate capability actions and audit events.
- The server is authoritative for release-version ownership and receives only real release-version-scoped repository operations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Aligned disposable capability-cache fixtures with Plan 01 actions**
- **Found during:** Task 1 focused handler regression
- **Issue:** Existing handler capability fixtures omitted release_version_media.reorder and release_version_media.highlight, causing cache loading to fail before tests could run.
- **Fix:** Added both actions to the app-auth and dashboard capability fixtures, including automatic project-lead grants.
- **Files modified:** backend/internal/handlers/app_auth_test.go, backend/internal/handlers/dashboard_me_handler_test.go
- **Verification:** Full internal/handlers suite passes.
- **Committed in:** bd4fb43c

**Total deviations:** 1 auto-fixed (Rule 3 - Blocking)
**Impact on plan:** Required test correctness for the newly registered actions; no production data or domain seam changed.

## Issues Encountered

- The canonical repository's scripts/gsd-linux.sh exposes legacy gsd-tools commands rather than the newer gsd-sdk query interface; available legacy handlers were used for state, roadmap, and session tracking.
- admin-content.yaml has a pre-existing YAML parse error at line 1250 (uninitialized note text); the OpenAPI contract parses successfully. The existing custom contract format/test suite remains green when run with its expected shared, database, frontend, and docs mounts. The unrelated malformed legacy note was not changed.
- No authentication gate occurred. No database reset, migration execution, push, or runtime data mutation was performed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for Plan 169-03 to consume the authoritative highlight/order endpoints and capability flags.
- No legacy release_media seam or parallel media ownership was introduced.
- Live browser/UAT remains a separate verification step if required by the phase workflow.

---
*Phase: 169-release-medienrechte-projektleiter-preview-highlights-und-bi*
*Completed: 2026-09-28*

## Self-Check: PASSED

- Summary file created at .planning/phases/169-release-medienrechte-projektleiter-preview-highlights-und-bi/169-02-SUMMARY.md.
- Task commits f1b89df8, bd4fb43c, 87b57fcb, and 116a8bba exist in git history.
- Focused handler/contract tests, full handler package tests, cmd/server tests, and git diff --check passed.