# Phase 64 UAT

Date: 2026-06-02
Status: PASS

## Scope

Verified the Phase 64 member dashboard and public contribution surfaces against the local live stack:

- `/me/contributions`
- `/fansubs/animeownage`
- `/anime/3`
- `/members/phase64-uat-1780409688505`
- Phase 64 API endpoints for member contribution visibility, confirmation, badges, and public contribution aggregations

## Test Data

Temporary UAT data was seeded for member `PHASE64-UAT-1780409688505`:

- member_id: `15`
- hist_fansub_group_member_id: `11`
- anime_contribution_id: `5`
- fansub group: `88` / `AnimeOwnage`
- anime: `3` / `Naruto`
- role: `translator`

Cleanup completed after UAT. Verification query returned `0` remaining `PHASE64-UAT-%` members.

## API Results

PASS:

- `GET /api/v1/me/anime-contributions` returned the seeded contribution with `status=confirmed`, `role_codes=["translator"]`, and `role_labels=["Übersetzung"]`.
- `POST /api/v1/me/anime-contributions/5/confirm` kept the contribution confirmed and profile-visible.
- `PATCH /api/v1/me/anime-contributions/5/visibility` hid and restored member-profile visibility.
- `GET /api/v1/me/badges` returned historical badges, including `historical_leader`.
- `PATCH /api/v1/me/badges/11/visibility` hid the badge from the visible badge list and restored it to `public`.
- `GET /api/v1/fansubs/88/contributions` returned the public leader timeline entry for the UAT member.
- `GET /api/v1/anime/3/contributions` returned the `AnimeOwnage` group with the UAT contributor and role label `Übersetzung`.
- `GET /api/v1/members/phase64-uat-1780409688505/contributions` returned group-history and anime-contribution timeline entries.

## Browser Results

PASS via Playwright against `http://127.0.0.1:3000`:

- `/me/contributions` showed `Meine Beiträge`, `AnimeOwnage`, and `Übersetzung`.
- `/fansubs/animeownage` showed `AnimeOwnage`, `Gruppenleitung`, and the UAT member name.
- `/anime/3` showed `Naruto`, `AnimeOwnage`, and `Übersetzung`.
- `/members/phase64-uat-1780409688505` showed the UAT profile, `Gruppenleitung`, and `Übersetzung`.

Screenshot evidence: `C:/Users/admin/Documents/Team4s/tmp-phase64-uat-final.png`

## Fixes During UAT

- Fixed the public member contribution timeline SQL ordering so PostgreSQL accepts the `UNION ALL` query.
- Added member-dashboard role labels from `role_definitions` so `/me/contributions` can display `Übersetzung` instead of raw `translator`.
- Made the member-dashboard proposal read query tolerate a local schema without `anime_contributions.review_note`, because the Phase 64 dashboard must not fail while Phase 65 proposal schema work is in progress.

## Remaining Notes

- Broad `go test ./internal/handlers` is currently blocked by parallel Phase 65 test symbols that are not present yet (`ContributionProposalsMeHandler`, `ProposalRepository`, and related test-only references). Focused Phase 64 repository/cmd checks pass.
