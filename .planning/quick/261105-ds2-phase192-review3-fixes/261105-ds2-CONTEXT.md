# Quick Task 261105-ds2: Phase-192-Review Befunde 3 (Runde 2 von 2 Nachtrag) - Context

**Gathered:** 2026-11-05
**Status:** Ready for planning
**Mode:** Autonomer ki-run-Auftrag — Entscheidungen liegen bereits als bindende, mit eigener
Codeprüfung gegengelesene Review-Rückmeldung vor. Keine interaktive Rückfrage möglich/nötig;
technische Details werden autonom entschieden und hier dokumentiert.

<domain>
## Task Boundary

Drei offene [high]-Review-Befunde aus Phase 192 (öffentliche Anime-Detailseite) beheben, bezogen
auf bereits ausgeführte Arbeit der Phase (Pläne 192-01 bis 192-35, abgeschlossen und verifiziert):

1. `AnimeEdgeNavigation.test.tsx` enthält weiterhin einen `fireEvent.mouseEnter`-basierten Test
   (Zeile 147-170, "Runde 5"-Test für `roundedThumbnail`/`widthPurpose="compactPreview"").
2. `ReleasePreviewRow.module.css` enthält weiterhin eigenes Layout-CSS (`.body`/`.action`/deren
   Button/Link `width: 100%`/`width: auto`), durch eine `100%`-Ausnahme im
   `compositeLayoutPurity.guard.test.ts` bislang zugelassen.
3. Code-Kommentare in den von Phase 192 geänderten Dateien verweisen weiterhin auf
   Befunde/Runden/Pläne/SUMMARY/RESEARCH statt rein fachlich zu erklären.

Phase 192 selbst (Context, Waves, VERIFICATION) bleibt unverändert bestehen — dies ist eine
gezielte Korrektur, keine neue Planungsrunde der Hauptphase.

</domain>

<decisions>
## Implementation Decisions

### Befund 1 — Hover-Vorschau ohne `fireEvent`

**Ist-Zustand (geprüft):** `AnimeEdgeNavigation.tsx`s Vorschaukarte (`<Card widthPurpose=
"compactPreview"><Cluster><ResponsiveImage roundedThumbnail/><Stack>...</Stack></Cluster></Card>`)
wird NUR gerendert, wenn `previewAnime` (aus `useAnimeEdgeNavigationHover`) nicht `null` ist — die
`roundedThumbnail`/`widthPurpose="compactPreview"`-Props sind dabei UNBEDINGT Teil der JSX, sobald
`previewAnime` gesetzt ist, unabhängig davon, WIE der Hover-Zustand zustande kam. Der Nachweis
braucht deshalb kein echtes Hover-Event — er muss nur zeigen, dass die Vorschaukarte, wenn
gerendert, diese beiden Grundbaustein-Props trägt.

**Entscheidung:**
- Die Vorschaukarten-JSX (`Card`+`Cluster`+`ResponsiveImage`+`Stack`-Block) wird aus
  `AnimeEdgeNavigationContext` in eine eigene, benannte, EXPORTIERTE Funktionskomponente
  ausgelagert (z. B. `AnimeEdgeNavigationPreviewCard`), die reine Anzeige-Props entgegennimmt
  (Anime-Titel, Typ, Cover-URL, Hover-Richtung für die Links/Rechts-Positionierung) — keine Hooks,
  kein State. `AnimeEdgeNavigationContext` ruft sie bedingt auf, wenn `previewAnime` gesetzt ist.
- Der neue Test ruft `AnimeEdgeNavigationPreviewCard(props)` DIREKT als Funktion auf (etabliertes
  Muster dieses Projekts: `page.test.tsx`/`AnimeDetailView.test.tsx` — Komponente als Funktion
  aufrufen, zurückgegebenen Element-Baum mit `Children.toArray`/`isValidElement` durchlaufen,
  `.type`/`.props` der gefundenen Elemente prüfen) und prüft direkt, dass das gefundene
  `ResponsiveImage`-Element `roundedThumbnail` trägt und das `Card`-Element
  `widthPurpose="compactPreview"` trägt — ohne `render()`, ohne `fireEvent`, ohne `userEvent`.
- Der bisherige `fireEvent.mouseEnter`-Test (Zeile 147-170) entfällt ersatzlos (durch den neuen
  direkten Test vollständig abgedeckt). Der bereits bestehende, korrekte Hook-Test (Zeile 68-89,
  `renderHook`-basiert, kein `fireEvent`) bleibt unverändert — er ist bereits regelkonform.
- Das tatsächliche Erscheinen der Karte beim Darüberfahren mit der Maus im Browser wird live
  abgenommen, nicht automatisiert nachgebildet.

### Befund 2 — ReleasePreviewRow ohne eigenes Breiten-/Flex-Layout

**Ist-Zustand (geprüft):**
- `.body { width: 100%; }` (Basis) + `@media(min-width:768px) { .body { flex:1; } }`
- `.action, .action > a, .action > button { width: 100%; }` (Basis) + `@media(min-width:768px)
  { .action { flex-shrink:0; width:auto; } .action > a, .action > button { width: auto; } }`
- Grund laut Kommentar: der äußere `<Cluster collapseBelow="md" ...>` setzt keinen `align`-Wert
  (Standard `'center'`) — im gestapelten (Mobil-)Zustand schrumpfen Kinder dadurch auf ihre
  Inhaltsbreite statt die volle Zeilenbreite zu füllen, wie es vor der Umstellung der implizite
  Flex-`stretch`-Standard tat.
- `Cluster.tsx` hat BEREITS einen passenden Wert für genau dieses Verhalten: `align="stretch"`
  (vorhandener, nicht genutzter Enum-Wert `'start' | 'center' | 'end' | 'baseline' | 'stretch'`).
  Mit `align="stretch"` auf dem äußeren Cluster strecken sich `.body` und `.action` im gestapelten
  (Spalten-)Zustand automatisch auf die volle Querachsen-Breite (= Zeilenbreite) — KEINE neue
  Cluster-Fähigkeit nötig, nur korrekte Nutzung der bestehenden Prop.
- Im Zeilen-Zustand (≥768px) ist die Querachse vertikal (Höhe), `align="stretch"` wirkt dort auf
  die Höhe, nicht die Breite — das entspricht dem gewünschten Verhalten (`.action`s Breite soll
  dort NICHT gestreckt werden, `justify="between"` verteilt die Hauptachse bereits).
- Die Button/Link-INNENSTRECKUNG (`.action > a, .action > button`) ist davon NICHT automatisch
  erfasst — `Cluster`s `align` wirkt nur auf seine DIREKTEN Kinder (`.action`), nicht auf
  `.action`s eigenes Kind (den `Button`). `Button.tsx` hat bereits `fullWidth`/
  `responsiveFullWidth`-Props, aber `responsiveFullWidth`s Haltepunkt-Richtung ist genau
  ENTGEGENGESETZT zu dem hier benötigten Verhalten (`responsiveFullWidth`: Standard 100%, NUR
  unterhalb 767px auf `auto` — bereits korrekt und unverändert genutzt von
  `WatchlistAddButton.tsx`, NICHT anfassen). Es braucht einen NEUEN, eigenständig benannten
  Button-Zweck für die hier benötigte, umgekehrte Haltepunkt-Richtung (100% NUR unterhalb 768px,
  `auto` ab 768px) — z. B. `fullWidthBelowMd` (Name nach tatsächlichem Zweck ausrichten: „volle
  Breite, solange der umgebende Cluster gestapelt ist" — exakt der Haltepunkt, den `Cluster`s
  eigenes `collapseBelow="md"` bereits verwendet, 48rem/768px, damit beide Mechanismen
  garantiert synchron kippen).

**Entscheidung:**
- `ReleasePreviewRow.tsx`s äußerer `<Cluster collapseBelow="md" ...>` bekommt `align="stretch"`.
  Der innere, eigenständige `<div className={styles.action}>`-Wrapper um den `Button` kann
  entfallen, wenn der `Button` direkt als Clusters zweites Kind steht (einfacher) — oder bleibt
  bestehen, falls aus anderen Gründen (z. B. Flex-Item-Eigenschaften `flex-shrink:0` im
  Zeilen-Zustand) ein Wrapper weiterhin sinnvoll ist; in letzterem Fall darf der Wrapper selbst
  aber KEIN `width` mehr deklarieren (nur noch über `Cluster`s eigene Mechanik/neue
  `Button`-Prop gelöst).
- `Button.tsx` bekommt eine neue Prop `fullWidthBelowMd?: boolean` (Name exakt an Zweck/Haltepunkt
  ausgerichtet, finale Benennung Claude's Discretion innerhalb dieser Leitplanke): volle Breite
  unterhalb 768px, `auto`-Breite ab 768px — die exakte Umkehrung von `responsiveFullWidth`s
  bestehender Haltepunkt-Richtung, als eigener, unabhängiger Modifikator (NICHT als Parameter von
  `responsiveFullWidth`, da unterschiedliche, nicht kombinierbare Zweck-Fälle). Neue
  CSS-Modifikatorklasse in `Button.module.css` nach demselben Muster wie `.buttonResponsiveBlock`.
  `ReleasePreviewRow.tsx`s `Button` bekommt diese neue Prop statt des `.action > a, .action >
  button`-Breiten-CSS.
- `Button.stories.tsx` bekommt eine neue Story für `fullWidthBelowMd` (Resize-Demo, analog zu
  einer bereits vorhandenen `responsiveFullWidth`-Story, falls eine existiert — sonst nach
  demselben Muster wie `Cluster.stories.tsx`s `collapseBelow`-Demo). `docs/FRONTEND_ARCHITEKTUR.md`
  wird um die neue Fähigkeit ergänzt.
- `compositeLayoutPurity.guard.test.ts`: `'100%'` wird aus der `isSizeResetValue`-Ausnahmeliste
  für die `width-height`-Kategorie entfernt (die übrigen Werte `'auto'`/`'0'`/`'0px'`/
  `'min-content'`/`'max-content'` bleiben unverändert als legitime Rücksetzer bestehen). Nach der
  Migration muss die Haupt-Verstoßprüfung weiterhin mit LEERER Liste über alle 9 bewachten
  Dateien grün sein — keine neue Ausnahme als Ersatz.
- Pflicht-Nachweis: Zero-Pixel-Diff für `ReleasePreviewRow` gegen den aktuellen Stand (Desktop
  1440 + Mobil 390, alle vier Storybook-Varianten: „Mit Gruppenlogo"/„Koop"/„Ohne Logo"/„Mit
  allen Extras" bzw. die tatsächlich vorhandenen Stories), per Playwright-Screenshot-Vergleich.

### Befund 3 — Code-Kommentare ohne Planungs-/Auftrags-Verweise

**Ist-Zustand (geprüft):** Eine gezielte Suche über exakt die Dateien, die Phase 192 tatsächlich
geändert hat (ermittelt per `git log` über den Commit-Bereich der Phase-192-Pläne, 105 Dateien),
nach den Mustern `Befund[- ]?\d+`, `Runde \d+`, `Plan 192-\d+`, `192-\d+-(SUMMARY|PLAN|RESEARCH)`,
`Phase 192\b` ergab **46 betroffene Dateien** (Liste unten) — weit über die im Review genannten
Beispieldateien hinaus. Ein bereits bestehender Wächter
(`frontend/src/components/ui/processHistory.regression.test.ts`) verbietet exakt dieses Muster
bereits HEUTE, aber NUR für (a) Nicht-Test-Dateien direkt in `components/ui/` und (b) `.stories.tsx`-
Dateien repoweit — nicht für `src/app/anime/[id]/`, `src/components/fansubs/`,
`src/components/anime/`, `src/components/watchlist/` oder `.test.ts(x)`-Dateien, was exakt die
Lücke erklärt, durch die diese Verweise unbemerkt blieben.

**Betroffene Dateien (46, alle in dieser Quick-Aufgabe zu bereinigen):**
```
frontend/.storybook/mocks/animeFixtures.ts
frontend/src/app/anime/[id]/AnimeDetailHero.module.css
frontend/src/app/anime/[id]/AnimeDetailHero.tsx
frontend/src/app/anime/[id]/AnimeDetailView.styles.ts
frontend/src/app/anime/[id]/AnimeDetailView.test.tsx
frontend/src/app/anime/[id]/AnimeDetailView.tsx
frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts
frontend/src/app/anime/[id]/detailStyleSystem.guard.test.ts
frontend/src/app/anime/[id]/effectTokenPurity.guard.test.ts
frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts
frontend/src/app/anime/[id]/page.episodes.module.css
frontend/src/app/anime/[id]/page.module.css
frontend/src/app/anime/[id]/page.performance.test.ts
frontend/src/app/anime/[id]/page.test.tsx
frontend/src/app/anime/[id]/page.tsx
frontend/src/components/anime/AnimeEdgeNavigation.test.tsx
frontend/src/components/anime/AnimeEdgeNavigation.tsx
frontend/src/components/anime/AnimeMediaProvider.tsx
frontend/src/components/anime/useAnimeEdgeNavigationHover.ts
frontend/src/components/fansubs/EpisodeGlassCard.module.css
frontend/src/components/fansubs/EpisodeGlassCard.test.tsx
frontend/src/components/fansubs/EpisodeGlassCard.tsx
frontend/src/components/fansubs/FansubGroupContext.test.tsx
frontend/src/components/fansubs/FansubGroupPicker.module.css
frontend/src/components/fansubs/FansubGroupPicker.test.tsx
frontend/src/components/fansubs/FansubHeroSection.accessibility.test.ts
frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
frontend/src/components/fansubs/FansubVersionBrowser.tsx
frontend/src/components/fansubs/ReleasePreviewRow.module.css
frontend/src/components/fansubs/ReleasePreviewRow.test.tsx
frontend/src/components/fansubs/ReleasePreviewRow.tsx
frontend/src/components/showcases/DesignTokensShowcase.module.css
frontend/src/components/showcases/DesignTokensShowcase.tsx
frontend/src/components/ui/Card.module.css
frontend/src/components/ui/Cluster.test.tsx
frontend/src/components/ui/FormField.test.tsx
frontend/src/components/ui/Pagination.test.tsx
frontend/src/components/ui/Stack.tsx
frontend/src/components/watchlist/WatchlistAddButton.module.css
frontend/src/components/watchlist/WatchlistAddButton.test.tsx
frontend/src/components/watchlist/WatchlistAddButton.tsx
frontend/src/lib/designTokens.test.ts
frontend/src/lib/designTokens.ts
frontend/src/styles/tokens/components.css
frontend/src/styles/tokens/effects.css
frontend/src/styles/tokens/layout.css
```
(Befund-1/2-Dateien aus dieser selben Quick-Aufgabe — `AnimeEdgeNavigation.test.tsx`,
`AnimeEdgeNavigation.tsx`, `ReleasePreviewRow.module.css`/`.tsx`, `compositeLayoutPurity.guard.
test.ts` — werden beim Bearbeiten der jeweiligen Befunde gleich mit bereinigt, nicht doppelt.)

**Entscheidung:**
- Jede Fundstelle wird umformuliert: WAS der Code tut und WARUM (fachliche Regel/Invariante),
  auf Deutsch mit korrekten Umlauten, ohne Verweis auf Befund-/Runden-/Plan-/Phasen-Nummern oder
  Dateinamen wie `*-SUMMARY.md`/`*-RESEARCH.md`. Technische Substanz (z. B. "Stack kann das nicht
  ausdrücken, ohne den Pixel-Rhythmus zu verändern") bleibt erhalten — nur die
  Planungs-Verweise entfallen.
- `processHistory.regression.test.ts` bekommt einen DRITTEN `describe`-Block, der dieselbe
  bestehende `FORBIDDEN_PATTERNS`-Liste/`findHits`-Funktion auf die vier Phase-192-Pilot-
  Verzeichnisse (`src/app/anime/[id]/`, `src/components/fansubs/`, `src/components/anime/`,
  `src/components/watchlist/`) anwendet — DIESMAL inklusive `.test.ts(x)`- und `.module.css`-
  Dateien (nicht wie die bestehenden zwei Blöcke nur Nicht-Test-Dateien bzw. nur `.stories.tsx`),
  damit der Rückfall dauerhaft verhindert wird, nicht nur einmalig aufgeräumt. Wiederverwendet
  die bestehende Muster-/Scan-Logik vollständig, erweitert nur den Datei-Geltungsbereich.

</decisions>

<specifics>
## Specific Ideas

- Finding 1 and finding 3 overlap on `AnimeEdgeNavigation.test.tsx` (the `fireEvent` test block
  itself has the "Runde 5, Befund-Review2-R2" comment) — fix both in the same pass on that file,
  not as separate edits.
- Finding 2 and finding 3 overlap on `ReleasePreviewRow.module.css`/`.tsx` and
  `compositeLayoutPurity.guard.test.ts` similarly.

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above. Internal reference: the
established "call component as plain function + walk element tree" test pattern is already used
in `frontend/src/app/anime/[id]/page.test.tsx` and
`frontend/src/app/anime/[id]/AnimeDetailView.test.tsx` — follow their exact `elements()`-helper
shape, do not reinvent it.

</canonical_refs>
