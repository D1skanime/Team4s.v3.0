# Phase 80: admin-users-user-detail-drawer-scoped-rechte — Pattern Map

**Mapped:** 2026-06-15
**Files analyzed:** 17 neue/geänderte Dateien
**Analogs found:** 16 / 17 (1 ohne direktes Analog: `admin-users.ts` Typ-Datei — Standard-TS-Pattern)

---

## File Classification

| Neue/geänderte Datei | Rolle | Datenfluss | Nächstes Analog | Match-Qualität |
|----------------------|-------|-----------|-----------------|----------------|
| `backend/internal/models/admin_users.go` | model/DTO | — | `backend/internal/models/app_auth.go` | role-match |
| `backend/internal/repository/admin_users_repository.go` | repository | CRUD + batch | `backend/internal/repository/fansub_group_app_members_repository.go` | role-match |
| `backend/internal/handlers/admin_users_handler.go` | handler | request-response | `backend/internal/handlers/fansub_media_review_handler.go` | exact |
| `backend/cmd/server/admin_routes.go` | config/routing | — | gleiche Datei — Erweiterung | exact |
| `backend/cmd/server/main.go` | config/wiring | — | gleiche Datei — Erweiterung | exact |
| `backend/internal/repository/authz.go` | repository | CRUD | gleiche Datei — Erweiterung (`RevokeAppUserGlobalRole`) | exact |
| `shared/contracts/admin-content.yaml` | config/contract | — | bestehende Admin-Endpunkt-Einträge in gleicher Datei | exact |
| `frontend/src/types/admin-users.ts` | utility/types | — | `frontend/src/types/auth.ts` (AppUser-Struktur) | role-match |
| `frontend/src/lib/api.ts` | utility/api-client | request-response | `listAdminUsers` / `listFansubAppMembers` in gleicher Datei | exact |
| `frontend/src/app/admin/users/page.tsx` | page/route-shell | request-response | `frontend/src/app/admin/anime/page.tsx` | exact |
| `frontend/src/app/admin/users/AdminUsersClient.tsx` | component/controller | request-response | `frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx` | role-match |
| `frontend/src/app/admin/users/UserDetailDrawer.tsx` | component/drawer | event-driven | `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx` | role-match |
| `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` | component/tab | request-response | `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` | role-match |
| `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx` | component/tab | CRUD | `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` | role-match |
| `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx` | component/tab | request-response | `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` | exact |
| `frontend/src/app/admin/users/tabs/UserMembershipsTab.tsx` | component/tab | request-response | `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` | role-match |
| `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` | component/tab | request-response | `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` | role-match |
| `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` | component/tab | request-response | `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` | role-match |
| `frontend/src/app/admin/users/tabs/UserMediaTab.tsx` | component/tab | request-response | `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` | role-match |
| `frontend/src/app/admin/users/tabs/UserAuditTab.tsx` | component/tab | request-response | `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` | role-match |
| `frontend/src/components/auth/PlatformAdminGate.tsx` | component/guard | request-response | gleiche Datei — Bugfix (`hasRefreshToken`) | exact |

---

## Pattern Assignments

### `backend/internal/models/admin_users.go` (model/DTO)

**Analog:** `backend/internal/models/app_auth.go` (Zeilen 1–47)

**Imports-Pattern** (Zeilen 1–6 des Analogs):
```go
package models

import "time"
```

**Core-Struct-Pattern** (Zeilen 25–40 des Analogs — `AppUser` als Basis-DTO):
```go
type AppUser struct {
    ID                int64      `json:"id"`
    Email             string     `json:"email"`
    DisplayName       string     `json:"display_name"`
    Status            string     `json:"status"`
    LastLoginAt       *time.Time `json:"last_login_at,omitempty"`
    CreatedAt         time.Time  `json:"created_at"`
    UpdatedAt         time.Time  `json:"updated_at"`
    GlobalRoles       []string   `json:"global_roles,omitempty"`
}
```

**Phase-80-Erweiterung:** Neue DTOs `AdminUserListItem` (enthält AppUser + Aggregat-Felder) und `AdminUserDetailOverview` hinzufügen. Bestehende Konstanten `AppUserStatusActive`, `AppUserStatusDisabled`, `AppGlobalRolePlatformAdmin` etc. aus `app_auth.go` wiederverwenden — nicht duplizieren.

---

### `backend/internal/repository/admin_users_repository.go` (repository, CRUD + batch)

**Analog:** `backend/internal/repository/fansub_group_app_members_repository.go` (LATERAL-Join-Pattern)

**Imports-Pattern** (Zeilen 1–16 des Analogs):
```go
package repository

import (
    "context"
    "fmt"
    "strings"

    "team4s.v3/backend/internal/models"

    "github.com/jackc/pgx/v5/pgxpool"
)
```

**Constructor-Pattern** (Zeilen 43–49 des Analogs):
```go
type AdminUsersRepository struct {
    db *pgxpool.Pool
}

func NewAdminUsersRepository(db *pgxpool.Pool) *AdminUsersRepository {
    return &AdminUsersRepository{db: db}
}
```

**LATERAL-Aggregat-Query-Pattern** (Zeilen 71–85 des Analogs `SearchCandidates`):
```go
rows, err := r.db.Query(ctx, `
    SELECT
        au.id,
        COALESCE(claimed_m.id, legacy_m.id, 0) AS member_id,
        ...
    FROM app_users au
    LEFT JOIN LATERAL (
        SELECT member_id
        FROM member_claims
        WHERE app_user_id = au.id
        ...
    ) claimed_m ON true
`, ...)
```

**Phase-80-Adaption (Page-First-CTE):** Die `ListAdminUsersPage`-Methode baut auf dem LATERAL-Muster auf, ergänzt aber eine `WITH filtered AS (...) page AS (... LIMIT $4 OFFSET $5)` CTE vorweg (RESEARCH.md Pattern 4). Die Aggregate (Rollen, Mitgliedschaften, Konflikte) werden als weitere LATERAL-Joins auf `page` berechnet. Vorlage für `ListUserContributions` ist `admin_content_fansub_releases_contributions_repository.go` (RESEARCH.md Pattern 1 + Code Examples).

**Error-Handling-Pattern** (Zeilen 56–68 des Analogs):
```go
if err != nil {
    return nil, fmt.Errorf("list admin users page: %w", err)
}
defer rows.Close()
```

---

### `backend/internal/handlers/admin_users_handler.go` (handler, request-response)

**Analog:** `backend/internal/handlers/fansub_media_review_handler.go` (vollständige Datei, Zeilen 1–297)

**Imports-Pattern** (Zeilen 1–15):
```go
package handlers

import (
    "context"
    "encoding/json"
    "errors"
    "log"
    "net/http"
    "strconv"

    "team4s.v3/backend/internal/repository"

    "github.com/gin-gonic/gin"
)
```

**Interface-Deklaration-Pattern** (Zeilen 40–57):
```go
type AdminUsersRepository interface {
    ListAdminUsersPage(ctx context.Context, params AdminUserListParams) (*AdminUserListResult, error)
    GetUserOverview(ctx context.Context, appUserID int64) (*AdminUserOverview, error)
    // ... weitere Tab-Methoden
}
```

**Handler-Struct und Konstruktor** (Zeilen 67–92):
```go
type AdminUsersHandler struct {
    repo         AdminUsersRepository
    authzRepo    authzRoleChecker     // für requirePlatformAdminIdentity
    auditLogRepo auditLogWriter
}

func NewAdminUsersHandler(
    repo AdminUsersRepository,
    authzRepo authzRoleChecker,
    auditLogRepo auditLogWriter,
) *AdminUsersHandler {
    return &AdminUsersHandler{
        repo:         repo,
        authzRepo:    authzRepo,
        auditLogRepo: auditLogRepo,
    }
}
```

**Platform-Admin-Gate-Pattern (jeder Handler-Einstieg)** — aus `platform_admin_authz.go` Zeilen 15–73:
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

**Mutations-Audit-Pattern** (aus `fansub_media_review_handler.go` Zeilen 285–294):
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

**Error-Handling-Pattern** (Zeilen 145–150 des Analogs):
```go
if errors.Is(err, repository.ErrNotFound) {
    c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "benutzer nicht gefunden"}})
    return
}
if err != nil {
    log.Printf("admin users: ListUsers error: %v", err)
    internalError(c, "interner serverfehler")
    return
}
```

**Input-Validierung für Enum-Werte** (Zeilen 221–234 des Analogs):
```go
var validStatusValues = map[string]struct{}{
    "active":   {},
    "disabled": {},
}
if _, valid := validStatusValues[status]; !valid {
    badRequest(c, "ungültiger statuswert: erlaubt sind active, disabled")
    return
}
```

---

### `backend/cmd/server/admin_routes.go` (routing — Erweiterung)

**Analog:** gleiche Datei, Zeilen 141–143 (bestehende `/admin/users` GET-Route) + Zeilen 78–81 (Conditional-nil-Guard-Pattern für neue Handler):

```go
// Bestehende Route (ersetzen):
v1.GET("/admin/users", auth, deps.appAuthHandler.ListAppUsers)

// Neue Registrierung (Pattern aus Zeilen 78–81 + 130–131):
if deps.adminUsersHandler != nil {
    v1.GET("/admin/users", auth, deps.adminUsersHandler.ListUsers)
    v1.GET("/admin/users/:userId/overview", auth, deps.adminUsersHandler.GetUserOverview)
    v1.GET("/admin/users/:userId/global-roles", auth, deps.adminUsersHandler.GetUserGlobalRoles)
    v1.PUT("/admin/users/:userId/global-roles/:role", auth, deps.adminUsersHandler.AssignGlobalRole)
    v1.DELETE("/admin/users/:userId/global-roles/:role", auth, deps.adminUsersHandler.RevokeGlobalRole)
    v1.PUT("/admin/users/:userId/status", auth, deps.adminUsersHandler.UpdateUserStatus)
    v1.GET("/admin/users/:userId/member-claims", auth, deps.adminUsersHandler.GetUserMemberClaims)
    v1.GET("/admin/users/:userId/group-memberships", auth, deps.adminUsersHandler.GetUserGroupMemberships)
    v1.GET("/admin/users/:userId/group-rights", auth, deps.adminUsersHandler.GetUserGroupRights)
    v1.GET("/admin/users/:userId/contributions", auth, deps.adminUsersHandler.GetUserContributions)
    v1.GET("/admin/users/:userId/media", auth, deps.adminUsersHandler.GetUserMedia)
    v1.GET("/admin/users/:userId/audit", auth, deps.adminUsersHandler.GetUserAudit)
}
```

**Struct-Erweiterung** (`adminRouteHandlers`, Zeilen 9–27):
```go
type adminRouteHandlers struct {
    // ... bestehende Felder ...
    adminUsersHandler *handlers.AdminUsersHandler   // NEU Phase 80
}
```

---

### `backend/cmd/server/main.go` (wiring — Erweiterung)

**Analog:** gleiche Datei, Zeilen 106–136 (Repository-/Handler-Ketten-Pattern):

```go
// Neues Repository + Handler (Pattern wie Zeilen 125–131):
adminUsersRepo := repository.NewAdminUsersRepository(dbPool)
adminUsersHandler := handlers.NewAdminUsersHandler(
    adminUsersRepo,
    authzRepo,
    auditLogRepo,
)
```

**In `adminRouteHandlers` eintragen** (Pattern wie Zeilen 25–26 im Analog):
```go
adminRouteHandlers{
    // ... bestehende Felder ...
    adminUsersHandler: adminUsersHandler,
}
```

---

### `backend/internal/repository/authz.go` (Erweiterung — `RevokeAppUserGlobalRole`)

**Analog:** gleiche Datei, Zeilen 138–157 (`AssignAppUserGlobalRole`):

```go
func (r *AuthzRepository) RevokeAppUserGlobalRole(ctx context.Context, appUserID int64, roleName string) error {
    if appUserID <= 0 {
        return fmt.Errorf("revoke app role: invalid app user id %d", appUserID)
    }
    role := strings.TrimSpace(roleName)
    if role == "" {
        return fmt.Errorf("revoke app role: role name is required")
    }
    if _, err := r.db.Exec(ctx, `
        DELETE FROM app_user_global_roles
        WHERE app_user_id = $1 AND role = $2
    `, appUserID, role); err != nil {
        return fmt.Errorf("revoke app role %q from app user %d: %w", role, appUserID, err)
    }
    return nil
}

// Last-Admin-Guard: Zählt aktive Plattform-Admins vor Revoke/Disable.
func (r *AuthzRepository) CountActivePlatformAdmins(ctx context.Context) (int, error) {
    var count int
    err := r.db.QueryRow(ctx, `
        SELECT COUNT(*)
        FROM app_user_global_roles agr
        JOIN app_users au ON au.id = agr.app_user_id
        WHERE agr.role = 'platform_admin'
          AND au.status = 'active'
    `).Scan(&count)
    return count, err
}
```

---

### `frontend/src/types/admin-users.ts` (utility/types)

**Analog:** `frontend/src/types/auth.ts` (AppUser-Interfaces als Basis)

**Pattern:** Neue Datei mit benannten TypeScript-Interfaces. Bestehende `AppUser`-Felder aus `auth.ts`-Typen ableiten oder importieren — nicht duplizieren. Neue Felder für Aggregat-Counts und Phase-83-Contribution-Projektionen.

```typescript
// Analog zu AppUser in frontend/src/types/auth.ts
export interface AdminUserListItem {
  id: number
  email: string
  display_name: string
  status: 'pending' | 'active' | 'disabled'
  global_roles: string[]
  // Aggregate-Felder (D-05)
  member_profile_id: number | null
  member_profile_name: string | null
  group_membership_count: number
  leader_context_count: number
  open_claims_count: number
  open_contributions_count: number
  total_contributions_count: number
  media_upload_count: number
  release_scope_count: number
  conflict_count: number
  last_activity_at: string | null
}

export interface AdminUserListParams {
  q?: string
  status?: string
  global_role?: string
  has_conflicts?: boolean
  sort?: string
  limit?: number
  offset?: number
}

export interface AdminUserListResponse {
  data: AdminUserListItem[]
  meta: { total: number; limit: number; offset: number }
}
```

---

### `frontend/src/lib/api.ts` (utility/api-client — Erweiterung)

**Analog:** bestehende `listAdminUsers` (Zeilen 3267–3290) und `listFansubAppMembers` (Zeilen 3292–3310) in gleicher Datei:

```typescript
// Bestehende listAdminUsers (Zeilen 3267–3290) — Vorlage, aber ersetzen:
export async function listAdminUsers(authToken?: string): Promise<AppUserListResponse> {
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/admin/users`, {
    headers: withAuthHeader({}, authToken),
  })
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<AppUserListResponse>
}
```

**Phase-80-Adaption (mit URLSearchParams und apiClientFetch):**
```typescript
// Pattern aus RESEARCH.md Code Examples + listFansubAppMembers-Muster
export async function listAdminUsersPage(
  params: AdminUserListParams,
): Promise<AdminUserListResponse> {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.status) query.set('status', params.status)
  if (params.global_role) query.set('global_role', params.global_role)
  if (params.has_conflicts) query.set('has_conflicts', 'true')
  if (params.sort) query.set('sort', params.sort)
  if (params.limit != null) query.set('limit', String(params.limit))
  if (params.offset != null) query.set('offset', String(params.offset))
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

---

### `frontend/src/app/admin/users/page.tsx` (page/route-shell)

**Analog:** `frontend/src/app/admin/anime/page.tsx` (vollständige Datei, Zeilen 1–84) — exaktes Match

**Pattern:**
```typescript
import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";
import { AdminUsersClient } from "./AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  return (
    <PlatformAdminGate>
      <main>
        <AdminUsersClient />
      </main>
    </PlatformAdminGate>
  );
}
```

Kein Server-seitiger Datenfetch in der Route-Shell (anders als `/admin/anime`-Analog das `animeItems` serverseitig lud — Phase 80 ist vollständig Client-seitig geladen, da URL-State-Filter vorhanden).

---

### `frontend/src/app/admin/users/AdminUsersClient.tsx` (component/controller)

**Analog:** `frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx` (Zeilen 1–80+)

**Imports-Pattern** (Zeilen 1–13 des Analogs):
```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Badge, Button, EmptyState, ErrorState, LoadingState,
  Pagination, Select, Table, TableBody, TableCell,
  TableHead, TableHeaderCell, TableRow,
} from '@/components/ui'
import { ApiError, listAdminUsersPage } from '@/lib/api'
import type { AdminUserListItem, AdminUserListParams } from '@/types/admin-users'
```

**State-Pattern** (Zeilen 76–80 des Analogs):
```typescript
const [items, setItems] = useState<AdminUserListItem[]>([])
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
const [params, setParams] = useState<AdminUserListParams>({ sort: 'last_activity_desc', limit: 25, offset: 0 })
```

**Load-Callback-Pattern** (aus `ContributionsReviewSection.tsx` Zeilen 63–76):
```typescript
const loadUsers = useCallback(async () => {
  try {
    setIsLoading(true)
    setError(null)
    const resp = await listAdminUsersPage(params)
    setItems(resp.data)
    setTotal(resp.meta.total)
  } catch (err) {
    setError(readErrorMessage(err, 'Benutzerliste konnte nicht geladen werden. Bitte Seite neu laden.'))
  } finally {
    setIsLoading(false)
  }
}, [params])
```

---

### `frontend/src/app/admin/users/UserDetailDrawer.tsx` (component/drawer)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx` (Drawer + Tab-Komposition)

**Pflicht-Primitives:**
```typescript
import { Drawer, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
```

**Lazy-Load-Pattern (D-09):** Jeder Tab-Content rendert seine Daten-Komponente nur beim ersten Aktivieren. Vorlage: Tab-State mit `Set<string>` der bereits geladenen Tabs:
```typescript
const [activatedTabs, setActivatedTabs] = useState<Set<string>>(new Set(['overview']))

function handleTabChange(value: string) {
  setActivatedTabs(prev => new Set([...prev, value]))
}
```

**Tab-Komposition** (kein Tab-Logik inline — D-11):
```typescript
<Drawer open={!!userId} onClose={onClose} title={`Benutzer: ${user?.display_name ?? ''}`}>
  <Tabs defaultValue="overview" onValueChange={handleTabChange}>
    <TabsList>
      <TabsTrigger value="overview">Übersicht</TabsTrigger>
      <TabsTrigger value="roles">Globale Rollen</TabsTrigger>
      {/* ... weitere Tabs aus UI-SPEC */}
    </TabsList>
    <TabsContent value="overview">
      {activatedTabs.has('overview') && <UserOverviewTab userId={userId} />}
    </TabsContent>
    <TabsContent value="roles">
      {activatedTabs.has('roles') && <UserGlobalRolesTab userId={userId} />}
    </TabsContent>
    {/* ... */}
  </Tabs>
</Drawer>
```

---

### `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` (component/tab, request-response)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` (Zeilen 48–76 — Lade/Fehler/Empty-State-Pattern)

**Imports-Pattern:**
```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, Modal, SectionHeader } from '@/components/ui'
import { ApiError, getAdminUserOverview, updateAdminUserStatus } from '@/lib/api'
import type { AdminUserOverview } from '@/types/admin-users'
```

**LoadingState/ErrorState/EmptyState-Triade** (aus Analog Zeilen 54–80):
```typescript
if (isLoading) return <LoadingState>Daten werden geladen …</LoadingState>
if (error) return <ErrorState onRetry={loadData}>{error}<Button onClick={loadData}>Erneut versuchen</Button></ErrorState>
if (!data) return <EmptyState>Keine Einträge vorhanden.</EmptyState>
```

**Mutation-mit-Modal-Pattern** (aus `ClaimManagementPanel.tsx` — Modalöffnung + Bestätigung):
```typescript
const [isDisableModalOpen, setIsDisableModalOpen] = useState(false)
const [isMutating, setIsMutating] = useState(false)
const [mutationError, setMutationError] = useState<string | null>(null)
```

---

### `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx` (component/tab, CRUD)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` (Zeilen 1–80 — vollständigstes Analog für List + Mutation + Modal)

**Imports-Pattern** (Zeilen 1–44 des Analogs):
```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Badge, Button, Card, EmptyState, ErrorState, LoadingState,
  Modal, Select, SectionHeader, Table,
  TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from '@/components/ui'
import { ApiError, assignAdminUserGlobalRole, revokeAdminUserGlobalRole, getAdminUserGlobalRoles } from '@/lib/api'
import type { AdminUserGlobalRoles } from '@/types/admin-users'
```

**Assign/Revoke-Modal-Pattern:** Für Vergabe öffnet ein Modal mit Select (Rollenwahl), für Entzug ein Bestätigungsmodal. Inline-Fehlermeldung im Modal (UI-SPEC "Mutation Fehler: Fehlermeldung inline im Modal"). Last-Admin-Guard-Fehlertext: "Die letzte Plattform-Admin-Rolle kann nicht entzogen werden."

---

### `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx` (component/tab, request-response — read-only)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` — read-only Unterbereich

**Pattern:** Identisch zu `ClaimManagementPanel` Lade/Liste-Muster, aber kein Verify/Reject. Zwei Sektionen: "Member-Profil" und "Claims & Einladungen" via `SectionHeader`. Profilstatus wird als `Badge` dargestellt (success=aktiv, muted=Gedenkprofil).

---

### `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` (component/tab — Phase-83-aware)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx`

**Besonderheit:** Vier Gruppen (D-13) via `SectionHeader` getrennt:
- Projektweite Beiträge (Standard) → `release_version_id IS NULL`
- Release-spezifische Overrides → `release_version_id IS NOT NULL`
- Offene / strittige Beiträge → `dispute_state = 'open'`
- Historisch / Legacy → via `fansub_group_member_id` ohne `member_id`

Leere Gruppen werden ausgeblendet (keine Render wenn Count 0). Deep-Link "Release-Version öffnen" als `<a target="_blank">` — analog zu "In Gruppe öffnen"-Links in anderen Tabs.

---

### `frontend/src/components/auth/PlatformAdminGate.tsx` (Bugfix — Erweiterung)

**Analog:** gleiche Datei, Zeilen 15–82

**Zu fixender Pitfall 5 (RESEARCH.md):** Aktuell prüft der Gate nur `hasAccessToken` (Zeile 26). Muss auf `hasAccessToken || hasRefreshToken` erweitert werden:

```typescript
// Zeile 26 (aktuell):
const { hasAccessToken, isClientInitialized } = useAuthSession();

// Zeile 26 (Phase-80-Fix):
const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession();

// Zeile 26 in resolveAdminUser():
// Aktuell:
if (!hasAccessToken) { setIsLoading(false); ... return }

// Fix:
if (!hasAccessToken && !hasRefreshToken) { setIsLoading(false); ... return }
```

---

## Shared Patterns

### Platform-Admin-Gate (Backend)

**Quelle:** `backend/internal/handlers/platform_admin_authz.go` (vollständige Datei, Zeilen 15–73)
**Anwenden auf:** Alle Methoden in `admin_users_handler.go`

```go
func (h *AdminUsersHandler) AnyMethod(c *gin.Context) {
    identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
    if !ok {
        return
    }
    _ = identity  // identity.AppUserID für Audit-ActorID
    // ...
}
```

### Audit-Write nach Mutation

**Quelle:** `backend/internal/handlers/fansub_media_review_handler.go` Zeilen 285–294; `backend/internal/repository/audit_logs.go` Zeilen 11–23 (`AuditLogEntry`-Struct)
**Anwenden auf:** `AssignGlobalRole`, `RevokeGlobalRole`, `UpdateUserStatus` in `admin_users_handler.go`

```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "app_user_global_role.assigned",  // oder .revoked / app_user_status.disabled etc.
    TargetType:     "app_user",
    TargetID:       &targetAppUserID,
    Action:         "assign_global_role",
    Outcome:        "allowed",
    Payload:        map[string]any{"role": role},
})
```

Event-Namen (RESEARCH.md Pattern 5):
- `app_user_global_role.assigned` / `.revoked`
- `app_user_global_role.assign.denied` / `.revoke.denied`
- `app_user_status.disabled` / `.reactivated` / `.change.denied`

### Frontend Lade/Fehler/Empty-Triade

**Quelle:** `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` Zeilen 48–80
**Anwenden auf:** Alle 8 Tab-Komponenten unter `tabs/`

```typescript
const [data, setData] = useState<T | null>(null)
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

const loadData = useCallback(async () => {
  try {
    setIsLoading(true)
    setError(null)
    const resp = await apiCall(userId)
    setData(resp)
  } catch (err) {
    setError(err instanceof ApiError ? err.message : 'Daten konnten nicht geladen werden. Erneut versuchen.')
  } finally {
    setIsLoading(false)
  }
}, [userId])

useEffect(() => { void loadData() }, [loadData])
```

### API-Helper-Pattern (`frontend/src/lib/api.ts`)

**Quelle:** `listAdminUsers` Zeilen 3267–3290 (zu ersetzendes Muster) und `listFansubAppMembers` Zeilen 3292–3310 (URLSearchParams-Muster)
**Anwenden auf:** Alle neuen Tab-Endpunkt-Helper in `api.ts`

```typescript
export async function getAdminUserOverview(userId: number): Promise<AdminUserOverviewResponse> {
  const response = await apiClientFetch(`/api/v1/admin/users/${userId}/overview`, { cache: 'no-store' })
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<AdminUserOverviewResponse>
}
```

### Globale UI-Primitives (Frontend)

**Quelle:** `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` Zeilen 9–20 (Pflicht-Import-Block)
**Anwenden auf:** Alle Frontend-Komponenten in Phase 80

```typescript
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  Pagination,
  Select,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Toolbar,
} from '@/components/ui'
```

Kein natives `<select>`, `<input>`, `<textarea>`, `<button>` in Produktcode.

### Contribution-Auflösung Phase 83 (Backend — Wiederverwenden, nicht replizieren)

**Quelle:** `backend/internal/repository/authz_permissions.go` Zeilen 190–277 (`ListActorContributionRolesForVersion`)
**Quelle:** `backend/internal/repository/admin_content_fansub_releases_contributions_repository.go` Zeilen 38–80 (`ListEffectiveContributionsForVersion`)

**Warnung:** NICHT neu bauen. `AdminUsersRepository.ListUserContributions` leitet die SQL-Struktur aus diesen bestehenden Methoden ab (user-zentrische Sicht statt release-zentrischer Sicht), ruft aber die bestehenden Methoden nicht direkt auf (da User-ID als Anker, nicht Release-Version-ID).

```go
// Richtig: User-zentrische Adaption der Phase-83-SQL-Struktur
WHERE ac.member_id = $1  -- kanonischer Anker (Migration 0105)
  AND ac.release_version_id IS NULL  -- Projekt-Defaults

// Falsch (Pitfall 7): JOIN über fansub_group_member_id statt member_id
```

---

## No Analog Found

| Datei | Rolle | Datenfluss | Grund |
|-------|-------|-----------|-------|
| *(keine)* | — | — | Alle Dateien haben ausreichende Analoge im Codebase |

---

## Metadata

**Analog-Suchbereich:** `backend/internal/handlers/`, `backend/internal/repository/`, `backend/internal/models/`, `backend/cmd/server/`, `frontend/src/app/admin/`, `frontend/src/components/auth/`, `frontend/src/lib/api.ts`
**Gescannte Dateien:** ~25 Quelldateien
**Pattern-Extraction-Datum:** 2026-06-15

---

## Anti-Pattern-Erinnerungen (für Executor)

| Anti-Pattern | Warum gefährlich | Korrekte Alternative |
|--------------|-----------------|----------------------|
| Phase-83-Zweistufen-SQL neu bauen | `ListActorContributionRolesForVersion` ist getestet (16/16) | SQL-Muster adaptieren, nicht replizieren |
| `fansub_group_member_id` als Contributions-Anker | Seit Migration 0105 veraltet; `member_id` ist NOT NULL und kanonisch | `WHERE ac.member_id = $1` |
| N+1 über Tab-Daten in Listenseite | Performance-Problem bei vielen Usern | Page-First-CTE + LATERAL |
| Scoped Rechte im Drawer editieren | Explizit deferred (D-03) | Nur anzeigen + Deep-Link |
| `hasAccessToken` allein im PlatformAdminGate | Refresh-Token-only-Session sieht Logged-out | `hasAccessToken \|\| hasRefreshToken` |
| Letzten Plattform-Admin sperren | Lockout-Risiko | `CountActivePlatformAdmins`-Guard vor Revoke/Disable |
| Native `<select>`/`<input>` statt UI-Primitives | Verletzt CLAUDE.md-Pflicht | `@/components/ui` Select, Input, Button etc. |
| Monolith-Datei > 450 Zeilen | CLAUDE.md-Verstoß | Modulare Tab-Dateien unter `tabs/` |
