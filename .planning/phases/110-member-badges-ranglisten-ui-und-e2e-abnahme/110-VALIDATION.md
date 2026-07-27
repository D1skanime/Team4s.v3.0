---
phase: 110
slug: member-badges-ranglisten-ui-und-e2e-abnahme
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-27
---

# Phase 110 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `110-RESEARCH.md` → Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (frontend)** | Vitest 3 + @testing-library/react, jsdom via per-file `// @vitest-environment jsdom` directive |
| **Framework (backend)** | Go `testing` + `testify`; Postgres-backed contract tests via `testsupport.OpenPhase106Postgres` disposable harness |
| **Config file** | `frontend/vitest.config.ts` (existing); backend: none needed (`go test`) |
| **Quick run command (frontend)** | `npm run test -- MemberBadgeChain` / `npm run test -- ranking` (from `frontend/`) |
| **Quick run command (backend)** | `go test ./internal/repository/... ./internal/handlers/... -run MemberPointRanking` / `-run PublicMemberProfile` (from `backend/`) |
| **Full suite command** | `npm run test` (frontend) + `go test ./...` (backend) |
| **Estimated runtime** | ~60–120 seconds (frontend unit + backend Postgres-backed) |

---

## Sampling Rate

- **After every task commit:** Run targeted `npm run test -- <file>` / `go test ./internal/... -run <Test>`
- **After every plan wave:** Run `npm run test` (frontend) + `go test ./...` (backend)
- **Before `/gsd:verify-work`:** Full suite green, then live Docker UAT — `docker restart team4sv30-backend` after backend changes; `docker restart team4sv30-frontend` + Hard-Refresh after frontend changes (dev-mode HMR does not reliably apply here)
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 110-XX-XX | ranking | 1 | SC-1 | V5 (page clamp) | Ranking row link rule: slug present → Link, slug null → plain text | unit (RTL) | `npm run test -- ranking` | ❌ W0 (new `page.test.tsx` / row-render helper) | ⬜ pending |
| 110-XX-XX | ranking | 1 | SC-1 | V4 (public filter) | AppShell nav item present in BOTH authenticated and anonymous states | unit (RTL) | `npm run test -- AppShell` | ✅ (extend `AppShell.test.tsx`) | ⬜ pending |
| 110-XX-XX | ranking | 1 | SC-4 | V5 | `page` query-param clamp reuses backend clamp (`<1→1`, `>1000→1000`, non-numeric→1); no client-side source-of-truth | Go handler test | `go test ./internal/handlers/... -run MemberPointRanking` | ✅ (extend existing handler test) | ⬜ pending |
| 110-XX-XX | profile-metric | 1 | SC-2 | — | `total_points` present and correct on public profile response (Go model → repo `LEFT JOIN member_point_totals` → OpenAPI → FE type) | Go repository test | `go test ./internal/repository/... -run TestGetPublicMemberProfile` | ❌ W0 (verify/extend `member_profile_repository_test.go`) | ⬜ pending |
| 110-XX-XX | badges | 2 | SC-3 | T-state (D-03 live projection) | Role-entry badge appears when `lifecycle_status='awarded'` for that role, disappears when reversed (live UNION, never writes `member_badges`) | Go repository test (Postgres harness) | `go test ./internal/repository/... -run TestLoadPublicBadges` | ❌ W0 (new, `OpenPhase106Postgres` + migrations 0131/0137/0139) | ⬜ pending |
| 110-XX-XX | badges | 2 | SC-3 | T-state | Role-entry badge NEVER appears for a non-points-eligible role (e.g. `fansub_lead`, `designer`, `techadmin`, `gfxler`) | Go repository test | same as above | ❌ W0 | ⬜ pending |
| 110-XX-XX | badges | 2 | SC-3 | — | `MemberBadgeChain` renders the 8 new catalog entries: locked by default, earned when present in `earnedBadges` | unit (RTL) | `npm run test -- MemberBadgeChain` | ✅ (extend `MemberBadgeChain.test.tsx`) | ⬜ pending |
| 110-04-01/02 | badge-groups | 3 | SC-3 (D-04) | T-110-09 (D-04 grouping) | Auszeichnungen-Sektion rendert kategorie-gruppierte Container (Rollen/Fortschritt/Mitgliedschaft/Besondere Auszeichnungen), leere Gruppen ausgeblendet, Rollen-Zeilen mergen mehrere Badges pro Rolle generisch (roleCode) | unit (RTL + pure function) | `npm run test -- MemberBadgeChain` | ❌ W0 (new `buildMemberBadgeGroups` grouping tests in `MemberBadgeChain.test.tsx`, Plan 110-04) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are placeholders (`110-XX-XX`) until plans are finalized; execute-phase binds them to real plan/task ordinals.*

---

## Wave 0 Requirements

- [ ] `frontend/src/app/members/ranking/page.test.tsx` (or extracted row-render helper test) — covers row link rule, empty state, error state
- [ ] Backend repository test covering `total_points` on `GetPublicMemberProfile` (extend existing profile repository test file if present — verify at plan time; else first white-box regression test for that query path)
- [ ] Backend repository test covering role-entry badge derivation (awarded → visible, reversed → gone, non-points-eligible role → never appears) — new, using the disposable Postgres harness pattern from `point_service_credit_test.go` / `phase109_member_point_totals_test.go`
- [ ] `frontend/src/components/profile/MemberBadgeChain.test.tsx` grouped-container coverage (D-04): fixed group order, empty-category hiding, generic same-`roleCode` row merge, and correct sorting of all 17 catalog badges into their groups — new, Plan 110-04 Task 1 (RED)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Anime-/Fansub-Stil, responsives Layout und Barrierefreiheit der Ranglisten-/Badge-Darstellung | SC-3 | Visuelle/UX-Qualität ist nicht automatisiert prüfbar | Live-UAT auf `:3000` (nach `docker restart team4sv30-frontend` + Hard-Refresh): Ranglisten-Seite und Profil-Hero auf Mobile-Breite prüfen, Badge-Zustände (locked/earned) sichten, Umlaute in allen Strings kontrollieren |
| End-to-End: historische Rückrechnung / Fremdbestätigung / abgelehnter+erneut eingereichter Beitrag über die Anzeige sichtbar | SC-5 | E2E über mehrere Vorphasen; Verifikation der angezeigten Ergebnisse | Live-UAT mit echten Daten: Punkteherkunft, Stornierungen und Badge-Voraussetzungen auf Profil/Rangliste nachvollziehen (auth-gated Endpunkte via Keycloak Direct-Grant-Token) |

*Hinweis: Die Abuse-/Security-Garantien der ROADMAP-SC6 (keine Selbstbestätigung, kein doppeltes Buchen, keine Scope-Überschreitung) sind laut `110-CONTEXT.md` bereits in Phasen 106/107/107.1/108 gebaut und getestet; diese Phase fügt nur read-seitige Anzeige hinzu und führt keine neue Abuse-Oberfläche ein.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (4 Wave-0 gaps above)
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
