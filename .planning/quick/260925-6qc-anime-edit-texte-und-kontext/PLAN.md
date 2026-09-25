# Quick Plan

1. Remove redundant edit-route descriptions and duplicate source/Jellyfin identity fields.
2. Preserve the Jellyfin Item ID once and keep the AniSearch external link.
3. Link the header cover and compact the relations card actions.
4. Remove the requested helper/process hints from edit-visible shared fields.
5. Run focused tests/typecheck, commit atomically, push, and restart the frontend.

## Acceptance Criteria

- Edit page no longer shows the listed Create-Flow/process explanations.
- Jellyfin Item ID remains visible exactly once in the identity card.
- AniSearch opens in a new browser tab.
- Header cover links to the public anime page.
- Relations select and save button are arranged consistently and responsively.
