## Summary
- Expanded the canonical fansub contract in backend/frontend types so groups can carry generic `links` plus explicit compatibility-only fields.
- Added `/api/v1/admin/fansubs/:id/links` CRUD handlers and repository logic on top of `fansub_group_links`.
- Backfilled legacy fixed URL columns into canonical link rows via migration `0055_fansub_group_links_contract`.

## Verification
- `cd backend && go test ./internal/handlers ./internal/repository -count=1`

## Notes
- `website_url`, `discord_url`, and `irc_url` remain readable compatibility projections.
