---
phase: 67
slug: release-episode-credits
status: approved
nyquist_compliant: true
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
| 67-01-01 | 01 | 1 | P67-SC1 | — | Additive nullable FK SET NULL + vierspaltiger UNIQUE NULLS NOT DISTINCT | migration-contract | `node -e "...0090 up/down Form-Assertion..."` | ❌ W0 | ⬜ pending |
| 67-01-02 | 01 | 1 | P67-SC1 | — | Migration-Form idempotent up/down | migration-contract | `cd backend && go test ./internal/migrations/... -run Phase67 -count=1` | ❌ W0 | ⬜ pending |
| 67-01-03 | 01 | 1 | P67-SC1 | — | [BLOCKING] reale Spalte vor Repo-Verifikation vorhanden | manual checkpoint | — (Docker migrate-apply) | ❌ W0 | ⬜ pending |
| 67-02-01 | 02 | 2 | P67-SC1 | T-67-02-SQLI | GroupParticipatesInReleaseVersion + Dropdown-Query (parametrisiert) | unit (repo) | `cd backend && go test ./internal/repository/... -run ReleaseVersion -count=1` | ❌ W0 | ⬜ pending |
| 67-02-02 | 02 | 2 | P67-SC1 | T-67-02-DUP | Vierspaltiges ON CONFLICT (kein Overwrite); Read-DTO trägt release_version_id | unit (repo, DB) | `cd backend && go test ./internal/repository/... -run "ReleaseVersion\|Contribution" -count=1` | ❌ W0 | ⬜ pending |
| 67-02-03 | 02 | 2 | P67-SC1 | T-67-02-CG | D-03 Leader-Pfad: gruppen-fremde Version → 422 | unit/handler | `cd backend && go test ./internal/handlers/... -run ReleaseVersion -count=1` | ❌ W0 | ⬜ pending |
| 67-03-01 | 03 | 2 | P67-SC2 | — | Ebene-2-Versions-Aggregation + DTOs | unit (repo) | `cd backend && go test ./internal/repository/... -run PublicAnimeContributions -count=1` | ❌ W0 | ⬜ pending |
| 67-03-02 | 03 | 2 | P67-SC2 | — | Ebene-1 `IS NULL`-Filter, keine Doppelanzeige, Sortierung Episode→Version | unit (repo) | `cd backend && go test ./internal/repository/... -run PublicAnimeContributions -count=1` | ❌ W0 | ⬜ pending |
| 67-04-01 | 04 | 3 | P67-SC2, P67-SC1 | T-67-04-AUTH | Dropdown-Endpunkt permission-geschützt; Typen/OpenAPI | build+typecheck | `cd backend && go build ./... && cd ../frontend && npm run typecheck` | ❌ W0 | ⬜ pending |
| 67-04-02 | 04 | 3 | P67-SC2 | T-67-04-ID | Aufklappbare Versions-Ebene, anime-weit zuerst | component | `cd frontend && npm run test -- GroupContributionBlock` | ❌ W0 | ⬜ pending |
| 67-04-03 | 04 | 3 | P67-SC1 | T-67-04-CLIENTFILTER | Gruppen-gefiltertes Dropdown (serverseitig), 422-Feldfehler | typecheck | `cd frontend && npm run typecheck` | ❌ W0 | ⬜ pending |
| 67-04-04 | 04 | 4 | P67-SC2, P67-SC1 | — | [BLOCKING] Browser-UAT (Anzeige + Leader-Dropdown end-to-end) | manual checkpoint | — (Docker rebuild + Browser) | ❌ W0 | ⬜ pending |
| 67-05-01 | 05 | 3 | P67-SC1 | T-67-02-CG | D-03 Member-Proposal-Pfad: gruppen-fremde Version → 422 | unit/handler | `cd backend && go test ./internal/handlers/... -run "CreateProposal\|ReleaseVersion" -count=1` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. `File Exists: ❌ W0` = Testdatei wird im jeweiligen Task (Wave 0 innerhalb der Phase) angelegt; `wave_0_complete` wird zur Laufzeit auf true gesetzt, sobald alle Testdateien existieren. Sampling-Kontinuität erfüllt: keine 3 aufeinanderfolgenden auto-Tasks ohne automated verify (nur die zwei blockierenden Checkpoints 67-01-03 und 67-04-04 sind manuell).*

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (alle auto/tdd-Tasks haben automated; nur 67-01-03 + 67-04-04 sind bewusste blockierende Human-Checkpoints)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Migration-Test, Lookup-Test, Public-Query-Test, GroupContributionBlock-Test in den jeweiligen Tasks)
- [x] No watch-mode flags (alle Commands nutzen `-count=1` bzw. einmaligen Lauf, kein `--watch`)
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-02 (Per-Task-Map aus 5 Plänen finalisiert; `wave_0_complete` bleibt false bis die Testdateien zur Ausführungszeit angelegt sind)
