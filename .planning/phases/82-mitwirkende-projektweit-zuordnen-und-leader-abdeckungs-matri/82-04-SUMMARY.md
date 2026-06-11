---
phase: 82-mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri
plan: "04"
subsystem: frontend
tags:
  - frontend
  - components
  - ui-primitives
  - migration
  - cockpit
  - coverage-matrix
  - rich-text
dependency_graph:
  requires:
    - 82-03
  provides:
    - ProjectCockpitBadges (Status-Badge-Reihe ohne episodeCount)
    - AnimeProjectNoteWorkspace (Inline-Einblick-Block mit Zustandsmaschine)
    - AnimeProjectNotesSection (migriert: kein natives <select>/<button> mehr)
    - AnimeProjectNoteForm (extrahiert: Formular-Subkomponente, < 450 Zeilen)
    - CoverageMatrix (Abdeckungs-Matrix, katalog-getrieben)
  affects:
    - frontend-Plan 05 (Verdrahtung in page.tsx)
tech_stack:
  added: []
  patterns:
    - Zustandsmaschine idle/loading/present/missing/editing/error für lazy load
    - katalog-getriebene Table-Spalten via roles-Prop
    - File-Split-Pattern für 450-Zeilen-Limit: AnimeProjectNoteForm.tsx extrahiert
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/ProjectCockpitBadges.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteForm.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/CoverageMatrix.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx
decisions:
  - AnimeProjectNoteForm.tsx aus AnimeProjectNotesSection extrahiert (450-Zeilen-Pflicht nach Migration)
  - CoverageMatrix nutzt TableEmptyState-Ersatz via EmptyState-Primitiv wenn rows.length===0
  - AnimeProjectNoteWorkspace-Zustandsmaschine: noteState==='idle' bleibt bis expanded===true (D-12 konform)
metrics:
  duration: "~5min"
  completed: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 1
---

# Phase 82 Plan 04: Cockpit-Komponenten — ProjectCockpitBadges, AnimeProjectNoteWorkspace, CoverageMatrix + Altfall-Migration

Status-Badge-Reihe (ohne episodeCount), Inline-Einblick-Block mit 6-Zustands-Maschine, katalog-getriebene Abdeckungs-Matrix und vollständige Migration von AnimeProjectNotesSection auf @/components/ui-Primitives.

## Tasks

### Task 1 — ProjectCockpitBadges + AnimeProjectNotesSection-Migration (commit: 544d01ef)

- `ProjectCockpitBadges.tsx`: neu, `<Badge variant="danger">Mitwirkende fehlen</Badge>` wenn contributionCount===0; `<Badge variant="neutral">Mitwirkende ({N})</Badge>` wenn N>0; `<Badge variant="success">Einblick vorhanden</Badge>` / `<Badge variant="warning">Einblick fehlt</Badge>` je nach note-Prop; kein episodeCount-Prop/Badge (D-12)
- `AnimeProjectNotesSection.tsx`: native `<button>` Z.115/121 → `<Button variant="ghost">`/`<Button variant="danger">`; native `<select>` Z.216–238 → `<FormField>` + `<Select>`; Klapptrigger → `<Button variant="ghost">` mit aria-expanded
- `AnimeProjectNoteForm.tsx`: neu extrahiert aus AnimeProjectNotesSection (450-Zeilen-Pflicht nach Migration)

### Task 2 — AnimeProjectNoteWorkspace + CoverageMatrix (commit: f1b9c14e)

- `AnimeProjectNoteWorkspace.tsx`: neu, Zustandsmaschine `NoteLoadState = 'idle' | 'loading' | 'present' | 'missing' | 'editing' | 'error'`; lazy load via `useEffect` auf `expanded`-Prop (D-12); cancelled-Flag verhindert setState nach Unmount (T-82-04-02); RichTextRenderer im present-Zustand; RichTextEditor im editing-Zustand; EmptyState für missing; ErrorState mit Retry für error
- `CoverageMatrix.tsx`: neu, globales Table-Primitiv (`Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`); Spalten katalog-getrieben aus `roles: RoleDefinition[]`-Prop (D-07); kein Rollen-Hardcode; `onCellClick`-Prop für Inline-Zuweisung; EmptyState bei `rows.length===0`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] AnimeProjectNoteForm.tsx extrahiert**
- **Found during:** Task 1 — nach Migration von native → UI-Primitives stieg AnimeProjectNotesSection.tsx auf 520 Zeilen (über 450-Zeilen-Limit gemäß CLAUDE.md)
- **Issue:** Die Migration der nativen Elemente + bestehende Accordion-Logik überschritt das Datei-Limit
- **Fix:** `AnimeProjectNoteForm` + zugehörige Typen/Helpers in neue Datei `AnimeProjectNoteForm.tsx` extrahiert; exportierte Helper (`ensureRichTextValue`, `noteToForm`, `noteVisibilityLabel`, `noteStatusLabel`, Typ `AnimeEntry`, Typ `NoteFormState`) werden von `AnimeProjectNotesSection.tsx` und `AnimeProjectNoteWorkspace.tsx` importiert
- **Files modified:** `AnimeProjectNotesSection.tsx` (344 Zeilen), `AnimeProjectNoteForm.tsx` (197 Zeilen neu)
- **Commit:** 544d01ef

## Known Stubs

Keine. Alle vier Komponenten sind vollständig implementiert und bereit für Plan 05.

## Threat Flags

Keine neuen Sicherheitsflächen über den `<threat_model>` hinaus.

- T-82-04-02 (AnimeProjectNoteWorkspace cancelled-Flag): implementiert — `cancelled = true` im useEffect-Cleanup verhindert setState nach Unmount.
- T-82-04-04 (CoverageMatrix onCellClick): implementiert — `onCellClick` öffnet nur die Zuweisung; eigentliche Mutation geht durch Backend-Guard.

## Self-Check: PASSED

- [x] `ProjectCockpitBadges.tsx` — vorhanden (32 Zeilen)
- [x] `AnimeProjectNoteWorkspace.tsx` — vorhanden (193 Zeilen)
- [x] `AnimeProjectNoteForm.tsx` — vorhanden (197 Zeilen)
- [x] `CoverageMatrix.tsx` — vorhanden (87 Zeilen)
- [x] `AnimeProjectNotesSection.tsx` — 344 Zeilen (≤ 450)
- [x] Commit 544d01ef — Task 1 (ProjectCockpitBadges + Section-Migration)
- [x] Commit f1b9c14e — Task 2 (AnimeProjectNoteWorkspace + CoverageMatrix)
- [x] `npm run typecheck` — grün (0 Fehler)
- [x] grep `<select\|<button\|<textarea` AnimeProjectNotesSection.tsx → 0 Treffer
- [x] grep `episode` ProjectCockpitBadges.tsx → 0 Treffer
- [x] grep `translator\|timer\|typesetter` CoverageMatrix.tsx → 0 Treffer
- [x] grep `from '@/components/ui'` ProjectCockpitBadges.tsx → 1 Treffer
- [x] Alle Dateien ≤ 450 Zeilen
