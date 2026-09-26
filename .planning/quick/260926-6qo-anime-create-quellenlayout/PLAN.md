# Quick Plan

1. Move the library action into a right-aligned source toolbar.
2. Stretch AniSearch and Jellyfin provider cards to the same grid-row height.
3. Preserve all existing search fields and actions.
4. Run focused create tests and diff checks.
5. Commit atomically, push to `origin main`, and restart the frontend.

## Acceptance Criteria

- Bibliothek durchsuchen is right-aligned above the provider cards.
- AniSearch and Jellyfin cards share the same height on desktop.
- Provider controls remain unchanged and stack responsively on mobile.
