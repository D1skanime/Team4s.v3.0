# Quick Plan

1. Add the existing library navigation Button directly to the create source section.
2. Keep the DiscoveryEntryCard copy and card wrapper removed.
3. Update the focused assertion and run create tests plus diff checks.
4. Commit atomically, push to `origin main`, and restart the frontend.

## Acceptance Criteria

- `Bibliothek durchsuchen` is visible and links to `/admin/anime/create/library`.
- `Neu` and `Aus meiner Bibliothek` are not rendered.
- AniSearch/Jellyfin controls remain unchanged.
