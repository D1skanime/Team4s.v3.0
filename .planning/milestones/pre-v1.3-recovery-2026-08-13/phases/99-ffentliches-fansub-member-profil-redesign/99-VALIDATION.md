---
phase: 99
slug: ffentliches-fansub-member-profil-redesign
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-07
source:
  - 99-CONTEXT.md
  - 99-RESEARCH.md
  - 99-00-PLAN.md
  - 99-01-PLAN.md
  - 99-02-PLAN.md
  - 99-03-PLAN.md
  - 99-04-PLAN.md
---

# Phase 99 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Backend)** | go test |
| **Framework (Frontend)** | Vitest with jsdom |
| **Config files** | `backend/go.mod`, `frontend/vitest.config.ts`, `frontend/package.json` |
| **Quick backend command** | `cd backend && go test ./internal/repository -run "PublicMember(Profile\|Latest\|Previous\|Current\|Media)"` |
| **Quick frontend command** | `cd frontend && npm run test -- src/app/members/[slug]/page.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/profile/LatestContributionsSection.test.tsx src/components/profile/MemberStorySection.test.tsx src/components/profile/PreviousContributionsSection.test.tsx` |
| **Full focused gate** | backend quick + frontend quick + `cd frontend && npm run typecheck` + `cd frontend && npm run lint` + `git diff --check` |
| **Browser gate** | public `/members/[slug]` at desktop and one mobile viewport <= 390px |

---

## Sampling Rate

- **After every task:** Run the automated command listed in that task's `<verify>` block.
- **After every wave:** Run the focused backend/frontend commands for all Phase 99 touched surfaces plus `git diff --check`.
- **Before human UAT:** Run backend quick, frontend quick, `npm run typecheck`, `npm run lint`, forbidden-regression grep gate, and browser checks.
- **Max feedback latency target:** keep focused checks under a few minutes; document unrelated dirty-worktree failures separately.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 99-00-1 | 00 | 0 | D-03/D-04/D-05/D-08-D-10/D-14/D-17/A-01/A-02/A-04/A-05 | unit (Go, RED) | `cd backend && go test ./internal/repository -run "PublicMember(Profile\|Latest\|Previous\|Current\|Media)"` | pending |
| 99-00-2 | 00 | 0 | D-01/D-02/D-06/D-07/D-08-D-12/A-03 | unit (Vitest, RED) | `cd frontend && npm run test -- src/app/members/[slug]/page.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/profile/LatestContributionsSection.test.tsx` | pending |
| 99-00-3 | 00 | 0 | D-13/D-14/D-19/A-04 | unit (Vitest, RED) | `cd frontend && npm run test -- src/components/profile/MemberStorySection.test.tsx src/components/profile/PreviousContributionsSection.test.tsx` | pending |
| 99-01-1 | 01 | 1 | D-03-D-05/D-08-D-10/D-14-D-19/A-01/A-02/A-04/A-05 | contract + compile | `rg -n "current_projects\|latest_contributions\|previous_contributions_count" backend/internal/models/member_profile.go shared/contracts/openapi.yaml frontend/src/types/profile.ts` | pending |
| 99-01-2 | 01 | 1 | D-08-D-10/D-17/A-02 | unit (Go, GREEN) | `cd backend && go test ./internal/repository -run "PublicMember(Profile\|Latest\|Previous\|Current\|Media)"` | pending |
| 99-02-1 | 02 | 2 | D-01-D-07/D-15/D-16/D-18/A-01/A-03/A-05 | unit (Vitest, GREEN) | `cd frontend && npm run test -- src/app/members/[slug]/page.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/profile/MembershipsSection.test.tsx` | pending |
| 99-03-1 | 03 | 3 | D-08-D-14/D-15-D-19/A-02/A-04 | unit (Vitest, GREEN) | `cd frontend && npm run test -- src/app/members/[slug]/page.test.tsx src/components/profile/LatestContributionsSection.test.tsx src/components/profile/MemberStorySection.test.tsx src/components/profile/PreviousContributionsSection.test.tsx` | pending |
| 99-04-1 | 04 | 4 | D-01-D-20/A-01-A-05 | integration checks | backend quick + frontend quick + `cd frontend && npm run typecheck` + `cd frontend && npm run lint` + `git diff --check` | pending |
| 99-04-2 | 04 | 4 | D-20 | browser/UAT | desktop + mobile <=390px public profile route, with screenshots/notes | pending |
| 99-04-3 | 04 | 4 | D-01-D-20 | human verification | user reviews exact local `/members/[slug]` URL and approves or reports issues | pending |

---

## Wave 0 Requirements

- [ ] Backend RED tests for public profile current projects, latest public feed, previous-history period gate, media ownership, and multiple memberships.
- [ ] Frontend RED tests for route section order, no old tabs, badge chain/progress, latest text/media cards, story clamp, and previous-history reveal.
- [ ] Tests must fail on behavior gaps only, not setup or syntax errors.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Desktop public profile scan | D-01-D-19 | Visual density, section rhythm, card readability | Open the exact local `/members/[slug]` route and verify the locked section order and real data. |
| Mobile public profile scan <=390px | D-20 | CSS wrapping, horizontal overflow, and hero/card overlap require viewport rendering | Open the same route at <=390px width; check headings, buttons, badge chain, 16:9 media previews, and story clamp. |
| Story overflow toggle | D-13 | Real overflow depends on rendered DOM height | Confirm `Mehr lesen` appears only for visibly truncated long story and toggles to `Weniger anzeigen`. |
| Previous-history reveal | D-14/D-19 | User interaction and period readability | Confirm `Frühere Mitwirkungen anzeigen (n)` hides entries until click and no `ohne Jahr` appears. |

---

## Forbidden Regression Gates

- Public profile productive code must not use `release_media` as the latest-media source.
- Public profile route must not import or render the old tab navigation as the main profile structure.
- Public profile route must not import or render the old `MemberContributionFilters` + `MemberRoleTimeline` combination.
- Visible redesigned public profile copy must not include `Alle Beiträge anzeigen` or `ohne Jahr`.
- Latest media must remain release-version-scoped through `release_version_media`, `media_assets`, and `media_files` with real `release_version_id`.

---

## Validation Sign-Off

- [x] All Phase 99 requirements D-01 through D-20 and A-01 through A-05 have at least one automated or browser/human verification point.
- [x] Wave 0 creates RED tests for the highest-risk data and UI semantics.
- [x] Sampling continuity: no implementation wave proceeds without focused automated checks.
- [x] Contract drift is covered by OpenAPI + Go DTO + TypeScript type checks.
- [x] Nyquist validation artifact exists and is draft-ready before execution.
- [ ] Wave 0 complete.
- [ ] Final desktop/mobile browser UAT complete.

**Approval:** pending execution.
