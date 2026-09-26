---
status: complete
---

# Summary

Removed the redundant DiscoveryEntryCard from Anime create and aligned its Basisdaten layout with Anime edit. The title readiness pill is gone; fields are grouped as title, classification, numeric metadata, language titles, and folder path.

## Verification

- Create and edit focused tests: 47 passed.
- `git diff --check`: passed.
- Existing Next generated-page typecheck error remains in `create/page.tsx` because of pre-existing named helper exports.
