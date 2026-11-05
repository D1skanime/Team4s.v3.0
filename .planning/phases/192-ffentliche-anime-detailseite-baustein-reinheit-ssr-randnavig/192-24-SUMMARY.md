---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 24
subsystem: ui
tags: [react, typescript, css, storybook, design-tokens, layout-primitives, playwright]

# Dependency graph
requires:
  - phase: 192 (Pläne 01-23)
    provides: Stack-Rhythmus-Array-Modus (192-21), Cluster collapseBelow/gapCollapsed (192-22), Card-padding Zweck-Enum (192-23), 192-CONTEXT.md-Addendum 2026-11-05a (Review-Befund 1, vierte Gap-Closure-Runde)
provides:
  - "AnimeDetailHero.module.css's .infoCardBody-Rhythmus (vormals Case 1/4/5/6/7/8) ist vollständig über Stack gap={[...]} abgebildet -- Kinder-/Lücken-Array wird dynamisch nach den drei optionalen Abschnitten (Tags/Statistik/Verwandte-Anime) aufgebaut"
  - ".statsRow/.relatedSection verlieren ihren border-top zugunsten echter <Divider>-Elemente (neue spacing=\"none\"-Stufe)"
  - ".titleRow (Case 3) ist Cluster collapseBelow=\"md\" gap=\"contentPair\" gapCollapsed=\"independentBlocks\" justify=\"between\" -- kein eigenes Layout-CSS mehr"
  - "Fünf neue Stack-Zweck-Werte (headingToBadges, primaryContentBlocks, dividedSectionLeadIn, dividerToContent, none), live gegen die Vor-Plan-CSS vermessen"
  - "Divider kennt eine dritte spacing-Stufe 'none' (kein Eigen-Abstand) für Fälle, in denen ein umgebender Rhythmus-Mechanismus den vollständigen Vorlauf/Nachlauf bereits selbst trägt"
  - "compositeLayoutPurity.guard.test.ts: Ausnahme-Einträge für .titleRow/.description/.tagsSection entfernt (Selektoren kommen nirgends mehr vor)"
affects: [192-25, 192-26]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Kinder-/Lücken-Array einer Stack-Rhythmus-Komposition werden Hand in Hand aufgebaut (eine Hilfsfunktion/ein Push-Paar pro optionalem Kind), statt ein Array mit bedingten Lücken nachträglich zu berechnen -- macht die 1:1-Zuordnung zwischen Kind und vorangehender Lücke am Code direkt sichtbar und fehlerresistent gegen künftige Kind-Änderungen"
    - "Eine vormalige border-top-Trennlinie wird durch ein echtes <Divider spacing=\"none\"/>-Element ersetzt, dessen Vorlauf/Nachlauf-Abstand vollständig von zwei eigenen Stack-Rhythmus-Array-Einträgen kommt -- Divider trägt dabei nur noch die sichtbare Linie bei, keinen eigenen eingebauten Außenabstand (dafür extra die neue spacing=\"none\"-Stufe)"
    - "display:block auf einem von Stack array-gewrappten <img> verhindert den browserüblichen Baseline-Leerraum unterhalb eines inline gerenderten Bildes -- innerhalb eines bislang direkt-flex-item-eigenen Elements unsichtbar, wird aber sichtbar, sobald das Element stattdessen in einem schlanken, selbst NICHT-Flex-Wrapper-Element landet (Stacks Rhythmus-Array-Mechanismus)"

key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/AnimeDetailHero.tsx
    - frontend/src/app/anime/[id]/AnimeDetailHero.module.css
    - frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts
    - frontend/src/components/ui/Stack.tsx
    - frontend/src/components/ui/Stack.stories.tsx
    - frontend/src/components/ui/Stack.test.tsx
    - frontend/src/components/ui/Divider.tsx
    - frontend/src/components/ui/Divider.module.css
    - frontend/src/components/ui/Divider.stories.tsx
    - frontend/src/components/ui/Divider.test.tsx
    - frontend/src/styles/tokens/layout.css
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "Fünf statt der im Plan erwarteten 2-4 neuen Stack-Zweck-Werte angelegt (headingToBadges=16px, primaryContentBlocks=24px, dividedSectionLeadIn=24/16px responsiv, dividerToContent=16px, none=0px) -- jeder Wert ist live per Playwright-DOM-Messung gegen die unveränderte Vor-Plan-CSS bestätigt, keiner force-fit auf einen nicht exakt passenden Bestandswert; 'none' ist dabei ein strukturell anderer Fall (echtes Null-Sentinel nach Cards bereits etabliertem Muster) als die übrigen vier benannten Abstandswerte"
  - "Divider bekommt eine dritte spacing-Stufe 'none' (Rule 2, siehe Deviations) -- notwendig, weil statsRow/relatedSection ihren alten border-top durch ein eigenständiges Divider-Element ersetzen, dessen VOLLER Vorlauf/Nachlauf-Abstand aber bereits durch zwei eigene Stack-Array-Einträge abgedeckt wird; ohne eine Null-Option hätte Dividers eigener, nicht abschaltbarer Mindestabstand (4px oder 24px) den exakt vermessenen Rhythmus um genau diesen Betrag verfälscht (per Playwright bestätigt: 4px sichtbare Trennlinien-Verschiebung ohne diese Erweiterung)"
  - ".infoBanner erhält display:block (Rule 1, siehe Deviations) -- der neue Stack-Array-Wrapper um AnimeInfoBanner ist selbst KEIN Flex-Container (nur das äußere .infoCardBody ist es), wodurch das zuvor durch den Flex-Kontext automatisch aufgehobene Baseline-Leerraum-Verhalten unterhalb des inline gerenderten <img> plötzlich 7px zusätzliche Höhe erzeugte"
  - ".infoCardBody's Kinder-/Lücken-Array wird in AnimeDetailHero.tsx dynamisch mit if(hasTags)/if(hasStats)/if(hasRelated)-Blöcken aufgebaut statt eines einzigen bedingten Ausdrucks -- macht sichtbar, dass jeder gepushte Divider/jedes optionale Kind GENAU einen zugehörigen Lücken-Eintrag mitbringt"

requirements-completed: [Befund-Review1]

# Metrics
duration: 31min
completed: 2026-11-05
---

# Phase 192 Plan 24: AnimeDetailHero Teil 1 -- .infoCardBody-Rhythmus-Array + .titleRow-Haltepunkt-Umkehr Summary

**`.infoCardBody`'s bespoker Abstands-Rhythmus und `.titleRow`'s Zeile-zu-Spalte-Umkehr sind jetzt vollständig über `Stack`s Rhythmus-Array-Modus bzw. `Cluster collapseBelow` abgebildet -- fünf neu angelegte, live vermessene Stack-Zweck-Werte plus eine neue `Divider spacing="none"`-Stufe schließen 4 der 12 `compositeLayoutPurity.guard.test.ts`-Ausnahmefälle, mit per Playwright bestätigtem Zero-Pixel-Diff an beiden Haltepunkten.**

## Performance

- **Duration:** ~31 min (seit dem 192-23-Abschluss-Commit bis zum zweiten Task-Commit dieses Plans)
- **Started:** 2026-11-05T01:16:10Z (ca., unmittelbar nach 192-23)
- **Completed:** 2026-11-05T01:47:28Z
- **Tasks:** 2 completed
- **Files modified:** 12

## Accomplishments
- `.infoCardBody` rendert jetzt als `<Stack gap={[...]}>` mit einem dynamisch nach den drei optionalen Abschnitten (Tags-Abschnitt/Statistik-Zeile/Verwandte-Anime-Abschnitt) aufgebauten Kinder-/Lücken-Array -- alle sechs vormals betroffenen Selektoren (`.titleRow`/`.badges`/`.description`/`.tagsSection`/`.statsRow`/`.relatedSection`) verloren ihre margin-bottom/padding-top/border-top-Deklarationen
- `.statsRow`/`.relatedSection` verlieren ihren `border-top` zugunsten echter `<Divider spacing="none">`-Elemente -- der komplette Vorlauf/Nachlauf-Abstand kommt dafür aus zwei eigenen, je einzeln vermessenen Stack-Rhythmus-Array-Einträgen
- `.titleRow` (Titel+Logo) ist jetzt `<Cluster collapseBelow="md" gap="contentPair" gapCollapsed="independentBlocks" justify="between">` -- kein eigenes `display:flex`/`align-items`/`justify-content`/`gap` und keine haltepunktabhängige `flex-direction:column`-Mobil-Regel mehr; die vormals leere CSS-Regel UND die `className`-Referenz sind vollständig entfernt (nicht nur die Deklarationen)
- `Stack.gap` kennt fünf neue, exakt am realen Pixel-Rhythmus der Info-Karte gemessene Zweck-Werte: `'headingToBadges'` (16px), `'primaryContentBlocks'` (24px), `'dividedSectionLeadIn'` (24px Desktop/16px Mobil, responsiv über eine `@media`-Überschreibung des zugrunde liegenden Tokens), `'dividerToContent'` (16px) und `'none'` (Literalwert 0)
- `Divider` kennt eine dritte `spacing`-Stufe `'none'` (kein eigener Außenabstand) -- notwendige Erweiterung, damit eine Trennlinie innerhalb eines extern vollständig kontrollierten Rhythmus nur noch die sichtbare Linie beisteuert
- `compositeLayoutPurity.guard.test.ts`: Ausnahme-Einträge für `.titleRow`/`.description`/`.tagsSection` entfernt (Selektoren kommen nach der Migration nirgends mehr im Stylesheet vor); `.badges` bleibt bewusst bestehen (Selektor lebt unverändert in der geteilten `.badges, .tagsList, .statsRow { justify-content: center }`-Mobil-Regel weiter); `.infoCardBody`/`.posterMetaCard`/`.statsRow`/`.relatedSection`/`.edgeNavigationOverlay` bleiben für Plan 192-25 unberührt
- Zwei vollständige Playwright-Vollbild-Byte-Diff-Durchläufe (nach Task 1 und nach Task 2, Desktop 1440/Mobil 390, Storybook-Story "Zusammengesetzte Bausteine/Anime-Kopf" gegen eine disposable Worktree-Baseline des unmittelbaren Vor-Plan-Commits) bestätigen **0 Pixel Abweichung** an beiden Haltepunkten

## Task Commits

1. **Task 1: .infoCardBody-Rhythmus-Array (Case 1/4/5/6/7/8)**
   - `6c7c87d46` (feat) - Stack-Array-Verdrahtung, fünf neue Stack-Zweck-Werte, Divider `spacing="none"`, `.infoBanner display:block`-Korrektur, Playwright-Byte-Diff-Nachweis
2. **Task 2: .titleRow via Cluster collapseBelow (Case 3); Guard-Bereinigung**
   - `321e29368` (feat) - Cluster-Migration von `.titleRow`, Entfernung der jetzt-leeren CSS-Regeln, drei Guard-Ausnahme-Einträge entfernt, erneuter Playwright-Byte-Diff-Nachweis

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` - `.infoCardBody` als `Stack gap={infoCardGap}` mit dynamisch aufgebautem Kinder-/Lücken-Array; `.titleRow` als `Cluster collapseBelow="md"`; zwei neue `<Divider spacing="none">`-Instanzen vor Statistik-Zeile/Verwandte-Anime-Abschnitt
- `frontend/src/app/anime/[id]/AnimeDetailHero.module.css` - `.infoCardBody`/`.titleRow`/`.badges`/`.description`/`.tagsSection`/`.statsRow`/`.relatedSection` verlieren ihre forbidden-category-Deklarationen (margin/padding/display/gap); `.titleRow`-Regel (beide Haltepunkte) vollständig entfernt; `.infoBanner` erhält `display:block`
- `frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts` - drei Ausnahme-Einträge entfernt (`.titleRow`/`.description`/`.tagsSection`)
- `frontend/src/components/ui/Stack.tsx` - fünf neue `StackGapPurpose`-Werte, `resolveGapValue()`-Hilfsfunktion für die `'none'`-Sonderbehandlung (Einzelwert- UND Array-Modus)
- `frontend/src/components/ui/Stack.stories.tsx` - neue Story "Anime-Kopf-Rhythmus (fünf neue Zweck-Werte)", neuer Testfall-Baustein für alle fünf Werte
- `frontend/src/components/ui/Stack.test.tsx` - neue Testfälle für die fünf neuen Zweck-Werte plus `'none'`-Sonderbehandlung (Einzelwert + Array-Modus)
- `frontend/src/components/ui/Divider.tsx`/`.module.css`/`.stories.tsx`/`.test.tsx` - neue `spacing="none"`-Stufe (Deviation, siehe unten)
- `frontend/src/styles/tokens/layout.css` - vier neue `--space-*`-Zweck-Token plus eine responsive `@media (max-width: 767px)`-Überschreibung für `--space-divided-section-lead-in`
- `docs/FRONTEND_ARCHITEKTUR.md` - Stack-/Divider-Absatz um die neuen Fähigkeiten ergänzt

## Decisions Made
Siehe `key-decisions` im Frontmatter oben (fünf statt 2-4 neue Zweck-Werte, `Divider spacing="none"`-Erweiterung, `.infoBanner display:block`-Korrektur, Hand-in-Hand-Aufbau von Kinder-/Lücken-Array).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `Divider` um `spacing="none"` erweitert (nicht im Plan-Dateiumfang genannt)**
- **Found during:** Task 1, beim ersten Playwright-Vollbild-Byte-Diff nach der initialen `spacing="withinMetaBlock"`-Verdrahtung
- **Issue:** `statsRow`/`relatedSection` sollten ihren `border-top` durch ein `<Divider>`-Element ersetzen, dessen Vorlauf/Nachlauf exakt den vorher vermessenen Pixel-Rhythmus reproduziert. `Divider` kannte bis dahin nur zwei Abstands-Stufen (`withinMetaBlock`=4px, `betweenSections`=24px, beide SYMMETRISCH oben+unten) -- da der komplette benötigte Vorlauf/Nachlauf aber bereits vollständig über zwei eigene Stack-Array-Einträge abgedeckt war, erzeugte Dividers eingebauter Mindestabstand eine zusätzliche, nicht abschaltbare 4px-Verschiebung der sichtbaren Trennlinie (per Playwright-Byte-Diff gefunden: eine 4px hohe Differenzzone genau an der Trennlinien-Position bei ansonsten exakt übereinstimmender Gesamthöhe).
- **Fix:** `Divider.tsx`/`.module.css` um eine dritte `spacing="none"`-Stufe (`margin: 0`) erweitert; `AnimeDetailHero.tsx`s beide neuen Divider-Instanzen nutzen diese Stufe, der komplette Abstand kommt jetzt ausschließlich aus dem Stack-Rhythmus-Array.
- **Files modified:** `frontend/src/components/ui/Divider.tsx`, `frontend/src/components/ui/Divider.module.css`, `frontend/src/components/ui/Divider.test.tsx`, `frontend/src/components/ui/Divider.stories.tsx`, `frontend/src/app/anime/[id]/AnimeDetailHero.tsx`
- **Verification:** Playwright-Vollbild-Byte-Diff danach 0 Pixel Abweichung an beiden Haltepunkten; `Divider.test.tsx` (10/10) grün
- **Committed in:** `6c7c87d46` (Task 1)

**2. [Rule 1 - Bug] `.infoBanner` erhält `display:block`**
- **Found during:** Task 1, Playwright-Vollbild-Byte-Diff nach der ersten Stack-Array-Verdrahtung
- **Issue:** `AnimeInfoBanner` rendert ein Fragment (eigene führende Trennlinie + `<img>`), das jetzt in einem von Stacks Rhythmus-Array-Modus erzeugten, selbst NICHT-Flex-Wrapper-`<div>` landet statt wie vorher direkt als Flex-Item von `.infoCardBody`. Da `<img>` ohne explizites `display` browserüblich `inline` ist, entstand innerhalb dieses neuen, nicht-flex Wrapper-Elements ein Baseline-Leerraum von 7px unterhalb des Bildes, der vorher durch die Flex-Blockifizierung automatisch aufgehoben wurde.
- **Fix:** `display: block` zu `.infoBanner` hinzugefügt (keine der verbotenen Layout-Kategorien des Guards).
- **Files modified:** `frontend/src/app/anime/[id]/AnimeDetailHero.module.css`
- **Verification:** Playwright-DOM-Messung bestätigt danach exakt identische `infoCardBody`-Gesamthöhe (991.796875px Desktop/976.296875px Mobil) wie vor dem Plan; Vollbild-Byte-Diff 0 Pixel
- **Committed in:** `6c7c87d46` (Task 1)

---

**Total deviations:** 2 auto-fixed (1 Rule 2 - fehlende Grundbaustein-Fähigkeit, 1 Rule 1 - Bug), beide notwendig für das Zero-Pixel-Diff-Mandat dieser Phase, keine Scope-Erweiterung über das Plan-Ziel hinaus.
**Impact on plan:** `Divider.tsx`/`.module.css`/`.stories.tsx`/`.test.tsx` waren nicht im Plan-`files_modified`-Umfang genannt -- die Erweiterung war aber zwingende Voraussetzung für das explizit geforderte Zero-Pixel-Diff-Ergebnis (Task 1/2 Acceptance Criteria) und folgt exakt demselben, bereits etablierten Muster wie Cards `padding="none"`.

## Issues Encountered

Beim ersten Messdurchlauf zeigte ein direkter Byte-Diff gegen die Vor-Plan-Baseline eine deutliche Abweichung (626.770 von 5.184.000 Bytes bei Desktop 1440px). Root-Cause-Analyse per gezielter Playwright-DOM-Vermessung (nicht vermutet) identifizierte zwei unabhängige Ursachen (siehe Deviations 1+2 oben); nach beiden Korrekturen: 0 abweichende Bytes an beiden Haltepunkten, auch im Zustand mit sichtbarer Statistik-Zeile (`embySeriesUrl` gesetzt, separat per Storybook-Args-Override vermessen).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 192-25 kann jetzt `.posterMetaCard`s Mobil-Korrektur auf `Card bleedBelowMd` (bereits aus 192-23 verfügbar) und `.edgeNavigationOverlay` auf `Cluster float="controlBand"` (bereits aus 192-22 verfügbar) umstellen -- beide zugehörigen Guard-Ausnahme-Einträge sind bewusst unberührt geblieben
- Keine Blocker: `npx vitest run src/components/ui/Stack.test.tsx src/components/ui/Divider.test.tsx "src/app/anime/[id]/compositeLayoutPurity.guard.test.ts" "src/app/anime/[id]/page.test.tsx" "src/app/anime/[id]/gapPurposeNaming.guard.test.ts" src/components/ui/Cluster.test.tsx src/components/ui/catalogTaxonomy.test.ts src/components/ui/processHistory.regression.test.ts` und `npx tsc --noEmit` beide grün
- Disposable Snapshot-Infrastruktur (git worktree + statischer Storybook-Build + lokaler http-server auf Port 6007) wurde nach Gebrauch vollständig entfernt (`git worktree remove --force`), keine Spuren im Checkout oder unter `/tmp`

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 12 modified files plus this SUMMARY.md found on disk; both task commits (6c7c87d46, 321e29368) found in git history.
