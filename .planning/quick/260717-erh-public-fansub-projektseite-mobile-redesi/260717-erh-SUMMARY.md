---
quick_task: 260717-erh
status: complete
scope: Public Release-Detailseite — Mobile Redesign, Quellgruppen und öffentliche Kara-Segmente
completed_at: 2026-07-17
commits:
  - ebc0348d
  - e5ad6f47
  - fcccf04b
  - 696cb4eb
  - 02db4bf5
---

# Quick Task 260717-erh — Summary

## Ergebnis

Die öffentliche Release-Detailseite priorisiert auf Mobilgeräten Bild, Folge und Titel, hält technische Details zunächst geschlossen und zeigt Inhalte nach ihrer tatsächlichen Quellgruppe. Bilder und Texte behalten bei Kooperationen damit ihre nachvollziehbare Fansub-Zuordnung. Öffentliche, freigegebene Kara-Segmente erhalten einen eng begrenzten anonymen Stream-Grant; der vollständige Episodenstream bleibt unverändert geschützt.

## Umgesetzte Entscheidungen

- Mobile Hero-Ansicht mit geschlossenem Details-Accordion und kompakten Kerninformationen.
- Bildpriorität Backdrop vor Banner, Anime-Logo als Fallback.
- Sprungmarken für Bilder, Texte und Fansubber; Fansubber öffnet den Detailbereich.
- Bilder und Texte werden nach Quellgruppe gruppiert, mit neutralem Bereich für nicht eindeutig migrierbare Altbestände.
- Release-Mitwirkende werden als Kombination aus Gruppe und Mitglied gezählt und dargestellt.
- Release-Texte zeigen initial eine ausgewogene Gruppenauswahl; lange Texte sind auf sechs Zeilen begrenzt.
- Der Episodenplayer steht nach der Kara-Timeline und bleibt ein nachgeordnetes Feature.
- Kara-Segmente mit öffentlicher Freigabe sind anonym abspielbar; der Grant ist an Segment, Release und Cache-Kontext gebunden und enthält keine Benutzer-ID.
- Admin-Editoren speichern die reale Quellgruppe an neuen Bildern und Texten; eindeutige Fälle werden automatisch abgeleitet, mehrdeutige Eingaben mit 422 abgelehnt.
- Legacy-Daten werden nur bei genau einer nachweisbaren Gruppe zurückgefüllt; mehrdeutige Daten bleiben bewusst neutral.

## Geänderte Bereiche

- Datenbank: Migration `0130_release_content_source_groups` mit nullable Quellgruppe, Fremdschlüsseln, partiellen Indizes und sicherem Backfill.
- Backend/Admin: Validierung und Speicherung der Quellgruppe für Release-Medien und Release-Texte.
- Backend/Public: gruppierte Projektion für Bilder, Texte und Mitwirkende sowie korrigierte Ownership-Prüfung beim Notes-Cursor.
- Verträge: Admin-Content- und Public-OpenAPI sowie passende TypeScript-Typen.
- Frontend/Admin: Gruppenauswahl in bestehenden Medien- und Text-Editoren.
- Frontend/Public: mobiles Hero, Accordion, gruppierte Galerie und Texte, Anker, neue Player-Reihenfolge und responsive Darstellung.
- Streaming: öffentlicher Segment-Grant, anonymer Next.js-Relay und Timeline-Integration; vollständige Folgen bleiben geschützt.

## Checks

- `go test ./internal/repository ./internal/handlers ./internal/migrations` — grün.
- `go test ./internal/auth ./internal/handlers` — grün.
- Fokussierte Frontend-Suite — 12 von 14 Dateien grün; die beiden roten Fälle stammen aus dem bereits bestehenden globalen No-Token-Boundary-Test und betreffen `GroupHistorySection.tsx` sowie `ProfileBackgroundCard.tsx` außerhalb dieses Tasks.
- `npm run typecheck` — grün.
- Fokussiertes ESLint der geänderten UI-Dateien — keine Fehler; nur bestehende Warnungen im Admin-Medienbereich.
- `npm run build` — grün.
- Docker-Builds für Backend und Frontend — grün; beide Services laufen.
- Öffentliche Projekt- und Release-Route liefern im laufenden Stack HTTP 200.
- Datenbankprüfung — beide neuen Spalten sind nullable; beide partiellen Quellgruppen-Indizes sind vorhanden.
- `git diff --check` — grün; nur Zeilenenden-Hinweise in bereits vorhandenen Planning-Dateien.
- Vollständiges `npm run lint` — weiterhin rot wegen des bestehenden `react-hooks/set-state-in-effect`-Fehlers in `frontend/src/components/fansubs/FansubStorySection.tsx`; 329 bestehende Warnungen.

## Live-UAT im Codex-In-App-Browser

- Einstieg über `/fansubs/c-subs/fansubprojekt/vipers-creed` und den sichtbaren Link `Vollständiges Release ansehen` führt zur kanonischen Pretty-Route `/fansubs/c-subs/fansubprojekt/vipers-creed/releases/1`.
- Der Release-Hero startet geschlossen. Das Öffnen zeigt die technischen Fakten; die Anchor-Leiste enthält `Bilder`, `Texte` und `Fansubber`.
- Bei 360 px, 390 px und 420 px entspricht `documentElement.scrollWidth` exakt der Viewport-Breite. Es gibt keine horizontale Überbreite.
- Das Galerie-Raster bleibt zweispaltig: 140/140 px bei 360 px sowie 170/170 px bei 420 px.
- Im ausgeloggten Zustand ist `Episode abspielen` nicht vorhanden.
- Der anonyme Kara-Button lädt Segment 1 über `/api/segments/1/stream?release_version_id=1` vollständig (`readyState=4`, Dauer 45,003337 Sekunden, kein Media-Fehler).
- Der Pretty-Route-Deep-Link `?kara=1&autoplay=1#op-ed-middle` selektiert und lädt denselben Clip ebenfalls vollständig. Automatisches Starten kann durch die Browser-Autoplay-Richtlinie pausiert bleiben; der Player und der korrekte Clip werden dennoch bereitgestellt.
- Im Browser-Protokoll traten beim manuellen Kara-Klick keine Warnungen oder Fehler auf.

## Risiken und offene UAT

- Die Live-UAT wurde nach Abschluss des Executors durch den Orchestrator im Codex-In-App-Browser nachgeholt und ist für Layout, Accordion, Pretty-Route, anonymen Kara-Klick, Deep-Link und das fehlende Gast-Episodenrecht positiv.
- Noch nicht live erneut geprüft wurden die angemeldeten Rollenvarianten Fansubber/Platform-Admin sowie der Quellgruppen-Write im Coop-Editor; dafür bestehen fokussierte Komponenten-, Handler- und Repository-Tests.
- Ein Migration-Down/Up-Test wurde nicht gegen die gemeinsame Entwicklungsdatenbank ausgeführt, weil keine disposable `TEST_DATABASE_URL` vorhanden war. Die Migration wurde erfolgreich angewandt und das resultierende Schema gelesen.
- Bereits mehrdeutige Legacy-Zeilen bleiben absichtlich ohne Quellgruppe und erscheinen öffentlich im neutralen Bereich.

## Commits

- `ebc0348d` — `feat(releases): persist source groups for release content`
- `e5ad6f47` — `feat(releases): project grouped public release content`
- `fcccf04b` — `feat(releases): redesign public release detail for mobile`
- `696cb4eb` — `fix(releases): align public imagery with shared rendering`
- `02db4bf5` — `feat(karaoke): add public bounded segment grants`
