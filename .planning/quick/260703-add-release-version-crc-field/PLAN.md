---
date: 2026-07-03
status: complete
---

# Quick Plan: Add Release-Version CRC Field

## Scope

Add a CRC field to the current episode release-version editor so fansub.de release rows can be captured when creating or editing release versions.

For the current Vipers Creed retest, every episode must be checked against its own matching fansub.de row. Do not reuse EP01 metadata for later episodes. Match the row by episode number plus available Jellyfin/fansub.de evidence such as codec, resolution, groups, date, file size, and filename/path hints.

Current EP01 example row matching Jellyfin resolution `1280x720`:

- Release name: `-Cyclops-`
- Release date: `24.12.2009`
- Groups: `C-Subs`, `Honto`
- Resolution/source row: `01 h264 1280x720`
- CRC: `1CC0A2E3`
- File size evidence: `313.940.104 Byte (299M)`

## Read First

- `docs/architecture/db-schema-fansub-domain.md`
- `docs/engineering/implementation-contract.md`
- `docs/api/api-contracts.md`
- `docs/frontend/ui-system.md`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts`
- `frontend/src/types/episodeVersion.ts`
- `frontend/src/lib/api.ts`
- `backend/internal/models/episode_version.go`
- `backend/internal/handlers/episode_version_validation.go`
- `backend/internal/repository/episode_version_repository.go`
- `backend/internal/repository/episode_version_repository_read_helpers.go`
- `backend/internal/repository/episode_version_repository_write_helpers.go`
- `shared/contracts/episode-versions.yaml`
- `shared/contracts/openapi.yaml`

## Acceptance

- CRC is stored on `release_variants`, not on neutral episode/anime entities.
- Editor context, create, patch, and read responses expose `crc32`.
- The Informationen tab has a CRC field.
- CRC input is normalized to uppercase 8-character hex or cleared when empty.
- Focused backend and frontend tests cover validation, form state, and UI rendering.
