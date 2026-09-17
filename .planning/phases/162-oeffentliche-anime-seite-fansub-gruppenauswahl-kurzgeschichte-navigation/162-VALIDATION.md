---
phase: 162
slug: oeffentliche-anime-seite-fansub-gruppenauswahl-kurzgeschichte-navigation
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-17
---

# Phase 162 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Testing Library (Frontend) / Go `testing` + testify + real-Postgres via `pgxpool` (Backend) |
| **Config file** | `frontend/vitest.config.ts` (Frontend); kein separates Config-File für Backend-Tests |
| **Quick run command (Frontend)** | `docker compose exec -T team4sv30-frontend npx vitest run src/components/fansubs src/app/anime` |
| **Quick run command (Backend)** | Go-Container: `go test ./internal/repository/... -run Fansub` |
| **Full suite command (Frontend)** | `docker compose exec -T team4sv30-frontend npx vitest run` |
| **Full suite command (Backend)** | Go-Container: `go test ./...` |
| **Estimated runtime** | ~60-120s (Frontend Full Suite), ~30-60s (Backend Full Suite) |

---

## Sampling Rate

- **After every task commit:** Run the quick command for the affected layer (Frontend or Backend)
- **After every plan wave:** Run both full suites (Frontend + Backend)
- **Before `/gsd:verify-work`:** Full suite must be green on both layers
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 162-01-xx | TBD | 0/1 | REQ-162-02/03 | — | 0/1/2+-Gruppen-Logik, „Alle" nur ab 2 Gruppen | component (RTL) | `docker compose exec -T team4sv30-frontend npx vitest run src/components/fansubs/FansubVersionBrowser.test.tsx` | ✅ (muss umgebaut werden) | ⬜ pending |
| 162-01-xx | TBD | 0/1 | REQ-162-15 | V5 Input Validation | URL-Parameter setzen/lesen, Back/Forward, ungültiger Slug → „Alle" | component (RTL) mit `window.history`-Spy + simuliertem `popstate` | `docker compose exec -T team4sv30-frontend npx vitest run src/components/fansubs` | ❌ W0 (neue Assertions) | ⬜ pending |
| 162-01-xx | TBD | 0/1 | REQ-162-10/11 | — | Story-Vorschau (body_text, 3-zeilig) / kein Platzhalter ohne Geschichte | component (RTL) | `docker compose exec -T team4sv30-frontend npx vitest run src/components/fansubs` | ✅ Datei vorhanden, Inhalt wird ersetzt | ⬜ pending |
| 162-02-xx | TBD | 1 | REQ-162-17 | V5 Input Validation, Tampering (SQLi) | LATERAL-Join liefert korrekte `story_preview`, kein N+1, param. Query | Go Postgres-Integrationstest (echte Ausführung, env-DSN-gated) | Go-Container: `go test ./internal/repository/... -run ListAnimeFansubs` | ❌ W0 (neuer, real ausgeführter Test) | ⬜ pending |
| 162-01-xx | TBD | 0/1 | REQ-162-18 | — | Accessibility (Fokus, `aria-pressed`, `role="group"`, Accessible Names) | component (RTL) + `jest-axe` (bereits projektweit verdrahtet) | `docker compose exec -T team4sv30-frontend npx vitest run` (nutzt `axeSetup.ts` automatisch) | ✅ Infrastruktur vorhanden | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Vollständige Task-ID-Zuordnung erfolgt durch den Planner in den PLAN.md-Dateien.*

---

## Wave 0 Requirements

- [ ] Neuer Go-Postgres-Integrationstest für die `ListAnimeFansubs`-LATERAL-Join-Erweiterung (env-DSN-gated, nach Vorbild `backend/internal/repository/anime_relations_admin_postgres_test.go`) — deckt REQ-162-10, REQ-162-17. **Nicht** nach dem verbotenen `os.ReadFile`+`strings.Contains`-Muster von `fansub_repository_test.go` bauen.
- [ ] Neue Component-Tests für `window.history.pushState`/`popstate`-Verhalten (Spy auf `window.history.pushState`, simuliertes `PopStateEvent`, Assertion „kein neuer `getAnimeFansubs`/`getGroupedEpisodes`-Aufruf bei Auswahlwechsel") — deckt REQ-162-15, D-03
- [ ] Vollständiger Rewrite von `FansubVersionBrowser.test.tsx` (localStorage-Tests entfernen, URL-Tests ergänzen) und `ActiveFansubStory.test.tsx` (Komponente entfällt/wird ersetzt)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser-Verifikation Desktop/Mobile (1 Gruppe, 2+ Gruppen, Logo/kein Logo, Geschichte/keine Geschichte, Coop) | §17 (Browser-Matrix) | Visuelle Prüfung von Layout, Wrap-Verhalten, Fokus-Sichtbarkeit — nicht vollständig durch RTL/axe abdeckbar | Vor Ausführung: read-only `SELECT`-Inventar der echten DB-Konstellationen (siehe RESEARCH.md „Live-Datenbestand"); danach Chrome DevTools Desktop+Mobile-Viewport gegen `http://127.0.0.1:3300` (SSH-Tunnel) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (per gsd-plan-checker Dimension 8 review, 2026-09-17: alle `auto`-Tasks haben ein direktes `<automated>`-Verify; die beiden Checkpoint-Tasks in 162-05 sind korrekt vom Automatisierungszwang ausgenommen)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Backend-Integrationstest, URL/History-Tests — konkretisiert als Tasks in 162-01-PLAN.md und 162-03-PLAN.md)
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-17 (gsd-plan-checker, Dimension 8 — 0 Blocker)
