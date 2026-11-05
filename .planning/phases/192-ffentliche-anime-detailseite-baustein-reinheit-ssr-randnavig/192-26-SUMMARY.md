---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 26
subsystem: ui
tags: [react, typescript, css, storybook, design-tokens, layout-primitives, playwright]

# Dependency graph
requires:
  - phase: 192 (Pläne 01-24)
    provides: Stack-Rhythmus-Array-Modus + 'captionLines'-Zweck (192-21), Cluster collapseBelow/gapCollapsed (192-22), Card-padding Zweck-Enum + 'dividedSection' (192-23), AnimeDetailHero .titleRow-Migrationsmuster (192-24), 192-CONTEXT.md-Addendum 2026-11-05a (Review-Befund 1, vierte Gap-Closure-Runde)
provides:
  - "ReleasePreviewRow.module.css's .row ist vollständig über Cluster collapseBelow=\"md\" gap=\"contentPair\" gapCollapsed=\"independentBlocks\" justify=\"between\" abgebildet -- kein eigenes display:flex/flex-direction/gap mehr (Case 10)"
  - "EpisodeGlassCard.module.css's .versionList ist eine echte, verschachtelte Card variant=\"flat\" padding=\"dividedSection\", vorangestellt von einem eigenständigen Divider spacing=\"none\" -- beide gebündelt in einem Stack gap=\"none\"-Wrapper, um einen doppelten --card-gap-Abstand der äußeren display:grid-Karte zu vermeiden (Case 11)"
  - "AnimeEdgeNavigation.module.css's .previewType deklariert kein eigenes margin-top mehr -- der Zwei-Zeilen-Bildunterschrift-Abstand kommt vollständig aus Stack gap=\"captionLines\" (Case 12)"
  - "compositeLayoutPurity.guard.test.ts: alle drei verbleibenden Ausnahme-Einträge dieses Plans (ReleasePreviewRow/.row, EpisodeGlassCard/.versionList, AnimeEdgeNavigation/.previewType) entfernt -- 9 der ursprünglich 12 dokumentierten Fälle sind jetzt geschlossen (die verbleibenden 3 -- AnimeDetailHero/.infoCardBody/.posterMetaCard/.statsRow/.relatedSection/.edgeNavigationOverlay -- gehören zu Plan 192-25)"
affects: [192-27]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wenn ein neues Geschwister-Element (z. B. ein Divider) direkt in einen display:grid-Grundbaustein mit festem, EINZIGEN gap-Wert (z. B. Cards --card-gap) eingefügt wird, entsteht pro zusätzlichem Geschwister ein ZUSÄTZLICHER Grid-Gap -- betroffene Elemente müssen stattdessen in einem gemeinsamen Stack/Cluster-Wrapper gebündelt werden, der selbst als EIN EINZIGES Grid-Kind zählt (siehe Deviation 1 unten)."
    - "Wenn ein Composite-Baustein Cluster collapseBelow=\"md\" ersetzt, dessen vorherige CSS in NUR EINEM der beiden Haltepunkt-Zustände align-items explizit setzte (hier: Desktop-only align-items:center, Mobil-Default stretch), kann Clusters EINZELNER align-Prop (gleicher Wert in beiden Zuständen) das nicht abbilden -- betroffene Kind-Elemente (.body/.action) bekommen stattdessen eine eng begründete, lokale width:100%-Korrektur (kein verbotenes Guard-Muster), die Cluster selbst unverändert mit seinem Standardwert align=\"center\" lässt."

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/ReleasePreviewRow.tsx
    - frontend/src/components/fansubs/ReleasePreviewRow.module.css
    - frontend/src/components/fansubs/ReleasePreviewRow.stories.tsx
    - frontend/src/components/fansubs/EpisodeGlassCard.tsx
    - frontend/src/components/fansubs/EpisodeGlassCard.module.css
    - frontend/src/components/fansubs/EpisodeGlassCard.test.tsx
    - frontend/src/components/fansubs/EpisodeGlassCard.stories.tsx
    - frontend/src/components/anime/AnimeEdgeNavigation.tsx
    - frontend/src/components/anime/AnimeEdgeNavigation.module.css
    - frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts

key-decisions:
  - "EpisodeGlassCard: Divider + die verschachtelte versionList-Card teilen sich EINEN Stack gap=\"none\"-Wrapper statt zwei eigene Geschwister-Kinder der äußeren display:grid-Karte zu sein -- per Playwright-Vollbild-Byte-Diff als notwendig gefunden (ohne Wrapper: 26px zusätzliche Kartenhöhe durch einen zweiten --card-gap-Abstand)."
  - "EpisodeGlassCard: .versionList behält drei eng begründete, vom Guard NICHT verbotene Größenkorrekturen (border-width:0/border-radius:0/background:transparent), da Cards variant=\"flat\"-Basisregeln sonst einen für die helle Admin-Optik gedachten 1px-Rahmen, 4px-Eckenrundung und Farbverlauf einführen würden -- Card.tsx/.module.css selbst bleiben unverändert (keine neue Card-Fähigkeit nötig, reine lokale Korrektur nach demselben Muster wie .posterMetaCard in 192-13)."
  - "ReleasePreviewRow: .body/.action bekommen eine lokale width:100%-Korrektur (Mobil-Zustand) statt einer neuen Cluster-Fähigkeit (z. B. alignCollapsed) -- Clusters align-Prop gilt für beide Haltepunkt-Zustände gleich (Standard \"center\"), die Original-CSS hatte aber nur im Desktop-Zustand ein explizites align-items:center (Mobil-Default war der implizite Flex-stretch-Standard); width ist keine der vom Guard verbotenen Kategorien, eine neue Cluster-Prop für einen bislang einmaligen Anwendungsfall wäre verfrüht."
  - "Keine neuen Grundbaustein-Fähigkeiten in diesem Plan -- alle drei Fälle konsumieren ausschließlich bereits in 192-21/22/23 interface-first angelegte Fähigkeiten (Stack-Rhythmus-Array/captionLines, Cluster collapseBelow/gapCollapsed, Card dividedSection)."

requirements-completed: [Befund-Review1]

# Metrics
duration: 23min
completed: 2026-11-05
---

# Phase 192 Plan 26: ReleasePreviewRow.row/EpisodeGlassCard.versionList/AnimeEdgeNavigation.previewType -- die letzten 3 der 12 Runde-4-Gap-Closure-Fälle Summary

**Die letzten 3 der 12 unabhängigen-Review-Ausnahmefälle (Case 10/11/12) sind durch bereits vorhandene Grundbaustein-Fähigkeiten (Cluster collapseBelow, Card dividedSection, Stack captionLines) ersetzt -- zwei davon brauchten dabei eine nicht im Plan vorhergesehene, per Playwright gefundene Korrektur (Stack-Bündel-Wrapper gegen einen doppelten Grid-Gap; width:100%-Korrektur gegen Clusters einheitlichen align-Wert), beide mit bestätigtem Zero-Pixel-Diff.**

## Performance

- **Duration:** ~23 min (Commit-zu-Commit, 01:50–02:13 UTC)
- **Started:** 2026-11-05T01:50:00Z (ca., unmittelbar nach 192-24)
- **Completed:** 2026-11-05T02:13:06Z
- **Tasks:** 3 completed
- **Files modified:** 10

## Accomplishments
- `ReleasePreviewRow.module.css`'s `.row` deklariert kein eigenes `display:flex`/`flex-direction`/`gap` mehr -- `<Cluster collapseBelow="md" gap="contentPair" gapCollapsed="independentBlocks" justify="between">` übernimmt die haltepunktabhängige Zeile-zu-Spalte-Umkehr vollständig (Case 10)
- `EpisodeGlassCard.module.css`'s `.versionList` ist eine echte, verschachtelte `<Card variant="flat" padding="dividedSection">`, vorangestellt von einem eigenständigen `<Divider spacing="none">` -- der vormalige `border-top` + asymmetrische `padding`-Deklaration ist vollständig ersetzt (Case 11)
- `AnimeEdgeNavigation.module.css`'s `.previewType` deklariert kein `margin-top` mehr -- `<Stack gap="captionLines">` trägt den kompletten 4px-Zeilenabstand zwischen Titel- und Typ-Text der Vorschaukarten-Bildunterschrift (Case 12)
- `compositeLayoutPurity.guard.test.ts`: alle drei Ausnahme-Einträge dieses Plans entfernt (`ReleasePreviewRow`/`.row`, `EpisodeGlassCard`/`.versionList`, `AnimeEdgeNavigation`/`.previewType`) -- 9 der ursprünglich 12 dokumentierten Fälle sind damit geschlossen
- Drei vollständige Playwright-Vollbild-Byte-Diff-Durchläufe (nach jedem Task, Desktop 1440/Mobil 390 wo zutreffend, Storybook-Stories "Mit allen Extras"/"Koop"/"Ohne Logo"/"Aufgeklappt"/"Mit Zurück und Weiter" gegen eine disposable Worktree-Baseline des unmittelbaren Vor-Plan-Commits) bestätigen **0 Pixel Abweichung** nach jedem Task

## Task Commits

1. **Task 1: ReleasePreviewRow .row Cluster collapse (Case 10)**
   - `aca9e6a11` (feat) - Cluster-Migration von `.row`, `.body`/`.action`-width:100%-Korrektur, Guard-Ausnahme entfernt, Playwright-Byte-Diff-Nachweis (alle 3 Pflicht-Stories, Desktop+Mobil)
2. **Task 2: EpisodeGlassCard .versionList dividedSection Card (Case 11)**
   - `cd7b64834` (feat) - Card-Migration von `.versionList` samt Stack gap="none"-Bündel-Wrapper, drei lokale Größenkorrekturen, Guard-Ausnahme entfernt, Playwright-Byte-Diff-Nachweis (aufgeklappter Zustand)
3. **Task 3: AnimeEdgeNavigation .previewType captionLines Stack (Case 12)**
   - `2eee669a1` (feat) - Stack-Migration von `.previewType`, Guard-Ausnahme entfernt, Playwright-Byte-Diff-Nachweis (Hover-Vorschau-Zustand "Weiter")
4. **Dokumentations-Nachzug (Rule 2, siehe Deviations):**
   - `5da78cd0f` (docs) - Storybook-"Besteht aus"-Hinweise von `EpisodeGlassCard`/`ReleasePreviewRow` um Divider/Cluster ergänzt

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx` - `.row`-`<div>` durch `<Cluster collapseBelow="md" gap="contentPair" gapCollapsed="independentBlocks" justify="between">` ersetzt
- `frontend/src/components/fansubs/ReleasePreviewRow.module.css` - `.row`-Regel (Basis + Media-Query) entfernt; `.body`/`.action` bekommen eine `width: 100%`-Korrektur
- `frontend/src/components/fansubs/ReleasePreviewRow.stories.tsx` - Autodocs-"Besteht aus" um Cluster ergänzt
- `frontend/src/components/fansubs/EpisodeGlassCard.tsx` - `.versionList`-`<div>` durch `<Stack gap="none"><Divider spacing="none"/><Card variant="flat" padding="dividedSection"><Stack gap="independentBlocks">{children}</Stack></Card></Stack>` ersetzt; `panelId` wandert von der vormaligen `<div>` auf die neue `<Card>`
- `frontend/src/components/fansubs/EpisodeGlassCard.module.css` - `.versionList`s `border-top`+`padding` entfernt, drei lokale Größenkorrekturen (`border-width:0`/`border-radius:0`/`background:transparent`) ergänzt
- `frontend/src/components/fansubs/EpisodeGlassCard.test.tsx` - Testfall auf die neue CSS-Korrektur umgestellt, zwei neue Testfälle (Divider-Rendering vor der Card, kein Divider/Panel im zugeklappten Zustand)
- `frontend/src/components/fansubs/EpisodeGlassCard.stories.tsx` - Autodocs-"Besteht aus" um Divider ergänzt
- `frontend/src/components/anime/AnimeEdgeNavigation.tsx` - `.previewMeta`-`<div>` durch `<Stack gap="captionLines">` ersetzt
- `frontend/src/components/anime/AnimeEdgeNavigation.module.css` - `.previewType`s `margin-top` entfernt
- `frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts` - drei Ausnahme-Einträge entfernt (`.row`, `.versionList`, `.previewType`)

## Decisions Made
Siehe `key-decisions` im Frontmatter oben (Stack-Bündel-Wrapper gegen doppelten Grid-Gap, drei lokale Card-Größenkorrekturen statt neuer Card-Fähigkeit, `width:100%`-Korrektur statt neuer Cluster-Fähigkeit, keine neuen Grundbaustein-Fähigkeiten in diesem Plan).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EpisodeGlassCard: Divider+versionList-Card in einen gemeinsamen Stack gap="none"-Wrapper gebündelt**
- **Found during:** Task 2, erster Playwright-Vollbild-Byte-Diff nach der naiven Umsetzung (Divider und Card als zwei eigene Geschwister-Kinder der äußeren `Card variant="glass"`)
- **Issue:** Die äußere `EpisodeGlassCard`-Karte ist selbst `display:grid` mit einem EINZIGEN `gap`-Token (`--card-gap`, 18px) zwischen all ihren direkten Kindern. Vorher hatte sie genau 2 Kinder (Header-Button, `.versionList`-`<div>`) -> 1 Gap. Mit Divider als drittem, eigenem Geschwister-Kind entstanden 2 Gaps (Header↔Divider, Divider↔Liste) statt 1 -- per Playwright-DOM-Vermessung als exakt 26px zusätzliche Kartenhöhe im aufgeklappten Zustand gefunden (18px zusätzlicher Grid-Gap + Dividers eigener, damals noch gesetzter `withinMetaBlock`-Außenabstand von 8px).
- **Fix:** Divider (`spacing="none"`, kein eigener Außenabstand) und die verschachtelte `versionList`-Card stecken jetzt gemeinsam in einem `<Stack gap="none">`-Wrapper, der selbst als EIN EINZIGES Grid-Kind der äußeren Karte zählt -- exakt wie vorher nur das eine `<div id={panelId}>`.
- **Files modified:** `frontend/src/components/fansubs/EpisodeGlassCard.tsx`
- **Verification:** Playwright-Vollbild-Byte-Diff danach 0 Pixel Abweichung (aufgeklappter Zustand, Desktop); `EpisodeGlassCard.test.tsx` (5/5) grün
- **Committed in:** `cd7b64834` (Task 2)

**2. [Rule 1 - Bug] ReleasePreviewRow: .body/.action bekommen eine width:100%-Korrektur für den gestapelten Mobil-Zustand**
- **Found during:** Task 1, Code-Review vor dem ersten Playwright-Lauf (Original-CSS-Analyse)
- **Issue:** `.row`s ursprüngliche CSS hatte `align-items:center` NUR im Desktop-Media-Query, der Mobil-Basiszustand hatte GAR KEIN `align-items` (impliziter Flex-`stretch`-Standard -> `.body`/`.action` füllten die volle Zeilenbreite). `Cluster`s `align`-Prop gilt dagegen für BEIDE Haltepunkt-Zustände gleich (Standardwert `"center"`, identisch zu 192-24s `.titleRow`, deren Original-CSS aber `align-items:center` in BEIDEN Zuständen hatte -- ein tatsächlicher Unterschied zur hier vorliegenden Datei, nicht wie im Plan-Interface angenommen "identisches Prop-Shape"). Ohne Korrektur hätte `.body`/`.action` im gestapelten Mobil-Zustand auf ihre Inhaltsbreite geschrumpft statt die volle Zeile zu füllen -- am deutlichsten sichtbar am "Zum Release"-Knopf, dessen `width:100%` dann nur noch 100% einer geschrumpften, nicht der vollen Zeilenbreite gewesen wäre.
- **Fix:** `.body { width: 100%; }` (Basis) sowie `.action { width: 100%; }` (Basis) / `.action { width: auto; }` (Desktop-Media-Query) ergänzt -- `width` ist keine der vom Guard verbotenen Kategorien (nur `display`/`flex-direction`/`grid-template`/`gap`/`padding`/`margin`).
- **Files modified:** `frontend/src/components/fansubs/ReleasePreviewRow.module.css`
- **Verification:** Playwright-Vollbild-Byte-Diff bestätigt 0 Pixel Abweichung für alle 3 Pflicht-Stories bei Desktop UND Mobil (390px)
- **Committed in:** `aca9e6a11` (Task 1)

**3. [Rule 2 - Missing Critical] Storybook-"Besteht aus"-Hinweise um Divider (EpisodeGlassCard) und Cluster (ReleasePreviewRow) ergänzt**
- **Found during:** Nach Task 3, Selbstprüfung gegen CLAUDE.md "Pflichtregel 'Stories ziehen mit'"
- **Issue:** `EpisodeGlassCard`s Autodocs-Beschreibung nannte den neu komponierten `Divider`-Grundbaustein nicht; `ReleasePreviewRow`s Beschreibung nannte `Cluster` nicht, obwohl dieser Plan `Cluster` eine zweite, prominente Rolle (Gesamtzeilen-Layout) zusätzlich zur bereits bestehenden Avatar-Spalten-Rolle gibt.
- **Fix:** Beide Autodocs-Beschreibungen um die jeweils fehlende Komponente ergänzt, inkl. ihrer konkreten Rolle in der Komposition.
- **Files modified:** `frontend/src/components/fansubs/EpisodeGlassCard.stories.tsx`, `frontend/src/components/fansubs/ReleasePreviewRow.stories.tsx`
- **Verification:** `catalogTaxonomy.test.ts` (33/33) grün, `npx tsc --noEmit` grün
- **Committed in:** `5da78cd0f` (separater Dokumentations-Commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 - Bugs gegen das Zero-Pixel-Diff-Mandat, 1 Rule 2 - fehlende Doku-Nachziehung), keine Scope-Erweiterung über das Plan-Ziel hinaus -- alle drei waren notwendig, um die explizit geforderten Zero-Pixel-Diff- bzw. Dokumentationspflicht-Kriterien zu erfüllen.
**Impact on plan:** Keine neuen Dateien außerhalb des Plan-`files_modified`-Umfangs außer den beiden `.stories.tsx`-Dateien (Deviation 3, reine Dokumentation) und `EpisodeGlassCard.test.tsx` (bereits implizit durch die TDD-Natur der Task-2-Verifikation erwartet).

## Issues Encountered

Beim ersten Playwright-Messdurchlauf für Task 2 zeigte ein direkter Byte-Diff gegen die Vor-Plan-Baseline eine deutliche Abweichung (die aufgeklappte Episodenkarte war sichtbar höher, mit einem zusätzlichen hellen Rand-/Rundungs-Artefakt am unteren Kartenrand). Root-Cause-Analyse per gezielter Playwright-DOM-Vermessung (`getBoundingClientRect()`+`getComputedStyle()` auf der äußeren Karte, dem Divider und der verschachtelten Versionslisten-Card, nicht vermutet) identifizierte den doppelten `--card-gap`-Grid-Abstand (siehe Deviation 1); nach der Korrektur 0 abweichende Bytes.

Für Task 1 wurde VOR dem ersten Implementierungsversuch die Original-CSS genau gelesen (nicht nur das Plan-Interface übernommen) und dabei die Mobil/Desktop-`align-items`-Asymmetrie gefunden, die im Plan-Interface-Text nicht genannt war ("identisches Prop-Shape zu 192-24" traf auf `align-items` nicht zu) -- die Korrektur wurde direkt mitgeplant und beim ersten Playwright-Lauf bestätigt (0 Pixel Abweichung bereits im ersten Durchlauf, keine Nachbesserung nötig).

Eine anfänglich beobachtete Abweichung im Hover-Vorschau-Screenshot von `AnimeEdgeNavigation` (unverändert von diesem Plan) stellte sich als reine Mess-Flakiness heraus (die Vorschaukarte lädt ihre Daten asynchron über den MSW-Listenhandler; ein fixer `waitForTimeout` nach dem Hover war nicht immer ausreichend) -- durch ein explizites Warten auf den fixture-eigenen Titeltext vor dem Screenshot behoben (reines Mess-Skript-Artefakt, keine Produktionscode-Änderung, keine Erwähnung wert in Deviations, da nichts an Produktionscode geändert wurde).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 192-27 (laut `192-CONTEXT.md`-Addendum der abschließende Schritt nach allen 4 Grundbaustein-Erweiterungen UND allen Komposit-Dateien) kann jetzt, sobald Plan 192-25 (`AnimeDetailHero.module.css`s verbleibende `.posterMetaCard`/`.edgeNavigationOverlay`-Fälle) ebenfalls abgeschlossen ist, `DOCUMENTED_LAYOUT_EXCEPTIONS` und den zugehörigen Existenz-Selbsttest aus `compositeLayoutPurity.guard.test.ts` vollständig entfernen (laut Addendum: Hauptprüfung muss danach mit LEERER Verstoßliste über alle 4 Dateien grün sein)
- Keine Blocker: `npx vitest run src/components/fansubs/ReleasePreviewRow.test.tsx src/components/fansubs/EpisodeGlassCard.test.tsx src/components/anime/AnimeEdgeNavigation.test.tsx "src/app/anime/[id]/compositeLayoutPurity.guard.test.ts"` (20/20), `npx vitest run src/components/ui/Stack.test.tsx src/components/ui/Cluster.test.tsx src/components/ui/Card.test.tsx src/components/ui/Divider.test.tsx src/components/ui/catalogTaxonomy.test.ts src/components/ui/processHistory.regression.test.ts "src/app/anime/[id]/gapPurposeNaming.guard.test.ts" "src/app/anime/[id]/page.test.tsx"` (378/378) und `npx tsc --noEmit` alle grün
- Disposable Snapshot-Infrastruktur (git worktree unter `/tmp/t4s-baseline-192-26` + vier statische Storybook-Builds unter `/tmp` + lokale http-server auf Ports 6007/6008 + ein disposables Playwright-Mess-Skript innerhalb von `frontend/`) wurde nach Gebrauch vollständig entfernt (`git worktree remove --force`, `rm -rf`), keine Spuren im Checkout oder unter `/tmp`

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 10 modified files plus this SUMMARY.md found on disk; all 4 commits (aca9e6a11, cd7b64834, 2eee669a1, 5da78cd0f) found in git history.
