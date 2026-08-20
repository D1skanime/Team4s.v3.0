# Phase 136: Capability Policy, Catalog & Schema Contract - Pattern Map

**Mapped:** 2026-08-20
**Files analyzed:** 24 file groups
**Analogs found:** 22 / 24

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `database/migrations/0146_capability_policy_catalog.up.sql` | migration | batch / schema | `database/migrations/0108_capability_registry.up.sql`; `0145_member_public_identity_visibility.up.sql` | exact |
| `database/migrations/0146_capability_policy_catalog.down.sql` | migration | batch / schema | `database/migrations/0108_capability_registry.down.sql`; `0145_member_public_identity_visibility.down.sql` | exact |
| `backend/internal/permissions/permissions.go` | service / policy | request-response + startup cache | existing DB-loaded catalog/cache in same file | exact extension |
| `backend/internal/repository/authz_permissions.go` | repository | CRUD / startup batch | `LoadRoleCapabilities`, `LoadFansubGroupRoles` in same file | exact extension |
| `backend/internal/repository/authz_capability_mutations.go` | repository / DTO | CRUD + request-response | `ListCapabilityMatrix` in same file | exact extension |
| `backend/internal/handlers/admin_capability_handler.go` | controller | request-response | `ListCapabilityMatrix` in same file | exact extension |
| `backend/internal/handlers/admin_group_roles_handler.go` and member-scoped role-definition handler | controller | request-response | current authenticated catalog-list handlers | role-match |
| `shared/contracts/admin-capabilities.yaml` | config / API contract | request-response | existing `RoleEntry`, `ActionEntry`, `RoleDefinitionOption` schemas | exact extension |
| `shared/contracts/openapi.yaml` | config / API contract | request-response | corresponding referenced/root role-capability schemas | exact extension |
| `frontend/src/types/admin-capability.ts` | model / DTO | transform | current mirrored capability DTOs | exact extension |
| `frontend/src/lib/api.ts` | service / API client | request-response | `listRoleCapabilities`, `listFansubGroupRoleDefinitions` | exact extension |
| `frontend/src/lib/roleCatalog.ts` | utility / presentation adapter | transform | no true analog; replace `profileLabels.ts` and `roleColors.ts` hardcodes while preserving their fallback behavior | no exact analog |
| `frontend/src/types/fansub.ts` | model | transform | migrate closed `FANSUB_GROUP_ROLE_OPTIONS` authority to open catalog code type | migration target |
| `frontend/src/lib/profileLabels.ts`, `frontend/src/lib/roleColors.ts` | utility | transform | shared `roleCatalog.ts` adapter | migration target |
| contribution role modules and cards | component / utility | transform | server catalog + shared adapter; retain `normalizeRoleCodes` unknown-code preservation | migration target |
| admin member editors, archive/member filters and selectors | component / hook | request-response + transform | `listFansubGroupRoleDefinitions` + local loading/error state | role-match |
| profile/member/release-credit consumers | component | transform | shared adapter + code-generic badge derivation | role-match |
| backend history-role whitelist repository | repository | request-response | replace static whitelist with `role_definitions.contexts`/catalog query | migration target |
| member profile badge/volume repositories | repository | CRUD / transform | existing generic `role_entry_${code}` and `role_volume_${code}_${tier}` generation | exact; do not fork |
| fixtures/seeds containing role catalogs | config / fixture | batch | migration 0108/0112 seed style | exact |
| backend catalog/migration/handler tests | test | batch + request-response | `capability_registry_test.go`, `admin_capability_handler_test.go`, migration tests | exact |
| `frontend/src/lib/roleCatalog.test.ts` | test | transform | no dedicated adapter test exists; use Vitest table-driven style from nearby lib tests | role-match |
| cross-surface component tests | test | transform | `MemberBadgeChain.test.tsx`, role-capability component tests | exact extension |

## Pattern Assignments

### `database/migrations/0146_capability_policy_catalog.{up,down}.sql` (migration, batch/schema)

**Analogs:** `database/migrations/0108_capability_registry.up.sql`, `database/migrations/0145_member_public_identity_visibility.{up,down}.sql`

**Catalog extension and seed pattern** (`0108...up.sql`, lines 5-22, 24-48):

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS action_definitions (
    code       TEXT PRIMARY KEY,
    label_de   TEXT NOT NULL,
    category   TEXT,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS role_capabilities (
    role_code   TEXT NOT NULL REFERENCES role_definitions(code) ON DELETE CASCADE,
    action_code TEXT NOT NULL REFERENCES action_definitions(code) ON DELETE CASCADE,
    PRIMARY KEY (role_code, action_code)
);

INSERT INTO action_definitions (code, label_de, category, sort_order) VALUES
    (...)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;
```

Copy the transaction, FK/CHECK/UNIQUE/index conventions and explicit seed rows. Add `user_overridable NOT NULL DEFAULT false`, capability help/policy metadata, canonical role presentation keys, `karaoke_fx` in both required contexts, confirmed narrow defaults, current override state, append-only history, and reverse indexes. Do not edit 0108/0112/0121 and do not add data-preservation/backfill code.

**Fresh-data precondition pattern** (`0145...up.sql`, lines 1-11):

```sql
-- Existing rows are disposable and must be reset/reseeded through the canonical flow;
-- this migration deliberately refuses to rewrite or preserve them.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM members LIMIT 1) THEN
        RAISE EXCEPTION '... reset and reseed disposable test data before applying';
    END IF;
END;
$$;
```

Use only if the chosen schema change is destructive for current test rows. The down migration must remove triggers/functions/indexes/tables/columns in dependency order, matching `0145...down.sql` lines 4-20.

### Backend catalog projection: `authz_permissions.go` + `authz_capability_mutations.go` (repository, CRUD/request-response)

**Analog:** current DB-backed loaders and matrix projection.

**Parameterized query/error pattern** (`authz_permissions.go`, lines 325-347):

```go
rows, err := r.db.Query(ctx, `
    SELECT role_code, action_code
    FROM role_capabilities
    ORDER BY role_code, action_code
`)
if err != nil {
    return nil, fmt.Errorf("load role capabilities: %w", err)
}
defer rows.Close()
// scan rows; check rows.Err(); return typed result
```

**Canonical assignability pattern** (`authz_permissions.go`, lines 353-382):

```go
SELECT code FROM role_definitions
WHERE assignable = true
   OR 'fansub_group' = ANY(contexts)
   OR 'anime_contribution' = ANY(contexts)
ORDER BY sort_order, code
```

For selectors, project `assignable` directly; do not infer it from a Go list. For the cross-surface catalog, select label, order, contexts, presentation keys, assignability and a derived operative-capability count in one repository projection.

**Matrix DTO and all-rows projection pattern** (`authz_capability_mutations.go`, lines 20-64, 74-97, 124-175):

```go
type CapabilityMatrixActionState struct {
    Code string `json:"code"`
    LabelDE string `json:"label_de"`
    Category string `json:"category"`
    Granted bool `json:"granted"`
    Standalone bool `json:"standalone"`
}

FROM action_definitions ad
CROSS JOIN role_definitions rd
LEFT JOIN role_capabilities rc
  ON rc.action_code = ad.code AND rc.role_code = rd.code
```

Extend these DTOs rather than creating a second DTO family. Preserve all roles, including zero-capability roles. `karaoke_fx` must appear because it exists in `role_definitions`, not because a handler appends it.

### `backend/internal/permissions/permissions.go` (service/policy, startup cache)

**Analog:** current catalog loader (`permissions.go`, lines 313-382) and fail-closed cache consistency (`336-364`).

```go
type CatalogLoader interface {
    LoadFansubGroupRoles(ctx context.Context) ([]string, error)
    LoadCapabilityRoles(ctx context.Context) ([]string, error)
}

func (s *Service) LoadFansubGroupCatalog(ctx context.Context, loader CatalogLoader) error {
    roles, err := loader.LoadFansubGroupRoles(ctx)
    if err != nil { return fmt.Errorf("fansub group catalog load: %w", err) }
    // load capability-bearing roles, then replace caches under catalogMu
}
```

Keep action constants as compile-time identifiers used by enforcement, but do not extend the static `roleMatrix` or role-name lists as runtime authority. Phase 136 should remove/fail closed on the stale fallback at lines 385-393 once startup loading is guaranteed. Platform-admin remains a separate IdP bypass, never a group capability row.

### Backend handlers (controller, request-response)

**Analog:** `backend/internal/handlers/admin_capability_handler.go`, lines 14-31 and 80-132.

```go
type capabilityMutationRepo interface {
    ListCapabilityMatrix(ctx context.Context) (*repository.CapabilityMatrix, error)
    LoadRoleCapabilities(ctx context.Context) (map[string][]permissions.Action, error)
}

func (h *AdminCapabilityHandler) ListCapabilityMatrix(c *gin.Context) {
    _, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
    if !ok { return }
    matrix, err := h.mutationRepo.ListCapabilityMatrix(c.Request.Context())
    if err != nil {
        log.Printf("capability matrix: repo error: %v", err)
        internalError(c, "Capability-Matrix konnte nicht geladen werden.")
        return
    }
    c.JSON(http.StatusOK, matrix)
}
```

Use minimal repository interfaces, auth guard first, request context, structured project errors, and typed JSON. Remove handler-side derivation at lines 96-104 and static global labels at lines 33-45 when the canonical projection can own them. Do not reuse the platform-only `/admin/fansub-group-roles` endpoint for group-leader pages; extend the member-scoped role-definition/catalog endpoint for those consumers.

### Contracts, Go DTOs, TypeScript DTOs and central helper (config/model/service, request-response)

**Analogs:** `shared/contracts/admin-capabilities.yaml` lines 260-339; `frontend/src/types/admin-capability.ts` lines 6-64; `frontend/src/lib/api.ts` lines 9772-9931.

```yaml
RoleEntry:
  type: object
  required: [role_code, label_de, actions]
  properties:
    role_code: { type: string }
    label_de: { type: string }
    actions:
      type: array
      items: { $ref: "#/components/schemas/RoleActionState" }
```

```ts
export interface RoleDefinitionOption {
  code: string;
  label_de: string;
  sort_order: number;
}
```

Update focused YAML, root OpenAPI, Go JSON fields and TS interfaces together. Include capability description/override policy, role contexts/order/assignability/presentation keys/operative count, and the future override/effective-right/audit shapes required by the phase boundary.

**Central authenticated helper pattern** (`api.ts`, lines 9906-9931):

```ts
export async function listFansubGroupRoleDefinitions(
  fansubId: number | string,
): Promise<RoleDefinitionOption[]> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${encodeURIComponent(String(fansubId))}/role-definitions?context=fansub_group`,
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

Keep the helper token-free and inside the central refresh-capable client seam; do not add component-level fetch or bearer handling.

### `frontend/src/lib/roleCatalog.ts` (utility, transform)

**Closest behavior to preserve, but not authority to copy:** `profileLabels.ts` lines 34-55 provides readable fallback; `roleColors.ts` lines 3-14 and `MemberBadgeChain.tsx` lines 58-65 show the hardcoded anti-pattern being removed.

```ts
function readableCodeLabel(value: string): string {
  return value.split(/[_\s-]+/).filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}
```

The new adapter accepts server catalog rows and exposes lookup, ordered context filtering, label/presentation resolution and neutral fallback. It may map stable semantic `color_key`/`icon_key` values to frontend tokens/components, but must not embed a second list of valid roles. Accept `string` role codes so a newly seeded role renders without a TypeScript union edit.

### Cross-surface role consumers (components/hooks, transform/request-response)

**Anti-analog to replace:** duplicated contribution arrays (`components/contributions/contributionRoles.ts`, lines 3-15; admin edit copy, lines 1-11). Keep only the useful unknown-code preservation from admin `contributionRoles.ts`, lines 13-33.

```ts
const known = catalogRoles.map((role) => role.code).filter((code) => selected.has(code))
const unknown = codes.filter((code) => code && !catalogRoles.some((role) => role.code === code))
return Array.from(new Set([...known, ...unknown]))
```

Migrate members, profiles, contribution cards, release credits, admin selectors and archive/member filters to injected/catalog-loaded entries plus the shared adapter. Preserve local loading/error/empty state and compact selectors. Do not broaden into the deferred badge-UI redesign.

### Badge and points flow (repository/component, transform)

**Exact backend analog:** `member_profile_public_repository.go`, lines 198-224, and `member_profile_role_volume_repository.go`, lines 102-120 and 123-151.

```go
badgeCode := "role_entry_" + roleCode
if currentTier != "entry" {
    badgeCode = "role_volume_" + roleCode + "_" + currentTier
}
```

This generation is already code-generic; do not add karaoke-specific calculators or persisted badge rows. The frontend hardcode at `MemberBadgeChain.tsx` lines 639-671 filters and orders through `FANSUB_GROUP_ROLE_OPTIONS`; replace that membership/order source with the catalog adapter so `karaoke_fx` flows through automatically.

## Shared Patterns

### Authentication and audience

**Sources:** `admin_capability_handler.go` lines 80-94; `api.ts` lines 9906-9931.

- Backend guard is the first handler action.
- Platform catalog administration uses `requirePlatformAdminIdentity`.
- Group surfaces use the existing member-scoped endpoint and group capability guard.
- Browser callers use the central client; access-token-missing plus refresh-valid must remain functional.

### Error handling

- Repository: wrap operation and scan/iteration errors with `%w` and stable context.
- Handler: log internal detail, return the project error envelope with correct German umlauts.
- Frontend helper: `parseApiErrorPayload` then `ApiError`; components do not parse undocumented shapes.

### Database integrity and audit foundation

- Use FK, composite PK/UNIQUE, `NOT NULL`, constrained text `CHECK`, and indexes aligned to reverse lookups.
- One current row per `(app_user_id, fansub_group_id, action_code)`; separate append-only history.
- DB metadata defaults to non-overridable. Cross-row authorization and platform-admin reason exemption remain service concerns for Phase 137.
- No audit row for an exact no-op is a future transactional mutation rule; Phase 136 establishes the schema/contract only.

### Canonical catalog ownership

`role_definitions` and `action_definitions` own codes, labels, contexts, ordering, assignability and semantic presentation/policy metadata. Go and TypeScript project these fields. The frontend adapter translates semantic presentation keys and provides fallback; it never decides which roles exist.

### Tests

- Extend `backend/internal/permissions/capability_registry_test.go` table-driven startup completeness and platform-admin-exclusion patterns.
- Extend handler tests with exact JSON metadata and guard-first failures.
- Replace static-whitelist assertions in `role_definitions_context_test.go` and `hist_group_member_roles_whitelist_test.go` with catalog/context behavior, including `karaoke_fx`.
- Add migration fresh up/down and index assertions.
- Add a Vitest adapter test injecting an unknown/new catalog role, plus cross-surface tests proving `karaoke_fx` members, credits, badges, points, selectors and filters without consumer-local role additions.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `frontend/src/lib/roleCatalog.ts` | utility / presentation adapter | transform | Existing files are static maps or page-local arrays—the drift being removed. Use the research fallback shape and server DTO as authority. |
| immutable per-user override history schema | migration/model | event history | Existing generic audit log is adjacent but does not model before/after scoped override state; use FK/CHECK/index conventions, not its semantics. |

## Metadata

**Analog search scope:** `database/migrations`, `backend/internal/{permissions,repository,handlers,migrations}`, `shared/contracts`, `frontend/src/{types,lib,components,app}`

**Files scanned:** exact hardcode inventory plus adjacent catalog, badge, API, migration and test owners

**Pattern extraction date:** 2026-08-20

**Critical planning note:** The implementation may touch many consumers, but every consumer change must be mechanical: replace local role authority with the catalog adapter. General badge visual unification, effective-right evaluation and override editing remain out of scope.
