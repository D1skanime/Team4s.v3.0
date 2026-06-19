# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** Fansub release cockpit and contributor workspace hardening.
- **Current branch:** `main`
- **Current local state:** Phase 82 is committed in `076a4f31`; worktree has only untracked `tmp/` before this closeout update.

## Current State

### What Finished Today
- Phase 82 was live-UAT driven to a usable fansub release cockpit baseline and committed as `076a4f31 feat: finish phase 82 fansub release cockpit`.
- `/admin/fansubs/[id]/edit?tab=releases` now has paged release loading instead of eager loading all release rows for every project.
- The release cockpit moved toward the agreed card-first overview: project card/status first, matrix secondary, member avatars/role coverage, and scoped loading for release data.
- A member-owned workspace was added at `/me/releases/[versionId]/workspace` for release-version media and notes, reusing `ReleaseVersionMediaSection`, `useReleaseVersionMedia`, and `ReleaseVersionNotesTab` instead of inventing another upload flow.
- `/me/contributions` now reads both new `anime_contributions.member_id` rows and legacy `fansub_group_member_id` rows, fixing the Aki/Naruto project-lead visibility bug.
- Backend was rebuilt with `docker compose up -d --build team4sv30-backend`; the live backend on `:8092` includes the `/me/contributions` fix.

### What Works
- Aki is verified as `app_user_id=2 -> member_id=2`.
- Local DB has `anime_contributions.id=17` for Aki on Naruto with role `project_lead`, `status=confirmed`, and no `release_version_id`.
- After hard reload on `/me/contributions`, Aki should see the Naruto Projektleitung contribution.
- The `/me` release workspace is ready for concrete release-version contributions, but its entry button appears only when a contribution has `release_version_id`.
- Phase 82 frontend/backend checks passed for the changed slices; known unrelated handler package compile issue still exists in `contribution_proposals_me_test.go`.

### What Is Open
- Phase 83 owns the next product slice: pro-release contributor assignment and default inheritance from project-wide contributions.
- Important rule for Phase 83: an anime/project contribution with `release_version_id IS NULL` is the default team for all releases of that project unless a release-specific override says otherwise.
- The best current direction is to derive release workspaces from project defaults rather than materializing hundreds of per-release contribution rows.
- Normal contributors should work from `/me`, not from `/admin/fansubs/[id]/edit`.

## Active Planning Context
- Phase 82 is done enough to close; commit: `076a4f31`.
- Phase 83 planning artifacts exist under `.planning/phases/83-pro-release-mitwirkenden-zuordnung-release-version-id-im-coc/`.
- Keep `tmp/` out of commits; it contains local logs/screenshots only.

## Key Decisions In Force
- Anime and episodes are neutral.
- Fansub context belongs to fansub groups, releases, release versions, and release-version groups.
- Release-version process media must use `release_version_media.release_version_id`.
- Do not reintroduce `release_version_groups.fansubgroup_id`; use `fansub_group_id`.
- Do not attach release media directly to episodes.
- Do not invent parallel media/upload flows before reusing existing domain flows.
- `/admin/fansubs/[id]/edit` owns internal leader/admin edit actions.
- `/me` owns contributor-facing workspaces for media/notes once a user is contributing to a release.
- Credits and permissions remain separate, but Phase 83 intentionally defines how contribution mappings drive release-version edit access.
