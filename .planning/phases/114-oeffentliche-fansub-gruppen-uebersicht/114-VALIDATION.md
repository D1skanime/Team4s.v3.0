---
phase: 114
slug: oeffentliche-fansub-gruppen-uebersicht
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-28
---

# Phase 114 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (frontend) + `go test` (backend) |
| **Config file** | `frontend/vitest.config.ts` · backend `*_test.go` colocated |
| **Quick run command** | `cd frontend && npx vitest run src/app/fansubs` |
| **Full suite command** | `cd frontend && npx vitest run` (+ `cd backend && go test ./...`) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` verify command
- **After every plan wave:** Run `cd frontend && npx vitest run` (+ `cd backend && go test ./...` for Wave 1)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 114-01-01 | 01 | 1 | D-03 / D-02 | — | N/A (contract-only field add) | build | `cd backend && go build ./... && cd ../frontend && npm run typecheck` | ✅ | ⬜ pending |
| 114-01-02 | 01 | 1 | D-03 | T-114-01-01 | Parameterized `ANY($1)` aggregate, no client-input concat | unit (tdd) | `cd backend && go test ./internal/repository/... -run TestAttachGroupCounts_ProjectsCountExcludesDisabledAnime -v && go test ./internal/repository/...` | ✅ | ⬜ pending |
| 114-01-03 | 01 | 1 | D-03 | T-114-01-02 | Exposes aggregate int only, no new PII | integration (live) | `docker ps ...backend... && curl -s .../api/v1/fansubs?per_page=500 \| grep -q '"projects_count"'` | ✅ | ⬜ pending |
| 114-02-01 | 02 | 1 | D-01 | — | N/A (presentational nav) | unit (tdd RED) | `cd frontend && npx vitest run src/components/layout/AppShell.test.tsx` | ✅ | ⬜ pending |
| 114-02-02 | 02 | 1 | D-01 | T-114-02-01 | Static dev-authored href, no user input reaches nav | unit (tdd GREEN) | `cd frontend && npx vitest run src/components/layout/AppShell.test.tsx` | ✅ | ⬜ pending |
| 114-03-01 | 03 | 2 | D-02 / D-05 | — | N/A (RED scaffold) | unit (tdd RED) | `cd frontend && npx vitest run src/app/fansubs/page.test.tsx` | ✅ | ⬜ pending |
| 114-03-02 | 03 | 2 | D-02 / D-04 / D-05 | T-114-03-01, T-114-03-02 | React text-node auto-escape; `resolveApiUrl` seam reused (no new trust boundary) | unit (tdd GREEN) | `cd frontend && npx vitest run src/app/fansubs/page.test.tsx && npm run typecheck` | ✅ | ⬜ pending |
| 114-04-01 | 04 | 3 | D-01 / D-02 | — | N/A (read-only verify) | integration (live) | `curl -s .../fansubs \| grep -q 'Anime-Projekte' && curl -s .../fansubs \| grep -q 'href="/fansubs/'` | ✅ | ⬜ pending |
| 114-04-02 | 04 | 3 | D-01 / D-02 / D-05 | — | Manual live confirmation (both auth states, sort, parity) | manual (human-verify checkpoint) | — (blocking checkpoint) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* The scaffold analog
(`frontend/src/app/members/ranking/page.test.tsx`) and the existing Go repository test suite
provide the fixtures/patterns; no framework install and no separate Wave 0 is required. TDD RED
tasks (114-02-01, 114-03-01) act as the in-wave test-first gates.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Nav-Eintrag „Fansub-Gruppen" sichtbar (anonym UND eingeloggt) und verlinkt auf `/fansubs` | D-01 | Beide Nav-Render-Pfade + Login-Zustand live prüfen | 114-04 Task 2: anonym + eingeloggt öffnen, Eintrag klicken, landet auf `/fansubs` |
| Rundes Logo + Initialen-Fallback korrekt auf echten Daten | D-05 | Visuelle Prüfung echter Gruppendaten (Bild-Fallback) | 114-04 Task 2: Gruppe ohne `logo_url` zeigt Initialen-Platzhalter, keine Broken Images |
| „Anime-Projekte"-Parität Directory ↔ Detailseite | D-02 / D-03 | Live-Vergleich zweier Seiten mit denselben echten Daten | 114-04 Task 2: Zahl auf `/fansubs` == Zahl auf `/fansubs/[slug]` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a blocking manual checkpoint (114-04-02)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — existing infra suffices)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-28
