---
phase: 77
plan: "01"
subsystem: frontend-tests
tags: [tdd, wave-0, red-phase, vitest, fansub-workspace]
dependency_graph:
  requires: []
  provides: [ReadinessTab.test.tsx, page.test.tsx-req-f-cases]
  affects: [frontend/src/app/admin/fansubs/[id]/edit/]
tech_stack:
  added: []
  patterns: [vi.hoisted API-Mocks, makeGroup-Hilfsfunktion, describe/it Req-Map-Struktur]
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.test.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
decisions:
  - "Wave-0-Tests nutzen dynamic import() für ReadinessTab um den RED-Fehler korrekt als Suite-Fehler statt Test-Fehler zu erlangen"
  - "mockRouterReplace als modul-scope vi.fn() statt inline in useRouter — ermöglicht reset in afterEach"
  - "Task-2-Tests für sichtbaren Veröffentlichung-Tab laufen ROT (korrekt), Test für unsichtbaren Tab läuft GRÜN (readiness noch nicht in MAIN_TABS)"
metrics:
  duration: "5 min"
  completed_date: "2026-06-05"
  tasks_completed: 2
  files_changed: 2
---

# Phase 77 Plan 01: Wave-0-Testgerüst (ReadinessTab + page.test.tsx Req F) — Zusammenfassung

**Einzeiler:** Sechs rote TDD-Tests für ReadinessTab (Req F×2, I, K, D-04, D-06) plus drei Capability-Gating-Cases in page.test.tsx als Wave-0-RED-Gerüst vor Plan-02-Implementierung.

---

## Erledigte Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | ReadinessTab.test.tsx anlegen (Wave-0, RED-Phase) | ff80d123 | `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.test.tsx` (neu, 244 Zeilen) |
| 2 | page.test.tsx — Capability-Gating-Cases für „readiness"-Tab ergänzen | 36139279 | `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` (+63 Zeilen) |

---

## Ergebnisse

### Task 1 — ReadinessTab.test.tsx (RED)

Die Datei wurde neu angelegt mit:

- **Datei-Kopf** exakt analog zu `page.test.tsx`: `// @vitest-environment jsdom`, Imports aus `react`, `vitest`, `@testing-library/react`
- **vi.mock next/navigation** mit `mockRouterReplace` als modul-scope mock für reset-Kontrolle
- **vi.hoisted API-Mocks**: nur `listGroupMembers`, `listPendingMemberClaims`, `getAdminFansubAnime` (Lock K)
- **vi.mock @/lib/api** mit ApiError-Klasse + ...apiMocks
- **vi.mock ./PublicPreviewPanel** und **./FansubProfileTabs** als leere Stubs
- **afterEach**: cleanup() + vi.clearAllMocks()
- **beforeEach**: Alle drei Mock-Auflösungen auf leer gesetzt
- **makeGroup()**: Hilfsfunktion mit minimalem FansubGroup-Objekt (id:88, slug:'subgroup', ...)
- **6 describe/it-Blöcke** nach Req→Test-Map:
  1. Req F (sichtbar): SectionHeader-Titel `Veröffentlichung & Pflegezustand` auffindbar
  2. Req F (Gegenbeweis): Bei `can_edit_group=false`, `can_edit_notes=false` → kein Tab-Inhalt
  3. Req I (read-only): Kein Button mit label „Speichern", kein `input[type=submit]`
  4. Lock K: Nach render + await → nur die drei erlaubten API-Seams aufgerufen (je genau 1×)
  5. D-04 (Sprungmarke): Klick auf Sprungmarken-Button → `router.replace` mit `?tab=media`
  6. D-06 (informative Zähler): `listPendingMemberClaims` gibt 3 Einträge → Text „Offene Claims: 3" sichtbar, kein `aria-label="Status: fehlt"` für Claims

**Verifikation RED:** `Failed to resolve import "./ReadinessTab"` — Datei existiert nicht → erwartet.

### Task 2 — page.test.tsx Capability-Gating (RED für 2 Cases)

Neuer describe-Block `"Tab 'Veröffentlichung' — Capability-Gating (Req F)"` mit 3 Cases:

1. **sichtbar bei can_edit_group=true** → läuft ROT (readiness noch nicht in MAIN_TABS — wird in Plan 03 grün)
2. **sichtbar bei can_edit_notes=true** → läuft ROT (gleiche Begründung)
3. **unsichtbar bei reiner Mitgliedschaft** → läuft GRÜN (kein Veröffentlichung-Tab existiert → queryBy → null)

**Alle 15 bestehenden Tests bleiben grün** — keine Regression.

---

## Abweichungen vom Plan

### Automatisch behobene Probleme

Keine inhaltlichen Plan-Abweichungen.

**Infrastruktur-Deviation (Rule 3 — Blockierendes Problem):**
Das Worktree-Verzeichnis hatte ein leeres `node_modules/`-Verzeichnis (nur `.vite`-Cache-Ordner). Der Standard-`npx vitest`-Aufruf schlug fehl, da npx die Version aus dem npm-Cache nahm, die `vitest/config` nicht auflösen konnte. Fix: PowerShell-Junction von `frontend/node_modules` auf `C:/Users/admin/Documents/Team4s/frontend/node_modules` erstellt. Tests laufen danach korrekt.

---

## Entscheidungen

| Entscheidung | Begründung |
|-------------|------------|
| `mockRouterReplace` als modul-scope `vi.fn()` statt inline in `useRouter` | Ermöglicht `mockRouterReplace.mockReset()` in `afterEach` für saubere Test-Isolation |
| Dynamic `await import('./ReadinessTab')` in jedem it-Block statt top-level Import | Vitest-Vite-Stack meldet fehlenden Modul als Suite-Fehler beim Collect; dynamic import lässt Tests als Blöcke strukturiert erscheinen (alle 6 describe/it sichtbar) |
| Task-2-Test 3 (unsichtbar bei reiner Mitgliedschaft) ist bereits grün | Da readiness noch nicht in MAIN_TABS ist, gibt `queryByRole('button', { name: 'Veröffentlichung' })` korrekt null zurück — kein falsches Grün, sondern erwarteter Zustand |

---

## Bekannte Stubs

Keine — Wave-0-Plan erstellt nur Testdateien, keine Produktionscode-Stubs.

---

## Threat Flags

Keine neuen sicherheitsrelevanten Oberflächen eingeführt — Plan 01 betrifft ausschließlich Testdateien ohne neue Netzwerk-Endpunkte oder Auth-Pfade.

---

## Self-Check

### Erstellte Dateien

- [x] `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.test.tsx` — VORHANDEN (ff80d123)
- [x] `.planning/phases/77-leader-workspace-public-preview-readiness/77-01-SUMMARY.md` — diese Datei

### Commits

- [x] ff80d123 — test(77-01): add ReadinessTab.test.tsx — Wave-0 RED-Phase
- [x] 36139279 — test(77-01): extend page.test.tsx — Capability-Gating für Veröffentlichung-Tab (Req F)

## Self-Check: PASSED
