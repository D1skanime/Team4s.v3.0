# Quick Plan

1. Remove the redundant outer admin card class from the Relations section.
2. Move the card border, background, radius, and clipping to the relation section itself.
3. Keep the inner details element structurally and behaviorally unchanged, but remove its duplicate border.
4. Run focused relation/edit tests, typecheck, and diff checks.
5. Commit atomically, push to `origin main`, and restart the frontend.

## Acceptance Criteria

- Relations render as one clear card without nested borders.
- Search, relation type, save, edit, delete, and confirmation behavior remain unchanged.
- Empty and populated relation states retain their existing content.
