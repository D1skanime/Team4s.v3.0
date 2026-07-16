---
phase: 102-fansubprojekte-ui-schrittweise-verbessern
plan: "07"
created_utc: 2026-07-14T16:26:44Z
status: complete
completed: 2026-07-16
---

# Phase 102 Plan 07 UAT Evidence

## Scope

Final evidence pass for the public Fansub project UI cleanup. Human visual
acceptance is intentionally not approved in this file until the user verifies
the shared browser flow.

## Automated Pre-UAT Gates

| Command | Result | Notes |
| --- | --- | --- |
| `npm --prefix frontend run typecheck` | PASS | `tsc --noEmit` completed without errors. |
| `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId] src/components/fansubs src/lib/fansubProjectNavigation.test.ts` | PASS | 21 test files passed, 84 tests passed. |
| `cd backend; go test ./internal/repository -run "Test.*Public.*Release.*Title|TestFansubRepository_PublicProfileSourceInvariants"` | PASS | `team4s.v3/backend/internal/repository` passed. |
| `git diff --check` | PASS | No whitespace/conflict-marker issues reported. |

Classification: no phase-blocking or unrelated existing failures found in the
automated pre-UAT gates.

## Auto-Fixed Issues During UAT

**1. [Rule 1 - Bug] Public profile cards fell back to the technical route**
- **Found during:** Task 2 route evidence.
- **Issue:** `/fansubs/c-subs` still rendered Viper's Creed as `/anime/1/group/1` because the local public profile payload exposed blank `anime_slug` values.
- **Fix:** `listPublicFansubProjects` now emits a server-side fallback slug from the Anime title when the stored slug is blank, while still preferring the stored `anime.slug`.
- **Files modified:** `backend/internal/repository/fansub_repository.go`, `backend/internal/repository/fansub_repository_test.go`.

**2. [Rule 1 - Bug] Pretty route was unavailable in Next dev routing**
- **Found during:** Task 2 route evidence.
- **Issue:** `/fansubs/c-subs/fansubprojekt/vipers-creed` returned 404 and Next logged `You cannot use different slug names for the same dynamic path ('slug' !== 'fansubSlug')`.
- **Fix:** Moved the pretty route under the existing `/fansubs/[slug]` segment and adjusted the page params.
- **Files modified:** `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx`.

**3. [Rule 1 - Bug] Profile project link lacked the locked link pattern**
- **Found during:** Task 2 route evidence.
- **Issue:** The card had the correct title but no `Fansub-Projekt oeffnen` link name.
- **Fix:** Added an accessible `aria-label` to the existing project card link.
- **Files modified:** `frontend/src/components/fansubs/FansubProjectBannerCard.tsx`, `frontend/src/components/fansubs/__tests__/FansubProjectsSection.test.tsx`.

**4. [Rule 1 - Bug] Hero backdrop caused horizontal overflow**
- **Found during:** Task 2 viewport evidence.
- **Issue:** The scaled blurred hero backdrop and desktop full-bleed shell produced horizontal overflow in browser measurement.
- **Fix:** Clipped the backdrop inside the hero shell and constrained the desktop full-bleed width in the app shell context.
- **Files modified:** `frontend/src/app/anime/[id]/group/[groupId]/page.module.css`.

**5. [Rule 1 - Bug] Story and member sections disappeared when public data was empty**
- **Found during:** Human visual acceptance.
- **Issue:** The user accepted route/link, compatibility, responsive, and removed-section checks, but reported that all data for the locked visible labels was missing. The checked seed routes rendered `Releases zum Fansub`, but omitted `Geschichte des Fansub-Projekts` and `Mitwirkende am Fansub-Projekt` entirely when public story/project-role data was empty.
- **Fix:** Story and member sections now remain visible and show scoped empty states (`Noch kein öffentlicher Projekttext hinterlegt.`, `Noch keine öffentlichen Projektrollen hinterlegt.`) instead of disappearing. This keeps the agreed page structure visible without reintroducing the removed global empty summary or exposing hidden/non-public contributor data.
- **Files modified:** `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx`, `frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.tsx`, `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.tsx`, `frontend/src/app/anime/[id]/group/[groupId]/page.module.css`, `StorySection.test.tsx`, `TeamSection.test.tsx`.

**6. [Rule 1 - Bug] Cockpit Projekt-Einblick saved hidden public-page data**
- **Found during:** Human visual acceptance recheck after item 4.
- **Issue:** The user reported that Viper Creed has a `Projekt-Einblick` in the admin cockpit, but the public project page still rendered `Noch kein öffentlicher Projekttext hinterlegt.` Investigation showed the public endpoint correctly filters to `visibility='public'` and `status='published'`, while the cockpit editor shown to users had no status/visibility controls and silently saved `internal/draft`.
- **Fix:** The embedded cockpit `Projekt-Einblick` editor now saves new and edited entries as `public/published`, including previously hidden `internal/draft` rows when the user edits and saves them through that control. The public endpoint remains restricted to public/published content.
- **Local UAT data correction:** The existing Viper Creed row (`anime_id=1`, `fansub_group_id=1`) was updated from `internal/draft` to `public/published` after the code fix because it had been saved through the broken hidden-default path. The second local draft row remained untouched.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.tsx`, `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.test.tsx`.

**7. [Rule 1 - Bug] Cockpit project team members were hidden on the public project page**
- **Found during:** Human visual acceptance recheck after item 6.
- **Issue:** The user reported that Viper Creed has project members, but the public page rendered `Noch keine öffentlichen Projektrollen hinterlegt.` Investigation showed three confirmed `anime_contributions` rows for the project. They were hidden because older cockpit saves had `is_public_on_anime_page=false`, and the public project contributors query still required `fansub_group_member_id` even though current rows are anchored by `member_id`.
- **Fix:** The public project contributors query now reads member-anchored `anime_contributions`, keeps the public visibility gate (`is_public_on_anime_page=true`, `COALESCE(visibility, public)=public`), and uses historical group-member visibility only when such a historical row exists. The cockpit contribution modal now saves project-team rows as `confirmed` and public because that UI has no status/visibility controls, and rewrites old hidden rows on save.
- **Local UAT data correction:** The three confirmed Viper Creed contribution rows (`anime_id=1`, `fansub_group_id=1`) were updated to `is_public_on_anime_page=true` and `is_public_on_member_profile=true` after the code fix because they had been saved through the hidden-default path.
- **Files modified:** `backend/internal/repository/group_contributors_repository.go`, `backend/internal/repository/group_contributors_repository_test.go`, `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx`, `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.test.tsx`.

**8. [Rule 1 - Bug] Public project member avatars were not rendered**
- **Found during:** Human visual acceptance recheck after item 7.
- **Issue:** The user reported that member avatars were missing even though Viper Creed contributors were now visible. DB inspection showed avatars on the affected members, but `/api/v1/anime/1/group/1/contributors` did not expose avatar URLs and `ProjectMemberRows` always passed `avatarUrl={null}`.
- **Fix:** The group contributors API now returns `member_avatar_url` for team and member-anchored project contributors, the TypeScript/OpenAPI contracts include the field, and `ProjectMemberRows` forwards it to the existing `FansubMemberAvatar` component.
- **Files modified:** `backend/internal/repository/group_contributors_repository.go`, `backend/internal/repository/group_contributors_repository_test.go`, `frontend/src/types/groupContributors.ts`, `frontend/src/components/fansubs/ProjectMemberRows.tsx`, `frontend/src/components/fansubs/ProjectMemberRows.test.tsx`, `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx`, `shared/contracts/openapi.yaml`.

## Post-Fix Automated Gates

| Command | Result | Notes |
| --- | --- | --- |
| `npm --prefix frontend run typecheck` | PASS | Re-run after route/UI/backend-fix integration. |
| `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId] src/components/fansubs src/lib/fansubProjectNavigation.test.ts` | PASS | 21 test files passed, 84 tests passed. |
| `cd backend; go test ./internal/repository -run "Test.*Public.*Release.*Title|TestFansubRepository_PublicProfileSourceInvariants"` | PASS | Required release-title/public-profile tests passed. The new slug fallback source guard also passed in the focused backend re-run. |
| `npm --prefix frontend run test -- src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.test.tsx` | PASS | 4 tests passed, including the hidden-default regression for `public/published` cockpit saves. |
| `npm --prefix frontend run test -- src/app/admin/fansubs/[id]/edit/AnimeContributionModal.test.tsx` | PASS | 5 tests passed, including hidden project-team rows being saved as public/confirmed. |
| `cd backend; go test ./internal/repository -run "TestGroupContributorsRepository|TestGetProjectContributors"` | PASS | Public contributors query keeps member_id-anchored project-team rows visible behind the public gates. |
| `npm --prefix frontend run test -- src/components/fansubs/ProjectMemberRows.test.tsx src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx` | PASS | 6 tests passed, including project member avatar rendering. |
| `git diff --check` | PASS | No whitespace/conflict-marker issues; Git reported LF-to-CRLF warnings only. |

## Route And Viewport Evidence

Local app: `http://127.0.0.1:3000` via existing Docker dev stack. Backend was rebuilt once with `docker compose up -d --build team4sv30-backend`; frontend was restarted after route/CSS changes.

Supporting browser automation: `npx --yes -p playwright@1.51.1 node -` with installed Chrome. This is supporting evidence only; final visual acceptance remains manual.

### Entry Route

| Check | Result |
| --- | --- |
| `/fansubs/c-subs` Viper's Creed card `href` | PASS: `/fansubs/c-subs/fansubprojekt/vipers-creed` |
| Link pattern | PASS: `aria-label="Fansub-Projekt oeffnen: Viper's Creed"` |
| Click target | PASS: browser click landed on `/fansubs/c-subs/fansubprojekt/vipers-creed` |
| Sample pretty links | `/fansubs/c-subs/fansubprojekt/vipers-creed`, `/fansubs/c-subs/fansubprojekt/15-bishoujo-hyouryuuki`, `/fansubs/c-subs/fansubprojekt/aki-sora` |

### Route Identity

| Route | Result |
| --- | --- |
| `/fansubs/c-subs/fansubprojekt/vipers-creed` | PASS: HTTP 200; renders Viper's Creed project page. |
| `/anime/13/group/1` | PASS: HTTP 200 compatibility route; canonical metadata points to `/fansubs/c-subs/fansubprojekt/arata-the-legend`. Local data maps Anime ID 13 to Arata the Legend, not Viper's Creed. |
| `/fansubs/c-subs/fansubprojekt/arata-the-legend` | PASS: HTTP 200; same public project identity as `/anime/13/group/1`. |

### Responsive Evidence

| Route | Viewport | Width metric | Horizontal overflow | Notes |
| --- | --- | --- | --- | --- |
| `/fansubs/c-subs/fansubprojekt/vipers-creed` | desktop 1366x900 | `1366/1366` | PASS | Same-Fansub nav present: `Vorheriges Fansub-Projekt -> /fansubs/c-subs/fansubprojekt/tristia-of-the-deep-blue-sea`; `Coop mit` link present: `Honto -> /fansubs/honto`. |
| `/fansubs/c-subs/fansubprojekt/vipers-creed` | tablet portrait 768x1024 | `768/768` | PASS | Same nav and coop link remain present. |
| `/fansubs/c-subs/fansubprojekt/vipers-creed` | mobile 390x844 | `390/390` | PASS | No horizontal overflow measured. |
| `/anime/13/group/1` | desktop 1366x900 | `1366/1366` | PASS | Canonical to `/fansubs/c-subs/fansubprojekt/arata-the-legend`; same-Fansub prev/next links stay within C-Subs. |
| `/anime/13/group/1` | tablet portrait 768x1024 | `768/768` | PASS | No horizontal overflow measured. |
| `/anime/13/group/1` | mobile 390x844 | `390/390` | PASS | No horizontal overflow measured. |
| `/fansubs/c-subs/fansubprojekt/arata-the-legend` | desktop 1366x900 | `1366/1366` | PASS | Pretty route equivalent for the technical `/anime/13/group/1` identity. |
| `/fansubs/c-subs/fansubprojekt/arata-the-legend` | tablet portrait 768x1024 | `768/768` | PASS | No horizontal overflow measured. |
| `/fansubs/c-subs/fansubprojekt/arata-the-legend` | mobile 390x844 | `390/390` | PASS | No horizontal overflow measured. |

### Labels, Removed Sections, Release Title Safety

| Check | Result |
| --- | --- |
| `Releases zum Fansub` | PASS: visible on checked project routes. |
| `Geschichte des Fansub-Projekts` | PASS after human-reported gap fix: visible on `/fansubs/c-subs/fansubprojekt/vipers-creed` and `/anime/13/group/1`; empty public story data renders `Noch kein öffentlicher Projekttext hinterlegt.` |
| `Mitwirkende am Fansub-Projekt` | PASS after human-reported gap fix: visible on `/fansubs/c-subs/fansubprojekt/vipers-creed` and `/anime/13/group/1`; empty public project-role data renders `Noch keine öffentlichen Projektrollen hinterlegt.` |
| `Neuestes Release` | PASS: absent. |
| `Weitere Releases` | PASS: absent. |
| Global empty summary `Weitere Bereiche sind noch nicht ...` | PASS: absent. |
| Standalone `OP/ED/Middle` | PASS: absent. |
| Standalone `Medien` | PASS: absent. |
| Release title unsafe strings | PASS: no `.mkv`, `.mp4`, `.avi`, `.m2ts`, Windows paths, or UNC path markers detected in the release section text of the checked routes. |

## Human Visual Acceptance

Partial human result recorded 2026-07-14:

| Item | Result |
| --- | --- |
| 1. `/fansubs/c-subs` -> Viper's Creed pretty route | approved |
| 2. `/anime/13/group/1` compatibility route | approved |
| 3. Desktop/tablet/mobile responsive behavior | approved |
| 4. Exact visible section labels | initially failed: "alle daten fehlen"; fixed with scoped empty-state section rendering and ready for recheck |
| 5. Removed sections/copy | approved |

Final result: all Phase 102 public-project UAT blockers were fixed and accepted through the live correction loop. The remaining release-segment work was clarified as the public Fansub project release segment, implemented through the shared `PublicReleaseBlock`, and verified in Docker.

## Final Closure Addendum - 2026-07-16

### Public Release Segment Acceptance

| Check | Result |
| --- | --- |
| Segment target | PASS: applies to the public Fansub project page under `Releases zum Fansub`, not the internal edit/workspace release component. |
| Heading copy | PASS: `Neuestes Fansub-Release` is used for the featured public release. |
| Redundant badges | PASS: image card does not repeat a Folge badge; time badges and the `00:00` start label were removed from the compact project-page timeline. |
| Count labels | PASS: uses `Bilder`, `Texte`, and neutral `Fansubber`. |
| Mobile shape | PASS: public release block has a mobile-specific stacked shape and a `Karas` heading above the Kara timeline. |
| Timeline design | PASS: project-page segment uses a slim, glassy timeline with rectangular Kara elements and subtle track color pull; richer single-release timeline remains deferred for release detail page design. |

### Activity-Based Newest Release

| Check | Result |
| --- | --- |
| Backend API | PASS: `release-list?sort=activity` is additive and keeps default ordering unchanged when omitted. |
| Activity source | PASS: latest public/published release notes and approved public release media drive `last_activity_at`. |
| Project page integration | PASS: the public project page requests `sort=activity` for the release preview list and displays the first item as newest. |
| Direct API verification | PASS: `http://127.0.0.1:18092/api/v1/anime/1/group/1/release-list?limit=3&sort=activity` returned items sorted by `last_activity_at`. |

### Final Docker Verification

| Command / Route | Result | Notes |
| --- | --- | --- |
| `docker compose build team4sv30-backend` | PASS | Backend image rebuilt with activity sort changes. |
| `docker compose up -d --no-deps --force-recreate team4sv30-backend` | PASS | Backend container recreated. |
| `docker compose restart team4sv30-frontend` | PASS | Frontend dev container restarted after UI changes. |
| `http://127.0.0.1:3000/fansubs/c-subs/fansubprojekt/vipers-creed?codexRefresh=4` | PASS | HTTP 200; HTML contained `PublicReleaseBlock`, `Neuestes Fansub-Release`, and the activity-selected public release. |

### Final Automated Gates

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- "src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx" "src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx" "src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx" "src/app/anime/[id]/group/[groupId]/page.test.tsx"` | PASS | 4 files passed, 22 tests passed. |
| `npm run typecheck` | PASS | Frontend TypeScript check passed. |
| `npx eslint -- "src/app/anime/[id]/group/[groupId]/projectPageData.ts" "src/app/anime/[id]/group/[groupId]/ProjectPage.tsx" "src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx" "src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx" "src/components/fansubs/PublicReleaseBlock.tsx"` | PASS | Focused lint for final closure files passed. |
| `go test ./internal/repository ./internal/handlers` | PASS | Backend repository/handler tests passed. |
| `git diff --check` | PASS | No whitespace/conflict-marker issues; LF-to-CRLF warnings only. |

### Residual Notes

- A broad accidental frontend test command also included unrelated admin anime tests; those failed on existing auth/permission loading behavior outside the final Phase 102 release/public-project slice. The exact relevant Phase 102 tests passed.
- Docker frontend logs still showed Watchpack `ENOMEM` scan warnings, but the checked public route served successfully.
