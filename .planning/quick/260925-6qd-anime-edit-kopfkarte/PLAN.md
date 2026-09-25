# Quick Plan

1. Compose the existing edit header card as one compact title/action/cover block.
2. Keep the cover linked to the public anime route and preserve both existing actions.
3. Hide the duplicate shared-workspace page heading in edit mode only.
4. Run focused edit/relation tests and typecheck.
5. Commit atomically, push, and restart the frontend.

## Acceptance Criteria

- Edit view has one compact top identity card instead of two large title areas.
- Cover remains a new-tab link to the public anime page.
- Create view still renders its own shared workspace header.
- Existing navigation actions remain available.
