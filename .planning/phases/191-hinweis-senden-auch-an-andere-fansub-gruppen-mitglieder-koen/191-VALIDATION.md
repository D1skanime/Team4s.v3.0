---
phase: 191
slug: hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-23
---

# Phase 191 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `go test` (Backend) / `vitest` (Frontend) |
| **Config file** | `backend/go.mod` / `frontend/vitest.config.ts` |
| **Quick run command** | `go test ./internal/...` / `npm run test` |
| **Full suite command** | `go test ./...` / `npm run test` |
| **Estimated runtime** | ~60 Sekunden |

---

## Sampling Rate

- **After every task commit:** Run the quick run command for the layer touched (Backend oder Frontend)
- **After every plan wave:** Run the full suite command for both Backend und Frontend
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 Sekunden

---

## Per-Task Verification Map

*Wird vom Planner pro Plan/Task befüllt (Task-ID, Wave, Requirement/D-NN, Test-Typ, Kommando).*

---

## Wave 0 Requirements

*Wird vom Planner befüllt, falls neue Test-Fixtures/Infrastruktur nötig sind (z. B. Fake-Repository
für den neuen Hinweis-Handler, Redis-Test-Doppel für die Tageslimit-Middleware).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live-UAT mit echten Konten (Leader-Entscheid, Plattform-Admin-Entscheid, Rollenfeld) | D-01/D-03/D-07 | Erfordert echte Rollenzuweisung + visuelle Prüfung der Formulare laut UI-SPEC | Siehe 191-HUMAN-UAT.md (vom Planner/Executor zu erstellen) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
