---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 32
subsystem: ui
tags: [react, typescript, css, storybook, design-tokens, layout-primitives]

# Dependency graph
requires:
  - phase: 192 (Pläne 28-30)
    provides: "Card seamless/widthPurpose='compactPreview' (Plan 192-28), Avatar bordered/ResponsiveImage roundedThumbnail (Plan 192-29), Stack 'supportingBlockToContent'/Cluster 'secondaryActionRow' (Plan 192-30, ungenutzt in diesem Plan), 192-CONTEXT.md-Addendum 2026-11-05b (unabhängiger Review, Runde 2 von 2)"
provides:
  - "ReleasePreviewRow.module.css verliert seine lokale .logo-Rand-Deklaration ersatzlos -- der Rand 'auf dunkler Fläche' kommt jetzt aus Avatar bordered"
  - "AnimeEdgeNavigation.module.css verliert .previewCovers border-radius/object-fit (jetzt ResponsiveImage roundedThumbnail) und .previewCards feste width (jetzt Card widthPurpose='compactPreview')"
  - "EpisodeGlassCard.module.css verliert seine lokale .versionList-Klasse (border-width/border-radius/background) ersatzlos -- der randlose Modus kommt jetzt aus Card seamless"
  - "WatchlistAddButton.module.css verliert seine lokale .wrapper-Klasse (display:grid; gap:0.45rem, ein roher rem-Wert) ersatzlos -- die vertikale Anordnung kommt jetzt aus Stack gap='relatedContent'; WatchlistAddButton gilt damit erstmals explizit als Teil des Anime-Kopf-Komposits (192-CONTEXT.md-Addendum), obwohl die Datei weiterhin unter components/watchlist/ liegt"
affects: [192-34]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vier unabhängige Call-Site-Verdrahtungen der in Plan 192-28/192-29 vorbereiteten, bis dahin ungenutzten Grundbaustein-Fähigkeiten (bordered/roundedThumbnail/widthPurpose/seamless/Stack) -- kein neuer Mechanismus, nur Anwendung bestehender Override-Hooks an den vier in 192-CONTEXT.md's Addendum 2026-11-05b benannten Fundstellen"
    - "Wo eine lokale CSS-Klasse nach Entfernen ihrer einzigen (jetzt verbotenen) Deklaration leer zurückbleibt (.logo, .versionList, .wrapper), wird die Klasse selbst ersatzlos aus CSS UND JSX entfernt, statt eine leere Hülle stehen zu lassen -- konsistent mit demselben Muster aus Runde 4 (192-27)"

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/ReleasePreviewRow.tsx
    - frontend/src/components/fansubs/ReleasePreviewRow.module.css
    - frontend/src/components/fansubs/ReleasePreviewRow.stories.tsx
    - frontend/src/components/fansubs/ReleasePreviewRow.test.tsx
    - frontend/src/components/anime/AnimeEdgeNavigation.tsx
    - frontend/src/components/anime/AnimeEdgeNavigation.module.css
    - frontend/src/components/anime/AnimeEdgeNavigation.test.tsx
    - frontend/src/components/fansubs/EpisodeGlassCard.tsx
    - frontend/src/components/fansubs/EpisodeGlassCard.module.css
    - frontend/src/components/fansubs/EpisodeGlassCard.test.tsx
    - frontend/src/components/watchlist/WatchlistAddButton.tsx
    - frontend/src/components/watchlist/WatchlistAddButton.module.css
    - frontend/src/components/watchlist/WatchlistAddButton.test.tsx

key-decisions:
  - "WatchlistAddButtons gemessener 0.45rem (7,2px)-Wert wird NICHT durch ein neues Zweck-Token abgebildet, sondern durch das bereits bestehende Stack-Zweck-Token 'relatedContent' (8px, --space-2) -- wert- UND zweckgleich ('eng zusammengehörige Inhalte: der Watchlist-Aktions-Knopf und seine Status-/Wiederholungs-Meldung'). Playwright-Visualvergleich (EpisodenKarte-Story, ReleasePreviewRow-Stories) und die Sub-Pixel-Differenz (0,8px bei 16px Root-Schriftgröße) bestätigen: unterhalb jeder sichtbaren Rundungs-Schwelle, kein eigenes Token gerechtfertigt (Plan-Vorgabe befolgt, nicht per Annahme übernommen)"
  - "Alle vier jetzt leeren lokalen CSS-Klassen (.logo, .versionList, .wrapper) werden samt ihrer className-Referenz in der jeweiligen TSX-Datei vollständig entfernt, statt eine funktionslose Hülle zu belassen -- .previewCover/.previewCard in AnimeEdgeNavigation behalten dagegen ihre Klasse, da dort weiterhin je eine legitime, nicht verbotene Korrektur (flex: 0 0 auto bzw. Positionierung) verbleibt"
  - "EpisodeGlassCards verschachtelte Versionslisten-Card behält variant='flat' padding='dividedSection' unverändert bei und bekommt zusätzlich seamless -- die Polsterung bleibt unangetastet, nur Rahmen/Rundung/Fläche werden durch die neue Modifikatorklasse gezeroed (identisch zur in Plan 192-28 direkt nachgeprüften Lösung)"

requirements-completed: [Befund-Review2-R2]

# Metrics
duration: ~15min
completed: 2026-11-05
---

# Phase 192 Plan 32: ReleasePreviewRow/AnimeEdgeNavigation/EpisodeGlassCard/WatchlistAddButton -- Grundbaustein-Verdrahtung (Runde 5, Befund-Review2-R2) Summary

**Vier Komposit-Dateien verlieren ihre letzten lokalen border-/border-radius-/width-/display:grid-Deklarationen, indem sie die in Plan 192-28/192-29 bereits vorbereiteten Avatar/ResponsiveImage/Card/Stack-Fähigkeiten tatsächlich verdrahten, inklusive WatchlistAddButton als erstmals explizit anerkanntem Teil des Anime-Kopf-Komposits.**

## Performance

- **Duration:** ~15 min (Commit-zu-Commit, 05:12:00-05:15:24 UTC)
- **Started:** 2026-11-05T05:12:00Z
- **Completed:** 2026-11-05T05:15:24Z
- **Tasks:** 2 completed (beide TDD: RED→GREEN, mit echter RED-Verifikation per temporärem Implementierungs-Rückbau)
- **Files modified:** 13

## Accomplishments
- `ReleasePreviewRow`s Avatar-Aufrufstelle bekommt `bordered` statt einer lokalen `.logo { border: 1px solid var(--border-on-media); }`-Deklaration; die jetzt leere `.logo`-Klasse ist ersatzlos entfernt (CSS UND JSX); `ReleasePreviewRow.stories.tsx`s "Besteht aus"-Autodocs-Hinweis nennt Avatars `bordered`-Rolle jetzt explizit
- `AnimeEdgeNavigation`s Vorschaubild bekommt `ResponsiveImage roundedThumbnail` statt lokalem `border-radius`/`object-fit` auf `.previewCover`; die Vorschaukarte bekommt `Card widthPurpose="compactPreview"` statt einer lokalen `width: min(260px, 90vw)` auf `.previewCard` -- `.previewCover` behält nur noch seine legitime `flex: 0 0 auto`-Korrektur
- `EpisodeGlassCard`s verschachtelte Versionslisten-Card bekommt `seamless` statt der lokalen `.versionList { border-width: 0; border-radius: 0; background: transparent; }`-Klasse; die Klasse ist ersatzlos entfernt (direkt in Plan 192-28 nachgeprüft: keine bestehende Card-Variante erreicht alle drei Werte gleichzeitig)
- `WatchlistAddButton`s Knopf/Statusmeldung/Wiederholungs-Knopf wandern in einen `<Stack gap="relatedContent">` statt eines lokalen `.wrapper { display: grid; gap: 0.45rem; }` (ein roher, nie exakt auf der Grundskala liegender rem-Wert) -- der gemessene 0,45rem-vs.-8px-Unterschied liegt unterhalb jeder sichtbaren Rundungs-Schwelle, kein neues Token nötig; `.wrapper`-Klasse ersatzlos entfernt
- Visuelle Parität für alle vier Dateien per Storybook/Playwright bestätigt: `ReleasePreviewRow` ("Mit Gruppenlogo", "Koop"), `AnimeEdgeNavigation` (Hover-Vorschau), `EpisodeGlassCard` ("Aufgeklappt")
- Jede der vier RED-Testsuiten wurde real gegen eine temporär zurückgesetzte Implementierung verifiziert (nicht nur angenommen) -- echtes RED→GREEN, nicht nur ein nachträglich geschriebener, bereits grüner Test

## Task Commits

Each task was committed atomically (TDD RED/GREEN, mit echter RED-Verifikation):

1. **Task 1: ReleasePreviewRow (Avatar bordered) + AnimeEdgeNavigation (ResponsiveImage roundedThumbnail, Card widthPurpose)**
   - `7499d99a2` (test) - RED: neue Testfälle in `ReleasePreviewRow.test.tsx`/`AnimeEdgeNavigation.test.tsx`, real gegen die unveränderte Implementierung als fehlschlagend bestätigt
   - `d5fe0d12a` (feat) - GREEN: Avatar `bordered`, ResponsiveImage `roundedThumbnail`, Card `widthPurpose="compactPreview"` verdrahtet; `.logo`-Klasse entfernt; `.previewCover`/`.previewCard` CSS bereinigt; Stories-Autodocs-Hinweis ergänzt
2. **Task 2: EpisodeGlassCard (Card seamless) + WatchlistAddButton (Stack statt display:grid)**
   - `a0a97cc0b` (test) - RED: neue Testfälle in `EpisodeGlassCard.test.tsx`/`WatchlistAddButton.test.tsx`, real gegen die unveränderte Implementierung als fehlschlagend bestätigt
   - `a95d8674d` (feat) - GREEN: `Card seamless` an der verschachtelten Versionslisten-Card verdrahtet, `.versionList`-Klasse entfernt; `WatchlistAddButton`s Kinder in `<Stack gap="relatedContent">` verschoben, `.wrapper`-Klasse entfernt

**Plan metadata:** (folgt in separatem Abschluss-Commit)

_Hinweis: beide Tasks sind TDD-Tasks -- RED wurde jeweils real verifiziert, indem die bereits implementierten Produktionsdateien temporär per `git checkout --` auf den Vor-Plan-Stand zurückgesetzt, die neuen Tests als fehlschlagend bestätigt und die Implementierung danach wiederhergestellt wurden (kein nachträglich-grüner Test ohne echten RED-Nachweis)._

## Files Created/Modified
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx` - Avatar-Aufrufstelle bekommt `bordered`, `className={styles.logo}` entfernt
- `frontend/src/components/fansubs/ReleasePreviewRow.module.css` - `.logo`-Klasse (Rand-Deklaration) ersatzlos entfernt
- `frontend/src/components/fansubs/ReleasePreviewRow.stories.tsx` - "Besteht aus"-Hinweis nennt Avatars `bordered`-Rolle
- `frontend/src/components/fansubs/ReleasePreviewRow.test.tsx` - zwei neue Testfälle (Avatar-Rand-Klasse, `.logo`/`border` nicht mehr in CSS)
- `frontend/src/components/anime/AnimeEdgeNavigation.tsx` - ResponsiveImage bekommt `roundedThumbnail`, Card bekommt `widthPurpose="compactPreview"`
- `frontend/src/components/anime/AnimeEdgeNavigation.module.css` - `.previewCover`s `border-radius`/`object-fit`, `.previewCard`s `width` entfernt
- `frontend/src/components/anime/AnimeEdgeNavigation.test.tsx` - zwei neue Testfälle (CSS-Quelltext-Prüfung, DOM-Hover-Nachweis der Grundbaustein-Klassen/-Styles)
- `frontend/src/components/fansubs/EpisodeGlassCard.tsx` - verschachtelte Versionslisten-Card bekommt `seamless`, `className={styles.versionList}` entfernt
- `frontend/src/components/fansubs/EpisodeGlassCard.module.css` - `.versionList`-Klasse ersatzlos entfernt
- `frontend/src/components/fansubs/EpisodeGlassCard.test.tsx` - alten Drei-Deklarationen-Test durch zwei neue Testfälle (CSS-Abwesenheit, Card-Aufrufstellen-Prop) plus einen DOM-Nachweis der `cardSeamless`-Klasse ersetzt
- `frontend/src/components/watchlist/WatchlistAddButton.tsx` - Kinder in `<Stack gap="relatedContent">` statt `<div className={styles.wrapper}>`
- `frontend/src/components/watchlist/WatchlistAddButton.module.css` - `.wrapper`-Klasse (display:grid/gap) ersatzlos entfernt
- `frontend/src/components/watchlist/WatchlistAddButton.test.tsx` - zwei neue Testfälle (CSS-Abwesenheit, `--stack-gap`-Inline-Style-Nachweis)

## Decisions Made
Siehe `key-decisions` im Frontmatter oben (insbesondere die `relatedContent`-Wiederverwendungsentscheidung für WatchlistAddButton statt eines neuen Tokens, und die konsistente Entfernung aller vier leer gewordenen lokalen CSS-Klassen samt ihrer JSX-Referenz).

## Deviations from Plan

None - plan executed exactly as written. Die im Plan als "Claude's Discretion" markierten Punkte (WatchlistAddButtons `.message`-Element NICHT zusätzlich auf `Text` umgestellt, Token-Wiederverwendung statt Neuanlage für 0,45rem) wurden im konservativeren, explizit vom Plan empfohlenen Sinn entschieden.

## Issues Encountered
Ein neu geschriebener CSS-Abwesenheits-Test in `WatchlistAddButton.test.tsx` schlug zunächst fehl, weil der eigene erklärende CSS-Kommentar ("...Overrides" mit dem Wort "display:grid") versehentlich den eigenen Regex-Test (`/display:\s*grid/`) traf -- behoben durch Umformulierung des Kommentartexts ohne das literale Verstoßmuster zu wiederholen (kein Code-Fehler, nur eine Formulierungskollision zwischen Kommentartext und Testregex, innerhalb desselben RED→GREEN-Zyklus korrigiert).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 192-34 (Guard-Erweiterung, laut `192-CONTEXT.md`-Addendum "DANN die Guard-Erweiterung (Eigenschaften UND Dateiliste) selbst") kann jetzt `border`/`border-radius`/`background`/`box-shadow`/feste `width`/`height`/`display:grid` als neue verbotene Kategorien in `compositeLayoutPurity.guard.test.ts` ergänzen UND `ReleasePreviewRow.module.css`/`AnimeEdgeNavigation.module.css` erneut gegen die erweiterte Eigenschaftsliste prüfen (beide Dateien sind bereits sauber) sowie `EpisodeGlassCard.module.css`/`WatchlistAddButton.module.css` neu zum Guard hinzufügen (ebenfalls bereits sauber)
- Keine Blocker: `npx vitest run src/components/fansubs/ReleasePreviewRow.test.tsx src/components/anime/AnimeEdgeNavigation.test.tsx src/components/fansubs/EpisodeGlassCard.test.tsx src/components/watchlist/WatchlistAddButton.test.tsx` (60/60) und `npx tsc --noEmit` beide grün; `compositeLayoutPurity.guard.test.ts` (5/5), `gapPurposeNaming.guard.test.ts` (2/2), `Card.test.tsx`/`Stack.test.tsx`/`Avatar.test.tsx`/`ResponsiveImage.test.tsx` sowie der volle Sweep über `src/components/fansubs`, `src/components/anime`, `src/components/watchlist`, `src/components/ui`, `src/app/anime/[id]` (121/122 Dateien, 1467/1468 Tests) bleiben grün
- Zwei vorbestehende, von diesem Plan unberührte Testfehlschläge bestehen unverändert fort (bereits in `192-28-SUMMARY.md`/`192-29-SUMMARY.md` dokumentiert, nicht durch diesen Plan verursacht, nicht behoben -- außerhalb des Scopes): `ResponsiveImage.config.test.ts` (fehlende Umgebungsvoraussetzung außerhalb des Compose-Containers) und `storyDisplayNames.german.test.ts` (ein aus Plan 192-28s `Card.stories.tsx`-Story-Namen "AbschnittsPolsterung" stammender Fund)

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 13 modified files and this SUMMARY.md found on disk; all 4 task commits (`7499d99a2`,
`d5fe0d12a`, `a0a97cc0b`, `a95d8674d`) found in git history.
