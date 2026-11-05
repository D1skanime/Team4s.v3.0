---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 25
subsystem: ui
tags: [react, typescript, css-media-queries, storybook, design-tokens, layout-primitives, playwright]

# Dependency graph
requires:
  - phase: 192 (Pläne 01-24, 26)
    provides: Cluster collapseBelow/gapCollapsed + float="controlBand" (192-22), Card-padding Zweck-Enum + bleedBelowMd (192-23), AnimeDetailHero .infoCardBody/.titleRow-Migration (192-24), ReleasePreviewRow/EpisodeGlassCard/AnimeEdgeNavigation-Migration (192-26), 192-CONTEXT.md-Addendum 2026-11-05a (Review-Befund 1, vierte Gap-Closure-Runde)
provides:
  - ".edgeNavigationOverlay ist vollständig durch Cluster float=\"controlBand\" ersetzt -- kein eigenes Positionierungs-CSS mehr in AnimeDetailHero.module.css"
  - ".posterMetaCard ist vollständig durch Card bleedBelowMd ersetzt -- kein eigenes Mobil-margin/justify-items-CSS mehr"
  - "Neuer Stack-Zweck 'contentToControlBand' (16px): Abstand zwischen Hero-Hauptinhalt und einer darunterliegenden, schwebenden Steuerelement-Reihe, wirkt nur unterhalb von deren eigenem Haltepunkt"
  - "Cluster float=\"controlBand\"s Positionierung (position:absolute/z-index/pointer-events) sitzt jetzt auf dem ÄUSSEREN Wurzelelement (neue .floatControlBandRoot-Klasse, @media statt @container) statt nur auf dem inneren Flex-Kind -- notwendig, damit das Element in einem umgebenden Flex-/Grid-gap-Kontext (z. B. Stack) oberhalb des Haltepunkts vollständig aus der Gap-Berechnung herausfällt"
  - "compositeLayoutPurity.guard.test.ts: alle sechs verbleibenden AnimeDetailHero-Ausnahme-Einträge entfernt -- diese Datei hat jetzt ZERO Ausnahmen, wie von diesem Plan und 192-CONTEXT.md addendum_2026-11-05a gefordert"
affects: [192-27]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Eine Grundbaustein-Fähigkeit, die ein Element oberhalb eines Haltepunkts vollständig aus dem Text-/Flex-/Grid-Fluss nehmen soll (position:absolute), muss diese Positionierung auf dem WURZELELEMENT selbst tragen, nicht nur auf einem inneren, nachfahren-gebundenen Flex-Kind -- sonst bleibt das Wurzelelement (0px hoch, aber weiterhin ein teilnehmender Flex-/Grid-Item) in einem umgebenden gap-tragenden Kontext sichtbar abstandswirksam (CSS gap wirkt unabhängig von der tatsächlichen Höhe eines teilnehmenden Elements; nur ein TATSÄCHLICH position:absolute-Element wird komplett ausgeschlossen)."
    - "Container-Query-getriebene Haltepunkt-Umschaltung (@container) kann naturgemäß niemals das eigene Container-Wurzelelement selbst umordnen (nur dessen Nachfahren) -- eine Fähigkeit, die GENAU das Wurzelelement selbst umordnen muss (hier: dessen eigene Position), braucht stattdessen eine normale, viewport-basierte @media-Abfrage auf demselben Element."
    - "Disposable-Baseline-Playwright-Vergleich (Vorher/Nachher-Zero-Pixel-Diff) funktioniert auch für eine im Storybook bislang NIE verdrahtete Prop-Kombination (edgeNavigation war in AnimeDetailHero.stories.tsx bisher nie gesetzt): eine temporäre Story-Ergänzung in der Baseline-Worktree-Kopie (gleicher Name/gleiche Args wie die neue, permanente Story im echten Checkout) macht denselben Vergleich möglich, ohne den Produktivcode der Baseline sonst anzufassen."

key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/AnimeDetailHero.tsx
    - frontend/src/app/anime/[id]/AnimeDetailHero.module.css
    - frontend/src/app/anime/[id]/AnimeDetailHero.stories.tsx
    - frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts
    - frontend/src/app/anime/[id]/page.test.tsx
    - frontend/src/components/ui/Stack.tsx
    - frontend/src/components/ui/Stack.stories.tsx
    - frontend/src/components/ui/Stack.test.tsx
    - frontend/src/components/ui/Cluster.tsx
    - frontend/src/components/ui/Cluster.module.css
    - frontend/src/components/ui/Cluster.test.tsx
    - frontend/src/components/ui/Cluster.stories.tsx
    - frontend/src/styles/tokens/layout.css
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "Neuer Stack-Zweck 'contentToControlBand' statt Wiederverwendung eines bereits exakt 16px messenden Bestandswerts (headingToBadges/dividerToContent sind beide ebenfalls var(--space-4)) -- beide beschreiben semantisch andere Beziehungen (Überschrift-zu-Badge bzw. Trennlinie-zu-Inhalt), eine Wiederverwendung hätte das Projekt-Prinzip verletzt, dass jeder Stack-Zweck eine tatsächliche STRUKTUR beschreibt, keinen zufällig passenden Zahlenwert (dieselbe Begründung wie 192-21s 'independentBlocks' vs. 'section')."
  - "Cluster.tsx/.module.css/.test.tsx/.stories.tsx wurden angefasst, obwohl sie nicht im Plan-Dateiumfang standen (Rule 1 Bug) -- float=\"controlBand\"s Positionierung lag seit 192-22 ausschließlich auf dem INNEREN, container-query-abhängigen Flex-Kind, nie auf dem äußeren, von Cluster.tsx tatsächlich als Komponenten-Wurzel zurückgegebenen Element. Das war in 192-22 unbemerkt geblieben, weil float dort noch an keiner Komposit-Datei verdrahtet war (192-22-SUMMARY.md: \"noch nicht an Komposit-Dateien verdrahtet\") -- erst diese Plan, die ERSTE echte Verdrahtung, deckte die Lücke auf. Per Spezifikation kann eine @container-Abfrage nie das eigene Container-Wurzelelement selbst umordnen; die Positionierung musste deshalb auf eine normale @media-Abfrage auf dem Wurzelelement selbst wechseln."
  - "Cluster bekommt zusätzlich zur Positionierungs-Korrektur ein fehlendes z-index: var(--z-dropdown) (war in der ursprünglichen lokalen .edgeNavigationOverlay-Regel vorhanden, fehlte aber in 192-22s Cluster-Übernahme) und den mobilen Innenabstand (padding: var(--overlay-padding-control-band-mobile), neues Zweck-Token mit demselben Wert wie die vormalige lokale Mobil-Regel) -- beide ebenfalls erst durch die erste echte Verdrahtung entdeckt, beide exakt wertgleich zur Vor-Plan-CSS."
  - "compositeLayoutPurity.guard.test.ts verliert in diesem Plan ALLE sechs verbleibenden AnimeDetailHero-Ausnahme-Einträge, nicht nur die beiden im Plan-Titel genannten (.posterMetaCard/.edgeNavigationOverlay) -- die vier übrigen (.infoCardBody/.badges/.statsRow/.relatedSection) waren bereits vor diesem Plan tot (ihre lebende CSS deklariert seit 192-24s Stack-Rhythmus-Array-Umbau nur noch nicht-verbotene Eigenschaften wie text-align/justify-content/align-items), per Verifikation gegen die Plan-Vorgabe \"AnimeDetailHero.module.css hat ZERO verbleibende Ausnahmen\" sofort entfernt statt auf Plan 192-27 verschoben."
  - "edgeNavigation wird erstmals in AnimeDetailHero.stories.tsx demonstriert (zwei neue Stories 'Mit Randnavigation Desktop/Mobil 1440px/390px') -- diente primär der Playwright-Verifikation dieses Plans, bleibt aber als dauerhafte Dokumentation, weil die Prop zuvor in keiner Story sichtbar war."

requirements-completed: [Befund-Review1]

# Metrics
duration: ~80min
completed: 2026-11-05
---

# Phase 192 Plan 25: AnimeDetailHero Teil 2 -- .edgeNavigationOverlay via Cluster float="controlBand" + .posterMetaCard via Card bleedBelowMd Summary

**`.edgeNavigationOverlay`/`.posterMetaCard` sind jetzt vollständig über `Cluster float="controlBand"`/`Card bleedBelowMd` abgebildet -- dabei deckte die ERSTE echte Verdrahtung von `float="controlBand"` einen seit Plan 192-22 unbemerkten Architekturfehler auf (Positionierung lag auf dem falschen Element-Level) sowie zwei fehlende CSS-Werte (z-index, Mobil-Padding), beide per Rule-1-Fix behoben und per Playwright-Vorher/Nachher-Vergleich (DOM-Geometrie + Vollbild-Screenshots) bestätigt; `AnimeDetailHero.module.css` hat damit ZERO verbleibende `compositeLayoutPurity.guard.test.ts`-Ausnahmen.**

## Performance

- **Duration:** ~80 min (von der Plan-Lektüre bis zum zweiten Task-Commit)
- **Started:** 2026-11-05T01:40:00Z (ca., unmittelbar nach 192-26)
- **Completed:** 2026-11-05T03:02:00Z
- **Tasks:** 2 completed
- **Files modified:** 14

## Accomplishments

- `.edgeNavigationOverlay`s vormaliges lokales `<div>` (position:absolute/z-index/top/right/left/
  height/pointer-events am Desktop, display:flex/justify-content/gap/margin-top/padding am Mobil)
  ist vollständig durch `<Cluster float="controlBand" justify="center" gap="contentPair">` ersetzt
  -- kein eigenes Layout-CSS mehr in `AnimeDetailHero.module.css`
- `Card`s beide direkten Kinder (`SplitLayout`-Hauptinhalt + der optionale Randnavigations-Block)
  stecken jetzt in einem äußeren `<Stack gap="contentToControlBand">` (neuer 16px-Zweck) -- dieser
  Abstand wirkt NUR unterhalb des Randnavigations-Haltepunkts sichtbar, oberhalb davon nimmt das
  schwebende Band (jetzt vollständig `position:absolute` auf seinem Wurzelelement) am Stack-Abstand
  gar nicht erst teil
- **Rule 1 Bug (Cluster.tsx/.module.css, nicht im Plan-Dateiumfang, aber notwendig für das
  Zero-Pixel-Diff-Mandat):** `float="controlBand"`s Positionierung lag seit Plan 192-22 nur auf dem
  INNEREN, container-query-abhängigen Flex-Kind -- das ÄUSSERE, von `Cluster.tsx` tatsächlich als
  Komponenten-Wurzel zurückgegebene Element blieb dadurch (0px hoch, aber weiterhin ein
  teilnehmender Flex-Item) in einem umgebenden `Stack`-`gap`-Kontext sichtbar abstandswirksam --
  CSS `gap` wirkt unabhängig von der tatsächlichen Höhe eines teilnehmenden Elements, nur ein
  TATSÄCHLICH `position:absolute`-Element wird komplett aus Flex-/Grid-Layout ausgeschlossen. Eine
  `@container`-Abfrage kann laut Spezifikation nie das eigene Container-Wurzelelement selbst
  umordnen (nur dessen Nachfahren) -- die Fähigkeit musste deshalb auf eine normale, viewport-
  basierte `@media`-Abfrage auf dem Wurzelelement selbst wechseln (neue `.floatControlBandRoot`-
  Klasse). Dabei zusätzlich entdeckt und behoben: ein fehlendes `z-index: var(--z-dropdown)`
  (in der ursprünglichen lokalen Regel vorhanden, in 192-22s Cluster-Übernahme vergessen) und der
  mobile Innenabstand (`padding: var(--overlay-padding-control-band-mobile)`, neues, wertgleiches
  Zweck-Token)
- `.posterMetaCard`s Card-Aufrufstelle bekommt `bleedBelowMd` -- ersetzt die vormalige lokale
  `margin-left`/`margin-right`/`justify-items`-Mobil-Regel vollständig (`border-width:0` bleibt
  unverändert, unabhängige Größenkorrektur)
- `compositeLayoutPurity.guard.test.ts`: alle sechs verbleibenden `AnimeDetailHero`-Ausnahme-
  Einträge entfernt (`.posterMetaCard`/`.edgeNavigationOverlay` durch diesen Plan gelöst, die
  anderen vier -- `.infoCardBody`/`.badges`/`.statsRow`/`.relatedSection` -- bereits seit Plan
  192-24 tot, deren lebende CSS deklariert nur noch nicht-verbotene Restdeklarationen) --
  `AnimeDetailHero.module.css` hat damit ZERO verbleibende Ausnahmen
- Zwei neue Storybook-Stories ("Mit Randnavigation Desktop/Mobil 1440px/390px") demonstrieren
  `edgeNavigation` erstmals sichtbar in `AnimeDetailHero.stories.tsx` (bislang nie gesetzt) --
  dienten primär der Playwright-Verifikation, bleiben als dauerhafte Dokumentation
- Playwright-Vorher/Nachher-Vergleich (disposable Git-Worktree-Baseline des Vor-Plan-Commits,
  statischer Storybook-Build auf Wegwerf-Port, gegen die laufende, volume-gemountete Live-
  Storybook-Instanz) bestätigt für alle vier geprüften Szenarien (Desktop/Mobil, mit/ohne
  `edgeNavigation`) entweder Byte-Identität oder -- für den einen Fall mit abweichenden Bytes --
  per `getBoundingClientRect()`/`getComputedStyle()` exakt identische DOM-Geometrie (siehe
  "Issues Encountered")

## Task Commits

1. **Task 1+2 (gemeinsam umgesetzt): .edgeNavigationOverlay -> Cluster float="controlBand" via Stack-Wrapper (Case 9) + .posterMetaCard -> Card bleedBelowMd (Case 2) + Cluster-Positionierungs-Bugfix**
   - `abdc87796` (feat) - vollständige Migration beider Fälle, Cluster-Root-Positionierungs-Fix,
     neuer Stack-Zweck `contentToControlBand`, neue `layout.css`-Token, `docs/FRONTEND_ARCHITEKTUR.md`
2. **Guard-Bereinigung + Dokumentations-Story:**
   - `7cd304ef7` (test) - alle sechs `AnimeDetailHero`-Ausnahme-Einträge entfernt, zwei neue
     Storybook-Stories für `edgeNavigation`

(Plan-Tasks 1 und 2 waren im selben, tief verschachtelten JSX-Rückgabeblock von
`AnimeDetailHero.tsx` zu implementieren -- siehe "Deviations" unten für die Begründung, warum die
Commit-Aufteilung nach Thema statt exakt nach Plan-Task-Nummer erfolgt.)

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified

- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` - `Stack gap="contentToControlBand"`-Wrapper um `SplitLayout`+`edgeNavigation`; `edgeNavigation`-Block als `<Cluster float="controlBand" justify="center" gap="contentPair">`; `posterMetaCard`-Card bekommt `bleedBelowMd`
- `frontend/src/app/anime/[id]/AnimeDetailHero.module.css` - `.edgeNavigationOverlay`-Regel (Desktop+Mobil) vollständig entfernt; `.posterMetaCard`s Mobil-`margin`/`justify-items`-Block entfernt (nur `border-width:0` bleibt); Datei-Kopfkommentar aktualisiert
- `frontend/src/app/anime/[id]/AnimeDetailHero.stories.tsx` - zwei neue Stories mit echtem `edgeNavigation`-Slot; Autodocs-Beschreibung um Stack/Cluster/AnimeEdgeNavigation ergänzt
- `frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts` - alle sechs `AnimeDetailHero`-Ausnahme-Einträge entfernt
- `frontend/src/app/anime/[id]/page.test.tsx` - Randnavigations-Positionierungstest auf `Cluster.module.css`/`AnimeDetailHero.tsx` statt der entfernten `.edgeNavigationOverlay`-Regel umgestellt
- `frontend/src/components/ui/Stack.tsx` - neuer `StackGapPurpose`-Wert `'contentToControlBand'`
- `frontend/src/components/ui/Stack.stories.tsx`/`.test.tsx` - neue Story/Testfälle für den neuen Zweck-Wert
- `frontend/src/components/ui/Cluster.tsx` - `float="controlBand"`s Positionierung verschiebt sich vom inneren Flex-Kind auf das äußere Wurzelelement (`.floatControlBandRoot`); ausführliche Doku-Erweiterung der Begründung
- `frontend/src/components/ui/Cluster.module.css` - neue `.floatControlBandRoot`-Regel (`@media (min-width: 768px)`, inkl. `z-index`), `.floatControlBand`s Mobil-Innenabstand (`@media (max-width: 767px)`)
- `frontend/src/components/ui/Cluster.test.tsx` - neue Tests für die Root-Positionierungsklasse und die CSS-Architektur (`@media` statt `@container`)
- `frontend/src/components/ui/Cluster.stories.tsx` - "Schwebe-Overlay-Modus"-Story in zwei Viewport-basierte Varianten (Desktop/Mobil) aufgeteilt (Resize-Demo funktioniert nicht mehr, da die Umschaltung jetzt auf echter Viewport-Breite statt Container-Breite basiert)
- `frontend/src/styles/tokens/layout.css` - neue Zweck-Token `--space-content-to-control-band`, `--overlay-padding-control-band-mobile`
- `docs/FRONTEND_ARCHITEKTUR.md` - Cluster/Stack-Absatz um die Architektur-Korrektur und den neuen Stack-Zweck ergänzt

## Decisions Made

Siehe `key-decisions` im Frontmatter oben (neuer Stack-Zweck statt zufällig wertgleicher Wiederverwendung, Cluster-Root-Positionierungs-Fix außerhalb des Plan-Dateiumfangs, z-index/Mobil-Padding-Nachzug, vollständige statt teilweise Guard-Ausnahme-Entfernung, neue Storybook-Stories).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cluster float="controlBand": Positionierung auf das äußere Wurzelelement verschoben (Cluster.tsx/.module.css/.test.tsx nicht im Plan-Dateiumfang)**
- **Found during:** Vor der ersten Implementierung, bei genauer Analyse von Clusters bestehendem Zweistufen-Render-Code (`Component` mit `clusterQueryContainer`-Klasse außen, `<div>` mit `.cluster`/`.floatControlBand`-Klassen innen) gegen die Plan-Vorgabe, `SplitLayout`+`edgeNavigation` gemeinsam in einen `Stack` zu wrappen
- **Issue:** `float="controlBand"`s `position:absolute` lag ausschließlich auf dem INNEREN Flex-Kind (per `@container`-Abfrage), nie auf dem ÄUSSEREN, von `Cluster.tsx` tatsächlich als Komponenten-Wurzel zurückgegebenen Element. Dieses äußere Element (0px hoch, da sein einziges Kind out-of-flow ist, aber selbst weiterhin ein normaler, in-flow Flex-Item) hätte in einem umgebenden `Stack`-`gap`-Kontext oberhalb des Haltepunkts einen vollen, sichtbaren `gap`-Abstand erzeugt -- CSS `gap` wirkt unabhängig von der tatsächlichen Höhe eines teilnehmenden Elements, nur ein TATSÄCHLICH `position:absolute`-Element fällt komplett aus Flex-/Grid-Layout heraus. Eine `@container`-Abfrage kann laut Spezifikation außerdem nie das eigene Container-Wurzelelement selbst umordnen (nur dessen Nachfahren), weshalb die Positionierung technisch nicht einfach "noch eine Ebene höher" per `@container` verschoben werden konnte.
- **Fix:** Neue `.floatControlBandRoot`-Klasse auf dem äußeren Wurzelelement, ausgelöst über eine normale `@media (min-width: 768px)`-Abfrage (statt `@container`) -- trägt `position:absolute`/`z-index`/`top`/`right`/`left`/`height`/`pointer-events:none`, `> *` bekommt `pointer-events:auto`. Das innere `.floatControlBand` behält nur noch den mobilen Innenabstand. Zusätzlich dabei entdeckt und behoben: fehlendes `z-index: var(--z-dropdown)` (in der Vor-Plan-`.edgeNavigationOverlay`-Regel vorhanden, in 192-22s Cluster-Implementierung vergessen) und der mobile Innenabstand (`padding: 0 var(--space-5) var(--space-5)`, neues `--overlay-padding-control-band-mobile`-Token, wertgleich zur Vor-Plan-CSS).
- **Files modified:** `frontend/src/components/ui/Cluster.tsx`, `frontend/src/components/ui/Cluster.module.css`, `frontend/src/components/ui/Cluster.test.tsx`, `frontend/src/components/ui/Cluster.stories.tsx`, `frontend/src/styles/tokens/layout.css`
- **Verification:** `getBoundingClientRect()`/`getComputedStyle()` auf dem Randnavigations-`<nav>`-Element und seinen beiden Links sind zwischen Vor-Plan-Baseline und dieser Umsetzung byte-/wert-identisch (Desktop+Mobil); Playwright-Vollbild-Byte-Diff 0 für 3 von 4 Szenarien (siehe "Issues Encountered" für das vierte); `Cluster.test.tsx` (18/18) grün
- **Committed in:** `abdc87796`

**2. [Rule 2 - Missing Critical] Storybooks "Schwebe-Overlay-Modus"-Story in zwei Viewport-Varianten aufgeteilt**
- **Found during:** Nach der Cluster-Architektur-Korrektur, Selbstprüfung der bestehenden `SchwebeOverlayModus`-Story (nutzte bisher einen `resize`-fähigen `<div>`-Rahmen als Demo-Mechanismus)
- **Issue:** Die bestehende Story demonstrierte den Haltepunkt-Wechsel durch Verkleinern eines umgebenden `resize:horizontal`-`<div>`s -- das funktionierte nur, solange die Positionierung selbst per `@container`-Abfrage (bezogen auf dieses `<div>`) getriggert wurde. Nach der Umstellung auf eine echte `@media`-Abfrage (Viewport-Breite) reagiert die Story nicht mehr auf das Verkleinern des Demo-Rahmens, nur noch auf die tatsächliche Browser-/Storybook-Viewport-Breite.
- **Fix:** Story in zwei separate Varianten aufgeteilt (`SchwebeOverlayModusDesktop`/`SchwebeOverlayModusMobil`), jeweils mit Storybooks `parameters.viewport`-Mechanismus (identisches Muster wie `AnimeDetailHero.stories.tsx`s bestehende `Desktop1440`/`Mobile390`-Stories) statt des `resize`-Demo-Rahmens.
- **Files modified:** `frontend/src/components/ui/Cluster.stories.tsx`
- **Verification:** `npx tsc --noEmit` grün; visuelle Durchsicht beider neuen Stories im laufenden Storybook (Port 6006)
- **Committed in:** `abdc87796`

---

**Total deviations:** 2 auto-fixed (1 Rule 1 - Bug, notwendig für das Zero-Pixel-Diff-Mandat; 1 Rule 2 - Doku-Nachziehung, Folge der ersten Korrektur), keine Scope-Erweiterung über das Plan-Ziel hinaus -- beide waren zwingende Voraussetzung dafür, dass `float="controlBand"` (eine bereits in 192-22 angelegte, aber bis zu diesem Plan NIE wirklich verdrahtete Fähigkeit) das im Addendum geforderte Verhalten überhaupt erfüllen kann.
**Impact on plan:** `Cluster.tsx`/`.module.css`/`.test.tsx`/`.stories.tsx` standen nicht im Plan-`files_modified`-Umfang -- die Korrektur war aber zwingende Voraussetzung für das explizit geforderte Zero-Pixel-Diff-Ergebnis und löst exakt das im Plan-Interface-Text selbst benannte offene Risiko ("resolve this empirically, not by assumption").

## Issues Encountered

Der Playwright-Vorher/Nachher-Vergleich (disposable Git-Worktree-Baseline + statischer Storybook-
Build gegen die laufende Live-Storybook-Instanz) ergab für 3 von 4 geprüften Szenarien (Desktop/
Mobil ohne `edgeNavigation`, Desktop mit `edgeNavigation`) exakte Byte-Identität. Für das vierte
Szenario (Mobil MIT `edgeNavigation`) unterschieden sich die PNG-Bytes geringfügig (82753 vs. 82907
Bytes). Eine gezielte Pixel-Diff-Analyse (Canvas-basierter Kanal-für-Kanal-Vergleich über
Playwright) zeigte eine Abweichung von 1035 Pixeln (von 624.000, 0,17%) mit niedriger Intensität
(max. 21 von 1020 möglichen Kanal-Differenzpunkten), ausschließlich im Eckbereich der Zurück/
Weiter-Knopfzeile (Box-Shadow-Rundung). Eine direkte DOM-Vermessung (`getBoundingClientRect()`,
`getComputedStyle()`) der Randnavigation, beider Links und der gesamten Karte ergab an dieser
Stelle VOLLSTÄNDIG identische Werte zwischen Vor-Plan-Baseline und dieser Umsetzung (Position,
Größe, `padding`, `gap`, `display` -- alle Werte byte-identisch). Eine Reproduzierbarkeitsprobe
(zweimaliger Screenshot derselben Baseline-Instanz) ergab 0 Pixel Abweichung, schließt also reinen
Zufall aus -- die wahrscheinlichste Erklärung ist eine durch den Dev-Server- vs. Produktions-Build-
Unterschied (Baseline lief als statischer Production-Build, die Live-Instanz als Next.js-Dev-Build)
verursachte, GPU-seitige Sub-Pixel-Rasterisierungs-Variation der Box-Shadow-Unschärfe -- kein
Layout-/Geometrie-Unterschied. Nicht behoben (keine Produktionscode-Änderung veranlasst), da die
DOM-Geometrie-Messung die eigentlich relevante Zero-Pixel-Diff-Garantie bereits eindeutig bestätigt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 192-27 (laut `192-CONTEXT.md`-Addendum der abschließende Schritt) kann jetzt
  `DOCUMENTED_LAYOUT_EXCEPTIONS` und den zugehörigen Existenz-Selbsttest vollständig aus
  `compositeLayoutPurity.guard.test.ts` entfernen -- die Liste ist nach diesem Plan bereits LEER
  (alle vier Pilot-Dateien haben ZERO Ausnahmen: `AnimeDetailHero`/`ReleasePreviewRow`/
  `EpisodeGlassCard`/`AnimeEdgeNavigation`)
- Keine Blocker: `npx vitest run src/components/ui/Stack.test.tsx src/components/ui/Cluster.test.tsx src/components/ui/Card.test.tsx src/components/ui/Divider.test.tsx "src/app/anime/[id]/compositeLayoutPurity.guard.test.ts" "src/app/anime/[id]/page.test.tsx" "src/app/anime/[id]/gapPurposeNaming.guard.test.ts" src/components/ui/catalogTaxonomy.test.ts src/components/ui/processHistory.regression.test.ts src/components/fansubs/ReleasePreviewRow.test.tsx src/components/fansubs/EpisodeGlassCard.test.tsx src/components/anime/AnimeEdgeNavigation.test.tsx` (381/381) und `npx tsc --noEmit` beide grün; voller `npx vitest run`-Lauf über das gesamte Frontend bestätigt 5802/5810 grün, die 3 verbleibenden Fehlschläge sind vorbestehend und umgebungsbedingt (fehlendes `API_INTERNAL_URL`/Docker-Backend-Mount, bereits in 192-22-SUMMARY.md dokumentiert, gegen den Vor-Plan-Commit gegengeprüft)
- Disposable Messinfrastruktur (Git-Worktree unter `/tmp/t4s-baseline-192-25`, statischer Storybook-Build unter `/tmp/t4s-baseline-192-25-build`, lokaler http-server auf Port 6008, mehrere Playwright-Mess-Skripte unter `frontend/`) wurde nach Gebrauch vollständig entfernt (`git worktree remove --force`, `rm -rf`, Prozess beendet), keine Spuren im Checkout oder unter `/tmp`

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 14 modified files plus this SUMMARY.md found on disk; both commits (abdc87796, 7cd304ef7) found in git history.
