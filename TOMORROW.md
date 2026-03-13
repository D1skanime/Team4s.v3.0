# TOMORROW

## Top 3 Priorities
1. **Config Error Mapping** - Distinguish missing/invalid `JELLYFIN_*` configuration from genuine missing-group results in the group-assets flow
2. **Migration Execution Slice** - Add and plan the first concrete post-brief migration execution phase in GSD
3. **Broader Live Validation** - Re-run the group-assets flow against at least one additional anime/group folder pair

## First 15-Minute Task
Open `backend/internal/handlers/group_assets_handler.go` and `backend/internal/handlers/group_assets_jellyfin.go`, then trace how missing `JELLYFIN_BASE_URL` / `JELLYFIN_API_KEY` currently collapse into the same outcome as a missing group folder.

## Test Checklist
- [x] `GET /api/v1/anime/25/group/301/assets` returns live group data
- [x] `/anime/25/group/301` loads against the running stack
- [x] Root backdrop is used as the page background
- [x] Root banner is available for the info panel
- [x] Episode folder backdrops remain gallery images instead of hero backdrops
- [x] OpenAPI schema matches the shipped response exactly
- [x] Group lookup works with more than 500 root folders
- [x] A first phased rollout exists for `docs/architecture/db-schema-v2.md`
- [ ] The first concrete migration execution phase exists in GSD after the brief
- [ ] Missing/invalid `JELLYFIN_*` states are surfaced distinctly from true not-found conditions

## Dependencies
- Jellyfin `Groups` library must remain reachable from the configured provider
- Group <-> folder matching still depends on current folder naming rules
- Operator-facing error handling depends on how strictly the backend should fail when Jellyfin config is absent in local vs deployed environments
- The schema migration pilot depends on the new brief staying canonical in-repo and the next execution slice being added cleanly in GSD

## Nice To Have
- Reduce the current release-list coupling when deriving episode detail links from the group-detail page
- Tighten the pilot ordering story now that Phases 3 and 4 are complete before Phases 1 and 2
