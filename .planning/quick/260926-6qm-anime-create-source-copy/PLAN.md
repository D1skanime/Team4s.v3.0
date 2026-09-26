# Quick Plan

1. Keep the Bibliothek durchsuchen action.
2. Remove redundant Anime finden section heading, black AniSearch heading, provider path hint, Jellyfin search label, Pflichtangaben eyebrow, and adopted-assets explanation.
3. Preserve functional controls and accessibility for the Jellyfin search input.
4. Update focused copy assertions and run create/edit tests plus diff checks.
5. Commit atomically, push to `origin main`, and restart the frontend.

## Acceptance Criteria

- Bibliothek durchsuchen remains visible.
- Redundant listed text is absent from create.
- AniSearch/Jellyfin search controls remain usable.
- Edit flow retains its own section heading.
