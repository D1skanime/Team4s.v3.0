---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 16
subsystem: ui
tags: [react, css-modules, design-system, stack, storybook, design-tokens]

requires:
  - phase: 192-15
    provides: "AnimeDetailHero.tsx .tagsSection auf Stack gap=\"tight\" umgestellt (neuer Aufrufstelle, die diese Umbenennung ebenfalls treffen musste)"
provides:
  - "Stack.tsx: StackGapPurpose-Enum von 'section' | 'tight' auf 'independentBlocks' | 'relatedContent' umbenannt -- echte Einsatzzweck-Namen statt eines Größenworts ('tight') bzw. eines mit Seitenabschnitts-Abstand verwechselbaren Namens ('section')"
  - "layout.css: zugrunde liegende CSS-Custom-Properties --space-section/--space-tight auf --space-independent-blocks/--space-related-content umbenannt, Pixelwerte (--space-3/--space-2) unverändert und gegen main pixelgenau verifiziert"
  - "Alle neun aktuellen Aufrufstellen (fünf laut Planung + eine zur Ausführungszeit zusätzlich gefundene, EffectsShowcase.tsx) sowie beide Guard-Tests (gapPurposeNaming/compositeLayoutPurity) auf die neuen Namen umgestellt"
affects: []

tech-stack:
  added: []
  patterns:
    - "Soll/Ist-Pixelwert-Verifikation gegen main per disposable git worktree (--detach, danach git worktree remove) bei reinen Zweck-Umbenennungen ohne Layout-Umbau: schneller als ein voller Storybook-/Playwright-Bildvergleich, wenn main die betroffenen Selektoren noch als wörtliches, unveraendertes CSS traegt"

key-files:
  created: []
  modified:
    - frontend/src/components/ui/Stack.tsx
    - frontend/src/components/ui/Stack.module.css
    - frontend/src/components/ui/Stack.stories.tsx
    - frontend/src/components/ui/Stack.test.tsx
    - frontend/src/styles/tokens/layout.css
    - frontend/src/lib/designTokens.ts
    - frontend/src/lib/designTokens.test.ts
    - frontend/src/components/showcases/DesignTokensShowcase.test.tsx
    - frontend/src/app/anime/[id]/AnimeDetailHero.tsx
    - frontend/src/app/anime/[id]/AnimeDetailHero.module.css
    - frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts
    - frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts
    - frontend/src/components/fansubs/FansubGroupPicker.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/components/fansubs/ReleasePreviewRow.tsx
    - frontend/src/components/fansubs/EpisodeGlassCard.tsx
    - frontend/src/components/fansubs/EpisodeGlassCard.module.css
    - frontend/src/components/showcases/EffectsShowcase.tsx

key-decisions:
  - "Namenswahl 'independentBlocks' (vormals 'section') / 'relatedContent' (vormals 'tight') statt der im Plan-Text nur beispielhaft genannten Formulierungen -- an ALLEN tatsächlichen Verwendungsstellen ausgerichtet: 'independentBlocks' deckt sowohl die drei lose gekoppelten Blöcke in .posterMeta (Merklisten-Knopf/Trennlinie/Genre-Abschnitt) als auch wiederholte, gleichrangige Listeneinträge (Episodenzeilen/Release-Zeilen) ab; 'relatedContent' deckt sowohl Eyebrow-Label+Chip-Reihe (genresSection/tagsSection/FansubGroupPicker) als auch die mehreren Metadatenzeilen EINER Release-Zeile (ReleasePreviewRow) sowie das Vorher/Nachher-Bild+Bildunterschrift-Paar in EffectsShowcase ab"
  - "Pixelwert-Verifikation gegen main per disposable git worktree (main-Tip 907fa79f1, da die aktuelle ki-run-Branch main vollständig enthält und 192 noch nicht zurückgemergt ist) statt eines vollen Storybook-/Playwright-Bildvergleichs -- main deklariert .posterMeta{gap:12px}, .genresSection{gap:8px} und .tagsSection{gap:8px} noch wörtlich als eigenes CSS (vor der Stack-Einführung durch frühere 192-Pläne); alle drei Werte stimmen exakt mit --space-3 (12px, jetzt --space-independent-blocks) bzw. --space-2 (8px, jetzt --space-related-content) überein -- keine Abweichung gefunden, kein --space-N-Wert korrigiert. Worktree danach vollständig entfernt (git worktree remove --force), keine Spuren im Checkout."
  - "EffectsShowcase.tsx (zwei gap=\"tight\"-Aufrufstellen im Vorher/Nachher-Vergleichspaar) wurde als zusätzliche, zur Planungszeit nicht dokumentierte Aufrufstelle ebenfalls umgestellt -- per tsc-Fehlerliste als vollständige Menge der tatsächlich aktuellen Aufrufstellen bestätigt (Rule 3: ohne diese Stelle bliebe der Typecheck rot)"
  - "designTokens.ts/.test.ts und DesignTokensShowcase.test.tsx wurden zusätzlich angepasst, obwohl nicht im Plan-Dateibestand gelistet -- sie referenzieren --space-section als Beispiel-Tokenname (Befund 28: DesignTokensShowcase liest ALLE CSS-Custom-Properties automatisch aus globals.css aus); ohne Nachzug wären drei Tests nach der CSS-Variablen-Umbenennung rot geworden (Rule 3: blockierender Testfehler)"

patterns-established: []

requirements-completed: [Befund-D]

duration: ~40min
completed: 2026-11-04
---

# Phase 192 Plan 16: Stack-Zweck-Namen 'tight'/'section' korrigiert Summary

**`Stack`s Gap-Zweck-Enum heißt jetzt `'independentBlocks' | 'relatedContent'` statt `'section' | 'tight'` (Befund D) -- die zugrunde liegenden `--space-N`-Pixelwerte (12px/8px) blieben unverändert und wurden per disposable `git worktree` gegen `main`s noch wörtlich deklariertes Original-CSS exakt bestätigt; alle neun aktuellen Aufrufstellen (inkl. einer zur Ausführungszeit zusätzlich gefundenen in `EffectsShowcase.tsx`) sowie beide betroffenen Guard-Tests wurden mitgezogen.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-11-04
- **Tasks:** 2 (wie geplant)
- **Files modified:** 18 (6 mehr als die 10 im Plan-Frontmatter gelisteten -- siehe Deviations)

## Accomplishments
- `Stack.tsx`s `StackGapPurpose` trägt zwei echte Einsatzzweck-Namen statt eines Größenworts (`'tight'`) bzw. eines mit „Abstand zwischen Seitenabschnitten" verwechselbaren Namens (`'section'`): `'independentBlocks'` (trennt voneinander unabhängige Inhaltsblöcke INNERHALB eines Bausteins) und `'relatedContent'` (fasst eng zusammengehörige Inhalte zu EINER Einheit zusammen).
- `layout.css`s zugrunde liegende CSS-Custom-Properties (`--space-independent-blocks`, `--space-related-content`) behalten exakt die bisherigen Pixelwerte (`--space-3`=12px, `--space-2`=8px) -- per disposable `git worktree` gegen `main`s noch wörtlich deklariertes Original-CSS bestätigt (keine Abweichung, kein Wert korrigiert).
- Alle neun tatsächlich aktuellen Aufrufstellen umgestellt: `AnimeDetailHero.tsx` (3x), `FansubGroupPicker.tsx`, `FansubVersionBrowser.tsx`, `ReleasePreviewRow.tsx`, `EpisodeGlassCard.tsx` (die letzten beiden erst durch 192-14/-15 entstanden, nicht Teil der ursprünglichen Planungs-Grundlage) sowie `EffectsShowcase.tsx` (2x, zur Ausführungszeit zusätzlich gefunden).
- Beide betroffenen Guard-Tests (`gapPurposeNaming.guard.test.ts`s Positiv-Gegenprobe-String, `compositeLayoutPurity.guard.test.ts`s Ausnahme-Begründungstext) sowie drei Dateien, die `--space-section` als Beispiel-Tokenname für die automatische Design-Tokens-Seite referenzieren (`designTokens.ts`/`.test.ts`, `DesignTokensShowcase.test.tsx`), auf die neuen Namen nachgezogen.

## Task Commits

Each task was committed atomically:

1. **Task 1: Stack-Definition + Pixelwert-Verifikation gegen main** - `c36eefc95` (refactor)
2. **Task 2: Alle Aufrufstellen + Guards umgestellt** - `455180bef` (refactor)

**Plan metadata:** committed alongside this SUMMARY/STATE/ROADMAP update

## Files Created/Modified
- `frontend/src/components/ui/Stack.tsx` - `StackGapPurpose`/`GAP_PURPOSE_TOKENS`/Default-Wert umbenannt, Dokumentationskommentar auf die reale Struktur (nicht Größe) der beiden Zwecke umformuliert
- `frontend/src/styles/tokens/layout.css` - `--space-section`/`--space-tight` zu `--space-independent-blocks`/`--space-related-content` umbenannt, Kommentare erklären jetzt explizit die Nicht-Verwechselbarkeit mit Seitenabschnitts-Abstand
- `frontend/src/components/ui/Stack.stories.tsx` - zwei Story-Namen (`Abschnittstrennung`→`Unabhängige Blöcke`, `Eng zusammengehörig`→`Zusammengehöriger Inhalt`) plus alle vier `gap`-Args nachgezogen (Stories-ziehen-mit-Pflicht)
- `frontend/src/components/ui/Stack.test.tsx` - Assertions auf die neuen Token-/Prop-Namen umgestellt
- `frontend/src/lib/designTokens.ts`, `frontend/src/lib/designTokens.test.ts`, `frontend/src/components/showcases/DesignTokensShowcase.test.tsx` - Beispiel-Tokenname `--space-section` auf `--space-independent-blocks` nachgezogen (sonst rote Tests nach der CSS-Variablen-Umbenennung)
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx`, `.module.css` - drei `gap`-Aufrufstellen (`posterMeta`/`genresSection`/`tagsSection`) + Kommentare umgestellt
- `frontend/src/components/fansubs/FansubGroupPicker.tsx`, `FansubVersionBrowser.tsx`, `ReleasePreviewRow.tsx`, `EpisodeGlassCard.tsx`, `.module.css` - je eine `gap`-Aufrufstelle + Kommentare umgestellt
- `frontend/src/components/showcases/EffectsShowcase.tsx` - zwei `gap="tight"`-Aufrufstellen (Vorher/Nachher-Bildvergleichsspalten) auf `gap="relatedContent"` umgestellt
- `frontend/src/app/anime/[id]/gapPurposeNaming.guard.test.ts`, `compositeLayoutPurity.guard.test.ts` - Positiv-Gegenprobe-String bzw. Ausnahme-Begründungstext nachgezogen

## Decisions Made
Siehe `key-decisions` im Frontmatter für die vollständige Begründung zu: (1) der konkreten Namenswahl `independentBlocks`/`relatedContent`, (2) der Pixelwert-Verifikationsmethode (disposable `git worktree` gegen `main` statt vollem Playwright-Bildvergleich) und ihrem Ergebnis, (3) der zusätzlich umgestellten `EffectsShowcase.tsx`-Aufrufstelle, (4) der zusätzlich angepassten `designTokens`-Beispielreferenzen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/3] `EffectsShowcase.tsx` nutzte ebenfalls `gap="tight"`, war aber nicht in der Plan-Aufrufstellen-Liste dokumentiert**
- **Found during:** Task 2 (vollständige Grep-/tsc-Prüfung nach Task 1s Umbenennung)
- **Issue:** `npx tsc --noEmit` listete nach Task 1 neun stale Aufrufstellen statt der im Plan-Interfaces-Abschnitt dokumentierten fünf -- `EffectsShowcase.tsx` (zwei `<Stack gap="tight">`-Vergleichsspalten, Vorher/Nachher-Bildpaar) war zur Planungszeit nicht erfasst.
- **Fix:** Beide Aufrufstellen auf `gap="relatedContent"` umgestellt (Bild+Bildunterschrift-Paar passt exakt in den `relatedContent`-Zweck).
- **Files modified:** `frontend/src/components/showcases/EffectsShowcase.tsx`
- **Verification:** `npx tsc --noEmit` danach 0 Fehler; `grep -rn 'gap="tight"\|gap="section"' frontend/src` liefert nichts.
- **Committed in:** `455180bef` (Task 2 commit)

**2. [Rule 3 - Blocking] `designTokens.ts`/`.test.ts`/`DesignTokensShowcase.test.tsx` referenzierten `--space-section` als Beispiel-Tokenname**
- **Found during:** Task 1 (nach der CSS-Variablen-Umbenennung in `layout.css`)
- **Issue:** Diese drei Dateien (Befund 28s automatische Design-Tokens-Seite, die ALLE CSS-Custom-Properties aus `globals.css` ausliest) nennen `--space-section` wörtlich als Beispiel-Tokenname in Kommentaren bzw. einer `expect(screen.getByText('--space-section'))`-Assertion -- nach der Umbenennung existiert dieser Tokenname nicht mehr, drei Tests wären rot geworden.
- **Fix:** Alle drei Referenzen auf `--space-independent-blocks` nachgezogen.
- **Files modified:** `frontend/src/lib/designTokens.ts`, `frontend/src/lib/designTokens.test.ts`, `frontend/src/components/showcases/DesignTokensShowcase.test.tsx`
- **Verification:** `npx vitest run src/lib/designTokens.test.ts src/components/showcases/DesignTokensShowcase.test.tsx` grün.
- **Committed in:** `c36eefc95` (Task 1 commit)

**3. [Rule 1] `Stack.tsx`s eigener Dokumentationskommentar erwähnte die alten Namen in Anführungszeichen, was die Akzeptanzkriterien-Grep-Prüfung selbst verletzt hätte**
- **Found during:** Task 1 (eigener Akzeptanzkriterien-Check nach der ersten Umschreibung)
- **Issue:** Die erste Formulierung des erklärenden Kommentars ("`'tight'` war ein Größenwort...") verwendete exakt die Anführungszeichen-Syntax, die der Plan-eigene Akzeptanz-Grep (`grep -n "'tight'\|'section'"`) als "nicht vollständig umbenannt" werten würde.
- **Fix:** Kommentar umformuliert, um die historische Begründung ohne die exakte Anführungszeichen-Literal-Syntax wiederzugeben.
- **Files modified:** `frontend/src/components/ui/Stack.tsx`
- **Verification:** `grep -n "'tight'\|'section'" frontend/src/components/ui/Stack.tsx` liefert nichts mehr; `npx vitest run src/components/ui/Stack.test.tsx` weiterhin grün.
- **Committed in:** `c36eefc95` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 zusätzliche Aufrufstelle, 1 blockierender Testfehler durch Beispielreferenzen, 1 Selbstkorrektur der eigenen Dokumentation gegen das eigene Akzeptanzkriterium)
**Impact on plan:** Alle drei Abweichungen sind direkte, notwendige Folgen der geplanten Umbenennung selbst (vollständige Aufrufstellen-Abdeckung, konsistente Beispielreferenzen, Erfüllung des eigenen Akzeptanzkriteriums) -- keine Scope-Erweiterung über Befund D hinaus.

## Known Stubs
Keine -- reine Namens-/Token-Umbenennung ohne neue UI-Oberfläche.

## Issues Encountered
- **Pixelwert-Verifikationsmethode von Playwright-Bildvergleich auf git-worktree-CSS-Vergleich angepasst:** Der Plan-Text schlägt einen Browser-Pixelvergleich per disposabler `git worktree`-Momentaufnahme vor. Da `main` (Tip `907fa79f1`) `AnimeDetailHero` noch als reine `page.tsx`/`page.module.css`-Struktur ohne `Stack`-Baustein enthält (der `Stack`-Umbau kam erst durch frühere 192-Pläne), war ein direkter Storybook-Bildvergleich methodisch nicht sinnvoll -- stattdessen wurde `main`s wörtlich deklariertes Original-CSS (`page.module.css` Zeilen 147-168, 400-405) direkt gelesen und mit den aktuellen `--space-N`-Werten verglichen: `.posterMeta{gap:12px}`, `.genresSection{gap:8px}`, `.tagsSection{gap:8px}` -- alle drei exakt deckungsgleich mit `--space-3`/`--space-2`. Der disposable Worktree (`/tmp/gsd-worktrees/192-16-main-baseline`) wurde danach vollständig per `git worktree remove --force` entfernt.
- Bereits dokumentierte, umgebungsbedingte Testfehler (unverändert, keine neuen, durch diesen Plan nicht verursacht): `ResponsiveImage.config.test.ts` (siehe `deferred-items.md`, Plan 192-02); `badgeArtwork.test.ts` und `RoleCapabilityDetail.membershipBaselineDrift.test.ts` (Docker-/Backend-Mount erforderlich, in dieser Sandbox ohne `API_INTERNAL_URL`/`/backend`-Mount erwartungsgemäß rot).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Befund D ist vollständig abgeschlossen: `Stack`s Gap-Zweck-Enum trägt zwei echte, nicht größen- oder verwechslungsanfällige Einsatzzweck-Namen; alle Aufrufstellen und beide betroffenen Guard-Tests sind konsistent.
- Keine Blocker für nachfolgende Pläne dieser Phase.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

## Self-Check: PASSED

All 17 claimed created/modified files confirmed present on disk; both task commits
(`c36eefc95`, `455180bef`) confirmed present in `git log --oneline --all`.
