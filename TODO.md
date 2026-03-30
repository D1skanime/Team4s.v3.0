# TODO

## Current Active Work
- [x] Stand up a fresh `team4s_v2` schema foundation
- [x] Switch local backend runtime to `team4s_v2`
- [x] Move anime create to v2
- [x] Move public anime list/detail/backdrops to v2
- [x] Move anime delete to v2 with audit retention and media cleanup
- [x] Simplify the admin anime overview/create UX
- [x] Fix public Jellyfin cover rendering on the frontend

## Next Up
- [ ] Move `UpdateAnime` / admin edit persistence to v2
- [ ] Audit remaining anime routes for legacy flat-column assumptions
- [ ] Decide where compatibility mirrors can be removed after edit/update is on v2

## Parking Lot
- [ ] Broader v2 rollout for episodes/releases/fansub admin surfaces
- [ ] Old anime DB migration/import strategy if the legacy data is ever needed again
- [ ] Compatibility-layer cleanup once the anime vertical is fully on v2
