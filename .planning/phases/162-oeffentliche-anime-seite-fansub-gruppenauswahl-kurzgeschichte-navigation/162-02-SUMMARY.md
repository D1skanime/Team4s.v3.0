---
phase: 162-oeffentliche-anime-seite-fansub-gruppenauswahl-kurzgeschichte-navigation
plan: 02
subsystem: frontend
tags: [react, nextjs, ui-primitives, fansubs]

# Dependency graph
requires: ["162-01"]
provides:
  - "FansubGroupPicker.tsx: eigenstaendig testbare Filter-Chip-Zeile (Button-Primitive, aria-pressed, role=group), von 162-03 wiring-fertig konsumierbar"
  - "FansubGroupContext.tsx: eigenstaendig testbarer gruppenspezifischer Bereich (Name, Story-Vorschau, zwei Navigationsziele), ersetzt ActiveFansubStory.tsx vollstaendig"
affects: [162-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Button-Primitive mit variant=ghost + aria-pressed als Chip-Toggle statt neuem Chip-Primitive (closest-analog, 4 bestehende Repo-Vorbilder)"
    - "role=group + aria-label statt role=radio fuer sich gegenseitig ausschliessende Filter-Chips"

key-files:
  created:
    - frontend/src/components/fansubs/FansubGroupPicker.tsx
    - frontend/src/components/fansubs/FansubGroupPicker.module.css
    - frontend/src/components/fansubs/FansubGroupPicker.test.tsx
    - frontend/src/components/fansubs/FansubGroupContext.tsx
    - frontend/src/components/fansubs/FansubGroupContext.module.css
    - frontend/src/components/fansubs/FansubGroupContext.test.tsx
  modified:
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
  deleted:
    - frontend/src/components/fansubs/ActiveFansubStory.tsx
    - frontend/src/components/fansubs/ActiveFansubStory.module.css
    - frontend/src/components/fansubs/__tests__/ActiveFansubStory.test.tsx

key-decisions:
  - "FansubVersionBrowser.tsx minimal umverdrahtet (Rule 3): activeStoryGroup wird aus storyGroups abgeleitet und an FansubGroupContext uebergeben, statt ActiveFansubStory zu importieren -- notwendig, weil das Loeschen von ActiveFansubStory.tsx sonst den Import bricht. Die eigentliche Chip-/CTA-Verdrahtung (Ersetzen der alten filterRow/groupCtaRow durch FansubGroupPicker + neue Navigationsziele, URL-Zustand) bleibt bewusst 162-03 vorbehalten."
  - "FansubVersionBrowser.test.tsx assertGroup()-Helfer angepasst (Rule 1): pruefte bisher, dass der Gruppenname im Bereich ein Link ist -- das ist laut D-13 jetzt eine reine Ueberschrift ohne Link. Angepasst auf getByRole('heading') + queryByRole('link') === null."

requirements-completed: [REQ-162-04, REQ-162-05, REQ-162-07, REQ-162-09, REQ-162-10, REQ-162-11, REQ-162-12, REQ-162-13, REQ-162-18, REQ-162-19]

# Metrics
duration: 45min
completed: 2026-09-17
---

# Phase 162 Plan 02: Fansub-Gruppen-Picker und Gruppenbereich (Frontend-Komponenten) Summary

**Zwei neue, eigenstaendig testbare Praesentationskomponenten (`FansubGroupPicker`, `FansubGroupContext`) ersetzen `ActiveFansubStory.tsx` vollstaendig und sind Interface-First fuer die Wiring-Arbeit in Plan 162-03 vorbereitet.**

## Performance

- **Duration:** ca. 45 Minuten
- **Started:** 2026-09-17T08:37:00Z (ca.)
- **Completed:** 2026-09-17T08:44:51Z
- **Tasks:** 2/2 abgeschlossen
- **Files modified:** 11 (6 neu, 2 geaendert, 3 geloescht)

## Accomplishments

- `FansubGroupPicker.tsx` rendert eine Filter-Chip-Zeile ausschliesslich ueber das
  `Button`-Primitive (`variant="ghost"`, `aria-pressed`), niemals ein natives `<button>`;
  `role="group"`/`aria-label="Fansub-Gruppe"` fasst die Chips zusammen. "Alle" erscheint nur bei
  `showAllChip=true` und steht per D-11 vorn; die Options-Reihenfolge selbst wird nicht neu sortiert.
  20px-Logo per `resolveLogoUrl` (1:1 aus `FansubVersionBrowser.tsx` uebernommen) wird nur gerendert,
  wenn `logo_url` gesetzt ist -- sonst kein Bild-Element, kein Dummy-Icon.
- `FansubGroupContext.tsx` ersetzt `ActiveFansubStory.tsx` vollstaendig: Gruppenname als
  Ueberschrift OHNE Link (D-13), Story-Absatz + "Mehr lesen →" nur bei nicht-leerem/nicht-nur-
  Whitespace `story_preview` (D-05/§7 -- kein Platzhaltertext, keine Faktenzeile aus
  `buildFansubStoryPreview`/`buildFansubFactSummary`, D-07), "Zur Fansub-Gruppe" immer als echter
  `Button href`-Link, "Zum Projekt" nur wenn Gruppen- UND Anime-Slug vorhanden sind -- explizit KEIN
  Fallback auf die technische Route `/anime/<id>/group/<id>` (D-12).
- Beide Komponenten haben eigene, verhaltensausfuehrende RTL/Vitest-Tests (7 + 6 Faelle aus den
  Plan-`<behavior>`-Bloecken), 13/13 gruen.
- Notwendige Folgekorrektur dokumentiert: Das Loeschen von `ActiveFansubStory.tsx` haette
  `FansubVersionBrowser.tsx` sofort kompilierunfaehig gemacht (kaputter Import) -- minimal
  umverdrahtet, ohne die eigentliche Chip-/CTA-Wiring-Arbeit von 162-03 vorwegzunehmen.

## Task Commits

Each task was committed atomically:

1. **Task 1: FansubGroupPicker.tsx — Filter-Chip-Zeile** - `042bd6f8` (feat)
2. **Task 2: FansubGroupContext.tsx — gruppenspezifischer Bereich (ersetzt ActiveFansubStory.tsx)** - `e63f223f` (feat)

## Files Created/Modified/Deleted

- `frontend/src/components/fansubs/FansubGroupPicker.tsx` (neu) — Filter-Chip-Zeile, Button-Primitive
- `frontend/src/components/fansubs/FansubGroupPicker.module.css` (neu) — Chip-Form/Farben (Phase-160-Tokens)
- `frontend/src/components/fansubs/FansubGroupPicker.test.tsx` (neu) — 7 Behavior-Tests
- `frontend/src/components/fansubs/FansubGroupContext.tsx` (neu) — gruppenspezifischer Bereich
- `frontend/src/components/fansubs/FansubGroupContext.module.css` (neu) — Karten-/Story-/Nav-Styles
- `frontend/src/components/fansubs/FansubGroupContext.test.tsx` (neu) — 6 Behavior-Tests
- `frontend/src/components/fansubs/ActiveFansubStory.tsx` (geloescht) — vollstaendig ersetzt
- `frontend/src/components/fansubs/ActiveFansubStory.module.css` (geloescht)
- `frontend/src/components/fansubs/__tests__/ActiveFansubStory.test.tsx` (geloescht)
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` (minimal geaendert) — Import/Usage von
  `ActiveFansubStory` auf `FansubGroupContext` umgestellt (`activeStoryGroup`-Ableitung), sonst
  unveraendert; die alte `filterRow`/`groupCtaRow`-Chip-/CTA-Logik bleibt bewusst unangetastet
  (Scope von 162-03)
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx` (minimal geaendert) — geteilter
  `assertGroup()`-Helfer prueft jetzt `heading` statt `link` fuer den Gruppennamen im Bereich

## Decisions Made

- Chip-Primitive-Entscheidung aus UI-SPEC 1:1 umgesetzt: `Button`-Primitive statt neuem
  Chip-Component; aktiver Zustand ueber drei nicht-farbliche Signale gleichzeitig
  (`--surface-sunken`-Hintergrund, `2px solid var(--accent-primary)`-Rahmen, `font-weight:600`)
  zusaetzlich zur Akzentfarbe (UI-SPEC Color-Sektion, REQ-162-05).
- `FansubGroupContext` verwendet ausschliesslich das additive `story_preview`-Feld aus Plan 162-01 —
  kein eigener Truncation-/HTML-Rendering-Code auf der Anime-Seite (D-05 verbietet `RichTextRenderer`
  explizit).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] `FansubVersionBrowser.tsx`-Import auf `FansubGroupContext` umgestellt**
- **Found during:** Task 2 (nach Loeschen von `ActiveFansubStory.tsx`)
- **Issue:** `FansubVersionBrowser.tsx` importierte `ActiveFansubStory` aus der geloeschten Datei —
  ohne Anpassung waere der Build/Typecheck sofort gebrochen.
- **Fix:** `activeStoryGroup` wird aus `storyGroups` per `.find(id === activeFansubGroupID)`
  abgeleitet und an `<FansubGroupContext activeGroup={activeStoryGroup} animeSlug={animeSlug} />`
  uebergeben. Die bestehende `filterRow`/`groupCtaRow`-Chip-/CTA-Struktur (natives `<button>`,
  "Gruppenbereich"-CTA) bleibt unveraendert bestehen — deren Ersetzung durch `FansubGroupPicker` und
  die zwei getrennten Navigationsziele ist explizit Scope von Plan 162-03 (Wiring-Plan).
- **Files modified:** `frontend/src/components/fansubs/FansubVersionBrowser.tsx`
- **Commit:** `e63f223f`

**2. [Rule 1 - Bug/Regression] `FansubVersionBrowser.test.tsx` `assertGroup()`-Helfer korrigiert**
- **Found during:** Task 2, nach der Umverdrahtung aus Deviation 1
- **Issue:** Der geteilte Test-Helfer `assertGroup()` (genutzt von 12 Tests im Block "one
  deterministic group owner") pruefte bisher `within(article).getByRole('link', {name:
  selected.name})` — das war die alte `ActiveFansubStory`-Verhaltensannahme (Gruppenname als Link).
  Nach dem Wechsel auf `FansubGroupContext` ist der Gruppenname eine reine Ueberschrift ohne Link
  (D-13), wodurch alle 12 Tests im Block sowie kaskadierend 8 weitere Tests im selben File (durch
  Testverschmutzung nach der fruehen Exception) fehlschlugen.
- **Fix:** `assertGroup()` prueft jetzt `getByRole('heading', {name: selected.name})` UND
  zusaetzlich, dass `queryByRole('link', {name: selected.name})` `null` ist (positiver UND
  negativer Beweis fuer D-13).
- **Files modified:** `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`
- **Commit:** `e63f223f`
- **Verification:** Volle Datei danach 32/32 gruen (vorher isoliert getestet: mit der
  Original-`ActiveFansubStory`-Referenz aus `git show HEAD:...` liefen alle 32 Tests unveraendert
  gruen — die Regression stammt nachweislich aus dieser Plan-Aenderung, nicht aus Altlast).

Diese beiden Anpassungen liegen ausserhalb der im Plan-Frontmatter gelisteten `files_modified` fuer
diesen Plan, sind aber eine direkte, unvermeidbare Konsequenz der geforderten Loeschung von
`ActiveFansubStory.tsx` (Plan-Acceptance-Criterion "Datei existiert nicht mehr"). Ohne diese
Deviationen waere der Build gebrochen bzw. die bestehende Testsuite rot geblieben.

## Self-Check Preview

- `test -f frontend/src/components/fansubs/ActiveFansubStory.tsx` → nicht gefunden (OK)
- `grep -c "Keine Historie hinterlegt" FansubGroupContext.tsx` → 0
- `grep -c "buildFansubStoryPreview\|buildFansubFactSummary" FansubGroupContext.tsx` → 0
- `grep -c "<button" FansubGroupPicker.tsx` → 0; `role="group"` → 1; `aria-label="Fansub-Gruppe"` → 1
- `grep -rn "ActiveFansubStory" frontend/src` → keine Treffer (repo-weit)
- `npx vitest run src/components/fansubs` → 25/25 Dateien, 164/164 Tests gruen
- `npx vitest run src/app/anime` → 20/20 Dateien, 185/185 Tests gruen (keine Fremdregression)
- `npm run typecheck` → 0 Fehler
- `npx eslint` (alle geaenderten/neuen Dateien) → 0 Findings

## Verification Results

```
docker compose exec -T team4sv30-frontend npx vitest run src/components/fansubs/FansubGroupPicker.test.tsx
✓ 7 tests passed

docker compose exec -T team4sv30-frontend npx vitest run src/components/fansubs/FansubGroupContext.test.tsx
✓ 6 tests passed

docker compose exec -T team4sv30-frontend npx vitest run src/components/fansubs
✓ 25 files, 164 tests passed

docker compose exec -T team4sv30-frontend npx vitest run src/app/anime
✓ 20 files, 185 tests passed (keine Fremdregression durch die Umverdrahtung)

docker compose exec -T team4sv30-frontend npm run typecheck
✓ 0 Fehler

docker compose exec -T team4sv30-frontend npx eslint <alle geaenderten/neuen Dateien>
✓ 0 Findings
```

## Success Criteria Assessment

- `FansubGroupPicker.tsx` und `FansubGroupContext.tsx` existieren, sind eigenstaendig testbar und
  folgen den UI-SPEC-Tokens (Farbe/Typografie/Spacing) — **erfuellt**
- `ActiveFansubStory.tsx`/`.module.css`/Test vollstaendig entfernt, keine parallele Alt-Loesung —
  **erfuellt** (repo-weiter Grep bestaetigt 0 Referenzen)
- Beide Komponenten nutzen ausschliesslich `@/components/ui`-Primitives, kein natives `<button>` —
  **erfuellt** (`FansubGroupPicker` nutzt nur `Button`; `FansubGroupContext` nutzt `Button` fuer
  beide Navigationsziele, `Link` nur fuer "Mehr lesen →" gemaess Plan-Vorgabe)

## Issues Encountered

Kein Blocker. Die zwei dokumentierten Rule-1/Rule-3-Deviationen waren noetig, um den Build/die
Testsuite nach dem planvorgeschriebenen Loeschen von `ActiveFansubStory.tsx` gruen zu halten, ohne
die eigentliche Chip-/URL-State-Wiring-Arbeit von Plan 162-03 vorwegzunehmen.

## User Setup Required

Keine — reine Frontend-Komponentenarbeit ohne neue Umgebungsvariablen, Migrationen oder externe
Abhaengigkeiten. Die alte Chip-Zeile (natives `<button>`, `filterRow`) und die alte CTA
("Gruppenbereich") in `FansubVersionBrowser.tsx` bleiben bis Plan 162-03 sichtbar bestehen — das ist
erwartet (Interface-First-Ordering laut Plan-Objective), keine sichtbare Regression fuer Nutzer, da
`FansubGroupContext` funktional ein Drop-in-Ersatz fuer `ActiveFansubStory` ist (gleiche
Aufrufstelle, gleiche Sichtbarkeitslogik ueber `activeFansubGroupID`).

## Self-Check: PASSED

Alle 8 genannten Dateien (6 neu/geaendert + 2 minimal geaendert) vorhanden bzw. wie erwartet
geloescht; beide Task-Commit-Hashes (`042bd6f8`, `e63f223f`) in `git log` gefunden.
