---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 30
subsystem: ui
tags: [react, typescript, css, storybook, design-tokens, layout-primitives]

# Dependency graph
requires:
  - phase: 192 (Pläne 01-29, 31)
    provides: "Stack/Cluster-Zweck-Token-Mechanismus (seit 192-21/Befund 1), Card-Zweck-Stufen 'section'/'contextCard' (Plan 192-31), Avatar/Button/ResponsiveImage-Erweiterungen (Plan 192-29), 192-CONTEXT.md-Addendum 2026-11-05b (unabhängiger Review, Runde 2 von 2)"
provides:
  - "Stack gewinnt einen neuen Zweck 'supportingBlockToContent' (`--space-supporting-block-to-content`, 16px) -- Abstand zwischen FansubVersionBrowsers eigenen unterstützenden Blöcken (Gruppen-Auswahl/Gruppen-Kontext) und dem folgenden Hauptinhalt (Episodenliste), noch an keiner Aufrufstelle verdrahtet, bereit für Plan 192-33"
  - "Cluster gewinnt einen neuen Zweck 'secondaryActionRow' (`--space-secondary-action-row`, 8px) -- dichte, rechtsbündige Reihe von 1-2 gleichrangigen Sekundär-Aktions-Buttons (FansubGroupContexts `.navRow`), noch unverdrahtet, bereit für Plan 192-33"
  - "Bestätigte Wiederverwendungs-Entscheidung: FansubGroupContexts interner Heading/Text/Button-Rhythmus braucht KEIN neues Token -- er trifft wert- und zweckgleich auf das bestehende 'relatedContent' (8px)"
affects: [192-33]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Beide neuen Zweck-Token folgen exakt dem bestehenden GAP_PURPOSE_TOKENS-Tabellen-/layout.css-Kommentar-Muster (kein neuer Mechanismus) -- nur Daten (neue Zweck-Namen -> neue Token -> gemessene Pixelwerte) wurden ergänzt, keine neue Logik in Stack.tsx/Cluster.tsx"
    - "Beide Werte wurden gegen die lebende CSS der drei betroffenen Fansub-Dateien nachgemessen (FansubVersionBrowser.module.css .section margin-top=16px roh, FansubGroupContext.module.css .navRow gap=var(--space-2)=8px), nicht geraten -- dieselbe Messdisziplin wie in Runde 3/4"

key-files:
  created: []
  modified:
    - frontend/src/components/ui/Stack.tsx
    - frontend/src/components/ui/Stack.stories.tsx
    - frontend/src/components/ui/Stack.test.tsx
    - frontend/src/components/ui/Cluster.tsx
    - frontend/src/components/ui/Cluster.stories.tsx
    - frontend/src/components/ui/Cluster.test.tsx
    - frontend/src/styles/tokens/layout.css
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "Kein dritter 24px-Stack-Token angelegt: FansubGroupPickers 24px-margin-bottom passt wert- und zweckgleich auf das bereits bestehende '--space-primary-content-blocks' (24px, 'großzügiger als independentBlocks') -- dokumentiert hier explizit, damit Plan 192-33 es direkt wiederverwendet statt es erneut herzuleiten."
  - "FansubGroupContexts interner Heading-/Text-/Button-/navRow-Rhythmus (Name, Vorschautext, Mehr-Link) bleibt beim bestehenden 'relatedContent'-Zweck (8px) -- kein Duplikat angelegt, da Wert UND Bedeutung ('eng zusammengehörige Inhalte dicht zusammen') bereits exakt passen."
  - "Neue Zweck-Namen 'supportingBlockToContent'/'secondaryActionRow' nach Funktion statt nach der konkreten FansubVersionBrowser/FansubGroupContext-Aufrufstelle benannt, damit eine künftige, ähnliche Aufrufstelle denselben Zweck wiederverwenden kann (Konsistenz mit allen bisherigen Zweck-Benennungen)."

requirements-completed: [Befund-Review2-R2]

# Metrics
duration: ~6min
completed: 2026-11-05
---

# Phase 192 Plan 30: Neue Stack/Cluster-Zweck-Token für Geschwister-Rhythmus/navRow Summary

**Zwei neue, gegen die lebende Fansub-CSS gemessene Layout-Zweck-Token (`Stack` "supportingBlockToContent" 16px, `Cluster` "secondaryActionRow" 8px) als vorbereitete, noch unverdrahtete Bausteine für Plan 192-33's FansubVersionBrowser/FansubGroupContext-Migration.**

## Performance

- **Duration:** ~6 min (Commit-zu-Commit, 04:58:41-05:00:05 UTC)
- **Started:** 2026-11-05T04:58:41Z (ca.)
- **Completed:** 2026-11-05T05:00:05Z
- **Tasks:** 2 completed (beide TDD: RED→GREEN)
- **Files modified:** 8

## Accomplishments
- `Stack` kennt jetzt einen vierten, am Zweck statt an der Größe benannten neuen Wert `'supportingBlockToContent'` (`--space-supporting-block-to-content`, 16px) für den Abstand zwischen FansubVersionBrowsers eigenen unterstützenden Blöcken (Gruppen-Auswahl/Gruppen-Kontext, beide optional gar nicht gerendert) und dem danach folgenden Hauptinhalt (Episodenliste) -- gemessen exakt gegen `FansubVersionBrowser.module.css`s vormals rohen `margin-top: 16px`-Literal (kein Token). Eigenständig von `'headingToBadges'`/`'dividerToContent'` (beide ebenfalls 16px, aber an eine Überschrift bzw. Trennlinie gebunden), da hier weder eine Überschrift noch eine Trennlinie vorausgeht.
- `Cluster` kennt jetzt `'secondaryActionRow'` (`--space-secondary-action-row`, 8px) für eine dichte, rechtsbündige Reihe von 1-2 gleichrangigen Sekundär-Aktions-Buttons (z. B. "Zur Fansub-Gruppe"/"Zum Projekt" in `FansubGroupContext`s `.navRow`) -- gemessen exakt gegen dessen bisheriges `gap: var(--space-2)`. Eigenständig von `'badgeRow'` (8px, aber explizit OHNE Interaktion), `'interactiveChipRow'` (12px, Filter-/Auswahl-Chips) und `'actionRow'` (24px, meist durch eine Trennlinie abgesetzt).
- Bestätigt und dokumentiert: `FansubGroupContext`s interner Heading-/Text-/Button-Rhythmus (Name, Vorschautext, Mehr-Link) braucht KEIN neues Token -- er deckt sich wert- und zweckgleich mit dem bereits bestehenden `'relatedContent'` (8px). Ebenfalls dokumentiert: `FansubGroupPicker`s 24px-`margin-bottom` deckt sich mit dem bereits bestehenden `'primaryContentBlocks'` (24px) -- auch hier kein neues Token.
- Neue Storybook-Stories für beide neuen Zweck-Werte (`Stack` "Unterstützende Blöcke zu Hauptinhalt", `Cluster` "Sekundär-Aktionsreihe"), jeweils mit deutscher Zweck-Beschreibung, die die neue Variante von den nächstgelegenen bestehenden Zwecken abgrenzt.
- `docs/FRONTEND_ARCHITEKTUR.md`s Stack/Cluster/SplitLayout-Absatz dokumentiert beide neuen Token UND explizit die `relatedContent`-Wiederverwendungsentscheidung für Plan 192-33.
- Nichts davon ist in diesem Plan an eine Komposit-Datei verdrahtet (laut Plan-Objective) -- Verdrahtung in `FansubVersionBrowser.tsx`/`FansubGroupContext.tsx` folgt in Plan 192-33.

## Task Commits

Each task was committed atomically (TDD RED/GREEN):

1. **Task 1: new Stack purpose for supporting-block-to-content rhythm**
   - `5cf6423e2` (test) - RED: neuer `Stack.test.tsx`-Fall für `gap="supportingBlockToContent"`
   - `5ae885271` (feat) - GREEN: `StackGapPurpose` um `'supportingBlockToContent'` erweitert, neues `--space-supporting-block-to-content`-Token (16px) in `layout.css`, neue Storybook-Story
2. **Task 2: new Cluster purpose for secondary-action-row; docs**
   - `d58950f64` (test) - RED: neuer `Cluster.test.tsx`-Fall für `gap="secondaryActionRow"`
   - `fde21b7c1` (feat) - GREEN: `ClusterGapPurpose` um `'secondaryActionRow'` erweitert, neues `--space-secondary-action-row`-Token (8px) in `layout.css`, neue Storybook-Story, `docs/FRONTEND_ARCHITEKTUR.md`-Ergänzung beider neuer Token plus `relatedContent`-Wiederverwendungshinweis

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified
- `frontend/src/components/ui/Stack.tsx` - `StackGapPurpose` um `'supportingBlockToContent'` erweitert, `GAP_PURPOSE_TOKENS`-Eintrag, deutscher Zweck-Kommentar
- `frontend/src/components/ui/Stack.stories.tsx` - neue "Unterstützende Blöcke zu Hauptinhalt"-Story
- `frontend/src/components/ui/Stack.test.tsx` - neuer Testfall für den neuen Zweck
- `frontend/src/components/ui/Cluster.tsx` - `ClusterGapPurpose` um `'secondaryActionRow'` erweitert, `GAP_PURPOSE_TOKENS`-Eintrag, deutscher Zweck-Kommentar mit Abgrenzung zu `badgeRow`/`interactiveChipRow`/`actionRow`
- `frontend/src/components/ui/Cluster.stories.tsx` - neue "Sekundär-Aktionsreihe"-Story
- `frontend/src/components/ui/Cluster.test.tsx` - neuer Testfall für den neuen Zweck
- `frontend/src/styles/tokens/layout.css` - zwei neue Zweck-Token (`--space-supporting-block-to-content`=16px, `--space-secondary-action-row`=8px), beide mit deutschem Begründungs-/Abgrenzungs-Kommentar
- `docs/FRONTEND_ARCHITEKTUR.md` - Stack/Cluster/SplitLayout-Absatz um beide neuen Token und die `relatedContent`-Wiederverwendungsentscheidung ergänzt

## Decisions Made
Siehe `key-decisions` im Frontmatter oben (insbesondere: kein dritter 24px-Stack-Token, da `primaryContentBlocks` bereits passt; kein neues Cluster-Token für `FansubGroupContext`s internen Rhythmus, da `relatedContent` bereits passt).

## Deviations from Plan

None - plan executed exactly as written. Beide Zweck-Namen (`'supportingBlockToContent'`, `'secondaryActionRow'`) lagen im Plan explizit als "Claude's Discretion"-Vorschlag vor und wurden unverändert übernommen.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 192-33 kann `FansubVersionBrowser.tsx`s drei Geschwister-Abschnitte (Gruppen-Auswahl, Gruppen-Kontext, Episodenliste) über `<Stack gap={['primaryContentBlocks', 'supportingBlockToContent']}>` (oder äquivalent) umhüllen, statt der drei verstreuten lokalen `margin`-Werte -- beide benötigten Werte sind jetzt als benannte Zwecke verfügbar (`primaryContentBlocks` bereits vorhanden, `supportingBlockToContent` neu in diesem Plan).
- Plan 192-33 kann `FansubGroupContext.module.css`s `.navRow` durch `<Cluster gap="secondaryActionRow" justify="end">` ersetzen und dessen internen Heading-/Text-/Button-Rhythmus direkt über `<Stack gap="relatedContent">` abbilden (kein neues Token nötig).
- Keine Blocker: `npx vitest run src/components/ui/Stack.test.tsx src/components/ui/Cluster.test.tsx` (30/30) und `npx tsc --noEmit` beide grün; voller `npx vitest run`-Lauf (474 Dateien, 5853 Tests) zeigt dieselben 3 vorbestehenden, von diesem Plan unberührten Fehlschläge wie in `192-29-SUMMARY.md` dokumentiert (`ResponsiveImage.config.test.ts`, `RoleCapabilityDetail.membershipBaselineDrift.test.ts` -- fehlende Docker-/Backend-Pfade außerhalb des Compose-Containers; `storyDisplayNames.german.test.ts` -- der bereits aus Plan 192-28s `Card.stories.tsx`-Story-Namen "AbschnittsPolsterung" bekannte Fund).

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 8 modified files and this SUMMARY.md found on disk; all 4 task commits
(`5cf6423e2`, `5ae885271`, `d58950f64`, `fde21b7c1`) found in git history.
