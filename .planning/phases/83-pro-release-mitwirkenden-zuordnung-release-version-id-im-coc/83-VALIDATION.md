---
phase: 83
slug: pro-release-mitwirkenden-zuordnung-release-version-id-im-coc
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-11
---

# Phase 83 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go: `github.com/stretchr/testify` + `go test` · Frontend: Vitest 3 |
| **Config file** | `frontend/vitest.config.ts` · Go: keine (Standard `go test`) |
| **Quick run command** | `go test ./backend/internal/permissions/... -run TestCanForReleaseVersion` |
| **Full suite command** | `go test ./backend/... ; npm --prefix frontend run test` |
| **Estimated runtime** | ~60–120 Sekunden |

---

## Sampling Rate

- **After every task commit:** Run der jeweils betroffene Quick-Befehl (Go-Paket bzw. Vitest-Datei)
- **After every plan wave:** Run `go test ./backend/... ; npm --prefix frontend run test`
- **Before `/gsd:verify-work`:** Volle Suite muss grün sein
- **Max feedback latency:** 120 Sekunden

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 83-xx | permissions | 1 | D-01/D-04 | T-83-01 | `CanForReleaseVersion` erlaubt nur Actors mit gültiger Contribution (Projekt-Default oder Override) | unit | `go test ./backend/internal/permissions/... -run TestCanForReleaseVersion` | ⚠️ teilweise (permissions_test.go) — neue Fälle ❌ W0 | ⬜ pending |
| 83-xx | permissions | 1 | D-01/D-05 | T-83-02 | `fansub_lead` / `project_lead` immer erlaubt (Leader-Bypass, unabhängig von Contribution) | unit | `go test ./backend/internal/permissions/... -run TestCanForReleaseVersionLeaderBypass` | ❌ W0 | ⬜ pending |
| 83-xx | repository | 1 | D-02 | T-83-01 | Fallback auf anime-weite Contributions (`release_version_id IS NULL`) wenn kein Override existiert | unit | `go test ./backend/internal/repository/... -run TestListActorContributionRolesForVersion` | ❌ W0 | ⬜ pending |
| 83-xx | permissions | 1 | D-03 | T-83-03 | Absenz im Override-Satz = abgelehnt nur für dieses Release, andere Releases unberührt | unit | `go test ./backend/internal/permissions/... -run TestCanForReleaseVersionAbsenceInOverride` | ❌ W0 | ⬜ pending |
| 83-xx | notes/media | 2 | D-13 | — | `GetMemberRolesForVersion` liefert aufgelösten `anime_contributions`-Satz (nicht Legacy `release_member_roles`) | unit | `go test ./backend/internal/repository/... -run TestGetMemberRolesForVersion` | ⚠️ vorhanden (notes_repository_test.go) — neue Assertions ❌ W0 | ⬜ pending |
| 83-xx | drawer | 2 | D-06..D-08 | — | Drawer öffnet bei Klick auf „Mitwirkende", zeigt vorbefüllte Rollen-Liste, staged Speichern/Abbrechen | unit | `npm --prefix frontend run test -- --reporter=dot ReleaseContributionDrawer` | ❌ W0 | ⬜ pending |
| 83-xx | ui-primitives | 2 | D-14 | — | Kein natives `<select>/<input>/<textarea>` in Contribution-Fläche (`AnimeContributionModal`) | lint | `npm --prefix frontend run lint` | ✅ (ESLint no-restricted-syntax) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task-IDs als `83-xx` Platzhalter — werden beim Planen gegen die finalen PLAN-Task-IDs ersetzt.*

---

## Wave 0 Requirements

- [ ] `backend/internal/permissions/permissions_test.go` — neue Testfälle für contribution-getriebene Auflösung (D-01/D-04/D-05/D-03)
- [ ] `backend/internal/repository/authz_permissions_test.go` — `ListActorContributionRolesForVersion` (NEU, D-02)
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.test.tsx` — NEU (D-06..D-08)
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.test.tsx` — NEU (optional, minimal)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Override-Drawer visuell (Avatar, Tokens, Copywriting) entspricht UI-SPEC | D-06..D-08, D-14 | Visuelle Treue nicht zuverlässig unit-testbar | Live `:3000` → `/admin/fansubs/[id]/edit?tab=releases` → „Mitwirkende" bei einer Episode öffnen, gegen 83-UI-SPEC.md prüfen |
| Notizen/Media-Maske zeigt genau den gültigen Mitwirkenden-Satz und Schreibrecht | D-13 | End-to-end Permission-Wirkung mit echten Daten | Live `:3000`: als operativer User ohne Release-Contribution → kein Schreibrecht; nach Override-Zuweisung → Schreibrecht |
| Soft-Delete-Lücke bei `anime_contributions` (D-16) | D-16 | Constraint-Verifikation, kein neuer Vollausbau gefordert | Code-Review: bestätigen dass Contribution-Delete heute Hard-DELETE ist → als Risiko/Folgearbeit dokumentieren |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
