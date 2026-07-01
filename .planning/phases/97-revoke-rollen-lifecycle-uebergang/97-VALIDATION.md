---
phase: 97
slug: revoke-rollen-lifecycle-uebergang
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 97 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Backend)** | go test (Go 1.25, testify) |
| **Framework (Frontend)** | vitest 3 (jsdom) |
| **Config file** | none extra — `backend/go.mod`, `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && go test ./internal/repository/... ./internal/handlers/...` |
| **Full suite command** | `cd backend && go test ./...` + `cd frontend && npx vitest run` |
| **Estimated runtime** | ~20–60 s |

---

## Sampling Rate

- **After every task commit:** Run the quick run command for the touched package.
- **After every plan wave:** Run the full suite command.
- **Before `/gsd:verify-work`:** Full suite green + Docker-Rebuild (`docker compose up -d --build team4sv30-backend team4sv30-frontend`) + Live-Smoke gegen :8092/:3000.
- **Max feedback latency:** ~60 s.

---

## Per-Task Verification Map

*Wird vom Planner/Executor je Plan gefüllt (Task-IDs 97-NN-MM). Kern-Invarianten:*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 97-01-* | 01 | 1 | D-02 | migration | `migrate up` + psql-Check DATE-Spalten vorhanden, Bestandsdaten gemappt | ⬜ pending |
| 97-0x-* | 0x | * | D-05 | unit (Go) | `go test ./internal/repository/...` — Claim-Aktivierung: hist ohne Enddatum → aktive Rolle | ⬜ pending |
| 97-0x-* | 0x | * | D-01/D-03 | unit (Vitest) | `npx vitest run` — Historie-Dialog Rollenauswahl + DATE-Felder | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Go-Repository-Tests für Claim-Aktivierung (D-05) + DATE-Auto-Archiv-Sync (Pitfall D-10)
- [ ] Vitest für erweiterten Historie-Dialog (Rollenauswahl + DATE)
- [ ] Bestehende Infrastruktur (go test, vitest) deckt den Rest.

*Frameworks sind vorhanden — kein Install nötig.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claim-Aktivierung end-to-end im Browser | D-05 | Login/Claim-Flow + Admin-Bestätigung | :3000 als Admin, hist-Mitglied claimen, Rollen ohne Enddatum werden aktiv |
| Historie-Anzeige im Profil | D-08 | UI nachgelagert, nur DB-Korrektheit in dieser Phase | DB-Check + Basisanzeige; polierte UI = Folge-Phase |

---

## Validation Sign-Off

- [ ] Alle Tasks haben `<automated>` verify oder Wave-0-Abhängigkeit
- [ ] Sampling-Kontinuität: keine 3 Tasks in Folge ohne automatisierte Prüfung
- [ ] Wave 0 deckt alle MISSING-Referenzen
- [ ] Keine watch-mode-Flags
- [ ] Feedback-Latenz < 60 s
- [ ] `nyquist_compliant: true` in Frontmatter gesetzt

**Approval:** pending
