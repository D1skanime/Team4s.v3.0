# Phase 91 SUMMARY - Meine Projekte / Letzte Projekte

Date: 2026-06-29

## Result

Phase 91 is implemented as a narrow profile-project aggregation slice.

The member profile hub now treats `recent_contributions` as anime projects instead of release/role rows. A member who has multiple release-version or release-credit rows for the same anime is shown as one anime card in "Letzte Projekte". Roles and fansub groups are merged and deduplicated on that card.

## Decision

Grouping uses `anime_id`.

This is correct for the profile hub because "Letzte Projekte" is member-centric and anime-project oriented. `anime_id + fansub_group_id` would still duplicate one anime when the member worked on it through multiple groups. Fansub group context remains visible as aggregated metadata.

## Backend

- `MemberProfileRecentContribution` now includes:
  - `fansub_group_names`
  - `role_names`
  - `role_labels`
  - `release_version_count`
  - `episode_count`
- `loadRecentContributions` keeps ownership anchored on `release_member_roles.member_id`.
- Anime resolution still uses the canonical `fansub_releases -> episodes -> anime` path.
- The query aggregates rows by `anime_id`, orders projects by latest contribution timestamp, and preserves the hub `LIMIT 3`.
- Source-invariant coverage was added for anime-level grouping, distinct role/group aggregation, and release-version/episode counts.

## Frontend

- The shared profile `RecentContributionsSection` renders "Letzte Projekte".
- It defensively merges duplicate `anime_id` rows before rendering.
- It deduplicates repeated roles and group names.
- It displays release-version and episode counts when present.
- `/me/contributions` was not changed; its existing anime grouping remains intact.

## API Contract

- `shared/contracts/openapi.yaml` documents the additive recent-contribution fields.
- Existing scalar fields remain in place for compatibility.

## Validation

Passed:

- `cd frontend && npm run typecheck`
- `cd frontend && npm test -- --run src/components/profile/RecentContributionsSection.test.tsx`
- `cd frontend && npm test -- --run src/components/contributions`
- `cd frontend && npm run lint` (0 errors, existing warnings remain)
- `cd backend && go test ./internal/repository -run TestMemberProfileRepositorySourceInvariants -count=1`
- `git diff --check`

Broad-suite baseline failures still present and not introduced by Phase 91:

- `cd frontend && npm test -- --run` fails with 15 unrelated existing failures in admin anime tests, no-token boundary source scans, fansub public page source invariant, Jellyfin cover URL expectation, and one member contribution filter assertion.
- `cd backend && go test ./...` fails in existing source-invariant tests:
  - `TestContributionUpsert_FourColumnConflict`
  - `TestPhase69AnimeContributionMutationsUseRouteScope`
  - `TestGetMemberIDForContribution_MethodExists`

## Files Changed

- `backend/internal/models/member_profile.go`
- `backend/internal/repository/member_profile_repository.go`
- `backend/internal/repository/member_profile_repository_test.go`
- `frontend/src/components/profile/RecentContributionsSection.tsx`
- `frontend/src/components/profile/RecentContributionsSection.test.tsx`
- `frontend/src/types/profile.ts`
- `shared/contracts/openapi.yaml`
- `.planning/quick/260629-phase91-profile-projects/DISCUSS.md`
- `.planning/quick/260629-phase91-profile-projects/PLAN.md`
- `.planning/quick/260629-phase91-profile-projects/SUMMARY.md`

## Remaining Risks

- The profile recent project source remains legacy `release_member_roles`; Phase 91 did not migrate it to `anime_contributions`.
- The full frontend/backend suites are still blocked by unrelated baseline failures listed above.
- Public member profile preview uses the same component and benefits from aggregation, but visibility semantics were not changed in this phase.
