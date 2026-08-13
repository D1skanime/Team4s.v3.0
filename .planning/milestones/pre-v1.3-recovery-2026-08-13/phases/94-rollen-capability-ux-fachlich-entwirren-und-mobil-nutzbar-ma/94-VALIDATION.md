---
phase: 94
slug: rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma
status: approved
nyquist_compliant: true
wave_0_complete: true
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
| 94-01-01 | 94-01 | 1 | AC 7 / D-05 | T-94-01 | Grant an historischer Rolle → 422 `role_not_assignable` | unit (Go) | `go test ./internal/handlers/ -run AssignableGuard` | ❌ W0 | ⬜ pending |
| 94-01-01 | 94-01 | 1 | AC 7 / D-05 | T-94-01 | Revoke an historischer Rolle → 422 `role_not_assignable` | unit (Go) | `go test ./internal/handlers/ -run AssignableGuard` | ❌ W0 | ⬜ pending |
| 94-01-01 | 94-01 | 1 | AC 6 / D-04 | T-94-01 | `assignable` korrekt (App-Rolle=true, hist=false) in Matrix-Response | unit (Go) | `go test ./internal/handlers/ -run Capability` | ❌ W0 | ⬜ pending |
| 94-01-02 | 94-01 | 1 | AC 1/3 / D-07 | — | group_history-Liste = nur Hist-Rollen (founder/leader/co_leader/project_manager), nicht FANSUB_GROUP_ROLE_OPTIONS | unit (Go) | `go test ./internal/repository/ -run RoleDefinitionsContext` | ❌ W0 | ⬜ pending |
| 94-02-* | 94-02 | 2 | AC 6 / D-04 | T-94-01 | Matrix-Response liefert `assignable`-Feld (Handler-Anreicherung) | unit (Go) | `go test ./internal/handlers/ -run Capability` | ❌ W0 | ⬜ pending |
| 94-03-* | 94-03 | 2 | AC 1/3 / D-07 | T-94-04 | group_history-Read-Endpunkt + Auth-Gate (denied → 403) | unit (Go) | `cd backend && go build ./... && go vet ./internal/handlers/` | ❌ W0 | ⬜ pending |
| 94-04-* | 94-04 | 2 | AC 6/7 / D-13 | — | RoleCapabilityClient-Fixture um `assignable` erweitert, Disabled-/422-Verhalten | unit (FE) | `npx vitest run src/app/admin/role-capabilities` | ⚠️ erweitern | ⬜ pending |
| 94-06-* | 94-06 | 3 | AC 6/7/8 / D-11..D-13 | T-94-05 | Master-Detail: nicht-assignable Rolle disabled + Badges + Mobile | unit (FE) | `npx vitest run -t RoleCapability` | ❌ W0 | ⬜ pending |
| 94-08-* | 94-08 | 3 | AC 1/2/4/5 / D-07,D-10 | T-94-05 | Hist-Dialog group_history-Quelle; aktiver Dialog ohne hist Rollen, Label „Aktive Rechte" | unit (FE) | `npx vitest run -t GroupHistRoleDialog` / `-t FansubAppMemberEditorPanel` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> Task-IDs verweisen auf die finalen PLAN.md-Tasks; `*` = vom Plan vergebene Task-Nummer. Requirement-/Behavior-Zeilen sind verbindlich.

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 94-01 deckt Guard, Matrix-`assignable`, group_history-Read ab)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-30
