---
phase: 81
slug: release-version-mehrfach-fansubgruppen-ohne-kombigruppe
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-09
---

# Phase 81 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: `go test` (testify); Frontend: `vitest` (jsdom per-file); Migration: `backend/internal/migrations/*_test.go` |
| **Config file** | `frontend/vitest.config.ts`; Go uses standard `go test` |
| **Quick run command** | Backend: `go test ./backend/internal/repository/... ./backend/internal/migrations/...`; Frontend: `npx vitest run <changed test>` |
| **Full suite command** | Backend: `go test ./backend/...`; Frontend: `cd frontend && npx vitest run` |
| **Estimated runtime** | ~60–120 seconds (backend), ~30 seconds (frontend changed scope) |

---

## Sampling Rate

- **After every task commit:** Run the relevant quick command (backend repo tests or the changed vitest file)
- **After every plan wave:** Run the full backend suite (`go test ./backend/...`) and changed-scope frontend tests
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 81-WW-NN | TBD | 1 | P81-SC2 | — | Kein Code-Pfad erzeugt mehr `group_type='collaboration'`-Gruppen | unit | `go test ./backend/internal/repository/...` | ❌ W0 | ⬜ pending |
| 81-WW-NN | TBD | 2 | P81-SC7 | T-81-MIG | Migration mappt Kombigruppen auf Member-IDs; löscht nur ohne RESTRICT-Referenzen | migration | `go test ./backend/internal/migrations/...` | ❌ W0 | ⬜ pending |
| 81-WW-NN | TBD | 3 | P81-SC1, P81-SC6 | T-81-VAL | 2 Chips ⇒ 2 Junction-Zeilen, keine neue fansub_groups-Zeile; ungültige ID abgelehnt | unit | `go test ./backend/internal/repository/...` | ❌ W0 | ⬜ pending |
| 81-WW-NN | TBD | 4 | P81-SC3 | — | Read aggregiert N Gruppen pro Version (kein LIMIT 1) | unit | `go test ./backend/internal/repository/...` | ❌ W0 | ⬜ pending |
| 81-WW-NN | TBD | 5 | P81-SC4, P81-SC5 | — | Release-Ansicht rendert mehrere Chips; Gruppen-Profil zeigt Kooperation | component | `cd frontend && npx vitest run` | ❌ W0 | ⬜ pending |

*Task-IDs/Plan-Zuordnung werden vom Planner finalisiert. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Backend-Repository-Tests (RED) für Schreibpfad: N Junction-Zeilen statt Kombigruppe, ID-Validierung (P81-SC1/SC6).
- [ ] Backend-Read-Test (RED): Aggregation mehrerer Gruppen pro Release-Version (P81-SC3).
- [ ] Migrations-Test (RED) in `backend/internal/migrations/`: Kombigruppen→Member-Mapping + Deaktivierungs-/Lösch-Guard (P81-SC7).
- [ ] Frontend-Component-Tests (RED, jsdom): Mehrfach-Chip-Anzeige der Release-Version + Kooperations-Hinweis auf Gruppen-Profil (P81-SC4/SC5).
- [ ] Anpassung/Entfernung bestehender Tests, die das ALTE Kombigruppen-Verhalten festschreiben (`episode_import_repository_test.go` Collaboration-Cases, `fansub_integrity_test.go`, `anime_contributions_public_versions_repository_test.go`).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live-Round-Trip: zwei Gruppen per Chip im Editor zuweisen → DB-Prüfung 2 Zeilen, keine Kombigruppe; Anzeige auf Release- und beiden Gruppenseiten | P81-SC1, P81-SC4, P81-SC5 | UI + echte DB + Keycloak-Login nötig (Dev-Server :3000) | `/me`-Login, `/admin/episode-versions/:id/edit` → 2 Gruppen-Chips → speichern; SQL `SELECT * FROM release_version_groups WHERE release_version_id=…`; Gruppen-Profilseiten beider Gruppen prüfen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
