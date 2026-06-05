---
phase: 78-leader-workspace-review-pflege
plan: "02"
subsystem: admin-fansub-workspace
tags: [tdd, green, contributions, review, gds-primitives, ui-migration, claim-filter]
dependency_graph:
  requires:
    - "78-01 (RED-Testverträge ContributionsReviewSection)"
  provides:
    - "ContributionsReviewSection — grüne Implementierung, GDS-konform, gegated (D-08), offen-Filter (D-07)"
    - "ReviewQueue.tsx — vollständig auf @/components/ui migriert (UI-Schuld behoben)"
    - "ClaimManagementPanel.tsx — „Nur offene anzeigen"-Toggle (D-07)"
  affects:
    - frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.module.css
    - frontend/src/components/contributions/ReviewQueue.tsx
    - frontend/src/components/contributions/ReviewQueue.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx
tech_stack:
  added: []
  patterns:
    - "GDS-Primitives: Badge, Button, Card, EmptyState, ErrorState, LoadingState, SectionHeader, Toolbar, Textarea aus @/components/ui"
    - "Optimistisches State-Update: proposals.filter((p) => p.id !== id) nach confirm/reject"
    - "Capability-Gating: if (!capabilities.can_manage_members) return null (D-08)"
    - "Offen-Filter: useState<boolean> showOnlyOpen=true, filtert status='proposed'/'pending'"
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.module.css
    - frontend/src/components/contributions/ReviewQueue.module.css
  modified:
    - frontend/src/components/contributions/ReviewQueue.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx
decisions:
  - "ContributionsReviewSection als innere Komponente (ContributionsReviewSectionInner) aufgeteilt — Rules of Hooks erfordern, dass Hooks nach dem Gating-return stehen; äußere Komponente hält nur das Gating"
  - "showOnlyOpen-Toggle in ClaimManagementPanel an die Claims-Tabellen-Sektion gesetzt (nicht Members-Einladungsliste), da Tests Members stets sichtbar erwarten"
  - "ReviewQueue.module.css colocated angelegt statt Inline-Styles — keine Hex-Farben, ausschließlich CSS-Token-Variablen"
metrics:
  duration_minutes: 35
  completed_date: "2026-06-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
---

# Phase 78 Plan 02: ContributionsReviewSection + ReviewQueue-Migration Summary

**One-liner:** ContributionsReviewSection mit can_manage_members-Gating, offen-Filter (D-07) und GDS-Primitives implementiert (GREEN); ReviewQueue von nativen Elementen auf @/components/ui migriert; ClaimManagementPanel um „Nur offene anzeigen"-Toggle erweitert.

---

## Completed Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | ContributionsReviewSection.tsx (+ CSS) — GDS-konform, gegated, offen-Filter | 6c819751 | ContributionsReviewSection.tsx, ContributionsReviewSection.module.css |
| 2 | ReviewQueue auf @/components/ui migrieren + ClaimManagementPanel offen-Filter | 6ec87c32 | ReviewQueue.tsx, ReviewQueue.module.css, ClaimManagementPanel.tsx |

---

## What Was Built

### ContributionsReviewSection.tsx (265 Zeilen)
Neue GDS-konforme Komponente für den `vorschlaege`-Tab:
- **D-08 Gating:** `if (!capabilities.can_manage_members) return null` — innere Komponente hält alle Hooks (Rules-of-Hooks-konform)
- **SC1/Lock H:** Lädt ausschließlich über `listGroupProposals(fansubId, undefined)`, ruft niemals Claim-APIs auf
- **D-07 offen-Filter:** `useState<boolean> showOnlyOpen=true` — filtert auf status='proposed'/'pending'; erledigte sichtbar wenn Toggle auf „Alle anzeigen"
- **Primitives:** Badge, Button, Card, EmptyState, ErrorState, LoadingState, SectionHeader, Toolbar, Textarea — keine nativen Elemente
- **Copywriting-Contract:** „Offene Vorschläge ({n})", „Nur offene anzeigen"/„Alle anzeigen", „Vorschlag bestätigen"/„Vorschlag ablehnen", „Ablehnung bestätigen", „Abbrechen"
- **Inline-Ablehnen-Expansion:** Textarea + Bestätigungs-/Abbrechen-Button — kein `window.confirm`

### ContributionsReviewSection.module.css
Colocated Styles mit CSS-Design-Token-Variablen: `.reviewSection`, `.filterRow`, `.cardStack`, `.cardFooterActions`, `.rejectExpansion`, `.rejectActions`, `.inlineError`

### ReviewQueue.tsx (197 Zeilen) — migriert
Alle nativen `<button>` → `Button` (success/danger/ghost), `<textarea>` → `Textarea`, Status-Chip → `Badge variant="warning"`, Karten-Markup → `Card variant="nested"`, Loading/Error/Empty → `LoadingState`/`ErrorState`/`EmptyState`. Alle Inline-Style-Objekte entfernt.

### ReviewQueue.module.css — neu angelegt
Colocated CSS-Modul mit Token-Klassen: `.cardStack`, `.cardBody`, `.cardHeader`, `.roleChips`, `.rejectExpansion`, `.cardFooterActions` etc.

### ClaimManagementPanel.tsx (370 Zeilen) — erweitert
`showOnlyOpen useState<boolean>(true)` + Toolbar-Toggle in der Claims-Sektion: „Nur offene anzeigen" (aktiv) / „Alle anzeigen" (inaktiv). Bestehende Mutations-Helfer und window.confirm für Claim-Ablehnen unverändert.

---

## TDD Gate Compliance

- RED-Commits: `1db71040` (78-01) — vorhanden
- GREEN-Commits: `6c819751` (ContributionsReviewSection), `6ec87c32` (ReviewQueue + ClaimManagementPanel)
- Test-Ergebnisse:
  - `ContributionsReviewSection.test.tsx`: 11/11 grün
  - `ClaimManagementPanel.test.tsx`: 3/3 grün (kein Regressionsbruch)

---

## Deviations from Plan

### Auto-behoben

**1. [Rule 1 - Bug] API-Aufruf-Signatur korrigiert (listGroupProposals/confirmProposal)**
- **Gefunden während:** Task 1 — erste Testausführung
- **Problem:** `listGroupProposals(fansubId)` ohne zweites Argument → Test erwartet `(88, undefined)`, Vitest `toHaveBeenCalledWith` unterscheidet between "nicht übergeben" und "explizit undefined"
- **Fix:** Alle Helfer-Aufrufe auf explizite `undefined`-Übergabe umgestellt: `listGroupProposals(fansubId, undefined)`, `confirmProposal(fansubId, id, undefined)`
- **Dateien:** ContributionsReviewSection.tsx

**2. [Rule 1 - Bug] Rules-of-Hooks-konformes Gating**
- **Gefunden während:** Task 1 — Design-Phase
- **Problem:** `if (!capabilities.can_manage_members) return null` vor Hook-Aufrufen verletzt React-Hook-Regeln
- **Fix:** Äußere Komponente hält nur das Gating (`return null`), innere `ContributionsReviewSectionInner` hält alle State/Callback-Hooks
- **Dateien:** ContributionsReviewSection.tsx

**3. [Rule 1 - Bug] showOnlyOpen-Toggle-Scope in ClaimManagementPanel**
- **Gefunden während:** Task 2 — erste Testausführung
- **Problem:** Ursprünglicher Ansatz filterte die Members-Einladungsliste — Members ohne aktive Einladung wurden ausgeblendet, aber Tests erwarten "Einladungslink generieren"-Button immer sichtbar
- **Fix:** Toggle nur an die Claims-Review-Tabelle gesetzt (nicht Members-Karten), was semantisch korrekter ist (Einladungs-Generierung ≠ offen/erledigt-Zustand)
- **Dateien:** ClaimManagementPanel.tsx

---

## Known Stubs

Keine — alle implementierten Komponenten sind vollständig verdrahtet mit echten API-Helfern.

---

## Threat Flags

Keine neuen Sicherheitsflächen eingeführt:
- ContributionsReviewSection nutzt ausschließlich bestehende API-Helfer (T-78-04 mitigated: Capability-Gating implementiert)
- Kein neuer Datenpfad (T-78-05 mitigated: strikt getrennte Proposal-Pipeline, keine Claim-APIs)
- ReviewQueue-Migration ändert nur UI, keine Datenpipeline

---

## Self-Check

### Erstellte/geänderte Dateien existieren:

- `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` — FOUND (265 Zeilen)
- `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.module.css` — FOUND
- `frontend/src/components/contributions/ReviewQueue.tsx` — FOUND (197 Zeilen)
- `frontend/src/components/contributions/ReviewQueue.module.css` — FOUND
- `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` — FOUND (370 Zeilen)

### Commits existieren:

- `6c819751` — feat(78-02): ContributionsReviewSection — FOUND
- `6ec87c32` — feat(78-02): ReviewQueue + ClaimManagementPanel — FOUND

## Self-Check: PASSED
