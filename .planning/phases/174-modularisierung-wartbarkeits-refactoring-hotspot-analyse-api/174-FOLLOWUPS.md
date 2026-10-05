# Phase 174 – Nachfolge-Liste (nicht vergessen!)

Alles, was während Phase 174 gefunden, aber bewusst NICHT in 174 erledigt wurde (D-01: kein Verhalten/Schema/API ändern).
174-25 (Abschlussbericht) MUSS diese Liste vollständig in „Empfehlungen für Folgephasen“ übernehmen.
Neue Funde während 174 hier anhängen.

## Priorität hoch

### F-01 Alten Bildspeicher (legacy) entfernen — Nutzer: „total veraltet, muss weg“
- Live wird nur V2 (`anime_media` + `media_assets`) benutzt (geprüft 2026-10-05: `anime_media` existiert, 81 Zeilen).
- Schritt 1 (klein): tote Legacy-Zweige in `backend/internal/repository/anime_assets*.go` entfernen + `hasV2AssetSchema`-Abfrage (1 Extra-Query pro Bild-Aufruf) streichen.
- Schritt 2 (mittel): alle Leser der Spalte `anime.cover_image` auf `anime_media` umstellen (29 Backend-Dateien, u. a. anime.go, anime_v2.go, watchlist, fansub_project_resolver, AniSearch-Import, Anime anlegen/löschen); `syncLegacyAnimeCoverImageV2` danach überflüssig.
- Schritt 3: Spalte per Migration entfernen, API-Feld `cover_image` im Vertrag prüfen (55 Frontend-Stellen, teils nur Feldname).

## Bugs / Inkonsistenzen

- **F-02** `getTypeBadgeLabel`: `SegmenteTab.helpers.tsx` vs. `segmenteTabUtils.ts` liefern für OUTRO unterschiedliche Labels (`OUT` vs. `PV`) — fachlich klären, dann eine Implementierung (174-HOTSPOTS D-07).
- **F-03** Fansub-Anlegeseite: ASCII-Umlaute in UI-Texten („Tag hinzugefuegt.“ u. a.) → korrekte Umlaute (CLAUDE.md-Sprachregel).
- **F-04** Fansub-Anlegeseite: 9 native `<input>`/`<select>` statt `@/components/ui`-Primitives (lint-Warnungen).
- **F-05** Daten: Mitglied `timer` hat 9 doppelte `anime_contributions`-Einträge für Anime 1 / Gruppe 1 (gleiche Rollen) — Ursache des Mehrfach-Anlegens prüfen, bereinigen.
- **F-06** 6 vorbestehende Frontend-Testfehler + tsc-Fehler in `ReleaseDetailHero.test.tsx` (Phase 169) + openapi.yaml doppelter `description`-Key (Zeile ~2205) — siehe 174-HOTSPOTS „Pre-Existing Baseline Test Failures“.

## Erledigt in 174 (zur Info, Gegenprobe beachten)
- BUG-174-01 Endlosschleife Fansub-Anlegeseite nach erstem Speichern — behoben, live abgenommen.
- BUG-174-02 Dashboard „Gruppenbild prüfen“ ohne Prüfrecht — behoben; **Gegenprobe nach Backend-Rebuild offen** (174-UAT-CHECKLIST).

## Wartbarkeit (Refactoring-Folgephasen)
- **F-07** Doppelte Logik zusammenführen: Pagination-Fensterberechnung (2 Komponenten), `formatDate` (4 identische Kopien) — 174-HOTSPOTS D-07.
- **F-08** P2-Hotspots aus 174-HOTSPOTS (18 Dateien, u. a. `types/admin.ts`, `EpisodeVersionEditorPage.tsx`, `fansubs/merge/page.tsx` ohne Tests, `media_repository.go`, `anisearch_client.go`).
- **F-09** Nach 174 noch > 450 Zeilen (D-24): `lib/api/client.ts` 1095, `lib/api/history.ts` 1020, `lib/api/admin/fansub-members.ts` 757, `lib/api/permissions.ts` 610, `useAdminAnimeCreateControllerImpl.ts` 1054, `GroupMediaReviewSection.tsx` 632, `fansubs/create/page.tsx` 610 (+ Welle-4/5-Ergebnisse ergänzen).
- **F-10** Optional: wenige echte Playwright-End-to-End-Tests für Kern-Admin-Abläufe (echte Seite + echtes Backend), statt Klick-Simulation (D-25).
