# TOMORROW

## Top 3 Priorities
1. Audit migrations `0055` to `0057` plus the `release_version_groups.fansubgroup_id` cleanup boundary before any more schema changes.
2. Finish one intentional drawer-state/race pass for release-detail/theme switching inside `/admin/fansubs/88/edit`.
3. Keep the release-native fansub baseline intact while separating reviewable product work from repo-local tooling churn.

## First 15-Minute Task
- Open `database/migrations/0055_fansub_group_links_contract.up.sql`, `0056_fansub_legacy_cleanup_boundary.up.sql`, and `0057_drop_release_version_groups_fansubgroup_id.up.sql`, then compare them against `git status -sb` and note the migration-chain risks before touching schema work.

## Dependencies To Unblock Early
- Keep Docker DB/Redis/backend/frontend running.
- Work only from `C:\Users\admin\Documents\Team4s`.
- Use `docs/architecture/db-schema-fansub-domain.md` and `AGENTS.md` as the first source-of-truth pair before touching release/fansub persistence.
