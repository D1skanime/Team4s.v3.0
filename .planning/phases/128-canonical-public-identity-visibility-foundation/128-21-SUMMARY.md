# 128-21 SUMMARY — Execute reset, migrate, reseed, rebuild, gate

**Status:** Done (with documented mechanism deviation and one regression fix).

## Reset + migrate + reseed (live team4s_v2)
1. Guarded transaction: DB-identity + app-user (csubs-leader/sheppert, exactly
   2) assertions, then SET LOCAL session_replication_role=replica and
   TRUNCATE members RESTART IDENTITY CASCADE. Result: members=0,
   point_ledger_entries=0, anime=0. Guard triggers auto-restored at COMMIT.
2. Migration 0145 applied via backend startup auto-migrate. schema_migrations
   max=145; members.public_slug present.
3. Guarded reseed: inserted CSubs Leader/csubs-leader/private and
   Sheppert/sheppert/public with two verified phase128_fixture member_claims
   (2-row/2-claim invariant asserted). member ids 1,2.

## Root-cause fix: stale backend image
The backend Dockerfile.dev bakes source into the image (no code bind-mount).
The running image predated commit 128-12, so it failed to build with two
undefined repository methods. docker compose build team4sv30-backend rebuilt
from committed HEAD -> compiles, 'server listening on :8092', migrations
applied.

## Regression fix: useSearchParams without Suspense (committed fb3df4d8)
next build failed prerendering /admin/profile and /me/profile:
'useSearchParams() should be wrapped in a suspense boundary'. Introduced by
plan 128-19 deep-link work. Fixed by splitting me/profile/page.tsx into an
inner component wrapped in <Suspense>. Frontend prod build now green (23/23
static pages).

## Gate results
- Focused backend phase-128 tests (repository/handlers/migrations, TEAM4S_PHASE128_TEST_DSN): PASS.
- Backend full 'go test ./...': PASS (exit 0).
- Focused frontend tests (me/profile 45, members page 28, OwnHiddenProfilePreview 7, api.auth-refresh 25): PASS (105).
- Frontend prod build: PASS.
- Live D-09 (:3000 HTML): /members/phase128-missing=404, /members/csubs-leader(private,anon)=404, /members/sheppert(public)=200.

## Out of scope (NOT phase-128 regressions — do not waive as phase failures)
Frontend full suite: 12 failing tests across MemberBadgeChain (uncommitted
concurrent WIP: 'containe' typo + stale badgeProgress prop), MembershipsSection,
ResponsiveImage.config, ReleaseGallery, ReleaseVersionNotesTab,
admin/fansubs edit, api.no-token-boundary (Phase-49 file-existence allowlist).
All last-touched by non-128 commits (phase 49/98/quick-tasks) or by
uncommitted working-tree changes. Typecheck/lint errors localized to the
uncommitted MemberBadgeChain.test.tsx. Left untouched per concurrent-writer
discipline on main.

## Ops note
Docker disk hit 100% during rebuilds; reclaimed ~7GB via builder/image prune
(unused volumes left intact). Backup retained.
