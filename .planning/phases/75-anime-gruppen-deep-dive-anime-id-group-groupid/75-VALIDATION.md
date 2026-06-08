---
phase: 75
slug: anime-gruppen-deep-dive-anime-id-group-groupid
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-05
verified: 2026-06-08
---

# Phase 75 - Validation Strategy

Per-phase validation contract and verified evidence for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Vitest 3 (Frontend) + testify (Go-Backend) |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run 'src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx'` |
| Full suite command | `cd frontend && npm test` |
| Estimated runtime | ~30 seconds for focused Phase-75 checks |

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-------------------|-------------|--------|
| 75-01-01 | 01 | 1 | D, G, K | `parseAnimeID`/`parseGroupID` reject invalid IDs; public projections are scoped and visibility-gated; contributor response slices are non-nil. | `cd backend && go build ./cmd/server/... && go test ./internal/repository/ -run "GetProjectContributors\|GetPublicGroupThemes\|GroupPublicMedia"` | `backend/internal/repository/group_contributors_repository_test.go` | green 2026-06-08 |
| 75-01-02 | 01 | 1 | D, K | Handler and routes compile; TypeScript types match Go JSON tags. | `cd backend && go build ./cmd/server/...`; `cd frontend && npm run typecheck` | N/A | green 2026-06-08 |
| 75-02-01 | 02 | 2 | D, A | `projectNotesHtml` is routed through `CollapsibleStory`; invalid group/anime IDs are guarded before rendering. | `cd frontend && npm run typecheck` | N/A | green 2026-06-08 |
| 75-02-02 | 02 | 2 | D, A, K | `page.tsx` remains an orchestrator (120 lines); `GroupSectionsNav` links to five real section anchors. | `cd frontend && npm run typecheck && npm run build` | N/A | green 2026-06-08 |
| 75-03-01 | 03 | 3 | D, G, K | `TeamSection` renders separate team/external blocks; `member_slug != null` links to `/members/[slug]`; empty arrays show `EmptyState`. | `cd frontend && npx vitest run 'src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx'` | `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx` | green 2026-06-08 |
| 75-03-02 | 03 | 3 | D, G, K | `page.tsx` calls all three new API helpers with try/catch empty defaults; `MediaSection` is always in the DOM. | `cd frontend && npm run typecheck && npm run build` | N/A | green 2026-06-08 |
| 75-03-D11 | 03 | audit | D-11 | Public release summaries expose one row per `release_versions` entry and preserve `version_label` (`v1`/`v2`) instead of collapsing multiple versions for one episode. | `cd backend && go test ./internal/repository/ -run GetGroupReleases` | `backend/internal/repository/group_repository_test.go` | green 2026-06-08 |

## Wave 0 Requirements

- [x] `backend/internal/repository/group_contributors_repository_test.go` - GetProjectContributors scoping, visibility gate, empty-result non-nil slice.
- [x] `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.test.tsx` - two-block separation, claim-based linking, empty state rendering.

## Manual / Browser UAT

Verified on 2026-06-08 against the live dev stack:

- Frontend: `http://127.0.0.1:3000`
- Backend: `http://localhost:8092`
- Route: `/anime/3/group/88`

Evidence:

- Public endpoints returned 200:
  - `/api/v1/anime/3/group/88`
  - `/api/v1/anime/3/group/88/contributors`
  - `/api/v1/anime/3/group/88/themes`
  - `/api/v1/anime/3/group/88/release-media`
  - `/api/v1/anime/3/group/88/project-note`
- Desktop 1440px:
  - section anchors present: `#story`, `#team`, `#releases`, `#themes`, `#medien`
  - nav labels present: Geschichte, Beteiligte, Releases, OP/ED/Middle, Medien
  - `Angeldust` and `OldBoy` are visible as external contributors and link to `/members/angeldust` and `/members/oldboy`
  - release highlights show Naruto episode releases and link to `/anime/3/group/88/releases`
  - release highlights render available version labels; live Naruto data currently contains only `v1`
  - story, themes, and release-media sections show honest EmptyStates where no public data exists
  - no horizontal overflow
- Mobile 375px:
  - `documentElement.scrollWidth == clientWidth == 375`
  - horizontal chip nav is scrollable without document overflow
- Console:
  - no reproducible render error on clean `127.0.0.1` run
  - expected development-only HMR/React DevTools messages only

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency below 60s for focused tests
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-06-08
