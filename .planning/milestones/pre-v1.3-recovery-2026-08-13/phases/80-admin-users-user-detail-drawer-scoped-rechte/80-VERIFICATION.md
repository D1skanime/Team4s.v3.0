---
phase: 80-admin-users-user-detail-drawer-scoped-rechte
verified: 2026-06-17T18:35:00Z
status: passed
score: 15/15 must-haves verified
overrides_applied: 0
re_verification: null
---

# Phase 80: `/admin/users` + User Detail Drawer (scoped Rechte) — Verifikationsbericht

**Phasen-Ziel:** Globale User- und Rechteübersicht: `/admin/users`-Liste plus User-Detail-Drawer als Rechte-/Übersichtszentrale, mit strikt gescopten Rechten und vollständigem Audit — erster Ausbau, nicht jede Spezialberechtigung sofort editierbar.

**Verifiziert:** 2026-06-17T18:35:00Z
**Status:** passed
**Re-Verifikation:** Nein — erste Verifikation nach abgeschlossener Human-UAT (7/7 Schritte bestanden)

---

## Ziel-Erreichung

### Beobachtbare Wahrheiten

| # | Wahrheit | Status | Evidenz |
|---|----------|--------|---------|
| 1 | Backend-DTOs (Go + TypeScript) vollständig und kohärent | VERIFIED | `backend/internal/models/admin_users.go` (206 Z.), `frontend/src/types/admin-users.ts` (227 Z.); json-Tags 1:1 gespiegelt |
| 2 | `RevokeAppUserGlobalRole` + `CountActivePlatformAdmins` in `authz.go` | VERIFIED | Zeilen 159 / 180 in `backend/internal/repository/authz.go`; beide Methoden implementiert |
| 3 | PlatformAdminGate prüft `!hasAccessToken && !hasRefreshToken` | VERIFIED | `PlatformAdminGate.tsx` Zeile 26; `hasRefreshToken` wird korrekt aus `useAuthSession` extrahiert und im Guard geprüft |
| 4 | GET `/admin/users` mit Page-First-CTE + LATERAL-Aggregaten (kein N+1) | VERIFIED | `admin_users_queries.go` Zeilen 14–125: vollständige CTE mit LATERAL-Joins für alle D-05-Aggregate |
| 5 | Alle 12 Endpunkte in `admin_routes.go` registriert, durch `requirePlatformAdminIdentity` gesichert | VERIFIED | `admin_routes.go` Zeilen 143–157: 12 Routen; `admin_users_handler.go`: 10x Gate-Aufruf; `admin_users_mutations_handler.go`: 3x Gate-Aufruf |
| 6 | Last-Admin-Guard bei RevokeGlobalRole und UpdateUserStatus (409) | VERIFIED | `admin_users_mutations_handler.go` Zeilen 76–90 (Revoke) und 140–164 (Disable); `CountActivePlatformAdmins <= 1` → HTTP 409 mit deutschem Fehlertext |
| 7 | Jede Rollen-/Status-Mutation schreibt AuditLogEntry mit Pflichtfeldern | VERIFIED | `admin_users_mutations_handler.go`: AuditLogEntry mit `ActorAppUserID`, `EventType`, `TargetType`, `TargetID`, `Action`, `Outcome`, `Payload` bei Assign, Revoke, Disable, Reactivate |
| 8 | Contributions-Endpunkt liest `anime_contributions.member_id` zuerst (D-12) | VERIFIED | `admin_users_tab_repository.go` Zeile 194: `WHERE ac.member_id = $1`; Kommentar Zeile 144 expliziert Anker-Entscheidung; `fansub_group_member_id` nur als Legacy-Fallback |
| 9 | `/admin/users` Route durch `PlatformAdminGate` geschützt | VERIFIED | `frontend/src/app/admin/users/page.tsx`: `<PlatformAdminGate>` umschliesst `<AdminUsersClient />`; `export const dynamic = 'force-dynamic'` |
| 10 | `AdminUsersClient.tsx` mit 11 UI-SPEC-Spalten, Filter, Suche, Pagination | VERIFIED | Zeilen 189–199: alle Spaltenköpfe (Benutzer, Status, Globale Rollen, Member-Profil, Gruppen, Leader-Kontext, Offene Claims, Beiträge, Medienuploads, Letzte Aktivität, Konflikte); Input, Select, Button aus `@/components/ui`; 346 Zeilen |
| 11 | `UserDetailDrawer.tsx` mit 9 Tabs in Spec-Reihenfolge + Lazy-Load via `activatedTabs` | VERIFIED | Zeilen 38–48 (TABS-Array), 53 (`activatedTabs`-State), 97–123 (Lazy-Load-Bedingungen); alle 9 Tab-Komponenten verdrahtet |
| 12 | Alle 9 Tab-Dateien vollständig implementiert (nicht nur Stubs) | VERIFIED | UserOverviewTab (332 Z.), UserGlobalRolesTab (388 Z.), UserClaimsTab (179 Z.) mit Gedenkprofil-Badge; alle weiteren Tabs voll implementiert; kein native `<select>/<input>/<button>` |
| 13 | Admin-Nav-Link zu `/admin/users` auf `/admin/page.tsx` | VERIFIED | Zeile 42: `<Link href="/admin/users">Benutzer &amp; Rechte</Link>`; commit 3691df23 (UAT-Fund, nach UAT committed) |
| 14 | SQL-Spaltenfehler in Repository-Queries korrigiert | VERIFIED | commit eccb86c0: 6 falsche Spaltennamen korrigiert (fgmr.role_code→role, rvm.uploaded_by_app_user_id→uploaded_by_user_id, mc.claim_type/resolved_at, fgm.member_status/joined_at, ma.Felder); per EXPLAIN gegen Live-DB validiert (12/12 Queries sauber) |
| 15 | Wave-0-Tests GREEN (Backend + Frontend) | VERIFIED | `go test ./internal/handlers -run AdminUsers`: 5/5 PASS; `go test ./internal/repository -run AdminUsers`: 3/3 PASS; Frontend vitest: page.test.tsx 3/3, UserDetailDrawer.test.tsx 3/3, UserClaimsTab.test.tsx 3/3, PlatformAdminGate.test.tsx 3/3, api.admin-users.test.ts 3/3 |

**Ergebnis:** 15/15 Wahrheiten verifiziert

---

### Erforderliche Artefakte

| Artefakt | Beschreibung | Status | Details |
|----------|-------------|--------|---------|
| `backend/internal/models/admin_users.go` | Go-DTOs alle Phase-80-Endpunkte | VERIFIED | 206 Zeilen; alle 11 Structs + 7 Konflikt-Konstanten |
| `backend/internal/repository/authz.go` | RevokeAppUserGlobalRole + CountActivePlatformAdmins | VERIFIED | Zeilen 159–193 |
| `backend/internal/repository/admin_users_repository.go` | AdminUsersRepository mit Page-Query + Übersicht | VERIFIED | 194 Zeilen; ListAdminUsersPage, GetUserOverview, GetUserGlobalRoles |
| `backend/internal/repository/admin_users_tab_repository.go` | Tab-Queries (Claims, Memberships, Rights, Contributions, Media, Audit) | VERIFIED | member_id-Anker dokumentiert und korrekt |
| `backend/internal/repository/admin_users_queries.go` | SQL-Konstanten für Page-CTE und Übersicht-Query | VERIFIED | Page-First-CTE mit vollständigen LATERAL-Joins |
| `backend/internal/handlers/admin_users_handler.go` | AdminUsersHandler GET-Endpunkte | VERIFIED | 321 Zeilen; 10x requirePlatformAdminIdentity |
| `backend/internal/handlers/admin_users_mutations_handler.go` | AssignGlobalRole, RevokeGlobalRole, UpdateUserStatus | VERIFIED | 189 Zeilen; Last-Admin-Guard + Audit auf allen 3 Mutations |
| `backend/cmd/server/admin_routes.go` | 12 Routen registriert | VERIFIED | Zeilen 143–157 |
| `backend/cmd/server/main.go` | AdminUsersHandler verdrahtet | VERIFIED | Zeilen 407, 424 |
| `shared/contracts/admin-content.yaml` | OpenAPI-Dokumentation aller Endpunkte | VERIFIED | 12 Treffer für `/admin/users` |
| `frontend/src/types/admin-users.ts` | TypeScript-Interfaces | VERIFIED | 227 Zeilen; alle Interfaces spiegeln json-Tags 1:1 |
| `frontend/src/lib/api.ts` | 12 API-Helper-Funktionen via `apiClientFetch` | VERIFIED | listAdminUsersPage + 11 Detail-/Mutations-Helper; alle via apiClientFetch |
| `frontend/src/app/admin/users/page.tsx` | Route-Shell mit PlatformAdminGate | VERIFIED | 15 Zeilen; minimal, korrekt |
| `frontend/src/app/admin/users/AdminUsersClient.tsx` | Tabellen-Controller | VERIFIED | 346 Zeilen; alle Spalten, Filter, Drawer-State |
| `frontend/src/app/admin/users/UserDetailDrawer.tsx` | Drawer + 9-Tab-Komposition | VERIFIED | 128 Zeilen; activatedTabs-Lazy-Load |
| `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` | Übersicht-Tab mit Stat-Grid + Accountstatus-Mutation | VERIFIED | 332 Zeilen; StatGrid, ConflictsSection, AccountStatusSection |
| `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx` | Rollen-Tab mit Vergabe/Entzug-Modals | VERIFIED | 388 Zeilen; RevokeModal, AssignModal mit Last-Admin-Guard-Fehlermeldung |
| `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx` | Claims-Tab mit Gedenkprofil-Badge (read-only) | VERIFIED | 179 Zeilen; profile_status 'memorial' → Badge "Gedenkprofil"; keine Mutations-Controls |
| `frontend/src/components/auth/PlatformAdminGate.tsx` | hasRefreshToken-Bugfix | VERIFIED | Zeile 26: `!hasAccessToken && !hasRefreshToken` |

---

### Key-Link-Verifikation

| Von | Nach | Via | Status |
|-----|------|-----|--------|
| `page.tsx` | `PlatformAdminGate.tsx` | `<PlatformAdminGate>` umschliesst `<AdminUsersClient />` | WIRED |
| `AdminUsersClient.tsx` | `frontend/src/lib/api.ts` | `listAdminUsersPage(params)` in `loadUsers` useCallback | WIRED |
| `UserDetailDrawer.tsx` | alle 9 Tab-Komponenten | `activatedTabs.has(id) && <UserXxxTab userId={userId} />` | WIRED |
| `admin_users_handler.go` | `admin_users_repository.go` | `AdminUsersRepository`-Interface; `h.repo.ListAdminUsersPage(...)` | WIRED |
| `admin_routes.go` | `admin_users_handler.go` | `deps.adminUsersHandler.ListUsers` etc. in nil-Guard-Block | WIRED |
| `main.go` | `admin_routes.go` | `adminUsersHandler: adminUsersHandler` in `adminRouteHandlers`-Literal | WIRED |
| `api.ts` | `GET /api/v1/admin/users` | `apiClientFetch` mit URLSearchParams | WIRED |
| `UserGlobalRolesTab.tsx` | `api.ts` (`revokeAdminUserGlobalRole`) | HTTP 409 → Inline-Fehlermeldung im Modal | WIRED |

---

### Datenfluss-Trace (Level 4)

| Artefakt | Datenvariable | Quelle | Echt-Daten | Status |
|----------|--------------|--------|------------|--------|
| `AdminUsersClient.tsx` | `items: AdminUserListItem[]` | `listAdminUsersPage(params)` → `GET /api/v1/admin/users` → `ListAdminUsersPage` → CTE-Query auf `app_users` + LATERAL-Joins | Ja — echte DB-Queries auf `app_users`, `app_user_global_roles`, `fansub_group_members`, `member_claims`, `anime_contributions`, `release_version_media` | FLOWING |
| `UserOverviewTab.tsx` | `data: AdminUserOverviewResponse` | `getAdminUserOverview(userId)` → `GetUserOverview` → `adminUsersOverviewQuery` | Ja — echte DB-Query | FLOWING |
| `UserGlobalRolesTab.tsx` | `data: AdminUserGlobalRolesResponse` | `getAdminUserGlobalRoles(userId)` → `GetUserGlobalRoles` → SELECT auf `app_user_global_roles` | Ja — echte DB-Query | FLOWING |
| `UserClaimsTab.tsx` | `data: AdminUserMemberClaimsResponse` | `getAdminUserMemberClaims(userId)` → `GetUserMemberClaims` → DB-Query auf `member_claims` + `members` | Ja | FLOWING |

---

### Behavioraler Spot-Check

| Verhalten | Evidenz | Status |
|-----------|---------|--------|
| Backend baut fehlerfrei | `go build ./...` → kein Output (exit 0) | PASS |
| TypeCheck fehlerfrei | `tsc --noEmit` → kein Output (exit 0) | PASS |
| Handler-Tests 5/5 | `go test ./internal/handlers -run AdminUsers` → `ok ... 0.217s` | PASS |
| Repository-Tests 3/3 | `go test ./internal/repository -run AdminUsers` → `ok ... 0.174s` | PASS |
| Frontend-Tests 15/15 | vitest für page, Drawer, Claims, PlatformAdminGate, api.admin-users → alle 5 Test-Dateien PASS | PASS |
| requirePlatformAdminIdentity-Dichte | `grep -c requirePlatformAdminIdentity admin_users_handler.go` → 10 (jeder GET-Handler); + 3 in mutations | PASS |
| Kein natives HTML in UI-Komponenten | `grep -rn "<select\|<input\|<textarea\|<button" frontend/src/app/admin/users/` → keine Treffer | PASS |
| Alle Dateien <= 450 Zeilen | wc -l: AdminUsersClient 346, UserDetailDrawer 128, UserGlobalRolesTab 388, UserOverviewTab 332, admin_users_handler 321, admin_users_repository 194 | PASS |
| UAT 7/7 Schritte bestanden | Live gegen :3000 + Backend :8092 + echte DB team4s_v2 | PASS (menschliche Verifikation) |

---

### Anforderungsabdeckung

| Anforderung | Plan | Beschreibung | Status |
|-------------|------|-------------|--------|
| Entscheidung D-01 | 80-03/80-05 | Globale Rollen editierbar (Vergabe/Entzug) mit Audit | SATISFIED — UserGlobalRolesTab + AssignGlobalRole/RevokeGlobalRole mit Audit |
| Entscheidung D-02 | 80-05 | Accountstatus editierbar (active/disabled); pending read-only | SATISFIED — UpdateUserStatus in Handler; validAdminUserStatusValues enthält nur active/disabled |
| Entscheidung D-03 | 80-05 | Scoped Gruppen-/Release-Rechte read-only im Drawer | SATISFIED — UserGroupRightsTab enthält keine Schreibcontrols; D-03-Kommentar in Artefakt-Docstring |
| Entscheidung D-05 | 80-03/80-04 | Breite Aggregat-Tabelle mit allen Counts | SATISFIED — 11 Spalten in AdminUsersClient; alle D-05-Felder in ListAdminUsersPage-CTE |
| Entscheidung D-06 | 80-04 | Suche + Filter Accountstatus/Rolle/Konflikte | SATISFIED — Input, 2x Select, Konflikte-Toggle im Filter-Bereich |
| Entscheidung D-07 | 80-03 | Server-seitige Pagination, kein N+1 | SATISFIED — Page-First-CTE mit LATERAL-Joins; Limit-Cap 100 in Handler |
| Entscheidung D-08 | 80-04/80-05 | Nur @/components/ui-Primitives | SATISFIED — kein natives HTML in Produktcode |
| Entscheidung D-09 | 80-04 | Lazy-Load pro Tab | SATISFIED — activatedTabs-State; Tab-Render nur bei has() |
| Entscheidung D-10 | 80-05 | Scoped Domains read-only, Deep-Links in kanonische Flächen | SATISFIED — GroupMemberships/GroupRights/Contributions-Tabs ohne Schreibcontrols |
| Entscheidung D-11 | 80-04/80-05 | Modulare Tab-Komponenten (kein Monolith) | SATISFIED — je eigene Datei unter tabs/ |
| Entscheidung D-12 | 80-03 | member_id-Anker zuerst in Contributions-Query | SATISFIED — `WHERE ac.member_id = $1`; COALESCE-Fallback nur im Legacy-Pfad |
| Entscheidung D-17/D-18 | 80-03 | Konflikt-Typen berechnet (4+3) | SATISFIED — adminUsersConflictDetailsQuery + adminUsersListQuery Conflict-Subquery |
| Entscheidung D-19 | 80-03/80-05 | Warn-Badge mit conflict_count in Liste und Filter | SATISFIED — ConflictCount-Spalte mit Badge(variant="warning"); has_conflicts-Filter |

---

### Anti-Pattern-Scan

| Datei | Muster | Schweregrad | Befund |
|-------|--------|-------------|--------|
| Alle Phase-80-Dateien | TBD/FIXME/XXX | Keines | Kein einziger Eintrag gefunden |
| Alle Phase-80-Dateien | Natives HTML (select/input/textarea/button) | Keines | Kein Treffer in Produktcode |
| `admin_users_queries.go` | Stubs (return null / leere Arrays ohne Query) | Keines | Alle Queries lesen echte DB-Tabellen |

---

### Menschliche Verifikation erforderlich

Keine weiteren menschlichen Checks erforderlich. Die Human-UAT ist abgeschlossen (7/7 Schritte gegen den Live-Stack bestanden).

---

### Follow-up-Empfehlung (nicht blockierend)

**Wave-0-Repository-Tests nutzen Interface-Assertions statt echter DB-Queries**

Die Repository-Tests (`admin_users_repository_test.go`) prüfen Kompilier-Korrektheit und Interface-Erfüllung, führen aber keine SQL gegen die Datenbank aus. Dadurch konnten die 6 Spaltenfehler (falsche Spaltennamen) die initiale Wave-0-Phase passieren und wurden erst durch den Live-UAT entdeckt.

**Empfehlung:** In einem separaten Folge-Task Integrationstests mit `testcontainers-go` oder einem SQL-Fixture-Ansatz ergänzen, die die Aggregat-Query zumindest gegen eine minimale In-Memory- oder Test-DB-Instanz ausführen — analog zu wie es in Phase 78 für fansub_media_review_handler_test.go vorbereitet wurde. Die `t.Skip()`-Alternative im SUMMARY erwähnt — entspricht **nicht** dem tatsächlichen Befund (keine t.Skip()-Aufrufe im finalen Code; die Interface-Assertion-Strategie ersetzt echte DB-Tests vollständig).

---

## Gesamtbewertung

**Status: passed** — Das Phasen-Ziel ist vollständig erreicht.

Die Route `/admin/users` existiert, ist durch `PlatformAdminGate` gesichert, liefert eine vollständige Aggregat-Tabelle mit Suche/Filter/Pagination und öffnet bei Zeilen-Klick einen 9-Tab-Drawer. Alle Tabs sind implementiert (nicht nur Stubs). Der Last-Admin-Guard greift bei Rolle-Entzug (409) und Deaktivierung des letzten Platform-Admins. Alle Mutationen werden auditiert. Der member_id-Anker ist in der Contributions-Query korrekt umgesetzt. 12 Backend-Endpunkte sind durch `requirePlatformAdminIdentity` gesichert. Die SQL-Spaltenfehler aus der initialen Implementierung wurden durch Live-UAT entdeckt und per Commit eccb86c0 korrigiert. Go-Build, TypeCheck und alle 15 Frontend- und 8 Backend-Tests sind grün.

---

_Verifiziert: 2026-06-17T18:35:00Z_
_Verifikator: Claude (gsd-verifier, Sonnet 4.6)_
