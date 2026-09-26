---
status: complete
---

# Summary

Kept the library search button and removed the remaining redundant source/detail copy from Anime create. The create-only Anime finden section heading, black AniSearch heading, provider path hint, Jellyfin search label, Pflichtangaben eyebrow, and adopted-assets explanation are gone. The Jellyfin search input keeps an accessible aria-label.

## Verification

- Create, AniSearch card, and edit tests: 53 passed.
- `git diff --check`: passed.
- Existing Next generated-page typecheck issue remains unchanged.
