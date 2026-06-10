---
phase: 260610-i2j
plan: "01"
status: complete
subsystem: frontend-admin
tags:
  - fansub
  - members
  - historical-members
  - ui
dependency_graph:
  requires:
    - Quick 260610-fhn domain decision
    - Quick 260610-f7n global table migration
  provides:
    - Collaboration tab combines app members and historical members
  affects:
    - frontend/src/app/admin/fansubs/[id]/edit
tech_stack:
  added: []
  patterns:
    - global table primitives for persisted admin lists
    - claim-only linkage for historical app profiles
key_files:
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
decisions:
  - Der separate Hist.-Mitglieder-Tab wird aus der Main-Tab-Leiste entfernt; Legacy-URLs mit tab=mitglieder landen auf collaboration.
  - Historische Mitglieder werden in GroupMembersTab tabellarisch gezeigt und behalten "historical" als internen Default statt eines Admin-Status-Workflows.
  - App-Profil-Verknüpfungen historischer Einträge werden nur angezeigt; aktive Zuordnung bleibt Claim-/Bestätigungsflow.
metrics:
  duration: "< 1h"
  completed: "2026-06-10"
---

# Quick 260610-i2j: Fansub-Mitglieder und historische Mitglieder zusammenführen

Der Collaboration-Tab enthält jetzt die App-/Fansub-Mitglieder, Einladungen und die historischen Mitglieder als zweite Tabelle auf derselben Seite.
Der frühere Hist.-Mitglieder-Main-Tab ist aus der Navigation entfernt; direkte alte Links werden weiterhin auf Collaboration geroutet.

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Historische Mitglieder in Collaboration einbetten | done | this commit |
| 2 | Navigation und Readiness auf Collaboration routen | done | this commit |
| 3 | Tests aktualisieren | done | this commit |

## Verification

- `npm run typecheck` passed.
- `npx vitest run "src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx" "src/app/admin/fansubs/[id]/edit/page.test.tsx" "src/app/admin/fansubs/[id]/edit/ReadinessTab.test.tsx"` passed: 29 tests.
- `npx vitest run src/app/admin/fansubs` passed: 73 tests.
- `npx eslint` on the changed frontend files passed with 0 errors; existing page.tsx warnings for legacy native controls remain.
- `git diff --check` passed; only CRLF normalization warnings were reported.

## Notes

Repo-wide `npm run lint` still fails on unrelated existing files under `src/app/dev`, `src/app/me/profile`, and frontend `tmp-*` scripts. ReadinessTab tests also still emit pre-existing React `act(...)` warnings. Neither issue was introduced by the membership merge.
