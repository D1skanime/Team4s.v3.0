# TOMORROW

## Top 3 Priorities
1. **Contract Sync** - Align `shared/contracts/openapi.yaml` with `GET /api/v1/anime/:animeId/group/:groupId/assets`
2. **Groups Discovery Hardening** - Paginate Jellyfin group folder discovery and keep matching stable for larger libraries
3. **Schema Migration Framing** - Turn `docs/architecture/db-schema-v2.md` into a phased migration brief and decide whether to route planning through GSD

## First 15-Minute Task
Open `shared/contracts/openapi.yaml` and update the group-assets response schema to match the live payload fields:
- `folder_name`
- `hero.backdrop_url` / `primary_url` / `poster_url` / `thumb_url` / `banner_url`
- `episodes[].images[]`
- `episodes[].media_assets[]`

## Test Checklist
- [x] `GET /api/v1/anime/25/group/301/assets` returns live group data
- [x] `/anime/25/group/301` loads against the running stack
- [x] Root backdrop is used as the page background
- [x] Root banner is available for the info panel
- [x] Episode folder backdrops remain gallery images instead of hero backdrops
- [ ] OpenAPI schema matches the shipped response exactly
- [ ] Group lookup works with more than 500 root folders
- [ ] A first phased rollout exists for `docs/architecture/db-schema-v2.md`

## Dependencies
- Jellyfin `Groups` library must remain reachable from the configured provider
- Group <-> folder matching still depends on current folder naming rules
- OpenAPI consumers must be updated after the schema is corrected
- The schema migration pilot depends on the new draft staying canonical in-repo rather than scattered across chat notes

## Nice To Have
- Reduce the current release-list coupling when deriving episode detail links from the group-detail page
- Decide whether GSD should own only planning docs or also milestone state for the migration lane
