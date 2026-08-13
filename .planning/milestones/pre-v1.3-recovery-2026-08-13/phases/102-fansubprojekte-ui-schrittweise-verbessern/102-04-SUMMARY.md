---
phase: 102-fansubprojekte-ui-schrittweise-verbessern
plan: "04"
subsystem: ui
tags: [nextjs, react, fansubprojekt, story, members, rich-text, tdd]

# Dependency graph
requires:
  - phase: 102-03
    provides: "Code-complete public project hero/navigation slice with final live UAT still deferred"
provides:
  - "Single collapsible `Geschichte des Fansub-Projekts` story block using `RichTextRenderer` for sanitized project note HTML"
  - "`Mitwirkende am Fansub-Projekt` member section using public Fansub member row visual language"
  - "Project member rows that render only project-scoped `role_labels` and link only to existing `/members/[slug]` routes"
affects: [phase-102, public-fansub-project-detail, fansub-project-story, fansub-project-members]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Project story HTML renders through `RichTextRenderer`; plain story fallback remains text-only."
    - "`ProjectMemberRows` adapts project contributor DTOs to the existing public Fansub member-row CSS and avatar seam."

key-files:
  created:
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.test.tsx"
    - "frontend/src/components/fansubs/ProjectMemberRows.tsx"
    - "frontend/src/components/fansubs/ProjectMemberRows.test.tsx"
    - ".planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-04-SUMMARY.md"
  modified:
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/page.module.css"

key-decisions:
  - "Task 2 story live acceptance is deferred to final Phase 102 UAT by explicit user direction, not approved."
  - "Task 4 member live acceptance is deferred to final Phase 102 UAT by explicit user direction, not approved."
  - "Project member rows use current safe `/members/[slug]` links only; no project-scoped member route was introduced."

patterns-established:
  - "Use a local one-block project story renderer for `/anime/[id]/group/[groupId]`, not the public Fansub multi-story archive/modal."
  - "Use `ProjectMemberRows` for project-scoped contributor DTOs when public Fansub member row styling is needed without profile-only fields."

requirements-completed:
  - "D-01"
  - "D-04"
  - "D-05"
  - "D-06"
  - "D-07"
  - "D-11"
  - "D-12"
  - "D-13"
  - "D-25"
  - "D-26"

# Metrics
duration: 8min
completed: 2026-07-14
---

# Phase 102 Plan 04: Story And Project Members Summary

**Single Fansub project story block with sanitized rich text plus project-scoped member rows using the public Fansub member presentation**

## Performance

- **Duration:** 8min implementation window.
- **Started:** 2026-07-14T15:50:08Z
- **Completed:** 2026-07-14T15:58:00Z
- **Tasks:** 2 implemented; Tasks 2 and 4 live acceptance deferred, not approved.
- **Files modified:** 8

## Accomplishments

- Replaced the old `Projektgeschichte` story surface with exact title `Geschichte des Fansub-Projekts`.
- Rendered exactly one project story block; project note HTML uses `RichTextRenderer`, while the legacy `story` fallback is plain text.
- Added locked story collapse labels `Alles anzeigen` and `Weniger anzeigen`.
- Replaced local project member cards with `ProjectMemberRows`, reusing `FansubMemberAvatar` and `FansubTeamSection.module.css` member-row styling.
- Updated the member section title to exact string `Mitwirkende am Fansub-Projekt`.
- Kept project member links limited to existing `/members/[slug]` routes and non-link rows when no slug exists.

## Task Commits

Each implementation task was committed atomically:

1. **Task 1 RED: Replace project story wording and collapse behavior** - `c1fa3d70` (`test`)
2. **Task 1 GREEN: Replace project story wording and collapse behavior** - `78b7618c` (`feat`)
3. **Task 3 RED: Replace local project cards with public Fansub member row style** - `34002b49` (`test`)
4. **Task 3 GREEN: Replace local project cards with public Fansub member row style** - `81711549` (`feat`)

**Plan metadata:** final docs commit is created after this summary self-check.

## Files Created/Modified

- `frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.tsx` - Local single-block project story renderer with sanitized rich text and locked toggle labels.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.test.tsx` - Coverage for exact story title, one `<article>`, empty omission, rich text, and `Alles anzeigen`.
- `frontend/src/components/fansubs/ProjectMemberRows.tsx` - Adapter from project contributor DTOs to public Fansub member row presentation.
- `frontend/src/components/fansubs/ProjectMemberRows.test.tsx` - Coverage for project-scoped `role_labels` and `/members/[slug]` links only.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.tsx` - Wrapper title changed to `Mitwirkende am Fansub-Projekt` and delegates to `ProjectMemberRows`.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx` - Updated expectations for locked member title, project rows, safe links, and empty omission.
- `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` - Added local project story block/clamp/toggle styling.

## Verification

- `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/sections/StorySection.test.tsx src/components/fansubs/ProjectMemberRows.test.tsx src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx` - passed, 8 tests.
- `npm --prefix frontend run typecheck` - passed.
- `git diff --check` - passed.
- `rg -n 'fansubprojekt/.+member' 'frontend/src/app/fansubs' 'frontend/src/app/anime/[id]/group/[groupId]'` - no matches.
- `rg -n '/contribution|fansubprojekt.*member' 'frontend/src/app/fansubs' 'frontend/src/app/anime/[id]/group/[groupId]' 'frontend/src/components/fansubs/ProjectMemberRows.tsx'` - no matches.

## Decisions Made

- The plan checkpoints were not treated as approved. Per explicit user direction, both live checks are deferred to final Plan 102-07 UAT.
- `ProjectMemberRows` was introduced instead of forcing `FansubTeamActiveGroup` to consume project contributor DTOs, because the public profile component expects profile-only fields such as avatar URL, slogan, status, and claimed state.
- Member rows link only to existing safe profile URLs. The future project-scoped contribution/member route remains deferred and unimplemented.

## Deviations from Plan

### User-Directed Checkpoint Handling

**1. Task 2 live story acceptance deferred**
- **Found during:** Plan execution start.
- **Reason:** User explicitly instructed: "code mal alles fertig dann testen wir".
- **Handling:** Story live acceptance was not auto-approved and not paused; it is documented for final Plan 102-07 UAT.

**2. Task 4 live member acceptance deferred**
- **Found during:** Plan execution start.
- **Reason:** User explicitly instructed: "code mal alles fertig dann testen wir".
- **Handling:** Member live acceptance was not auto-approved and not paused; it is documented for final Plan 102-07 UAT.

### Auto-fixed Issues

None.

---

**Total deviations:** 0 auto-fixed; 2 user-directed checkpoint deferrals.
**Impact on plan:** Tasks 1 and 3 executed and verified. Tasks 2 and 4 remain pending live UAT, not approved.

## Known Stubs

None. Stub scan found no TODO/FIXME/placeholder text. `avatarUrl={null}` in `ProjectMemberRows` is intentional because the current project contributor DTO does not expose avatar URLs; the existing `FansubMemberAvatar` fallback renders initials instead of a placeholder control.

## Threat Flags

None. No new endpoint, auth path, file access pattern, schema change, upload flow, or media ownership surface was introduced. The planned mitigations were applied:

- T-102-04-01: story HTML uses `RichTextRenderer`; no new raw HTML helper was added.
- T-102-04-02: member rows render only `role_labels` from the project contributor DTO.
- T-102-04-03: member links render only when `member_slug` exists and target `/members/[slug]`.

## Issues Encountered

- The plan's broad grep pattern also matched an existing unrelated test string `contributions?.member_count` in `frontend/src/app/fansubs/__tests__/page.test.tsx`. Focused route greps confirmed no project-member route or contribution route was introduced.
- `state.update-progress` reported `Progress field not found in STATE.md`; `state.advance-plan` still advanced the frontmatter plan count. The resulting `percent` value was corrected manually to match `381 / 411 = 93%`.
- `roadmap.update-plan-progress` updated the Phase-102 count to 5/8 but did not tick the individual `102-04-PLAN.md` checkbox, so that one status line was corrected manually.
- The working tree still contains unrelated untracked files under `frontend/src/app/admin/dev/` and `tmp/history-event-icons/`. They were not touched, staged, or committed.

## Auth Gates

None.

## Deferred Live UAT

Task 2 and Task 4 live acceptance are deferred to final Phase 102 UAT in Plan 102-07 by explicit user direction: "code mal alles fertig dann testen wir".

Final UAT must still verify:

1. Story section displays exact label `Geschichte des Fansub-Projekts`.
2. Story is one collapsible project text block, not a multi-story archive/modal.
3. Story section visually aligns with public Fansub page language on desktop, tablet portrait, and mobile.
4. Member section displays exact label `Mitwirkende am Fansub-Projekt`.
5. Member rows use the public Fansub member presentation pattern.
6. Member rows show only project roles and clickable rows go only to existing `/members/[slug]` routes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 102-05 can proceed only with the documented condition that Plan 102-04 story and member live acceptance are pending final UAT rather than approved.

## Self-Check: PASSED

- Created files exist: `.planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-04-SUMMARY.md`, `frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.test.tsx`, `frontend/src/components/fansubs/ProjectMemberRows.tsx`, and `frontend/src/components/fansubs/ProjectMemberRows.test.tsx`.
- Modified files exist: `StorySection.tsx`, `TeamSection.tsx`, `TeamSection.test.tsx`, and `page.module.css`.
- Task commits exist in git history: `c1fa3d70`, `78b7618c`, `34002b49`, `81711549`.
- Required automated checks passed: focused Vitest command, frontend typecheck, `git diff --check`, and focused no-new-project-member-route grep.
- `STATE.md` advanced to Plan 6 of 8, records Phase 102 P04 metrics, and includes the 102-04 decisions.
- `ROADMAP.md` shows 5/8 Phase-102 plans executed and marks `102-04-PLAN.md` complete.
- `REQUIREMENTS.md` was not modified because `102-04-PLAN.md` has no `requirements:` frontmatter field; its `requirements_addressed` entries are Phase-102 context decision IDs.
- Tasks 2 and 4 are documented as deferred to final Plan 102-07 UAT, not approved.

---
*Phase: 102-fansubprojekte-ui-schrittweise-verbessern*
*Completed: 2026-07-14*
