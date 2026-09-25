# Quick Task 260925-3cx: Neutrale Herkunftsbezeichnungen im Fansub-Editor

**Status:** complete
**Date:** 2026-09-25
**Phase:** 168

## Ergebnis

- Sichtbare `Jellyfin-`-Bezeichnungen im Episode-Version-Editor und Segment-Drawer wurden neutralisiert.
- „Episode-Version / Jellyfin-Stream“ heißt jetzt „Episode-Version / Stream“.
- „Jellyfin Serien-Theme“ heißt jetzt „Serien-Theme“.
- „Jellyfin Media ID“ heißt jetzt „Media ID“.
- Die Verfügbarkeitsmeldung nennt nur noch eine externe Medienanreicherung.
- Interne Providerwerte wie `jellyfin_theme`, `media_provider` und `jellyfin_*`-IDs bleiben unverändert.

## Geänderte Dateien

- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentsListSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentAssetSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentBasicFieldsSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentPlaybackPreviewSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/segmenteTabUtils.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/JellyfinEnrichmentNotice.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
- betroffene Tests

## Checks

- Segmenttests: 125/125 bestanden
- Episode-Version-Seitentests: 17/17 bestanden
- Typecheck: bestanden
- `git diff --check`: bestanden
