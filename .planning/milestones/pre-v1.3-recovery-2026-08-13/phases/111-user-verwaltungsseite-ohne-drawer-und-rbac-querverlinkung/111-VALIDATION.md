---
phase: 111
slug: user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-28
---

# Phase 111 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `111-RESEARCH.md` § Validation Architecture. Coverage unit = decisions D-01…D-06 (this phase has no mapped REQ-IDs).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (frontend, `jsdom`) + `go test` (`testify`) für die Backend-Aggregation |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run src/app/admin/users --reporter=dot` |
| **Full suite command** | `cd frontend && npm test` (→ `vitest run`) + `go test ./internal/repository/... ./internal/handlers/...` |
| **Estimated runtime** | ~30–60 s (Frontend-Teilsuite) |

---

## Sampling Rate

- **After every task commit:** Run the targeted `npx vitest run <geänderte-Testdatei>` (Quick-Run scope).
- **After every plan wave:** Run `cd frontend && npm test`; für den Backend-Aggregations-Task zusätzlich `go test ./internal/repository/... ./internal/handlers/...`.
- **Before `/gsd:verify-work`:** Full suite (Frontend + Backend) green, **plus** Live-UAT auf `:3000` mit echten `app_user_global_roles`-Daten (`docker restart team4sv30-frontend` + Strg+F5 nach Frontend-Edits; `docker compose up -d --build team4sv30-backend` nach Go-Änderungen) — v. a. D-04/D-05, die nur mit echten DB-Zuweisungen sinnvoll prüfbar sind.
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Decision | Behavior | Test Type | Automated Command | File Exists |
|----------|----------|-----------|-------------------|-------------|
| D-01 | `/admin/users/[id]` rendert für gültige `userId`; `PlatformAdminGate` blockt Nicht-Admins | integration (Component) | `npx vitest run src/app/admin/users/[id]/page.test.tsx` | ❌ W0 |
| D-01 | Zurück-Link mit `?from=` restauriert exakte Query-String; ohne `from` → `/admin/users` | unit (Component) | `npx vitest run src/app/admin/users/[id]/UserDetailPageClient.test.tsx -t "back link"` | ❌ W0 |
| D-02 | Keine `role="tablist"`/`role="tab"`-Elemente mehr; `Accordion`-Struktur vorhanden | unit (`queryAllByRole('tab')` → leer) | `npx vitest run src/app/admin/users/[id]/UserDetailPageClient.test.tsx -t "no tablist"` | ❌ W0 |
| D-03 | Items 1–4 initial `aria-expanded="true"` + gemountet; Items 5–9 initial collapsed + NICHT gemountet | unit (Component) | `npx vitest run src/app/admin/users/[id]/UserDetailPageClient.test.tsx -t "default open sections"` | ❌ W0 |
| D-03 (Lazy-Cache) | Item 5 öffnen → Fetch; schließen; erneut öffnen → KEIN zweiter Fetch (Pitfall 3) | unit (`vi.fn()`-Call-Count) | `npx vitest run src/app/admin/users/[id]/UserDetailPageClient.test.tsx -t "no refetch on reopen"` | ❌ W0 |
| D-04 (auflösbar) | `granted_roles`-Badge mit in Matrix existierendem `role_code` → Link mit korrektem `href` | unit (Component) | `npx vitest run src/app/admin/users/tabs/UserGroupRightsTab.test.tsx -t "resolvable role link"` | ❌ W0 |
| D-04 (historisch) | `role_code` nicht in Matrix → Plain-Badge, kein Link | unit (Component) | `npx vitest run src/app/admin/users/tabs/UserGroupRightsTab.test.tsx -t "unresolvable role no link"` | ❌ W0 |
| D-04 (globale Rolle) | `UserGlobalRolesTab`-Badge (`platform_admin`) → IMMER Plain-Badge (Pitfall 1, Regressionsschutz) | unit (Component) | `npx vitest run src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx -t "global role never links"` | ❌ W0 |
| D-05 (count > 0) | `RoleMasterList` zeigt `N× vergeben` als Link zu `/admin/users?role={code}` | unit (Component) | `npx vitest run src/app/admin/role-capabilities/RoleMasterList.test.tsx -t "impact count link"` | ❌ W0 (Datei existiert) |
| D-05 (count = 0) | `0× vergeben` als `Badge variant="muted"`, KEIN Link | unit (Component) | `npx vitest run src/app/admin/role-capabilities/RoleMasterList.test.tsx -t "zero count no link"` | ❌ W0 |
| D-05 (non-countable) | Gruppen-/Contribution-Rolle ohne `global_assignment_count` zeigt `–`, kein Link | unit (Component) | `npx vitest run src/app/admin/role-capabilities/RoleMasterList.test.tsx -t "non-countable dash"` | ❌ W0 |
| D-05 (Backend) | `ListCapabilityMatrix()` liefert korrekten `global_assignment_count` je globaler Rolle | integration (Go, testify) | `go test ./internal/repository/... -run TestListCapabilityMatrix_GlobalRoleCounts` | ❌ W0 |
| D-06 (round-trip) | Filter setzen → URL enthält `q`/`status`/`role`; Reload mit URL → Filter-UI korrekt | unit (`useSearchParams`-Mock) | `npx vitest run src/app/admin/users/AdminUsersClient.test.tsx -t "url filter roundtrip"` | ❌ W0 (neue Datei) |
| D-06 (Deep-Link ohne `from`) | Direktaufruf `/admin/users/42` → Zurück-Link zeigt auf `/admin/users` (kein Query) | unit (Component) | `npx vitest run src/app/admin/users/[id]/UserDetailPageClient.test.tsx -t "no from param fallback"` | ❌ W0 |
| D-06 (Impact-Sprung) | Impact-Klick von `?role=x` → `/admin/users?role=y` löscht alte role, sonst nichts | unit (Component) | `npx vitest run src/app/admin/role-capabilities/RoleMasterList.test.tsx -t "impact jump clears other params"` | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/app/admin/users/page.test.tsx` — **überarbeiten, nicht nur ergänzen**: bestehende Tests `clicking_row_opens_drawer` / `clicking_row_keeps_table_visible_on_desktop` testen das durch D-01/D-02 entfernte Verhalten (Drawer, `role="tab"`) → durch Navigation-Tests (Link statt Drawer-State) ersetzen.
- [ ] `frontend/src/app/admin/users/UserDetailDrawer.test.tsx` — wird mit `UserDetailDrawer.tsx` gelöscht (D-01); expliziter Lösch-Task.
- [ ] `frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx` — neu; D-01/D-02/D-03/D-06.
- [ ] `frontend/src/app/admin/users/[id]/page.test.tsx` — neu; D-01 Route-Gate.
- [ ] `frontend/src/app/admin/users/AdminUsersClient.test.tsx` — neu (existiert noch nicht separat); D-06 URL-Filter.
- [ ] `frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx` / `UserGlobalRolesTab.test.tsx` — neu; D-04.
- [ ] `frontend/src/app/admin/role-capabilities/RoleMasterList.test.tsx` — erweitern um D-05-Fälle.
- [ ] `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx` — erweitern um `?role=`-Vorauswahl-Test.
- [ ] Go-Test für `ListCapabilityMatrix()`-Erweiterung (`backend/internal/repository/…_test.go`, Datei ggf. neu).

---

## Manual-Only Verifications

| Behavior | Decision | Why Manual | Test Instructions |
|----------|----------|------------|-------------------|
| RBAC-Querverlinkung mit echten DB-Zuweisungen (Link-Ziele, Impact-Count-Zahlen stimmen mit realer Nutzerverteilung) | D-04, D-05 | Aussagekräftig nur mit echten `app_user_global_roles`-Daten, nicht mit Mocks | Live auf `:3000`: User-Detail öffnen → „Was darf diese Rolle?" folgen; auf role-capabilities Impact-Count klicken → gefilterte Liste prüfen. Nach Frontend-Edit `docker restart team4sv30-frontend` + Strg+F5; nach Go-Edit `docker compose up -d --build team4sv30-backend`. |
| „Exakte vorherige Liste" nach Zurück-Link visuell korrekt (Filter + Scroll/Seite) | D-01, D-06 | Zusammenspiel URL-State ↔ Navigation ist end-to-end zu erfahren | Liste filtern → Zeile öffnen → „Zurück zur Liste" → identischer Filterzustand? |

---

## Validation Sign-Off

- [ ] All decisions D-01…D-06 have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (incl. `page.test.tsx` rewrite + Drawer-Test-Löschung)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
