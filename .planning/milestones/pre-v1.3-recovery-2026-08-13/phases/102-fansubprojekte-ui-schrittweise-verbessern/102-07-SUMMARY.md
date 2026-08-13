---
phase: 102-fansubprojekte-ui-schrittweise-verbessern
plan: "07"
subsystem: ui
tags: [nextjs, react, public-fansub-project, release-segment, uat, docker]

# Dependency graph
requires:
  - phase: 102-06
    provides: "Public Fansub project page flow without obsolete section nav, global empty summary, standalone OP/ED/Middle, or standalone Medien"
provides:
  - "Final Phase 102 UAT evidence for pretty route, technical route, responsive public project page, and release-title safety"
  - "Public project release block using the global UI-dev-defined public release segment"
  - "Newest public Fansub release on the project page is selected by last public text/image activity"
  - "Docker deployment evidence for the final Phase 102 public project route"
affects: [phase-102, public-fansub-project-detail, public-release-block, group-release-list-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public release overview composes a shared `PublicReleaseBlock` instead of local one-off release cards."
    - "Project page newest release uses backend activity ordering so public text/media uploads can surface a release without relying on episode number."
    - "Live UAT issues are fixed inline and recorded as evidence before phase closure."

key-files:
  created:
    - ".planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-07-SUMMARY.md"
    - ".planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-UI-CHANGES.md"
    - "frontend/src/components/fansubs/PublicReleaseBlock.tsx"
    - "frontend/src/components/fansubs/PublicReleaseBlock.module.css"
    - "frontend/src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx"
  modified:
    - ".planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-UAT-EVIDENCE.md"
    - "backend/internal/handlers/group_handler.go"
    - "backend/internal/models/group.go"
    - "backend/internal/repository/group_repository_cursor.go"
    - "frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.module.css"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx"
    - "frontend/src/lib/api.ts"
    - "frontend/src/types/group.ts"
    - "shared/contracts/openapi.yaml"

key-decisions:
  - "The public project release segment is the public view under the Fansub project page, not the internal Fansub edit/workspace release component."
  - "The single-release timeline design stays saved for the later dedicated release detail page, while the project page uses the slimmer list-friendly timeline."
  - "`sort=activity` is additive on the release-list API and defaults remain unchanged for existing release-list consumers."
  - "Newest public Fansub release means the release version with the newest public/published note or approved public media activity."

patterns-established:
  - "UI-dev public release showcase is treated as the source shape, then reused in the real public project page through shared components."
  - "Public release rows use episode label, version, title fallback, count indicators, and clickable Kara segments without repeating redundant date/group/time badges."
  - "Backend API additions are additive, typed in frontend DTOs, and documented in OpenAPI in the same closure slice."

requirements-completed:
  - "D-01"
  - "D-02"
  - "D-03"
  - "D-04"
  - "D-06"
  - "D-07"
  - "D-08"
  - "D-09"
  - "D-10"
  - "D-11"
  - "D-12"
  - "D-14"
  - "D-15"
  - "D-16"
  - "D-17"
  - "D-18"
  - "D-21"
  - "D-22"
  - "D-23"
  - "D-24"
  - "D-25"
  - "D-26"
  - "D-27"
  - "D-28"

# Metrics
duration: multi-session live UAT and polish
completed: 2026-07-16
---

# Phase 102 Plan 07: Final Public Project UAT And Release Segment Summary

**Phase 102 is closed with the public Fansub project page, route behavior, public release segment, and activity-based newest-release behavior verified in Docker.**

## Performance

- **Duration:** Multi-session live design/UAT loop from 2026-07-14 through 2026-07-16.
- **Completed:** 2026-07-16.
- **Tasks:** Automated gates, live route/responsive UAT, human visual corrections, public release segment polish, final Docker deploy.

## Accomplishments

- Completed the final live UAT pass for the public project route from `/fansubs/c-subs` to `/fansubs/c-subs/fansubprojekt/vipers-creed`.
- Preserved the technical compatibility route while steering public navigation to the pretty project route.
- Reworked the public `Releases zum Fansub` surface to use the shared `PublicReleaseBlock` defined through UI-dev iteration.
- Added `102-UI-CHANGES.md` as the explicit UI inventory for public project, UI-dev, global primitives, project carousel, release block, and deferred release-detail follow-ups.
- Removed redundant public release badges/timestamps from the project list and kept the compact episode/version/title/count/timeline/action shape.
- Added backend `release-list?sort=activity` support so the project page can show the newest public Fansub release by public note/media activity.
- Deployed the final backend/frontend changes to the Docker dev stack and verified the Viper's Creed public project page served the updated block.

## Files Created/Modified

- `frontend/src/components/fansubs/PublicReleaseBlock.tsx` and `.module.css` - Shared public release segment with compact stats, glassy timeline segments, clickable Kara anchors, and responsive layout.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx` - Wires the public project releases section to `PublicReleaseBlock`.
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` - Maps release-list API data into public release previews and requests activity sorting for project-page newest release.
- `backend/internal/repository/group_repository_cursor.go` - Adds additive `sort=activity` cursor ordering using public/published notes and approved public media timestamps.
- `backend/internal/handlers/group_handler.go`, `backend/internal/models/group.go`, `frontend/src/lib/api.ts`, `frontend/src/types/group.ts`, `shared/contracts/openapi.yaml` - Extend the release-list contract with activity sort and contributor/media/note activity fields.
- `.planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-UAT-EVIDENCE.md` - Records final route, UI, Docker, and API evidence.

## Verification

- `npm test -- "src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx" "src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx" "src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx" "src/app/anime/[id]/group/[groupId]/page.test.tsx"` - passed, 4 files / 22 tests.
- `npm run typecheck` from `frontend` - passed.
- `npx eslint -- "src/app/anime/[id]/group/[groupId]/projectPageData.ts" "src/app/anime/[id]/group/[groupId]/ProjectPage.tsx" "src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx" "src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx" "src/components/fansubs/PublicReleaseBlock.tsx"` - passed.
- `go test ./internal/repository ./internal/handlers` from `backend` - passed.
- `git diff --check` - passed; Git reported LF-to-CRLF warnings only.
- `docker compose build team4sv30-backend` - passed.
- `docker compose up -d --no-deps --force-recreate team4sv30-backend` - passed.
- `docker compose restart team4sv30-frontend` - passed.
- `http://127.0.0.1:3000/fansubs/c-subs/fansubprojekt/vipers-creed?codexRefresh=4` - HTTP 200, rendered `PublicReleaseBlock`, `Neuestes Fansub-Release`, and an activity-selected release.
- `http://127.0.0.1:18092/api/v1/anime/1/group/1/release-list?limit=3&sort=activity` - returned release-list items sorted by `last_activity_at`.

## Decisions Made

- The public project release block is separate from internal release editing/workspace components. Internal views that were accidentally touched during design discussion were restored conceptually and are not the Phase 102 target.
- The larger single-release timeline exploration is saved for the later release detail page. The project page keeps a slimmer, list-friendly segment because pages may contain many releases.
- Activity sorting is additive and opt-in with `sort=activity`; default release-list behavior remains episode-order based for existing consumers.
- "Newest Fansub release" on the public project page means latest public contribution activity, not merely highest episode number or release date.

## Deviations from Plan

- Plan 07 originally only expected evidence recording, but live UAT uncovered follow-up implementation gaps: public project story visibility, public project contributors, avatars, release segment shape, and newest-release behavior. These were fixed before closure instead of deferring because they were direct acceptance blockers for Phase 102.
- The final work included API/contract changes for additive release-list activity sorting. No schema migration or media ownership change was introduced.

## Known Stubs

None introduced.

## Threat Flags

- No new upload flows or media ownership tables were introduced.
- Public activity sorting only uses public/published notes and approved public media.
- Pretty-route identity and technical compatibility were preserved.
- Existing Docker frontend logs showed Watchpack `ENOMEM` scan warnings during development, but the checked public route served successfully.

## Issues Encountered

- A broad accidental frontend test run pulled in unrelated admin anime tests that failed on existing auth/permission loading behavior. The relevant exact Phase 102 tests passed and are listed above.
- The worktree remains intentionally dirty with many Phase 102 and adjacent UI-dev changes. No unrelated files were reverted or cleaned during closeout.

## Auth Gates

None. The public project page and release-list route are public-read surfaces; no protected browser auth behavior was changed.

## User Setup Required

None for the Phase 102 public project closeout. Docker dev stack is already updated.

## Next Phase Readiness

Phase 102 is ready to be marked complete. Remaining design follow-up should be a new phase or quick task for the dedicated public release detail page and any additional UI-system refinements.

## Self-Check: PASSED

- Final Plan 07 summary exists.
- UAT evidence is updated to completed status.
- Relevant frontend, backend, OpenAPI, and Docker checks are recorded.
- Public project release segment and newest-release activity behavior are verified against the local Docker stack.

---
*Phase: 102-fansubprojekte-ui-schrittweise-verbessern*
*Completed: 2026-07-16*
