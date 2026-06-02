---
phase: 67
slug: release-episode-credits
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 67 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: Go `testing` + testify; Migrationen: `backend/internal/migrations/*_test.go` (string-contract); Frontend: Vitest 3 |
| **Config file** | `frontend/vitest.config.ts` (Path-Alias `@`); Backend: kein zentrales — `go test ./...` |
| **Quick run command** | `go test ./backend/internal/migrations/... ./backend/internal/repository/... -run Contribution -count=1` |
| **Full suite command** | `cd backend && go test ./... -count=1` ; `cd frontend && npm run test` |
| **Estimated runtime** | ~60 seconds (Backend-Subset + Frontend-Komponententests) |

---

## Sampling Rate

- **After every task commit:** Run `go test ./backend/internal/migrations/... -count=1` (+ betroffene repo/handler-Pakete)
- **After every plan wave:** Run `cd backend && go test ./... -count=1` und `cd frontend && npm run test`
- **Before `/gsd:verify-work`:** Volle Suite grün + Docker-Rebuild + Browser-UAT (Anime-Seite Aufschlüsselung, beide Formulare)
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {planner fills} | — | — | P67-SC1 | T-67-01 / — | D-03: gruppen-fremde Version → 422 | unit/handler | `go test ./backend/internal/handlers/... -run ReleaseVersion -count=1` | ❌ W0 | ⬜ pending |

*Der Planner verfeinert diese Tabelle pro Task. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Phase Requirements → Test Map (aus RESEARCH.md)

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| P67-SC1 | Migration fügt `release_version_id` (nullable, FK SET NULL) + erweitert UNIQUE-Constraint | migration-contract | `go test ./backend/internal/migrations/... -run Phase67 -count=1` | ❌ Wave 0 |
| P67-SC1 | UNIQUE erlaubt anime-weit + versions-spezifisch für selben Member; verhindert exaktes Duplikat | unit (repo, DB-gestützt) | `go test ./backend/internal/repository/... -run ReleaseVersion -count=1` | ❌ Wave 0 |
| P67-SC1 | D-03: Create/Update mit gruppen-fremder Version → 422 | unit/handler | `go test ./backend/internal/handlers/... -run ReleaseVersion -count=1` | ❌ Wave 0 |
| P67-SC2 | Public-Query: anime-weite + versions-spezifische Ebene getrennt, keine Doppelanzeige, sortiert Episode→Version | unit (repo) | `go test ./backend/internal/repository/... -run PublicAnimeContributions -count=1` | ❌ Wave 0 |
| P67-SC2 | Frontend: aufklappbare Versions-Detailebene rendert Episode·Version-Gruppen | component | `npm run test -- GroupContributionBlock` | ❌ Wave 0 |

---

## Wave 0 Requirements

- [ ] `backend/internal/migrations/phase67_release_version_credits_test.go` — Migration-Contract für P67-SC1 (Spalte, FK SET NULL, erweiterter UNIQUE, Index, idempotente up/down). Muster: `phase61_contributions_model_test.go`.
- [ ] `backend/internal/repository/anime_contributions_release_lookup_repository_test.go` — `GroupParticipatesInReleaseVersion` + Dropdown-Query.
- [ ] Repo-Test für erweiterte Public-Query (Ebene-Trennung, Sortierung).
- [ ] `frontend/src/components/anime/GroupContributionBlock.test.tsx` (+ ggf. `ReleaseVersionBreakdown.test.tsx`).
- [ ] Framework-Install: keiner — Go-testing/testify/Vitest bereits vorhanden.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Abhängiges Dropdown filtert live auf Gruppen-Versionen in beiden Formularen | P67-SC1 | Interaktion über mehrere Async-Lookups; UX-Verhalten | Leader-Formular + Member-Vorschlag öffnen, Gruppe wählen, Dropdown listet nur deren Release-Versionen |
| Aufklappbare Versions-Ebene auf öffentlicher Anime-Seite | P67-SC2 | Progressive Disclosure, visuelle Hierarchie | Anime mit versions-spezifischen Contributions öffnen, Block aufklappen, anime-weit zuerst, dann Episode·Version sortiert |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
