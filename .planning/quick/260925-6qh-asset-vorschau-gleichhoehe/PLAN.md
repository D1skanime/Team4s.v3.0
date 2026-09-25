# Quick Plan

1. Give Cover and Banner asset preview frames one shared height.
2. Preserve the existing asset card layout, actions, and image cropping.
3. Run focused edit tests, typecheck, and diff checks.
4. Commit atomically, push to `origin main`, and restart the frontend.

## Acceptance Criteria

- Cover and Banner preview frames have the same height on the edit page.
- Existing action buttons and source badges remain unchanged.
- Logo and background previews retain their own sizing.
