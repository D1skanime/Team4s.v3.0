# Phase 80: admin-users-user-detail-drawer-scoped-rechte - Research

**Researched:** 2026-06-07 [VERIFIED: system date]
**Domain:** Team4s platform-admin user/rights overview, scoped authorization, audit, admin UI [VERIFIED: .planning/phases/80-admin-users-user-detail-drawer-scoped-rechte/80-CONTEXT.md]
**Confidence:** HIGH for schema/seams, MEDIUM for aggregate query performance until EXPLAIN is run against representative data [VERIFIED: source inspection; VERIFIED: no local graph index]

<user_constraints>
## User Constraints (from CONTEXT.md)

Source for this section: copied from `.planning/phases/80-admin-users-user-detail-drawer-scoped-rechte/80-CONTEXT.md`. [VERIFIED: .planning/phases/80-admin-users-user-detail-drawer-scoped-rechte/80-CONTEXT.md]

### Locked Decisions

#### Phase Boundary

Start der globalen User- und Rechtezentrale: eine `/admin/users`-Liste plus ein User-Detail-Drawer als Rechte-/Übersichtszentrale. Erster Ausbau - nicht jede Spezialberechtigung ist sofort editierbar. Greenfield (keine bestehende `/admin/users`-Route).

**Gelockt aus Milestone v1.2 (Entscheidung 11 + Locks H/I/J/K) - NICHT neu zu entscheiden:**
- Nur **Plattform-Admin** erreicht die globale Zentrale; Leader sehen gruppenspezifische Rechte in `/admin/fansubs/[id]/edit` (Lock I).
- Rechte werden **scoped** gedacht (gruppen-/release-version-bezogen), nie pauschal.
- **Keine** Rechte aus Contributions ableiten; Gruppenmitgliedschaft ist keine pauschale Adminfähigkeit; **keine** Medienrechte ohne Scope.
- **Alle** rechte-/statusändernden Aktionen sind auditierbar (kein Audit umgehen).
- **Contract-Disziplin (Lock K):** keine Ad-hoc-Fetches, keine neuen Endpunkte ohne OpenAPI- + Backend- + Frontend-Abgleich; alle API-Aufrufe über `frontend/src/lib/api.ts`.
- Drawer-Tabs (aus Entscheidung 11): Übersicht, globale Rollen, Member-Profil/Claims, Gruppenmitgliedschaften, Gruppenrechte, Contributions, Medien, Audit, vorbereitete Streaming-Grants.
- Datenquellen (aus Entscheidung 11): `app_users`, `app_user_global_roles`, `fansub_group_members`, `fansub_group_member_roles`, `member_claims`, `member_claim_invitations`, `anime_contributions`, `media_assets`, Audit-Tabellen.

#### Implementation Decisions

- **D-01:** Globale Rollen (`app_user_global_roles`) sind in v1 **editierbar** - Plattform-Admin kann globale Rollen im Drawer vergeben/entziehen; jede Änderung wird auditiert (`audit_logs`, Outcome `allowed`, Actor = Plattform-Admin). Das ist der Hauptzweck der globalen Rechtezentrale.
- **D-02:** Accountstatus (z.B. aktiv/gesperrt/deaktiviert) ist in v1 **editierbar** (sperren/aktivieren) mit Audit. **VORBEHALT (Research-Flag R-01):** nur falls `app_users` ein editierbares Statusfeld besitzt. Ist der Accountstatus Keycloak-gehoheitet, fällt v1 auf **read-only Anzeige** zurück bzw. braucht einen expliziten Keycloak-Seam - das klärt der Researcher VOR der Planung.
- **D-03:** Scoped Gruppen-/Release-Version-Rechte sind im globalen Drawer **read-only** (volle Anzeige). Das tatsächliche Vergeben/Entziehen bleibt **scoped in `/admin/fansubs/[id]/edit`** (Lock I) - keine Duplizierung der Leader-Editierfläche im globalen Drawer.
- **D-04:** "Vorbereitete Streaming-Grants" + nicht-priorisierte Spezialrechte = sichtbarer, klar gekennzeichneter **Stub** ohne Schreibaktion (passend zu "erster Ausbau").
- **D-05:** **Breite Aggregat-Tabelle** - alle Aggregate als Spalten: User (Name/E-Mail), Accountstatus, globale Rollen, verknüpftes Member-Profil, Gruppenmitgliedschaften, Leader-Kontexte, offene Claims, offene Contributions, Medienuploads, letzte Aktivität, Konflikte.
- **D-06:** **Suche** (Name/E-Mail) + **Kernfilter** (Accountstatus, globale Rolle, "hat Konflikte") + **Sortierung** nach letzter Aktivität.
- **D-07:** **Server-seitige Pagination** (limit/offset oder Cursor), vertragskonform (Lock K); Aggregate werden pro Seite berechnet. **Research-Flag R-02:** effiziente Aggregat-Query pro Seite (kein N+1 über Claims/Contributions/Medien/Konflikte).
- **D-08:** Bestehende **`@/components/ui` Drawer + Tabs** wiederverwenden (GDS-konform), eigene User-Detail-Inhalte. **NICHT** das 3943-Zeilen-Monolith-Muster aus `/admin/fansubs/[id]/edit/page.tsx` replizieren - saubere, modulare Tab-Komponenten (450-Zeilen-Limit pro Datei).
- **D-09:** **Lazy-Load pro Tab** - Tab-Daten erst beim Aktivieren über gescopte Endpunkte laden (kein schwerer All-in-One-Fetch).
- **D-10:** **Volle Anzeige-Listen je Tab**, ABER Schreibaktionen nur gemäß Editierbarkeits-Scope (D-01..D-04): global = Rollen + Accountstatus editierbar; scoped Domains (Gruppenrechte/Contributions/Medien) = volle Anzeige + Verwaltung via **Deep-Link** in die kanonische Fläche (Lock I/F, keine Duplizierung). Übersicht-/globale-Rollen-/Audit-Tabs sind voll funktional.
- **D-11:** 4 Konflikt-Typen in v1: (a) offener Claim trotz bereits verknüpftem Member-Profil (`member_claims`/`member_claim_invitations`), (b) Gruppenmitglied ohne zugewiesene Rolle (`fansub_group_members` ohne `fansub_group_member_roles`), (c) Medien/Owner ohne gültigen Scope (`owner_consistent = false`, vgl. Phase 78/79), (d) offener Contribution-Dispute (`anime_contributions.dispute_state = 'open'`, Phase 72).
- **D-12:** Signalisierung: Warn-**Badge** mit Anzahl in der Listenzeile + Listen-**Filter** "nur mit Konflikten" + konkrete **Aufschlüsselung im Übersicht-Tab** des Drawers (konsistent mit Badge-Pattern aus Phase 78/79).

### the agent's Discretion

- Exakter Endpunktschnitt pro Tab und genaue OpenAPI-Form (innerhalb Lock K: OpenAPI + Backend + `api.ts` gemeinsam).
- Konkrete Spaltenreihenfolge/Verdichtung der breiten Tabelle (Lesbarkeit), solange alle Aggregate aus D-05 vertreten sind.

### Deferred Ideas (OUT OF SCOPE)

- Editieren scoped Gruppen-/Release-Rechte **im globalen Drawer** (statt read-only + Deep-Link) - bewusst späterer Ausbau; v1 hält Lock I.
- Voll funktionale Streaming-Grants - v1 nur Stub.
- Weitere Spezialberechtigungen editierbar machen - späterer Ausbau.
- `2026-05-28-profile-hub-content-activity-redesign.md` - UI-Redesign von `/me/profile`; gehört nicht zur globalen User-/Rechtezentrale.
- `2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md` - Phase-67-Folgearbeit (Contribution-UI), nicht Phase 80.
- `2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md` - Credits-UI/Design im Fansub-Workspace, nicht die globale User-Liste.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| Entscheidung I | Rechte scoped; `/admin/users` + User Detail Drawer starten; keine Rechte aus Contributions; keine pauschalen Medienrechte. [VERIFIED: .planning/milestones/v1.2-DISCUSSION.md] | Use platform-admin-only backend gates, scoped read-only rights tabs, and deep links to `/admin/fansubs/[id]/edit` for scoped edits. [VERIFIED: backend/internal/permissions/permissions.go; VERIFIED: backend/internal/handlers/platform_admin_authz.go] |
| Entscheidung H | Claims, Requests und Contributions bleiben getrennt. [VERIFIED: .planning/milestones/v1.2-DISCUSSION.md] | Drawer tabs should query `member_claims`, `member_claim_invitations`, `member_requests`, and `anime_contributions` separately; do not infer one domain from another. [VERIFIED: database/migrations/0081_historical_members_identity.up.sql; VERIFIED: database/migrations/0092_member_claim_invitations.up.sql; VERIFIED: database/migrations/0086_anime_contributions.up.sql] |
| Entscheidung K | Contract/API discipline: no ad-hoc fetches and no new endpoints without OpenAPI/backend/frontend alignment. [VERIFIED: .planning/milestones/v1.2-DISCUSSION.md; VERIFIED: docs/api/api-contracts.md] | New list/detail/mutation endpoints must update `shared/contracts/openapi.yaml`, likely `shared/contracts/admin-content.yaml`, backend handlers/repository models, `frontend/src/types/*`, and `frontend/src/lib/api.ts`. [VERIFIED: docs/api/api-contracts.md; VERIFIED: shared contract grep] |
| Entscheidung J(Teil) | Memorial status is part of user/member overview context but not a normal claimable profile state. [VERIFIED: .planning/milestones/v1.2-DISCUSSION.md] | Member-profile tab should display `members.profile_status` and must not expose memorial mutation except through the existing global-admin memorial seam if needed. [VERIFIED: database/migrations/0097_v12_status_foundation.up.sql; VERIFIED: backend/internal/handlers/member_memorial_handler.go] |
</phase_requirements>

## Summary

Phase 80 should extend an existing backend `GET /api/v1/admin/users` seam rather than invent a parallel admin-user API family. [VERIFIED: backend/cmd/server/admin_routes.go; VERIFIED: backend/internal/handlers/app_auth.go; VERIFIED: backend/internal/repository/app_auth_repository.go] The current seam is narrow: it returns app users and global roles only, has no frontend route at `frontend/src/app/admin/users`, and has no exact OpenAPI/admin-content contract entry for `/admin/users`. [VERIFIED: Test-Path frontend/src/app/admin/users; VERIFIED: rg `/admin/users` in shared/contracts; VERIFIED: frontend/src/lib/api.ts]

R-01 is resolved: `app_users.status` exists in Team4s DB with `pending`, `active`, and `disabled`, and repository logic preserves `disabled` across Keycloak login sync while promoting `pending` to `active`. [VERIFIED: database/migrations/0072_keycloak_app_users_foundation.up.sql; VERIFIED: backend/internal/repository/app_auth_repository.go; VERIFIED: backend/internal/repository/app_auth_repository_test.go] Plan D-02 as Team4s-owned disable/reactivate writes for `active`/`disabled`; do not plan Keycloak account disable unless a separate Keycloak seam is explicitly added. [VERIFIED: backend/internal/repository/app_auth_repository.go; VERIFIED: docs/frontend/auth-api-client.md]

R-02/R-04 should be implemented with a page-first aggregate query: first select the paged `app_users` IDs after filters/sort, then join/LATERAL aggregate claims, memberships, roles, contributions, media uploads, audit/latest-activity, and conflict counts for only that page. [VERIFIED: existing LATERAL use in backend/internal/repository/fansub_group_app_members_repository.go; VERIFIED: PostgreSQL-backed schema in docs/architecture/db-schema-fansub-domain.md] Do not fetch drawer tabs from the list response; list rows should contain summary counts/badges, while tab endpoints lazy-load full lists. [VERIFIED: Phase 80 D-09 in CONTEXT.md]

**Primary recommendation:** build `AdminUsersRepository`/`AdminUsersHandler` around `AppAuthHandler` or a small sibling handler, extend contracts first, use one aggregate list endpoint plus tab-specific detail endpoints, and add audited platform-admin-only mutations for global roles and account status. [VERIFIED: backend/internal/handlers/app_auth.go; VERIFIED: backend/internal/repository/audit_logs.go; VERIFIED: docs/api/api-contracts.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Platform-admin access to global user center | API / Backend | Browser / Client | Backend already owns platform-admin authorization through `requirePlatformAdminIdentity`; frontend gate is UX-only. [VERIFIED: backend/internal/handlers/platform_admin_authz.go; VERIFIED: frontend/src/components/auth/PlatformAdminGate.tsx] |
| Aggregated `/admin/users` list | API / Backend | Database / Storage | Aggregates span many tables and must avoid N+1 by querying page IDs once and aggregating in SQL. [VERIFIED: database migrations; VERIFIED: backend/internal/repository/app_auth_repository.go] |
| User detail drawer tabs | Browser / Client | API / Backend | UI owns drawer/tab composition; each tab should call a scoped backend endpoint for its data. [VERIFIED: frontend/src/components/ui/Drawer.tsx; VERIFIED: frontend/src/components/ui/Tabs.tsx] |
| Global role assign/revoke | API / Backend | Database / Storage | `app_user_global_roles` is Team4s DB-owned and mutation must be platform-admin-only and audited. [VERIFIED: database/migrations/0072_keycloak_app_users_foundation.up.sql; VERIFIED: backend/internal/repository/authz.go; VERIFIED: backend/internal/repository/audit_logs.go] |
| Account status disable/reactivate | API / Backend | Database / Storage | `app_users.status` is Team4s DB state and disabled users are denied by platform/admin permission seams. [VERIFIED: backend/internal/repository/app_auth_repository_test.go; VERIFIED: backend/internal/handlers/platform_admin_authz.go] |
| Scoped group/release-version rights display | API / Backend | Browser / Client | Permission scopes are derived from `fansub_group_members`, `fansub_group_member_roles`, and release-version group context; global drawer must display, not edit, scoped rights. [VERIFIED: backend/internal/permissions/permissions.go; VERIFIED: backend/internal/repository/authz_permissions.go] |
| Audit timeline | API / Backend | Database / Storage | `audit_logs` table has actor, scope, target, event, action, outcome, payload, and created timestamp suitable for user-scoped audit reads. [VERIFIED: database/migrations/0075_audit_logs.up.sql; VERIFIED: backend/internal/repository/audit_logs.go] |

## Project Constraints (from AGENTS.md)

- Inspect existing code first, keep diffs small, and do not implement in this research phase. [VERIFIED: AGENTS.md; VERIFIED: user request]
- Do not attach release or fansub data to the wrong domain entity; release-version-scoped process media must stay under `release_version_media`; group media must stay under `fansub_group_media`; `release_media` must not substitute for version-scoped admin/fansub media. [VERIFIED: AGENTS.md; VERIFIED: docs/architecture/db-schema-fansub-domain.md]
- Before new endpoints/helpers/DTOs/UI controls, search for existing equivalents and prefer extending a usable seam. [VERIFIED: AGENTS.md; VERIFIED: docs/engineering/implementation-contract.md]
- `shared/contracts/openapi.yaml` is canonical and `shared/contracts/admin-content.yaml` is the focused admin-content contract where present; backend, frontend DTOs, and `frontend/src/lib/api.ts` must match changed behavior. [VERIFIED: AGENTS.md; VERIFIED: docs/api/api-contracts.md]
- Protected UI must gate on `hasAccessToken || hasRefreshToken`, and API calls must use the central client refresh seam. [VERIFIED: AGENTS.md; VERIFIED: docs/frontend/auth-api-client.md]
- User-facing German strings must use correct umlauts. [VERIFIED: AGENTS.md]
- Use global UI primitives in `frontend/src/components/ui` before adding local page-specific controls. [VERIFIED: AGENTS.md; VERIFIED: docs/frontend/ui-system.md]
- New DB migrations are required for schema changes; old historical migrations must not be edited. [VERIFIED: AGENTS.md]
- Always plan relevant `typecheck`, `lint`, tests, build if feasible, and `git diff --check`. [VERIFIED: AGENTS.md]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Go | module declares `go 1.25.0`; local tool is `go1.26.1` | Backend handlers, repositories, tests | Existing backend is Go/Gin; use current repo stack, not a new API runtime. [VERIFIED: backend/go.mod; VERIFIED: go version] |
| Gin | v1.10.0 | HTTP routing/handlers | Existing admin routes and auth middleware use Gin. [VERIFIED: backend/go.mod; VERIFIED: go list -m github.com/gin-gonic/gin] |
| pgx/v5 | v5.7.1 | PostgreSQL query execution and transactions | Existing repositories use pgx/pgxpool. [VERIFIED: backend/go.mod; VERIFIED: go list -m github.com/jackc/pgx/v5] |
| PostgreSQL | docs state PostgreSQL 16 | Aggregate SQL, LATERAL/CTE, audit/user tables | Domain schema and local docs are PostgreSQL-backed. [VERIFIED: docs/architecture/db-schema-fansub-domain.md] |
| Next.js | repo uses ^16.1.6; npm latest observed 16.2.7 modified 2026-06-06 | Admin route `/admin/users` | Existing frontend is Next App Router. [VERIFIED: frontend/package.json; VERIFIED: npm registry] |
| React | repo uses 18.3.1; npm latest observed 19.2.7 modified 2026-06-05 | Client drawer/tabs/table components | Existing frontend uses React 18; do not upgrade for this phase. [VERIFIED: frontend/package.json; VERIFIED: npm registry] |
| Vitest | repo uses ^3.2.4; npm latest observed 4.1.8 modified 2026-06-01 | Frontend unit/render tests | Existing frontend test suite is Vitest. [VERIFIED: frontend/package.json; VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | repo uses ^0.469.0; npm latest observed 1.17.0 modified 2026-05-28 | Icons in admin actions | Use existing dependency and icons for drawer/table actions; do not introduce another icon set. [VERIFIED: frontend/package.json; VERIFIED: npm registry] |
| `@/components/ui` | local primitives | Drawer, Tabs, Table, Badge, Pagination, PageHeader, states | Required for Phase 80 page/drawer composition. [VERIFIED: frontend/src/components/ui; VERIFIED: docs/frontend/ui-system.md] |
| `frontend/src/lib/api.ts` | local central API client | Typed protected API helpers and auth refresh | All Phase 80 browser calls must go through this seam. [VERIFIED: docs/frontend/auth-api-client.md; VERIFIED: frontend/src/lib/api.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending `AppAuthHandler`/app auth repository | New independent admin-users subsystem | A new subsystem may be justified for file size/modularity, but it must still reuse platform-admin auth, authz repo, audit repo, and `app_users` models rather than creating a parallel auth domain. [VERIFIED: backend/internal/handlers/app_auth.go; VERIFIED: docs/engineering/implementation-contract.md] |
| SQL aggregate query | Per-row API calls from UI | Per-row calls would violate D-07/R-02 by creating N+1 over claims, contributions, media, and conflicts. [VERIFIED: 80-CONTEXT.md] |
| Global scoped-right mutation in drawer | Deep-link to `/admin/fansubs/[id]/edit` | Global scoped-right mutation is explicitly deferred; deep links preserve Lock I. [VERIFIED: 80-CONTEXT.md; VERIFIED: AGENTS.md] |

**Installation:**
```bash
# No new package install recommended for Phase 80.
```

**Version verification:** package versions were checked from `frontend/package.json`, `backend/go.mod`, `npm view`, `go list -m`, and local runtime commands. [VERIFIED: package/version commands]

## Architecture Patterns

### System Architecture Diagram

```text
Browser /admin/users
  -> PlatformAdminGate + useAuthSession(hasAccessToken || hasRefreshToken)
  -> listAdminUsers({ search, status, role, has_conflicts, sort, page })
  -> GET /api/v1/admin/users
  -> requirePlatformAdminIdentity
  -> AdminUsersRepository.ListUsersPage
       1. page CTE: app_users filtered/sorted/limited
       2. aggregate joins: roles, verified member, memberships, leader contexts
       3. aggregate joins: pending claims, open contributions, media uploads
       4. conflict CTEs: claim/profile, roleless members, media owner, contribution dispute
       5. latest activity: GREATEST(last_login_at, updated_at, latest audit/media/contribution)
  -> response { data, meta }
  -> table row conflict badge
  -> user opens Drawer
  -> tab activation calls /api/v1/admin/users/:id/{overview|roles|claims|memberships|group-rights|contributions|media|audit}
       -> each endpoint repeats platform-admin gate
       -> mutations only for /roles and /status
       -> audit_logs write on every allowed/denied status or role mutation
```
[VERIFIED: frontend/src/components/auth/PlatformAdminGate.tsx; VERIFIED: backend/internal/handlers/platform_admin_authz.go; VERIFIED: database migrations; RECOMMENDED based on Phase 80 D-07/D-09]

### Recommended Project Structure

```text
backend/internal/models/
├── admin_users.go                  # Admin user list/detail DTOs [RECOMMENDED]
backend/internal/repository/
├── admin_users_repository.go        # Aggregate list + tab query repository [RECOMMENDED]
backend/internal/handlers/
├── admin_users_handler.go           # Platform-admin endpoints + mutations [RECOMMENDED]
frontend/src/app/admin/users/
├── page.tsx                         # Route shell with PlatformAdminGate [RECOMMENDED]
├── AdminUsersClient.tsx             # Filters/table/drawer state [RECOMMENDED]
├── UserDetailDrawer.tsx             # Drawer + tab composition [RECOMMENDED]
├── tabs/*.tsx                       # One tab component per drawer tab [RECOMMENDED]
frontend/src/types/
├── admin-users.ts                   # Phase 80 DTOs [RECOMMENDED]
```

### Pattern 1: Resolve R-01 With Team4s Status Ownership

**What:** Treat `app_users.status` as Team4s-owned for `active`/`disabled` mutations, because the DB defines the field and login sync preserves disabled users. [VERIFIED: database/migrations/0072_keycloak_app_users_foundation.up.sql; VERIFIED: backend/internal/repository/app_auth_repository.go]

**When to use:** D-02 account disable/reactivate in the global drawer. [VERIFIED: 80-CONTEXT.md]

**Plan implication:** Add repository method `UpdateAppUserStatus(ctx, targetAppUserID, status)` with allowed values `active` and `disabled`; reject `pending` as a manual target unless a later decision says otherwise. [VERIFIED: backend/internal/repository/app_auth_repository_test.go; RECOMMENDED]

### Pattern 2: Page-First Aggregate Query

**What:** Use a `page` CTE or temporary subquery for the exact app-user IDs on the current page, then aggregate child tables for those IDs. [RECOMMENDED based on R-02; VERIFIED: PostgreSQL schema]

**When to use:** `/api/v1/admin/users` list with D-05 columns and filters. [VERIFIED: 80-CONTEXT.md]

**Example:**
```sql
WITH filtered AS (
  SELECT au.*
  FROM app_users au
  WHERE ($1 = '' OR au.email ILIKE $1 OR au.display_name ILIKE $1)
    AND ($2 = '' OR au.status = $2)
    AND (
      $3 = ''
      OR EXISTS (
        SELECT 1 FROM app_user_global_roles agr
        WHERE agr.app_user_id = au.id AND agr.role = $3
      )
    )
),
page AS (
  SELECT *
  FROM filtered
  ORDER BY COALESCE(last_login_at, updated_at, created_at) DESC, id DESC
  LIMIT $4 OFFSET $5
)
SELECT
  page.id,
  page.email,
  page.display_name,
  page.status,
  COALESCE(roles.roles, ARRAY[]::text[]) AS global_roles,
  COALESCE(memberships.membership_count, 0) AS group_membership_count,
  COALESCE(conflicts.conflict_count, 0) AS conflict_count
FROM page
LEFT JOIN LATERAL (
  SELECT ARRAY_AGG(role ORDER BY role) AS roles
  FROM app_user_global_roles
  WHERE app_user_id = page.id
) roles ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS membership_count
  FROM fansub_group_members fgm
  WHERE fgm.app_user_id = page.id
) memberships ON true
LEFT JOIN LATERAL (
  SELECT
    (/* claim/profile conflicts */ 0)
    + (/* roleless memberships */ 0)
    + (/* media owner conflicts */ 0)
    + (/* open contribution disputes */ 0) AS conflict_count
) conflicts ON true;
```
[RECOMMENDED; VERIFIED: table names from database migrations; VERIFIED: existing LATERAL patterns in fansub_group_app_members_repository.go]

### Pattern 3: Mutations Audit After Write, Deny Audit On Permission Failure

**What:** Use `repository.AuditLogEntry` with `ActorAppUserID`, `EventType`, `TargetType`, `TargetID`, `Action`, `Outcome`, and payload. [VERIFIED: backend/internal/repository/audit_logs.go]

**When to use:** global role assignment/revocation and account status disable/reactivate. [VERIFIED: 80-CONTEXT.md]

**Recommended event names:** `app_user_global_role.assigned`, `app_user_global_role.revoked`, `app_user_status.disabled`, `app_user_status.reactivated`, with deny variants ending `.denied`. [RECOMMENDED based on VERIFIED: backend/internal/handlers/fansub_media_review_handler.go; VERIFIED: backend/internal/handlers/contribution_review_handler.go]

### Pattern 4: Frontend Protected Session Gate

**What:** Gate Phase 80 UI on `hasAccessToken || hasRefreshToken`, then call `frontend/src/lib/api.ts` helpers so the central client refreshes before requests. [VERIFIED: docs/frontend/auth-api-client.md]

**Current pitfall:** `PlatformAdminGate` currently reads only `hasAccessToken`, so Phase 80 should either fix that shared gate or avoid relying on it unchanged. [VERIFIED: frontend/src/components/auth/PlatformAdminGate.tsx]

**When to use:** `/admin/users` page route and drawer mutations. [VERIFIED: AGENTS.md]

### Anti-Patterns to Avoid

- **Using `listAdminUsers` as-is for Phase 80:** it has no pagination/filter/meta and only returns `AppUserListItem`. [VERIFIED: backend/internal/repository/app_auth_repository.go; VERIFIED: frontend/src/types/fansub.ts]
- **Putting scoped rights edits in global drawer:** explicitly out of scope; use read-only display plus deep links. [VERIFIED: 80-CONTEXT.md]
- **Deriving rights from Contributions:** forbidden by Lock I and milestone decision 11. [VERIFIED: .planning/milestones/v1.2-DISCUSSION.md]
- **Treating group membership as admin authority:** permission engine requires roles and action checks, not membership alone. [VERIFIED: backend/internal/permissions/permissions.go]
- **Ad-hoc browser fetches:** forbidden; use `frontend/src/lib/api.ts`. [VERIFIED: docs/api/api-contracts.md; VERIFIED: docs/frontend/auth-api-client.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Platform-admin route protection | New role parser or JWT role check | `requirePlatformAdminIdentity` / app global role check | Existing backend gate checks app-user status and `platform_admin`. [VERIFIED: backend/internal/handlers/platform_admin_authz.go] |
| Scoped permissions | New rights rules in UI | `permissions.Service`, `AuthzRepository`, `fansub_group_member_roles` | Existing engine owns scoped group/release-version actions. [VERIFIED: backend/internal/permissions/permissions.go; VERIFIED: backend/internal/repository/authz_permissions.go] |
| Audit writes | Custom audit table/helper | `repository.AuditLogRepository.Write` | Existing table/helper already models actor/scope/target/action/outcome/payload. [VERIFIED: database/migrations/0075_audit_logs.up.sql; VERIFIED: backend/internal/repository/audit_logs.go] |
| Drawer/table/tabs UI primitives | Local drawer/tabs/table system | `@/components/ui` Drawer, Tabs, Table, Badge, Pagination, states | Local UI system requires these primitives for standard surfaces. [VERIFIED: docs/frontend/ui-system.md; VERIFIED: frontend/src/components/ui] |
| Browser auth refresh | Manual bearer/token/cookie reads | `apiClientFetch`/central API helper seam | Central client owns refresh and 401 retry. [VERIFIED: docs/frontend/auth-api-client.md; VERIFIED: frontend/src/lib/api.ts] |
| Media owner projection | A central `media_assets.owner_type` column | Existing junction-derived owner projection | Phase 79 confirms owner is composed from junction context, not a central owner field. [VERIFIED: backend/internal/repository/media_ownership_projection_repository.go; VERIFIED: 79-CONTEXT.md] |

**Key insight:** Phase 80 is an aggregation and governance surface over existing ownership domains; custom shortcuts are dangerous because they can collapse app user, member profile, group membership, contribution, and media-owner concepts into one false permission model. [VERIFIED: docs/architecture/db-schema-fansub-domain.md; VERIFIED: .planning/milestones/v1.2-DISCUSSION.md]

## Existing Analog Files To Read First

| Concern | Files | Why |
|---------|-------|-----|
| Platform-admin backend routes | `backend/internal/handlers/platform_admin_authz.go`, `backend/internal/handlers/member_memorial_handler.go`, `backend/internal/handlers/admin_content_authz.go` | Existing global-admin gates and status rejection behavior. [VERIFIED: source inspection] |
| Existing admin user list API seam | `backend/internal/handlers/app_auth.go`, `backend/internal/repository/app_auth_repository.go`, `backend/internal/models/app_auth.go`, `frontend/src/lib/api.ts`, `frontend/src/types/fansub.ts` | Existing `GET /api/v1/admin/users` is narrow but reusable as the starting seam. [VERIFIED: source inspection] |
| Scoped permission engine | `backend/internal/permissions/permissions.go`, `backend/internal/repository/authz.go`, `backend/internal/repository/authz_permissions.go` | Source of truth for platform/global/group/release-version capability meaning. [VERIFIED: source inspection] |
| Drawer/tabs/table UI primitives | `frontend/src/components/ui/Drawer.tsx`, `Tabs.tsx`, `Table.tsx`, `Pagination.tsx`, `Badge.tsx`, `PageHeader.tsx`, `LoadingState.tsx`, `ErrorState.tsx`, `EmptyState.tsx` | Required UI foundation. [VERIFIED: frontend/src/components/ui] |
| Group member rights analog | `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx`, `backend/internal/repository/fansub_group_app_members_repository.go`, `backend/internal/handlers/app_auth.go` | Shows scoped group member/role management that global drawer must not duplicate. [VERIFIED: source inspection] |
| Audit patterns from 78/79 | `backend/internal/handlers/fansub_media_review_handler.go`, `backend/internal/handlers/contribution_review_handler.go`, `backend/internal/repository/audit_logs.go`, `.planning/phases/79-medien-ownership-in-ui-durchsetzen/79-CONTEXT.md` | Event naming, deny audit, owner-consistency rules. [VERIFIED: source inspection] |
| Contract files | `shared/contracts/openapi.yaml`, `shared/contracts/admin-content.yaml`, `docs/api/api-contracts.md` | `/admin/users` exact contract is absent today and must be added/updated. [VERIFIED: rg `/admin/users` in shared/contracts] |

## Research Flags Resolved

### R-01: Accountstatus Authority

`app_users.status` is an editable Team4s DB column with allowed values `pending`, `active`, `disabled`. [VERIFIED: database/migrations/0072_keycloak_app_users_foundation.up.sql] New app users default to active; existing pending users are promoted to active during identity sync; disabled users remain disabled. [VERIFIED: backend/internal/repository/app_auth_repository.go; VERIFIED: backend/internal/repository/app_auth_repository_test.go]

**Plan implication:** Implement disable/reactivate as Team4s DB mutations on `app_users.status`, not Keycloak admin calls. [VERIFIED: backend/internal/repository/app_auth_repository.go; RECOMMENDED] Use allowed mutation targets `active` and `disabled`; leave `pending` read-only unless a later decision defines manual pending. [VERIFIED: app_auth_repository_test.go; RECOMMENDED]

### R-02: Efficient Aggregate Query

Use a repository method that selects page IDs first and computes aggregates only for those IDs; do not call detail endpoints per row. [RECOMMENDED based on VERIFIED: 80-CONTEXT.md] The current `ListAppUsers` does no pagination or aggregate counts and must be replaced or overloaded carefully with a new `ListAdminUsersPage` method. [VERIFIED: backend/internal/repository/app_auth_repository.go]

Recommended DTO shape:
```ts
type AdminUserListItem = {
  id: number
  email: string
  display_name: string
  status: 'pending' | 'active' | 'disabled'
  global_roles: AdminGlobalRole[]
  member_profile: { member_id: number; display_name: string; slug?: string; profile_status: string } | null
  group_membership_count: number
  leader_context_count: number
  pending_claim_count: number
  open_contribution_count: number
  media_upload_count: number
  last_activity_at: string | null
  conflict_count: number
  conflict_types: AdminUserConflictType[]
}
```
[RECOMMENDED; VERIFIED: data sources from 80-CONTEXT.md and migrations]

### R-03: Global Roles Model

`app_user_global_roles` has primary key `(app_user_id, role)` and role constraint `platform_admin`, `content_admin`, `user`. [VERIFIED: database/migrations/0072_keycloak_app_users_foundation.up.sql] `platform_admin` is represented as the literal role string and checked by `AppUserHasGlobalRole`. [VERIFIED: backend/internal/repository/authz.go; VERIFIED: backend/internal/handlers/platform_admin_authz.go] There is an existing assign helper but no matching revoke helper found in source. [VERIFIED: backend/internal/repository/authz.go; VERIFIED: rg `RevokeAppUserGlobalRole` no results]

**Plan implication:** Add `AssignAppUserGlobalRole` use or admin-users-specific wrapper, add `RevokeAppUserGlobalRole`, validate role strings against the DB/model constants, and audit every mutation. [VERIFIED: backend/internal/repository/authz.go; VERIFIED: backend/internal/models/app_auth.go; RECOMMENDED]

Recommended event names:
- `app_user_global_role.assigned` [RECOMMENDED based on audit patterns]
- `app_user_global_role.revoked` [RECOMMENDED based on audit patterns]
- `app_user_global_role.assign.denied` and `app_user_global_role.revoke.denied` [RECOMMENDED based on `.denied` pattern]

### R-04: Efficient Conflict Calculation

Calculate the four v1 conflict types as booleans/counts in SQL for page IDs and as detailed rows in the overview tab. [RECOMMENDED; VERIFIED: 80-CONTEXT.md]

Recommended conflict semantics:
- `pending_claim_for_linked_profile`: user has a verified member profile and also pending claim/invitation rows for a member context. [VERIFIED: member_claims and member_claim_invitations migrations; RECOMMENDED exact SQL]
- `group_member_without_role`: active `fansub_group_members` row exists with no `fansub_group_member_roles` row. [VERIFIED: database/migrations/0073_fansub_group_app_memberships.up.sql]
- `media_owner_invalid`: media owner projection cannot resolve to a valid expected owner context or existing owner consistency projection flags false. [VERIFIED: backend/internal/repository/media_ownership_projection_repository.go; VERIFIED: backend/internal/repository/media_repository.go]
- `open_contribution_dispute`: `anime_contributions.dispute_state = 'open'` related to the user's verified member or historical memberships. [VERIFIED: database/migrations/0097_v12_status_foundation.up.sql; VERIFIED: database/migrations/0086_anime_contributions.up.sql]

**Plan implication:** Create one SQL helper/view-like CTE for conflict counts and reuse its logic in list and drawer overview tests; avoid duplicating conflict semantics separately in frontend. [RECOMMENDED; VERIFIED: docs/api/api-contracts.md]

## Endpoint Recommendations

| Method | Path | Purpose | Notes |
|--------|------|---------|-------|
| GET | `/api/v1/admin/users` | Paged aggregate table | Query: `q`, `status`, `global_role`, `has_conflicts`, `sort=last_activity_desc`, `limit`, `offset`; response includes `data` + `meta`. [RECOMMENDED; VERIFIED: existing route path in admin_routes.go] |
| GET | `/api/v1/admin/users/:userId/overview` | Drawer overview + conflict breakdown | Full conflict breakdown and summary cards. [RECOMMENDED] |
| GET | `/api/v1/admin/users/:userId/global-roles` | Role tab read model | Include assignable roles catalog from app constants. [RECOMMENDED; VERIFIED: backend/internal/models/app_auth.go] |
| PUT | `/api/v1/admin/users/:userId/global-roles/:role` | Assign role | Platform-admin only, audited. [RECOMMENDED; VERIFIED: audit pattern] |
| DELETE | `/api/v1/admin/users/:userId/global-roles/:role` | Revoke role | Platform-admin only, audited; consider guard against removing last platform admin. [RECOMMENDED] |
| PUT | `/api/v1/admin/users/:userId/status` | Disable/reactivate account | Body `{ "status": "active" | "disabled" }`; audited. [RECOMMENDED; VERIFIED: app_users.status values] |
| GET | `/api/v1/admin/users/:userId/member-claims` | Member profile/claims tab | Keep claims and invitations separate in payload sections. [RECOMMENDED; VERIFIED: Lock H] |
| GET | `/api/v1/admin/users/:userId/group-memberships` | Group memberships tab | Read-only list; deep-link to `/admin/fansubs/[id]/edit`. [RECOMMENDED; VERIFIED: Lock I] |
| GET | `/api/v1/admin/users/:userId/group-rights` | Scoped rights tab | Read-only derived capabilities by group/release-version context. [RECOMMENDED; VERIFIED: permissions.go] |
| GET | `/api/v1/admin/users/:userId/contributions` | Contributions tab | Read-only; do not derive rights. [RECOMMENDED; VERIFIED: Lock I/H] |
| GET | `/api/v1/admin/users/:userId/media` | Media tab | Read-only upload/ownership summary with scoped owner types. [RECOMMENDED; VERIFIED: Phase 79 ownership model] |
| GET | `/api/v1/admin/users/:userId/audit` | Audit tab | Query `audit_logs` where actor or target app user matches. [RECOMMENDED; VERIFIED: audit_logs schema] |

## Common Pitfalls

### Pitfall 1: Existing `/admin/users` Contract Drift

**What goes wrong:** Frontend consumes fields not documented in shared contracts. [VERIFIED: docs/api/api-contracts.md]
**Why it happens:** Runtime route exists but exact `/admin/users` contract entry is absent. [VERIFIED: rg `/admin/users` in shared/contracts]
**How to avoid:** Add contract first, then backend DTOs, frontend types, and `api.ts` helpers in the same implementation plan. [VERIFIED: docs/api/api-contracts.md]
**Warning signs:** Page code parses `response.data.some_aggregate` without a type in `frontend/src/types/admin-users.ts`. [RECOMMENDED]

### Pitfall 2: N+1 Aggregate Loading

**What goes wrong:** Table rows trigger one request each for claims/contributions/media/conflicts. [VERIFIED: R-02 in 80-CONTEXT.md]
**Why it happens:** Drawer tab lazy-loading is confused with list aggregate loading. [RECOMMENDED]
**How to avoid:** One list endpoint returns summary aggregates for the page; tabs lazy-load only after drawer selection. [VERIFIED: 80-CONTEXT.md]
**Warning signs:** `Promise.all(users.map(...))` in `/admin/users` page. [RECOMMENDED]

### Pitfall 3: Broken Refresh-Session UI Gate

**What goes wrong:** Protected admin UI shows logged-out state when access token is absent but refresh token is valid. [VERIFIED: AGENTS.md; VERIFIED: docs/frontend/auth-api-client.md]
**Why it happens:** `PlatformAdminGate` currently checks `hasAccessToken` only. [VERIFIED: frontend/src/components/auth/PlatformAdminGate.tsx]
**How to avoid:** Update gate/test to use `hasAccessToken || hasRefreshToken`; let `getCurrentUser` refresh centrally. [VERIFIED: docs/frontend/auth-api-client.md]
**Warning signs:** New Phase 80 tests mock only `hasAccessToken=true` and omit refresh-only cases. [RECOMMENDED]

### Pitfall 4: Revoking Last Platform Admin

**What goes wrong:** Platform admin removes the final `platform_admin` role and locks out the global center. [RECOMMENDED risk based on role model]
**Why it happens:** Existing assign helper has no revoke/last-admin guard. [VERIFIED: backend/internal/repository/authz.go; VERIFIED: rg `RevokeAppUserGlobalRole` no results]
**How to avoid:** Add repository guard for last active platform admin before revoke or status disable of a platform admin. [RECOMMENDED]
**Warning signs:** Revoke/status tests do not include "last active platform admin" conflict. [RECOMMENDED]

### Pitfall 5: Media Conflict Overreach

**What goes wrong:** Planner tries to repair or re-owner media from global user drawer. [VERIFIED: Phase 80 deferred ideas; VERIFIED: 79-CONTEXT.md]
**Why it happens:** `owner_consistent=false` is mistaken for an editable global permission. [VERIFIED: backend/internal/repository/media_repository.go]
**How to avoid:** Display owner conflict and deep-link to canonical owner surface; do not add owner mutation in Phase 80. [VERIFIED: 80-CONTEXT.md; VERIFIED: 79-CONTEXT.md]
**Warning signs:** New endpoint body contains `owner_type`, `owner_id`, or media scope assign fields. [RECOMMENDED]

## Code Examples

### Platform Admin Gate In Handler

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

### Audited Global Role Assignment

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
[RECOMMENDED; VERIFIED: backend/internal/repository/audit_logs.go; VERIFIED: backend/internal/handlers/app_auth.go]

### Frontend Helper Pattern

```ts
export async function listAdminUsersPage(
  params: AdminUserListParams,
): Promise<AdminUserListResponse> {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Legacy user/admin role fallback | App-user global role `platform_admin` with legacy fallback in shared helper | Phase 43+ foundation; route helper verified in current code | Phase 80 should prefer AppUserID/global roles and keep legacy fallback only where helper already provides it. [VERIFIED: backend/internal/handlers/platform_admin_authz.go; VERIFIED: database/migrations/0072_keycloak_app_users_foundation.up.sql] |
| Single unscoped admin role idea | Scoped permissions by group/release-version with platform-admin override | Phase 44+ permissions engine | Global drawer can display scoped rights but must not invent unscoped media/admin grants. [VERIFIED: backend/internal/permissions/permissions.go; VERIFIED: .planning/milestones/v1.2-DISCUSSION.md] |
| Media owner as generic asset field | Owner derived from canonical junctions (`fansub_group_media`, `release_version_media`, `owner_member_id`, etc.) | Phase 72/79 ownership model | Conflict display should use owner projections, not central owner mutation fields. [VERIFIED: backend/internal/repository/media_ownership_projection_repository.go; VERIFIED: 79-CONTEXT.md] |

**Deprecated/outdated:**
- Legacy `release_version_groups.fansubgroup_id` must not be used. [VERIFIED: AGENTS.md; VERIFIED: docs/architecture/db-schema-fansub-domain.md]
- Browser UI direct token/bearer handling is forbidden. [VERIFIED: docs/frontend/auth-api-client.md]
- The current `listAdminUsers(authToken?)` signature is compatible but not ideal for Phase 80 because it uses the older optional `authToken` pattern and no pagination/filter contract. [VERIFIED: frontend/src/lib/api.ts]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | None. All factual claims are sourced from local code/docs or registry/tool output; endpoint/event/query shapes are marked as recommendations, not existing facts. | All | No user confirmation needed for factual baseline; planner still needs to choose final endpoint names and SQL details. |

## Open Questions

1. **Should Phase 80 guard against disabling/revoking the last active platform admin?** [RECOMMENDED]
   - What we know: global roles are editable and status is editable. [VERIFIED: 80-CONTEXT.md]
   - What's unclear: no existing last-platform-admin guard exists. [VERIFIED: rg source inspection]
   - Recommendation: plan a guard and tests because lockout risk is high. [RECOMMENDED]

2. **Should `/admin/users` live in `AppAuthHandler` or a new `AdminUsersHandler`?** [RECOMMENDED]
   - What we know: existing narrow `ListAppUsers` is in `AppAuthHandler`. [VERIFIED: backend/internal/handlers/app_auth.go]
   - What's unclear: file-size pressure and tab endpoints may make a new handler cleaner. [VERIFIED: app_auth.go size/source inspection]
   - Recommendation: create `AdminUsersHandler` but reuse `AppAuthRepository`/`AuthzRepository`/`AuditLogRepository` patterns; do not create a new auth domain. [RECOMMENDED]

3. **Exact media conflict SQL for owner inconsistency needs implementation-time confirmation.** [RECOMMENDED]
   - What we know: owner projection is junction-composed and group media review exposes `owner_consistent`. [VERIFIED: backend/internal/repository/media_ownership_projection_repository.go; VERIFIED: backend/internal/repository/media_repository.go]
   - What's unclear: there is no single persisted `owner_consistent` column across all media surfaces. [VERIFIED: rg source inspection]
   - Recommendation: list conflict should compute invalid owner scopes with explicit owner-context checks per supported surface, and drawer media tab should show read-only details. [RECOMMENDED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Frontend tests/build | Yes | v24.14.0 | None needed. [VERIFIED: node --version] |
| npm | Frontend scripts and `npm view` | Yes | 11.9.0 | None needed. [VERIFIED: npm --version] |
| Go | Backend tests/build | Yes | go1.26.1 windows/amd64 | None needed. [VERIFIED: go version] |
| Docker / Compose | Integration DB/service checks | Yes | Docker 29.4.3; Compose v5.1.3 | Use package-level tests if containers are not running. [VERIFIED: docker --version; VERIFIED: docker compose version] |
| Git | Diff/check/commit | Yes | 2.41.0.windows.1 | None needed. [VERIFIED: git --version] |

**Missing dependencies with no fallback:** None found during research. [VERIFIED: environment commands]

**Missing dependencies with fallback:** None found during research. [VERIFIED: environment commands]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Backend Go `testing` with testify; frontend Vitest 3.2.4. [VERIFIED: backend/go.mod; VERIFIED: frontend/package.json] |
| Config file | `frontend/vitest.config.ts`; backend package tests use Go defaults. [VERIFIED: rg test infrastructure] |
| Quick run command | `cd backend && go test ./internal/handlers ./internal/repository ./internal/permissions -run "AdminUsers|AppAuth|Authz|PlatformAdmin|Permissions" -count=1` plus `cd frontend && npm test -- src/components/auth/PlatformAdminGate.test.tsx src/lib/api.no-token-boundary.test.ts` [RECOMMENDED; VERIFIED: test files exist] |
| Full suite command | `cd backend && go test ./...` and `cd frontend && npm test && npm run typecheck && npm run lint` [VERIFIED: package scripts; VERIFIED: backend test layout] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| Entscheidung I | Non-platform-admin cannot reach list/detail/mutations; scoped rights read-only in drawer | backend handler + frontend render | `cd backend && go test ./internal/handlers -run AdminUsers -count=1`; `cd frontend && npm test -- src/app/admin/users/page.test.tsx` | Missing Wave 0 [VERIFIED: no frontend admin/users route] |
| Entscheidung H | Claims, requests, contributions are separate sections and not inferred from each other | backend repository + frontend tab tests | `cd backend && go test ./internal/repository -run AdminUsers -count=1` | Missing Wave 0 [VERIFIED: no admin users tests] |
| Entscheidung K | Contracts, DTOs, `api.ts`, backend response match | contract/source tests + typecheck | `cd frontend && npm test -- src/lib/api.no-token-boundary.test.ts && npm run typecheck` | Partial existing [VERIFIED: existing no-token test; missing admin-users helper tests] |
| Entscheidung J(Teil) | Memorial profile status displayed read-only in user/member profile context | backend query + frontend tab render | `cd frontend && npm test -- src/app/admin/users/tabs/UserClaimsTab.test.tsx` | Missing Wave 0 [VERIFIED: no admin/users route] |

### Sampling Rate

- **Per task commit:** run the narrow backend/frontend tests for touched seam. [RECOMMENDED]
- **Per wave merge:** run backend package tests for handlers/repository/permissions and frontend tests for `admin/users`, API helpers, and `PlatformAdminGate`. [RECOMMENDED]
- **Phase gate:** full backend tests, frontend tests, typecheck, lint, build if feasible, and `git diff --check`. [VERIFIED: AGENTS.md]

### Wave 0 Gaps

- [ ] `backend/internal/repository/admin_users_repository_test.go` - locks aggregate SQL behavior and no N+1 list ownership. [RECOMMENDED]
- [ ] `backend/internal/handlers/admin_users_handler_test.go` - locks platform-admin gate, role/status mutation audits, denied audits, last-admin guard. [RECOMMENDED]
- [ ] `frontend/src/types/admin-users.ts` - typed DTO owner for Phase 80. [RECOMMENDED]
- [ ] `frontend/src/lib/api.admin-users.test.ts` or extension in `api.test.ts` - locks query serialization and error handling. [RECOMMENDED]
- [ ] `frontend/src/app/admin/users/page.test.tsx` and `UserDetailDrawer.test.tsx` - locks table columns, conflict badge, lazy tab calls, read-only scoped tabs. [RECOMMENDED]
- [ ] `frontend/src/components/auth/PlatformAdminGate.test.tsx` - add refresh-token-only platform-admin access regression. [VERIFIED: existing test file; RECOMMENDED]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Keycloak/current-user middleware and central browser API client. [VERIFIED: docs/frontend/auth-api-client.md; VERIFIED: backend/cmd/server/main.go] |
| V3 Session Management | yes | `apiClientFetch`/central refresh seam; UI gate must accept refresh session. [VERIFIED: docs/frontend/auth-api-client.md] |
| V4 Access Control | yes | `requirePlatformAdminIdentity` for global center; `permissions.Service` for scoped rights display/deep links. [VERIFIED: backend/internal/handlers/platform_admin_authz.go; VERIFIED: backend/internal/permissions/permissions.go] |
| V5 Input Validation | yes | Validate role/status/path/query parameters in handlers; reject unknown role/status before mutation. [VERIFIED: backend/internal/models/app_auth.go; VERIFIED: existing handler validation patterns] |
| V6 Cryptography | no new crypto | Do not add crypto; do not handle raw invitation tokens/audit secrets in Phase 80. [VERIFIED: phase scope; VERIFIED: existing invite audit pattern] |
| V7 Error Handling | yes | Use existing error envelope and avoid leaking sensitive user/provider data. [VERIFIED: docs/api/api-contracts.md; VERIFIED: backend handlers] |
| V9 Data Protection | yes | Global user center exposes sensitive user/account/audit data only to platform admins. [VERIFIED: Phase 80 SC5; VERIFIED: PLATFORM-ADMIN-BOUNDARY-01] |

### Known Threat Patterns for Team4s Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Non-admin enumerates users | Information Disclosure / Elevation | Server-side `requirePlatformAdminIdentity` on every endpoint; frontend gate only as UX. [VERIFIED: backend/internal/handlers/platform_admin_authz.go] |
| Last admin lockout | Denial of Service | Guard revoke/disable of final active platform admin; audit denied attempt. [RECOMMENDED based on role model] |
| Rights escalation through contribution history | Elevation | Do not map `anime_contributions` to permissions; display only. [VERIFIED: Lock I] |
| Mass N+1 aggregate endpoint abuse | Denial of Service | Server-side pagination, limit cap, page-first aggregate SQL. [VERIFIED: D-07; RECOMMENDED] |
| Audit repudiation | Repudiation | Write `audit_logs` entries for allowed and denied status/role mutations with actor and target. [VERIFIED: audit_logs schema; VERIFIED: Phase 78 patterns] |
| Auth refresh bypass/logout false negative | Spoofing / Session Management | Protected UI gates on `hasAccessToken || hasRefreshToken`; central API client refreshes. [VERIFIED: docs/frontend/auth-api-client.md] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/80-admin-users-user-detail-drawer-scoped-rechte/80-CONTEXT.md` - locked Phase 80 decisions, research flags, constraints. [VERIFIED]
- `.planning/milestones/v1.2-DISCUSSION.md` - decisions H/I/J/K and Phase 80 scope. [VERIFIED]
- `AGENTS.md` - project-specific rules. [VERIFIED]
- `docs/engineering/implementation-contract.md` - reuse/contract planning rules. [VERIFIED]
- `docs/api/api-contracts.md` - contract workflow. [VERIFIED]
- `docs/frontend/auth-api-client.md` - auth/API boundary. [VERIFIED]
- `docs/frontend/ui-system.md` and `docs/agent-guidelines-ui.md` - UI primitives/control mapping. [VERIFIED]
- `docs/architecture/db-schema-fansub-domain.md` - domain ownership rules. [VERIFIED]
- `database/migrations/0072_keycloak_app_users_foundation.up.sql` - `app_users` and `app_user_global_roles`. [VERIFIED]
- `database/migrations/0073_fansub_group_app_memberships.up.sql` and `0074_expand_fansub_group_member_roles.up.sql` - group membership/roles. [VERIFIED]
- `database/migrations/0075_audit_logs.up.sql` - audit schema. [VERIFIED]
- `database/migrations/0097_v12_status_foundation.up.sql` - `members.profile_status`, `anime_contributions.dispute_state`, media/contribution visibility/review status. [VERIFIED]
- `backend/internal/handlers/platform_admin_authz.go`, `app_auth.go`, `member_memorial_handler.go`, `fansub_media_review_handler.go`, `contribution_review_handler.go` - authz/audit patterns. [VERIFIED]
- `backend/internal/repository/app_auth_repository.go`, `authz.go`, `authz_permissions.go`, `audit_logs.go`, `media_ownership_projection_repository.go`, `media_repository.go` - repository seams. [VERIFIED]
- `frontend/src/components/ui/*`, `frontend/src/components/auth/PlatformAdminGate.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types/fansub.ts` - frontend seams. [VERIFIED]

### Secondary (MEDIUM confidence)

- npm registry outputs for latest versions of `next`, `react`, `lucide-react`, and `vitest`; used only to document current ecosystem versions, not to recommend upgrades. [VERIFIED: npm registry]
- `go list -m` outputs for Gin and pgx module versions. [VERIFIED: go module cache]

### Tertiary (LOW confidence)

- None. [VERIFIED: research log]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - local package/module files and registries checked; no new dependency recommended. [VERIFIED: frontend/package.json; VERIFIED: backend/go.mod; VERIFIED: npm registry]
- Architecture: HIGH - existing backend/frontend/auth/audit seams are concrete; frontend `/admin/users` route is absent. [VERIFIED: source inspection]
- R-01 status authority: HIGH - migration and repository tests directly answer it. [VERIFIED: migration and tests]
- R-02/R-04 aggregate/conflict query: MEDIUM - table sources and SQL pattern are clear, but performance needs EXPLAIN/ANALYZE on representative data. [VERIFIED: schema; RECOMMENDED]
- Pitfalls/security: HIGH for auth/contract/ownership rules; MEDIUM for last-admin guard because it is a recommended risk control, not an existing project rule. [VERIFIED: AGENTS.md; RECOMMENDED]

**Research date:** 2026-06-07 [VERIFIED: system date]
**Valid until:** 2026-07-07 for local architecture; re-check npm/latest package notes if planning after 2026-06-14. [RECOMMENDED]
