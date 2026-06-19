# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Branch:** `main`
- **Current phase:** Phase 82 completed; Phase 83 next.
- **Latest product commit:** `076a4f31 feat: finish phase 82 fansub release cockpit`
- **Runtime:** Docker backend was rebuilt after the final `/me/contributions` fix and is running on `:8092`.

## What Works Now
- Fansub release cockpit at `/admin/fansubs/[id]/edit?tab=releases` supports paged release loading and avoids eagerly loading all release rows.
- Project overview and release/member coverage UI has the Phase-82 cockpit baseline.
- `/me/contributions` now handles both canonical `anime_contributions.member_id` and older historical-member-linked rows.
- `/me/releases/[versionId]/workspace` exists for contributor-owned release media and notes.
- Release-version media still uses existing `release_version_media` flow; no new upload path was introduced.

## What Is Not Done Yet
- Phase 83 must implement pro-release contributor assignment and derived default membership from project-wide contributions.
- Project-wide contributions currently do not expose per-release workspace buttons unless Phase 83 derives concrete release workspace entries.
- Full handler package tests still hit an unrelated existing compile error in `backend/internal/handlers/contribution_proposals_me_test.go` referencing removed `AnimeContributionRow.FansubGroupMemberID`.
- Live browser re-check after hard reload should confirm Aki sees Naruto Projektleitung on `/me/contributions`.

## Valid Commands
- `cd backend && go build ./...`
- `cd backend && go test ./internal/repository -run "TestAdminContentFansubReleases|TestAnimeContributionsMeQueriesUseMemberIDAnchorFallback"`
- `cd backend && go test ./internal/handlers -run "TestContributionsMeOwnershipUsesMemberIDAnchorFallback|TestRejectContributionRequiresReason"` currently blocked by unrelated compile errors in `contribution_proposals_me_test.go`.
- `cd frontend && npm run typecheck`
- `cd frontend && npm run test -- src/app/admin/fansubs/[id]/edit/page.test.tsx`
- `cd frontend && npm run test -- src/components/contributions/ContributionCard.test.tsx src/app/me/releases/[versionId]/workspace/page.test.tsx src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx`
- `git diff --check`
- `git status --short --branch`

## Verification Evidence
- `npm run typecheck` passed for frontend Phase-82 changes.
- Fansub edit focused test passed: `npm run test -- src/app/admin/fansubs/[id]/edit/page.test.tsx`.
- `/me` workspace tests passed: ContributionCard, workspace page, and ReleaseVersionNotesTab focused tests.
- `go build ./...` passed.
- Repository focused tests passed for fansub releases and `member_id` anchor fallback.
- `git diff --check` passed before the Phase-82 commit.
- Backend rebuild succeeded: `docker compose up -d --build team4sv30-backend`.

## Top 3 Next
1. Start Phase 83 with the smallest visible slice: derive Aki's Naruto project-wide contribution into concrete release workspace availability for Naruto Folge 1/v1.
2. Build the pro-release contributor override/editor so default project team can be changed per release.
3. Fix or update the stale `contribution_proposals_me_test.go` structs so `go test ./internal/handlers` can compile again.

## Risks / Blockers
- Do not materialize hundreds of per-release rows just to show defaults unless Phase 83 explicitly chooses that tradeoff.
- Keep contributor `/me` surfaces separate from admin cockpit surfaces.
- Keep release media attached to `release_version_id`.
- `tmp/` is untracked local state and should stay out of commits.
