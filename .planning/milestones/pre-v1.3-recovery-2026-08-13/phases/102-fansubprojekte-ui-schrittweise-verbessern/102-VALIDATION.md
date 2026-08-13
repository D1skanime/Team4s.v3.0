---
phase: 102
slug: fansubprojekte-ui-schrittweise-verbessern
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-14
---

# Phase 102 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x for frontend; Go test for targeted backend/API DTO changes |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId] src/components/fansubs src/components/groups` |
| **Full suite command** | `npm --prefix frontend run typecheck && npm --prefix frontend run test && npm --prefix frontend run lint` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run the touched frontend test files plus `git diff --check`.
- **After every plan wave:** Run `npm --prefix frontend run typecheck && npm --prefix frontend run test`.
- **Before `$gsd-verify-work`:** Full relevant frontend suite must be green; add targeted Go/API tests if a DTO/API contract changes.
- **Max feedback latency:** 5 minutes for focused checks, excluding live browser UAT.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 102-01-task-1 | 102-01 | 1 | D-02/D-07/D-21 | T-102-slug | Technical numeric route parsing and existing public API visibility behavior are preserved during loader extraction. | unit/typecheck | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/page.test.tsx`; `npm --prefix frontend run typecheck` | planned | mapped |
| 102-01-task-2 | 102-01 | 1 | D-02/D-05/D-07 | T-102-public-data | Shared composition preserves current visible page behavior before later slices change it. | unit/source | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/page.test.tsx`; `git diff --check` | planned | mapped |
| 102-01-task-3 | 102-01 | 1 | D-01 | T-102-public-data | User accepts that extraction did not regress the technical route before the next wave. | live UAT checkpoint | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/page.test.tsx` | planned | mapped |
| 102-02-task-1 | 102-02 | 2 | D-08/D-21/D-22 | T-102-slug | `anime_slug` is contract-aligned across backend model, repository, OpenAPI, and frontend DTO. | backend/source/typecheck | `cd backend; go test ./internal/repository -run TestFansubRepository_PublicProfileSourceInvariants`; `npm --prefix frontend run typecheck`; `git diff --check` | planned | mapped |
| 102-02-task-2 | 102-02 | 2 | D-02/D-04/D-08/D-21/D-22 | T-102-slug | Pretty route exact slug matching prevents ID/slug mismatch and technical route remains compatible. | unit/typecheck | `npm --prefix frontend run test -- src/components/fansubs/__tests__/FansubProjectsSection.test.tsx src/app/anime/[id]/group/[groupId]/page.test.tsx`; `npm --prefix frontend run typecheck` | planned | mapped |
| 102-02-task-3 | 102-02 | 2 | D-01/D-08/D-21/D-22 | T-102-slug | User accepts profile-to-pretty-route navigation and technical-route canonical identity before hero work starts. | live UAT checkpoint | `npm --prefix frontend run test -- src/components/fansubs/__tests__/FansubProjectsSection.test.tsx src/app/anime/[id]/group/[groupId]/page.test.tsx` | planned | mapped |
| 102-03-task-1 | 102-03 | 3 | D-09/D-23 | T-102-nav | Further-project navigation is built only from the current Fansub profile project list. | unit/typecheck | `npm --prefix frontend run test -- src/lib/fansubProjectNavigation.test.ts`; `npm --prefix frontend run typecheck` | planned | mapped |
| 102-03-task-2 | 102-03 | 3 | D-03/D-04/D-10/D-23/D-24 | T-102-nav | `Weitere Projekte` and `Coop mit` are separated in the hero and do not spoof cross-group navigation as same-Fansub navigation. | unit/typecheck | `npm --prefix frontend run test -- src/lib/fansubProjectNavigation.test.ts src/app/anime/[id]/group/[groupId]/page.test.tsx`; `npm --prefix frontend run typecheck`; `git diff --check` | planned | mapped |
| 102-03-task-3 | 102-03 | 3 | D-01/D-03/D-04/D-10/D-23/D-24 | T-102-nav | User accepts hero-card navigation placement and cooperation links across desktop, tablet, and mobile before story/member work starts. | live UAT checkpoint | `npm --prefix frontend run test -- src/lib/fansubProjectNavigation.test.ts src/app/anime/[id]/group/[groupId]/page.test.tsx` | planned | mapped |
| 102-04-task-1 | 102-04 | 4 | D-06/D-11/D-13 | T-102-richtext | Story rich text uses existing sanitized rendering and the exact locked title. | unit/typecheck | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/sections/StorySection.test.tsx`; `npm --prefix frontend run typecheck` | planned | mapped |
| 102-04-task-2 | 102-04 | 4 | D-01/D-05/D-11 | T-102-richtext | User accepts story title, layout, and single-block collapse behavior before member work starts. | live UAT checkpoint | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/sections/StorySection.test.tsx` | planned | mapped |
| 102-04-task-3 | 102-04 | 4 | D-12/D-25/D-26 | T-102-public-data | Member rows show only project-scoped roles and link only to existing safe member routes after story acceptance. | unit/typecheck | `npm --prefix frontend run test -- src/components/fansubs/ProjectMemberRows.test.tsx src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx`; `npm --prefix frontend run typecheck`; `git diff --check` | planned | mapped |
| 102-04-task-4 | 102-04 | 4 | D-01/D-05/D-12/D-25/D-26 | T-102-public-data | User accepts member copy, public Fansub member-row layout, project-scoped roles, and member links before release work starts. | live UAT checkpoint | `npm --prefix frontend run test -- src/components/fansubs/ProjectMemberRows.test.tsx src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx` | planned | mapped |
| 102-05-task-1 | 102-05 | 5 | D-18 | T-102-release-title | Public release title fields use curated names or neutral fallbacks and the OpenAPI contract documents that semantics. | backend/contract | `cd backend; go test ./internal/repository -run "Test.*Public.*Release.*Title|Test.*Release.*Title.*Fallback"`; `$contract = Get-Content -Raw shared/contracts/openapi.yaml; if ($contract -notmatch "raw import" -or $contract -notmatch "neutral fallback") { throw "OpenAPI release title fallback semantics missing" }`; `git diff --check` | planned | mapped |
| 102-05-task-2 | 102-05 | 5 | D-15/D-16/D-27 | T-102-release-title | Release section is retitled conservatively and no newest-release block renders. | unit/typecheck | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx`; `npm --prefix frontend run typecheck`; `git diff --check` | planned | mapped |
| 102-05-task-3 | 102-05 | 5 | D-01/D-15/D-16/D-18/D-27 | T-102-release-title | User accepts release heading, latest-block removal, and raw-title absence before page-flow cleanup starts. | live UAT checkpoint | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx` | planned | mapped |
| 102-06-task-1 | 102-06 | 6 | D-14/D-17/D-28 | T-102-public-data | Obsolete section nav, global empty summary, OP/ED/Middle, and Medien standalone surfaces are absent without deleting APIs. | unit/typecheck | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/page.test.tsx`; `npm --prefix frontend run typecheck` | planned | mapped |
| 102-06-task-2 | 102-06 | 6 | D-14/D-17/D-28 | T-102-public-data | Tests encode absence of removed page surfaces instead of old empty-summary behavior. | unit/source | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/page.test.tsx`; `git diff --check` | planned | mapped |
| 102-06-task-3 | 102-06 | 6 | D-01/D-14/D-17/D-28 | T-102-public-data | User accepts final page-flow removals before final evidence pass starts. | live UAT checkpoint | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/page.test.tsx` | planned | mapped |
| 102-07-task-1 | 102-07 | 7 | D-01/D-04/D-18/D-21/D-22 | T-102-release-title | Automated pre-UAT gates and release-title checks are recorded in evidence. | evidence/source | `Test-Path .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-UAT-EVIDENCE.md` | planned | mapped |
| 102-07-task-2 | 102-07 | 7 | D-02/D-03/D-04/D-08/D-21/D-22/D-23/D-24/D-28 | T-102-slug | Live route and responsive evidence covers profile entry, pretty route, technical route, desktop, tablet, mobile, and removed sections. | evidence/live UAT | `Select-String -Path .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-UAT-EVIDENCE.md -Pattern "/fansubs/c-subs","/anime/13/group/1","desktop","tablet","mobile","Releases zum Fansub"` | planned | mapped |
| 102-07-task-3 | 102-07 | 7 | D-01/D-04 | T-102-slug | Final human visual acceptance is recorded before phase completion. | blocking human checkpoint | `Select-String -Path .planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-UAT-EVIDENCE.md -Pattern "Human visual acceptance","approved"` | planned | mapped |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] Plan 102-06 maps removal/replacement of `frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx` cases for `buildEmptyAreaLabels`; expected behavior is no global empty summary.
- [x] Plan 102-02 maps pretty-route tests for `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]` route source/composition after route exists.
- [x] Plan 102-02 maps contract/source assertion for `PublicFansubProject.anime_slug` after DTO change.
- [x] Plan 102-03 maps same-Fansub navigation tests proving `Weitere Projekte` never changes to a different group.
- [x] Plan 102-05 maps release-section tests to reject `Neuestes Release` and assert `Releases zum Fansub`.
- [x] Plans 102-01 through 102-07 map blocking live visual/UAT evidence for each accepted slice, including desktop, tablet portrait, and mobile where the slice is visual.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Desktop/tablet/mobile visual fit | D-03/D-04 | Visual quality and responsive layout need shared browser/screenshot review. | Open `http://127.0.0.1:3000/anime/13/group/1` and later the pretty URL; inspect desktop, tablet portrait, and mobile. |
| Pretty URL public navigation | D-21/D-22 | Needs live route/navigation check against local data. | Start at `/fansubs/c-subs`, open a project card, confirm it lands on `/fansubs/c-subs/fansubprojekt/vipers-creed` or equivalent seeded slug. |
| Coop hero hint wording | D-24 | Requires data case with multiple groups/coop. | Confirm hero shows `Coop mit ...` with clickable other group names only when cooperation data exists. |

---

## Security Domain

| Threat Ref | Pattern | Standard Mitigation |
|------------|---------|---------------------|
| T-102-slug | ID/slug mismatch exposes the wrong Fansub project. | Resolve pretty route to the exact `(anime_id, fansub_group_id)` relation and call existing scoped endpoints. |
| T-102-public-data | Public hidden content leaks through UI shortcuts. | Keep visibility/status filtering in backend public endpoints; do not introduce client-only filtering as a substitute. |
| T-102-release-title | Raw technical release filenames appear publicly. | Apply D-18 curated-name/fallback rule before accepting the release-section slice. |
| T-102-media-domain | Media ownership tables are crossed or duplicated. | Do not create upload/media endpoints or attach release media to the wrong domain entity. |
| T-102-richtext | Rich text story content renders unsanitized HTML. | Reuse the existing sanitized rich-text/story renderer seam. |

---

## Validation Sign-Off

- [x] All tasks have automated verification or a documented manual UAT item.
- [x] Sampling continuity: no 3 consecutive tasks without automated verification.
- [x] Wave 0 covers all missing test references.
- [x] No watch-mode flags in verification commands.
- [x] Feedback latency < 5 minutes for focused checks.
- [x] `nyquist_compliant: true` set in frontmatter after execution plans include the mapped checks.

**Approval:** planning checks mapped; execution approval remains per-slice through blocking checkpoints.

**Closure:** completed 2026-07-16 after `102-UAT.md`, `102-UAT-EVIDENCE.md`, `102-REVIEW.md`, and `102-07-SUMMARY.md` recorded the final live/Docker acceptance pass.
