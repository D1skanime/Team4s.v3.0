---
phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-
plan: 04
subsystem: ui
tags: [react, nextjs, css-modules, refactor, mergeCssModules, hooks]

# Dependency graph
requires:
  - phase: 184-03
    provides: "frontend/src/lib/mergeCssModules.ts (Proxy-basierter CSS-Modul-Merge-Helfer, getestet)"
provides:
  - "FansubAppMembersSection.tsx regelkonform (D-05) in Render-Komponente + zwei Hooks aufgeteilt, alle ≤450 Zeilen"
  - "Alle 16 vormals inline-Proxy-Dateien unter admin/fansubs/[id]/edit/ rufen jetzt den zentralen Helfer mergeCssModules"
affects: [184-05, 184-06, 184-07, 184-08, 184-09, 184-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hook+Render-Split nach Vorbild useGroupMembersTab.ts/GroupMembersTab.tsx: Komponente ruft nur noch den Hook und rendert JSX"
    - "Sub-Hook-Extraktion für einen klar abgegrenzten State-Teilbereich (historische Rollen-Entwürfe), wenn der Haupt-Hook sonst die 450-Zeilen-Grenze reißen würde"
    - "mergeCssModules(own, shared) statt new Proxy(...)-Kopie je Verbraucher; 3er-Merge via mergeCssModules(a, mergeCssModules(b, c))"

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/useFansubAppMembersSection.ts
    - frontend/src/app/admin/fansubs/[id]/edit/useFansubAppMemberHistoricalRoleDrafts.ts
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteForm.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberRequestsTable.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubOpEdSection.tsx

key-decisions:
  - "Historische-Rollen-Entwürfe (addHistoricalRoleDraft/updateHistoricalRoleDraft/removeHistoricalRoleDraft/saveHistoricalRoleDraftsForEditor) in einen eigenen dritten Hook useFansubAppMemberHistoricalRoleDrafts.ts ausgelagert, weil der Haupt-Hook sonst 510 Zeilen gehabt hätte (>450). Nicht im Plan explizit vorgesehen, aber von D-05 (CLAUDE.md-Zeilenregel) verlangt."
  - "useFansubAppMembersSection nimmt nur { hasAccessToken, fansubId } entgegen (nicht zusätzlich claimsLinkOut wie im Plan-Text angedeutet), weil claimsLinkOut reines Render-Prop ist und nie in Hook-Logik verwendet wird — keine funktionale Abweichung, nur eine engere Signatur."

patterns-established:
  - "Bei Hook-Extraktionen, die die 450-Zeilen-Grenze sonst reißen würden, einen thematisch klar abgegrenzten Teilbereich (hier: ein Formular-/Entwurf-Cluster) in einen eigenen Sub-Hook ausgliedern, der von außen die berechneten Abhängigkeiten (hier: editorHistoricalMember/editorHistoricalRoles/historicalActions) als Parameter erhält."

requirements-completed: [D-01, D-05]

# Metrics
duration: 25min
completed: 2026-10-15
---

# Phase 184 Plan 04: F-12 Teil 1 — FansubAppMembersSection-Split (D-05) + 16-Dateien-Konsolidierung auf mergeCssModules (D-01) Summary

**FansubAppMembersSection.tsx (657 Zeilen) in Render-Komponente (210 Z.) + zwei Hooks (419 Z. + 156 Z.) aufgeteilt; alle 16 vormals inline-Proxy-Dateien unter admin/fansubs/[id]/edit/ rufen jetzt frontend/src/lib/mergeCssModules.ts statt eigener Proxy-Kopie.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-15T15:47:57Z (nach 184-03-Abschluss)
- **Completed:** 2026-10-15T16:08:47Z
- **Tasks:** 2
- **Files modified:** 18 (2 neu, 16 geändert)

## Accomplishments
- D-05 (Datei-Längen-Regel) für die einzige durch F-12 inhaltlich berührte Überlänge-Datei erfüllt: `FansubAppMembersSection.tsx` ist jetzt eine reine Render-Komponente (210 Zeilen), State/Effekte/Handler stecken in `useFansubAppMembersSection.ts` (419 Zeilen) und `useFansubAppMemberHistoricalRoleDrafts.ts` (156 Zeilen) — beide unter 450.
- D-01 (F-12) Teil 1 erfüllt: alle 16 der in Phase 176 bereits reparierten inline-Proxy-Dateien rufen jetzt den zentralen Helfer `mergeCssModules` aus 184-03, statt den Proxy-Block einzeln zu kopieren.
- Öffentliche Schnittstelle unverändert: gleiche Props, gleicher Default-Export, gleiches Markup, kein sichtbares Verhalten geändert.

## Task Commits

Jeder Task wurde atomar committet:

1. **Task 1: FansubAppMembersSection.tsx aufteilen (reiner Umbau-Commit, D-05, keine Proxy-Änderung)** - `b4dfaf547` (refactor)
2. **Task 2: Alle 16 Dateien auf mergeCssModules umstellen (inhaltlicher Commit)** - `0735bce06` (refactor)

**Plan metadata:** (folgt mit diesem Commit)

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/useFansubAppMembersSection.ts` - neuer Hook: Mitglieder/Capabilities/Kandidatensuche/Einladungen/Member-Editor-Orchestrierung (419 Zeilen)
- `frontend/src/app/admin/fansubs/[id]/edit/useFansubAppMemberHistoricalRoleDrafts.ts` - neuer Sub-Hook: Entwurfsliste "frühere Funktionen" im Member-Editor inkl. Speichern-Diff (156 Zeilen)
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` - jetzt reine Render-Komponente (210 Zeilen), ruft beide Hooks; `styles` ruft `mergeCssModules(fansubEditStyles, sharedStyles)`
- 15 weitere Dateien (`AnimeProjectNoteForm.tsx`, `AnimeProjectNotesSection.tsx`, `NotesTab.helpers.tsx`, `FansubAppMembersOverview.tsx`, `FansubAppMemberAddModal.tsx`, `GroupHistRoleDialog.tsx`, `GroupMemberFormModals.tsx`, `FansubAppMemberEditorPanel.tsx`, `GroupMembersTab.tsx`, `GroupMemberRequestsTable.tsx`, `GroupMembersHistTable.tsx`, `NotesTab.tsx`, `FansubEditClient.tsx`, `ReleaseThemeAssetsSection.tsx`, `FansubOpEdSection.tsx`) - `styles`/`const styles` ruft jetzt `mergeCssModules(...)` statt `new Proxy(...)`, Import von `mergeCssModules` aus `@/lib/mergeCssModules` ergänzt

## Decisions Made
- Historische-Rollen-Entwürfe in einen dritten, eigenen Hook (`useFansubAppMemberHistoricalRoleDrafts.ts`) ausgelagert, weil `useFansubAppMembersSection.ts` sonst bei 510 Zeilen gelegen hätte (>450). Nicht explizit im Plan vorgesehen, aber von CLAUDE.md "Übergroße Dateien beim Anfassen aufteilen" (D-05) verlangt — siehe Deviations.
- `useFansubAppMembersSection` Options-Objekt auf `{ hasAccessToken, fansubId }` begrenzt (ohne `claimsLinkOut`), da `claimsLinkOut` nur in der JSX-Render-Komponente konsumiert wird und nie in Hook-State/-Logik einfließt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — CLAUDE.md-Datei-Längen-Regel] Dritten Hook `useFansubAppMemberHistoricalRoleDrafts.ts` extrahiert, da der nach Plan vorgesehene Zwei-Datei-Split (Render + ein Hook) die 450-Zeilen-Grenze im Hook gerissen hätte**
- **Found during:** Task 1 (FansubAppMembersSection.tsx aufteilen)
- **Issue:** Der im Plan beschriebene Split in Render-Komponente + `useFansubAppMembersSection.ts` ergab einen Hook mit 510 Zeilen (>450) — die historische-Rollen-Entwurfslogik (Add/Update/Remove/Save) allein war ~95 Zeilen davon.
- **Fix:** Diese klar abgegrenzte Teilmenge (State `historicalRoleDrafts` + ihre vier Handler inkl. der Speichern-Diff-Logik `saveHistoricalRoleDraftsForEditor`) in einen eigenen Sub-Hook `useFansubAppMemberHistoricalRoleDrafts.ts` (156 Zeilen) ausgelagert. Der Haupt-Hook (419 Zeilen) ruft diesen Sub-Hook und reicht die berechneten Werte `editorHistoricalMember`/`editorHistoricalRoles`/`historicalActions` durch.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/useFansubAppMembersSection.ts`, `frontend/src/app/admin/fansubs/[id]/edit/useFansubAppMemberHistoricalRoleDrafts.ts` (neu)
- **Verification:** `wc -l` beide Dateien ≤450; `npx tsc --noEmit`, `npx eslint`, `npx vitest run` (49 Testdateien / 404 Tests im Verzeichnis) grün
- **Committed in:** `b4dfaf547` (Task 1 Commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — Datei-Längen-Regel)
**Impact on plan:** Notwendig, um D-05 (CLAUDE.md) tatsächlich einzuhalten; kein Scope-Creep, keine Verhaltensänderung, keine zusätzliche Fachlichkeit.

## Issues Encountered
- Bei der ersten Fassung der schlanken Render-Komponente wurde das `roleOptions`-Prop für `FansubAppMemberEditorPanel` versehentlich falsch verdrahtet (Platzhalter statt der tatsächlich benötigten `orderForContext(roleDefinitions, 'fansub_group').filter(...)`-Berechnung). Sofort beim Schreiben korrigiert, bevor committet wurde — kein separater Fix-Commit nötig, da noch vor dem ersten Verifikationslauf behoben.
- Vorbestehender, unabhängiger Testfehlschlag `src/types/__tests__/anime-detail-contract.test.ts` (Anime-Detail-Kontrakt, nichts mit Fansub-Edit oder CSS-Modulen zu tun) besteht unverändert vor und nach diesem Plan (volle `npx vitest run`: 3541 bestanden, 1 fehlgeschlagen, davor und danach identisch) — außerhalb des Scopes dieses Plans, nicht angefasst.

## User Setup Required
None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness
- Die 16 ursprünglich von 174/176 reparierten Dateien sind jetzt vollständig auf den zentralen Helfer umgestellt — 184-05 (die 22 weiteren, bisher kaputten Spread-Merge-Stellen) kann denselben Helfer direkt wiederverwenden.
- `FansubAppMembersSection.tsx` ist jetzt unter 450 Zeilen und folgt demselben Hook+Render-Muster wie `GroupMembersTab.tsx` — guter Referenzpunkt für weitere Datei-Splits in Folgeplänen (z. B. `admin/fansubs/merge/page.tsx`, `admin/fansubs/page.tsx`, `ReleaseVersionNotesTab.tsx`, `admin/episodes/page.tsx`).
- Frontend-Container wurde nach allen Edits einmal neu gestartet (`docker restart team4sv30-frontend`), läuft wieder (`Up`).
- Keine Blocker für die Fortsetzung der Phase 184.

---
*Phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-*
*Completed: 2026-10-15*

## Self-Check: PASSED
- FOUND: frontend/src/app/admin/fansubs/[id]/edit/useFansubAppMembersSection.ts (419 Zeilen)
- FOUND: frontend/src/app/admin/fansubs/[id]/edit/useFansubAppMemberHistoricalRoleDrafts.ts (156 Zeilen)
- FOUND: frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx (210 Zeilen)
- FOUND: commit b4dfaf547 (Task 1)
- FOUND: commit 0735bce06 (Task 2)
- CONFIRMED: 0 occurrences of `new Proxy` in the 16 target .tsx files (excluding tests)
- CONFIRMED: 16 files call `mergeCssModules(`
- CONFIRMED: `npx tsc --noEmit`, `npx eslint .` (0 new errors, same 4 pre-existing elsewhere), `npx vitest run` (3541 passed, 1 pre-existing unrelated failure, unchanged before/after) all green for this plan's scope
