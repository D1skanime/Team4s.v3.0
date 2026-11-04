---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 08
subsystem: ui
tags: [react, nextjs, css-modules, design-tokens, storybook]

# Dependency graph
requires:
  - phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig (Pläne 01/02/03/06)
    provides: "Stack/Cluster/SplitLayout-Grundbausteine und ihre vier Aufrufstellen (AnimeDetailHero, FansubGroupPicker, FansubVersionBrowser, ReleasePreviewRow)"
provides:
  - "Stack-gap als Zweck-Enum ('section'/'tight') statt roher Space-Skalenstufe"
  - "Cluster-gap als Zweck-Enum ('badgeRow'/'interactiveChipRow'/'contentPair'/'actionRow')"
  - "SplitLayout-firstColumnWidth als 'poster'|'auto' statt freiem CSS-Laengen-String"
  - "layout.css-Zweck-Tokens (--space-section/--space-tight/--space-badge-row/--space-interactive-chip-row/--space-content-pair/--space-action-row/--split-layout-column-poster(-medium))"
  - "gapPurposeNaming.guard.test.ts: dauerhafter Regressions-Waechter gegen rohe gap=/firstColumnWidth=-Werte in den vier Aufrufstellen"
affects: [192-09, 192-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zweck-Token-Indirektion: Grundbaustein-Props (gap/firstColumnWidth) nehmen benannte Zweck-Werte statt roher Skalenstufen/CSS-Laengen entgegen, jeder Zweck-Wert verweist ueber ein eigenes, dokumentiertes CSS-Custom-Property in layout.css auf die unveraenderte Grundskala -- Zero-Pixel-Diff, aber mit sprechendem Namen statt Nummer."
    - "Breakpoint-abhaengige Zweck-Werte (hier 'poster') werden als CSS-Modifikatorklasse statt als Inline-Stil umgesetzt, weil ein Inline-Stil keine @media-Variante haben kann -- 'auto' bleibt als strukturelles Schluesselwort beim bisherigen Inline-Stil-Mechanismus."

key-files:
  created:
    - "frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts"
  modified:
    - frontend/src/components/ui/Stack.tsx
    - frontend/src/components/ui/Stack.stories.tsx
    - frontend/src/components/ui/Stack.test.tsx
    - frontend/src/components/ui/Cluster.tsx
    - frontend/src/components/ui/Cluster.stories.tsx
    - frontend/src/components/ui/Cluster.test.tsx
    - frontend/src/components/ui/SplitLayout.tsx
    - frontend/src/components/ui/SplitLayout.module.css
    - frontend/src/components/ui/SplitLayout.stories.tsx
    - frontend/src/components/ui/SplitLayout.test.tsx
    - frontend/src/styles/tokens/layout.css
    - "frontend/src/app/anime/[id]/AnimeDetailHero.tsx"
    - "frontend/src/app/anime/[id]/AnimeDetailHero.module.css"
    - frontend/src/components/fansubs/FansubGroupPicker.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/components/fansubs/ReleasePreviewRow.tsx
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "Stack's Zweck-Enum hat genau zwei Mitglieder ('section'/'tight'), weil die bestehenden Stack.stories.tsx bereits beide heutigen gap-Werte (3 und 2) abdeckten -- kein dritter Zweck wurde erfunden, obwohl ReleasePreviewRows gap=2-Stelle (Metadatenzeilen EINER Release-Zeile) konzeptionell von AnimeDetailHero/FansubGroupPickers gap=2-Stelle (Eyebrow-Label+Chip-Reihe) abweicht -- beide teilen sich denselben Zweck-Wert 'tight', weil beide 'eng zusammengehoerig' sind."
  - "Cluster's Zweck-Enum-Namen folgen 1:1 den im Plan-Fliesstext vorgeschlagenen Bezeichnern (badgeRow/interactiveChipRow/contentPair/actionRow) statt eigener Alternativen, da sie die tatsaechlichen Aufrufstellen-Rollen bereits praezise trafen."
  - "Nach Fertigstellung aller drei Tasks deckte ein voller Testlauf zwei durch die Umstellung ausgeloeste Regressions-Wächter-Fehlschlaege auf (siehe Abweichungen): eine wortwörtliche 'Befund 24'-Kommentarreferenz (verbotener Planungsverweis in components/ui) und ein literales `var(--space-N)`-Codebeispiel in einem JSDoc-Kommentar, das der dead-custom-property-Scanner als echten, nicht existierenden Verweis fehlinterpretierte -- beide in einem eigenen fix(192-08)-Commit vor dem Task-3-Commit korrigiert, nicht in den juengsten feat-Commit eingearbeitet."

patterns-established:
  - "Zweck statt Groesse: jedes Layout-Grundbaustein-Prop, das frueher eine rohe Skalenstufe oder einen freien CSS-Wert nahm, nimmt jetzt ausschliesslich einen benannten Zweck -- dokumentiert in docs/FRONTEND_ARCHITEKTUR.md Abschnitt 8, durchgesetzt per gapPurposeNaming.guard.test.ts fuer die vier bereits umgestellten Aufrufstellen."

requirements-completed: [Befund-24]

# Metrics
duration: ~45min
completed: 2026-11-04
---

# Phase 192 Plan 08: Zweck-Namen statt Groessen-/Nummernnamen fuer Grundbausteine Summary

**`Stack`/`Cluster`s `gap`-Prop und `SplitLayout`s `firstColumnWidth`-Prop nehmen jetzt ausschliesslich benannte Zweck-Werte (`'section'`/`'tight'`, `'badgeRow'`/`'interactiveChipRow'`/`'contentPair'`/`'actionRow'`, `'poster'`/`'auto'`) statt roher Space-Skalenstufen oder freier CSS-Laengen-Strings entgegen, mit sechs neuen Zweck-Tokens in `layout.css` und einem dauerhaften Regressions-Waechter.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-11-04T11:50:00Z (geschaetzt)
- **Completed:** 2026-11-04T12:31:30Z
- **Tasks:** 3 completed
- **Files modified:** 17 (16 geaendert, 1 neu)

## Accomplishments
- `Stack`/`Cluster` nehmen keine rohe Space-Skalenstufe (`gap="2"`) mehr an -- nur noch benannte Zweck-Werte, jeweils per eigener `Record<Purpose, string>`-Lookup auf ein neues, dokumentiertes Zweck-Token in `layout.css` aufgeloest (Zero-Pixel-Diff: dieselben zugrunde liegenden `--space-N`-Werte).
- `SplitLayout`s `firstColumnWidth` nimmt nur noch `'poster'` oder `'auto'` an; `'poster'` setzt eine neue, breakpoint-eigene CSS-Modifikatorklasse (`.columnPoster`, inkl. eigener <1024px-Variante) statt eines von der Seite ueberschriebenen Inline-Stil-Hooks -- `AnimeDetailHero.module.css` verlor dadurch seinen gesamten `--split-first-col`-Override-Block.
- Alle vier in dieser Phase bereits umgestellten Aufrufstellen (`AnimeDetailHero`, `FansubGroupPicker`, `FansubVersionBrowser`, `ReleasePreviewRow`) nutzen ausschliesslich die neuen Zweck-Namen.
- `Cluster.stories.tsx` hat jetzt vier Storys (eine neue: `interactiveChipRow`, mit echten `<button>`-Elementen statt des rein lesbaren `Chip`-Platzhalters, um den Zweck-Unterschied sichtbar zu machen); `Stack.stories.tsx` wurde umbenannt, keine neue Story noetig.
- Neuer `gapPurposeNaming.guard.test.ts` verhindert dauerhaft einen Rueckfall auf rohe `gap="N"`-Werte oder freie `firstColumnWidth`-Strings in den vier Aufrufstellen, inkl. Selbsttest gegen stillschweigenden Waechter-Ausfall.
- `docs/FRONTEND_ARCHITEKTUR.md` dokumentiert die "Zweck statt Groesse"-Regel im bestehenden Stack/Cluster/SplitLayout-Absatz.

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert Stack/Cluster's gap prop from raw SpaceToken to a named purpose enum** - `932110a41` (feat)
2. **Task 2: Convert SplitLayout's firstColumnWidth to 'poster' | 'auto' and re-point AnimeDetailHero at it** - `d0442636e` (feat)
3. **Fix-up: re-green two pre-existing guard tests tripped by the Task 1/2 renaming** - `3712b53fc` (fix)
4. **Task 3: Apply the new purpose names at all four call sites, add the regression guard, document the rule** - `3ac4e7477` (feat)

**Plan metadata:** (siehe `docs(192-08)`-Commit nach diesem Dokument)

## Files Created/Modified
- `frontend/src/components/ui/Stack.tsx` - `StackGapPurpose`-Enum (`'section'`/`'tight'`) statt `SpaceToken`, Lookup-Tabelle auf neue Zweck-Tokens
- `frontend/src/components/ui/Stack.stories.tsx` - Storys auf Zweck-Werte umbenannt (keine neue Story noetig)
- `frontend/src/components/ui/Stack.test.tsx` - Assertions auf neue Token-Referenzen umgestellt
- `frontend/src/components/ui/Cluster.tsx` - `ClusterGapPurpose`-Enum (vier Mitglieder) statt `SpaceToken`
- `frontend/src/components/ui/Cluster.stories.tsx` - drei Storys umbenannt, eine neue Story (`interactiveChipRow`, echte `<button>`-Elemente) ergaenzt
- `frontend/src/components/ui/Cluster.test.tsx` - alle vier Zweck-Werte einzeln gegen ihr Token geprueft
- `frontend/src/components/ui/SplitLayout.tsx` - `firstColumnWidth: 'poster' | 'auto'`, `'poster'` setzt Modifikatorklasse statt Inline-Stil
- `frontend/src/components/ui/SplitLayout.module.css` - neue `.columnPoster`-Modifikatorklasse inkl. <1024px-Breakpoint-Variante
- `frontend/src/components/ui/SplitLayout.stories.tsx` - zwei Storys von `firstColumnWidth: '200px'` auf `'poster'` umgestellt
- `frontend/src/components/ui/SplitLayout.test.tsx` - Test fuer `firstColumnWidth` in drei Faelle aufgeteilt (`'auto'`/`'poster'`/keine Angabe)
- `frontend/src/styles/tokens/layout.css` - sechs neue Zweck-Tokens (`--space-section`, `--space-tight`, `--space-badge-row`, `--space-interactive-chip-row`, `--space-content-pair`, `--space-action-row`, `--split-layout-column-poster(-medium)`)
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` - alle sechs `gap=`-Stellen auf Zweck-Namen, `firstColumnWidth="poster"` auf `SplitLayout` ergaenzt
- `frontend/src/app/anime/[id]/AnimeDetailHero.module.css` - `.heroSplit` verlor den gesamten `--split-first-col`-Override-Block (jetzt in `SplitLayout.module.css`), behaelt nur `--split-gap: 0`
- `frontend/src/components/fansubs/FansubGroupPicker.tsx` - zwei `gap=`-Stellen auf `tight`/`interactiveChipRow`
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` - eine `gap=`-Stelle auf `section`
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx` - drei `gap=`-Stellen auf `tight`/`contentPair`/`badgeRow`
- `frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts` - NEU: Regressions-Waechter gegen rohe `gap=`/`firstColumnWidth=`-Werte in den vier Aufrufstellen, inkl. Selbsttest
- `docs/FRONTEND_ARCHITEKTUR.md` - "Zweck statt Groesse"-Satz im bestehenden Stack/Cluster/SplitLayout-Absatz ergaenzt

## Decisions Made
- Stack behaelt genau zwei Zweck-Werte (`section`/`tight`), obwohl die drei `gap="2"`-Aufrufstellen (AnimeDetailHero-Genresection, FansubGroupPicker-Wrapper, ReleasePreviewRow-textLines) konzeptionell leicht unterschiedliche Rollen haben ("Label+Inhalt" vs. "enge Metadatenzeilen") -- beide Rollen sind tatsaechlich "eng zusammengehoerig" und teilen sich sinnvoll denselben Zweck-Wert; ein dritter, kuenstlich getrennter Zweck haette keinen echten visuellen Unterschied begruendet.
- `Cluster.stories.tsx`s neue `interactiveChipRow`-Story rendert echte `<button type="button">`-Elemente statt der Datei-eigenen, rein lesbaren `Chip`-Span-Hilfsfunktion, weil der Unterschied zwischen anklickbaren Chips und statischen Abzeichen genau der fachliche Zweck dieser Variante ist (Plan-Vorgabe).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Kommentar-Verweis auf "Befund 24" verletzte bestehenden Wächtertest**
- **Found during:** Task 3 (voller Testlauf nach Abschluss aller Tasks)
- **Issue:** `Stack.tsx`, `Cluster.tsx`, `SplitLayout.tsx` und `SplitLayout.module.css` enthielten neue Kommentare mit "(Befund 24)" -- `processHistory.regression.test.ts` verbietet solche Planungs-Verweise dauerhaft in `components/ui` (UAT-Storybook-Review-Vorgabe).
- **Fix:** Die Klammer-Referenz "(Befund 24)" aus allen vier Dateien entfernt, faktische Erklaerung unveraendert gelassen; dieselbe Bereinigung auch in `layout.css` vorgenommen (nicht von diesem Test erfasst, aber konsistent mit CLAUDE.mds Regel gegen reine Planungsverweise als Erklaerung).
- **Files modified:** frontend/src/components/ui/Stack.tsx, Cluster.tsx, SplitLayout.tsx, SplitLayout.module.css, frontend/src/styles/tokens/layout.css
- **Verification:** `npx vitest run src/components/ui/processHistory.regression.test.ts` gruen
- **Committed in:** `3712b53fc`

**2. [Rule 1 - Bug] `var(--space-N)` im JSDoc-Kommentar fehlinterpretiert als toter Custom-Property-Verweis**
- **Found during:** Task 3 (voller Testlauf)
- **Issue:** `Stack.tsx`/`Cluster.tsx`s Kommentar schrieb `niemals direkt auf \`var(--space-N)\`` als Code-Beispiel -- `cssCustomProperties.guard.test.ts`s Scanner liest jeden `var(--xxx)`-Text im Quelltext (auch in Kommentaren) als echten Custom-Property-Verweis und meldete `--space-N` als nicht-existierend/tot.
- **Fix:** Kommentartext auf reine Backtick-Erwaehnung ohne `var(...)`-Syntax umgestellt ("die rohe `--space-N`-Grundskala" statt "`var(--space-N)`").
- **Files modified:** frontend/src/components/ui/Stack.tsx, Cluster.tsx
- **Verification:** `npx vitest run src/lib/cssCustomProperties.guard.test.ts` gruen
- **Committed in:** `3712b53fc`

**3. [Rule 1 - Bug] Story-Anzeigename enthielt verbotenes englisches Wort "section"**
- **Found during:** Task 3 (voller Testlauf)
- **Issue:** `Stack.stories.tsx`s neuer Name `'Abschnittstrennung (gap "section")'` enthielt das Wort "section" als eigenstaendiges, durch Anfuehrungszeichen abgegrenztes Wort -- `storyDisplayNames.german.test.ts` verbietet dieses Wort in sichtbaren Story-Namen (Standard-Englisch-Verbotsliste).
- **Fix:** Klammer-Zusatz mit dem rohen Prop-Wert aus beiden Story-Namen entfernt (`'Abschnittstrennung'`/`'Eng zusammengehörig'`); die technische Zuordnung bleibt ueber die Autodocs-Beschreibung bzw. den Code selbst erkennbar.
- **Files modified:** frontend/src/components/ui/Stack.stories.tsx
- **Verification:** `npx vitest run src/components/storyDisplayNames.german.test.ts` gruen (1091/1091)
- **Committed in:** `3712b53fc`

---

**Total deviations:** 3 auto-fixed (alle Rule 1 -- bestehende, unveraenderte Wächtertests nach der Zweck-Umstellung wieder gruen gemacht)
**Impact on plan:** Keine Scope-Erweiterung; alle drei Fixes waren notwendige Korrekturen an neu geschriebenem Text (Kommentare/Story-Namen), nicht an der eigentlichen Zweck-Umstellungslogik. Als separater `fix(192-08)`-Commit vor dem Task-3-Commit gefuehrt statt in bereits abgeschlossene Task-1/2-Commits eingearbeitet (Projektregel: neue Commits statt Amend).

## Issues Encountered
Ein voller `npx vitest run`-Lauf nach Abschluss aller drei Tasks zeigte 8 fehlschlagende Testdateien. Gegen eine Baseline-Pruefung in einem temporaeren Git-Worktree (Commit `92b471f97`, letzter Stand vor diesem Plan) wurden 5 davon als vorbestehend/umgebungsbedingt bestaetigt und NICHT angefasst (Scope-Boundary-Regel):
- `.storybook/mocks/handlers.test.ts`/`mswUnhandledRequestSetup.test.ts` -- fehlendes `msw`-Package (dieselbe Ursache wie die bereits in Plan 192-01 dokumentierten vorbestehenden `tsc`-Fehler in `.storybook/mocks/handlers.ts`)
- `badgeArtwork.test.ts` -- erfordert `API_INTERNAL_URL` (nur im Linux-Frontend-Compose-Service verfuegbar, nicht beim direkten `npx vitest run` auf dem Host)
- `ResponsiveImage.config.test.ts` -- bereits am Baseline-Commit fehlschlagend, unabhaengig von diesem Plan
- `RoleCapabilityDetail.membershipBaselineDrift.test.ts` -- erfordert den `./backend:/backend:ro`-Mount des Frontend-Containers (`ENOENT` beim direkten Host-Lauf)
- `src/app/members/[slug]/not-found.test.tsx` -- bestand bei isoliertem Lauf sowohl am Baseline-Commit als auch auf diesem Branch; nur im vollen Parallel-Lauf vereinzelt fehlschlagend (bekanntes Ressourcen-Konkurrenz-Flake-Muster, siehe Phase-186-Notiz in STATE.md)

Die verbleibenden 2 echten, durch diesen Plan verursachten Regressionen (`processHistory.regression.test.ts`, `cssCustomProperties.guard.test.ts`) sowie ein dritter, beim selben Testlauf gefundener Verstoss (`storyDisplayNames.german.test.ts`) wurden behoben, siehe "Deviations from Plan" oben. Ein erneuter voller Testlauf nach der Korrektur zeigt nur noch dieselben 5 vorbestehenden Fehlschlaege (0 neue Regressionen).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `Stack`/`Cluster`/`SplitLayout` und ihre vier Aufrufstellen sind vollstaendig auf Zweck-Namen umgestellt; `gapPurposeNaming.guard.test.ts` verhindert dauerhaft einen Rueckfall.
- Plaene 192-09/192-10 (Befund 25/26 aus `192-CONTEXT.md`s `<addendum_2026-11-04b>`) sind unabhaengig von diesem Plan und koennen unveraendert fortfahren.
- Kein Blocker fuer die abschliessende Verifikation (ehem. Plan 192-07): Zero-Pixel-Diff ist durch identische zugrunde liegende `--space-N`-/`--media-frame-poster-width*`-Werte strukturell garantiert, keine manuelle Nachpruefung dieses Plans selbst noetig (bleibt Teil der ohnehin geplanten abschliessenden Bildpaar-Verifikation).

## Self-Check: PASSED

All 17 touched files verified present on disk; all four commit hashes (`932110a41`, `d0442636e`, `3712b53fc`, `3ac4e7477`) verified present in `git log`.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*
