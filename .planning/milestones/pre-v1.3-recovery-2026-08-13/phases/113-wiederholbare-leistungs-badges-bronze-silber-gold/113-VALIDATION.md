---
phase: 113
slug: wiederholbare-leistungs-badges-bronze-silber-gold
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-28
---

# Phase 113 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Inhalt abgeleitet aus `113-RESEARCH.md` → „## Validation Architecture" und den drei PLAN-Dateien.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: `go test` + `github.com/stretchr/testify`; Frontend: Vitest 3.x (`@`-Path-Alias) |
| **Config file** | `frontend/vitest.config.ts` (Frontend); Go-Modul `backend/go.mod` |
| **Quick run command** | `cd backend && go test ./internal/repository/... -run "TestHighestContrib" -v && cd ../frontend && npx vitest run src/components/profile/` |
| **Full suite command** | `cd backend && go build ./... && go vet ./internal/repository/... && go test ./... && cd ../frontend && npx vitest run src/components/profile/` |
| **Estimated runtime** | Quick ~30 s (DB-frei) · Full ~1–2 min |

---

## Sampling Rate

- **After every task commit:** DB-freie Schwellen-Unit-Tests (Go `TestHighestContrib*`) + Vitest-Presentation-Tests (< 30 s).
- **After every plan wave:** Volle Backend-Suite `go test ./...` + Frontend `vitest run src/components/profile/`.
- **Before `/gsd:verify-work`:** Full suite grün. Postgres-Integrationstests live nachziehen, sobald `TEAM4S_PHASE106_TEST_DSN` verfügbar — **SKIP ist kein FAIL** (dokumentierter Normalzustand ab Phase 106).
- **Max feedback latency:** ~30 s (Quick-Pfad).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 113-01-01 | 01 | 1 | GAM-04 / D-02,D-03,D-04 | V5 | Reine Schwellenfunktionen (Grenzwerte 0/1·4/5·14/15 bzw. 10/50/150), keine SQL/Input | unit (tdd) | `cd backend && go test ./internal/repository/... -run "TestHighestContrib" -v` | ❌ W0 | ⬜ pending |
| 113-01-02 | 01 | 1 | GAM-04 / D-01,D-02,D-03,D-04 | V4,V5 | `loadContributionBadges` member-gefiltert, parametrisiert (`$1`); ID:0-Emission, kein `member_badges`-INSERT; Media-Query ohne review/visibility-Join | unit + build/vet | `cd backend && go build ./... && go vet ./internal/repository/... && go test ./internal/repository/... -run "TestHighestContrib" -v` | ❌ W0 | ⬜ pending |
| 113-01-03 | 01 | 1 | GAM-04 / D-01 | V4 | Postgres-Integration: award→reverse→hidden (Live-Downgrade), Coverage-Vollständigkeit, note published/deleted, media count/soft-delete | integration | `cd backend && go test ./internal/repository/... -run "TestLoadContributionBadgesPostgres" -v` (SKIP ohne DSN) | ❌ W0 | ⬜ pending |
| 113-02-01 | 02 | 1 | GAM-04 / D-05 | — | 9 earned-only Presentation-Einträge + Gruppe `contributions`; NICHT in `PUBLIC_MEMBER_BADGE_CATALOG`; Typprüfung | build/type | `cd frontend && npx tsc --noEmit -p tsconfig.json` | ✅ (erweitern) | ⬜ pending |
| 113-02-02 | 02 | 1 | GAM-04 / D-05 | — | `memberBadgeLabels.test.ts` (9 Codes + Gruppe) + `MemberBadgeChain.test.tsx` (Gruppenbildung, höchste Stufe, kein Toggle) | unit (Vitest) | `cd frontend && npx vitest run src/components/profile/` | ✅ (erweitern) | ⬜ pending |
| 113-03-01 | 03 | 2 | GAM-04 | V4 | Volle Suiten grün nach Container-Rebuild | integration | `cd backend && go build ./... && go test ./... && cd ../frontend && npx vitest run src/components/profile/` | ✅ | ⬜ pending |
| 113-03-02 | 03 | 2 | GAM-04 / D-01,D-05 | V4 | Live-Abnahme: Anzeige „Beiträge"-Gruppe, Live-Downgrade sichtbar, Trennung von der Toggle-Fläche (`AchievementBadgesCard`) | manual (human-verify, blocking) | — (siehe Manual-Only) | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Backend: `member_profile_contribution_badges_repository_test.go` — drei reine Schwellenfunktions-Unit-Tests (`TestHighestContribProjectsTier` 1/5/15, `TestHighestContribChronicleTier` + `TestHighestContribArchivistTier` 10/50/150), Grenzwerte je Familie.
- [ ] Backend: Postgres-Integrationstest `TestLoadContributionBadgesPostgres` analog `TestLoadPublicBadgesPostgresRoleVolume` — award→reverse→hidden (Live-Downgrade), Familie-1-Coverage-Vollständigkeit (eine Lücke ⇒ Projekt zählt nicht), Notiz published/deleted, Media count/soft-delete. SKIP ohne `TEAM4S_PHASE106_TEST_DSN`.
- [ ] Frontend: `memberBadgeLabels.test.ts` um 9 neue Codes + Gruppe `contributions` erweitern; `MemberBadgeChain.test.tsx` um `contributions`-Gruppenbildung (earned-only, nur höchste Stufe) erweitern.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Öffentliche „Beiträge"-Gruppe erscheint auf `/members/:slug` mit korrekter höchster Stufe pro Familie | GAM-04 / D-05 | Visuelles Rendering im Live-Profil; kein automatisierter E2E-Pfad im Scope | `docker restart team4sv30-frontend` + Strg+F5, `/members/:slug` mit Member öffnen, der Badges erreicht hat; Gruppe „Beiträge" mit korrekten Rängen prüfen |
| Live-Downgrade: Storno unter Schwelle entfernt/stuft Badge zurück | D-01 | Erfordert Ledger-/Media-Mutation gegen Live-Postgres | Credit/Bild stornieren bzw. soft-deleten, Profil neu laden, Rückstufung verifizieren |
| Trennung: derived Badges NICHT in der Toggle-Fläche `/me/profile` (`AchievementBadgesCard`) | D-05 | Negativ-Nachweis über zwei getrennte Flächen | `/me/profile` prüfen — „Beiträge" darf dort NICHT als toggle-bare persistierte Badges erscheinen; nur öffentliche `MemberBadgeChain` zeigt sie |
| Postgres-Integrationstests real grün (statt SKIP) | GAM-04 / D-01 | `TEAM4S_PHASE106_TEST_DSN` in Agent-Umgebung meist ungesetzt | `TEAM4S_PHASE106_TEST_DSN=... go test ./internal/repository/... -run "TestLoadContributionBadgesPostgres" -v` sobald DSN verfügbar |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (nur der blocking Human-Verify-Checkpoint 113-03-02 ist bewusst manuell)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (drei Schwellen-Unit-Tests + Integrationstest + Vitest-Erweiterungen)
- [x] No watch-mode flags (`vitest run`, nicht `vitest`)
- [x] Feedback latency < 30 s (Quick-Pfad)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (2026-07-28) — Inhalt gegen RESEARCH Validation Architecture + PLAN-Tasks abgeglichen. `wave_0_complete` bleibt `false` bis die Wave-0-Testdateien in 113-01/113-02 tatsächlich angelegt sind (execute-phase).
