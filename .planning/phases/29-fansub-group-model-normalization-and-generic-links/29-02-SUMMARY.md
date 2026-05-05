## Summary
- Reworked fansub create/edit UI to use generic community-link rows with `website`, `discord`, `twitter`, `github`, and `irc`.
- Added frontend API helpers for listing, creating, updating, and deleting generic fansub links.
- Added explicit collaboration-member management to the fansub edit page for persisted collaboration groups.

## Verification
- `cd frontend && npm.cmd run build`
- `cd backend && go test ./internal/handlers ./internal/repository -count=1`

## Notes
- New collaboration-member UI is intentionally separate from the basic profile form.
