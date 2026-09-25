# Quick Plan

1. Replace read-only identity inputs with compact semantic information tiles.
2. Keep AniSearch action and source/Jellyfin identity values visible.
3. Make the folder path full width and readable for long paths.
4. Run focused edit/relation tests and typecheck.
5. Commit atomically, push, and restart the frontend.

## Acceptance Criteria

- The identity section has materially less vertical whitespace.
- All four identity values remain visible.
- AniSearch still opens in a new tab.
- Long Jellyfin IDs and paths wrap without horizontal overflow.
