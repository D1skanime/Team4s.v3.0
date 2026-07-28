---
phase: 114
slug: oeffentliche-fansub-gruppen-uebersicht
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-28
---

# Phase 114 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (frontend) + `go test` (backend, if `projects_count` added) |
| **Config file** | `frontend/vitest.config.ts` · backend `*_test.go` colocated |
| **Quick run command** | `cd frontend && npx vitest run src/app/fansubs` |
| **Full suite command** | `cd frontend && npx vitest run` (+ `cd backend && go test ./...` when backend touched) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run src/app/fansubs`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _(planner fills per task)_ | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/app/fansubs/page.test.tsx` — SSR render + default-sort + empty/error stubs (analog `members/ranking/page.test.tsx`)
- [ ] Backend `fansub_repository_test.go` extension — only if `projects_count` metric is added (mirror existing count-parity test)

*Analog infrastructure exists (`members/ranking/page.test.tsx`); no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Nav-Eintrag „Fansub-Gruppen" sichtbar (anonym UND eingeloggt) und verlinkt auf `/fansubs` | AppShell-Navigation | Beide Nav-Arrays visuell prüfen; Live-Dev :3000 | Anonym + eingeloggt öffnen, Eintrag klicken, landet auf `/fansubs` |
| Rundes Logo + Initialen-Fallback korrekt gerendert | UI-SPEC D-05 | Visuelle Prüfung | Gruppe ohne `logo_url` zeigt Initialen-Platzhalter |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
