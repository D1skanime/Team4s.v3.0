---
phase: 77
plan: "02"
subsystem: frontend
tags: [fansub, admin, readiness, preview, capability-gating, tdd]
dependency_graph:
  requires: ["77-01"]
  provides: ["ReadinessTab.tsx", "PublicPreviewPanel.tsx", "FansubEdit.module.css readiness-Klassen"]
  affects: ["frontend/src/app/admin/fansubs/[id]/edit/"]
tech_stack:
  patterns:
    - "TDD GREEN-Phase: Wave-0-Tests aus Plan 01 aufgelöst"
    - "Capability-Gating via Prop-Extraktion (can_edit_group/can_edit_notes auf group)"
    - "Promise.all für drei API-Seams (Lock K eingehalten)"
    - "D-06: informative Zähler mit Badge variant=info statt warning/success"
    - "D-04: Sprungmarken via router.replace(?tab=...) ohne neue Routing-Infrastruktur"
    - "Übergangsmodus-Fallback in PublicPreviewPanel mit TODO(Phase 73)-Kommentar"
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/PublicPreviewPanel.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
decisions:
  - "ReadinessGroupProps als minimale Interface statt FansubGroup-Intersection — Test-Fixtures nutzen string-Status/string-group_type, strikte Union-Typen würden Casts erzwingen"
  - "HistFansubGroupMember und AdminFansubAnimeEntry als interne State-Typen in ReadinessTab — nur Zähler relevant, Preview-Casts als unknown im Übergangsmodus"
  - "Capability-Prüfung nach Hooks (React-Regel: Hooks müssen vor bedingtem Return stehen)"
metrics:
  duration: "11 Minuten"
  completed: "2026-06-05"
  tasks: 2
  files_created: 2
  files_modified: 1
---

# Phase 77 Plan 02: ReadinessTab + PublicPreviewPanel implementieren — Summary

**Ergebnis in einem Satz:** ReadinessTab mit 7 bewertbaren und 3 informativen Readiness-Kriterien, capability-gated und read-only, löst alle 6 Wave-0-Tests (Plan 01 RED-Phase) auf.

## Was gebaut wurde

### Task 1: ReadinessTab.tsx (312 Zeilen)

Neue Komponente `ReadinessTab` für `/admin/fansubs/[id]/edit?tab=readiness`:

- **Capability-Gating:** Gibt `null` zurück wenn weder `can_edit_group` noch `can_edit_notes` gesetzt ist
- **API-Aggregation:** `Promise.all([listGroupMembers, listPendingMemberClaims, getAdminFansubAnime])` (Lock K: keine neuen Endpunkte)
- **7 bewertbare Kriterien** mit `Badge variant="success"/"warning"` und Sprungmarken-Buttons
- **3 informative Einträge** (Gruppengeschichte, Claims, Vorschläge) mit `Badge variant="info"` — kein satisfied/unsatisfied-Urteil (D-06)
- **Sprungmarken** via `router.replace(?tab=...)` ohne neue Routing-Infrastruktur (D-04)
- **PublicPreviewPanel**-Einbettung am Ende des Tabs
- Nur `@/components/ui`-Primitive — kein native `button`/`input`/`select` (C1)
- Alle deutschen Strings mit korrekten Umlauten (Sprachqualität)

### Task 2: PublicPreviewPanel.tsx (54 Zeilen) + FansubEdit.module.css

**PublicPreviewPanel:**
- Read-only Wrapper um `FansubProfileTabs` + `GroupLeaderTimeline` (Fallback-Modus, D-01)
- `Badge variant="info"` mit Übergangsmodus-Hinweis (D-02)
- `EmptyState` wenn keine öffentlichen Inhalte vorhanden
- `TODO(Phase 73)`-Kommentar als dokumentierter Upgrade-Pfad
- `aria-label="Öffentliche Vorschau (schreibgeschützt)"` für Screenreader

**FansubEdit.module.css Erweiterung:**
- `.readinessTabRoot` — `display: grid; gap: var(--space-6)`
- `.readinessList` — `display: grid; gap: var(--space-3)`
- `.readinessItem` — `display: flex; align-items: center; gap: var(--space-2)`
- `.readinessItemLabel` — `flex: 1; font-size: var(--text-body); color: var(--text-primary)`
- `.readinessSectionDivider` — `margin-block: var(--space-4); border-top: 1px solid color-mix(...)`
- Keine Hardcode-Pixelwerte — ausschließlich CSS-Custom-Properties

## Testergebnisse

| Testdatei | Ergebnis | Anzahl |
|-----------|----------|--------|
| ReadinessTab.test.tsx | GRÜN | 6/6 |
| page.test.tsx (bestehende 15 Tests) | GRÜN | 15/15 |
| page.test.tsx (neue 3 Req-F-Tests) | 1 GRÜN / 2 ROT (Design) | — |

Die 2 roten Tests in `page.test.tsx` sind **by design**: Sie prüfen ob der `Veröffentlichung`-Tab in `MAIN_TABS` erscheint — das kommt erst in Plan 03. Die Tests sind korrekt als "läuft ROT solange kein readiness-Eintrag in MAIN_TABS" dokumentiert.

**TypeScript-Compile:** Keine neuen Fehler. Die 3 pre-existing Fehler (`ContributionInbox.test.tsx`, `ContributionSummary.test.tsx`, `api.test.ts`) sind aus Phase 76 und unberührt.

## Commits

| Task | Commit | Beschreibung |
|------|--------|--------------|
| Task 1 | `36a79cf9` | feat(77-02): implement ReadinessTab.tsx |
| Task 2 | `fc3435e7` | feat(77-02): implement PublicPreviewPanel.tsx + readiness CSS-Klassen |
| Plan 01 cherry-pick | `0779f7de`, `b8661144`, `a4644eec` | test(77-01): Wave-0-Tests (cherry-pick aus main) |

## Deviationen vom Plan

### [Rule 1 - Bug] React Hook-Reihenfolge: Capability-Check nach Hooks verschoben

- **Gefunden bei:** Task 1 — erste Implementierung
- **Problem:** Early return `if (!canEdit) return null` vor Hook-Aufrufen verletzt React-Regeln
- **Fix:** Alle `useState`/`useCallback`/`useEffect`-Aufrufe VOR dem bedingten `return null` platziert
- **Dateien:** `ReadinessTab.tsx`
- **Commit:** Teil von `36a79cf9`

### [Rule 1 - Bug] ReadinessGroupProps — Test-Fixtures-Kompatibilität

- **Gefunden bei:** TypeScript-Compile nach Task 1
- **Problem:** `makeGroup()` in Tests gibt `status: string` und `group_type: string` zurück; `FansubGroup` verlangt `FansubStatus` und `FansubGroupType`
- **Fix:** `ReadinessGroupProps` als minimale Interface mit Index-Signatur statt direkter FansubGroup-Intersection; nur die tatsächlich genutzten Felder strikt typisiert
- **Dateien:** `ReadinessTab.tsx` (Zeile 33–43)
- **Commit:** Teil von `36a79cf9`

### [Rule 1 - Bug] EmptyState Props — title/description statt heading/body

- **Gefunden bei:** TypeScript-Compile nach Task 1
- **Problem:** `EmptyState`-Komponente verwendet `title`/`description`, nicht `heading`/`body`
- **Fix:** Props angepasst auf `title`/`description`
- **Dateien:** `ReadinessTab.tsx`, `PublicPreviewPanel.tsx`
- **Commit:** `36a79cf9`, `fc3435e7`

### [Rule 1 - Bug] PublicPreviewPanel Props-Typen — HistFansubGroupMember/AdminFansubAnimeEntry

- **Gefunden bei:** TypeScript-Compile
- **Problem:** `listGroupMembers` liefert `HistFansubGroupMember[]`, `getAdminFansubAnime` liefert `AdminFansubAnimeEntry[]`; `PublicPreviewPanel` nutzte `FansubMember[]`/`AnimeListItem[]`
- **Fix:** `PublicPreviewPanel` akzeptiert jetzt Admin-DTOs direkt; interner Cast `as unknown as FansubMember[]` für `FansubProfileTabs`-Kompatibilität im Übergangsmodus
- **Dateien:** `PublicPreviewPanel.tsx`, `ReadinessTab.tsx`
- **Commit:** `fc3435e7`

### Vorgelagerter Cherry-Pick: Plan-01-Commits

- **Situation:** Worktree-Branch war bei `d4fd7e1c` (vor dem Plan-01-Merge auf main `58c4d0e6`)
- **Aktion:** Plan-01-Commits (`ff80d123`, `36139279`, `3aa1c78a`) per `git cherry-pick` eingespielt
- **Begründung:** Die Wave-0-Testdateien aus Plan 01 müssen im Worktree vorhanden sein damit Plan 02 (GREEN-Phase) ausgeführt werden kann

## Known Stubs

Keine blockierenden Stubs. `TODO(Phase 73)` in `PublicPreviewPanel.tsx` ist ein dokumentierter, nicht-blockierender Upgrade-Pfad (D-01) — die Vorschau funktioniert im Übergangsmodus vollständig.

## Threat Flags

Keine neuen Threat-Surfaces. Alle Daten in `PublicPreviewPanel` stammen aus dem bereits im page-State vorhandenen `group`-Objekt (Assumption A1, T-77-03-ID: accept). Tab-Zugang über `?tab=readiness` wird in Plan 03 per `canUseMainTab("readiness")` gegateten (T-77-02-EoP: pending Plan 03).

## Self-Check: PASSED

- [x] `ReadinessTab.tsx` existiert: `/frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx`
- [x] `PublicPreviewPanel.tsx` existiert: `/frontend/src/app/admin/fansubs/[id]/edit/PublicPreviewPanel.tsx`
- [x] `FansubEdit.module.css` enthält `.readinessTabRoot`
- [x] Commit `36a79cf9` existiert (Task 1)
- [x] Commit `fc3435e7` existiert (Task 2)
- [x] ReadinessTab.test.tsx: 6/6 Tests GRÜN
- [x] TypeScript-Compile: keine neuen Fehler
- [x] ReadinessTab.tsx: 312 Zeilen (≤ 450)
- [x] PublicPreviewPanel.tsx: 54 Zeilen (≤ 200)
