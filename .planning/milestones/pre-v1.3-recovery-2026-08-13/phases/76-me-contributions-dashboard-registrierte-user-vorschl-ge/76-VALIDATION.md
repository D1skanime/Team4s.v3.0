---
phase: 76
slug: me-contributions-dashboard-registrierte-user-vorschl-ge
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-05
---

# Phase 76 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `76-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (Frontend) + `go test` (Backend) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npm test` |
| **Full suite command** | `cd frontend && npm test && cd ../backend && go test ./...` |
| **Estimated runtime** | ~60–120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm test` (Frontend-Unit-Tests)
- **After every plan wave:** Run `cd frontend && npm test && cd ../backend && go test ./...`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Req ID | Verhalten | Test Type | Automated Command | File Exists | Status |
|--------|-----------|-----------|-------------------|-------------|--------|
| E / D-11 | useMemo-Summary-Aggregat produziert korrekte Zähler nach Status/Gruppe/Anime/Rolle | unit | `cd frontend && npm test -- ContributionSummary` | ❌ W0 | ⬜ pending |
| E / D-12 | Chip-Klick filtert Liste; Toggle hebt Filter auf | unit | `cd frontend && npm test -- ContributionFilters` | ❌ W0 | ⬜ pending |
| E / D-03a | Inbox-Unterscheidung zugeordnet vs. eigener Vorschlag via `is_own_proposal` | unit | `cd frontend && npm test -- ContributionInbox` | ❌ W0 | ⬜ pending |
| H / D-09 | Reject-Endpoint ohne `member_reason` gibt 422 zurück | unit (Go) | `cd backend && go test ./internal/handlers/... -run TestRejectContributionRequiresReason` | ❌ W0 | ⬜ pending |
| K / D-09 | `rejectAnimeContributionWithReason` sendet body mit `member_reason` | unit (Vitest) | `cd frontend && npm test -- api.test` | ❌ W0 — erstellt in Plan 01 Task 3 (`frontend/src/lib/api.test.ts`) | ⬜ pending |
| Runde 6 / D-07 | Suggestion-Submit schreibt `audit_logs`-Eintrag | integration (Go) | `cd backend && go test ./internal/handlers/... -run TestSuggestionAudit` | ❌ W0 | ⬜ pending |
| CLAUDE.md | `VisibilityDropdown` nutzt kein natives `<select>` nach Migration | ESLint | `cd frontend && npx eslint src/components/contributions/VisibilityDropdown.tsx` | ⚠️ existiert (migrieren) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/components/contributions/ContributionInbox.test.tsx` — Inbox-Filter-Logik (D-03) — erstellt in Plan 01 Task 3
- [ ] `frontend/src/components/contributions/ContributionSummary.test.tsx` — useMemo-Aggregat + Chip-Toggle (D-11/D-12) — erstellt in Plan 01 Task 3
- [ ] `backend/internal/handlers/contributions_me_handler_test.go` — Reject-Reason-Pflichtfeld-Test (D-09) — erstellt/erweitert in Plan 01 Task 3
- [ ] `backend/internal/handlers/suggestions_me_handler_test.go` — Suggestion-Submit-/Audit-Tests (D-06/D-07) — erstellt in Plan 01 Task 3
- [ ] `frontend/src/lib/api.test.ts` — rejectAnimeContributionWithReason Body-Assertion (K/D-09) — erstellt/erweitert in Plan 01 Task 3

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Unified „Vorschlagen/Melden"-Modal (Typ → Ziel → Feld) Bedienfluss | Runde 6 / D-05 | Interaktiver Multi-Step-Flow + visuelle Konsistenz | Live-Test gegen Dev-Server :3000: Modal öffnen, je Typ Ziel wählen, absenden, Statuswechsel prüfen |
| „Medien vorschlagen" Upload mit Owner-Kontext + Review-Status | Runde 6 / Decision 8 | Datei-Upload + Sichtbarkeits-/Review-Gating | Live-Test: Medium hochladen, prüfen `review_status=in_review`, `visibility=internal`, nicht öffentlich |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (inkl. api.test.ts für K/D-09)
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending (awaiting execution)
