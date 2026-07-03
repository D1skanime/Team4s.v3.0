---
date: 2026-07-03
status: complete
---

# Quick Summary: Add Release-Version CRC Field

## Result

Added CRC32 support for release-version technical variants:

- `release_variants.crc32` stores the 8-character CRC.
- Backend create, patch, read, and editor-context paths expose and persist `crc32`.
- The release-version edit UI and the new-version create form both show a CRC32 field.
- API contracts and frontend DTOs include `crc32`.
- The E2E audit now says every Vipers Creed episode must be matched to its own fansub.de release row; EP01 `-Cyclops-` / `1CC0A2E3` is only the example row.

## Checks

- `go test ./internal/handlers ./internal/repository -run "TestValidateEpisodeVersion|TestScanEpisodeVersion|TestApplyEpisodeVersionVariantMetadataWritesCRC32|TestSyncEpisodeVersionSelectedGroups"`
- `npm run test -- "src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts" "src/app/admin/episode-versions/[versionId]/edit/page.test.tsx"`
- `npm run typecheck`
- `npm run lint` passes with existing warnings.
- `go test ./internal/migrations`
- `git diff --check`

## Remaining Notes

- File size is still not modelled in this quick's UI; this change only covers CRC.
- Existing native-input lint warnings remain unrelated.
