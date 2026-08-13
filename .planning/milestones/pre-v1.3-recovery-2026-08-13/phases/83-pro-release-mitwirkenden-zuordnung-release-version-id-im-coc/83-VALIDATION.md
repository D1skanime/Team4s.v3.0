---
phase: 83
slug: pro-release-mitwirkenden-zuordnung-release-version-id-im-coc
status: draft
nyquist_compliant: true
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
| 83-01-T1 | permissions | 1 | D-01/D-04 | T-83-01 | `CanForReleaseVersion` erlaubt nur Actors mit gültiger Contribution (Projekt-Default oder Override) | unit | `go test ./backend/internal/permissions/... -run TestCanForReleaseVersion -v` | ❌ W0 (neue Testfälle in permissions_test.go) | ⬜ pending |
| 83-01-T1 | permissions | 1 | D-01/D-05 | T-83-02 | `fansub_lead` immer erlaubt (Leader-Bypass via ListActorGroupRoles — fansub_group_member_roles.role) | unit | `go test ./backend/internal/permissions/... -run TestCanForReleaseVersionLeaderBypass -v` | ❌ W0 | ⬜ pending |
| 83-01-T1 | permissions | 1 | D-05 | T-83-02B | `project_lead` immer erlaubt — gleicher Datenpfad wie fansub_lead via ListActorGroupRoles (VERIFIED: authz_permissions.go Z. 161–168) | unit | `go test ./backend/internal/permissions/... -run TestCanForReleaseVersionProjectLeadBypass -v` | ❌ W0 | ⬜ pending |
| 83-01-T2 | repository | 1 | D-02 | T-83-01 | Fallback auf anime-weite Contributions (`release_version_id IS NULL`) wenn kein Override existiert | unit | `go test ./backend/internal/repository/... -run TestListActorContributionRolesForVersion -v` | ❌ W0 | ⬜ pending |
| 83-01-T1 | permissions | 1 | D-03 | T-83-03 | Absenz im Override-Satz = abgelehnt nur für dieses Release, andere Releases unberührt | unit | `go test ./backend/internal/permissions/... -run TestCanForReleaseVersionAbsenceInOverride -v` | ❌ W0 | ⬜ pending |
| 83-03-T1 | notes/media | 2 | D-13 | — | `GetMemberRolesForVersion` liefert aufgelösten `anime_contributions`-Satz (nicht Legacy `release_member_roles`) — TDD-Plan selbst-enthalten (RED→GREEN in Plan 03) | unit | `go test ./backend/internal/repository/... -run TestGetMemberRolesForVersion -v` | ⚠️ vorhanden (notes_repository_test.go) — neue Assertions in Plan 03 | ⬜ pending |
| 83-05-T2 | drawer | 4 | D-06..D-08 | — | Drawer öffnet bei Klick auf „Mitwirkende", zeigt vorbefüllte Rollen-Liste, staged Speichern/Abbrechen | unit | `npm --prefix frontend run test -- --reporter=dot ReleaseContributionDrawer` | ❌ W0 | ⬜ pending |
| 83-07-T1 | ui-primitives | 5 | D-14 | — | Kein natives `<select>/<input>/<textarea>` in Contribution-Fläche (`AnimeContributionModal`) | lint | `npm --prefix frontend run lint` | ✅ (ESLint no-restricted-syntax) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave-0-Testfälle sind in Plan 01 (Go) und Plan 05 (Frontend) definiert. Sie müssen VOR der Implementierung rot fehlschlagen (ROT-Zustand) und nach der Implementierung grün werden.

**Go — Plan 01, Task 1 (`permissions_test.go`):**
- [x] `TestCanForReleaseVersionContributionRequired` — D-01/D-04 (Wave-0-Stub in Plan 01)
- [x] `TestCanForReleaseVersionLeaderBypass` — D-05 fansub_lead (Wave-0-Stub in Plan 01)
- [x] `TestCanForReleaseVersionProjectLeadBypass` — D-05 project_lead (Wave-0-Stub in Plan 01; project_lead via fansub_group_member_roles wie fansub_lead aufgelöst)
- [x] `TestCanForReleaseVersionAbsenceInOverride` — D-03 (Wave-0-Stub in Plan 01)
- [x] `TestCanForReleaseVersionWithContribution` — D-01/D-02 (Wave-0-Stub in Plan 01)

**Go — Plan 01, Task 2 (`authz_permissions_test.go`):**
- [x] `TestListActorContributionRolesForVersion` — D-02 Fallback-Logik (Wave-0-Stub in Plan 01)

**Go — Plan 03, Task 1 (TDD, selbst-enthalten):**
- `TestGetMemberRolesForVersion` — D-13 (selbst-enthaltener TDD-Plan 03: RED in Plan 03, GREEN in Plan 03). KEIN separater Wave-0-Stub in Plan 01 nötig. Konsistenz: Plan 03 ist `type: execute` mit `tdd="true"`-Task; der Test entsteht und wird in demselben Plan grün.

**Frontend — Plan 05, Task 2 (`ReleaseContributionDrawer.test.tsx`):**
- [x] Vitest-Tests für ReleaseContributionDrawer (Wave-0-Stub: Datei wird in Plan 05 angelegt, Tests sind zunächst rot bis Implementierung in Task 2 abgeschlossen)

**Frontend — ContributorAvatar.test.tsx:**
- Optional (minimal) — kein hartes Wave-0-Requirement

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Override-Drawer visuell (Avatar, Tokens, Copywriting) entspricht UI-SPEC | D-06..D-08, D-14 | Visuelle Treue nicht zuverlässig unit-testbar | Live `:3000` → `/admin/fansubs/[id]/edit?tab=releases` → „Mitwirkende" bei einer Episode öffnen, gegen 83-UI-SPEC.md prüfen |
| Cockpit-Badge beim initialen Load sichtbar (ohne Drawer-Interaktion) | D-08 | End-to-end Rendering mit echten Daten | Live `:3000`: Releases-Tab öffnen → pro Zeile Badge prüfen (Projektteam/Eigene Besetzung/Mitwirkende fehlen) ohne vorherigen Drawer-Klick |
| Notizen/Media-Maske zeigt genau den gültigen Mitwirkenden-Satz und Schreibrecht | D-13 | End-to-end Permission-Wirkung mit echten Daten | Live `:3000`: als operativer User ohne Release-Contribution → kein Schreibrecht; nach Override-Zuweisung → Schreibrecht |
| Soft-Delete-Lücke bei `anime_contributions` (D-16) | D-16 | Constraint-Verifikation, kein neuer Vollausbau gefordert | Code-Review: bestätigen dass Contribution-Delete heute Hard-DELETE ist → als Risiko/Folgearbeit dokumentiert (Plan 07 Task 2) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (alle Plans 01–07 haben `go test`/`npm test`-Commands oder Wave-0-Referenzen)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (permissions_test.go, authz_permissions_test.go, ReleaseContributionDrawer.test.tsx — alle in Wave-0-Requirements-Tabelle gelistet; TestGetMemberRolesForVersion ist selbst-enthaltener TDD in Plan 03)
- [x] No watch-mode flags (alle verify-Befehle ohne --watch)
- [x] Feedback latency < 120s (Go: ~10–30s pro Paket; Vitest: ~20s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution

---

## Tracked Deviations (dokumentierte Abweichungen, kein Verifier-Befund)

| Deviation | Plan | Rationale | Folgearbeit |
|-----------|------|-----------|-------------|
| `page.tsx` > 450 Zeilen (>3200 Zeilen) | 83-06 | Bestehendes Limit-Verstoß vor Phase 83; Split würde Phase-83-Scope sprengen | Dedizierter Split-Plan als eigene Phase (ReleaseTab.tsx, ContributionsTab.tsx etc.) |
| Rollen-Picker: statische Liste statt Live-Katalog-Endpoint | 83-05 | `GET /api/v1/admin/role-definitions`-Endpoint existiert nicht (VERIFIED: Routen-Scan) | Endpoint anlegen + Drawer auf dynamischen Abruf umstellen |
