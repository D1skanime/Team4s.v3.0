---
phase: 40-text-und-notizsystem-fuer-fansub-plattform
plan: "08"
subsystem: frontend-ui
tags: [react, typescript, fansub-notes, notes-tab, markdown-editor, admin]

dependency_graph:
  requires:
    - phase: 40-07
      provides: FansubGroupNote, MemberGroupStory TypeScript types and API functions (listFansubGroupNotes, createFansubGroupNote, updateFansubGroupNote, deleteFansubGroupNote, listMemberGroupStories, createMemberGroupStory, updateMemberGroupStory, deleteMemberGroupStory)
  provides:
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx (Notizen-Tab-Komponente)
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx (GroupNoteEditor, StoryEditor, MarkdownToolbarInline Sub-Komponenten)
    - page.tsx erweitert um 'notes' Tab-Eintrag und Render-Block
  affects:
    - 40-09 (MemberGroupStories UI — jetzt Teil von NotesTab)
    - 40-10 (ReleaseVersionNotes UI — separater Tab)

tech-stack:
  added: []
  patterns:
    - Helper-Datei-Split für 450-Zeilen-Limit (NotesTab.helpers.tsx)
    - Lokaler React-State mit useState/useEffect für Note-Verwaltung
    - Inline Markdown-Toolbar-Komponente (MarkdownToolbarInline) wiederverwendbar
    - Draft-Pattern für optimistische UI-Updates (saving/deleting/error pro Note)

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx

key-decisions:
  - "NotesTab.helpers.tsx als Split-Datei für CLAUDE.md 450-Zeilen-Limit"
  - "GroupNoteDraft und StoryDraft als lokale Draft-Typen mit saving/deleting/error-Flags für UI-Zustand"
  - "MarkdownToolbarInline als eigene Komponente in helpers um Wiederverwendung zu ermöglichen"
  - "notes-Tab ist außerhalb des globalen Fansub-Speichern-Formulars wie der releases-Tab"

requirements-completed: []

metrics:
  duration: 18min
  completed: "2026-05-11"
  tasks_completed: 2
  files_changed: 3
---

# Phase 40 Plan 08: Frontend — Fansub-Editor: Notizen-Tab

**Notizen-Tab im Fansub-Gruppen-Editor mit fansub_group_notes- und member_group_stories-Verwaltung: Markdown-Editor, Inline-Toolbar, einzelnes Speichern pro Notiz.**

## Performance

- **Duration:** 18 min
- **Completed:** 2026-05-11
- **Tasks:** 2/2
- **Files changed:** 3

## What Was Built

### Task 1: NotesTab.tsx + NotesTab.helpers.tsx

Zwei Dateien für den Notizen-Tab (wegen CLAUDE.md 450-Zeilen-Limit gesplittet):

**NotesTab.helpers.tsx (268 Zeilen):**
- `GroupNoteDraft` und `StoryDraft` Typen mit saving/deleting/error UI-State
- `emptyGroupNoteDraft()` und `emptyStoryDraft()` Factory-Funktionen
- `MarkdownToolbarInline` — inline Markdown-Toolbar mit H1/H2/Bold/Italic/Liste/Link
- `GroupNoteEditor` — vollständiges Formular für Gruppennotizen (Titel, Inhalt, Sichtbarkeit, Status, Reihenfolge, Speichern/Löschen)
- `StoryEditor` — Formular für Mitgliedergeschichten (Mitglieds-ID, Rollen-ID, Titel, Inhalt, Sichtbarkeit, Status, Reihenfolge)

**NotesTab.tsx (307 Zeilen):**
- `NotesTab` mit `{ fansubId: number }` Props
- Lädt `fansub_group_notes` via `listFansubGroupNotes` und `member_group_stories` via `listMemberGroupStories` beim Mount
- Zwei Abschnitte: "Gruppennotizen" und "Mitgliedergeschichten"
- CRUD: Erstellen (POST), Bearbeiten (PATCH), Löschen (DELETE) — jeweils mit Auth-Token
- Fehler-Handling pro Note ("Fehler beim Speichern: ...")
- Laden-Zustand: "Wird geladen..."
- "Noch keine Gruppennotizen vorhanden." / "Noch keine Mitgliedergeschichten vorhanden." bei leeren Listen

### Task 2: Tab-Integration in page.tsx

- `SectionKey` Union-Typ erweitert um `'notes'`
- `MAIN_TABS` Array erweitert um `{ key: 'notes', label: 'Notizen' }`
- Form-Wrapper-Bedingung erweitert: `activeMainTab !== 'releases' && activeMainTab !== 'notes'`
- Render-Block hinzugefügt: `{activeMainTab === 'notes' ? <NotesTab fansubId={fansubID} /> : null}`
- Import von `NotesTab` hinzugefügt

## Sprachqualität

Alle UI-Strings mit korrekten deutschen Umlauten:
- "Gruppennotizen", "Mitgliedergeschichten", "Öffentlich", "Intern"
- "Entwurf", "Veröffentlicht", "Archiviert", "Gelöscht"
- "Speichern", "Löschen", "Neue Gruppennotiz hinzufügen", "Neue Geschichte hinzufügen"
- "Wird geladen...", "Fehler beim Speichern:", "Fehler beim Löschen:"
- "Mitglieds-ID", "Rollen-ID", "Reihenfolge", "Inhalt", "Titel", "Sichtbarkeit", "Status"

## Verification

- `tsc --noEmit` auf worktree: nur infrastruktur-bedingte Fehler (fehlende node_modules in worktree), keine Logik-Fehler
- `tsc --noEmit` auf Hauptprojekt: keine neuen Fehler in NotesTab-Dateien
- Alle Dateien unter 450-Zeilen-Limit (NotesTab.tsx: 307, NotesTab.helpers.tsx: 268)

## Deviations from Plan

**[Deviation - Scope Extension] NotesTab.helpers.tsx hinzugefügt:**
- Gefunden: NotesTab.tsx würde bei einer Datei 693 Zeilen haben — CLAUDE.md-Limit verletzt
- Fix: Sub-Komponenten (GroupNoteEditor, StoryEditor, MarkdownToolbarInline, Typen) in NotesTab.helpers.tsx ausgelagert
- Dateien: NotesTab.helpers.tsx (neu), NotesTab.tsx (reduziert auf 307 Zeilen)
- Commit: 7ae90daa

## Known Stubs

Keine — alle Formulare sind voll funktional und mit API-Funktionen aus Plan 40-07 verdrahtet.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1+2 (NotesTab + Tab-Integration) | 7ae90daa | NotesTab.tsx, NotesTab.helpers.tsx, page.tsx |

## Self-Check: PASSED
