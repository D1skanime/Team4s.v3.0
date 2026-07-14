---
phase: 102
slug: fansubprojekte-ui-schrittweise-verbessern
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 102-route-01 | TBD | TBD | D-21/D-22 | T-102-slug | Pretty route resolves only the matching Fansub project and keeps technical route compatible. | unit/source | `npm --prefix frontend run test -- src/app/fansubs src/components/fansubs` | missing | pending |
| 102-nav-01 | TBD | TBD | D-23/D-24 | T-102-nav | `Weitere Projekte` never navigates to another group for the same Anime; Coop groups render as hero links only. | unit/component | `npm --prefix frontend run test -- src/components/groups src/app/anime/[id]/group/[groupId]` | missing | pending |
| 102-members-01 | TBD | TBD | D-25/D-26 | T-102-public-data | Member rows show only project-scoped roles and reuse the public Fansub member UI pattern. | unit/component | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/sections` | partial | pending |
| 102-sections-01 | TBD | TBD | D-14/D-17/D-27/D-28 | T-102-public-data | Removed standalone sections do not leak hidden/technical data; release title is conservative. | unit/source | `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]` | partial | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Update or remove `frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx` cases for `buildEmptyAreaLabels`; expected behavior is no global empty summary.
- [ ] Add pretty-route tests for `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]` route source/composition after route exists.
- [ ] Add contract/source assertion for `PublicFansubProject.anime_slug` after DTO change.
- [ ] Add same-Fansub navigation tests proving `Weitere Projekte` never changes to a different group.
- [ ] Update release-section tests to reject `Neuestes Release` and assert `Releases zum Fansub`.
- [ ] Add live visual UAT evidence for desktop, tablet portrait, and mobile per accepted slice.

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

- [ ] All tasks have automated verification or a documented manual UAT item.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verification.
- [ ] Wave 0 covers all missing test references.
- [ ] No watch-mode flags in verification commands.
- [ ] Feedback latency < 5 minutes for focused checks.
- [ ] `nyquist_compliant: true` set in frontmatter after execution plans include the mapped checks.

**Approval:** pending
