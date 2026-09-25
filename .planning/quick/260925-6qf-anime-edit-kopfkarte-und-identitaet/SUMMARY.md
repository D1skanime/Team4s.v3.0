---
status: complete
---

# Summary

Fixed the Anime edit layout after the compact identity card collapsed visually. The identity section now uses proper information tiles again, with readable alignment for IDs, source, and the folder path. The edit header and step navigator now render in one shared card while the create flow remains unchanged. The public cover link and existing source/Jellyfin context remain visible.

## Verification

- Frontend typecheck: passed.
- Anime edit and relations tests: 15 passed.
- `git diff --check`: passed.
- Live in-app browser DOM check: header, cover link, stepper, and identity values are present.
