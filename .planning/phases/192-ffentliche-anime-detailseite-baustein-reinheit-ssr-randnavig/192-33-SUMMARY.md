---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 33
subsystem: ui
tags: [react, typescript, css, design-tokens, layout-primitives, playwright]

# Dependency graph
requires:
  - phase: 192 (Pläne 28-30)
    provides: "Card padding='contextCard'/'section' (Plan 192-28), Avatar size='xs'/Button chipGlass --button-gap (Plan 192-29), Stack 'supportingBlockToContent'/Cluster 'secondaryActionRow' (Plan 192-30), 192-CONTEXT.md-Addendum 2026-11-05b (unabhängiger Review, Runde 2 von 2)"
provides:
  - "FansubGroupPicker/FansubGroupContext/FansubVersionBrowser verlieren ihre letzten lokalen margin-/padding-/gap-/width-/border-radius-Deklarationen -- alle drei Geschwister-Abschnitte (Gruppen-Auswahl, Gruppen-Kontext, Episoden-Inhalt) teilen jetzt EINEN Rhythmus-Stack in FansubVersionBrowser.tsx statt drei über drei Dateien verstreuter lokaler margin-Werte"
  - "Card padding='section' (Plan 192-28/192-31) ist jetzt bewusst asymmetrisch (48px oben, 32px an den übrigen drei Seiten) -- nimmt den vormals rohen, architektonisch separaten FansubVersionBrowser.module.css .section-margin-top (16px, Card-Rand-zu-Überschrift-Abstand, KEIN Geschwister-Abstand) auf, da eine Stack-Lücke naturgemäß nur ZWISCHEN Kindern wirken kann, nie vor dem ersten Kind"
affects: [192-34]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stacks Rhythmus-Array-Modus (192-21) auf eine VARIABLE Kinderzahl angewendet: FansubVersionBrowser baut `contentColumnChildren`/`contentColumnGaps` dynamisch aus den echten Render-Bedingungen (fansubOptions.length>0, activeGroup!==null) auf, statt eine feste Struktur anzunehmen -- Array-Länge und Lücken-Werte sind IMMER exakt `Kinderzahl - 1`, kein geschätzter Wert"
    - "Eine Stack-Lücke kann naturgemäß nur ZWISCHEN Kindern wirken (CSS-gap-Semantik), niemals VOR dem ersten Kind -- ein vormals rohes margin-top auf dem äußersten Baustein-Wrapper (Card-Rand-zu-Überschrift-Abstand) ist deshalb KEIN Stack-Fall, sondern gehört in Cards eigene, jetzt bewusst asymmetrische Polsterungsstufe (dasselbe Rezept-Muster wie das bereits bestehende --card-padding-divided-section)"

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/FansubGroupPicker.tsx
    - frontend/src/components/fansubs/FansubGroupPicker.module.css
    - frontend/src/components/fansubs/FansubGroupPicker.test.tsx
    - frontend/src/components/fansubs/FansubGroupContext.tsx
    - frontend/src/components/fansubs/FansubGroupContext.module.css
    - frontend/src/components/fansubs/FansubGroupContext.test.tsx
    - frontend/src/components/fansubs/FansubGroupContext.stories.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.module.css
    - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
    - frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts
    - frontend/src/styles/tokens/layout.css

key-decisions:
  - "FansubGroupPickers Logo kommt jetzt aus `<Avatar size=\"xs\" src={logoURL} label={option.name} />`, übergeben als Buttons `leftIcon`-Prop statt eines manuellen `<Image>`-Kind-Elements -- die EXAKTE bestehende Bedingung (kein Bild ohne `logo_url`) blieb unverändert erhalten (`{logoURL ? <Avatar .../> : null}`), KEINE Initialen-Fallback-Verhaltenserweiterung in diesem Plan (anders als die bereits an anderer Stelle akzeptierte ReleasePreviewRow-Entscheidung)"
  - "FansubGroupContexts Card bekam `padding=\"contextCard\"` (24px, Plan 192-28); Name/Vorschautext/Mehr-Link/Aktionsreihe liegen in einem gemeinsamen `<Stack gap=\"relatedContent\">` (8px, EINHEITLICHER Wert unabhängig vom Vorschautext-Zweig, kein Rhythmus-Array nötig); `.navRow` wurde zu `<Cluster gap=\"secondaryActionRow\" justify=\"end\" wrap>` (Plan 192-30)"
  - "ARCHITEKTONISCHER BEFUND (vom Plan-Checker explizit angefordert, nicht per Annahme gelöst): FansubVersionBrowser.module.css's `.section { margin-top: 16px }` lag auf dem ÄUSSERSTEN Baustein-Wrapper, dessen ERSTES Kind die Überschrift ist -- das ist der Abstand zwischen dem Rand der umschließenden Episoden-Bereich-Card und der Überschrift, NICHT Geschwister-Abstand zwischen FansubVersionBrowsers eigenen Kindern. Playwright-Messung bestätigte: Gesamtabstand Card-Rand -> Überschrift war 49px (32px Card-Padding + 1px Rahmen + 16px dieses margin-top), konsistent über alle drei Pflicht-Zustände. Eine Stack-Lücke kann naturgemäß nur ZWISCHEN Kindern wirken, nie davor -- der naive Plan-Wortlaut (\"margin-top entirely delete\") hätte ohne diesen Fund eine stille 16px-Regression direkt oberhalb der Überschrift verursacht. Lösung: `--card-padding-section` (layout.css, Plan 192-28/192-31) ist jetzt bewusst ASYMMETRISCH (`calc(var(--space-6) + var(--space-4)) var(--space-6) var(--space-6)`, 48px oben / 32px an den übrigen drei Seiten) -- dasselbe Rezept-Muster wie das bereits bestehende `--card-padding-divided-section`. Einzige Aufrufstelle (`AnimeEpisodesSection.tsx`), kein zweiter Call-Site betroffen. Playwright-Messung vor/nach bestätigt Zero-Pixel-Diff (49px unverändert) über alle drei Pflicht-Zustände (multi-group+story, single-group, group-no-preview)."
  - "Die drei vormals verstreuten lokalen margin-Werte (`.section`s margin-top [FansubVersionBrowser], `.wrapper`s margin-bottom [FansubGroupPicker], `.card`s margin-bottom [FansubGroupContext]) sind durch EIN dynamisch aufgebautes Stack-Rhythmus-Array in FansubVersionBrowser.tsx ersetzt: Heading→Gruppen-Auswahl='none' (gemessen: 0px, Heading hat margin:0), Gruppen-Auswahl→Gruppen-Kontext-ODER-Inhalt='primaryContentBlocks' (24px, bereits bestehendes Token, Plan 192-30s Wiederverwendungsentscheidung bestätigt), Gruppen-Kontext→Inhalt='supportingBlockToContent' (16px, Plan 192-30, NEU korrekt verortet -- die ursprüngliche Messgrundlage dieses Tokens in 192-30s Summary wurde durch diesen Fund nachträglich präzisiert, siehe layout.css-Kommentar)"
  - "Die zuvor leer gewordenen CSS-Klassen (`.wrapper` in FansubGroupPicker, `.card`/`.name`/`.navRow` in FansubGroupContext, `.section`/`.emptyBox`/`.sentinel` in FansubVersionBrowser) sind samt ihrer JSX-Referenz ersatzlos entfernt (konsistentes Muster aus Runde 4/5) -- `.emptyBox` war bereits vor diesem Plan totes CSS (0 Treffer in FansubVersionBrowser.tsx, per grep bestätigt)"
  - "Beide IntersectionObserver-Sentinel-`<div>`s tragen ihre technische 1px-Ankerhöhe jetzt als Inline-Stil (`style={{ height: '1px' }}`) statt einer CSS-Modul-Klasse -- matcht das bereits bestehende Windowing-Platzhalter-Muster in derselben Datei (`style={{ height: heightPx }}`), da dies eine technische Ankerfläche ist, keine Layout-/Abstands-Entscheidung"

requirements-completed: [Befund-Review2-R2]

# Metrics
duration: ~25min
completed: 2026-11-05
---

# Phase 192 Plan 33: FansubVersionBrowser/FansubGroupContext/FansubGroupPicker -- Geschwister-Abschnitte in Stack umhüllen Summary

**Alle drei Pilot-Fansub-Bausteine verlieren ihre letzten lokalen margin-/padding-/gap-/width-/border-radius-Deklarationen: ein dynamisch aufgebautes Stack-Rhythmus-Array ersetzt drei über drei Dateien verstreute margin-Werte, während ein vom unabhängigen Review geforderter architektonischer Fund (Card-Rand-zu-Überschrift-Abstand ist KEIN Geschwister-Abstand) korrekt in Cards eigener, jetzt asymmetrischer Polsterungsstufe verortet wird -- Playwright-bestätigter Zero-Pixel-Diff über alle drei Pflicht-Zustände.**

## Performance

- **Duration:** ~25 min (Commit-zu-Commit, 05:24:57-05:49:37 UTC, inklusive Playwright-Messungen gegen die live laufende Dev-Instanz vor UND nach der Änderung)
- **Started:** 2026-11-05T05:24:57Z
- **Completed:** 2026-11-05T05:49:37Z
- **Tasks:** 3 completed (alle TDD: RED→GREEN, plus 1 Folge-Commit für Umlaut-Korrektur)
- **Files modified:** 12

## Accomplishments
- `FansubGroupPicker`s 20px-Kreis-Logo kommt aus `Avatar size="xs"` statt einem lokal zugeschnittenen `<Image>`; der Icon-/Beschriftungs-Abstand kommt aus Buttons eigener `chipGlass`-Variante (`--button-gap`, Plan 192-29) über Buttons `leftIcon`-Prop statt eines manuellen Kind-Elements -- die bestehende Bedingung (kein Bild ohne `logo_url`) blieb exakt erhalten
- `FansubGroupContext`s Kartenpolsterung kommt aus `Card padding="contextCard"` (24px, Plan 192-28); Name/Vorschautext/Mehr-Link/Aktionsreihe liegen in einem `<Stack gap="relatedContent">`; `.navRow` ist jetzt `<Cluster gap="secondaryActionRow" justify="end" wrap>` (Plan 192-30)
- `FansubVersionBrowser`s drei Geschwister-Abschnitte (Gruppen-Auswahl, Gruppen-Kontext, Episoden-Inhalt) sind jetzt direkte Kinder EINES dynamisch aufgebauten Stack-Rhythmus-Arrays statt drei über drei Dateien verstreuter lokaler `margin`-Werte -- Array-Länge und Lücken-Werte werden aus den tatsächlichen Render-Bedingungen (`fansubOptions.length>0`, `activeGroup!==null`) abgeleitet, nicht aus einer angenommenen Struktur
- **Architektonischer Fund korrekt gelöst (nicht per Annahme, wie vom Plan-Checker explizit gefordert):** `.section`s vormaliges `margin-top: 16px` war der Abstand zwischen dem Rand der umschließenden Episoden-Bereich-Card und der Überschrift (Card-Rand-zu-Überschrift), NICHT Geschwister-Abstand zwischen FansubVersionBrowsers eigenen Kindern -- per Playwright-Messung bestätigt (Computed-Style-Direktvergleich: `.card`s `padding-top: 32px` + `border-top-width: 1px`, FansubVersionBrowsers eigenes `<section>` trug zusätzlich `margin-top: 16px`, macht 49px gemessenen Gesamtabstand). Eine Stack-Lücke kann naturgemäß nur ZWISCHEN Kindern wirken, nie davor. Gelöst durch eine bewusst asymmetrische `--card-padding-section` (layout.css: `calc(var(--space-6) + var(--space-4)) var(--space-6) var(--space-6)`, 48px oben statt 32px) -- dasselbe Rezept-Muster wie das bereits bestehende `--card-padding-divided-section`
- Totes CSS (`.emptyBox`, bereits vor diesem Plan unbenutzt) ist ersatzlos entfernt; alle leer gewordenen Hilfsklassen (`.wrapper`, `.card`, `.name`, `.navRow`, `.section`, `.sentinel`) sind samt ihrer JSX-Referenz entfernt
- Beide IntersectionObserver-Sentinels tragen ihre technische 1px-Ankerhöhe jetzt als Inline-Stil statt einer CSS-Modul-Klasse (matcht das bestehende Windowing-Platzhalter-Muster in derselben Datei)
- `gapPurposeNaming.guard.test.ts`s `guardedCallSiteFiles` um `FansubGroupContext.tsx` erweitert
- **Pixel-identische visuelle Parität über alle drei Pflicht-Fansub-Zustände bestätigt** (multi-group+story-preview, single-group, group-no-preview) -- Playwright-Messung vor UND nach der Änderung: Card-Rand-zu-Überschrift-Abstand 49px (unverändert), Gruppen-Auswahl→Gruppen-Kontext-Abstand 24px (unverändert), Gruppen-Kontext→Inhalt-Abstand 16px (unverändert), Gruppen-Auswahl→Inhalt-Abstand ohne Kontext 24px (unverändert); zusätzlich visuell per Screenshot-Vergleich bestätigt

## Task Commits

Each task was committed atomically (TDD RED/GREEN):

1. **Task 1: FansubGroupPicker -- Avatar logo, Button leftIcon**
   - `2ad8cabd9` (test) - RED: neue Testfälle für Avatar-Logo-Rendering und CSS-Abwesenheit von `.logo`/`.chip`-gap
   - `e4236c21b` (feat) - GREEN: `Avatar size="xs"` über Buttons `leftIcon`-Prop verdrahtet, `.logo`-Klasse und manuelles `<Image>` entfernt
2. **Task 2: FansubGroupContext -- Card padding purpose, Stack rhythm, Cluster navRow**
   - `82731bf5b` (test) - RED: neue Testfälle für `Card padding="contextCard"` und CSS-Abwesenheit von padding/margin/display:flex/gap/`.navRow`/`.name`/`.card`; `gapPurposeNaming.guard.test.ts` um `FansubGroupContext.tsx` erweitert
   - `ef1c167c1` (feat) - GREEN: `Card padding="contextCard"`, `Stack gap="relatedContent"`, `Cluster gap="secondaryActionRow" justify="end"` verdrahtet; Storybook-Autodocs-Hinweis nennt Stack/Cluster
3. **Task 3: FansubVersionBrowser -- Stack-wrap siblings, remove raw margin-top, delete dead CSS, fix sentinel**
   - `096760850` (test) - RED: neue Testfälle für CSS-Abwesenheit (`.section`/`.emptyBox`/`.sentinel`/margin-top), Inline-Stil-Sentinels, Rhythmus-Array-Lücken-Werte an beiden Geschwister-Konfigurationen
   - `5a9972359` (feat) - GREEN: dynamisches Stack-Rhythmus-Array in `FansubVersionBrowser.tsx`, `--card-padding-section` asymmetrisch (layout.css), `.wrapper`/`.card`-margin-Deklarationen in den beiden Nachbar-Dateien entfernt

**Folge-Commit (Rule 1 -- Bugfix, keine Verhaltensänderung):**
- `003afbed1` (fix) - mehrere neu geschriebene Kommentarblöcke nutzten versehentlich ASCII-Ersatzschreibung (ae/oe/ue) statt echter Umlaute -- korrigiert gemäß CLAUDE.md's Code-Kommentar-Regel

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified
- `frontend/src/components/fansubs/FansubGroupPicker.tsx` - Avatar-Logo über Buttons `leftIcon`-Prop statt manuellem `<Image>`
- `frontend/src/components/fansubs/FansubGroupPicker.module.css` - `.logo`-Klasse und `.chip`s gap-Deklaration entfernt (letztere wird `.wrapper`s margin-bottom in Task 3 entfernt)
- `frontend/src/components/fansubs/FansubGroupPicker.test.tsx` - neue Testfälle für Avatar-Logo und CSS-Abwesenheit
- `frontend/src/components/fansubs/FansubGroupContext.tsx` - `Card padding="contextCard"`, `Stack gap="relatedContent"`, `Cluster gap="secondaryActionRow"`
- `frontend/src/components/fansubs/FansubGroupContext.module.css` - `.card`/`.name`/`.navRow`-Deklarationen vollständig entfernt
- `frontend/src/components/fansubs/FansubGroupContext.test.tsx` - neue Testfälle für Card-Zweckstufe und CSS-Abwesenheit
- `frontend/src/components/fansubs/FansubGroupContext.stories.tsx` - Autodocs-Hinweis nennt Stack/Cluster
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` - dynamisches Stack-Rhythmus-Array ersetzt die drei verstreuten Geschwister-Abschnitte; Sentinels mit Inline-Stil
- `frontend/src/components/fansubs/FansubVersionBrowser.module.css` - `.section`/`.emptyBox`/`.sentinel` entfernt
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx` - neue Testfälle für CSS-Abwesenheit, Sentinel-Inline-Stil, Rhythmus-Array-Lücken-Werte
- `frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts` - `FansubGroupContext.tsx` zur bewachten Aufrufstellen-Liste hinzugefügt
- `frontend/src/styles/tokens/layout.css` - `--card-padding-section` bewusst asymmetrisch (48px oben); `--space-supporting-block-to-content`-Kommentar um die korrigierte Messgrundlage ergänzt

## Decisions Made
Siehe `key-decisions` im Frontmatter oben (insbesondere der vom Plan-Checker explizit angeforderte architektonische Fund zum Card-Rand-zu-Überschrift-Abstand und dessen Lösung über eine asymmetrische `--card-padding-section`-Polsterungsstufe statt einer Stack-Lücke).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `.section`s margin-top ersatzlos streichen hätte eine stille 16px-Regression oberhalb der Überschrift verursacht**
- **Found during:** Task 3, vor der Implementierung (explizit vom Plan-Checker als zu verifizierendes Risiko markiert)
- **Issue:** Der Plan-Wortlaut verlangte wörtlich "Delete `.section`'s margin-top: 16px entirely" ohne Ersatz. Direkte Prüfung der echten JSX-Struktur zeigte: `.section`s margin-top lag auf dem ÄUSSERSTEN Baustein-Wrapper (FansubVersionBrowsers eigenem `<section>`), dessen erstes Kind die Überschrift ist -- das ist Abstand zwischen dem Rand der umschließenden Card und dem ersten Inhalt, nicht Geschwister-Abstand zwischen FansubVersionBrowsers eigenen Kindern. Eine Stack-Lücke kann naturgemäß nur ZWISCHEN Kindern wirken, nie davor -- ersatzloses Streichen hätte den Gesamtabstand von 49px auf 33px reduziert (16px Regression).
- **Fix:** `--card-padding-section` (layout.css) bewusst asymmetrisch gemacht (48px oben, 32px an den übrigen drei Seiten) -- derselbe Anteil, den `.section`s margin-top vormals beitrug, wandert in Cards eigene Polsterungsstufe, Zero-Pixel-Diff per Playwright-Messung vor/nach bestätigt (49px unverändert über alle drei Pflicht-Zustände).
- **Files modified:** `frontend/src/styles/tokens/layout.css`
- **Verification:** Playwright-Messung (Computed-Style-Direktvergleich + bounding-box-Messung) vor/nach identisch; Screenshot-Vergleich aller drei Pflicht-Zustände visuell identisch; `npx tsc --noEmit` und alle Testdateien grün.
- **Committed in:** `5a9972359` (Task 3 GREEN commit)

---

**2. [Rule 2 - Dokumentation] ASCII-Umlaut-Ersatzschreibung in mehreren neu geschriebenen Kommentarblöcken**
- **Found during:** Nach Task 3, vor Plan-Abschluss (eigene Nachprüfung, vom Kontext explizit angefordert nach dem in Plan 192-28 bereits einmal gefundenen Muster)
- **Issue:** Mehrere in diesem Plan neu geschriebene `/* */`/`//`-Kommentarblöcke (FansubVersionBrowser.tsx/.test.tsx, FansubGroupContext.tsx/.test.tsx, FansubGroupPicker.module.css, gapPurposeNaming.guard.test.ts, layout.css) nutzten versehentlich ASCII-Ersatzschreibung (ae/oe/ue) statt echter Umlaute -- entgegen CLAUDE.md's „Code-Kommentare: Deutsch mit korrekten Umlauten"-Regel.
- **Fix:** Alle betroffenen, von diesem Plan selbst neu angelegten Kommentarzeilen auf korrekte Umlaute korrigiert. `it()`-Testbeschreibungstexte (außerhalb des CLAUDE.md-Scopes für user-facing Strings) blieben bewusst bei der bereits dateiweit etablierten Konvention dieser Testdateien unangetastet, um nicht inkonsistent zum übrigen Testbestand zu werden.
- **Files modified:** siehe oben, 7 Dateien
- **Verification:** `npx tsc --noEmit` und alle betroffenen Testdateien grün nach der Korrektur.
- **Committed in:** `003afbed1`

---

**Total deviations:** 2 auto-fixed (1 Bug-Vermeidung, 1 Dokumentationskorrektur)
**Impact on plan:** Beide Fixes notwendig für Korrektheit (visuelle Pixel-Parität bzw. Projektkonvention) -- keine Scope-Erweiterung über die drei im Plan genannten Dateien hinaus (layout.css war bereits in Vorplänen dieser Runde als gemeinsame Token-Infrastrukturdatei berührt).

## Issues Encountered

Die ursprüngliche Messgrundlage für `--space-supporting-block-to-content` in Plan 192-30s Summary ("gemessen gegen FansubVersionBrowser.module.css's vormals rohen 16px-margin-top") war strukturell ungenau (siehe Deviation 1) -- der tatsächlich passende Messpunkt für diesen Zweck ist FansubGroupContext.module.css's eigenes vormaliges `margin-bottom: var(--space-4)` (ebenfalls 16px, aber ein echter Geschwister-Abstand). Der WERT des Tokens (16px) blieb dadurch unverändert korrekt, nur die dokumentierte Herleitung wurde in `layout.css` präzisiert.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 192-34 (Guard-Erweiterung) kann `FansubVersionBrowser.module.css`, `FansubGroupContext.module.css`, `FansubGroupPicker.module.css` jetzt ohne Ausnahme in die erweiterte `compositeLayoutPurity.guard.test.ts`-Dateiliste aufnehmen -- alle drei Dateien deklarieren keine der (auch schon heute aktiven) verbotenen Eigenschaften (`display:flex`/`gap:`/`padding:`/`margin`) mehr, UND auch keine der in Plan 192-34 neu hinzukommenden Kategorien (`border`/`border-radius`/`background`/`box-shadow`/feste `width`/`height`/`display:grid`)
- Keine Blocker: `npx vitest run src/components/fansubs/FansubGroupPicker.test.tsx src/components/fansubs/FansubGroupContext.test.tsx src/components/fansubs/FansubVersionBrowser.test.tsx src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx src/components/fansubs/FansubVersionBrowser.windowing.test.tsx src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx "src/app/anime/[id]/gapPurposeNaming.guard.test.ts"` (92/92) und `npx tsc --noEmit` beide grün; voller Sweep über `src/components/ui`, `src/components/fansubs`, `src/components/anime`, `src/components/watchlist`, `src/app/anime/[id]` (122 Testdateien, 1476 Tests) zeigt nur den bereits in `192-28`/`192-29`-SUMMARY.md dokumentierten, vorbestehenden, von dieser Phase unberührten Fehlschlag (`ResponsiveImage.config.test.ts` -- fehlende Umgebungsvoraussetzung außerhalb des Compose-Containers)
- `compositeLayoutPurity.guard.test.ts` (5/5, unverändert, prüft noch nicht die drei in diesem Plan migrierten Dateien -- das ist explizit Plan 192-34s Aufgabe) bleibt grün

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 12 modified source files and this SUMMARY.md found on disk; all 7 commits
(`2ad8cabd9`, `e4236c21b`, `82731bf5b`, `ef1c167c1`, `096760850`, `5a9972359`,
`003afbed1`) found in git history.
