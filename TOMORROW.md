# TOMORROW

## Top 3 Priorities
1. Phase 83: make project-wide contributions act as default contributors for concrete release versions.
2. Add a contributor-visible way for Aki to open Naruto Folge 1/v1 from `/me` even though Aki's current contribution has `release_version_id = NULL`.
3. Repair the stale handler tests that still instantiate removed `AnimeContributionRow.FansubGroupMemberID`.

## First 15-Minute Task
- On `/me/contributions`, hard reload as Aki and confirm the Naruto Projektleitung card is visible; if yes, note the missing release workspace entry as the first Phase-83 acceptance case.

## Dependencies To Unblock Early
- Confirm Claude's Phase-83 assignment editor output before overlapping writes in fansub release cockpit files.
- Keep backend `team4sv30-backend` on the rebuilt image from today; rebuild again after Phase 83 backend changes.
- Use Aki/Naruto local data as the UAT fixture: `member_id=2`, `anime_id=1`, `anime_contributions.id=17`, role `project_lead`.
