---
phase: 112
slug: member-punkt-meilenstein-badges
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-27
---

# Phase 112 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Quelle: `112-RESEARCH.md` → "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Frontend)** | Vitest 3 (`vitest run`) + React Testing Library |
| **Framework (Backend)** | Go `testing` + `testify`; Postgres-gestützte Integrationstests (disposable schema-per-test, Helfer `openMemberPointTotalsPostgres(t)` / `openPointLedgerPostgres(t)`) |
| **Config file** | `frontend/vitest.config.ts`; Backend nutzt Standard `go test` |
| **Quick run command** | `cd frontend && npm run test -- memberBadgeLabels` bzw. `cd backend && go test ./internal/repository/... -run TestLoadPublicBadges` |
| **Full suite command** | `cd frontend && npm run test` und `cd backend && go test ./...` |
| **Estimated runtime** | ~60–120 s (Frontend Sekunden, Backend-Postgres-Suite dominiert) |

---

## Sampling Rate

- **After every task commit:** gezielt `npm run test -- <file>` / `go test ./internal/repository/... -run <Test>`
- **After every plan wave:** `cd frontend && npm run test` UND `cd backend && go test ./...`
- **Before `/gsd:verify-work`:** Full suite grün; zusätzlich `go build ./...` (Backend) und `npm run typecheck` (Frontend) sauber — exakt das Muster aus Plänen 110-02/110-03.
- **Max feedback latency:** ~120 s

---

## Per-Task Verification Map

> Task-IDs sind Platzhalter bis PLAN.md geschnitten ist; die Behaviors/Requirements sind aus RESEARCH.md fixiert.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 112-BE-01 | TBD | 1 | GAM-04 (Typ 3 tier resolution) | T-112-STALE | Tier-Helfer liefert korrekte Stufe an 11/12/107/108/319/320/509/510, kein Badge unter 12 | unit | `cd backend && go test ./internal/repository/... -run TestHighestRoleVolumeTier` | ❌ W0 | ⬜ pending |
| 112-BE-02 | TBD | 1 | GAM-04 (Typ 3 live projection, netto) | T-112-STALE | 12 Credits → Bronze; Storno auf 11 → Badge weg; Re-Award → Bronze zurück (frisch je Read, kein Cache) | integration | `cd backend && go test ./internal/repository/... -run TestLoadPublicBadgesPostgresRoleVolume` | ❌ W0 | ⬜ pending |
| 112-FE-01 | TBD | 2 | GAM-04 (Typ 2 tier resolution) | — | `deriveMilestoneBadge` liefert höchsten Schwellen-Badge an Grenzwerten (0/1/49/50/199/200/2500/2501), `null` unter 1 | unit | `cd frontend && npm run test -- memberBadgeLabels` | ❌ W0 | ⬜ pending |
| 112-FE-02 | TBD | 2 | GAM-04 (Typ 2 live projection) | T-112-STALE | Summe fällt unter Schwelle → vorheriger Meilenstein-Badge verschwindet beim nächsten Render (pure re-eval) | unit | `cd frontend && npm run test -- memberBadgeLabels` | ❌ W0 | ⬜ pending |
| 112-FE-03 | TBD | 2 | GAM-04 (Typ 1+3 Row-Merge) | — | `buildMemberBadgeGroups` mergt `role_entry_*` + `role_volume_*_gold` derselben Rolle zu EINER `roles`-Gruppenzeile | unit | `cd frontend && npm run test -- MemberBadgeChain` | ❌ W0 (hängt an 110-04 `buildMemberBadgeGroups`) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] **Pre-flight Abhängigkeitscheck (BLOCKING):** Bestätigen, dass Pläne 110-03 und 110-04 gelandet sind (SUMMARY.md vorhanden bzw. `buildMemberBadgeGroups`, kategorie-gruppierte `MemberBadgeChain` und die erweiterten Katalog-Einträge existieren im Working Tree). Phasen-Level-Gate, kein Testfile — blockiert alles Weitere. (110-01/110-02 sind committet; 110-03/110-04 zum Recherchezeitpunkt noch offen.)
- [ ] Neuer/erweiterter Backend-Test für Typ-3-Tier-Grenzen + Live-Projektion (voraussichtlich in `member_profile_repository_postgres_test.go`, Namensmuster `TestLoadPublicBadgesPostgres*`).
- [ ] Neuer/erweiterter Frontend-Test für `deriveMilestoneBadge` und den dynamischen `role_volume_*`-Presentation-Resolver plus `buildMemberBadgeGroups` Same-Role-Merge (Synthetic-Badge-Muster aus 110-04 Task 1 RED wiederverwenden).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gold/Platin-Stufen (320/510) live sichtbar | GAM-04 (Typ 3 hohe Stufen) | Phase 108 (D-20/D-21/D-22) schloss historischen Backfill aus; Wegwerf-Testdaten erreichen 320/510 nicht natürlich | Für die Live-UAT gezielt genügend `release_role_credit_lifecycles`-Credits einer Rolle seeden (reversibel), Profil `/members/[slug]` prüfen, danach zurücksetzen — im PLAN-Verifikationsteil dokumentieren, NICHT erst in der UAT entdecken |
| Platzhalter-Icons austauschbar | Discretion (Badge-Bilder später) | Echtes Artwork liefert der Nutzer nach | Sichtprüfung: Lucide-Platzhalter rendern, Tausch ohne Logikänderung möglich |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (inkl. Phase-110-Pre-flight)
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
