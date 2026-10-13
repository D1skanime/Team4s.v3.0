---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
plan: 06
subsystem: ui
tags: [typescript, react, vitest, release-editor, primitives, admin-gating]

# Dependency graph
requires:
  - phase: 181-03
    provides: "frontend/src/components/releaseEditor/ (ReleaseVersionMetadataFields, EpisodeClassificationSection, JellyfinEnrichmentNotice, episodeVersionEditorUtils) -- this plan's 3 tabs render/consume them unchanged"
  - phase: 181-05
    provides: "useReleaseEditorData() -- the single data/action hook all 3 tab components in this plan read from"
provides:
  - "ReleaseEditorMetadataTab.tsx -- Basisdaten tab: shared metadata form (all roles) + 4 admin-only sub-blocks (classification/storage/group-assignment/jellyfin-notice), gated exactly on isPlatformAdmin, no greyed-out hint for non-admins (D-02)"
  - "ReleaseEditorFilesTab.tsx -- admin-exclusive Dateien tab: Jellyfin folder scan, file selection, advanced-mode media override, fully primitive-conformant"
  - "ReleaseEditorChangelogTab.tsx -- admin-exclusive Aenderungsverlauf placeholder tab, zero props"
affects: [181-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tab-content component takes the full `ReturnType<typeof useReleaseEditorData>` as a single `editor` prop plus role booleans as separate explicit props (isPlatformAdmin, canEditMetadata) rather than reading role state internally -- keeps the component a pure function of its inputs, easy to test both role branches deterministically"

key-files:
  created:
    - frontend/src/app/releases/[versionId]/edit/ReleaseEditorMetadataTab.tsx
    - frontend/src/app/releases/[versionId]/edit/ReleaseEditorMetadataTab.test.tsx
    - frontend/src/app/releases/[versionId]/edit/ReleaseEditorFilesTab.tsx
    - frontend/src/app/releases/[versionId]/edit/ReleaseEditorFilesTab.test.tsx
    - frontend/src/app/releases/[versionId]/edit/ReleaseEditorChangelogTab.tsx
  modified: []

key-decisions:
  - "ReleaseEditorMetadataTab adds an explicit `if (!editor.contextData) return null` guard not spelled out verbatim in the plan's JSX sketch -- ReleaseVersionMetadataFields/EpisodeClassificationSection both require a non-null EpisodeVersionEditorContext prop, while useReleaseEditorData()'s return type keeps contextData nullable during isLoading. The old admin page avoided this by only ever rendering the equivalent JSX inside an outer `version && editor.contextData ?` ternary at the page level; this plan's component has no such wrapper, so the guard is added here instead. Plan 07's page orchestrator is expected to only mount this tab once contextData has loaded, so this is a type-safety guard, not an expected runtime path."
  - "Test fixtures type `groupResults` as `FansubGroup[]` (not `FansubGroupSummary[]`) to match the real hook's state type -- the plan's interfaces block described the return shape only by field name, not by exact per-field type."

patterns-established: []

requirements-completed: [D-01, D-02]

# Metrics
duration: ~15min
completed: 2026-10-13
---

# Phase 181 Plan 06: Release-Editor Tab-Inhalte (Metadata/Dateien/Changelog) Summary

**Die 3 Tab-Inhalte, die NICHT bereits zwischen Admin-Editor und Workspace geteilt waren, liegen jetzt primitive-konform unter `app/releases/[versionId]/edit/` -- Basisdaten mit 4 strikt isPlatformAdmin-gated Unterbloecken, ein admin-exklusiver Dateien-Tab und ein admin-exklusiver Aenderungsverlauf-Platzhalter.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-13T16:26:24Z (Session-Start)
- **Completed:** 2026-10-13T16:35:00Z
- **Tasks:** 3/3
- **Files modified:** 5 (5 neu, 0 geändert)

## Accomplishments
- `ReleaseEditorMetadataTab.tsx`: geteiltes `ReleaseVersionMetadataFields`-Formular fuer alle Rollen (`Basisdaten speichern`, `!isPlatformAdmin && canEditMetadata`-Formel 1:1 aus dem alten Admin-Editor uebernommen), plus 4 admin-exklusive Zusatzbloecke (Episoden-Klassifikation, Speicherort, Fansub-Gruppen-Suche/-Zuweisung, Jellyfin-Anreicherungs-Hinweis) -- fuer Nicht-Admins existieren diese Bloecke gar nicht im DOM (D-02, kein ausgegrauter Hinweis).
- `ReleaseEditorFilesTab.tsx`: Jellyfin-Ordner-Scan, Stream-Link-Feld, Datei-Auswahlliste und Advanced-Mode Media-Provider-Override -- Verhalten unveraendert aus dem alten Admin-Editor-Dateien-Tab portiert, saemtliche native `<input>`/`<button>` auf `@/components/ui`-Primitive (`Button`, `FormField`, `Input`) umgestellt; das `<details>`/`<summary>`-Disclosure-Element bleibt bewusst nativ (kein Primitiv-Typ aus der Verbotsliste).
- `ReleaseEditorChangelogTab.tsx`: Zero-Prop-Platzhalter mit korrigiertem deutschen Label „Änderungsverlauf" (statt „Changelog") und korrekten Umlauten im Fliesstext, keine Testdatei (reine Platzhalter-Komponente).
- Alle 3 Komponenten: 0 Treffer fuer `<input|<select|<button` per Grep (Pflicht-Constraint erfuellt).
- Volle Regression nach Abschluss: `npx tsc --noEmit` 0 Fehler, volle Suite 394/395 Testdateien gruen (1 bewusst uebersprungen, unveraendert vorbestehend) mit 3618 Tests, `npx eslint` auf allen 5 neuen Dateien 0 Befunde.

## Task Commits

Jede Aufgabe folgte dem RED→GREEN-TDD-Zyklus (ausser Task 3, Platzhalter ohne Testdatei):

1. **Task 1: ReleaseEditorMetadataTab.tsx** - `e3d76db5` (feat, inkl. Test) → `b6454f53` (fix, Typecheck-Korrekturen)
2. **Task 2: ReleaseEditorFilesTab.tsx** - `5f9d62fe` (feat, inkl. Test)
3. **Task 3: ReleaseEditorChangelogTab.tsx** - `5e172b96` (feat, kein Test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `frontend/src/app/releases/[versionId]/edit/ReleaseEditorMetadataTab.tsx` - Basisdaten-Tab-Inhalt, geteiltes Formular + 4 admin-exklusive Unterbloecke
- `frontend/src/app/releases/[versionId]/edit/ReleaseEditorMetadataTab.test.tsx` - 3 Testfaelle (Nicht-Admin-Sicht, Admin-Sicht mit allen Bloecken, handleSave-Formel fuer beide Rollen)
- `frontend/src/app/releases/[versionId]/edit/ReleaseEditorFilesTab.tsx` - Dateien-Tab-Inhalt, primitive-konform
- `frontend/src/app/releases/[versionId]/edit/ReleaseEditorFilesTab.test.tsx` - 3 Testfaelle (Ordner-Scan, Datei-Auswahl, Advanced-Mode-Toggle)
- `frontend/src/app/releases/[versionId]/edit/ReleaseEditorChangelogTab.tsx` - Platzhalter-Tab, kein Test

## Decisions Made
- `ReleaseEditorMetadataTab` ergaenzt einen expliziten Null-Guard fuer `editor.contextData`, den die Plan-Skizze nicht woertlich auffuehrte -- siehe `key-decisions` oben fuer die vollstaendige Begruendung.
- Testfixtures typisieren `groupResults` als `FansubGroup[]` statt `FansubGroupSummary[]`, passend zum tatsaechlichen Hook-Rueckgabetyp.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `ReleaseEditorMetadataTab.tsx` Typecheck-Fehler: nullable `contextData` gegen non-null-Props**
- **Found during:** Task 1 (Verify-Lauf, `npx tsc --noEmit`)
- **Issue:** `ReleaseVersionMetadataFields` und `EpisodeClassificationSection` erwarten beide einen non-null `EpisodeVersionEditorContext`-Prop; die Plan-Skizze uebergab `editor.contextData` direkt ohne Guard, aber `useReleaseEditorData()`s Rueckgabetyp haelt `contextData` waehrend `isLoading` nullable. Der alte Admin-Editor vermied dies durch einen umgebenden `version && editor.contextData ?`-Ternary auf Seitenebene -- diese isolierte Tab-Komponente hat keinen solchen Wrapper.
- **Fix:** Fruehes `if (!editor.contextData) return null` am Komponentenanfang ergaenzt, dokumentiert als reiner Typsicherheits-Guard (Plan 07 mountet diesen Tab ohnehin erst nach geladenem Context).
- **Files modified:** `frontend/src/app/releases/[versionId]/edit/ReleaseEditorMetadataTab.tsx`
- **Commit:** `b6454f53`

**2. [Rule 1 - Bug] Testfixture-Typfehler: `groupResults` als falscher Typ**
- **Found during:** Task 1 (Verify-Lauf, `npx tsc --noEmit`)
- **Issue:** Testdatei typisierte `groupResults: [] as FansubGroupSummary[]`, der echte Hook fuehrt diesen State aber als `FansubGroup[]` (mehr Pflichtfelder).
- **Fix:** Import und Typisierung auf `FansubGroup[]` korrigiert.
- **Files modified:** `frontend/src/app/releases/[versionId]/edit/ReleaseEditorMetadataTab.test.tsx`
- **Commit:** `b6454f53`

---

**Total deviations:** 2 auto-fixed (beide Rule 1, Typecheck-Fehler aus unterspezifizierter Plan-Skizze, kein Scope-Wechsel)
**Impact on plan:** Rein additive Typsicherheits-Korrekturen; alle 3 im Plan beschriebenen Verhaltensweisen (Formular-Sichtbarkeit je Rolle, handleSave-Formel, Dateien-Tab-Interaktionen) sind unveraendert erfuellt.

## Issues Encountered

Keine, die den Fortschritt blockiert haetten -- beide oben genannten Funde wurden inline behoben, bevor sie den finalen Verify-Lauf beeintraechtigen konnten.

## User Setup Required

None.

## Next Phase Readiness
- Plan 07 (Seiten-Komposition) kann `ReleaseEditorMetadataTab`, `ReleaseEditorFilesTab` und `ReleaseEditorChangelogTab` direkt importieren und gemaess der UI-SPEC-Sichtbarkeits-Matrix (`metadata`: `isPlatformAdmin || canEditMetadata`; `files`/`changelog`: ausschliesslich `isPlatformAdmin`) in die Tab-Liste einhaengen.
- Alle 3 Komponenten erwarten ein bereits geladenes `editor.contextData` (nicht `null`) -- Plan 07 muss den Ladezustand vor dem Mounten dieser Tabs selbst abfangen (analog zum alten Admin-Editor-Muster `version && editor.contextData ?`).
- Keine Blocker fuer nachfolgende Plaene dieser Phase.

---
*Phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-*
*Completed: 2026-10-13*

## Self-Check: PASSED

Alle 5 neuen Dateien unter `frontend/src/app/releases/[versionId]/edit/` auf der Festplatte
gefunden; alle 4 Task-Commits (`e3d76db5`, `5f9d62fe`, `b6454f53`, `5e172b96`) im Git-Log gefunden.
