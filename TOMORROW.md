# TOMORROW

## Top 3 Priorities
1. **Contract Sync** - Align `shared/contracts/openapi.yaml` with `GET /api/v1/anime/:animeId/group/:groupId/assets`
2. **Subgroups Discovery Hardening** - Paginate Jellyfin subgroup folder discovery and keep matching stable for larger libraries
3. **Operational Error States** - Surface missing/invalid `JELLYFIN_*` config as a clear configuration failure instead of a silent folder-miss path

## First 15-Minute Task
Open `shared/contracts/openapi.yaml` and update the subgroup assets response schema to match the live payload fields:
- `folder_name`
- `hero.backdrop_url` / `primary_url` / `poster_url`
- `episodes[].images[]`
- `episodes[].media_assets[]`

## Test Checklist
- [x] `GET /api/v1/anime/25/group/301/assets` returns live subgroup data
- [x] `/anime/25/group/301` loads against the running stack
- [x] Root subgroup backdrop is used as the page background
- [x] Episode images remain gallery images instead of hero backdrops
- [ ] OpenAPI schema matches the shipped response exactly
- [ ] Subgroup lookup works with more than 500 root folders
- [ ] Missing `JELLYFIN_*` configuration returns a clear operational error

## Dependencies
- Jellyfin `Subgroups` library must remain reachable from the configured provider
- Group <-> subgroup folder matching still depends on current folder naming rules
- OpenAPI consumers must be updated after the schema is corrected

## Nice To Have
- Reduce the current release-list coupling when deriving episode detail links from the group-detail page
