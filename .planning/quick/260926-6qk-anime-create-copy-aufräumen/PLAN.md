# Quick Plan

1. Remove repeated explanatory copy from the Anime create header and source cards.
2. Remove redundant Basisdaten, metadata, description, and review process hints.
3. Keep labels, statuses, controls, checklist items, and actions unchanged.
4. Update the focused copy assertion and run create/edit tests plus diff checks.
5. Commit atomically, push to `origin main`, and restart the frontend.

## Acceptance Criteria

- Create page shows concise titles and field labels without repeated process paragraphs.
- AniSearch and Jellyfin search controls remain available.
- Review checklist and create action remain available.
- Create and edit focused tests pass.
