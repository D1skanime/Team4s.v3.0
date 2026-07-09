---
status: complete
date: 2026-07-09
commit: this commit
---

# Summary

Implemented a narrow visibility-default and public project stat fix.

## Changed

- Added `project_contributor_count` to public anime+group stats.
- Counted confirmed project contributors from `anime_contributions` without filtering by public card visibility.
- Changed the project hero label from group members to project contributors.
- Defaulted omitted create-time public visibility flags to `true` for confirmed contributions.
- Updated admin project/release contribution UIs to send public visibility for new confirmed rows.
- Added migration `0123_anime_contribution_public_defaults` to set DB defaults to `true`.
- Updated OpenAPI/admin contracts and focused tests.

## Notes

- Existing rows were not mass-updated, because that would retroactively change persisted public visibility.
