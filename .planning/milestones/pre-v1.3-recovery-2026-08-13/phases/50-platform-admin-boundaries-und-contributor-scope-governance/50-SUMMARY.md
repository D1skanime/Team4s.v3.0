# Phase 50 Summary

Date: 2026-05-22
Status: implemented with residual follow-up

## Implemented

- Platform-admin-only UI boundary added for global admin surfaces and nested anime/fansub admin routes.
- Contributor entry moved to `/manage/groups`; "Meine Gruppen" no longer links contributors into `/admin/fansubs/:id/edit`.
- Release-version editor now hides admin tabs while permissions load and shows contributors only Media/Assets and Notizen/Beiträge.
- Release-version editor context now returns full admin context only for platform admins; contributors receive a sanitized context without folder path, provider IDs, or stream URL fields.
- Backend canonical fansub group updates are platform-admin-only even when a scoped group role exists.
- Public anime `include_disabled` reads now require platform-admin identity and admin calls use authenticated `/admin/anime` routes.
- Release-version note read/write APIs are permission-checked against release-version note capability.
- Fansub group note and anime/fansub project note reads now require scoped note permission.
- Group member-story admin endpoints are platform-admin-only until the profile-owned story flow is rebuilt.

## Checks

- `go test ./cmd/server ./internal/handlers ./internal/permissions ./internal/repository`
- `npm run typecheck`
- `npm test -- --run src/app/admin/my-groups/page.test.tsx src/app/admin/episode-versions/[versionId]/edit/page.test.tsx`
- `git diff --check -- <phase-50 touched files>`

## Residual Follow-Up

- `/admin/my-groups` still serves the contributor workspace directly; `/manage/groups` re-exports it. It should become a redirect once the route move is split into a smaller cleanup.
- Full workspace `git diff --check` still reports an unrelated pre-existing `.codex/config.toml` blank-line-at-EOF issue.
