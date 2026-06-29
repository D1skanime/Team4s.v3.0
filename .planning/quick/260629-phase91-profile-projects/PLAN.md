# Phase 91 PLAN - Profile Project Aggregation

Date: 2026-06-29

## Backend Changes

- Update `backend/internal/models/member_profile.go`.
  - Keep existing scalar fields for compatibility.
  - Add aggregated metadata to `MemberProfileRecentContribution`:
    - `fansub_group_names`
    - `role_names`
    - `role_labels`
    - `release_version_count`
    - `episode_count`
- Update `backend/internal/repository/member_profile_repository.go`.
  - Change `loadRecentContributions` to aggregate by `anime_id`.
  - Preserve member ownership with `WHERE rmr.member_id = $1`.
  - Preserve canonical anime resolution through `fansub_releases -> episodes -> anime`.
  - Count distinct release versions and episodes.
  - Order projects by latest contribution timestamp and keep the hub `LIMIT 3`.
- Update `backend/internal/repository/member_profile_repository_test.go`.
  - Add source invariants for anime-level grouping and distinct counts.

## Frontend Changes

- Update `frontend/src/types/profile.ts` for the additive DTO fields.
- Update `frontend/src/components/profile/RecentContributionsSection.tsx`.
  - Render project cards from aggregated project data.
  - Defensively merge duplicate `anime_id` rows if older/stale API data reaches the component.
  - Deduplicate role labels and group names.
  - Show release-version and episode counts when available.
- Add focused tests for the real shared profile component.

## API Contract Changes

- Update `shared/contracts/openapi.yaml` for the additive recent-contribution fields.
- The change is backward compatible because existing scalar fields remain present.

## Risks

- Existing broad test suites already contain unrelated failures from older source-invariant and UI tests; Phase 91 validation must distinguish new failures from known baseline failures.
- `release_member_roles` is still the source for the profile recent hub. This phase fixes project aggregation without migrating the profile hub to the newer `anime_contributions` source.
- Public member profile preview uses the same recent contribution component; additive aggregation should improve it, but no visibility semantics are changed in this phase.

## Why This Is Correct

The profile hub should answer "which anime projects has this member recently worked on?" rather than "which release rows exist?". `anime_id` is therefore the correct identity for cards. Fansub groups, roles, release-version count, and episode count describe the project and are merged into the card without changing contribution ownership, permissions, or storage architecture.
