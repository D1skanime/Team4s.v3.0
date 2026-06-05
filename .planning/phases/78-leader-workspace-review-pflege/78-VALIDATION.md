---
phase: 78
slug: leader-workspace-review-pflege
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-05
---

# Phase 78 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (frontend) + go test (backend) |
| **Config file** | `frontend/vitest.config.ts` · backend: `go test` (no config) |
| **Quick run command** | `cd frontend && npx vitest run` · `cd backend && go test ./internal/handlers/...` |
| **Full suite command** | `cd frontend && npx vitest run --reporter=verbose` · `cd backend && go test ./...` |
| **Estimated runtime** | ~60–120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run` + `cd backend && go test ./internal/handlers/...`
- **After every plan wave:** Run `cd frontend && npx vitest run --reporter=verbose` + `cd backend && go test ./...`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Requirement | Verhalten | Test Type | Automated Command | File Exists |
|-------------|-----------|-----------|-------------------|-------------|
| SC1: Offene Claims / Contributions getrennt | ClaimManagementPanel zeigt nur Claims; ContributionsReview zeigt nur Proposals | unit | `npx vitest run src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.test.tsx` | ✅ |
| SC1: Capability-Gating bestätigt/abgelehnt | Aktionen bei fehlender Capability nicht gezeigt | unit | `npx vitest run src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.test.tsx` | ❌ W0 |
| SC2: Historische Member getrennt von App-Mitgliedern | GroupMembersTab zeigt nur hist. Member | unit | `npx vitest run src/app/admin/fansubs/[id]/edit/GroupMembersTab.test.tsx` | ❌ prüfen W0 |
| SC3: Medienprüfung schreibt korrekte Owner-Tabelle | PATCH auf `fansub_group_media` vs. `release_version_media` | unit (backend) | `go test ./backend/internal/handlers/... -run TestFansubMediaReview` | ❌ W0 |
| SC4: Phase-76-Vorschläge im Gruppenkontext | Nur Vorschläge der aktuellen Gruppe sichtbar | unit | `npx vitest run src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.test.tsx` | ❌ W0 |
| SC5: Keine Duplikation in /admin/my-groups | Review-Logik nur im kanonischen Workspace | manuell | Browser-Inspektion :3000 | — |
| D-09: Alle Mutationen auditiert | audit_log-Einträge bei Mutation | unit (backend) | `go test ./backend/internal/handlers/... -run TestContributionReview` | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.test.tsx` — SC1, SC4
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx` — SC3
- [ ] `backend/internal/handlers/fansub_media_review_handler_test.go` — SC3, D-09 Audit
- [ ] Prüfen ob `GroupMembersTab.test.tsx` existiert — SC2

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keine Duplizierung der Review-Logik in `/admin/my-groups/[id]` | SC5 / Lock F | Negativ-Nachweis (Abwesenheit von UI) lässt sich nicht sinnvoll als Unit-Test fassen | Im Dev-Server :3000 `/admin/my-groups/[id]` öffnen und bestätigen, dass keine Claim-/Contribution-/Medien-Review-Aktionen dort erscheinen |
| Capability-Bypass serverseitig blockiert | SC1 / D-08 | E2E-Privilegienprüfung über echten Auth-Kontext | Mit Nicht-Leader-Account Review-Endpoints aufrufen → 403 erwartet |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
