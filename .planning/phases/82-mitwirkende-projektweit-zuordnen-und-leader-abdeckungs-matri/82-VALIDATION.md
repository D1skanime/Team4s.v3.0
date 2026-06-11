---
phase: 82
slug: mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-11
---

# Phase 82 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (Frontend), `go test` (Backend) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `npx vitest run src/app/admin/fansubs` |
| **Full suite command** | `npm --prefix frontend run typecheck && npx vitest run` (+ `go test ./...` im backend) |
| **Estimated runtime** | ~60–120 s |

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/app/admin/fansubs` (Frontend) bzw. `go test ./internal/...` (Backend-Tasks)
- **After every plan wave:** `npm --prefix frontend run typecheck` + gezielte Vitest-Suite
- **Before `/gsd:verify-work`:** Full suite + typecheck grün; Backend `go build ./...` grün
- **Max feedback latency:** ~120 s

---

## Per-Task Verification Map

| Req | Plan/Wave | Verhalten | Test-Typ | Automated Command | Status |
|-----|-----------|-----------|----------|-------------------|--------|
| D-01 | 82-01/1, 82-02/2 | Contributions per `member_id` (Anker), Backfill aus hist | Integration (Go) | `go test ./internal/repository/... -run AnimeContribution` | ⬜ pending |
| D-08 | 82-01/1 | `fansub_group_member_roles.role` FK→`role_definitions` | Migration/DB | `go run ./cmd/migrate` + `go test ./internal/repository/... -run Role` | ⬜ pending |
| D-04 | 82-01/1, 82-02, 82-05 | `fansub_group_default_crew` CRUD + „Übernehmen" füllt leere Projekte | Integration (Go) + Component | `go test ./internal/... -run DefaultCrew` ; Vitest Standard-Team | ⬜ pending |
| D-13 | 82-05 | `anime-projekte` kein Main-Tab; `parseMainTab("anime-projekte")==="releases"` | Unit (Vitest) | `npx vitest run src/app/admin/fansubs/[id]/edit/page.test` | ⬜ pending |
| D-11 | 82-04/05 | Projektkarte zeigt Status-Badges (Mitwirkende/Einblick) | Component (Vitest) | `npx vitest run src/app/admin/fansubs ProjectCockpitBadges` | ⬜ pending |
| D-10 | 82-04/05 | Einblick (RichTextRenderer) im aufgeklappten Bereich | Component (Vitest) | `npx vitest run src/app/admin/fansubs AnimeProjectNoteWorkspace` | ⬜ pending |
| D-12 | 82-04/05 | Kein Fake-Status; „N offene Punkte" nicht gerendert; lazy „Einblick" | Component (Vitest) | `npx vitest run src/app/admin/fansubs` | ⬜ pending |
| D-05 | 82-05/2 | Mehrere Rollen pro Person (role_codes[] > 1) | Component (Vitest) | `npx vitest run src/app/admin/fansubs AnimeContributionModal` | ⬜ pending |
| D-06/D-07 | 82-04/05 | Abdeckungs-Matrix mit katalog-getriebenen Rollen-Spalten | Component (Vitest) | `npx vitest run src/app/admin/fansubs` | ⬜ pending |
| Altfall | 82-04 | `AnimeProjectNotesSection` nutzt `<Select>/<Button>` aus `@/components/ui` (kein natives Element) | Unit + ESLint | `npx vitest run src/app/admin/fansubs AnimeProjectNotesSection` ; `npx eslint <datei>` | ⬜ pending |
| Allg. | alle | Bestehende Fansub-Edit-Tests bleiben grün | Regression | `npx vitest run src/app/admin/fansubs` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `page.test.tsx` — Erweiterung: `parseMainTab("anime-projekte") === "releases"`, MAIN_TABS ohne `anime-projekte`
- [ ] `ProjectCockpitBadges.test.tsx` — Badge-Render je Datenzustand (vorhanden/fehlt/undefined)
- [ ] `AnimeProjectNotesSection.test.tsx` — Primitive-Migration (Select/Button), kein natives Element

*Bestehende Vitest-/Go-Test-Infrastruktur deckt die übrigen Requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vollständiger Cockpit-Workflow (Mitwirkende + Einblick + Standard-Team) live | GOAL | UI/UX-Gesamteindruck, echte Daten, Auth | Nutzer-UAT morgen auf Dev :3000, `/admin/fansubs/1/edit?tab=releases` (eingeloggt) |

---

## Validation Sign-Off

- [ ] Alle Tasks haben automated verify oder Wave-0-Dependency
- [ ] Sampling-Kontinuität: keine 3 aufeinanderfolgenden Tasks ohne automated verify
- [ ] Wave 0 deckt MISSING-Referenzen
- [ ] Keine watch-mode-Flags
- [ ] Feedback-Latenz < 120 s
- [x] `nyquist_compliant: true` gesetzt

**Approval:** approved 2026-06-11
