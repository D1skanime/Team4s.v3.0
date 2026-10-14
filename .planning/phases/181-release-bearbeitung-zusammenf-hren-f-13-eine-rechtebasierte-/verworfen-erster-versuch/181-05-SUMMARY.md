---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
plan: 05
subsystem: ui
tags: [typescript, react, vitest, release-editor, navigation, adjacent-navigation]

# Dependency graph
requires:
  - phase: 181-02
    provides: "releaseEditorRouting.ts (NavigationContext type, formatEpisodeNumber) which useReleaseEditorNavigation.ts imports"
  - phase: 181-03
    provides: "frontend/src/components/releaseEditor/episodeVersionEditorUtils.ts -- useReleaseEditorData.ts's only changed import line already points here (Plan 03 relocated it)"
provides:
  - "AdjacentNavigation gains an optional, backward-compatible centerLabel slot (6 existing callers unaffected)"
  - "episodeNeighborNavigation.ts/useEpisodeNeighborNavigation.ts copied verbatim into app/releases/[versionId]/edit/, plus a new useProjectNeighborNavigation.ts extracted from workspace/page.tsx's inline useEffect with an added enabled gate"
  - "useReleaseEditorNavigation(context, params) -- context-selecting facade activating exactly ONE neighbor-navigation data source per D-03, never both"
  - "useReleaseEditorData() -- verbatim-ported, behavior-proven useEpisodeVersionEditor.ts (416 lines, load/form/save/scan/group-search state)"
affects: [181-06, 181-07, 181-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Facade hook that always calls both underlying data-source hooks (React rules-of-hooks) but gates each one's actual network I/O via params (null animeId/currentVersionId for the inert episode hook, explicit enabled flag for the project hook) -- never merges their return shapes"

key-files:
  created:
    - frontend/src/app/releases/[versionId]/edit/episodeNeighborNavigation.ts
    - frontend/src/app/releases/[versionId]/edit/episodeNeighborNavigation.test.ts
    - frontend/src/app/releases/[versionId]/edit/useEpisodeNeighborNavigation.ts
    - frontend/src/app/releases/[versionId]/edit/useEpisodeNeighborNavigation.test.ts
    - frontend/src/app/releases/[versionId]/edit/useProjectNeighborNavigation.ts
    - frontend/src/app/releases/[versionId]/edit/useProjectNeighborNavigation.test.ts
    - frontend/src/app/releases/[versionId]/edit/useReleaseEditorNavigation.ts
    - frontend/src/app/releases/[versionId]/edit/useReleaseEditorNavigation.test.ts
    - frontend/src/app/releases/[versionId]/edit/useReleaseEditorData.ts
    - frontend/src/app/releases/[versionId]/edit/useReleaseEditorData.test.tsx
  modified:
    - frontend/src/components/ui/AdjacentNavigation.tsx
    - frontend/src/components/ui/AdjacentNavigation.module.css
    - frontend/src/components/ui/AdjacentNavigation.test.tsx

key-decisions:
  - "useReleaseEditorNavigation's params interface extends the plan interfaces sketch with two fields needed for real href-building that the sketch omitted: `activeTab` (required by the episode-context href formula `/releases/${id}/edit?tab=${activeTab}`) and `projectReturnHref` (required by the project-context href formula with `return_to`). Both are plain strings/nullable, no new state -- documented here as a Rule 1/Rule 2 completion of an under-specified interface, not a scope change."
  - "useEpisodeNeighborNavigation has no `enabled` param in its real signature (only animeId/currentVersionId/groupId/releaseVersion) -- the facade gates it by passing animeId:null/currentVersionId:null when context !== 'episode' instead of a non-existent enabled flag, relying on the hook's own existing canFetch gate. useProjectNeighborNavigation, being new in this plan, does get a real explicit enabled boolean."
  - "formatProjectReleaseLabel (the project-context label formula, verbatim from workspaceHelpers.ts's formatAdjacentReleaseLabel) is kept as a private, non-exported helper inside useReleaseEditorNavigation.ts rather than added to releaseEditorRouting.ts -- that file is not part of this plan's files_modified list and already fully covers D-01/D-03's routing/context-resolution surface; the label formula is purely a navigation-facade concern."

patterns-established:
  - "D-03 neighbor-navigation composition: both mutually-exclusive data-source hooks are always invoked (rules-of-hooks), but only the active context's hook performs real I/O -- verified by a dedicated test asserting the inactive source's underlying API function is never called (T-181-08)."

requirements-completed: [D-03]

# Metrics
duration: ~7min
completed: 2026-10-13
---

# Phase 181 Plan 05: Release-Editor Navigation + Daten-Hook-Schicht Summary

**AdjacentNavigation erhält einen optionalen centerLabel-Slot; die neue Routen-Mappe `app/releases/[versionId]/edit/` bekommt eine vollständige, eigenständige Navigations- und Daten-Hook-Schicht (kopierte Episoden-Nachbar-Hooks, extrahierter Projekt-Nachbar-Hook, eine D-03-Kontext-Fassade und ein wortgetreuer Port des 416-Zeilen-Editor-Hooks) für die Orchestrator-Seiten der Pläne 06/07.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-10-13T16:13:30Z
- **Completed:** 2026-10-13T16:21:04Z
- **Tasks:** 3/3
- **Files modified:** 13 (10 neu, 3 geändert)

## Accomplishments
- `AdjacentNavigation` rendert jetzt ein optionales `centerLabel` zwischen `previous`/`next` (oder allein, ohne previous/next), mit erweitertem Leer-Guard (`!previous && !next && !centerLabel`); alle 6 bestehenden Aufrufer (keiner übergibt `centerLabel`) bleiben visuell unverändert — bewiesen durch 3 neue plus alle bestehenden Testfälle grün.
- `episodeNeighborNavigation.ts`/`useEpisodeNeighborNavigation.ts` (+ Tests) liegen byte-identisch in der neuen Routen-Mappe; `workspace/page.tsx` ist dabei nachweislich unverändert geblieben (`git diff --stat` leer) — Kopie statt Verschiebung, da das Original erst in Plan 09 gelöscht wird.
- `useProjectNeighborNavigation` extrahiert die projektbezogene Nachbar-Logik aus `workspace/page.tsx:189-229` in einen eigenständigen, parametrisierten Hook mit explizitem `enabled`-Gate (neu gegenüber dem Original, das immer feuerte, sobald seine Deps gesetzt waren) — 4 neue Tests decken den deaktivierten Zustand, den Erfolgsfall, den Fehlerfall und den Uebergang enabled→disabled ab.
- `useReleaseEditorNavigation(context, params)` aktiviert laut D-03 zur Laufzeit genau EINE der beiden Datenquellen und liefert eine einheitliche `{isLoading, error, centerLabel, previousHref, previousLabel, nextHref, nextLabel}`-Form — 2 Tests beweisen explizit, dass der episodenseitige Kontext `getMyProjectDetail` NIE aufruft und umgekehrt (T-181-08).
- `useReleaseEditorData` ist ein wortgetreuer Umbenennungs-Port von `useEpisodeVersionEditor.ts` (416 Zeilen, keine Logikänderung); der portierte Test erreicht exakt dieselbe Testanzahl (30/30) wie das Original.
- Vollregression grün: `npx tsc --noEmit` 0 Fehler, volle Suite 392/393 Testdateien grün (1 bewusst übersprungen, unverändert vorbestehend) mit 3612 Tests, `npx eslint` auf allen neuen/geänderten Dateien 0 Befunde.

## Task Commits

Jede Aufgabe folgte, wo zutreffend, dem RED→GREEN-TDD-Zyklus:

1. **Task 1: AdjacentNavigation centerLabel** - `7075d12f` (test, RED) → `aa180705` (feat, GREEN)
2. **Task 2: Episoden-Hooks kopieren + Projekt-Hook extrahieren** - `0dc6dac5` (feat, inkl. Tests)
3. **Task 3: useReleaseEditorNavigation-Fassade + useReleaseEditorData-Port** - `a9f0c3ef` (feat, inkl. Tests)

**Plan metadata:** (this commit)

## Files Created/Modified
- `frontend/src/components/ui/AdjacentNavigation.tsx` - optionaler `centerLabel`-Prop, erweiterter Leer-Guard, Rendering zwischen previous/next
- `frontend/src/components/ui/AdjacentNavigation.module.css` - `.adjacentNavCenterLabel`-Regel ergänzt
- `frontend/src/components/ui/AdjacentNavigation.test.tsx` - 3 neue Testfälle (centerLabel allein, kein centerLabel weiterhin leer, centerLabel + previous)
- `frontend/src/app/releases/[versionId]/edit/episodeNeighborNavigation.ts` (+test) - byte-identische Kopie aus dem Admin-Editor-Ordner
- `frontend/src/app/releases/[versionId]/edit/useEpisodeNeighborNavigation.ts` (+test) - byte-identische Kopie aus dem Admin-Editor-Ordner
- `frontend/src/app/releases/[versionId]/edit/useProjectNeighborNavigation.ts` (+test) - neu extrahiert aus `workspace/page.tsx:189-229`, mit `enabled`-Gate
- `frontend/src/app/releases/[versionId]/edit/useReleaseEditorNavigation.ts` (+test) - neue D-03-Kontext-Fassade
- `frontend/src/app/releases/[versionId]/edit/useReleaseEditorData.ts` (+test) - umbenannter Port von `useEpisodeVersionEditor.ts`

## Decisions Made
- `useReleaseEditorNavigation`s Parameter-Interface ergänzt zwei in der Plan-Skizze fehlende, aber für echtes Href-Bauen notwendige Felder (`activeTab`, `projectReturnHref`) — siehe `key-decisions` oben für die vollständige Begründung.
- `formatProjectReleaseLabel` bleibt als privater Helfer innerhalb von `useReleaseEditorNavigation.ts`, statt `releaseEditorRouting.ts` (außerhalb dieses Plans' `files_modified`) zu erweitern.
- Das episodenseitige Gating läuft über `animeId:null`/`currentVersionId:null` statt eines (im echten Hook nicht existierenden) `enabled`-Flags — der bestehende `canFetch`-Mechanismus in `useEpisodeNeighborNavigation` wird dafür genutzt, nicht verändert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] `useReleaseEditorNavigation`'s params-Interface um `activeTab`/`projectReturnHref` ergänzt**
- **Found during:** Task 3 (Implementierung der Href-Bau-Formeln)
- **Issue:** Die Plan-Skizze für `useReleaseEditorNavigation`s Parameter listete nur `animeId`/`selectedGroupId`/`currentReleaseVersionId`/`episodeVersion`, enthielt aber in derselben Task-Beschreibung die Pflicht-Formel `/releases/${id}/edit?tab=${activeTab}` bzw. `?return_to=${encodeURIComponent(projectReturnHref)}` — beide Formeln referenzieren Werte, die im Parameter-Interface fehlten.
- **Fix:** Interface um `activeTab: string` und `projectReturnHref: string | null` ergänzt; beide werden ausschließlich zum Href-Bauen verwendet, keine neue Logik/kein neuer State.
- **Files modified:** `frontend/src/app/releases/[versionId]/edit/useReleaseEditorNavigation.ts`
- **Commit:** `a9f0c3ef`

---

**Total deviations:** 1 auto-fixed (1 missing critical, interface completion)
**Impact on plan:** Rein additive Ergänzung eines unterspezifizierten Interfaces, keine Scope-Erweiterung. Alle in der Plan-Akzeptanzkriterien genannten Prüfungen (T-181-08-Testfall, `grep "export function useReleaseEditorData"`, identische Testanzahl) sind erfüllt.

## Issues Encountered

None.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness
- Plan 06 (Tab-Komponenten) und Plan 07 (Seiten-Komposition) können `useReleaseEditorNavigation`, `useReleaseEditorData` und die erweiterte `AdjacentNavigation`-Primitive direkt konsumieren.
- `workspace/page.tsx` bleibt bis Plan 09 unverändert (Kopie-statt-Verschiebung-Strategie bestätigt für alle 3 kopierten/portierten Dateien dieses Plans).
- Keine Blocker für nachfolgende Pläne dieser Phase.

---
*Phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-*
*Completed: 2026-10-13*

## Self-Check: PASSED

Alle 10 neuen Hook-/Utility-Dateien unter `frontend/src/app/releases/[versionId]/edit/` plus
`frontend/src/components/ui/AdjacentNavigation.tsx` auf der Festplatte gefunden; alle 4
Task-Commits (`7075d12f`, `aa180705`, `0dc6dac5`, `a9f0c3ef`) im Git-Log gefunden.
