---
phase: 80-admin-users-user-detail-drawer-scoped-rechte
plan: "02"
subsystem: admin-users
tags:
  - tdd-red
  - wave-0
  - test-scaffold
  - go-handler-tests
  - vitest-tests
  - last-admin-guard
  - gedenkprofil
dependency_graph:
  requires:
    - backend/internal/models/admin_users.go
    - backend/internal/repository/authz.go (CountActivePlatformAdmins)
    - frontend/src/types/admin-users.ts
    - frontend/src/components/auth/PlatformAdminGate.tsx (Bugfix aus 80-01)
  provides:
    - backend/internal/repository/admin_users_repository_test.go
    - backend/internal/handlers/admin_users_handler_test.go
    - frontend/src/lib/api.admin-users.test.ts
    - frontend/src/components/auth/PlatformAdminGate.test.tsx (ergänzt)
    - frontend/src/app/admin/users/page.test.tsx
    - frontend/src/app/admin/users/UserDetailDrawer.test.tsx
    - frontend/src/app/admin/users/tabs/UserClaimsTab.test.tsx
  affects:
    - Plan 80-03 (Backend-Handler und Repository implementieren gegen diese Tests)
    - Plan 80-04 (Frontend-Komponenten implementieren gegen page.test.tsx / UserDetailDrawer.test.tsx)
    - Plan 80-05 (UserClaimsTab.tsx implementieren gegen UserClaimsTab.test.tsx)
tech_stack:
  added: []
  patterns:
    - Wave-0-RED-TDD-Pattern (Testdateien vor Implementierung, t.Skip() für Repository-Tests)
    - Interface-Stub-Pattern (adminUsersRepoStub / adminAuthzRepoStub ohne echte DB)
    - vi.mock-Pattern für noch nicht existierende API-Helper und Komponenten
    - Separation von Go-Compile-Fehler-RED (Handler) vs. t.Skip-RED (Repository)
key_files:
  created:
    - backend/internal/repository/admin_users_repository_test.go
    - backend/internal/handlers/admin_users_handler_test.go
    - frontend/src/lib/api.admin-users.test.ts
    - frontend/src/app/admin/users/page.test.tsx
    - frontend/src/app/admin/users/UserDetailDrawer.test.tsx
    - frontend/src/app/admin/users/tabs/UserClaimsTab.test.tsx
    - frontend/src/app/admin/users/ (Verzeichnis neu)
    - frontend/src/app/admin/users/tabs/ (Verzeichnis neu)
  modified:
    - frontend/src/components/auth/PlatformAdminGate.test.tsx (Regression ergänzt)
decisions:
  - "Repository-Tests mit t.Skip() (kompilieren, laufen als SKIP) statt Compile-Fehler, da AdminUsersRepository-Methoden noch nicht definiert sind aber das Package sonst grün ist"
  - "Handler-Tests mit echten Stub-Typen (adminUsersRepoStub) die das ERWARTETE Interface abbilden; Compile-Fehler auf AdminUsersHandler/NewAdminUsersHandler ist beabsichtigt (RED)"
  - "UserClaimsTab.test.tsx hat drei Tests: memorial-Badge, keine Mutations-Controls und kein-Badge-bei-aktiv-Profil; letzter Test als Sicherheitsnetz gegen False-Positive"
  - "PlatformAdminGate-Regression ergänzt statt neue Datei, um bestehende Test-Struktur nicht zu duplizieren"
  - "Frontend-Tests nutzen vi.mock('@/lib/api') mit vollständigen Mock-Shapes aus admin-users.ts, damit die Tests bei Implementierung nur den Import-Fix benötigen"
metrics:
  duration: "22min"
  completed_date: "2026-06-15"
  tasks: 1
  files: 7
---

# Phase 80 Plan 02: Wave-0 RED-Testgerüst — Summary

**One-liner:** 7 RED-Testdateien für Platform-Admin-Gate (403), Last-Admin-Guard (Revoke+Disable, 409), member_id-Anker, Conflict-Count (D-17/D-18), Gedenkprofil-Badge (D-J read-only) und 9-Tab-Drawer.

## Tasks

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Wave-0 RED-Testgerüst (alle 7 Dateien) | 35f30390 | Abgeschlossen |

## Ergebnisse

### Backend Repository-Tests (admin_users_repository_test.go)

Drei Tests mit t.Skip()-RED-Strategie (kompiliert sauber, läuft als SKIP):

- `TestAdminUsersRepository_ListAdminUsersPage_PageFirstCTE` — beschreibt Erwartung an Page-First-CTE-Logik (LATERAL-Aggregate auf paginierter Page-CTE)
- `TestAdminUsersRepository_MemberIDAnchor_CanonicalFirst` — beschreibt Erwartung an `WHERE ac.member_id = $1` statt Legacy-`fansub_group_member_id`
- `TestAdminUsersRepository_ConflictCount_D17_D18` — beschreibt Vollständigkeit der 7 Konflikttypen (4 D-17 + 3 D-18)

RED-Status: `go vet ./internal/repository/...` → OK (kein Fehler). Tests laufen als SKIP mit aussagekräftiger RED-Nachricht.

### Backend Handler-Tests (admin_users_handler_test.go)

Fünf Tests mit Stub-Interface-Pattern:

- `TestAdminUsersHandler_ListUsers_NonPlatformAdmin_Returns403` — Platform-Admin-Gate-Check (T-80-02-01)
- `TestAdminUsersHandler_AssignGlobalRole_AuditsAllowed` — Audit-Write mit EventType "app_user_global_role.assigned" und Outcome "allowed"
- `TestAdminUsersHandler_RevokeGlobalRole_LastAdminGuard_Returns409` — Last-Admin-Guard für Revoke (T-80-02-02); kein Audit bei Ablehnung
- `TestAdminUsersHandler_UpdateUserStatus_Disable_AuditsAllowed` — Audit-Write mit EventType "app_user_status.disabled"
- `TestAdminUsersHandler_UpdateUserStatus_Disable_LastAdminGuard_Returns409` — Last-Admin-Guard für Disable (T-80-02-03); kein Audit bei Ablehnung

RED-Status: `go vet ./internal/handlers/...` → `undefined: AdminUsersHandler` (erwartet, da admin_users_handler.go fehlt). Kein Syntaxfehler in der Testdatei selbst.

### Frontend API-Tests (api.admin-users.test.ts)

Drei Tests:

- `listAdminUsersPage_serializes_all_params` — prüft URL mit allen 7 AdminUserListParams-Feldern
- `listAdminUsersPage_throws_ApiError_on_non200` — prüft ApiError bei HTTP 403
- `getAdminUserOverview_returns_typed_response` — prüft Response-Typisierung (id, email, conflict_details)

RED-Status: TypeScript-Fehler TS2724/TS2305: 'listAdminUsersPage' und 'getAdminUserOverview' noch nicht in api.ts exportiert.

### PlatformAdminGate-Regression (PlatformAdminGate.test.tsx)

Test ergänzt (bestehende Datei, 3 Tests insgesamt nach Ergänzung):

- `renders_admin_content_with_refresh_token_only` — Regression für Pitfall 5 (T-80-01-02): hasRefreshToken=true ohne hasAccessToken → Gate zeigt Admin-Inhalt

RED-Status: Test läuft, da PlatformAdminGate.tsx bereits in 80-01 gefixt wurde. Dieser Test sichert die Regression ab (sollte GREEN sein sobald 80-03/04 fertig sind).

### Frontend Page-Tests (page.test.tsx)

Drei Tests:

- `renders_table_with_all_required_columns` — 11 Spaltenköpfe gemäss UI-SPEC
- `renders_filter_elements` — Status-Select und Suchfeld vorhanden
- `clicking_row_opens_drawer` — Klick auf Zeile öffnet Drawer

RED-Status: TS2307: Cannot find module './page' (AdminUsersPage existiert noch nicht).

### Frontend Drawer-Tests (UserDetailDrawer.test.tsx)

Drei Tests:

- `renders_nine_tabs` — 9 Tab-Labels aus UI-SPEC
- `tabs_lazy_load_on_first_activation` — API-Call nur bei erstem Tab-Aktivieren
- `scoped_tabs_have_no_mutation_controls` — Gruppenrechte-/Beiträge-Tab ohne Mutations-Buttons

RED-Status: TS2307: Cannot find module './UserDetailDrawer'.

### Frontend UserClaimsTab-Tests (tabs/UserClaimsTab.test.tsx)

Drei Tests:

- `renders_memorial_badge_when_profile_status_is_memorial` — "Gedenkprofil"-Badge bei profile_status='memorial' (D-J)
- `claims_tab_has_no_edit_or_mutation_controls` — keine Bearbeiten/Verifizieren/Entziehen/Ablehnen/Status-ändern-Buttons
- `does_not_render_memorial_badge_for_active_profile` — kein Badge bei profile_status='active'

RED-Status: TS2307: Cannot find module './UserClaimsTab'.

## Deviations from Plan

**1. [Rule 2 - Erweiterung] UserClaimsTab.test.tsx: dritter Test als Sicherheitsnetz**

- **Gefunden während:** Task 1 (Test-Erstellung)
- **Problem:** Zwei Tests (memorial-Badge, keine Mutations-Controls) könnten durch leere Mock-Response False-Positives erzeugen wenn die Implementierung nie rendert
- **Fix:** Dritter Test `does_not_render_memorial_badge_for_active_profile` als Sicherheitsnetz hinzugefügt
- **Dateien:** frontend/src/app/admin/users/tabs/UserClaimsTab.test.tsx
- **Commit:** 35f30390

**2. [Rule 2 - Erweiterung] Repository-Tests mit t.Skip() statt Interface-Assertion**

- **Gefunden während:** Task 1 (Go-Kompilierung)
- **Problem:** Die Repository-Tests würden mit einer `var _ AdminUsersRepository = (*AdminUsersRepository)(nil)`-Assertion sofort Compile-Fehler erzeugen, die das gesamte repository-Package blockieren und andere Repository-Tests unlauffähig machen würden
- **Fix:** t.Skip() mit aussagekräftiger RED-Nachricht; Interface-Contract als Kommentar dokumentiert; andere Repository-Tests bleiben grün
- **Dateien:** backend/internal/repository/admin_users_repository_test.go
- **Commit:** 35f30390

## Known Stubs

Keine. Diese Dateien enthalten ausschliesslich Tests, keine Produktionscode-Stubs oder Platzhalter-Render-Logik.

## Threat Flags

Keine neuen Security-Surface-Bereiche. Die Tests verifizieren bestehende Sicherheitsanforderungen (T-80-02-01 bis T-80-02-04).

## Self-Check: PASSED

- [x] backend/internal/repository/admin_users_repository_test.go existiert (kompiliert, 3 SKIP-Tests)
- [x] backend/internal/handlers/admin_users_handler_test.go existiert (5 Tests, RED via `undefined: AdminUsersHandler`)
- [x] frontend/src/lib/api.admin-users.test.ts existiert (3 Tests, RED via fehlende api.ts-Exports)
- [x] frontend/src/components/auth/PlatformAdminGate.test.tsx enthält Regression-Test (3 Tests total)
- [x] frontend/src/app/admin/users/page.test.tsx existiert (3 Tests, RED via fehlende page.tsx)
- [x] frontend/src/app/admin/users/UserDetailDrawer.test.tsx existiert (3 Tests, RED via fehlende Komponente)
- [x] frontend/src/app/admin/users/tabs/UserClaimsTab.test.tsx existiert (3 Tests, RED via fehlende Komponente)
- [x] Commit 35f30390 vorhanden
