# Quick Plan

1. Replace the single mixed Basisdaten grid with semantic field rows.
2. Keep Titel full width, group Typ/Inhaltstyp/Status, Jahr/Maximale Episoden, and Titel DE/Titel EN.
3. Add a mobile single-column fallback.
4. Run focused edit tests, typecheck, and diff checks.
5. Commit atomically, push to `origin main`, and restart the frontend.

## Acceptance Criteria

- No field drops to an unintended lone row on desktop.
- The language fields are visibly grouped together.
- All existing field IDs, values, and change handlers remain unchanged.
- The layout stacks cleanly on narrow screens.
