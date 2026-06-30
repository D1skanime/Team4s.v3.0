---
phase: 94
slug: rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-30
---

# Phase 94 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (jsdom) + @testing-library/react (Frontend); Go `testing` + Struct-Stubs (Backend) |
| **Config file** | `frontend/vitest.config.ts`; Go `*_test.go` colocated |
| **Quick run command** | `cd frontend && npx vitest run src/app/admin/role-capabilities` / `cd backend && go test ./internal/handlers/ -run Capability` |
| **Full suite command** | `cd frontend && npx vitest run` / `cd backend && go test ./...` |
| **Estimated runtime** | ~30–90 s je Suite |

---

## Sampling Rate

- **After every task commit:** Run das zugehörige Quick-Run-Kommando (FE bzw. BE).
- **After every plan wave:** Run `cd backend && go test ./...` + `cd frontend && npx vitest run`.
- **Before `/gsd:verify-work`:** Beide Full-Suites grün + `git diff --check` (AC 11) + Lint (`npx eslint` soweit verfügbar).
- **Max feedback latency:** ~90 s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 94-WAVE0 | — | 0 | AC 7 / D-05 | — | Grant an historischer Rolle → 422 `role_not_assignable` | unit (Go) | `go test ./internal/handlers/ -run AssignableGuard` | ❌ W0 | ⬜ pending |
| 94-WAVE0 | — | 0 | AC 7 / D-05 | — | Revoke an historischer Rolle → 422 `role_not_assignable` | unit (Go) | `go test ./internal/handlers/ -run AssignableGuard` | ❌ W0 | ⬜ pending |
| 94-WAVE0 | — | 0 | AC 6 / D-04 | — | `assignable` korrekt (App-Rolle=true, hist=false) in Matrix-Response | unit (Go) | `go test ./internal/repository/ -run CapabilityMatrix` | ❌ W0 | ⬜ pending |
| 94-WAVE0 | — | 0 | AC 1/3 / D-07 | — | group_history-Liste = nur Hist-Rollen (founder/leader/co_leader/project_manager), nicht FANSUB_GROUP_ROLE_OPTIONS | unit (Go) | `go test ./internal/repository/ -run RoleDefinitionsContext` | ❌ W0 | ⬜ pending |
| 94-XX | — | ≥1 | AC 6/7 / D-13 | — | nicht-assignable Rolle disabled + 422-Inline-Fehler | unit (FE) | `npx vitest run src/app/admin/role-capabilities` | ⚠️ erweitern | ⬜ pending |
| 94-XX | — | ≥1 | AC 4/5 / D-10 | — | aktiver Dialog ohne historische Rollen, Label „Aktive Rechte" | unit (FE) | `npx vitest run src/app/admin/fansubs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> Konkrete Task-IDs trägt der Planner beim Erstellen der PLAN.md ein; die Requirement-/Behavior-Zeilen sind verbindlich.

---

## Wave 0 Requirements

- [ ] Go-Test für Assignable-Guard (Grant + Revoke → 422 `role_not_assignable`) — Setup-Muster aus `backend/internal/handlers/admin_capability_handler_test.go`
- [ ] Go-Test für `assignable`-/Kontext-Anreicherung in der Capability-Matrix
- [ ] Go-Test für die `group_history`-Read-Repo-Methode (kuratierte Whitelist)
- [ ] FE-Test-Erweiterung `RoleCapabilityClient.test.tsx`: Fixture um `assignable` ergänzen, Disabled-/422-Verhalten prüfen
- [ ] FE-Test für historischen Rollen-Dialog (group_history-Quelle) und aktiven Dialog (Label „Aktive Rechte", keine historischen Rollen) — ggf. neue Dateien nach Komponenten-Split

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile 390 px: keine horizontale Hauptbedienung, Touch ≥ 44 px, Labels nicht abgeschnitten, Speichern/Abbrechen erreichbar | AC 8 / D-12, D-14 | Visuelles/Layout-Verhalten am Dev-Server :3000 | Browser auf 390 px verengen: `/admin/role-capabilities` (Rolle wählen → Accordion-Kategorien → Switch) und Mitglieder-Dialoge in `/admin/fansubs/[id]/edit` prüfen |
| Historischer Dialog bietet Gründer/in + Co-Leitung an; aktiver Dialog bietet sie NICHT | AC 1/2/3 | End-to-end UI-Datenfluss | Live :3000: Hist-Rollen-Dialog öffnen → Liste prüfen; aktiven Mitglieder-Dialog öffnen → Liste prüfen |

*Backend-Routen erscheinen erst nach `docker compose up -d --build team4sv30-backend`; Live-Tests gegen :3000.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
