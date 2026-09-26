# Quick Plan

1. Remove the redundant DiscoveryEntryCard from the create source section.
2. Restructure create Basisdaten into the same grouped layout as edit.
3. Remove the create-only title readiness status.
4. Update the focused discovery-card assertion and run create/edit tests plus diff checks.
5. Commit atomically, push to `origin main`, and restart the frontend.

## Acceptance Criteria

- No "Neu / Aus meiner Bibliothek" card appears above provider search.
- Create Basisdaten visually matches edit Basisdaten.
- Title, provider selects, numeric fields, language fields, and folder path remain functional.
- Create and edit focused tests pass.
