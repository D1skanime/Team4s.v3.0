---
quick_task: 261106-hlj
subsystem: ui
tags: [storybook, design-system, frontend, documentation]

provides:
  - Neue Storybook-Hauptkategorie "Bilder/*" mit erstem Eintrag "Bilder/Anime-Cover"
  - Zentraler, typisierter Bildkatalog (`storybookBildKatalog.ts`) fuer kuenftige Referenzbilder
  - Generische rohe Bild-Showcase-Komponente (`BildKatalogShowcase`), wiederverwendbar fuer
    weitere Bildtypen
affects: [storybook, frontend-design-system, docs/FRONTEND_ARCHITEKTUR.md]

tech-stack:
  added: []
  patterns:
    - "Typisierter Katalog-Modul-Export (StorybookBildEintrag + Konstante + Sammelliste) als
       zentrale Referenzstelle fuer Storybook-Fixtures, statt Pfade pro Story hart zu codieren"

key-files:
  created:
    - frontend/public/storybook-bilder/anime-cover-freezing.jpg
    - frontend/src/lib/storybookBildKatalog.ts
    - frontend/src/components/showcases/BildKatalogShowcase.tsx
    - frontend/src/components/showcases/BildKatalogShowcase.module.css
    - frontend/src/components/showcases/BildKatalogShowcase.stories.tsx
  modified:
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "Neuer Ordner frontend/public/storybook-bilder/ statt Wiederverwendung von public/covers/,
     da dieses Bild reines Storybook-Referenzmaterial ist, keine Produktionsdaten"
  - "BildKatalogShowcase ist bewusst generisch ueber einen einzelnen Katalog-Eintrag gehalten,
     damit kuenftige Bildtypen dieselbe Komponente wiederverwenden koennen"

duration: 5min
completed: 2026-11-06
---

# Quick Task 261106-hlj: Team4S Storybook-Hauptbereich "Bilder" + erster Eintrag "Bilder/Anime-Cover" Summary

**Neue Storybook-Kategorie "Bilder/*" mit rohem Anime-Cover-Referenzbild (Freezing), ueber einen zentralen typisierten Katalog importierbar, ohne Jellyfin-Live-Zugriff.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-11-06T12:52:00Z (erster Task-Commit)
- **Completed:** 2026-11-06T12:57:38Z (letzter Task-Commit)
- **Tasks:** 3/3
- **Files modified:** 6 (5 neu, 1 geaendert)

## Accomplishments
- Storybook zeigt jetzt den fuenften Hauptbereich "Bilder" mit dem Eintrag "Anime-Cover": das
  echte, Jellyfin-bezogene Primaerbild von Freezing (Anime-ID 13) wird roh angezeigt (kein
  `MediaFrame`, kein Rahmen/Rundung/Schatten/Verlauf), mit der Typbezeichnung "Anime-Cover"
  darunter als `<figcaption>`.
- Das Bild liegt als feste, byte-identische Kopie unter
  `frontend/public/storybook-bilder/anime-cover-freezing.jpg` im Repo -- die Story funktioniert
  dadurch ohne laufende Jellyfin-Verbindung.
- Ein neues zentrales Katalog-Modul (`frontend/src/lib/storybookBildKatalog.ts`) stellt Bild,
  Pfad, Alt-Text und Typbezeichnung typisiert bereit (`StorybookBildEintrag`,
  `ANIME_COVER_BILD`, `STORYBOOK_BILD_KATALOG`) -- kuenftige Grundbaustein- oder
  Zusammengesetzte-Bausteine-Stories koennen denselben Eintrag importieren, statt den Pfad
  erneut hart zu codieren.
- `docs/FRONTEND_ARCHITEKTUR.md` Abschnitt 8 beschreibt die neue fuenfte Kategorie und ihren
  ersten Eintrag.
- Gegen den bereits laufenden `team4sv30-storybook`-Dienst (Port 6006) bestaetigt: der
  Story-Index (`/index.json`) listet `Bilder/Anime-Cover` (Docs- und Standard-Eintrag), und das
  statische Bild wird unter `/storybook-bilder/anime-cover-freezing.jpg` mit HTTP 200
  ausgeliefert.

## Task Commits

Each task was committed atomically:

1. **Task 1: Zentrale Bildablage + typisiertes Bildkatalog-Modul** - `3c8f0c1b7` (feat)
2. **Task 2: Generische rohe Bild-Showcase-Komponente + Story "Bilder/Anime-Cover"** - `2fc830bbc` (feat)
3. **Task 3: Dokumentation der neuen Kategorie + Registrierungs-Nachweis im laufenden Storybook** - `64c73a887` (docs)

_Keine TDD-Tasks in diesem Plan -- der Auftrag verbietet explizit neue Test-Dateien vor der
Live-Abnahme._

## Files Created/Modified
- `frontend/public/storybook-bilder/anime-cover-freezing.jpg` - byte-identische Kopie des echten
  Jellyfin-Primaerbilds von Freezing (verifiziert per `cmp -s` gegen
  `/tmp/freezing-cover-original.jpg`)
- `frontend/src/lib/storybookBildKatalog.ts` - zentraler, typisierter Katalog-Eintrag fuer das
  Anime-Cover-Referenzbild
- `frontend/src/components/showcases/BildKatalogShowcase.tsx` - generische Komponente, rendert
  genau einen Bildkatalog-Eintrag roh (natives `<img>`) mit `SectionHeader` und `<figcaption>`
- `frontend/src/components/showcases/BildKatalogShowcase.module.css` - reines Seiten-Layout ohne
  Rahmen/Rundung/Schatten/Verlauf
- `frontend/src/components/showcases/BildKatalogShowcase.stories.tsx` - Story
  `title: 'Bilder/Anime-Cover'`, importiert `ANIME_COVER_BILD` aus dem zentralen Katalog
- `docs/FRONTEND_ARCHITEKTUR.md` - neuer Absatz zur fuenften Showcase-Kategorie "Bilder/*" in
  Abschnitt 8, Kategorienzahl von vier auf fuenf korrigiert

## Decisions Made
- Neuer Ordner `frontend/public/storybook-bilder/` statt `frontend/public/covers/`: letzterer
  enthaelt echte/Platzhalter-Admin-Cover-Assets (Produktionsdaten), das neue Bild ist reines
  Storybook-Referenzmaterial -- bewusste Trennung, keine Vermischung von Storybook-Fixtures mit
  Produktions-Uploads.
- `BildKatalogShowcase` nimmt einen einzelnen `StorybookBildEintrag` als Prop statt eine
  Bildtyp-spezifische Variante zu bauen -- so kann ein kuenftiger zweiter Bildtyp (z. B.
  Backdrop, Gruppen-Logo) dieselbe Komponente mit einem anderen Katalog-Eintrag wiederverwenden.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Beim ersten `npm run lint`-Durchlauf (Task 3, repo-weite Pruefung) traten 4 Fehler auf, die
jedoch alle in Dateien liegen, die dieser Auftrag nicht beruehrt hat (`capture-responsive.cjs`,
`useReleaseVersionMedia.ts`, `ReleasesFilterBar.tsx` -- zuletzt vor diesem Auftrag geaendert).
Gemaess Scope-Boundary-Regel nicht gefixt, sondern in
`.planning/quick/261106-hlj-team4s-neuer-storybook-bereich-bilder-er/deferred-items.md`
dokumentiert. Die neu erstellten Dateien dieses Auftrags selbst sind lint- und typecheck-frei.

## User Setup Required

None - keine externe Service-Konfiguration erforderlich. Beide benoetigten Container
(`team4sv30-frontend`, `team4sv30-storybook`) liefen bereits.

## Next Phase Readiness

Der zentrale Bildkatalog (`storybookBildKatalog.ts`) steht fuer kuenftige Grundbaustein- oder
Zusammengesetzte-Bausteine-Stories bereit, die das Anime-Cover-Referenzbild wiederverwenden
wollen -- diese Wiederverwendung selbst war nicht Teil dieses Auftrags. Vier vorbestehende
Lint-Fehler (siehe `deferred-items.md`) bleiben als separate Nachbesserung offen.

---
*Quick Task: 261106-hlj*
*Completed: 2026-11-06*

## Self-Check: PASSED

Alle 6 erstellten/geaenderten Dateien existieren auf der Festplatte; alle 3 Task-Commit-Hashes
(`3c8f0c1b7`, `2fc830bbc`, `64c73a887`) sind im Git-Log vorhanden.
