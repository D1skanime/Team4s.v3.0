# Phase 80: admin-users-user-detail-drawer-scoped-rechte - Research

**Researched:** 2026-06-14 [VERIFIED: system date]
**Domain:** Team4s platform-admin user/rights overview, scoped authorization, audit, admin UI, Phase-83-Default/Override-Modell [VERIFIED: .planning/phases/80-admin-users-user-detail-drawer-scoped-rechte/80-CONTEXT.md]
**Confidence:** HIGH für Schema/Seams/Phase-83-Auflösung (Live-Code verifiziert), MEDIUM für Aggregat-Query-Performance bis EXPLAIN auf repräsentativen Daten läuft [VERIFIED: source inspection]

<user_constraints>
## User Constraints (from CONTEXT.md)

Quelle: `.planning/phases/80-admin-users-user-detail-drawer-scoped-rechte/80-CONTEXT.md` — Amendment 2026-06-12. [VERIFIED: 80-CONTEXT.md]

### Locked Decisions

#### Phase Boundary

Start der globalen User- und Rechtezentrale: `/admin/users`-Liste plus User-Detail-Drawer als Rechte-/Übersichtszentrale. Erster Ausbau — nicht jede Spezialberechtigung ist sofort editierbar. Greenfield (keine bestehende `/admin/users`-Route).

**Post-82/83 Update (2026-06-12):** Phase 80 bleibt globale Plattform-Admin-Übersicht, muss aber das neue Fansub-Release-Modell verstehen:
- `anime_contributions.member_id` ist der kanonische Member-Anker.
- `anime_contributions.fansub_group_member_id` ist Legacy/Fallback (nach Migration 0105 nullable).
- Projektweite Contributions (`release_version_id IS NULL`) sind Default-Mitwirkende für Release-Versionen.
- Release-Version-Overrides gelten nur für die konkrete Release-Version.
- Contributor-Medien und Notizen leben in `/me/releases/[versionId]/workspace`; `/admin/users` zeigt und verlinkt, dupliziert die Arbeitsfläche aber nicht.

**Gelockt aus Milestone v1.2, aktualisiert nach Phase 82/83:**
- Nur **Plattform-Admin** erreicht die globale Zentrale.
- Rechte werden scoped gedacht (gruppen-/release-version-bezogen), nie pauschal.
- Keine Rechte aus Contributions ableiten. Ausnahme Phase 83: Release-Version-Rechte dürfen aus dem expliziten Contribution-Mapping (Projekt-Default plus Release-Override) aufgelöst werden, solange der Scope konkret bleibt.
- Alle rechte-/statusändernden Aktionen sind auditierbar.
- Contract-Disziplin (Lock K): keine Ad-hoc-Fetches, keine neuen Endpunkte ohne OpenAPI- + Backend- + Frontend-Abgleich; API-Aufrufe über `frontend/src/lib/api.ts`.
- Drawer-Tabs: Übersicht, globale Rollen, Member-Profil/Claims, Gruppenmitgliedschaften, Gruppenrechte, Contributions, Medien, Audit, vorbereitete Streaming-Grants.

#### Implementation Decisions

- **D-01:** Globale Rollen (`app_user_global_roles`) sind in v1 editierbar.
- **D-02:** Accountstatus editierbar falls `app_users` editierbares Statusfeld besitzt (R-01 aufgelöst: ja).
- **D-03:** Scoped Gruppen-/Release-Version-Rechte im globalen Drawer read-only.
- **D-04:** Vorbereitete Streaming-Grants = sichtbarer Stub ohne Schreibaktion.
- **D-05 bis D-07:** Breite Aggregat-Tabelle, Server-seitige Pagination, keine N+1.
- **D-08 bis D-11:** Drawer-Reuse `@/components/ui`, Lazy-Load pro Tab, modulare Tab-Komponenten (keine Monolith-Kopie).
- **D-12 bis D-16 (Phase-82/83-Erweiterungen):**
  - **D-12:** `anime_contributions.member_id` zuerst; legacy `fansub_group_member_id -> hist_fansub_group_members.member_id` nur als Fallback.
  - **D-13:** Contributions-Tab gruppiert nach projektweiten Defaults, release-spezifischen Overrides, offenen/disputed und historischen/legacy.
  - **D-14:** Release-Version-Rechte im Drawer sind resolved read-only (Phase 80 zeigt aufgelösten Zustand).
  - **D-15:** `/me`-Workspace-Aktivität sichtbar: Mediauploads und Release-Notizen pro `release_version_id`, verlinkt.
  - **D-16:** Globaler Drawer bearbeitet Release-Notizen, Medien und Release-Contribution-Overrides **nicht** direkt.
- **D-17 bis D-19 (Konflikte):**
  - **D-17:** v1-Konflikte: offener Claim trotz Member-Profil, Gruppenmitglied ohne Rolle, Medien/Owner ohne gültigen Scope, offener Contribution-Dispute.
  - **D-18:** Phase-83-Zusatzkonflikte: Override auf ungültige/gelöschte Release-Version; Default und Override widersprechen sich; User hat Release-Medien/Notizen ohne aufgelöste Contribution-Berechtigung.
  - **D-19:** Warn-Badge in Listenzeile, Filter "nur mit Konflikten", Aufschlüsselung im Übersicht-Tab.

### Claude's Discretion

- Exakter Endpunktschnitt pro Tab und genaue OpenAPI-Form (innerhalb Lock K).
- Konkrete Spaltenreihenfolge/Verdichtung der breiten Tabelle, solange alle D-05-Aggregate vertreten sind.

### Deferred Ideas (OUT OF SCOPE)

- Direktes Bearbeiten scoped Gruppen-/Release-Rechte im globalen Drawer.
- Direktes Bearbeiten von Release-Contribution-Overrides im globalen Drawer.
- Voll funktionale Streaming-Grants.
- Weitere Spezialberechtigungen editierbar machen.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Beschreibung | Research-Support |
|----|--------------|------------------|
| Entscheidung I | Rechte scoped; `/admin/users` + User Detail Drawer starten; keine Rechte aus Contributions; keine pauschalen Medienrechte. | Platform-admin-only Backend-Gates, scoped read-only Rights-Tabs, Deep Links nach `/admin/fansubs/[id]/edit` für scoped Edits. [VERIFIED: backend/internal/permissions/permissions.go; VERIFIED: backend/internal/handlers/platform_admin_authz.go] |
| Entscheidung H | Claims, Requests und Contributions bleiben getrennt. | Drawer-Tabs fragen `member_claims`, `member_claim_invitations` und `anime_contributions` separat ab; keine Cross-Domain-Inference. [VERIFIED: database migrations 0081, 0086, 0092] |
| Entscheidung K | Contract/API-Disziplin: keine Ad-hoc-Fetches, keine neuen Endpunkte ohne OpenAPI/Backend/Frontend-Abgleich. | Neue Endpunkte müssen `shared/contracts/admin-content.yaml`, Backend-Handler, `frontend/src/types/*` und `frontend/src/lib/api.ts` gleichzeitig aktualisieren. [VERIFIED: docs/api/api-contracts.md] |
| Entscheidung J (Teil) | Memorial-Status ist Übersichtskontext, kein normal claimbarer Zustand. | Member-Profil-Tab zeigt `members.profile_status` read-only; keine Memorial-Mutation ohne Plattform-Admin-Seam. [VERIFIED: database/migrations/0097_v12_status_foundation.up.sql] |
</phase_requirements>

## Summary

Phase 80 erweitert den bestehenden `GET /api/v1/admin/users`-Seam zu einer vollständigen Aggregat-Liste mit Server-seitiger Pagination, Filtern und Tab-basierten Detail-Endpunkten für den User-Detail-Drawer. [VERIFIED: backend/cmd/server/admin_routes.go; VERIFIED: backend/internal/handlers/app_auth.go]

**R-01 aufgelöst:** `app_users.status` existiert als Team4s-eigene DB-Spalte mit den Werten `pending`, `active`, `disabled`. Disable/Reactivate ist als Team4s-DB-Mutation planbar, kein Keycloak-Admin-Call nötig. [VERIFIED: database/migrations/0072_keycloak_app_users_foundation.up.sql; VERIFIED: backend/internal/repository/app_auth_repository.go]

**R-05/R-06 (Phase-83-Lücke) aufgelöst:** Phase 83 ist vollständig implementiert und verifiziert (16/16 Must-Haves, 2026-06-12). Das kanonische Schema und die Auflösungslogik sind jetzt Live-Code — keine Hypothesen mehr nötig. [VERIFIED: .planning/phases/83-pro-release-mitwirkenden-zuordnung-release-version-id-im-coc/83-VERIFICATION.md]

**Primary recommendation:** `AdminUsersRepository`/`AdminUsersHandler` aufbauen, der auf `AppAuthHandler`/App-Auth-Repository als kleinen Geschwister-Handler aufsetzt. Aggregate-Listing über Page-First-CTE + LATERAL, Tab-Daten lazy per gescopten Endpunkten. Die Phase-83-Auflösung für den Contributions-Tab und die Drawer-Übersicht muss das bestehende zweistufige Pattern aus `ListEffectiveContributionsForVersion` und `ListActorContributionRolesForVersion` wiederverwenden, nicht neu bauen. [VERIFIED: backend/internal/repository/admin_content_fansub_releases_contributions_repository.go; VERIFIED: backend/internal/repository/authz_permissions.go]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Plattform-Admin-Zugang zur globalen Zentrale | API / Backend | Browser / Client | Backend besitzt `requirePlatformAdminIdentity`; Frontend-Gate ist nur UX. [VERIFIED: backend/internal/handlers/platform_admin_authz.go] |
| Aggregierte `/admin/users`-Liste | API / Backend | Database / Storage | Aggregate über viele Tabellen; N+1 verhindert durch Page-First-CTE. [VERIFIED: DB-Schema; VERIFIED: migrations] |
| User-Detail-Drawer-Tabs | Browser / Client | API / Backend | UI steuert Drawer/Tab-Komposition; jeder Tab ruft einen gescopten Backend-Endpunkt. [VERIFIED: frontend/src/components/ui/Drawer.tsx; VERIFIED: frontend/src/components/ui/Tabs.tsx] |
| Globale Rollen Assign/Revoke | API / Backend | Database / Storage | `app_user_global_roles` ist Team4s-DB-Eigentum; Mutation muss Platform-Admin-only und auditiert sein. [VERIFIED: database/migrations/0072; VERIFIED: backend/internal/repository/authz.go] |
| Account-Status Disable/Reactivate | API / Backend | Database / Storage | `app_users.status` ist Team4s-DB-Zustand; deaktivierte User werden von Permission-Seams abgelehnt. [VERIFIED: app_auth_repository_test.go] |
| Phase-83-Default/Override-Auflösung (Contributions-Tab) | API / Backend | Database / Storage | Zweistufige SQL-Auflösung bereits in `authz_permissions.go` und `admin_content_fansub_releases_contributions_repository.go` implementiert — wiederverwenden, nicht replizieren. [VERIFIED: authz_permissions.go Z. 190–277; VERIFIED: admin_content_fansub_releases_contributions_repository.go] |
| Scoped Gruppen-/Release-Rechte (Anzeige) | API / Backend | Browser / Client | Rechte kommen aus `fansub_group_member_roles` und Phase-83-`CanForReleaseVersion`; globaler Drawer zeigt, verlinkt, editiert nicht. [VERIFIED: backend/internal/permissions/permissions.go] |
| Audit-Timeline | API / Backend | Database / Storage | `audit_logs`-Tabelle hat Actor, Scope, Target, Event, Action, Outcome, Payload. [VERIFIED: database/migrations/0075_audit_logs.up.sql] |

## Project Constraints (from CLAUDE.md / AGENTS.md)

- Bestehenden Code zuerst inspizieren, Diffs klein halten. [VERIFIED: AGENTS.md]
- Release-Version-scoped Prozessmedien bleiben unter `release_version_media`; keine Cross-Domain-Vermischung. [VERIFIED: AGENTS.md; VERIFIED: docs/architecture/db-schema-fansub-domain.md]
- Vor neuen Endpunkten/Helpers/DTOs/UI-Controls nach bestehenden Äquivalenten suchen und vorhandene Seams bevorzugt erweitern. [VERIFIED: AGENTS.md]
- `shared/contracts/admin-content.yaml` ist kanonisch; Backend-, Frontend-DTOs und `frontend/src/lib/api.ts` müssen das geänderte Verhalten widerspiegeln. [VERIFIED: docs/api/api-contracts.md]
- Protected UI muss `hasAccessToken || hasRefreshToken` prüfen; API-Aufrufe über zentrale Client-Refresh-Naht. [VERIFIED: docs/frontend/auth-api-client.md]
- Deutscher UI-Text mit korrekten Umlauten. [VERIFIED: CLAUDE.md]
- Globale UI-Primitives aus `frontend/src/components/ui` nutzen. [VERIFIED: CLAUDE.md; VERIFIED: docs/frontend/ui-system.md]
- Neue DB-Migrationen für Schema-Änderungen; alte Migrationen nicht editieren. [VERIFIED: AGENTS.md]
- Produktcode-Dateien <= 450 Zeilen. [VERIFIED: CLAUDE.md]
- Immer `typecheck`, `lint`, Tests, Build und `git diff --check` planen. [VERIFIED: AGENTS.md]

## Standard Stack

### Core

| Library | Version | Zweck | Warum Standard |
|---------|---------|-------|----------------|
| Go | go 1.25.0 im Modul; lokal go1.26.1 | Backend-Handler, Repositories, Tests | Bestehender Go/Gin-Stack. [VERIFIED: backend/go.mod] |
| Gin | v1.10.0 | HTTP-Routing/Handler | Bestehende Admin-Routen und Auth-Middleware nutzen Gin. [VERIFIED: backend/go.mod] |
| pgx/v5 | v5.7.1 | PostgreSQL-Query-Ausführung | Bestehende Repositories nutzen pgx/pgxpool. [VERIFIED: backend/go.mod] |
| PostgreSQL | 16 | Aggregat-SQL, LATERAL/CTE, Audit-/User-Tabellen | Domänen-Schema ist PostgreSQL-backed. [VERIFIED: docs/architecture/db-schema-fansub-domain.md] |
| Next.js | ^16.1.6 | Admin-Route `/admin/users` | Bestehender Frontend-Stack ist Next.js App Router. [VERIFIED: frontend/package.json] |
| React | 18.3.1 | Client-Drawer/Tabs/Tabellen-Komponenten | Bestehender Frontend-Stack. [VERIFIED: frontend/package.json] |
| Vitest | ^3.2.4 | Frontend-Unit-/Render-Tests | Bestehende Frontend-Test-Suite. [VERIFIED: frontend/package.json] |

### Supporting

| Library | Version | Zweck | Wann nutzen |
|---------|---------|-------|-------------|
| lucide-react | ^0.469.0 | Icons in Admin-Aktionen | Bestehende Abhängigkeit für Drawer-/Tabellen-Aktionen. [VERIFIED: frontend/package.json] |
| `@/components/ui` | lokal | Drawer, Tabs, Table, Badge, Pagination, PageHeader, States | Pflicht für Phase-80-Seite/Drawer. [VERIFIED: frontend/src/components/ui; VERIFIED: docs/frontend/ui-system.md] |
| `frontend/src/lib/api.ts` | lokal | Getypte geschützte API-Helper und Auth-Refresh | Alle Phase-80-Browser-Aufrufe müssen über diesen Seam gehen. [VERIFIED: docs/frontend/auth-api-client.md] |

**Installation:** Keine neuen Pakete für Phase 80 notwendig. [VERIFIED: alle Abhängigkeiten bereits vorhanden]

## Package Legitimacy Audit

Keine neuen externen Pakete. Abschnitt entfällt. [VERIFIED: Analyse aller Phase-80-Anforderungen]

## Architecture Patterns

### System Architecture Diagram

```text
Browser /admin/users
  -> PlatformAdminGate + useAuthSession(hasAccessToken || hasRefreshToken)
  -> listAdminUsersPage({ search, status, role, has_conflicts, sort, page })
  -> GET /api/v1/admin/users?q=&status=&global_role=&has_conflicts=&sort=&limit=&offset=
  -> requirePlatformAdminIdentity
  -> AdminUsersRepository.ListUsersPage
       1. page CTE: app_users gefiltert/sortiert/limitiert
       2. LATERAL: globale Rollen, Member-Profil (member_claims verified)
       3. LATERAL: Gruppenmitgliedschaften, Leader-Kontexte
       4. LATERAL: offene Claims, offene Contributions (dispute_state='open')
       5. LATERAL: Mediauploads, Phase-83-Release-Scope-Aktivität
       6. Conflict-CTEs: Claim/Profil, rollenlose Mitglieder, Media-Owner, Dispute, Phase-83-Extras
       7. GREATEST(last_login_at, updated_at, ...) als last_activity_at
  -> response { data: AdminUserListItem[], meta: { total, limit, offset } }
  -> Tabellen-Zeile mit Conflict-Badge
  -> User öffnet Drawer
  -> Tab-Aktivierung -> /api/v1/admin/users/:id/{overview|roles|claims|memberships|group-rights|contributions|media|audit}
       -> jeder Endpunkt wiederholt Platform-Admin-Gate
       -> Mutations nur für /roles und /status
       -> audit_logs bei jedem allowed/denied Status-/Rollen-Wechsel
       
  [Contributions-Tab - Phase-83-Erweiterung]
  -> GET /api/v1/admin/users/:id/contributions
  -> AdminUsersRepository.ListUserContributions(userID)
       1. Projektweite Defaults (release_version_id IS NULL) via member_id
       2. Release-Overrides (release_version_id IS NOT NULL) via member_id
       3. Legacy (fansub_group_member_id IS NOT NULL, member_id IS NULL) via COALESCE
  -> Gruppierung im Frontend: Projekt-Defaults / Release-Overrides / Legacy / Disputes
```
[VERIFIED: frontend/src/components/auth/PlatformAdminGate.tsx; VERIFIED: backend/internal/handlers/platform_admin_authz.go; VERIFIED: backend/internal/repository/admin_content_fansub_releases_contributions_repository.go; RECOMMENDED Endpunkt-/Tab-Schnitt]

### Recommended Project Structure

```text
backend/internal/models/
├── admin_users.go                         # Admin User List/Detail DTOs [RECOMMENDED]
backend/internal/repository/
├── admin_users_repository.go              # Aggregat-Listing + Tab-Query-Repository [RECOMMENDED]
backend/internal/handlers/
├── admin_users_handler.go                 # Platform-admin-Endpunkte + Mutations [RECOMMENDED]
frontend/src/app/admin/users/
├── page.tsx                               # Route-Shell mit PlatformAdminGate [RECOMMENDED]
├── AdminUsersClient.tsx                   # Filter/Tabelle/Drawer-State [RECOMMENDED]
├── UserDetailDrawer.tsx                   # Drawer + Tab-Komposition [RECOMMENDED]
├── tabs/
│   ├── UserOverviewTab.tsx                # Konflikt-Aufschlüsselung, Zusammenfassung [RECOMMENDED]
│   ├── UserGlobalRolesTab.tsx             # Globale-Rollen-Zuweisung/Entzug [RECOMMENDED]
│   ├── UserClaimsTab.tsx                  # Claims + Einladungen [RECOMMENDED]
│   ├── UserMembershipsTab.tsx             # Gruppenmitgliedschaften [RECOMMENDED]
│   ├── UserGroupRightsTab.tsx             # Scoped-Rechte read-only [RECOMMENDED]
│   ├── UserContributionsTab.tsx           # Phase-83-aware Contributions [RECOMMENDED]
│   ├── UserMediaTab.tsx                   # Media-Uploads [RECOMMENDED]
│   └── UserAuditTab.tsx                   # Audit-Timeline [RECOMMENDED]
frontend/src/types/
├── admin-users.ts                         # Phase-80-DTOs [RECOMMENDED]
```

### Pattern 1: Phase-83-Default/Override-Auflösung im Contributions-Tab

**Was:** Das zweistufige Auflösungsmuster ist in Phase 83 bereits als Live-Code implementiert. Phase 80 muss es für den User-Detail-Drawer adaptieren (User-zentrischer statt Release-zentrischer Blickwinkel).

**Phase-83-Implementierung (Live-Code, kanonische Quelle):** [VERIFIED: backend/internal/repository/admin_content_fansub_releases_contributions_repository.go]

```go
// Schritt 1: Versions-spezifische Contributions (is_override = true)
// WHERE ac.release_version_id = $1 AND ac.fansub_group_id = $2

// Schritt 2 (Fallback wenn Schritt 1 leer): anime-weite Contributions
// WHERE ac.release_version_id IS NULL AND ac.fansub_group_id = $2
//   AND ac.anime_id = (SELECT ep.anime_id FROM release_versions rv
//                      JOIN fansub_releases fr ON fr.id = rv.release_id
//                      JOIN episodes ep ON ep.id = fr.episode_id
//                      WHERE rv.id = $1 LIMIT 1)
```

**Phase-80-Adaption für User-Sicht (Contributions-Tab):**
```sql
-- Alle Contributions eines Users, aufgeteilt nach Typ
SELECT
    ac.id,
    ac.fansub_group_id,
    fg.name AS fansub_group_name,
    ac.anime_id,
    a.title AS anime_title,
    ac.release_version_id,           -- NULL = Projekt-Default, gesetzt = Release-Override
    CASE WHEN ac.release_version_id IS NULL THEN 'project_default' ELSE 'release_override' END AS contribution_type,
    ac.dispute_state,
    COALESCE(ARRAY_AGG(acr.role_code), ARRAY[]::text[]) AS role_codes
FROM anime_contributions ac
JOIN members m ON m.id = ac.member_id          -- Phase-83-Anker: member_id zuerst [VERIFIED: migration 0105]
JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
JOIN anime a ON a.id = ac.anime_id
LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
WHERE ac.member_id = $1  -- member_id des Users (via verified member_claim)
GROUP BY ac.id, fg.name, a.title
ORDER BY a.title, contribution_type DESC, ac.id
```
[VERIFIED: migration 0105; VERIFIED: migration 0086; RECOMMENDED SQL-Skelett]

**Wenn `fansub_group_member_id` (legacy) und `member_id` beide vorhanden:** `member_id` ist seit Migration 0105 NOT NULL und ist der kanonische Anker. `fansub_group_member_id` ist nullable (Übergangsfeld). Keine COALESCE nötig für den Contributions-Tab — direkt `WHERE ac.member_id = :member_id`. [VERIFIED: migration 0105 Schritt D]

### Pattern 2: `has_override`-Subquery für Conflict-Erkennung (D-18)

**Was:** Ob eine Release-Version einen Override-Satz hat, wird in Phase 83 über eine EXISTS-Subquery ermittelt. Dieselbe Semantik wird in Phase 80 für den Conflict-Typ "D-18: Override verweist auf ungültige/gelöschte Release-Version" und "hat Release-Aktivität ohne aufgelöste Contribution" benötigt.

**Live-Code-Referenz aus Phase 83:** [VERIFIED: backend/internal/repository/admin_content_fansub_releases.go Z. 98–103]

```sql
EXISTS (
    SELECT 1 FROM anime_contributions ac_sub
    JOIN release_versions rv_sub ON rv_sub.id = ac_sub.release_version_id
    WHERE rv_sub.release_id = fr.id
      AND ac_sub.fansub_group_id = $1
) AS has_override
```

**Phase-80-Conflict-D-18-Adaption:** Ein Conflict "Override auf ungültige Release-Version" liegt vor, wenn:
```sql
EXISTS (
    SELECT 1
    FROM anime_contributions ac
    WHERE ac.member_id = :member_id
      AND ac.release_version_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM release_versions rv WHERE rv.id = ac.release_version_id
          -- release_versions hat kein deleted_at; hier müsste Soft-Delete geprüft werden
          -- wenn noch nicht vorhanden: auch fansub_releases.status prüfen
      )
) AS has_invalid_release_override
```
[VERIFIED: migration 0091; VERIFIED: admin_content_fansub_releases_contributions_repository.go; RECOMMENDED Conflict-SQL]

### Pattern 3: `ListActorContributionRolesForVersion` — N+1-freie Auflösung

**Was:** Für die User-Detail-Drawer-Übersicht muss Phase 80 anzeigen, für wie viele und welche Release-Versionen ein User Contributions (Default oder Override) hat. Das darf nicht N+1 materialisieren.

**Live-Code aus Phase 83:** [VERIFIED: backend/internal/repository/authz_permissions.go Z. 197–277]

Das Pattern lautet:
1. Versions-spezifische Contributions (`release_version_id = $versionID`) via `fgm.app_user_id = $appUserID` und `fgm.member_id = ac.member_id`.
2. Fallback: anime-weite Contributions (`release_version_id IS NULL`) mit `anime_id` über `release_versions -> fansub_releases -> episodes`.

**Phase-80-N+1-freie Aggregat-Adaption für Listenseite:**
```sql
-- Zähle Release-Versionen mit Berechtigung (Projekt-Default ODER Override) pro User
-- Eingebettet als LATERAL in der Page-CTE, nicht als N separate Queries
LEFT JOIN LATERAL (
    SELECT COUNT(DISTINCT rv.id) AS release_scope_count
    FROM release_versions rv
    JOIN fansub_releases fr ON fr.id = rv.release_id
    JOIN episodes ep ON ep.id = fr.episode_id
    JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id  -- via release_version_groups
    JOIN anime_contributions ac ON
        (ac.release_version_id = rv.id OR
         (ac.release_version_id IS NULL AND ac.anime_id = ep.anime_id))
        AND ac.fansub_group_id = rvg.fansub_group_id
    JOIN fansub_group_members fgm ON fgm.member_id = ac.member_id
        AND fgm.app_user_id = page.id
    JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
) release_scope ON true
```
[VERIFIED: authz_permissions.go SQL-Struktur; RECOMMENDED Page-80-Adaption]

### Pattern 4: Page-First Aggregat-Query (R-02)

**Was:** Erst die paged App-User-IDs ermitteln, dann alle Aggregate für genau diese IDs berechnen.

**Beispiel:**
```sql
WITH filtered AS (
    SELECT au.*
    FROM app_users au
    WHERE ($1 = '' OR au.email ILIKE $1 OR au.display_name ILIKE $1)
      AND ($2 = '' OR au.status = $2)
      AND ($3 = '' OR EXISTS (
          SELECT 1 FROM app_user_global_roles agr
          WHERE agr.app_user_id = au.id AND agr.role = $3
      ))
),
page AS (
    SELECT * FROM filtered
    ORDER BY COALESCE(last_login_at, updated_at, created_at) DESC, id DESC
    LIMIT $4 OFFSET $5
)
SELECT
    page.id, page.email, page.display_name, page.status,
    COALESCE(roles.roles, ARRAY[]::text[]) AS global_roles,
    COALESCE(memberships.membership_count, 0) AS group_membership_count,
    COALESCE(conflicts.conflict_count, 0) AS conflict_count
FROM page
LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(role ORDER BY role) AS roles
    FROM app_user_global_roles WHERE app_user_id = page.id
) roles ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS membership_count
    FROM fansub_group_members WHERE app_user_id = page.id
) memberships ON true
-- [weitere LATERAL-Joins für Claims, Contributions, Medien, Konflikte]
```
[RECOMMENDED; VERIFIED: LATERAL-Pattern aus backend/internal/repository/fansub_group_app_members_repository.go; VERIFIED: PostgreSQL-Schema]

### Pattern 5: Mutations mit Audit

**Was:** Globale Rollen-Zuweisung/-Entzug und Account-Status-Änderung müssen auditiert werden.

**Empfohlene Event-Namen:** [RECOMMENDED basierend auf VERIFIED: backend/internal/handlers/fansub_media_review_handler.go; VERIFIED: backend/internal/handlers/contribution_review_handler.go]
- `app_user_global_role.assigned`
- `app_user_global_role.revoked`
- `app_user_global_role.assign.denied` / `app_user_global_role.revoke.denied`
- `app_user_status.disabled`
- `app_user_status.reactivated`
- `app_user_status.change.denied`

```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "app_user_global_role.assigned",
    TargetType:     "app_user",
    TargetID:       &targetAppUserID,
    Action:         "assign_global_role",
    Outcome:        "allowed",
    Payload:        map[string]any{"role": role},
})
```
[RECOMMENDED; VERIFIED: backend/internal/repository/audit_logs.go]

### Anti-Patterns vermeiden

- **`fansub_group_member_id` statt `member_id` für Contributions-Joins:** Seit Migration 0105 ist `member_id` NOT NULL und kanonisch; `fansub_group_member_id` ist nullable Übergangsfeld. [VERIFIED: migration 0105]
- **Phase-83-Auflösung neu bauen:** `ListEffectiveContributionsForVersion` und `ListActorContributionRolesForVersion` existieren bereits als getesteter Live-Code — wiederverwenden via Repository-Methoden-Aufruf, nicht replizieren. [VERIFIED: 83-VERIFICATION.md 16/16 passed]
- **Scoped Rights in globalem Drawer editieren:** Explizit deferred; Anzeige + Deep-Link nach `/admin/fansubs/[id]/edit`. [VERIFIED: 80-CONTEXT.md]
- **N+1 über Claims/Contributions/Medien/Konflikte:** Immer Page-First-CTE. [VERIFIED: D-07]
- **Ad-hoc-Browser-Fetches:** Verboten; `frontend/src/lib/api.ts` nutzen. [VERIFIED: Lock K]

## Research Flags — Aufgelöst

### R-01: Accountstatus-Authority

`app_users.status` ist eine editierbare Team4s-DB-Spalte mit den Werten `pending`, `active`, `disabled`. [VERIFIED: database/migrations/0072_keycloak_app_users_foundation.up.sql] Neue App-User erhalten `active`; bestehende `pending`-User werden beim Identity-Sync auf `active` hochgestuft; `disabled`-User bleiben `disabled`. [VERIFIED: backend/internal/repository/app_auth_repository.go; VERIFIED: backend/internal/repository/app_auth_repository_test.go]

**Plan-Implikation:** Disable/Reactivate als Team4s-DB-Mutations auf `app_users.status` implementieren, keine Keycloak-Admin-Calls. Erlaubte Mutations-Targets: `active` und `disabled`; `pending` bleibt read-only. [VERIFIED: RECOMMENDED]

### R-02: Effiziente Aggregat-Query

Bestehende LATERAL-Pattern in `backend/internal/repository/fansub_group_app_members_repository.go` bestätigen die Machbarkeit. [VERIFIED: fansub_group_app_members_repository.go] Die bestehende `ListAppUsers`-Methode hat keine Pagination, Filter oder Aggregat-Counts und muss durch eine neue `ListAdminUsersPage`-Methode ersetzt oder ergänzt werden. [VERIFIED: backend/internal/repository/app_auth_repository.go]

### R-03: Globale Rollen-Modell

`app_user_global_roles` hat Primary Key `(app_user_id, role)` mit den Rollenwerten `platform_admin`, `content_admin`, `user`. [VERIFIED: database/migrations/0072] `platform_admin` ist ein Literal-String, geprüft durch `AppUserHasGlobalRole`. [VERIFIED: backend/internal/repository/authz.go] Ein Assign-Helper existiert, ein Revoke-Helper fehlt noch. [VERIFIED: backend/internal/repository/authz.go; VERIFIED: rg-Suche keine Ergebnisse für `RevokeAppUserGlobalRole`]

**Plan-Implikation:** `RevokeAppUserGlobalRole` mit Last-Admin-Guard hinzufügen; alle Mutations auditieren. [RECOMMENDED]

### R-04: Effiziente Conflict-Berechnung

Vier v1-Conflict-Typen (D-17) plus drei Phase-83-Zusatz-Typen (D-18) als SQL-Booleans/Counts in der Page-CTE, als Detail-Rows im Übersicht-Tab. [RECOMMENDED; VERIFIED: 80-CONTEXT.md]

### R-05: Phase-83-Default/Override-Auflösung — AUFGELÖST

Phase 83 ist vollständig implementiert (2026-06-12, 16/16 Must-Haves). [VERIFIED: 83-VERIFICATION.md]

**Kanonisches Schema:** [VERIFIED: database/migrations/0105_anime_contributions_member_id.up.sql]
- `anime_contributions.member_id` BIGINT NOT NULL REFERENCES `members(id)` — kanonischer Anker seit Migration 0105
- `anime_contributions.fansub_group_member_id` BIGINT NULL — Legacy/Übergangsfeld, nullable seit Migration 0105 Schritt F
- `anime_contributions.release_version_id` BIGINT NULL — NULL = Projekt-Default, gesetzt = Release-Override (seit Migration 0091)
- Unique-Constraint: `UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, member_id, release_version_id)` [VERIFIED: migration 0105 Schritt E]

**Auflösungsregel (D-02/D-03 aus Phase 83):** [VERIFIED: backend/internal/repository/authz_permissions.go Z. 197–277]

```
1. Prüfe: Gibt es anime_contributions mit release_version_id = :versionID UND member_id des Users?
   -> JA: Dieser versions-spezifische Satz gilt. Wenn User fehlt = kein Recht (Absenz-Semantik, D-03).
   -> NEIN: Weiter zu Schritt 2.

2. Fallback: Prüfe anime_contributions mit release_version_id IS NULL (Projekt-Default)
   für das anime_id des Releases (via release_versions -> fansub_releases -> episodes -> anime_id).
   -> Gefundene Rollen = Recht für diese Release-Version.
   -> Keine Findings = kein Recht (D-04).
```

**Wichtig: Die Absenz-Semantik (`D-03`) hat kein separates DB-Flag.** Ein "nicht dabei" ist nicht eine explizite Zeile, sondern das Fehlen des Users im Override-Satz. Wenn für eine Release-Version mindestens eine Contribution-Zeile mit gesetztem `release_version_id` existiert (gleichgültig welcher User), dann gilt dieser Satz als Override und der Projekt-Default wird NICHT herangezogen. Fehlt der konkrete User in diesem Override-Satz, hat er kein Recht — ohne zusätzlichen DB-Marker. [VERIFIED: authz_permissions.go Z. 232–234 "Schritt 1 lieferte Ergebnisse → versions-spezifischer Satz gilt"]

**Phase-80-Implikation:** Der Contributions-Tab des Drawers muss zeigen:
- Welche Contributions ein User als Projekt-Default hat (`release_version_id IS NULL`).
- Welche Release-Versions-Overrides existieren (`release_version_id IS NOT NULL`).
- Ob der User in einem Override-Satz eines Releases fehlt (obwohl Projekt-Default ihn einschließt) — das ist ein D-18-Konflikt.

### R-06: Override-Semantik für Konflikte — AUFGELÖST

**"Nicht dabei" (Absenz) vs. Rollen-Ersetzung:** [VERIFIED: backend/internal/repository/authz_permissions.go; VERIFIED: 83-CONTEXT.md D-03]
- Es gibt **kein** explizites "nicht dabei"-Flag in der DB.
- **Absenz** = User hat keine `anime_contributions`-Zeile für diese `release_version_id` (und der Override-Satz ist nicht leer).
- **Rollen-Ersetzung** = User hat eine Zeile für diese `release_version_id`, aber mit anderen `role_codes` als der Projekt-Default.
- **Override-Satz nicht leer** = EXISTS (SELECT 1 FROM anime_contributions WHERE release_version_id = :versionID AND fansub_group_id = :groupID). [VERIFIED: admin_content_fansub_releases.go has_override-Subquery]

**Phase-83-Zusatzkonflikte (D-18) — Erkennungslogik:**

| Konflikt | Erkennung | SQL-Basis |
|----------|-----------|-----------|
| Override auf ungültige Release-Version | `ac.release_version_id IS NOT NULL AND release_versions.id IS NULL` | LEFT JOIN release_versions rv ON rv.id = ac.release_version_id; WHERE rv.id IS NULL |
| Default/Override-Widerspruch | User in Projekt-Default, aber nicht in vorhandenem Override-Satz des Releases | Zweistufige Auflösung + Vergleich |
| Media/Notizen ohne aufgelöste Contribution | User hat `release_version_media.uploaded_by_app_user_id` oder Notiz, aber `ListActorContributionRolesForVersion` gibt leere Liste zurück | JOIN release_version_media + Contribution-Check |

[VERIFIED: 83-CONTEXT.md D-18; VERIFIED: authz_permissions.go Auflösungslogik; RECOMMENDED Conflict-SQL-Muster]

## Don't Hand-Roll

| Problem | Nicht bauen | Stattdessen nutzen | Warum |
|---------|-------------|-------------------|-------|
| Platform-admin-Routen-Schutz | Neuer Rollen-Parser / JWT-Check | `requirePlatformAdminIdentity` | Bestehende Backend-Gate. [VERIFIED: backend/internal/handlers/platform_admin_authz.go] |
| Phase-83-Default/Override-Auflösung | Neue Zweistufen-SQL-Logik | `ListEffectiveContributionsForVersion` / `ListActorContributionRolesForVersion` | Bereits implementiert, getestet (16/16 passed), kein Grund zur Replikation. [VERIFIED: 83-VERIFICATION.md] |
| Scoped Permissions | Neue Rechteregeln in UI | `permissions.Service`, `AuthzRepository` | Bestehende Engine für Platform/Global/Group/Release-Version-Aktionen. [VERIFIED: permissions.go] |
| Audit-Writes | Custom Audit-Tabelle/-Helper | `repository.AuditLogRepository.Write` | Bestehende Tabelle/Helper modelliert Actor/Scope/Target/Action/Outcome/Payload. [VERIFIED: audit_logs.go] |
| Drawer/Table/Tabs UI | Lokales Drawer-/Tabs-System | `@/components/ui` Drawer, Tabs, Table, Badge, Pagination | Pflicht-Primitives gemäss CLAUDE.md. [VERIFIED: docs/frontend/ui-system.md] |
| Browser-Auth-Refresh | Manuelles Token/Cookie-Lesen | `apiClientFetch` / zentraler API-Helper | Zentraler Client besitzt Refresh und 401-Retry. [VERIFIED: docs/frontend/auth-api-client.md] |
| Media-Owner-Projektion | Zentrale `media_assets.owner_type`-Spalte | Junction-basierte Owner-Projektion | Phase 79: Owner wird aus Junction-Kontext zusammengesetzt, nicht aus zentralem Owner-Feld. [VERIFIED: backend/internal/repository/media_ownership_projection_repository.go] |

**Key Insight:** Phase 80 ist eine Aggregations- und Governance-Fläche über bestehende Ownership-Domänen. Shortcuts, die App-User, Member-Profil, Gruppenmitgliedschaft, Contribution und Media-Owner in ein falsches Permission-Modell kollabieren, sind gefährlich. [VERIFIED: docs/architecture/db-schema-fansub-domain.md]

## Common Pitfalls

### Pitfall 1: Phase-83-Auflösung replizieren statt wiederverwenden

**Was schiefläuft:** Planner/Executor baut eine neue zweistufige Auflösungslogik für Contributions, weil die Phase-83-Implementierung als "Release-zentrisch" erscheint und Phase 80 "User-zentrisch" ist.
**Warum es passiert:** Die Metho­den heissen `ListEffectiveContributionsForVersion` (Release-Sicht), nicht `ListEffectiveContributionsForUser`. Aber die Logik kann mit User-ID und Member-ID auch für den Contributions-Tab adaptiert werden.
**Wie vermeiden:** Bestehende Repository-Methoden `ListEffectiveContributionsForVersion` und `ListActorContributionRolesForVersion` als Patterns lesen; für Phase 80 ähnliche Methoden ableiten, nicht neu erfinden. [VERIFIED: 83-VERIFICATION.md 16/16; VERIFIED: authz_permissions.go]
**Warnsignal:** Neue Datei `admin_users_contributions_resolution.go` mit eigenem Zweistufen-SQL erscheint im Plan.

### Pitfall 2: Absenz als DB-Flag suchen

**Was schiefläuft:** Code/Plan sucht nach einem `is_absent`-Flag oder `excluded`-Spalte, um "nicht dabei" zu repräsentieren.
**Warum es passiert:** CONTEXT.md D-18 erwähnt "nicht dabei" ohne klarzumachen, dass dies reine Absenz ist.
**Wie vermeiden:** Absenz = User fehlt schlicht in der Rollen-Liste des Override-Satzes. Kein DB-Marker. Das D-03-Verhalten ist: Schritt 1 hat Ergebnisse (Override-Satz nicht leer) UND User nicht im Satz → kein Recht. [VERIFIED: authz_permissions.go Z. 232–234]
**Warnsignal:** Migration oder DTO mit `excluded_from_release` oder `is_absent`-Feld.

### Pitfall 3: Existing `/admin/users` Contract Drift

**Was schiefläuft:** Frontend konsumiert Felder ohne Dokumentation in den Shared Contracts.
**Warum es passiert:** Runtime-Route existiert, aber exakter `/admin/users`-Contract-Eintrag ist absent. [VERIFIED: rg `/admin/users` in shared/contracts — kein vollständiger Eintrag gefunden]
**Wie vermeiden:** Contract zuerst ergänzen, dann Backend-DTOs, Frontend-Types und `api.ts`-Helper im selben Plan. [VERIFIED: docs/api/api-contracts.md]
**Warnsignal:** Page-Code parsed `response.data.aggregate` ohne Type in `frontend/src/types/admin-users.ts`.

### Pitfall 4: N+1 Aggregat-Loading

**Was schiefläuft:** Tabellen-Zeilen triggern je einen Request für Claims/Contributions/Medien/Konflikte.
**Wie vermeiden:** Ein Listen-Endpunkt liefert Summary-Aggregate für die Page; Tabs lazy-loaden erst nach Drawer-Auswahl. [VERIFIED: D-07/D-09]

### Pitfall 5: Broken Refresh-Session UI Gate

**Was schiefläuft:** Protected Admin-UI zeigt Logged-out-Zustand wenn Access-Token fehlt, aber Refresh-Token gültig ist.
**Warum es passiert:** `PlatformAdminGate` prüft aktuell nur `hasAccessToken`. [VERIFIED: frontend/src/components/auth/PlatformAdminGate.tsx]
**Wie vermeiden:** Gate/Test auf `hasAccessToken || hasRefreshToken` updaten. [VERIFIED: docs/frontend/auth-api-client.md]

### Pitfall 6: Letzten Plattform-Admin sperren

**Was schiefläuft:** Plattform-Admin entfernt die letzte `platform_admin`-Rolle oder deaktiviert den letzten aktiven Plattform-Admin.
**Warum es passiert:** Kein bestehender Revoke/Last-Admin-Guard. [VERIFIED: authz.go; VERIFIED: rg `RevokeAppUserGlobalRole` — keine Ergebnisse]
**Wie vermeiden:** Repository-Guard für letzten aktiven Plattform-Admin vor Revoke und Status-Disable hinzufügen. [RECOMMENDED]

### Pitfall 7: fansub_group_member_id statt member_id für Contribution-Joins

**Was schiefläuft:** Aggregat-Query oder Contributions-Tab joiniert über `fansub_group_member_id -> hist_fansub_group_members.member_id` statt direkt über `anime_contributions.member_id`.
**Warum es passiert:** Ältere Code-Referenzen (vor Migration 0105) nutzen `fansub_group_member_id` als Hauptanker.
**Wie vermeiden:** Seit Migration 0105 ist `anime_contributions.member_id` NOT NULL und kanonisch. `fansub_group_member_id` nur noch als Fallback für historische Daten ohne `member_id`. [VERIFIED: migration 0105 Schritt D]
**Warnsignal:** SQL-JOIN über `hist_fansub_group_members` ohne COALESCE-Alternative.

## Code Examples

### Platform-Admin-Gate im Handler

```go
func (h *AdminUsersHandler) ListUsers(c *gin.Context) {
    identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
    if !ok {
        return
    }
    _ = identity
    // query + response
}
```
[RECOMMENDED; VERIFIED: backend/internal/handlers/platform_admin_authz.go]

### Phase-83-Auflösung für Contributions-Tab adaptieren

```go
// Statt neu bauen: Bestehende Methoden als Vorlage nutzen
// authz_permissions.go ListActorContributionRolesForVersion Z. 197–277
// admin_content_fansub_releases_contributions_repository.go ListEffectiveContributionsForVersion

// Phase-80-Adaption: User-zentrische Sicht
func (r *AdminUsersRepository) ListUserContributions(
    ctx context.Context,
    memberID int64,
) (*UserContributionsResult, error) {
    // Projektweite Defaults
    rows, err := r.db.Query(ctx, `
        SELECT ac.id, ac.fansub_group_id, fg.name AS group_name,
               ac.anime_id, a.title AS anime_title,
               'project_default' AS contribution_type,
               ac.dispute_state,
               COALESCE(ARRAY_AGG(acr.role_code), ARRAY[]::text[]) AS role_codes
        FROM anime_contributions ac
        JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
        JOIN anime a ON a.id = ac.anime_id
        LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
        WHERE ac.member_id = $1            -- kanonischer Anker [VERIFIED: migration 0105]
          AND ac.release_version_id IS NULL -- Projekt-Default
        GROUP BY ac.id, fg.name, a.title
    `, memberID)
    // [weitere Query für Release-Overrides mit release_version_id IS NOT NULL]
}
```
[RECOMMENDED; VERIFIED: migration 0105 member_id-Anker; VERIFIED: admin_content_fansub_releases_contributions_repository.go-Pattern]

### Frontend-Helper-Pattern

```ts
export async function listAdminUsersPage(
    params: AdminUserListParams,
): Promise<AdminUserListResponse> {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.status) query.set('status', params.status)
    const response = await apiClientFetch(`/api/v1/admin/users?${query.toString()}`, {
        cache: 'no-store',
    })
    if (!response.ok) {
        const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
        throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
    }
    return response.json() as Promise<AdminUserListResponse>
}
```
[RECOMMENDED; VERIFIED: docs/frontend/auth-api-client.md; VERIFIED: frontend/src/lib/api.ts]

## Endpoint-Empfehlungen

| Methode | Pfad | Zweck | Hinweise |
|---------|------|-------|---------|
| GET | `/api/v1/admin/users` | Paged Aggregat-Tabelle | Query: `q`, `status`, `global_role`, `has_conflicts`, `sort=last_activity_desc`, `limit`, `offset`. [RECOMMENDED; VERIFIED: bestehende Route in admin_routes.go] |
| GET | `/api/v1/admin/users/:userId/overview` | Drawer-Übersicht + Conflict-Aufschlüsselung | Vollständige Conflict-Details und Summary-Cards. [RECOMMENDED] |
| GET | `/api/v1/admin/users/:userId/global-roles` | Rollen-Tab Read-Modell | Assignierbare Rollen aus App-Konstanten. [RECOMMENDED; VERIFIED: backend/internal/models/app_auth.go] |
| PUT | `/api/v1/admin/users/:userId/global-roles/:role` | Rolle zuweisen | Platform-admin-only, auditiert. [RECOMMENDED] |
| DELETE | `/api/v1/admin/users/:userId/global-roles/:role` | Rolle entziehen | Platform-admin-only, auditiert; Last-Admin-Guard. [RECOMMENDED] |
| PUT | `/api/v1/admin/users/:userId/status` | Account deaktivieren/reaktivieren | Body `{ "status": "active" \| "disabled" }`; auditiert. [RECOMMENDED; VERIFIED: app_users.status-Werte] |
| GET | `/api/v1/admin/users/:userId/member-claims` | Member-Profil/Claims-Tab | Claims und Einladungen in separaten Payload-Sektionen. [RECOMMENDED; VERIFIED: Lock H] |
| GET | `/api/v1/admin/users/:userId/group-memberships` | Gruppenmitgliedschaften-Tab | Read-only; Deep-Link nach `/admin/fansubs/[id]/edit`. [RECOMMENDED; VERIFIED: Lock I] |
| GET | `/api/v1/admin/users/:userId/group-rights` | Scoped-Rechte-Tab | Read-only abgeleitete Capabilities nach Gruppen-/Release-Version-Kontext. [RECOMMENDED; VERIFIED: permissions.go] |
| GET | `/api/v1/admin/users/:userId/contributions` | Contributions-Tab | Read-only; Phase-83-aware: Projekt-Defaults + Release-Overrides + Legacy + Disputes. [RECOMMENDED; VERIFIED: Lock I/H] |
| GET | `/api/v1/admin/users/:userId/media` | Medien-Tab | Read-only Upload-/Ownership-Zusammenfassung mit scoped Owner-Types. [RECOMMENDED; VERIFIED: Phase-79-Ownership-Modell] |
| GET | `/api/v1/admin/users/:userId/audit` | Audit-Tab | `audit_logs` nach Actor oder Target App-User. [RECOMMENDED; VERIFIED: audit_logs-Schema] |

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Seit wann | Impact |
|--------------|------------------|-----------|--------|
| Legacy `fansub_group_member_id` als einziger Contribution-Anker | `anime_contributions.member_id` NOT NULL als kanonischer Anker (Migration 0105); `fansub_group_member_id` nullable Legacy | Phase 82/83, 2026-06 | Phase 80 muss `member_id` primär verwenden, nie den alten Pfad als Standard. [VERIFIED: migration 0105] |
| `CanForReleaseVersion` nutzte Gruppen-Mitgliedschaft + `fansub_group_member_roles` | `CanForReleaseVersion` nutzt Contribution-basierte zweistufige Auflösung (Projekt-Default + Release-Override); Leader immer ausgenommen | Phase 83, 2026-06-11 | Phase 80 muss die neuen Permission-Semantics beim Anzeigen von Release-Rechten berücksichtigen. [VERIFIED: permissions.go Z. 243–317] |
| Kein `has_override`-Flag in Release-Listing | `AdminFansubReleaseSummary.HasOverride bool` aus EXISTS-Subquery | Phase 83, 2026-06-11 | Phase 80 kann dieses Feld für Conflict-D-18-Detektion im Media-Tab wiederverwenden. [VERIFIED: models/admin_release_theme_assets.go Z. 51] |
| `release_member_roles` für Notizen-Member-Rollenliste | `GetMemberRolesForVersion` liest aus `anime_contributions` + `anime_contribution_roles` | Phase 83, 2026-06-11 | Phase 80 Media-Tab: Anzeige "User hat Notizen/Medien für diese Release-Version" muss ebenfalls `anime_contributions` abfragen, nicht `release_member_roles`. [VERIFIED: release_version_notes_repository.go] |

**Deprecated/Veraltet:**
- `release_member_roles`-Tabelle für Contributor-Rechtsprüfung: ersetzt durch `anime_contributions` + Phase-83-Auflösung. [VERIFIED: 83-CONTEXT.md D-13]
- Legacy `listAdminUsers(authToken?)`: kompatibel, aber ohne Pagination/Filter/Meta — muss durch `ListAdminUsersPage` ersetzt werden. [VERIFIED: frontend/src/lib/api.ts]
- `PlatformAdminGate` prüft nur `hasAccessToken`: muss auf `hasAccessToken || hasRefreshToken` erweitert werden. [VERIFIED: frontend/src/components/auth/PlatformAdminGate.tsx]

## Assumptions Log

| # | Claim | Abschnitt | Risiko falls falsch |
|---|-------|-----------|---------------------|
| A1 | Keine. Alle Sachaussagen sind aus Live-Code, Migrationen oder offiziellen Dokumenten verifiziert; Endpunkt-/Event-/Query-Formen sind als Empfehlungen markiert. | Alle | Keine User-Bestätigung nötig für faktische Basis; Planner wählt finale Endpunkt-Namen und SQL-Details. |

## Open Questions (RESOLVED)

1. **Sollte Phase 80 gegen Sperren/Entziehen des letzten aktiven Plattform-Admins absichern?**
   - Was wir wissen: Globale Rollen und Status sind editierbar. Kein bestehender Last-Admin-Guard. [VERIFIED: authz.go]
   - **RESOLVED:** Last-Admin-Guard wird implementiert — `CountActivePlatformAdmins` + 409-Ablehnung bei Revoke der letzten `platform_admin`-Rolle UND beim Disable des letzten aktiven Plattform-Admins. Abgedeckt in Plan 80-01 (Seam), 80-02 (RED-Tests für beide Pfade) und 80-03 (Handler-Guard).

2. **Soll `/admin/users` in `AppAuthHandler` oder einem neuen `AdminUsersHandler` leben?**
   - Was wir wissen: Bestehende schmale `ListAppUsers` ist in `AppAuthHandler`. [VERIFIED: app_auth.go]
   - **RESOLVED:** Neuer `AdminUsersHandler` (Plan 80-03 Task 2), der `AppAuthRepository`, `AuthzRepository` und `AuditLogRepository` wiederverwendet — kein neues Auth-Domain.

3. **Exaktes Media-Conflict-SQL für Owner-Inkonsistenz braucht Implementation-Zeit-Bestätigung.**
   - Was wir wissen: Owner-Projektion ist Junction-komponiert; kein einzelnes persistiertes `owner_consistent`-Feld über alle Media-Surfaces. [VERIFIED: media_ownership_projection_repository.go]
   - **RESOLVED:** Die Conflict-Liste berechnet ungültige Owner-Scopes mit expliziten Owner-Kontext-Checks pro Surface als D-18-Konflikterkennung in der `ListAdminUsersPage`-LATERAL-Query (Plan 80-03 Task 1 Behavior).

## Environment Availability

| Abhängigkeit | Benötigt von | Verfügbar | Version | Fallback |
|-------------|-------------|-----------|---------|----------|
| Node.js | Frontend Tests/Build | Ja | v24.14.0 | Nicht nötig. [VERIFIED: node --version] |
| npm | Frontend Scripts | Ja | 11.9.0 | Nicht nötig. [VERIFIED: npm --version] |
| Go | Backend Tests/Build | Ja | go1.26.1 windows/amd64 | Nicht nötig. [VERIFIED: go version] |
| Docker / Compose | Integriertes DB/Service | Ja | Docker 29.4.3; Compose v5.1.3 | Package-level Tests wenn Container nicht laufen. [VERIFIED: docker --version] |
| Git | Diff/Check/Commit | Ja | 2.41.0.windows.1 | Nicht nötig. [VERIFIED: git --version] |

**Fehlende Abhängigkeiten ohne Fallback:** Keine. [VERIFIED: Environment-Checks]

## Validation Architecture

### Test Framework

| Eigenschaft | Wert |
|-------------|------|
| Framework | Backend Go `testing` mit testify; frontend Vitest 3.2.4. [VERIFIED: backend/go.mod; VERIFIED: frontend/package.json] |
| Config-Datei | `frontend/vitest.config.ts`; Backend-Pakete nutzen Go-Defaults. [VERIFIED: rg test infrastructure] |
| Quick Run Command | `cd backend && go test ./internal/handlers ./internal/repository ./internal/permissions -run "AdminUsers\|AppAuth\|Authz\|PlatformAdmin\|Permissions\|MemberIDAnchor\|ContributionRoles" -count=1` plus `cd frontend && npm test -- src/components/auth/PlatformAdminGate.test.tsx src/lib/api.no-token-boundary.test.ts` [RECOMMENDED; VERIFIED: test files exist] |
| Full Suite Command | `cd backend && go test ./...` und `cd frontend && npm test && npm run typecheck && npm run lint` [VERIFIED: package scripts] |

### Phase Requirements → Test Map

| Req ID | Verhalten | Test-Typ | Automatisierter Command | Datei existiert? |
|--------|-----------|----------|------------------------|-----------------|
| Entscheidung I | Nicht-Plattform-Admin kann Liste/Detail/Mutations nicht erreichen; scoped Rechte read-only im Drawer | Backend-Handler + Frontend-Render | `cd backend && go test ./internal/handlers -run AdminUsers -count=1`; `cd frontend && npm test -- src/app/admin/users/page.test.tsx` | Fehlt Wave 0 |
| Entscheidung H | Claims, Requests, Contributions sind separate Sektionen ohne Cross-Domain-Inference | Backend-Repository + Frontend-Tab | `cd backend && go test ./internal/repository -run AdminUsers -count=1` | Fehlt Wave 0 |
| Entscheidung K | Contracts, DTOs, `api.ts`, Backend-Response stimmen überein | Contract + Typecheck | `cd frontend && npm test -- src/lib/api.no-token-boundary.test.ts && npm run typecheck` | Partiell vorhanden |
| Entscheidung J (Teil) | Memorial-Profilstatus read-only im Member-Profil-Kontext | Backend-Query + Frontend-Tab-Render | `cd frontend && npm test -- src/app/admin/users/tabs/UserClaimsTab.test.tsx` | Fehlt Wave 0 |
| D-12/R-05 | Contributions-Tab liest `anime_contributions.member_id` primär | Backend-Repository | `cd backend && go test ./internal/repository -run "MemberIDAnchor\|AdminUsers" -count=1` | Fehlt Wave 0 |
| D-14/R-06 | Release-Override-Absenz = kein Recht; kein DB-Flag-Search | Backend-Permissions | `cd backend && go test ./internal/permissions -run "ContributionRoles\|ReleaseVersion" -count=1` | Vorhanden (Phase-83-Tests) |
| D-18 | Phase-83-Zusatz-Konflikte werden erkannt und gezählt | Backend-Repository + UI | `cd backend && go test ./internal/repository -run "AdminUsers.*Conflict" -count=1` | Fehlt Wave 0 |

### Sampling Rate

- **Pro Task-Commit:** Narrow Backend-/Frontend-Tests für berührten Seam. [RECOMMENDED]
- **Pro Wave-Merge:** Backend-Pakete für handlers/repository/permissions; Frontend für `admin/users`, API-Helper und `PlatformAdminGate`. [RECOMMENDED]
- **Phase Gate:** Full Backend-Tests, Frontend-Tests, Typecheck, Lint, Build und `git diff --check`. [VERIFIED: AGENTS.md]

### Wave 0 Gaps

- [ ] `backend/internal/repository/admin_users_repository_test.go` — sichert Aggregat-SQL, No-N+1-Listing, kanonischer `member_id`-Anker, Phase-83-Conflict-Counts. [RECOMMENDED]
- [ ] `backend/internal/handlers/admin_users_handler_test.go` — sichert Platform-Admin-Gate, Rollen-/Status-Mutations-Audits, Denied-Audits, Last-Admin-Guard. [RECOMMENDED]
- [ ] `frontend/src/types/admin-users.ts` — getypter DTO-Owner für Phase-80-Responses inkl. Phase-83-Default/Override-Projektionen. [RECOMMENDED]
- [ ] `frontend/src/lib/api.admin-users.test.ts` — sichert Query-Serialisierung und Fehlerbehandlung. [RECOMMENDED]
- [ ] `frontend/src/app/admin/users/page.test.tsx` und `UserDetailDrawer.test.tsx` — sichert Tabellen-Spalten, Conflict-Badge, Lazy-Tab-Calls, Read-only Scoped-Tabs. [RECOMMENDED]
- [ ] `frontend/src/components/auth/PlatformAdminGate.test.tsx` — Regression: Refresh-Token-only Platform-Admin-Zugang. [VERIFIED: existing test file; RECOMMENDED ergänzen]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Gilt | Standard Control |
|---------------|------|-----------------|
| V2 Authentication | ja | Keycloak/current-user-Middleware und zentraler Browser-API-Client. [VERIFIED: docs/frontend/auth-api-client.md] |
| V3 Session Management | ja | `apiClientFetch`/zentraler Refresh-Seam; UI-Gate muss Refresh-Session akzeptieren. [VERIFIED: docs/frontend/auth-api-client.md] |
| V4 Access Control | ja | `requirePlatformAdminIdentity` für globale Zentrale; `permissions.Service` (Phase-83-CanForReleaseVersion) für scoped Rechte-Anzeige. [VERIFIED: platform_admin_authz.go; VERIFIED: permissions.go Z. 243–317] |
| V5 Input Validation | ja | Rollen-/Status-/Pfad-/Query-Parameter in Handlers validieren; unbekannte Rollen/Status vor Mutation ablehnen. [VERIFIED: models/app_auth.go] |
| V6 Cryptography | kein neues Crypto | Keine Crypto hinzufügen; keine rohen Invitation-Tokens/Audit-Secrets in Phase 80 handhaben. |
| V7 Error Handling | ja | Bestehenden Error-Envelope nutzen; keine sensitiven User-/Provider-Daten leaken. [VERIFIED: docs/api/api-contracts.md] |
| V9 Data Protection | ja | Globale User-Zentrale exponiert sensitive User-/Account-/Audit-Daten nur an Plattform-Admins. [VERIFIED: PLATFORM-ADMIN-BOUNDARY-01] |

### Known Threat Patterns für Team4s-Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Nicht-Admin enumeriert User | Information Disclosure / Elevation | Serverseitiges `requirePlatformAdminIdentity` auf jedem Endpunkt; Frontend-Gate ist nur UX. [VERIFIED: platform_admin_authz.go] |
| Letzten Admin sperren | Denial of Service | Guard für Revoke/Disable des letzten aktiven Plattform-Admins; Denied-Attempt auditieren. [RECOMMENDED] |
| Rechte-Eskalation über Contribution-History | Elevation | `anime_contributions` nicht auf Permissions mappen; nur anzeigen. [VERIFIED: Lock I] |
| Massen-N+1-Aggregat-Endpunkt-Abuse | Denial of Service | Serverseitige Pagination, Limit-Cap, Page-First-Aggregat-SQL. [VERIFIED: D-07] |
| Audit-Repudiation | Repudiation | `audit_logs`-Einträge für allowed und denied Status-/Rollen-Mutations mit Actor und Target. [VERIFIED: audit_logs-Schema; VERIFIED: Phase-78-Patterns] |
| Auth-Refresh-Bypass/Logout-False-Negative | Spoofing / Session Management | Protected UI gate auf `hasAccessToken \|\| hasRefreshToken`; zentraler API-Client refresht. [VERIFIED: docs/frontend/auth-api-client.md] |
| Phase-83-IDOR: Effektive Contributions für fremde Release-Version abrufen | Information Disclosure | `requireReleaseVersionViewAccess` vor Repository-Call (Phase-83-Live-Code). Phase 80 muss analog User-ID-Scope prüfen. [VERIFIED: admin_content_fansub_releases_contributions_handlers.go Z. 45–48] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/80-admin-users-user-detail-drawer-scoped-rechte/80-CONTEXT.md` — gelockte Phase-80-Entscheidungen, Research-Flags, Constraints, Amendment 2026-06-12. [VERIFIED]
- `.planning/phases/83-pro-release-mitwirkenden-zuordnung-release-version-id-im-coc/83-CONTEXT.md` — Phase-83-Implementierungs-Entscheidungen D-01 bis D-16. [VERIFIED]
- `.planning/phases/83-pro-release-mitwirkenden-zuordnung-release-version-id-im-coc/83-VERIFICATION.md` — 16/16 Must-Haves verified 2026-06-12. [VERIFIED]
- `.planning/phases/83-pro-release-mitwirkenden-zuordnung-release-version-id-im-coc/83-PATTERNS.md` — Datei-Klassifikation, Pattern-Assignments, Code-Beispiele. [VERIFIED]
- `database/migrations/0104_members_backfill_and_fansub_group_members_member_id.up.sql` — `fansub_group_members.member_id`-Spalte, Backfill. [VERIFIED]
- `database/migrations/0105_anime_contributions_member_id.up.sql` — `anime_contributions.member_id` NOT NULL, `fansub_group_member_id` nullable, neuer Unique-Constraint. [VERIFIED]
- `database/migrations/0106_fansub_group_member_roles_fk.up.sql` — Rollen-FK auf `role_definitions`. [VERIFIED]
- `database/migrations/0107_fansub_group_default_crew.up.sql` — `fansub_group_default_crew`-Tabelle. [VERIFIED]
- `backend/internal/repository/authz_permissions.go` Z. 197–277 — `ListActorContributionRolesForVersion`: zweistufige SQL-Auflösung (versions-spezifisch → anime-weit Fallback). [VERIFIED]
- `backend/internal/repository/admin_content_fansub_releases_contributions_repository.go` — `ListEffectiveContributionsForVersion`: zweistufige Row-Auflösung, `EffectiveContributionsResult`, `IsOverride`-Flag. [VERIFIED]
- `backend/internal/repository/admin_content_fansub_releases.go` Z. 98–103 — `has_override`-Subquery via EXISTS. [VERIFIED]
- `backend/internal/models/admin_release_theme_assets.go` Z. 51 — `HasOverride bool`. [VERIFIED]
- `backend/internal/permissions/permissions.go` Z. 243–317 — `CanForReleaseVersion` umgebaut: Leader-Bypass zuerst, dann Contribution-Auflösung. [VERIFIED: 83-VERIFICATION.md Truth 1]
- `database/migrations/0072_keycloak_app_users_foundation.up.sql` — `app_users.status`, `app_user_global_roles`. [VERIFIED]
- `database/migrations/0075_audit_logs.up.sql` — Audit-Schema. [VERIFIED]
- `database/migrations/0097_v12_status_foundation.up.sql` — `members.profile_status`, `anime_contributions.dispute_state`. [VERIFIED]
- `backend/internal/handlers/platform_admin_authz.go` — `requirePlatformAdminIdentity`. [VERIFIED]
- `backend/internal/repository/app_auth_repository.go` — `ListAppUsers` (ohne Pagination/Filter — Basis für Erweiterung). [VERIFIED]
- `backend/internal/repository/authz.go` — `AppUserHasGlobalRole`, Assign-Helper (kein Revoke-Helper). [VERIFIED]
- `backend/internal/repository/audit_logs.go` — `AuditLogEntry`-Struct, `Write`-Methode. [VERIFIED]
- `frontend/src/components/auth/PlatformAdminGate.tsx` — prüft nur `hasAccessToken` (zu erweitern). [VERIFIED]
- `docs/api/api-contracts.md`, `docs/engineering/implementation-contract.md`, `docs/frontend/auth-api-client.md` — Contract-Workflow, Auth-Boundary. [VERIFIED]
- `.planning/milestones/v1.2-DISCUSSION.md` — Entscheidungen H/I/J/K. [VERIFIED]

### Secondary (MEDIUM confidence)

- npm-Registry-Ausgaben für Versions-Vergleich (nur informativ, keine Upgrade-Empfehlung). [VERIFIED: npm registry]
- `go list -m`-Ausgaben für Gin- und pgx-Modulversionen. [VERIFIED: go module cache]

### Tertiary (LOW confidence)

- Keine. [VERIFIED: Research-Log]

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — lokale Package-/Module-Dateien geprüft; keine neue Abhängigkeit empfohlen. [VERIFIED]
- Phase-83-Default/Override-Modell: HIGH — Live-Code verifiziert (16/16 Must-Haves, 2026-06-12). [VERIFIED: 83-VERIFICATION.md]
- R-01 Status-Authority: HIGH — Migration und Repository-Tests antworten direkt. [VERIFIED]
- R-02/R-04 Aggregat-/Conflict-Query: MEDIUM — Tabellenquellen und SQL-Pattern klar, Performance braucht EXPLAIN/ANALYZE auf repräsentativen Daten. [VERIFIED: Schema; RECOMMENDED]
- Pitfalls/Security: HIGH für Auth/Contract/Ownership-Regeln; MEDIUM für Last-Admin-Guard (Risiko-Kontrolle, kein bestehender Projektstandard). [VERIFIED: AGENTS.md; RECOMMENDED]

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 für lokale Architektur; sofort nach weiteren Phase-83-Folgearbeiten neu prüfen falls Permission-Modell sich ändert. [RECOMMENDED]
