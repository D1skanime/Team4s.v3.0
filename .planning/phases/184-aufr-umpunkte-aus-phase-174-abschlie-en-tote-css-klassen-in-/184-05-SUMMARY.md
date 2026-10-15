---
phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-
plan: 05
subsystem: frontend
tags: [nextjs, react, refactor, file-length-split, fansubs]

# Dependency graph
requires:
  - phase: 184-03
    provides: "mergeCssModules-Helfer (noch nicht in diesem Plan verwendet, aber Voraussetzung fuer 184-06)"
provides:
  - "admin/fansubs/page.tsx und admin/fansubs/merge/page.tsx liegen jetzt unter der 450-Zeilen-Grenze (D-05), reine Umbau-Commits ohne Verhaltensaenderung"
  - "useAdminFansubsList()-Hook (State/Effekte/Handler der Fansub-Liste)"
  - "FansubListRows.tsx (FansubDesktopRow/FansubMobileCard)"
  - "useMergeFansubsWizard()-Hook (State/Effekte/Handler des Merge-Wizards)"
  - "MergeWizardCards.tsx (GroupRowCard/KpiCard/ConflictRow/sumGroupCounts/emptyCountSummary)"
  - "MergeWizardPreviewStep.tsx (Schritt-3-Vorschau-Rendering)"
  - "MergeWizardProgress.tsx (Fortschrittsanzeige-Rendering)"
affects: [184-06]
tech-stack:
  added: []
  patterns:
    - "Options-Objekt-Hook + reine Render-Komponente (Muster aus useGroupMembersTab.ts/GroupMembersTab.tsx uebernommen)"
    - "Zeilen-/Karten-Rendering als eigenstaendige Praesentationskomponente ausgelagert, wenn Hook-Extraktion allein nicht unter 450 Zeilen bringt"

key-files:
  created:
    - frontend/src/app/admin/fansubs/useAdminFansubsList.ts
    - frontend/src/app/admin/fansubs/FansubListRows.tsx
    - frontend/src/app/admin/fansubs/merge/useMergeFansubsWizard.ts
    - frontend/src/app/admin/fansubs/merge/MergeWizardCards.tsx
    - frontend/src/app/admin/fansubs/merge/MergeWizardPreviewStep.tsx
    - frontend/src/app/admin/fansubs/merge/MergeWizardProgress.tsx
  modified:
    - frontend/src/app/admin/fansubs/page.tsx
    - frontend/src/app/admin/fansubs/merge/page.tsx
    - frontend/eslint.config.mjs
    - .planning/phases/184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-/deferred-items.md

key-decisions:
  - "Die im Plan vorgesehenen zwei Zieldateien (useAdminFansubsList.ts, useMergeFansubsWizard.ts) allein reichten nicht, um beide page.tsx unter 450 Zeilen zu bringen (515 bzw. 593 Zeilen nach reiner Hook-Extraktion) -- deshalb zusaetzlich FansubListRows.tsx (Task 1) sowie MergeWizardPreviewStep.tsx und MergeWizardProgress.tsx (Task 2) als weitere reine Render-Ausgliederungen ergaenzt, gedeckt durch CLAUDE.md 'in fachlich sinnvolle, kleinere Module (Ziel: jede Datei <= 450 Zeilen)'"
  - "FansubListRows.tsx zur eslint no-restricted-syntax-Legacy-Liste ergaenzt (reine Code-Verschiebung bereits als 'warn' gelisteter Checkbox-Inputs aus page.tsx), damit die Verschiebung keine neue 'error'-Severity fuer unveraenderten Altcode erzeugt -- gleiches, bereits dokumentiertes Muster wie 174-14/156-14/180-04"
  - "Spread-Merge-Zeile `const styles = { ...sharedStyles, ...X }` unveraendert in allen neuen und bestehenden Dateien uebernommen (auch in den drei neuen Dateien) -- diese Migration ist explizit Scope von Plan 184-06, nicht dieses Plans"

requirements-completed: [D-05]

duration: ~55min
completed: 2026-10-15
---

# Phase 184 Plan 05: D-05-Vorlauf fuer F-12 (admin/fansubs-Dateien aufteilen) Summary

Reiner Umbau: `admin/fansubs/page.tsx` (760 Zeilen) und `admin/fansubs/merge/page.tsx` (954 Zeilen) sind in Render-Komponente + State/Handler-Hook (+ weitere ausgelagerte Render-Bausteine) gesplittet, alle resultierenden Dateien liegen unter 450 Zeilen, keine Verhaltensaenderung.

## Performance

- **Duration:** ~55 min
- **Started:** 2026-10-15T15:35:00Z (geschaetzt anhand vorheriger STATE.md-Markierung)
- **Completed:** 2026-10-15T16:29:27Z
- **Tasks:** 2/2 completed
- **Files modified/created:** 10 (2 geaendert, 6 neu erstellt, 1 eslint-Konfig geaendert, 1 deferred-items.md ergaenzt)

## Accomplishments

- `admin/fansubs/page.tsx`: 760 -> 370 Zeilen (Render), State/Effekte/Handler in `useAdminFansubsList.ts` (335 Zeilen), Tabellen-/Karten-Zeilen in `FansubListRows.tsx` (187 Zeilen) ausgelagert.
- `admin/fansubs/merge/page.tsx`: 954 -> 424 Zeilen (Render), State/Effekte/Handler in `useMergeFansubsWizard.ts` (348 Zeilen), bereits lose Render-Bausteine nach `MergeWizardCards.tsx` (121 Zeilen) verschoben, Vorschau-Schritt nach `MergeWizardPreviewStep.tsx` (183 Zeilen) und Fortschrittsanzeige nach `MergeWizardProgress.tsx` (54 Zeilen) ausgelagert.
- Alle acht betroffenen/neuen Dateien liegen unter der 450-Zeilen-Grenze (D-05 erfuellt).
- Default-Exports und Routen beider Seiten unveraendert, kein neues Verhalten.
- Volles Gate im Frontend-Container gruen: `npx tsc --noEmit` clean, `npx eslint .` 0 neue Fehler (4 vorbestehende, unabhaengige Fehler ausserhalb des Scopes unveraendert), `npx vitest run` 387 passed/1 skipped (2 Dateien mit insgesamt 2 vorbestehenden, unabhaengigen Fehlern -- siehe Deviations).
- `docker restart team4sv30-frontend` nach allen Frontend-Edits ausgefuehrt, Container danach gesund (`curl -sI http://192.168.235.196:3000/` -> 200).

## Task Commits

Each task was committed atomically:

1. **Task 1: admin/fansubs/page.tsx aufteilen** - `961a75cf7` (refactor)
2. **Task 2: admin/fansubs/merge/page.tsx aufteilen** - `176d833f6` (refactor)

## Files Created/Modified

- `frontend/src/app/admin/fansubs/useAdminFansubsList.ts` - State/Effekte/Handler der Fansub-Liste (Hook)
- `frontend/src/app/admin/fansubs/FansubListRows.tsx` - Desktop-Tabellenzeile + Mobile-Karte als reine Praesentationskomponenten
- `frontend/src/app/admin/fansubs/page.tsx` - Nur noch Default-Export + JSX-Rendering
- `frontend/src/app/admin/fansubs/merge/useMergeFansubsWizard.ts` - State/Effekte/Handler des Merge-Wizards (Hook)
- `frontend/src/app/admin/fansubs/merge/MergeWizardCards.tsx` - GroupRowCard/KpiCard/ConflictRow/sumGroupCounts/emptyCountSummary (unveraendert verschoben)
- `frontend/src/app/admin/fansubs/merge/MergeWizardPreviewStep.tsx` - Schritt-3-Vorschau-Rendering als eigene Komponente
- `frontend/src/app/admin/fansubs/merge/MergeWizardProgress.tsx` - Fortschrittsanzeige/Schritt-Navigation als eigene Komponente
- `frontend/src/app/admin/fansubs/merge/page.tsx` - Nur noch Default-Export + JSX-Rendering
- `frontend/eslint.config.mjs` - `FansubListRows.tsx` zur no-restricted-syntax-Legacy-Liste ergaenzt (dokumentierte reine Code-Verschiebung)
- `.planning/phases/184-.../deferred-items.md` - 184-05-Eintrag fuer die bereits aus 184-02 bekannten, unabhaengigen Vitest-Vorbestandsfaelle ergaenzt

## Decisions Made

- Ueber die im Plan genannten Zieldateien hinaus wurden drei weitere reine Render-Ausgliederungen (`FansubListRows.tsx`, `MergeWizardPreviewStep.tsx`, `MergeWizardProgress.tsx`) ergaenzt, weil Hook-Extraktion allein beide page.tsx nicht unter 450 Zeilen gebracht hatte (515 bzw. 593 Zeilen zwischenzeitlich gemessen). Das ist durch CLAUDE.md's "in fachlich sinnvolle, kleinere Module" explizit gedeckt.
- `FansubListRows.tsx` wurde bewusst der eslint no-restricted-syntax-Legacy-Liste hinzugefuegt (statt die verschobenen Checkbox-Inputs stillschweigend auf `error`-Severity laufen zu lassen), um eine versehentliche UI-Primitive-Migration als Nebenwirkung eines reinen Umbau-Commits zu vermeiden -- dieselbe, bereits im Repo etablierte Begruendung wie bei den 174-14-/156-14-/180-04-Ergaenzungen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - fehlende Ergaenzung zur Zielvorgabe] Zusaetzliche Render-Ausgliederungen ueber die geplanten zwei Hook-Dateien hinaus**
- **Found during:** Task 1 und Task 2 (Zeilenzaehlung nach Hook-Extraktion)
- **Issue:** Reine Hook-Extraktion brachte `admin/fansubs/page.tsx` nur auf 515 Zeilen und `admin/fansubs/merge/page.tsx` nur auf 593 Zeilen -- beide weiterhin ueber der 450-Zeilen-Grenze aus D-05/CLAUDE.md.
- **Fix:** Zusaetzliche reine Render-Komponenten ausgelagert (`FansubListRows.tsx` fuer Task 1; `MergeWizardPreviewStep.tsx` und `MergeWizardProgress.tsx` fuer Task 2), bis alle Dateien unter 450 Zeilen lagen. Keine Logikaenderung, nur Verschiebung von JSX-Blöcken in eigene Komponenten mit Props.
- **Files modified:** `frontend/src/app/admin/fansubs/FansubListRows.tsx`, `frontend/src/app/admin/fansubs/merge/MergeWizardPreviewStep.tsx`, `frontend/src/app/admin/fansubs/merge/MergeWizardProgress.tsx`
- **Verification:** `wc -l` auf alle resultierenden Dateien (<= 450), `npx tsc --noEmit`/`npx eslint .`/`npx vitest run` gruen.
- **Committed in:** `961a75cf7` (Task 1), `176d833f6` (Task 2)

**2. [Rule 1 - Bug im eigenen Entwurf] Versehentliche Verhaltensaenderung beim Kopieren der "Vorschau aktualisieren"-Disabled-Logik korrigiert, bevor sie committet wurde**
- **Found during:** Task 2, waehrend des Schreibens von `merge/page.tsx`
- **Issue:** Beim ersten Entwurf des Vorschau-Buttons wurde die `disabled`-Bedingung versehentlich zu `!targetGroup && sourceIDs.size === 0 ? true : previewLoading || merging` vereinfacht statt des Original-Ausdrucks `!selectionReady || previewLoading || merging` -- eine echte Verhaltensaenderung, die in diesem reinen Umbau-Plan verboten ist.
- **Fix:** `selectionReady` zusaetzlich aus `useMergeFansubsWizard()` zurueckgegeben und im Button exakt wie im Original verwendet, vor dem Commit korrigiert.
- **Files modified:** `frontend/src/app/admin/fansubs/merge/useMergeFansubsWizard.ts`, `frontend/src/app/admin/fansubs/merge/page.tsx`
- **Verification:** Diff gegen Original-JSX-Bedingung manuell abgeglichen, `npx tsc --noEmit`/`npx vitest run` gruen.
- **Committed in:** `176d833f6` (bereits korrigiert im einzigen Task-2-Commit, kein separater Fix-Commit noetig)

## Auth Gates Encountered

None.

## Stub Tracking

Keine neuen Stubs. Alle Daten-/API-Aufrufe wurden unveraendert aus den Originaldateien in die Hooks uebernommen.

## Threat Flags

None - reine Dateiaufteilung, keine neue Netzwerk-/Auth-/Dateizugriffs-Flaeche (siehe `<threat_model>` im Plan, Disposition "accept").

## Known Stubs

None.

## Deferred Issues (out of scope, pre-existing)

- `frontend/src/types/__tests__/anime-detail-contract.test.ts` schlaegt weiterhin vorbestehend fehl (bereits aus 184-02 bekannt, unabhaengig von diesem Plan, betrifft `shared/contracts/openapi.yaml`). Siehe `deferred-items.md`.
- `AchievementBadgeShowcase.test.tsx` zeigte im vollen `vitest run` einen einmaligen 5000ms-Timeout-Flake, in Isolation gruen. Siehe `deferred-items.md`.

## Self-Check: PASSED

- FOUND: `frontend/src/app/admin/fansubs/useAdminFansubsList.ts`
- FOUND: `frontend/src/app/admin/fansubs/FansubListRows.tsx`
- FOUND: `frontend/src/app/admin/fansubs/page.tsx`
- FOUND: `frontend/src/app/admin/fansubs/merge/useMergeFansubsWizard.ts`
- FOUND: `frontend/src/app/admin/fansubs/merge/MergeWizardCards.tsx`
- FOUND: `frontend/src/app/admin/fansubs/merge/MergeWizardPreviewStep.tsx`
- FOUND: `frontend/src/app/admin/fansubs/merge/MergeWizardProgress.tsx`
- FOUND: `frontend/src/app/admin/fansubs/merge/page.tsx`
- FOUND: commit `961a75cf7`
- FOUND: commit `176d833f6`
