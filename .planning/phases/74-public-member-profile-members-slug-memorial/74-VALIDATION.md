---
phase: 74
slug: public-member-profile-members-slug-memorial
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-04
---

# Phase 74 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Abgeleitet aus `74-RESEARCH.md` → `## Validierungsarchitektur`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Backend)** | Go `testing` + testify; **no-DB Source-Fragment-Tests** (`readRepositorySource`/`readBackendSource`, Muster aus Phase 72) für SQL-Guards |
| **Framework (Frontend)** | Vitest 3 (`frontend/vitest.config.ts`) |
| **Config file** | `frontend/vitest.config.ts` (Frontend); Go: keine — `go test` integriert |
| **Quick run (Backend)** | `cd backend && go test ./internal/handlers/... -run <Pattern>` |
| **Quick run (Frontend)** | `cd frontend && npx vitest run <pattern>` |
| **Full suite command** | `cd backend && go test ./...` + `cd frontend && npm test` |
| **Estimated runtime** | Quick ~5–15s; Voll-Suite ~1–3 min |

---

## Sampling Rate

- **After every task commit:** betroffener `go test -run <Pattern>` bzw. `npx vitest run <Section>`
- **After every plan wave:** `cd backend && go test ./...` + `cd frontend && npm test`
- **Before `/gsd:verify-work`:** Voll-Suite grün + `npm run typecheck`
- **Max feedback latency:** ~15s (Quick-Run pro Commit)

---

## Per-Task Verification Map

| Req | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-----|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| J / D-14 | 0/1 | Memorial-Setter | Nicht-Global-Admin → 403 | unit (Go handler) | `go test ./internal/handlers/... -run Memorial` | ❌ W0 | ⬜ pending |
| J / D-17 | 0/1 | Claim-Sperre | `SubmitClaim` UND `AcceptInvitation` lehnen Claim gegen memorial-Profil ab (409) | unit (Go repo) | `go test ./internal/repository/... -run Claim` | ❌ W0 | ⬜ pending |
| D-15 | 0/1 | Audit-Log | Memorial-Set + Claim-Block schreiben `audit_logs` (Actor/Target/Outcome) | unit (Go, AuditLog-Stub) | `go test ./internal/handlers/... -run Audit` | ❌ W0 | ⬜ pending |
| Badges 13 | 0/1 | Public-Badge-Quelle | `GetPublicMemberBadges` selektiert NUR `visibility='public' AND status='active'` | unit (no-DB Source-Fragment) | `go test ./internal/repository/... -run PublicBadges` | ❌ W0 | ⬜ pending |
| C / D-06 | 0/1 | Client-Filter | reduziert role_timeline ohne API-Call | unit (Vitest) | `npx vitest run MemberContributionFilters` | ❌ W0 | ⬜ pending |
| C / D-10 | 0/1 | Memorial-Render | rendert Gedenk-Sprache, unterdrückt Mengen-Badges | unit (Vitest) | `npx vitest run MemberProfileHero` | ❌ W0 | ⬜ pending |
| C / D-09 | 0/1 | Status-Pill | rendert korrekten Status + Tooltip für alle 5 Werte | unit (Vitest) | `npx vitest run MemberStatusPill` | ❌ W0 | ⬜ pending |
| K | 0/1 | Contracts | OpenAPI + `api.ts`-Typen für Status/Badges/Memorial-Setter/Korrektur vorhanden | type | `npm run typecheck` + Contract-Review | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Go-Handler-Test Memorial-Setter (Global-Admin-Gate + Audit) — covers J/D-14, D-15
- [ ] Go-Repo-Test Claim-Sperre in beiden Pfaden (`SubmitClaim` + `AcceptInvitation`) — covers J/D-17
- [ ] Go-no-DB-Source-Fragment-Test `GetPublicMemberBadges` (visibility-Guard) — covers Badges 13
- [ ] Vitest `MemberContributionFilters.test.tsx` — covers C/D-06
- [ ] Vitest `MemberProfileHero.test.tsx` (Memorial-Variante) — covers C/D-10
- [ ] Vitest `MemberStatusPill.test.tsx` — covers C/D-09

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Würdevolle Memorial-Gesamtdarstellung (visuelle Angemessenheit) | C/D-10 | Subjektive UX/Pietät nicht automatisierbar | Memorial-Profil im Dev-Server (:3000) öffnen, prüfen: keine Aktivitäts-/Gamification-Anzeige, Gedenk-Sprache, ruhige Darstellung |
| „Bekannt für" / Highlight-Kuratierung wirkt sinnvoll | C | Redaktionelle Einschätzung | Profil mit echten Daten ansehen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
