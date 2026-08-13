---
phase: 78-leader-workspace-review-pflege
plan: "01"
subsystem: admin-fansub-workspace
tags: [tdd, red-tests, wave-0, contributions, media-review, audit]
dependency_graph:
  requires: []
  provides:
    - RED-Testverträge für 78-02 (ContributionsReviewSection)
    - RED-Testverträge für 78-03 (GroupMediaReviewSection + fansub_media_review_handler)
  affects:
    - frontend/src/app/admin/fansubs/[id]/edit/
    - backend/internal/handlers/
tech_stack:
  added: []
  patterns:
    - Vitest 3 / @testing-library/react für Frontend-RED-Tests
    - Go-Test-Stubs (Interface-Implementierungen) für Backend-RED-Tests
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx
    - backend/internal/handlers/fansub_media_review_handler_test.go
  modified: []
decisions:
  - "Wave-0-Testgerüst analog contribution_review_handler_test.go / ClaimManagementPanel.test.tsx"
  - "Backend-Stubs: FansubMediaReviewRepository-Interface mit UpdateFansubMediaReview + GetFansubMediaOwner"
  - "Frontend-Mock: listFansubGroupMedia als benannte Lese-Quelle (78-03), patchFansubMediaReview als Mutation"
metrics:
  duration_minutes: 25
  completed_date: "2026-06-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
---

# Phase 78 Plan 01: Wave-0-RED-Testgerüst Summary

**One-liner:** Drei fehlschlagende TDD-RED-Testdateien für Contribution-Review-Gating (SC1/SC4/D-07/D-08) und Medienprüfungs-Audit-Pflicht (D-09/SC3) als Verhaltensverträge für 78-02/03/04.

---

## Completed Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | Frontend Wave-0-RED-Tests (ContributionsReviewSection + GroupMediaReviewSection) | 1db71040 | ContributionsReviewSection.test.tsx, GroupMediaReviewSection.test.tsx |
| 2 | Backend Wave-0-RED-Test (fansub_media_review_handler) | 1db71040 | fansub_media_review_handler_test.go |

---

## What Was Built

Drei neue Testdateien, die als TDD-RED-Verträge für die Implementierungspläne 78-02/03/04 dienen:

### ContributionsReviewSection.test.tsx
RED-Tests für die noch nicht existierende `ContributionsReviewSection`-Komponente:
- **D-08 Gating:** `null`-Render ohne `can_manage_members`; rendert Sektion mit Capability
- **SC1/Lock H:** Lädt ausschließlich über `listGroupProposals`, nie eine Claim-API; zeigt `member_display_name` + `anime_title`; `confirmProposal` wird mit `(fansubId, proposalId)` aufgerufen
- **D-07 offen-Filter:** Toggle „Nur offene anzeigen" standardmäßig aktiv; erledigte Einträge ausgeblendet bis Toggle auf „Alle anzeigen" umgestellt
- **SC4/D-04:** `listGroupProposals` mit korrekter `fansubId`; Reload bei fansubId-Wechsel

### GroupMediaReviewSection.test.tsx
RED-Tests für die noch nicht existierende `GroupMediaReviewSection`-Komponente:
- **D-08 Gating:** `null`-Render ohne `can_edit_group`
- **D-05/SC3 Selektoren:** `Sichtbarkeit`- und `Prüfstatus`-Labels pro Medieneintrag; `listFansubGroupMedia` ist die benannte Lese-Quelle (78-03)
- **SC3 Mutation:** „Änderungen speichern" ruft `patchFansubMediaReview(fansubId, mediaId, { visibility, review_status })` auf
- **D-05 Owner-Flag:** Badge „Owner-Zuordnung prüfen" bei `owner_consistent=false`; kein Owner-Edit-Feld (Phase 79)

### fansub_media_review_handler_test.go
RED-Tests gegen den noch nicht existierenden `FansubMediaReviewHandler`:
- **D-09/T-78-02 Deny-Audit:** HTTP 403 + Deny-Audit-Eintrag (EventType endet auf `.denied`)
- **D-09/T-78-02 Erfolgs-Audit:** HTTP 200 + Audit mit `fansub_group_media.visibility_updated`, `ActorAppUserID`, `ScopeType=group`, `TargetType=fansub_group_media`
- **V5/SC3 Enum-Validierung:** Ungültiger `visibility`/`review_status` → HTTP 400, keine Mutation
- **T-78-03 Tamper-Mitigation:** Owner-Mismatch (Medium einer fremden Gruppe) → kein Update

---

## TDD Gate Compliance

- RED-Commits vorhanden: ✅ (`test(78-01): ...` auf `1db71040`)
- GREEN-Commits: nicht erwartet (Wave-0 — Produktionscode kommt in 78-02/03/04)
- Fehlschlag-Beweis:
  - Frontend: `Failed to resolve import "./ContributionsReviewSection"` / `"./GroupMediaReviewSection"` (Modul nicht gefunden)
  - Backend: `undefined: FansubMediaReviewHandler`, `undefined: NewFansubMediaReviewHandler`, `undefined: repository.FansubMediaReviewPatch`

---

## Deviations from Plan

Keine — Plan exakt ausgeführt. Alle drei Testdateien entsprechen den Anforderungen der must_haves und key_links.

---

## Known Stubs

Keine — dies ist ein reines Testgerüst. Keine Produktionskomponenten erstellt.

---

## Self-Check

### Erstellte Dateien existieren:

- `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.test.tsx` — vorhanden (137 Zeilen)
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx` — vorhanden (155 Zeilen)
- `backend/internal/handlers/fansub_media_review_handler_test.go` — vorhanden (240 Zeilen)

### Commits existieren:

- `1db71040` — test(78-01): Wave-0-RED-Testgerüst für Phase 78

## Self-Check: PASSED
