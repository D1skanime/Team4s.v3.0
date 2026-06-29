# Phase 91 DISCUSS - Meine Projekte / Letzte Projekte

Date: 2026-06-29

## Verified Current State

- Phase 90 is closed and committed as `3247f9ad feat(phase-90): harden release and group media flows`.
- The worktree was clean before Phase 91 analysis.
- `/me/profile` renders `profile.recent_contributions` through `frontend/src/components/profile/RecentContributionsSection.tsx`.
- `/me/profile` obtains those rows from `backend/internal/repository/member_profile_repository.go::loadRecentContributions`.
- That query reads legacy release credits from `release_member_roles`, joins through `fansub_releases -> episodes -> anime`, and deduplicates by `release_id + role_id` before applying `LIMIT 3`.
- `/me/contributions` uses `getMyAnimeContributions`, backed by `AnimeContributionsRepository.ListByMemberIDWithProposalFields`, and the frontend groups confirmed entries by `anime_id` in `MyContributionsSection`.

## Problem

The profile hub is currently release-credit oriented. Because its recent rows are release/role rows, the same anime can appear multiple times when a member has several release or release-version-scoped credits for the same anime. This conflicts with the section label "Letzte Projekte" and with `/me/contributions`, where the user-facing project unit is already an anime group.

## Grouping Decision

Use `anime_id` as the profile hub grouping key.

Reasons:

- The requirement says one anime must not appear multiple times in "Letzte Projekte" just because multiple release versions exist.
- The profile page is a member-centric hub, not a group administration view.
- `/me/contributions` already groups confirmed contribution cards by `anime_id`.
- Fansub group context remains important, but it is metadata inside an anime project card rather than part of the card identity.
- Grouping by `anime_id + fansub_group_id` would still allow the same anime to appear twice for members who worked on the same anime across multiple groups, which violates the user-facing expectation for this hub.

## Constraints

- Keep contribution ownership anchored on `member_id`.
- Do not alter permissions or contribution mutation behavior.
- Do not add migrations.
- Preserve release-version architecture and canonical joins through `fansub_releases -> episodes -> anime`.
- Keep `/me/contributions` behavior intact.
