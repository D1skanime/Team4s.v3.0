# Quick Task 260925-cyu: Episode-Import Vorschau automatisch laden und redundante Quellenkarte entfernen

**Status:** complete
**Date:** 2026-09-25

## Ergebnis

- Die Import-Vorschau lädt nach dem Kontext automatisch mit AniSearch-ID, Season Offset `0` und dem Haupt-Jellyfin-Ordner.
- Die doppelte Karte „Quellen konfigurieren“ mit AniSearch-ID, Season Offset und erneutem „Vorschau laden“ wurde entfernt.
- Die Kontextzeile zeigt jetzt `AniSearch ID`, `Jellyfin-Serien-ID` und `Ordnerpfad`; der redundante Rohwert `jellyfin:<id>` entfällt.
- Die Mehrordner-Auswahl bleibt als separater Selektor erhalten und lädt bei einem Wechsel automatisch eine neue Vorschau.
- Mehrserver-/`server_key`-Semantik und Release-/Fansub-Quellen wurden nicht verändert.

## Geänderte Dateien

- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css`
- `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts`
- `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.test.tsx`

## Checks

- Relevante Vitest-Tests: 7/7 bestanden
- TypeScript: `npm run typecheck` bestanden
- ESLint auf den geänderten Import-Dateien: keine Fehler/Warnungen
- `git diff --check`: bestanden

## UAT-Hinweis

Der gemeinsame Browserpfad war erreichbar, zeigte für die Admin-Route aber die Anmeldung. Die authentifizierte Sichtprüfung des Import-Flows bleibt daher als menschlicher UAT-Schritt offen.
