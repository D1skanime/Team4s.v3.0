---
phase: 77-leader-workspace-public-preview-readiness
plan: "03"
subsystem: frontend-admin-fansub-workspace
tags: [readiness-tab, page-wiring, capability-gating, tab-integration]
dependency_graph:
  requires: ["77-02"]
  provides: ["readiness-tab-wired-in-workspace"]
  affects: ["frontend/src/app/admin/fansubs/[id]/edit/page.tsx"]
tech_stack:
  added: []
  patterns: ["capability-gated tab", "form-exclusion pattern", "tab-render-branch"]
key_files:
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
decisions:
  - "Formular-Ausschluss für readiness-Tab analog zu mitglieder/rollen/vorschlaege/notes/releases/anime-projekte — kein Speichern-Button im Readiness-Tab"
  - "canUseMainTab('readiness') gibt true bei can_edit_group || can_edit_notes (per D-08)"
  - "Render-Zweig mit null-guard: activeMainTab === 'readiness' && group (FansubGroup | null)"
metrics:
  duration: "~10min"
  completed: "2026-06-05"
  tasks_completed: 1
  tasks_total: 2
  files_modified: 1
---

# Phase 77 Plan 03: Readiness-Tab Verdrahtung in page.tsx — Zusammenfassung

**Einzeiler:** Sechs chirurgische Eingriffe in page.tsx verdrahten den capability-gegateten „Veröffentlichung"-Tab mit ReadinessTab-Komponente aus Wave 1.

## Was wurde gebaut

Plan 03 vervollständigt die Phase-77-Workspace-Integration. Der in Wave 1 (Plan 02) implementierte `ReadinessTab` wird jetzt in `page.tsx` über vier Eingriffspunkte (sechs Edits) eingehängt:

| Eingriff | Zeile | Was |
|---------|-------|-----|
| SectionKey-Typ | 134 | `\| "readiness"` als Union-Member |
| MAIN_TABS | 212 | `{ key: "readiness", label: "Veröffentlichung" }` als letzter Tab |
| canUseMainTab | 250–251 | `case "readiness": return capabilities.can_edit_group \|\| capabilities.can_edit_notes` |
| Formular-Ausschluss | 2407 | `activeMainTab !== "readiness" &&` |
| Tab-Render-Zweig | 3499–3501 | `activeMainTab === "readiness" && group ? <ReadinessTab ...> : null` |
| Import | 103 | `import { ReadinessTab } from "./ReadinessTab"` |

## Aufgaben-Status

| Aufgabe | Name | Commit | Status |
|---------|------|--------|--------|
| 1 | page.tsx — sechs chirurgische Eingriffe | dd19dea5 | Abgeschlossen |
| 2 | Human-Verify: Tab „Veröffentlichung" im Browser | — | Ausstehend (siehe unten) |

## Abweichungen vom Plan

### Worktree-Basis fehlte (Abweichung behoben)

**Gefunden:** Die Worktree-Instanz war auf Commit `d4fd7e1c` (Phase-74-Merge) basiert — 11 Commits hinter dem erwarteten Wave-1-Basiskommit `0020d5c3`. `ReadinessTab.tsx` und `PublicPreviewPanel.tsx` fehlten im Arbeitsverzeichnis.

**Fix:** `git merge --ff-only 0020d5c3` — reines Fast-Forward ohne Konflikte (0 eigene Commits auf dem Branch). Alle Wave-1-Dateien sind jetzt vorhanden.

**Wirkung:** Kein Produktionscode betroffen. Der Merge fügte nur die fehlenden Wave-1-Artefakte hinzu (ReadinessTab.tsx, PublicPreviewPanel.tsx, FansubEdit.module.css-Ergänzungen, Test-Dateien, SUMMARY-Dateien).

### Automatisierte Verifikation nicht verfügbar

**Ursache:** `frontend/node_modules` existiert nicht im Worktree (concurrent installs, Windows-Worktree-Einschränkung).

**Konsequenz:** `npx vitest run` konnte nicht ausgeführt werden. Die sechs Eingriffe sind per statischer Inspektion verifiziert (grep-Treffer für alle Pattern bestätigt). Das vollständige Vitest-Grün muss beim Browser-UAT auf :3000 nachgewiesen werden.

## Ausstehende menschliche Verifikation

**Checkpoint-Typ:** `human-verify`

**Was wurde gebaut:**

Vollständiger readiness-Tab im Workspace `/admin/fansubs/[id]/edit`:
- Tab „Veröffentlichung" in der Tab-Leiste (nur sichtbar bei `can_edit_group` oder `can_edit_notes`)
- Readiness-Checkliste mit 7 bewertbaren Kriterien (success/warning-Badges)
- Informativer Prüf-Hinweis „Gruppengeschichte prüfen" mit info-Badge und Sprungmarke auf Notes-Tab (kein „fehlt"-Urteil)
- Informative Zähler für offene Claims/Vorschläge (info-Badge, keine warning-Farbe)
- Alle Sprungmarken navigieren auf den zuständigen Tab
- PublicPreviewPanel mit Fallback-Hinweis-Badge und FansubProfileTabs/GroupLeaderTimeline

**Verifikationsschritte (verbatim aus Plan):**

1. Dev-Server unter :3000 starten (Hot-Reload)
2. Als Admin oder fansub_lead einloggen
3. `/admin/fansubs/[id]/edit` einer Gruppe aufrufen, die `can_edit_group` oder `can_edit_notes` hat
4. Tab „Veröffentlichung" in der Tab-Leiste sichtbar prüfen
5. Tab anklicken → Readiness-Checkliste erscheint mit korrekten deutschen Labels und korrekten Umlauten
6. Gruppe ohne logo_url → „Logo vorhanden" zeigt Badge „fehlt" (warning, kein danger/rot)
7. Eintrag „Gruppengeschichte prüfen" zeigt Badge in blauer info-Tönung (KEIN warning-Bernstein, KEIN „fehlt"-Label)
8. Sprungmarke „Im Medien-Tab ergänzen →" anklicken → Workspace wechselt zu Tab „Medien" ohne Seitenneuladen
9. Offene Claims-Zähler zeigt Badge variant=info (blaue Tönung, KEIN warning-Bernstein)
10. Preview-Bereich zeigt FansubProfileTabs-Inhalt mit Fallback-Badge „Vorschau im Übergangsmodus"
11. Als Nutzer ohne `can_edit_group` und ohne `can_edit_notes` → Tab „Veröffentlichung" NICHT in Tab-Leiste sichtbar
12. Direkter URL-Aufruf `?tab=readiness` ohne Berechtigung → Workspace lädt anderen Tab (resolveMainTabForAccess-Fallback)

**Resume-Signal:** „approved" eingeben oder gefundene Probleme beschreiben

## Bekannte Stubs

Keine. Alle Stubs liegen in ReadinessTab.tsx (aus Plan 02), nicht in den plan-03-Änderungen.

## Bedrohungsanalyse

Keine neuen Threat-Flags durch Plan-03-Änderungen — alle sicherheitsrelevanten Flächen (URL-Manipulation via `?tab=readiness`, Capability-Prüfung) wurden in der Threat-Modellierung des Plans berücksichtigt und sind durch den neuen `case "readiness"` in `canUseMainTab` + `resolveMainTabForAccess` abgedeckt (T-77-05-EoP: mitigate).

## Self-Check: BESTANDEN

| Prüfpunkt | Ergebnis |
|-----------|----------|
| `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` existiert | GEFUNDEN |
| `.planning/phases/77-leader-workspace-public-preview-readiness/77-03-SUMMARY.md` existiert | GEFUNDEN |
| Commit `dd19dea5` existiert | GEFUNDEN |
| `readiness` kommt 5× in page.tsx vor | 5 Treffer (SectionKey, MAIN_TABS, canUseMainTab, Formular-Ausschluss, Render-Zweig) |
| Import `ReadinessTab` in page.tsx | Zeile 103 ✓ |
