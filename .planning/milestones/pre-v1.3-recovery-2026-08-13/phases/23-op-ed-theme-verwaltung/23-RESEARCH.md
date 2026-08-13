# Phase 23: OP/ED Theme Verwaltung - Research

**Researched:** 2026-04-23
**Domain:** Go/Gin admin CRUD, Next.js App Router admin section, PostgreSQL migrations with seed data
**Confidence:** HIGH

---

## Summary

The DB schema for themes already exists (created in migration 0044) but the `theme_types` seed contains only `opening`, `ending`, and `insert_song` — not the OP1/OP2/ED1/ED2/Insert/Outro labels required by Phase 23. A new migration (0048) must replace or supplement those seed rows. Because `theme_types` uses a UNIQUE constraint on `name`, the replacement can be done cleanly with an INSERT ... ON CONFLICT DO NOTHING after deleting or renaming old rows, or via a targeted UPDATE + INSERT strategy.

The backend CRUD pattern is extremely consistent across the codebase. Every admin resource follows the same five-function shape: interface on `AdminContentHandler`, handler file per domain, repository method per domain, route registered in `admin_routes.go`. The theme handler should live in a new file `admin_content_anime_themes.go` (handler) plus `admin_content_anime_themes.go` in repository, both under `AdminContentHandler`. The interface is extended with a `themeRepo` field using the same dependency-injection pattern already established.

The frontend pattern is also stable. New domain sections on the edit page are self-contained components with a matching `useAdminAnimeThemes` hook and API helpers added to `frontend/src/lib/api.ts`. The `AnimeRelationsSection` — a `<details>`/`<summary>` card rendered below `AdminAnimeEditPageClient`'s main workspace — is the direct structural template. The themes section should be a separate standalone card rendered after `AnimeEditWorkspace` in `AdminAnimeEditPageClient`, not inside the 4-step workspace form (which handles core metadata only).

**Primary recommendation:** Build theme CRUD as a standalone section card on the edit page, following the relations section pattern exactly: new handler file, new repository file, new hook, new section component, API helpers in `api.ts`, routes in `admin_routes.go`.

---

## Project Constraints (from CLAUDE.md)

- **Brownfield:** Extend existing code, do not replace working surfaces.
- **Modularity:** Production code files must stay at or below 450 lines. Split if needed.
- **Compatibility:** DB changes are append-only migrations. No destructive schema changes.
- **Observability:** Errors must be visible immediately in the UI. Log on backend. No silent swallows.
- **Admin auth:** Every admin endpoint uses `h.requireAdmin(c)` guard.
- **Workflow:** No GSD-external direct edits unless user explicitly bypasses.

---

## Standard Stack

### Core

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Backend HTTP | Gin | github.com/gin-gonic/gin (existing) | Use `c.ShouldBindJSON`, `c.JSON`, `c.Status` |
| Backend DB | pgx/v5 | github.com/jackc/pgx/v5 (existing) | `QueryRow`, `Query`, `Exec` on pool |
| Backend models | plain Go structs | — | In `backend/internal/models/` |
| Frontend API | fetch via `api.ts` | — | Centralized in `frontend/src/lib/api.ts` |
| Frontend types | TypeScript interfaces | — | In `frontend/src/types/admin.ts` |
| Frontend state | React hooks | 18.3.1 | Custom hook per domain |
| Frontend UI | lucide-react icons | existing | For action buttons |

### No New Dependencies Required

This phase requires zero new packages on either backend or frontend. Everything re-uses existing patterns.

---

## Architecture Patterns

### Recommended File Layout (new files only)

```
backend/internal/handlers/
└── admin_content_anime_themes.go     # ListAnimeThemes, CreateAnimeTheme, UpdateAnimeTheme, DeleteAnimeTheme,
                                       # ListAnimeThemeSegments, CreateAnimeThemeSegment, DeleteAnimeThemeSegment,
                                       # ListThemeTypes

backend/internal/repository/
└── admin_content_anime_themes.go     # DB methods for themes + theme_segments + theme_types read

database/migrations/
└── 0048_seed_theme_types.up.sql      # Replace 3-value seed with OP1/OP2/ED1/ED2/Insert/Outro
└── 0048_seed_theme_types.down.sql    # Revert to original 3 seeds

frontend/src/app/admin/anime/components/AnimeEditPage/
├── AnimeThemesSection.tsx             # New section card component
└── AnimeThemesSection.module.css      # Scoped CSS (can reuse AnimeRelationsSection.module.css as ref)

frontend/src/app/admin/anime/hooks/
└── useAdminAnimeThemes.ts             # State hook for themes CRUD

frontend/src/types/
└── admin.ts                           # Append new theme interfaces (existing file)

frontend/src/lib/
└── api.ts                             # Append new theme API functions (existing file)
```

### Pattern 1: Admin CRUD Handler (from `admin_content_anime_relations.go`)

Every handler function follows this exact sequence:

```go
// Source: backend/internal/handlers/admin_content_anime_relations.go
func (h *AdminContentHandler) ListAnimeThemes(c *gin.Context) {
    if _, ok := h.requireAdmin(c); !ok {
        return
    }
    animeID, err := parseAnimeID(c.Param("id"))
    if err != nil {
        badRequest(c, "ungueltige anime id")
        return
    }
    items, err := h.themeRepo.ListAdminAnimeThemes(c.Request.Context(), animeID)
    if errors.Is(err, repository.ErrNotFound) {
        c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
        return
    }
    if err != nil {
        log.Printf("admin anime themes list: anime_id=%d: %v", animeID, err)
        writeInternalErrorResponse(c, "interner serverfehler", err, "Themes konnten nicht geladen werden.")
        return
    }
    c.JSON(http.StatusOK, gin.H{"data": items})
}
```

**HTTP response conventions:**
- List: `200 { "data": [...] }`
- Create: `201 { "data": { ...created item } }`
- Update (PATCH): `204 No Content`
- Delete: `204 No Content`
- Not found: `404 { "error": { "message": "..." } }`
- Conflict: `409 { "error": { "message": "...", "code": "..." } }`
- Bad request: `400 { "error": { "message": "..." } }` via `badRequest(c, msg)`

### Pattern 2: Repository Method (from `anime_relations_admin.go`)

```go
// Source: backend/internal/repository/anime_relations_admin.go
func (r *AdminContentRepository) ListAdminAnimeThemes(ctx context.Context, animeID int64) ([]models.AdminAnimeTheme, error) {
    if animeID <= 0 {
        return nil, ErrNotFound
    }
    exists, err := r.animeExists(ctx, animeID)
    if err != nil {
        return nil, err
    }
    if !exists {
        return nil, ErrNotFound
    }
    // ... SQL query ...
}
```

**Key repo utilities already available:**
- `r.animeExists(ctx, animeID)` — shared guard, used by all anime-scoped repo methods
- `ErrNotFound`, `ErrConflict` — sentinel errors from `repository` package

### Pattern 3: Handler Interface Extension

The `AdminContentHandler` struct in `admin_content_handler.go` holds a `themeRepo` field with an interface type, just like `relationRepo`:

```go
// In admin_content_handler.go (extend existing struct)
type adminThemeRepository interface {
    ListThemeTypes(ctx context.Context) ([]models.AdminThemeType, error)
    ListAdminAnimeThemes(ctx context.Context, animeID int64) ([]models.AdminAnimeTheme, error)
    CreateAdminAnimeTheme(ctx context.Context, animeID int64, input models.AdminAnimeThemeCreateInput) (*models.AdminAnimeTheme, error)
    UpdateAdminAnimeTheme(ctx context.Context, themeID int64, input models.AdminAnimeThemePatchInput) error
    DeleteAdminAnimeTheme(ctx context.Context, themeID int64) error
    ListAdminAnimeThemeSegments(ctx context.Context, themeID int64) ([]models.AdminAnimeThemeSegment, error)
    CreateAdminAnimeThemeSegment(ctx context.Context, themeID int64, input models.AdminAnimeThemeSegmentCreateInput) (*models.AdminAnimeThemeSegment, error)
    DeleteAdminAnimeThemeSegment(ctx context.Context, segmentID int64) error
}
```

Add `themeRepo adminThemeRepository` field to `AdminContentHandler` struct. Wire in `NewAdminContentHandler`.

### Pattern 4: Route Registration (from `admin_routes.go`)

```go
// Append to registerAdminRoutes in admin_routes.go
v1.GET("/admin/theme-types", auth, deps.adminContentHandler.ListThemeTypes)
v1.GET("/admin/anime/:id/themes", auth, deps.adminContentHandler.ListAnimeThemes)
v1.POST("/admin/anime/:id/themes", auth, deps.adminContentHandler.CreateAnimeTheme)
v1.PATCH("/admin/anime/:id/themes/:themeId", auth, deps.adminContentHandler.UpdateAnimeTheme)
v1.DELETE("/admin/anime/:id/themes/:themeId", auth, deps.adminContentHandler.DeleteAnimeTheme)
v1.GET("/admin/anime/:id/themes/:themeId/segments", auth, deps.adminContentHandler.ListAnimeThemeSegments)
v1.POST("/admin/anime/:id/themes/:themeId/segments", auth, deps.adminContentHandler.CreateAnimeThemeSegment)
v1.DELETE("/admin/anime/:id/themes/:themeId/segments/:segmentId", auth, deps.adminContentHandler.DeleteAnimeThemeSegment)
```

Note: `themeId` and `segmentId` are parsed with `strconv.ParseInt(c.Param("themeId"), 10, 64)` inline (same as `targetAnimeId` in relations).

### Pattern 5: Frontend Section Card (from `AnimeRelationsSection.tsx`)

```tsx
// Source: frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx
// Theme section follows the same <details>/<summary> collapsible card shape:
export function AnimeThemesSection({ animeID, authToken, onSuccess, onError }) {
  const model = useAdminAnimeThemes({ animeID, authToken, onSuccess, onError })
  return (
    <section className={`${styles.card} ${themeStyles.sectionCard}`}>
      <details className={themeStyles.details}>
        <summary>...</summary>
        ...
      </details>
    </section>
  )
}
```

**Rendered in `AdminAnimeEditPageClient.tsx` after `AnimeEditWorkspace`**, following the same position as `JellyfinSyncPanel`. The theme section is a separate card, not part of `SharedAnimeEditorWorkspace`.

### Pattern 6: Migration Seed (from `0044_add_db_schema_v2_target_tables.up.sql`)

Migration 0044 already seeded `theme_types` with 3 rows: `opening`, `ending`, `insert_song`.

The required Phase 23 labels are: `OP1`, `OP2`, `ED1`, `ED2`, `Insert`, `Outro`.

**Seed strategy:** The existing seed values conflict with the desired values. Migration 0048 should:
1. Delete or rename the 3 existing generic seeds (they were never used in production data — `themes` table is empty)
2. Insert the 6 new specific values

```sql
-- 0048_seed_theme_types.up.sql
-- The themes table is still empty so renaming legacy seed rows is safe.
DELETE FROM theme_types WHERE name IN ('opening', 'ending', 'insert_song');

INSERT INTO theme_types (name) VALUES
    ('OP1'),
    ('OP2'),
    ('ED1'),
    ('ED2'),
    ('Insert'),
    ('Outro')
ON CONFLICT (name) DO NOTHING;
```

```sql
-- 0048_seed_theme_types.down.sql
DELETE FROM theme_types WHERE name IN ('OP1', 'OP2', 'ED1', 'ED2', 'Insert', 'Outro');

INSERT INTO theme_types (name) VALUES
    ('opening'),
    ('ending'),
    ('insert_song')
ON CONFLICT (name) DO NOTHING;
```

### Pattern 7: Frontend API Helper (from `api.ts` relations block)

```typescript
// Source: frontend/src/lib/api.ts — append after existing admin functions
export async function getAdminAnimeThemes(
  animeID: number,
  authToken?: string,
): Promise<AdminAnimeThemesResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<AdminAnimeThemesResponse>
}
```

All theme API helpers follow this identical structure, varying only method (`POST`/`PATCH`/`DELETE`) and URL.

### Anti-Patterns to Avoid

- **Do not build a separate handler struct** for themes. The codebase uses one `AdminContentHandler` with method receiver functions per domain. The `themeRepo` interface field follows the `relationRepo` pattern.
- **Do not put the theme section inside `SharedAnimeEditorWorkspace`** or the 4-step form. Relations/sync panels live as separate cards after the workspace — themes should do the same.
- **Do not use theme_type name strings as foreign keys in handler logic.** Accept `theme_type_id` (integer) in POST body and validate it exists; do not resolve labels in the handler layer.
- **Do not seed theme_types via code (no seed service).** All lookup data seeding goes through SQL migration files only.
- **Do not exceed 450 lines in any single file.** The new handler file has 8 handler functions. If it approaches 450 lines, split segments handlers into a second file `admin_content_anime_theme_segments.go`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin auth guard | Custom token check | `h.requireAdmin(c)` from `admin_content_authz.go` | Already handles 401 with standard response |
| Anime existence check | SELECT COUNT before INSERT | `r.animeExists(ctx, animeID)` in repository | Shared guard used by all anime-scoped methods |
| Error sentinel detection | Type assertions | `errors.Is(err, repository.ErrNotFound)` | Consistent error propagation chain |
| Internal server error response | Custom error JSON | `writeInternalErrorResponse(c, msg, err, detail)` | Logs + standard JSON format |
| Anime ID parsing from URL | `strconv.ParseInt` inline | `parseAnimeID(c.Param("id"))` from `anime.go` | Validates positive int + error normalization |
| API fetch boilerplate | Inline fetch | `withAuthHeader`, `parseApiErrorPayload`, `ApiError` | All already in `api.ts` |

---

## Episode Number Format

The `episodes.episode_number` column is `TEXT` (migration 0002). It can contain:
- Pure numeric strings: `"1"`, `"24"`, `"125"` (most common)
- Special episode strings: `"OVA"`, `"SP1"`, `"0"`, `"13.5"` (observed in migrations 0033, 0036)
- Extended patterns: decimal-like `"13.5"` is handled by `number_decimal DECIMAL(5,1)` column

**Implication for theme_segments:** The `theme_segments` table references episodes by `start_episode_id` / `end_episode_id` (BIGINT foreign keys to `episodes.id`), NOT by episode_number string. The frontend must allow admins to pick episodes by displaying `episode_number` (for readability) while sending `episode.id` to the API. A GET endpoint to list episodes for an anime (by anime_id) is needed on the backend to populate the episode picker in the UI.

**Existing episode list endpoint check:** The public endpoint `GET /api/v1/anime/:id/episodes` exists (via `fansubHandler.ListGroupedEpisodes`). For the admin theme segment picker, the planner should decide whether to reuse this public endpoint (acceptable since it requires no auth and returns episode IDs + numbers) or add a dedicated admin episodes list. Research suggests reusing the public endpoint is fine for V1 given the admin-only audience.

---

## Common Pitfalls

### Pitfall 1: theme_types seed conflict
**What goes wrong:** Migration 0044 already inserted `opening`, `ending`, `insert_song`. If 0048 tries to insert `OP1` etc. without removing them, the table ends up with both sets. The frontend dropdown would show 9 options including stale generic names.
**Why it happens:** ON CONFLICT DO NOTHING silently skips but does not remove old rows.
**How to avoid:** Delete the 3 old rows by name before inserting new ones. The `themes` table is guaranteed empty at this point (no production data links to these types yet).
**Warning signs:** `SELECT COUNT(*) FROM theme_types` returns 9 after running 0048 migration.

### Pitfall 2: themeId parameter collision in route
**What goes wrong:** Route `/admin/anime/:id/themes/:themeId/segments` uses `:id` for anime and `:themeId` for theme. If the handler tries `parseAnimeID(c.Param("themeId"))` instead of a separate parse call, the wrong ID is used.
**Why it happens:** Copy-paste error from relation handler which only has `:id` and `:targetAnimeId`.
**How to avoid:** Write explicit `parseID` for each URL param; do not reuse the `parseAnimeID` name for theme/segment IDs to avoid confusion. Use `strconv.ParseInt(c.Param("themeId"), 10, 64)` inline.

### Pitfall 3: Frontend segment picker sends episode_number instead of episode_id
**What goes wrong:** The `theme_segments` DB columns are `start_episode_id` / `end_episode_id` (FK to `episodes.id`). If the frontend sends `episode_number` string, the backend would need to resolve it — adding unnecessary complexity and fragility (episode_number is TEXT and can be non-unique across anime boundaries if data is bad).
**Why it happens:** Episode pickers naturally show `episode_number` for display, and developers conflate display value with API payload.
**How to avoid:** The API request body for CreateAnimeThemeSegment must contain `start_episode_id` and `end_episode_id` as integer IDs. The frontend picker fetches episode list (id + episode_number), displays `episode_number`, but submits `id`.

### Pitfall 4: Placing theme section inside the 4-step form
**What goes wrong:** If `AnimeThemesSection` is placed inside `SharedAnimeEditorWorkspace`, it becomes entangled with the metadata save/reset lifecycle (patch form dirty state, submit flow).
**Why it happens:** It feels natural to add it as a "step 5" alongside relations.
**How to avoid:** `AnimeRelationsSection` is NOT inside `SharedAnimeEditorWorkspace`. It is rendered as a separate card after `AnimeEditWorkspace` in `AdminAnimeEditPageClient`. Follow the same mounting point.

### Pitfall 5: File length violation
**What goes wrong:** 8 handler functions for themes (list types, list themes, create theme, update theme, delete theme, list segments, create segment, delete segment) plus request struct definitions can easily exceed 450 lines.
**Why it happens:** The relations handler is 273 lines for 5 functions; 8 functions would likely reach 430-500 lines.
**How to avoid:** Split segment handlers into a second file `admin_content_anime_theme_segments.go` if the main themes file exceeds 400 lines during implementation.

---

## Code Examples

### SQL for themes list query

```sql
-- Source: derived from existing relation queries in anime_relations_admin.go pattern
SELECT
    t.id,
    t.anime_id,
    t.theme_type_id,
    tt.name AS theme_type_name,
    t.title,
    t.created_at
FROM themes t
JOIN theme_types tt ON tt.id = t.theme_type_id
WHERE t.anime_id = $1
ORDER BY t.theme_type_id, t.id
```

### SQL for theme_segments list query

```sql
SELECT
    ts.id,
    ts.theme_id,
    ts.start_episode_id,
    ts.end_episode_id,
    se.episode_number AS start_episode_number,
    ee.episode_number AS end_episode_number,
    ts.created_at
FROM theme_segments ts
LEFT JOIN episodes se ON se.id = ts.start_episode_id
LEFT JOIN episodes ee ON ee.id = ts.end_episode_id
WHERE ts.theme_id = $1
ORDER BY ts.id
```

### Frontend API helper pattern

```typescript
// Source: frontend/src/lib/api.ts lines 1919-1940 (createAdminAnimeRelation)
export async function createAdminAnimeTheme(
  animeID: number,
  payload: AdminAnimeThemeCreateRequest,
  authToken?: string,
): Promise<AdminAnimeThemeCreateResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes`, {
    method: 'POST',
    headers: withAuthHeader({ 'Content-Type': 'application/json' }, authToken),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<AdminAnimeThemeCreateResponse>
}
```

### TypeScript type definitions (append to `admin.ts`)

```typescript
export interface AdminThemeType {
  id: number;
  name: string;
}

export interface AdminAnimeTheme {
  id: number;
  anime_id: number;
  theme_type_id: number;
  theme_type_name: string;
  title: string | null;
  created_at: string;
}

export interface AdminAnimeThemeSegment {
  id: number;
  theme_id: number;
  start_episode_id: number | null;
  end_episode_id: number | null;
  start_episode_number: string | null;
  end_episode_number: string | null;
  created_at: string;
}

export interface AdminAnimeThemeCreateRequest {
  theme_type_id: number;
  title?: string;
}

export interface AdminAnimeThemePatchRequest {
  theme_type_id?: number;
  title?: string;
}

export interface AdminAnimeThemeSegmentCreateRequest {
  start_episode_id?: number | null;
  end_episode_id?: number | null;
}

export interface AdminThemeTypesResponse {
  data: AdminThemeType[];
}

export interface AdminAnimeThemesResponse {
  data: AdminAnimeTheme[];
}

export interface AdminAnimeThemeSegmentsResponse {
  data: AdminAnimeThemeSegment[];
}

export interface AdminAnimeThemeCreateResponse {
  data: AdminAnimeTheme;
}

export interface AdminAnimeThemeSegmentCreateResponse {
  data: AdminAnimeThemeSegment;
}
```

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — pure code and migration additions to existing running stack).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3 (frontend), Go test + testify (backend) |
| Config file | `frontend/vitest.config.ts` (frontend), none explicit for backend |
| Quick run command (frontend) | `cd frontend && npm test -- --run` |
| Full suite command (frontend) | `cd frontend && npm test -- --run` |

### Phase Requirements to Test Map

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| THEME-01 | theme_types seeded with OP1/OP2/ED1/ED2/Insert/Outro | manual smoke (DB query) | `psql -c "SELECT name FROM theme_types ORDER BY id"` | N/A |
| THEME-02 | List themes for anime returns correct JSON | unit (handler) | Go test in `admin_content_anime_themes_test.go` | No — Wave 0 |
| THEME-03 | Create theme validates theme_type_id exists | unit (handler) | Go test | No — Wave 0 |
| THEME-04 | Delete theme removes record | unit (repository) | Go test | No — Wave 0 |
| THEME-05 | Create theme_segment sends correct IDs to DB | unit (repository) | Go test | No — Wave 0 |
| THEME-06 | Frontend theme section renders list | unit (component) | `npm test -- --run AnimeThemesSection` | No — Wave 0 |
| THEME-07 | Frontend hook calls correct API endpoints | unit (hook + fetch mock) | `npm test -- --run useAdminAnimeThemes` | No — Wave 0 |

### Sampling Rate

- Per task commit: `cd frontend && npm test -- --run`
- Per wave merge: full suite + backend `go test ./...`
- Phase gate: full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/internal/handlers/admin_content_anime_themes_test.go` — covers THEME-02, THEME-03, THEME-04
- [ ] `backend/internal/repository/admin_content_anime_themes_test.go` — covers THEME-04, THEME-05
- [ ] `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.test.tsx` — covers THEME-06
- [ ] `frontend/src/app/admin/anime/hooks/useAdminAnimeThemes.test.ts` — covers THEME-07

---

## Open Questions

1. **Episode picker data source for theme_segments**
   - What we know: The public `GET /api/v1/anime/:id/episodes` endpoint exists and returns grouped episodes with `id` and `episode_number`.
   - What's unclear: Whether the planner should reuse the public endpoint or add a dedicated `GET /admin/anime/:id/episodes/list` for the segment picker.
   - Recommendation: Reuse the public endpoint for V1 (admin-only audience, simpler). If the public endpoint response shape is not suitable (it returns grouped episodes, not a flat list), a dedicated admin flat-list endpoint may be needed. Planner should inspect the public endpoint response shape before deciding.

2. **theme_type_id validation in handler vs DB constraint**
   - What we know: `theme_type_id` is a FK to `theme_types(id)` with no special constraint beyond the FK.
   - What's unclear: Whether to validate the ID exists via a SELECT before INSERT (defensive) or rely on the FK violation error from pgx.
   - Recommendation: Accept the FK violation and map `pgconn.PgError` with `Code == "23503"` (foreign_key_violation) to a 400 bad request in the handler, same as the conflict pattern in `anime_relations_admin.go`.

3. **Nullability of title in theme POST**
   - What we know: `themes.title` is `TEXT` (nullable). An OP1 theme might have a title like "Again" or might not.
   - Recommendation: Make `title` optional in the create request (`*string` in Go, `title?: string` in TypeScript). Return `null` on list when absent.

---

## Sources

### Primary (HIGH confidence)

- Direct file reads: `backend/internal/handlers/admin_content_anime_relations.go` — CRUD handler reference
- Direct file reads: `backend/internal/handlers/admin_content_handler.go` — struct and interface pattern
- Direct file reads: `backend/cmd/server/admin_routes.go` — route registration pattern
- Direct file reads: `backend/internal/repository/anime_relations_admin.go` — repository method pattern
- Direct file reads: `database/migrations/0044_add_db_schema_v2_target_tables.up.sql` — theme table schema + current seed
- Direct file reads: `database/migrations/0047_add_anime_source_links.up.sql` — latest migration number reference
- Direct file reads: `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx` — section component pattern
- Direct file reads: `frontend/src/app/admin/anime/components/AnimeEditPage/AdminAnimeEditPageClient.tsx` — edit page mounting point
- Direct file reads: `frontend/src/app/admin/anime/hooks/useAdminAnimeRelations.ts` — hook pattern
- Direct file reads: `frontend/src/lib/api.ts` lines 1877-1981 — API helper pattern
- Direct file reads: `frontend/src/types/admin.ts` — TypeScript type pattern

### Secondary (MEDIUM confidence)

- Migration file pattern analysis: `0033`, `0044`, `0047` — consistent append-only SQL style confirmed
- `episode_number` TEXT format: confirmed via `0002_init_episodes.up.sql` and extended analysis in `0033`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all code read directly from source
- Architecture patterns: HIGH — all patterns extracted from existing, working, analogous code
- Migration strategy: HIGH — table schema verified, seed content verified, conflict strategy clear
- Episode format: HIGH — confirmed TEXT type from initial migration; special formats confirmed from migration 0033
- Pitfalls: HIGH — derived from direct code inspection, not speculation

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (stable domain, no fast-moving dependencies)
