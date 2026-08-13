# Phase 72: Domänen-Projektionen & Status-Fundament - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 9 (3 migration pairs counted as units, 2 repos, 1 handler, 3 contract/type files)
**Analogs found:** 9 / 9 (all backend/contract surfaces have a direct in-repo analog)

This phase is backend-/contract-only (D-05: Schema + Read-Projektionen + Contracts, KEINE Writes).
Concrete file names/enum values are Planner discretion; this map fixes the **patterns to copy**.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `database/migrations/0096_*.up.sql` + `.down.sql` | migration | schema (additive columns + CHECK + FK) | `database/migrations/0090_member_story_images.{up,down}.sql` (additive col + index) and `0086_anime_contributions.up.sql` (CHECK enum), `0037_add_release_decomposition_tables.up.sql` (visibilities FK) | exact |
| NEW `backend/internal/repository/<domain>_projection_repository.go` (Mitglied/Mitwirkender/historisch split) | repository | request-response read (pgx SELECT-Joins) | `backend/internal/repository/anime_contributions_public_repository.go` | exact (canonical) |
| NEW `backend/internal/repository/media_<x>_projection_repository.go` (owner/visibility/review) | repository | request-response read | `anime_contributions_public_repository.go` (DTO shape) + `member_archive_repository.go` (own struct + constructor + visibility WHERE) | role+flow match |
| NEW `backend/internal/handlers/<domain>_projection_handler.go` | handler | request-response | `backend/internal/handlers/contributions_public_handler.go` | exact |
| `backend/cmd/server/main.go` (repo construct + route register) | wiring | — | existing lines 364 / 397 / 403-405 (same file) | exact |
| `shared/contracts/openapi.yaml` (paths + schemas) | contract | — | `shared/contracts/contributions.yaml` schema/path blocks | exact |
| `shared/contracts/admin-content.yaml` (only if admin-content projection) | contract | — | `shared/contracts/contributions.yaml` | exact |
| `frontend/src/types/<domain>.ts` (DTO mirror, snake_case) | type | — | `frontend/src/types/contributions.ts` | exact |
| `frontend/src/lib/api.ts` (client fns) | service-client | request-response | `getAnimeContributions` / `getMemberContributions` (lines 7706-7745, same file) | exact |

## Pattern Assignments

### NEW `backend/internal/repository/<domain>_projection_repository.go` (repository, read)

**Analog:** `backend/internal/repository/anime_contributions_public_repository.go` (CANONICAL — RESEARCH §Architecture Patterns Pattern 1)

**Why new file, not extend:** RESEARCH Pitfall 4 — `member_profile_repository.go` (1225 LOC) and `contributor_dashboard_repository.go` (533 LOC) already exceed the 450-line limit (CLAUDE.md). New projections MUST go in NEW focused files (< 450 LOC). Note `AnimeContributionsRepository` is one struct split across many files (`anime_contributions_*.go`); a NEW domain projection should get its OWN struct + constructor like `MemberArchiveRepository`.

**Public DTO shape pattern** (`anime_contributions_public_repository.go:20-50`):
```go
// snake_case json tags MUST match frontend/src/types/*.ts 1:1 (Lock K)
type PublicContributorRow struct {
    MemberDisplayName string   `json:"member_display_name"`
    MemberSlug        *string  `json:"member_slug"`   // nullable -> pointer
    Roles             []string `json:"roles"`
    RoleLabels        []string `json:"role_labels"`
    IsVerified        bool     `json:"is_verified"`
}
type PublicAnimeContributionsResponse struct {
    Groups []PublicAnimeContributionGroup `json:"groups"`
}
```
Apply the same: derived `dispute_state`/`review_status`/`visibility` fields become explicit DTO fields (RESEARCH §Code Examples `ContributionProjectionRow`). Separate the three sets as **distinct JSON arrays** `{ members: [], historical: [], contributors: [] }` (RESEARCH §Membership vs. Contribution Separation) — NOT a UNION-flattened list.

**Source-table separation produces the typing** (`anime_contributions_public_repository.go:112-122` and the UNION ALL at `:310-350`):
- Gruppenmitglied → `fansub_group_members` / `fansub_group_member_roles` (`status='active'`)
- Historisches Mitglied → `hist_fansub_group_members` / `hist_group_member_roles` (`status IN ('historical','confirmed')`, `visibility='public'`)
- Mitwirkender → `anime_contributions` JOIN `hist_fansub_group_members` (`is_public_on_anime_page`/`is_public_on_member_profile`)
- "claimed"/"unclaimed" derived from `member_claims.claim_status='verified'`, NEVER from contributions (Lock H, RESEARCH).

**Constructor + struct pattern for a NEW domain repo** (`member_archive_repository.go:40-48`):
```go
type MemberArchiveRepository struct { db *pgxpool.Pool }
func NewMemberArchiveRepository(db *pgxpool.Pool) *MemberArchiveRepository {
    return &MemberArchiveRepository{db: db}
}
```

**Query/scan + error wrapping pattern** (`anime_contributions_public_repository.go:126-169`):
```go
rows, err := r.db.Query(ctx, query, animeID)
if err != nil { return nil, fmt.Errorf("public anime contributions: %w", err) }
defer rows.Close()
for rows.Next() {
    if err := rows.Scan(&contrib.MemberDisplayName, &contrib.MemberSlug, ...); err != nil {
        return nil, fmt.Errorf("public anime contributions: scan: %w", err)
    }
    ...
}
if err := rows.Err(); err != nil { return nil, fmt.Errorf("...: iterate: %w", err) }
```

**Reuse helpers, do not hand-roll** (RESEARCH §Don't Hand-Roll):
- Slug/display: `memberSlugExpr` / `memberDisplayExpr` constants (`anime_contributions_public_repository.go:11-18`).
- Role labels: `COALESCE(rd.label_de, code)` via `LEFT JOIN role_definitions rd` (`:110-117`).
- Visibility (D-03 Achse 1): `LEFT JOIN visibilities v ON v.id = <traeger>.visibility_id`, select `v.name`.

**Security WHERE-enforcement** (`member_archive_repository.go:50-55` doc + `anime_contributions_public_repository.go:118-121`): public projections gate on `is_public_* = true AND visibility='public'`; all user input as `$N` pgx params, no string interpolation (ASVS V4/SQLi, RESEARCH §Security Domain).

---

### NEW `backend/internal/handlers/<domain>_projection_handler.go` (handler, request-response)

**Analog:** `backend/internal/handlers/contributions_public_handler.go` (exact)

**Handler struct + constructor + thin method pattern** (full file is the template, `:13-56`):
```go
type ContributionsPublicHandler struct {
    repo *repository.AnimeContributionsRepository
}
func NewContributionsPublicHandler(repo *repository.AnimeContributionsRepository) *ContributionsPublicHandler {
    return &ContributionsPublicHandler{repo: repo}
}
func (h *ContributionsPublicHandler) GetAnimeContributions(c *gin.Context) {
    animeID, err := parseAnimeID(c.Param("id"))
    if err != nil { badRequest(c, "ungültige anime-id"); return }
    response, err := h.repo.GetPublicAnimeContributions(c.Request.Context(), animeID)
    if err != nil { internalError(c, "interner serverfehler"); return }
    c.JSON(http.StatusOK, response)   // DTO direct — NO {"data":...} envelope for these public reads
}
```

**Envelope decision (RESEARCH Open Question Q3 / Anti-Pattern):** follow the NEAREST analog. The neighboring public-contribution reads return the DTO **directly** (no `{"data":...}`). Admin-content reads (`MembershipsResponse`/`GroupProposalsResponse` in `contributions.yaml`) DO use `{ data: [...] }`. Planner picks per endpoint and states it explicitly; do not introduce an envelope ad hoc.

**German UI strings keep Umlaute** (CLAUDE.md Sprachqualität): `"ungültige …"`, `"interner serverfehler"` — error helpers `badRequest`/`internalError`/`parse*ID` already exist in the handlers package; reuse, do not redefine.

---

### `database/migrations/0096_v12_status_foundation.{up,down}.sql` (migration, schema)

**Next free number is 0096** (highest existing: `0095_archive_search_indexes`; CONTEXT note "0089/0091" is stale). Canonical dir is `database/migrations/` ONLY — `backend/database/migrations/` is a non-canonical legacy parallel (RESEARCH §Runtime State Inventory).

**Additive column + partial index pattern** (`0090_member_story_images.up.sql:7-9`):
```sql
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS owner_member_id BIGINT
    REFERENCES members(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_owner_member
    ON media_assets(owner_member_id) WHERE owner_member_id IS NOT NULL;
```

**Exact-mirror down pattern** (`0090_member_story_images.down.sql:3-5`):
```sql
DROP INDEX IF EXISTS idx_media_assets_owner_member;
ALTER TABLE media_assets DROP COLUMN IF EXISTS owner_member_id;
```

**Enum-as-CHECK constraint pattern** (`0086_anime_contributions.up.sql:21`):
```sql
CONSTRAINT chk_anime_contributions_status CHECK (status IN ('draft','proposed','confirmed','disputed','hidden'))
```
Apply for `dispute_state` (none/open/resolved — stable 3 values → CHECK, RESEARCH A1) and `members` profile-status (active/historical/memorial — D-06/J; `members` has NO status column today). Add columns with `NOT NULL DEFAULT '<base>'` so existing rows are valid without backfill.

**Visibility-lookup FK pattern** (`0037_add_release_decomposition_tables.up.sql:67-80, 110`):
```sql
-- existing lookup, values: public, registered, fansubber, staff, private (NOT just internal/öffentlich)
visibility_id BIGINT REFERENCES visibilities(id) ON DELETE SET NULL,
```
D-03 Achse 1 reuses THIS lookup on new carriers — do not invent a new visibility enum (Lock A, RESEARCH §Don't Hand-Roll).

**Review-Status (D-03 Achse 2):** Planner-Entscheid CHECK vs. new lookup table (RESEARCH Q1; 5 values, possibly extensible → lookup like `visibilities` recommended). MUST be a SEPARATE column — never overload `media_assets.status` (technical lifecycle processing/ready/failed/deleted) or `anime_contributions.status` (content draft/proposed/confirmed) — RESEARCH Pitfalls 1 & 2.

**Reuse, do not rebuild:** `media_assets.owner_member_id` (0090) for member-media owner (G); `members.profile_visibility`/`is_currently_active`/active dates already exist (derived states stay derived). UNIQUE-collision check: `dispute_state` is NOT an identity column → keep it OUT of the 4-col `NULLS NOT DISTINCT` UNIQUE on `anime_contributions` (0091) — RESEARCH Pitfall 5.

---

### `shared/contracts/openapi.yaml` (+ `admin-content.yaml`) (contract)

**Analog:** `shared/contracts/contributions.yaml` (path + schema blocks)

**Path block pattern** (`contributions.yaml:166-204`): `tags`, `summary`, `description`, `operationId`, `parameters` (`int64`, `minimum:1`), `responses` keyed by status with `$ref: "#/components/schemas/..."` for body and `ErrorResponse` for 4xx.

**Schema block pattern** (`contributions.yaml:417-452`):
```yaml
GroupProposalRow:
  type: object
  required: [id, fansub_group_member_id, member_display_name, anime_id, anime_title, role_codes, created_at]
  properties:
    member_display_name: { type: string }
    note: { type: string, nullable: true }     # nullable mirrors Go *string
    role_codes: { type: array, items: { type: string } }
GroupProposalsResponse:                          # envelope form when used
  type: object
  required: [data]
  properties:
    data: { type: array, items: { $ref: "#/components/schemas/GroupProposalRow" } }
```
Every new DTO field MUST appear here AND in `frontend/src/types/*.ts` — no undocumented response fields (Lock K). Contract-first order (RESEARCH §Contracts): OpenAPI → (admin-content) → route in main.go → DTO/handler/repo → api.ts → types → tests. Use `admin-content.yaml` only if an admin-content projection is touched.

---

### `frontend/src/types/<domain>.ts` (type)

**Analog:** `frontend/src/types/contributions.ts` (exact)

**1:1 snake_case mirror of the Go DTO** (`contributions.ts:3-32`):
```ts
export interface PublicAnimeContribution {
  member_display_name: string
  member_slug: string | null       // Go *string -> | null
  roles: string[]
  is_verified: boolean
}
export interface PublicAnimeContributionsResponse {
  groups: AnimeContributionGroup[]
}
```
Literal unions match Go CHECK values (`contributions.ts:80` `status: 'confirmed' | 'proposed' | 'draft' | 'disputed' | 'hidden'`) — so `dispute_state: 'none' | 'open' | 'resolved'` and the review-status union follow the same style.

---

### `frontend/src/lib/api.ts` (service-client) + `backend/cmd/server/main.go` (wiring)

**api.ts client fn pattern** (`api.ts:7706-7730`, `getAnimeContributions`):
```ts
export async function getAnimeContributions(animeID: number): Promise<PublicAnimeContributionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetch(`${API_BASE_URL}/api/v1/anime/${animeID}/contributions`,
    { next: { revalidate: 60 } });
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<PublicAnimeContributionsResponse>;
}
```
Use `getApiBaseUrl()` + the shared error helpers; for authenticated reads use `apiClientFetch` (`api.ts:1253`). No ad-hoc browser→backend fetch / no direct token access (Lock K). `encodeURIComponent` for slug params (`api.ts:7736`).

**main.go wiring pattern** (existing lines 364, 397, 403-405):
```go
animeContributionsRepo := repository.NewAnimeContributionsRepository(dbPool)         // construct repo
contributionsPublicHandler := handlers.NewContributionsPublicHandler(animeContributionsRepo) // construct handler
v1.GET("/anime/:id/contributions", contributionsPublicHandler.GetAnimeContributions) // register GET-only route
```
Dependencies passed manually (no DI container — CLAUDE.md). New projections: construct repo → construct handler → register **GET-only** routes (D-05, no writes).

## Shared Patterns

### Visibility (D-03 Achse 1)
**Source:** `visibilities` lookup (`0037_add_release_decomposition_tables.up.sql:67-80`), values `public/registered/fansubber/staff/private`.
**Apply to:** every new media/contribution carrier — `visibility_id BIGINT REFERENCES visibilities(id) ON DELETE SET NULL` + projection `LEFT JOIN visibilities v ON v.id = t.visibility_id`. Do not create a parallel enum (Lock A). Note: `hist_*.visibility` is a free VARCHAR (internal/public), NOT this FK — do NOT migrate it in 72 (RESEARCH Q2); document the inconsistency.

### Error handling (Go)
**Source:** `anime_contributions_public_repository.go:126-169` (repo) + `contributions_public_handler.go:24-56` (handler).
**Apply to:** all new repos/handlers. Repo: `fmt.Errorf("context: %w", err)` on Query/Scan/Err. Handler: `badRequest`/`internalError` helpers, German Umlaut strings, never leak internal errors.

### DTO ↔ Contract ↔ Type parity (Lock K)
**Source:** `anime_contributions_public_repository.go` DTO ↔ `contributions.yaml` schema ↔ `contributions.ts` interface.
**Apply to:** every new field. snake_case everywhere; Go `*T` ↔ OpenAPI `nullable: true` ↔ TS `| null`. CHECK values ↔ TS literal unions.

### Member display / slug / role labels (no hand-roll)
**Source:** `memberSlugExpr`/`memberDisplayExpr` (`anime_contributions_public_repository.go:11-18`); `COALESCE(rd.label_de, code)` join on `role_definitions`.
**Apply to:** all member/role-bearing projections.

## No Analog Found

None. All Phase-72 surfaces (additive migration, read-projection repo, thin public handler, OpenAPI schema, snake_case type mirror, api.ts client, main.go wiring) have direct in-repo analogs. The only genuinely-new modeling element — the **Review-/Lebenszyklus-Status carrier form** (CHECK vs. new lookup table) — has a structural analog in the `visibilities` lookup (`0037`) if Planner chooses a lookup table; both forms are covered by the migration patterns above. Decision belongs to Planner (RESEARCH Q1, Discretion).

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`, `database/migrations/`, `shared/contracts/`, `frontend/src/lib/api.ts`, `frontend/src/types/`, `backend/cmd/server/main.go`.
**Files scanned:** ~14 (2 context docs + 12 source/contract files read).
**Pattern extraction date:** 2026-06-04
