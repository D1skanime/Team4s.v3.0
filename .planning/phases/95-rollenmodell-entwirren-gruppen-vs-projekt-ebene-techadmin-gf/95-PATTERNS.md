# Phase 95: Rollenmodell entwirren — Pattern Map

**Erstellt:** 2026-06-30
**Dateien analysiert:** 17 neue/geänderte Dateien
**Analoge gefunden:** 15 / 17

---

## Datei-Klassifikation

| Neue/Geänderte Datei | Rolle | Datenfluss | Nächstes Analog | Matchqualität |
|---|---|---|---|---|
| `database/migrations/0112_role_model_cleanup.up.sql` | migration | batch | `database/migrations/0108_capability_registry.up.sql` | exakt |
| `database/migrations/0112_role_model_cleanup.down.sql` | migration | batch | `database/migrations/0085_role_definitions_seed.up.sql` | rolle-match |
| `backend/internal/repository/authz_permissions.go` (MOD: `LoadFansubGroupRoles`) | repository | CRUD | `LoadRoleCapabilities` in derselben Datei Z.200-223 | exakt |
| `backend/internal/permissions/permissions.go` (MOD: catalog data-driven) | service | event-driven | `LoadCache` + `CacheLoader`-Interface in derselben Datei Z.244-287 | exakt |
| `backend/internal/handlers/admin_group_roles_handler.go` (NEU) | handler | request-response | `admin_capability_handler.go` Z.50-69 | exakt |
| `backend/internal/repository/fansub_group_app_members_repository.go` (MOD: Auto-Archivierung) | repository | CRUD | `SetMemberRole(Enable=false)` in derselben Datei Z.399-414 | exakt |
| `backend/internal/repository/hist_group_member_roles_repository.go` (MOD: Whitelist) | repository | CRUD | `ListGroupHistoryRoleDefinitions` in derselben Datei Z.245-280 | exakt |
| `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` (MOD: CR-01/WR-02) | handler | request-response | `CreateHistGroupMemberRole` in derselben Datei Z.157-292 | exakt |
| `backend/internal/handlers/admin_capability_handler.go` (MOD: Interface-Felder WR-01) | handler | request-response | `NewAdminCapabilityHandler` in derselben Datei Z.28-45 | exakt |
| `backend/internal/handlers/admin_capability_handler_test.go` (MOD: Stub entfernen WR-01) | test | request-response | Stub-Struct Z.506-626 (zu ersetzen) | exakt |
| `frontend/src/types/fansub.ts` (MOD: FansubGroupRoleCode + API-Typ) | model | request-response | `FANSUB_GROUP_ROLE_OPTIONS` Z.413-424 | exakt |
| `frontend/src/lib/api.ts` (MOD: `listFansubGroupRoles()`) | utility | request-response | `listGroupHistoryRoleDefinitions` Z.9288-9313 | exakt |
| `frontend/src/components/contributions/contributionRoles.ts` (MOD: project_manager entfernen) | model | transform | bestehende Liste Z.1-16 | exakt |
| `frontend/src/components/contributions/ProposalForm.tsx` (SPLIT D-16) | component | request-response | `ProposalForm.tsx` eigene Datei Z.1-541 | exakt |
| `frontend/src/components/contributions/ProposalForm.steps.tsx` (NEU) | component | request-response | `ProposalForm.tsx` Step-Panels (Z.60+) | rolle-match |
| `frontend/src/app/dev/ui-system/page.tsx` (SPLIT D-16) | component | request-response | eigene Datei Z.1-1251 | exakt |
| `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx` (MOD: D-17) | component | request-response | eigene Datei Z.40-46 | exakt |

---

## Pattern-Zuweisungen

### `database/migrations/0112_role_model_cleanup.up.sql` (migration, batch)

**Analog:** `database/migrations/0108_capability_registry.up.sql`

**Imports-Muster** — kein Go-Code; SQL mit BEGIN/COMMIT:
```sql
-- Migration 0108 Z.1-6:
BEGIN;
-- ...
COMMIT;
```

**Kern-Muster** — idempotente INSERT mit ON CONFLICT, UPDATE vor DELETE (FK-Reihenfolge), Z.26-127 als Vorlage:
```sql
-- 0085 Z.12-44: Reihenfolge beachten — erst Daten umschreiben, dann alte Zeilen löschen

-- Schritt 1: Spalte assignable hinzufügen (einmalig)
ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS assignable BOOLEAN NOT NULL DEFAULT false;

-- Schritt 2: label_de aktualisieren (D-05)
UPDATE role_definitions SET label_de = 'Gruppenleitung'        WHERE code = 'fansub_lead';
UPDATE role_definitions SET label_de = 'Fansub-Projektleitung' WHERE code = 'project_lead';

-- Schritt 3: Historische Einträge migrieren VOR FK-Delete (D-04, Fallstrick 1)
UPDATE hist_group_member_roles SET role_code = 'fansub_lead'  WHERE role_code = 'leader';
UPDATE hist_group_member_roles SET role_code = 'project_lead' WHERE role_code = 'project_manager';

-- Schritt 4: Alte role_definitions entfernen (nach Schritt 3, wegen FK ON DELETE RESTRICT)
DELETE FROM role_definitions WHERE code IN ('leader', 'project_manager');

-- Schritt 5: Neue Rollen anlegen (D-07) — Muster aus 0108 Z.54
INSERT INTO role_definitions (code, label_de, contexts, sort_order, assignable) VALUES
    ('techadmin', 'Techadmin',    ARRAY['fansub_group'], 5, true),
    ('gfxler',    'GFX / Grafik', ARRAY['fansub_group'], 6, true)
ON CONFLICT (code) DO NOTHING;

-- Schritt 6: assignable=true für bestehende Gruppenrollen (D-03/D-08)
UPDATE role_definitions SET assignable = true
WHERE code IN ('fansub_lead', 'co_leader', 'founder', 'project_lead');

-- Schritt 7: fansub_group-Kontext für Gruppenrollen ergänzen (D-03)
UPDATE role_definitions
SET contexts = array_append(contexts, 'fansub_group')
WHERE code IN ('fansub_lead', 'co_leader', 'founder', 'project_lead')
  AND NOT 'fansub_group' = ANY(contexts);
```

**Fehlerbehandlung:** Kein Try-Catch in SQL; Transaktion sorgt für atomaren Rollback. Migrations-Skript-Konvention: `BEGIN;` oben, `COMMIT;` unten (wie 0108).

**Kritisch:** `fansub_lead` muss in `groupHistoryDialogRoleWhitelist` vorhanden sein VOR der Migration — Go-Code-Sync erforderlich.

---

### `backend/internal/repository/authz_permissions.go` (MOD: `LoadFansubGroupRoles`, repository, CRUD)

**Analog:** `LoadRoleCapabilities` in derselben Datei, Z.200-223

**Imports-Muster** (Z.1-9 der Datei):
```go
package repository

import (
    "context"
    "fmt"
    "strings"

    "team4s.v3/backend/internal/permissions"
)
```

**Kern-Muster** — Query + Row-Scan-Schleife, identisch zu `LoadRoleCapabilities` Z.200-223:
```go
// LoadRoleCapabilities Z.200-223 — direkte Vorlage für LoadFansubGroupRoles:
func (r *AuthzRepository) LoadRoleCapabilities(ctx context.Context) (map[string][]permissions.Action, error) {
    rows, err := r.db.Query(ctx, `
        SELECT role_code, action_code
        FROM role_capabilities
        ORDER BY role_code, action_code
    `)
    if err != nil {
        return nil, fmt.Errorf("load role capabilities: %w", err)
    }
    defer rows.Close()

    result := make(map[string][]permissions.Action)
    for rows.Next() {
        var role, action string
        if err := rows.Scan(&role, &action); err != nil {
            return nil, fmt.Errorf("load role capabilities: scan: %w", err)
        }
        result[role] = append(result[role], permissions.Action(action))
    }
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("load role capabilities: iterate: %w", err)
    }
    return result, nil
}
```

**Neue Methode (D-12) — analog dazu:**
```go
// Neu in authz_permissions.go nach Z.223:
func (r *AuthzRepository) LoadFansubGroupRoles(ctx context.Context) ([]string, error) {
    rows, err := r.db.Query(ctx, `
        SELECT code FROM role_definitions
        WHERE assignable = true
        ORDER BY sort_order, code
    `)
    if err != nil {
        return nil, fmt.Errorf("load fansub group roles: %w", err)
    }
    defer rows.Close()

    var result []string
    for rows.Next() {
        var code string
        if err := rows.Scan(&code); err != nil {
            return nil, fmt.Errorf("load fansub group roles: scan: %w", err)
        }
        result = append(result, strings.TrimSpace(code))
    }
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("load fansub group roles: iterate: %w", err)
    }
    return result, nil
}

// Compile-Zeit-Assertion — Muster aus Z.226:
var _ permissions.CatalogLoader = (*AuthzRepository)(nil)
```

**Fehlerbehandlung:** `fmt.Errorf("...: %w", err)` durchgängig, `rows.Err()` nach Schleife prüfen (Z.218-221 als Muster).

---

### `backend/internal/permissions/permissions.go` (MOD: data-driven catalog, service, event-driven)

**Analog:** `LoadCache` + `CacheLoader`-Interface + `cacheMu sync.RWMutex` in derselben Datei Z.163-166, 244-287

**Cache-Architektur-Muster** (Z.163-166 + Z.263-287):
```go
// Bestehende Mutex-Struktur (Z.163-166):
var (
    cacheMu     sync.RWMutex
    loadedCache map[string][]Action
)

// Neues Pendant für fansubGroupRoleCatalog:
var (
    catalogMu            sync.RWMutex
    fansubGroupRoleCatalog []string  // bisher statische Slice Z.200-211 → wird dynamisiert
)
```

**Interface-Muster** (Z.244-248 als Vorlage für `CatalogLoader`):
```go
// Bestehend (Z.244-248):
type CacheLoader interface {
    LoadRoleCapabilities(ctx context.Context) (map[string][]Action, error)
}

// Neu hinzufügen:
type CatalogLoader interface {
    LoadFansubGroupRoles(ctx context.Context) ([]string, error)
}
```

**LoadCache-Muster** (Z.263-287) — für `LoadFansubGroupCatalog` kopieren:
```go
// Muster aus LoadCache Z.263-287:
func (s *Service) LoadCache(ctx context.Context, loader CacheLoader) error {
    m, err := loader.LoadRoleCapabilities(ctx)
    if err != nil {
        return fmt.Errorf("permission cache load: %w", err)
    }
    // ... Konsistenz-Check ...
    cacheMu.Lock()
    loadedCache = m
    cacheMu.Unlock()
    return nil
}

// Analog für Catalog (neu nach Z.287):
func (s *Service) LoadFansubGroupCatalog(ctx context.Context, loader CatalogLoader) error {
    roles, err := loader.LoadFansubGroupRoles(ctx)
    if err != nil {
        return fmt.Errorf("fansub group catalog load: %w", err)
    }
    catalogMu.Lock()
    fansubGroupRoleCatalog = roles
    catalogMu.Unlock()
    return nil
}
```

**Neue Rollen-Konstanten** — nach Z.54 einfügen:
```go
// Bestehend (Z.42-54):
const (
    RolePlatformAdmin  = "platform_admin"
    RoleFansubLead     = "fansub_lead"
    // ...
    RoleDesigner       = "designer"
)

// Neu hinzufügen:
const (
    RoleTechadmin = "techadmin"
    RoleGfxler    = "gfxler"
)
```

**`FansubGroupRoles()` + `IsKnownFansubGroupRole()`** (Z.299-305) bleiben erhalten, lesen nach D-12 aus der dynamisier ten `fansubGroupRoleCatalog`-Slice — kein Quell-Änderungsbedarf in den Funktions-Bodies.

**Startup-Reihenfolge (Fallstrick 5):** `LoadCache` ZUERST, dann `LoadFansubGroupCatalog` — in `backend/cmd/server/main.go`.

---

### `backend/internal/handlers/admin_group_roles_handler.go` (NEU, handler, request-response)

**Analog:** `admin_capability_handler.go` — `ListCapabilityMatrix` Z.50-69

**Imports-Muster** (aus `admin_capability_handler.go` Z.1-11):
```go
package handlers

import (
    "log"
    "net/http"

    "team4s.v3/backend/internal/permissions"
    "team4s.v3/backend/internal/repository"

    "github.com/gin-gonic/gin"
)
```

**Struct + Konstruktor-Muster** (Z.28-45):
```go
// Vorlage aus AdminCapabilityHandler Z.28-45:
type AdminGroupRolesHandler struct {
    authzRepo    *repository.AuthzRepository
    rolesRepo    *repository.HistGroupMemberRolesRepository  // für RoleDefinitionOption-Typ
}

func NewAdminGroupRolesHandler(
    authzRepo *repository.AuthzRepository,
    rolesRepo *repository.HistGroupMemberRolesRepository,
) *AdminGroupRolesHandler {
    return &AdminGroupRolesHandler{authzRepo: authzRepo, rolesRepo: rolesRepo}
}
```

**Auth-Muster** — `requirePlatformAdminIdentity` (Z.51 aus `ListCapabilityMatrix`):
```go
// Vorlage aus ListCapabilityMatrix Z.50-69:
func (h *AdminCapabilityHandler) ListCapabilityMatrix(c *gin.Context) {
    _, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
    if !ok {
        return
    }
    // ...
    c.JSON(http.StatusOK, matrix)
}
```

**Kern-Muster — neuer Endpunkt `GET /admin/fansub-group-roles`:**
```go
// GET /api/v1/admin/fansub-group-roles
func (h *AdminGroupRolesHandler) ListFansubGroupRoles(c *gin.Context) {
    _, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
    if !ok {
        return
    }

    roles := permissions.FansubGroupRoles()   // liefert aktuellen Catalog-Snapshot

    type roleItem struct {
        Code string `json:"code"`
    }
    items := make([]roleItem, len(roles))
    for i, r := range roles {
        items[i] = roleItem{Code: r}
    }

    c.JSON(http.StatusOK, gin.H{"data": items})
}
```

**Fehlerbehandlung:** `internalError(c, "...")` für Repo-Fehler (Muster aus `admin_capability_handler.go` Z.59); kein Repo-Aufruf nötig wenn `permissions.FansubGroupRoles()` aus Cache liest.

---

### `backend/internal/repository/fansub_group_app_members_repository.go` (MOD: Auto-Archivierung D-10)

**Analog:** `SetMemberRole(Enable=false)`-Pfad in derselben Datei Z.399-426

**Bestehender Delete-Block** (Z.407-413) — Auto-Archivierung direkt davor/danach einfügen:
```go
// Bestehend Z.399-413 — VORHER lesen, DANACH einfügen:
if input.Enable {
    // INSERT ...
} else {
    // VOR dem DELETE: created_at lesen
    var roleCreatedAt time.Time
    var roleID int64
    _ = r.db.QueryRow(ctx,
        `SELECT id, created_at FROM fansub_group_member_roles
         WHERE fansub_group_member_id = $1 AND role = $2`,
        memberID, role).Scan(&roleID, &roleCreatedAt)

    if _, err := r.db.Exec(ctx, `
        DELETE FROM fansub_group_member_roles
        WHERE fansub_group_member_id = $1 AND role = $2
    `, memberID, role); err != nil {
        return nil, fmt.Errorf("set fansub group member role: delete role: %w", err)
    }

    // NACH dem DELETE: Auto-Archivierung (D-10) — fail-open
    if !roleCreatedAt.IsZero() {
        var histMemberID int64
        err := r.db.QueryRow(ctx,
            `SELECT hfgm.id FROM hist_fansub_group_members hfgm
             JOIN fansub_group_members fgm ON fgm.app_user_id = hfgm.app_user_id
             WHERE fgm.id = $1 AND hfgm.fansub_group_id = $2
             LIMIT 1`,
            memberID, fansubGroupID).Scan(&histMemberID)
        if err == nil && histMemberID > 0 {
            _, _ = r.db.Exec(ctx,
                `INSERT INTO hist_group_member_roles
                 (hist_fansub_group_member_id, role_code, started_year, ended_year, status, visibility)
                 VALUES ($1, $2, $3, $4, 'ended', 'internal')
                 ON CONFLICT DO NOTHING`,
                histMemberID, role, roleCreatedAt.Year(), time.Now().Year())
        }
    }
}
```

**Fehlerbehandlung:** Auto-Archivierung ist fail-open — Fehler beim hist-Lookup oder INSERT werden NICHT propagiert (kein `return nil, err`). Nur der DELETE selbst ist fehler-kritisch (Z.408-413 Muster beibehalten).

---

### `backend/internal/repository/hist_group_member_roles_repository.go` (MOD: Whitelist D-06/D-13)

**Analog:** `groupHistoryDialogRoleWhitelist` + `ListGroupHistoryRoleDefinitions` in derselben Datei Z.245-280

**Whitelist-Update** (D-06) — Z.245-250 ersetzen:
```go
// VORHER (Z.245-250):
var groupHistoryDialogRoleWhitelist = []string{
    "founder",
    "leader",
    "co_leader",
    "project_manager",
}

// NACHHER (D-06):
var groupHistoryDialogRoleWhitelist = []string{
    "founder",
    "fansub_lead",
    "co_leader",
    "project_lead",
    "techadmin",
    "gfxler",
}
```

**Neue Methode `IsGroupHistoryWhitelistRole`** (D-13/CR-01) — nach Z.280 einfügen:
```go
// Neu nach Z.280 (Muster: schlanke Slice-Prüfung, kein DB-Aufruf):
func (r *HistGroupMemberRolesRepository) IsGroupHistoryWhitelistRole(code string) bool {
    for _, c := range groupHistoryDialogRoleWhitelist {
        if c == code {
            return true
        }
    }
    return false
}
```

**Fehlerbehandlung:** Keine — pure Slice-Iteration, kein Error-Return.

---

### `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` (MOD: CR-01/WR-02)

**Analog:** Bestehende Methoden in derselben Datei

**CR-01-Fix** (D-13) — `CreateHistGroupMemberRole` Z.237-250 ersetzen:
```go
// VORHER (Z.237-250):
valid, err := h.rolesRepo.RoleCodeExistsForContext(c.Request.Context(), req.RoleCode, "group_history")
if err != nil {
    log.Printf("hist group member roles create: role validation error (role_code=%s): %v", req.RoleCode, err)
    internalError(c, "interner serverfehler")
    return
}
if !valid {
    c.JSON(http.StatusUnprocessableEntity, gin.H{
        "error": gin.H{"message": "ungültiger role_code für group_history-Kontext"},
    })
    return
}

// NACHHER (D-13) — DB-Abfrage entfällt, Go-Methode stattdessen:
if !h.rolesRepo.IsGroupHistoryWhitelistRole(req.RoleCode) {
    c.JSON(http.StatusUnprocessableEntity, gin.H{
        "error": gin.H{"message": "ungültiger role_code für group_history-Kontext"},
    })
    return
}
```

**WR-02-Fix** (D-14) — Cross-Group-Check in `ListHistGroupMemberRoles` nach Z.143 einfügen:
```go
// NACH memberID-Parse (Z.143) und VOR ListByMember (Z.145) — Muster aus CreateHistGroupMemberRole Z.213-235:
memberRow, err := h.histMembersRepo.GetByID(c.Request.Context(), memberID)
if errors.Is(err, repository.ErrNotFound) {
    c.JSON(http.StatusNotFound, gin.H{
        "error": gin.H{"message": "mitgliedschaftseintrag nicht gefunden"},
    })
    return
}
if err != nil {
    log.Printf("hist group member roles list: member lookup error (member_id=%d): %v", memberID, err)
    internalError(c, "interner serverfehler")
    return
}
if memberRow.FansubGroupID != fansubID {
    c.JSON(http.StatusUnprocessableEntity, gin.H{
        "error": gin.H{"message": "mitglied gehört nicht zu dieser fansubgruppe"},
    })
    return
}
```

**Fehlerbehandlung:** `errors.Is(err, repository.ErrNotFound)` + `log.Printf` + `internalError` (Muster aus Z.214-227).

---

### `backend/internal/handlers/admin_capability_handler.go` (MOD: Interface-Felder WR-01/D-15)

**Analog:** Bestehende Interface-Deklarationen in derselben Datei Z.15-25

**Problem (Z.28-32):** Handler hält `*repository.AuthzRepository` (konkreter Typ) statt Interfaces:
```go
// VORHER (Z.28-32):
type AdminCapabilityHandler struct {
    authzRepo    *repository.AuthzRepository
    permissionSvc *permissions.Service
    auditLogRepo *repository.AuditLogRepository
}
```

**Interface-Felder-Muster** (D-15) — bestehende Interfaces `capabilityAuthzRepo`, `capabilityMutationRepo` (Z.15-25) nutzen:
```go
// NACHHER — Interfaces statt konkrete Typen:
type AdminCapabilityHandler struct {
    authzRepo    capabilityAuthzRepo     // statt *repository.AuthzRepository
    mutationRepo capabilityMutationRepo  // statt *repository.AuthzRepository
    permissionSvc capabilityPermissionSvc
    auditLogRepo  capabilityAuditRepo
}
```

**Konstruktor anpassen** (Z.35-45):
```go
func NewAdminCapabilityHandler(
    authzRepo     capabilityAuthzRepo,
    mutationRepo  capabilityMutationRepo,
    permissionSvc capabilityPermissionSvc,
    auditLogRepo  capabilityAuditRepo,
) *AdminCapabilityHandler {
    return &AdminCapabilityHandler{
        authzRepo:    authzRepo,
        mutationRepo: mutationRepo,
        permissionSvc: permissionSvc,
        auditLogRepo:  auditLogRepo,
    }
}
```

**Fehlende Interfaces** (`capabilityPermissionSvc`, `capabilityAuditRepo`) nach Z.25 ergänzen — Muster aus `capabilityAuthzRepo` Z.15-17.

---

### `backend/internal/handlers/admin_capability_handler_test.go` (MOD: Stub entfernen WR-01/D-15)

**Analog:** Stub-Struct Z.506-626 — dieser wird GELÖSCHT

**Neues Test-Muster** — Tests konstruieren `NewAdminCapabilityHandler` direkt mit Stubs:
```go
// NACHHER (nach Stub-Entfernung):
h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
router := gin.New()
router.PUT("/...", h.GrantCapability)
```

**Stub-Definitionen** bleiben (`stubCapabilityAuthzRepo`, `stubCapabilityPermissionSvc`, `captureAuditLogRepo`) — nur `adminCapabilityHandlerWithStubs` + seine Methoden (Z.506-626) entfallen.

---

### `frontend/src/types/fansub.ts` (MOD: FansubGroupRoleCode + API-Typ, model, request-response)

**Analog:** Bestehende `FansubGroupRoleCode` + `FANSUB_GROUP_ROLE_OPTIONS` Z.400-424

**Typ-Update** (D-01/D-07) — `FansubGroupRoleCode` um neue Codes erweitern:
```typescript
// Vorlage Z.400-405:
export type FansubGroupRoleCode =
  | 'fansub_lead'
  | 'co_leader'
  // ... bestehende Codes ...
  | 'designer'
  // NEU (D-07):
  | 'techadmin'
  | 'gfxler';
```

**`FANSUB_GROUP_ROLE_OPTIONS`** (Z.413-424) — nach D-12 nur noch als Fallback oder komplett durch API-Fetch ersetzen. Wenn statisch belassen: `techadmin` + `gfxler` einfügen, Label `fansub_lead` → „Gruppenleitung" (D-05).

**Neuer API-Response-Typ** für `listFansubGroupRoles`:
```typescript
// Analog zu RoleDefinitionOption (bereits in types):
export interface FansubGroupRoleItem {
  code: FansubGroupRoleCode
  label_de: string
  sort_order: number
}
```

---

### `frontend/src/lib/api.ts` (MOD: `listFansubGroupRoles()`, utility, request-response)

**Analog:** `listGroupHistoryRoleDefinitions` Z.9288-9313 — direkte Kopiervorlage

**Kern-Muster** (Z.9288-9313):
```typescript
// Vorlage listGroupHistoryRoleDefinitions Z.9288-9313:
export async function listGroupHistoryRoleDefinitions(
  fansubId: number | string,
): Promise<RoleDefinitionOption[]> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${encodeURIComponent(String(fansubId))}/role-definitions?context=group_history`,
    { cache: 'no-store' },
  )

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  const payload = (await response.json()) as { data?: RoleDefinitionOption[] }
  return payload.data ?? []
}
```

**Neue Funktion** — analog dazu, ohne fansubId (globaler Platform-Admin-Endpunkt):
```typescript
// Neu in api.ts (nach listGroupHistoryRoleDefinitions):
export async function listFansubGroupRoles(): Promise<FansubGroupRoleItem[]> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansub-group-roles`,
    { cache: 'no-store' },
  )

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  const payload = (await response.json()) as { data?: FansubGroupRoleItem[] }
  return payload.data ?? []
}
```

---

### `frontend/src/components/contributions/contributionRoles.ts` (MOD: D-04)

**Analog:** Eigene Datei Z.1-16

**Änderung** — `project_manager` entfernen (Z.9):
```typescript
// VORHER (Z.1-16):
export const ANIME_CONTRIBUTION_ROLES: RoleDefinition[] = [
  // ...
  { code: 'project_manager', label_de: 'Projektmanagement' },  // ← ENTFERNEN
  // ...
]

// NACHHER: Zeile für 'project_manager' ersatzlos löschen
```

`project_lead` in dieser Datei: Scope mit Planner/Nutzer klären (A3 aus RESEARCH.md). Bis zur Klärung belassen.

---

### `frontend/src/components/contributions/ProposalForm.tsx` (SPLIT D-16, component, request-response)

**Analog:** Eigene Datei Z.1-541

**Split-Strategie** — Step-Panels extrahieren:
```typescript
// ProposalForm.tsx Z.55-59: STEPS-Konstante und WizardStep-Typ bleiben
// ProposalForm.steps.tsx (NEU): Enthält Step1GroupProject, Step2Role, Step3NoteRange
// ChoiceSelect (innere Komponente) → ebenfalls in ProposalForm.steps.tsx oder eigene Datei

// Imports-Muster aus ProposalForm.tsx Z.1-12:
'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, FormField, Modal, Textarea, YearPicker } from '@/components/ui'
// ...
```

**UI-Primitive-Pflicht:** Alle Step-Komponenten MÜSSEN `@/components/ui`-Primitives nutzen (CLAUDE.md Constraint). Keine nativen `<select>`, `<input>`, `<textarea>`, `<button>`.

**Ziel-Zeilenzahlen:** `ProposalForm.tsx` ≤ 430 Zeilen, `ProposalForm.steps.tsx` ≤ 420 Zeilen.

---

### `frontend/src/app/dev/ui-system/page.tsx` (SPLIT D-16, component, request-response)

**Analog:** Eigene Datei Z.1-1251

**Split-Strategie** — Showcase-Module extrahieren:
```typescript
// page.tsx Z.1-4: Imports bleiben, neue Showcase-Imports ergänzen
// NEU: frontend/src/app/dev/ui-system/showcase/AccordionShowcase.tsx
// NEU: frontend/src/app/dev/ui-system/showcase/SwitchShowcase.tsx

// Muster aus page.tsx Z.1-37 (Import + Named-Exports für UI-Primitives):
'use client'

import { Accordion, Switch, ... } from '@/components/ui'
import { AccordionShowcase } from './showcase/AccordionShowcase'
import { SwitchShowcase } from './showcase/SwitchShowcase'
```

**Ziel:** `page.tsx` ≤ 400 Zeilen, je Showcase-Datei ≤ 200 Zeilen.

---

### `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx` (MOD: D-17)

**Analog:** Eigene Datei Z.40-46

**Problem** (Z.40-46 — nicht-deterministisch):
```typescript
// VORHER (Z.41-46):
const byCategory = new Map<string, typeof role.actions>()
for (const action of role.actions) {
    const existing = byCategory.get(action.category) ?? []
    existing.push(action)
    byCategory.set(action.category, existing)
}
const accordionItems = Array.from(byCategory.entries()).map(...)
```

**Fix-Muster** (D-17) — `useMemo` + explizite Reihenfolge (Imports bereits vorhanden: `useMemo` fehlt noch):
```typescript
// NACHHER — nach 'use client' und bestehenden Imports:
import { useMemo } from 'react'

const CATEGORY_ORDER = ['gruppe', 'projekt', 'release']

// In RoleCapabilityDetail-Funktion, Z.40 ersetzen:
const accordionItems = useMemo(() => {
  const byCategory = new Map<string, typeof role.actions>()
  for (const action of role.actions) {
    const existing = byCategory.get(action.category) ?? []
    existing.push(action)
    byCategory.set(action.category, existing)
  }
  const sortedCats = [...byCategory.keys()].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
  return sortedCats.map(cat => ({
    id: cat,
    title: categoryDisplayLabel(cat),
    children: (/* bestehende JSX-Struktur aus Z.48-102 */)
  }))
}, [role])
```

---

## Gemeinsame Muster (Shared Patterns)

### Platform-Admin-Auth-Guard
**Quelle:** `backend/internal/handlers/admin_capability_handler.go` Z.51
**Anwenden auf:** `admin_group_roles_handler.go` (neuer Handler)
```go
_, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
if !ok {
    return
}
```

### Fansub-Permission-Guard
**Quelle:** `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` Z.88-96
**Anwenden auf:** Alle Handler mit Fansub-Scope (`ActionFansubGroupMembersView` / `ActionFansubGroupMembersManage`)
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
if err != nil {
    writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
    return
}
if !result.Allowed {
    auditPermissionDenied(...)
    writePermissionDenied(c, result)
    return
}
```

### Repository-Fehlerbehandlung (Go)
**Quelle:** `fansub_group_app_members_repository.go` Z.374-413 durchgängig
**Anwenden auf:** Alle neuen Repository-Methoden
```go
if err != nil {
    return nil, fmt.Errorf("set fansub group member role: delete role: %w", err)
}
```

### Cache-Reload nach Mutation
**Quelle:** `admin_capability_handler.go` Z.110-112
**Anwenden auf:** Alle Handler die `role_capabilities` oder `role_definitions` mutieren
```go
if err := h.permissionSvc.ReloadCache(c.Request.Context(), h.authzRepo); err != nil {
    log.Printf("... ReloadCache fehlgeschlagen: %v — alter Cache bleibt gültig", err)
}
```

### Audit-Log-Eintrag
**Quelle:** `admin_capability_handler.go` Z.114-123 + `fansub_hist_group_member_roles_handler.go` Z.277-287
**Anwenden auf:** Alle Mutationen in neuen/geänderten Handlern
```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "...",
    ScopeType:      permissions.ScopeTypeGroup,
    ScopeID:        &fansubID,
    TargetType:     "...",
    Action:         "...",
    Outcome:        "allowed",
    Payload:        map[string]any{},
})
```

### API-Fetch-Muster (Frontend)
**Quelle:** `frontend/src/lib/api.ts` Z.9288-9313 (`listGroupHistoryRoleDefinitions`)
**Anwenden auf:** `listFansubGroupRoles()` (neue Funktion)
```typescript
const response = await authorizedFetch(`${API_BASE_URL}/api/v1/...`, { cache: 'no-store' })
if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
}
const payload = (await response.json()) as { data?: T[] }
return payload.data ?? []
```

### `@/components/ui`-Primitives (Frontend — Pflicht laut CLAUDE.md)
**Quelle:** `ProposalForm.tsx` Z.7, `RoleCapabilityDetail.tsx` Z.3-4, `ui-system/page.tsx` Z.6-33
**Anwenden auf:** ALLE neuen und geänderten Frontend-Komponenten
```typescript
import { Button, FormField, Modal, Textarea, YearPicker } from '@/components/ui'
import { Accordion, Switch } from '@/components/ui'
// Verboten: natives <select>, <input>, <textarea>, <button>
```

### Unlaute in deutschen UI-Strings (CLAUDE.md)
**Gilt für:** Alle JSX-Textknoten, Fehlermeldungen, Labels, Placeholder
- Korrekt: „Gruppenleitung", „Fansub-Projektleitung", „GFX / Grafik", „Techadmin"
- Verboten: `ae`, `oe`, `ue` als Umlaut-Ersatz

---

## Kein Analog gefunden

| Datei | Rolle | Datenfluss | Begründung |
|---|---|---|---|
| `frontend/src/app/dev/ui-system/showcase/AccordionShowcase.tsx` | component | request-response | Kein Showcase-Modul-Split existiert bisher; Muster aus ui-system/page.tsx selbst ableiten |
| `frontend/src/app/dev/ui-system/showcase/SwitchShowcase.tsx` | component | request-response | Wie AccordionShowcase — Muster aus page.tsx ableiten |

---

## Metadaten

**Analog-Suchbereich:** `backend/internal/`, `frontend/src/`, `database/migrations/`
**Gescannte Dateien:** 18 (direkt gelesen)
**Pattern-Mapping-Datum:** 2026-06-30

### Backend-Code-Fundstellen mit alten Codes (D-04 Sync-Pflicht)

Diese Dateien müssen synchron mit Migration 0112 angepasst werden — kein Go-Analog, direkte String-Ersetzung:

| Datei | Zeile | Alt | Neu |
|---|---|---|---|
| `backend/internal/repository/admin_users_queries.go` | 68, 247 | `'leader'` | `'fansub_lead'` |
| `backend/internal/repository/admin_users_tab_repository.go` | 118 | `'leader'` | `'fansub_lead'` |
| `backend/internal/repository/anime_contributions_public_repository.go` | 243 | `'leader'` | `'fansub_lead'` |
| `backend/internal/services/badge_service.go` | 93 | `'leader'` | `'fansub_lead'` |
| `backend/internal/repository/role_definitions_context_test.go` | 30, 32, 115, 116 | `"leader"`, `"project_manager"` | `"fansub_lead"`, `"project_lead"` |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx` | 15, 17, 68, 70 | `'leader'`, `'project_manager'` | `'fansub_lead'`, `'project_lead'` |
