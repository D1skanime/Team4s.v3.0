---
status: complete
---

# Summary

Removed redundant process copy from the Anime create flow: header intro, discovery description, AniSearch/Jellyfin explanations, section helper text, description hint, empty review note, and the review-step subtitle. The functional controls, field labels, checklist, and actions remain unchanged.

## Verification

- Create and edit focused tests: 47 passed.
- `git diff --check`: passed.
- Frontend typecheck: existing Next generated-page export error remains in `create/page.tsx` because named helper exports are not allowed by the generated App Router type.
