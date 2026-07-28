---
phase: 116
slug: personalisiertes-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-28
---

# Phase 116 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Abgeleitet aus `116-RESEARCH.md` → Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Frontend)** | Vitest 3 (`frontend/vitest.config.ts`), Testing Library (jsdom, `globals: true`) |
| **Framework (Backend)** | Go `testing` + `testify` |
| **Config file** | `frontend/vitest.config.ts` (Frontend); Standard `go test` (Backend, keine zentrale Config) |
| **Quick run (Frontend)** | `npm --prefix frontend run test -- src/app/me/dashboard` |
| **Quick run (Backend)** | `go test ./internal/repository/... ./internal/handlers/... -run Dashboard` |
| **Full suite (Frontend)** | `npm --prefix frontend run test` |
| **Full suite (Backend)** | `go test ./...` (im `backend/`-Verzeichnis) |
| **Typecheck** | `npm --prefix frontend run typecheck` (`tsc --noEmit`) |
| **Estimated runtime** | ~30–60 s (gezielte Suites), volle Suite länger |

---

## Sampling Rate

- **After every task commit:** jeweiliger Quick-Run-Befehl (Frontend-Komponente oder Go-Paket)
- **After every plan wave:** `npm --prefix frontend run test` + `npm --prefix frontend run typecheck` + `go test ./...`
- **Before `/gsd:verify-work`:** Volle Suite grün + manueller Live-Check auf `:3000`
  (Team4s-Konvention: Frontend läuft in Docker, Turbopack-HMR unzuverlässig → nach jeder
  Frontend-Änderung `docker restart team4sv30-frontend` + Hard-Refresh; Backend-Routen brauchen
  `docker compose up -d --build team4sv30-backend`)
- **Max feedback latency:** ~60 s

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| D-01 | Dashboard rendert nichts Editierbares, nur Links/Zahlen | unit (component) | `vitest run src/app/me/dashboard/page.test.tsx` | ❌ W0 | ⬜ pending |
| D-02 | „Braucht deine Aufmerksamkeit" zeigt nur Einträge < windowDays, korrekter Direktlink | unit (pure fn `isRecentlyAssigned`/`resolveWorkspaceHref`) | `vitest run .../AttentionSection.test.tsx` | ❌ W0 | ⬜ pending |
| D-03 | 5 Kennzahlen korrekt aus neuer Aggregation gerendert | unit (component) + Go-Repository-Test (COUNT-Queries) | `vitest run .../DashboardMetrics.test.tsx` + `go test ./internal/repository/... -run Dashboard` | ❌ W0 | ⬜ pending |
| D-04 | Kategorie-Tabelle zeigt korrekte „noch X bis"-Werte (3 Familien + Rollen-Volumen + Punkte) | unit (pure fn next-threshold) + Go-Test (Rohzahl-Exposition) | `vitest run .../CategoryProgressTable.test.tsx` + Go-Repository-Test | ❌ W0 | ⬜ pending |
| D-05 | Meine Gruppen zeigt `memberships` korrekt mit Links | unit (component, Muster `MembershipsSection`) | `vitest run .../MyGroupsSection.test.tsx` | ❌ W0 | ⬜ pending |
| D-06 | Schnellzugriffe verlinken korrekte, existierende Routen (inkl. defensivem `/suche`-Check) | unit (component) | `vitest run .../QuickLinksSection.test.tsx` | ❌ W0 | ⬜ pending |
| Nav | Dashboard-Nav-Item aktiv, in „Mein Bereich"-Gruppe, kein `disabled` | unit (AppShell) | `vitest run src/components/layout/AppShell.test.tsx` | ✅ (Dashboard-Fälle fehlen) W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/app/me/dashboard/page.test.tsx` — RED-Grundgerüst der neuen Seite
- [ ] `frontend/src/app/me/dashboard/components/AttentionSection.test.tsx` — reine Funktionen
      `isRecentlyAssigned` / `resolveWorkspaceHref` isoliert
- [ ] Go-Repository-Test für die neue Dashboard-Aggregation (Rohzahlen-Exposition),
      z. B. `member_profile_dashboard_repository_test.go`
- [ ] `AppShell.test.tsx`-Erweiterung: Dashboard-Item in „Mein Bereich", nicht mehr `disabled`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visuelle Konsistenz mit globalem UI-System, Responsivität, EmptyStates | D-07 | Layout/Design nicht rein assertierbar | Live auf `:3000` einloggen, `/me/dashboard` öffnen, Sektionen + leere Zustände + Mobile-Breakpoint prüfen (nach `docker restart team4sv30-frontend` + Hard-Refresh) |
| Direktlink-Ziele öffnen die richtige Arbeitsfläche ohne 403 | D-02, D-05 | Ownership-Verhalten der Zielrouten | Als Mitglied ohne Edit-Recht auf „Meine Gruppen"-Link klicken → öffentliches Gruppenprofil, kein 403 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
