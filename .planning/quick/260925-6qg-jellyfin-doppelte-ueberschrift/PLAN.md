# Quick Plan

1. Remove the duplicate black Jellyfin heading from the shared Jellyfin search card.
2. Keep the provider eyebrow and all search/result controls unchanged.
3. Run typecheck, focused Anime edit/create tests, and diff checks.
4. Commit atomically, push to `origin main`, and restart the frontend.

## Acceptance Criteria

- The card shows the provider label only once.
- Search and scan controls remain present and functional.
- Create and edit flows continue using the same shared component.
