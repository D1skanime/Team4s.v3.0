# WORKING_NOTES

## Current Workflow Phase
- Phase 82 is committed as `076a4f31`.
- Phase 83 is the active next slice: pro-release contributor assignment plus default inheritance from project-wide contributions.

## Useful Facts To Keep
- Aki local fixture:
  - `app_users.id=2`, display `Aki Leader`
  - `member_claims`: app user 2 verified to `members.id=2`
  - `anime_contributions.id=17`: Naruto, `member_id=2`, role `project_lead`, `status=confirmed`, `release_version_id=NULL`
- `/me/contributions` bug fixed today: member-owned contribution queries now use `COALESCE(ac.member_id, hfgm.member_id)` and `LEFT JOIN hist_fansub_group_members`.
- `/me/releases/[versionId]/workspace` exists and reuses existing media/notes components.
- Workspace button currently appears only for contributions with `release_version_id`; Phase 83 should add derived release entries for project defaults.
- The preferred Phase-83 model discussed today:
  - project contribution (`release_version_id IS NULL`) is the default team for every release of that anime/fansub project
  - release override applies only to that release version
  - "not dabei" removes rights for that release only
  - Leader keeps moderation/admin rights separately

## Verification Memory
- Frontend typecheck passed.
- Focused Vitest suites passed for fansub edit page and `/me` workspace.
- Backend `go build ./...` passed.
- Repository focused tests passed.
- Handler focused test command is blocked by unrelated stale compile errors in `contribution_proposals_me_test.go`.
- Backend Docker image was rebuilt and container restarted after the final `/me` fix.

## Commit Hygiene Notes
- Phase 82 product commit: `076a4f31`.
- Do not stage `tmp/`.
- Day-closeout changes are intentionally uncommitted unless the user asks for a closeout commit.

## Mental Unload
- If Aki still does not see Naruto after hard reload, check browser auth/session first, then call `/api/v1/me/anime-contributions` in network/devtools; DB already confirms the row exists.
- If Aki sees Naruto but no workspace button, that is expected until Phase 83 derives concrete release-version workspaces from defaults.
