---
phase: 31-ui-umbau
plan: "02"
subsystem: frontend-admin-fansub
tags: [fansub, releases, themes, segments, ui]
key_files:
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
decisions:
  - Release-Segment-Status wird im Frontend aus Anime-Themes, Release-Theme-Assets und Theme-Segmenten aggregiert.
  - Statuswerte bleiben explizit `global`, `release`, `missing` und werden deutsch als `Global gesetzt`, `Release-spezifisch`, `Fehlt noch` angezeigt.
  - Expandierte Release-Zeilen zeigen Theme-/Segment-Karten statt Release-Logo-/Release-Banner-Felder.
verification:
  - cd frontend && npx tsc --noEmit
  - cd frontend && npm.cmd run build
completed_date: "2026-04-30"
---

# Phase 31 Plan 02 Summary

Der ausgeklappte Release-Bereich zeigt jetzt echte Theme-/Segment-Karten statt eines Platzhalters.

Die Karten werden aus vorhandenen APIs zusammengesetzt:

- `getAdminAnimeThemes(anime_id)`
- `getAdminReleaseThemeAssets(release_id)`
- `getAdminAnimeThemeSegments(anime_id, theme_id)`

Gebaut:

- `ReleaseSegmentStatus = 'global' | 'release' | 'missing'`
- `ReleaseSegmentCard` mit `theme_id`, `theme_type_name`, `theme_title`, `status`, optional `media_id`, `public_url`, `source_label`
- Mapping-Helfer `mapReleaseSegmentCards`
- Lazy Loading beim Aufklappen einer Release-Zeile
- Status-Badges: `Global gesetzt`, `Release-spezifisch`, `Fehlt noch`
- Styles fuer Segmentkarten und expanded release area

Grenze: Die Karten lesen und aggregieren bestehende Daten. Direkte Bearbeitung/Upload liegt in Plan 03.

## Self-Check: PASSED

Automatisierte Checks liefen erfolgreich:

- `npx tsc --noEmit`
- `npm.cmd run build`
