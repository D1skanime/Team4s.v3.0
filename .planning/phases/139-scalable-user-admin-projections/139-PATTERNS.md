# Phase 139: Scalable User-Admin Projections - Pattern Map

**Mapped:** 2026-08-24
**Files analyzed:** 22 (new + modified, backend + frontend + contracts + scripts)
**Analogs found:** 20 / 22 (2 have no direct in-repo analog — see "No Analog Found")

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/models/admin_users.go` | model | CRUD (read projection) | itself (existing DTOs to extend alongside, e.g. `ClaimListRow`/`AdminUserListResult` shape in same package) | exact (extend in place) |
| `backend/internal/repository/admin_users_tab_repository.go` | repository | CRUD / pagination (filtered, grouped list) | `backend/internal/repository/member_claims_list_repository.go` (`ListClaims`) | exact (pagination+filter shape); **no analog for the grouping/range-collapse SQL itself** |
| `backend/internal/repository/admin_users_queries.go` | repository (query constants) | CRUD (page-first CTE) | itself, `adminUsersListQuery` (existing page-first CTE with `COUNT(*) OVER()`, LATERAL joins) | exact |
| `backend/internal/handlers/admin_users_handler.go` | controller/handler | request-response | itself, `ListUsers` handler (limit/offset/status query parsing) | exact |
| `backend/cmd/server/admin_routes.go` | route registration | request-response | itself, existing `/admin/users/*` block (lines 177-188) + `/admin/fansubs/:id/app-members/:appUserId/effective-rights` registration (line 298) | exact |
| NEW `backend/internal/repository/admin_users_contributions_query.go` (or similar; range-collapse/override-diff) | repository | transform (SQL window-function gap-and-island) | `frontend/src/components/contributions/AnimeGroupCard.tsx` (`buildEpisodeRanges`, client-side, **visual reference only per CONTEXT.md — must be ported to SQL, not reused as code**) | role-match only — **no server-side SQL analog exists anywhere in the repo** |
| NEW `backend/internal/repository/admin_users_rights_summary_query.go` (F-01 batched endpoint, if planner picks a new endpoint) | repository | batch/CRUD | `backend/internal/permissions/effective_rights_capability_impact_preview.go` (`PreviewGroupRightsCapabilityChange`, Phase 138-07) | role-match (batch-load-then-evaluate-in-memory pattern) |
| `backend/internal/repository/release_crew_snapshot_repository.go` | repository | CRUD (write path, F-03 context) | itself — **read-only context, not modified by Phase 139** (the new override-diff query reads `release_crew_snapshots` + `anime_contributions`, but this file's `ReplaceInTx`/`SeedInheritedInTx` write paths stay untouched) | exact (context only) |
| `backend/internal/repository/query_counter.go` | test-support (query tracer) | event-driven (query counting) | itself — reused verbatim, package-private, zero changes needed | exact (reuse as-is) |
| NEW `backend/internal/testsupport/phase139_postgres.go` | test-support (disposable DB harness) | batch (fixture bootstrap) | `backend/internal/testsupport/phase137_postgres.go` (`OpenPhase137Postgres`) | exact |
| NEW `backend/internal/repository/admin_users_query_budget_test.go` | test | integration (query-count gate) | `backend/internal/repository/member_profile_query_budget_test.go` (Phase 131) | exact |
| NEW `backend/internal/repository/admin_users_contributions_query_test.go` / `admin_users_media_query_test.go` | test | integration | `member_profile_query_budget_test.go` (seed few/many pattern) + `member_claims_list_repository.go`'s own (implicit) filter-test shape | role-match |
| `frontend/src/types/admin-users.ts` | model (TS types) | transform (DTO mirror) | itself — existing `AdminClaimListRow`/`AdminClaimsListParams`/`AdminClaimsListResponse` (lines 238-275, `data`+`meta.total/limit/offset` envelope) | exact |
| `frontend/src/lib/api.ts` | service (API client) | request-response | itself, `listClaims`/`listChanges` (query-param-building + envelope-typed fetch, lines 3868-3892) and `getAdminUserContributions`/`getAdminUserMedia` (lines 3811-3844, to be replaced with paginated variants) | exact |
| `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` (full rewrite) | component | request-response (grouped list + filters) | `frontend/src/components/contributions/AnimeGroupCard.tsx` (card shape, role chips, project-open button) + `frontend/src/app/admin/claims/useClaimsListFilters.ts` (URL-synced filter pattern) | role-match (structure); no existing grouped-card+pagination+filter component in `admin/users/` today |
| `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` (F-01 fan-out fix) | component | request-response (batched fetch) | itself — `GroupRightsSummarySection`/`GroupSummaryCard` (lines 90-212, visual shape locked, only the fetch orchestration changes) | exact |
| `frontend/src/app/admin/users/tabs/UserMediaTab.tsx` (rewrite) | component | request-response (grouped list + filters) | `UserMediaTab.tsx` itself (existing `MediaCard`/`SectionHeader`/`Card variant="nested"` shape to keep) + `AnimeGroupCard.tsx` (`Card variant="nestedFlat"`, action-button pattern) | role-match |
| `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` (F-01 fan-out fix, defer-to-expand) | component | request-response (lazy per-group fetch) | itself — `loadData` (lines 71-124), only the eager `Promise.all` fan-out (lines 82-84) changes to lazy-on-select | exact |
| NEW `frontend/src/app/admin/users/useUserContributionsFilters.ts` / `useUserMediaFilters.ts` | hook | request-response (URL-synced filters) | `frontend/src/app/admin/claims/useClaimsListFilters.ts` | exact |
| NEW `.module.css` for grouped-card + container-query layout (Contributions/Media tabs) | config (CSS) | — | `frontend/src/components/profile/RoleBadgeCard.module.css` (`@container member-badge-carousel`, line 241) + `frontend/src/app/members/[slug]/page.module.css` (`container-type: inline-size` + `container-name`, lines 90-97) | exact |
| `frontend/src/components/contributions/AnimeGroupCard.tsx` | component (reference only) | transform (client-side range-collapse) | itself — **not modified**; its `buildEpisodeRanges` algorithm (lines 57-139) is the reference the new SQL must reproduce server-side | n/a (reference, not a target file) |
| `shared/contracts/admin-content.yaml` | config (API contract, custom DSL) | — | itself — existing `admin-user-contributions`/`admin-user-media` entries (lines 1801-1822) | exact (Option A: extend in place) |
| `shared/contracts/admin-capabilities.yaml` | config (real OpenAPI 3.0.3, contract-tested) | — | itself — existing `/api/v1/admin/fansubs/{id}/capabilities` path shape (lines 1-40) | exact (Option B: alternate target for the new F-01 batched-summary endpoint) |
| `scripts/seed-member-profile-fixtures.mjs` (extend or sibling) | script (seed) | file-I/O / batch (API-driven fixture) | itself — Node 18+, zero-dependency, idempotent, Keycloak-token-driven convention (lines 1-90) | exact |

## Pattern Assignments

### `backend/internal/models/admin_users.go` (model, CRUD)

**Analog:** itself (existing file, extend alongside current DTOs)

**Current DTO shape to extend, not replace** (`backend/internal/models/admin_users.go:154-200`):
```go
// AdminContributionItem beschreibt eine einzelne Contribution eines Users.
type AdminContributionItem struct {
	ContributionID   int64    `json:"contribution_id"`
	FansubGroupID    int64    `json:"fansub_group_id"`
	FansubGroupName  string   `json:"fansub_group_name"`
	AnimeID          int64    `json:"anime_id"`
	AnimeTitle       string   `json:"anime_title"`
	ReleaseVersionID *int64   `json:"release_version_id"`
	ContributionType string   `json:"contribution_type"` // "project_default" | "release_override"
	DisputeState     string   `json:"dispute_state"`
	RoleCodes        []string `json:"role_codes"`
	ReleaseVersionLabel *string `json:"release_version_label"`
	EpisodeNumber       *string `json:"episode_number"`
}

// AdminUserContributionsResult ist das DTO für den Contributions-Tab (D-13: vier Gruppen).
type AdminUserContributionsResult struct {
	ProjectDefaults   []AdminContributionItem `json:"project_defaults"`
	ReleaseOverrides  []AdminContributionItem `json:"release_overrides"`
	OpenDisputes      []AdminContributionItem `json:"open_disputes"`
	LegacyHistorical  []AdminContributionItem `json:"legacy_historical"`
}

// AdminMediaItemSummary beschreibt ein einzelnes Media-Item eines Users.
type AdminMediaItemSummary struct {
	MediaAssetID     int64   `json:"media_asset_id"`
	MediaType        string  `json:"media_type"`
	OriginalFilename string  `json:"original_filename"`
	PublicURL        string  `json:"public_url"`
	FileSizeBytes    int64   `json:"file_size_bytes"`
	UploadedAt       string  `json:"uploaded_at"`
	OwnerContext     string  `json:"owner_context"` // z. B. "release_version:42"
}
```

**Pagination/meta envelope pattern to copy** (`AdminUserListResult`, same file lines 53-61):
```go
type AdminUserListResult struct {
	Data []AdminUserListItem `json:"data"`
	Meta struct {
		Total  int `json:"total"`
		Limit  int `json:"limit"`
		Offset int `json:"offset"`
	} `json:"meta"`
}
```
Phase 139's new grouped-block DTOs (`AdminUserContributionsPage`/`AdminUserMediaPage` or similar new type names — per RESEARCH.md's Pitfall 2, do NOT reuse `TotalContributionsCount` semantics) should follow this exact `Data []X` + `Meta{Total,Limit,Offset}` envelope shape, adding a `filter_options` field per the UI-SPEC's Filter Data Contract.

**Critical naming pitfall (verified in `AdminUserOverview`, same file lines 69-93):** `TotalContributionsCount`/`total_contributions_count` already exists and means raw-row count — the new endpoint's grouped-block total must use an unambiguous distinct field name (e.g. `meta.total` scoped to the new response type only).

---

### `backend/internal/repository/admin_users_tab_repository.go` + NEW `admin_users_contributions_query.go` (repository, CRUD/pagination + transform)

**Analog 1 — pagination/filter/count shape:** `backend/internal/repository/member_claims_list_repository.go:53-190` (`ClampAdminListPage` + `ListClaims`)

```go
// ClampAdminListPage clamps a client-supplied limit/offset pair to the shared
// admin-list-page convention: limit defaults to 25 when <= 0 and is capped at
// 100; offset floors at 0.
func ClampAdminListPage(limit, offset int) (int, int) {
	if limit <= 0 {
		limit = adminListDefaultLimit
	}
	if limit > adminListMaxLimit {
		limit = adminListMaxLimit
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}
```

```go
// Dynamic optional filters via numbered placeholders, never string-concatenated values
// (member_claims_list_repository.go:78-153):
func (r *MemberClaimsRepository) ListClaims(ctx context.Context, filter ClaimListFilter) ([]ClaimListRow, int, error) {
	limit, offset := ClampAdminListPage(filter.Limit, filter.Offset)
	args := []any{}
	paramIdx := 1
	var whereClauses []string
	if filter.Status != nil && *filter.Status != "" {
		args = append(args, *filter.Status)
		whereClauses = append(whereClauses, fmt.Sprintf("mc.claim_status = $%d", paramIdx))
		paramIdx++
	}
	// ... more optional filters, same shape ...
	whereSQL := ""
	for _, clause := range whereClauses {
		whereSQL += " AND " + clause
	}
	args = append(args, limit, offset)
	limitParam := paramIdx
	offsetParam := paramIdx + 1
	query := fmt.Sprintf(`
		SELECT ..., COUNT(*) OVER() AS total_count
		FROM member_claims mc
		JOIN ... 
		WHERE 1 = 1%s
		ORDER BY mc.created_at DESC, mc.id DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, limitParam, offsetParam)
	// rows.Scan(..., &total) per row, return items, total, nil
}
```
**Phase 139 delta:** `COUNT(*) OVER()` must run over the GROUPED result (project-block / release-episode-block), not raw rows — wrap the filtered+grouped CTE, then `COUNT(*) OVER()` on the grouped rows, per RESEARCH.md Pattern 1.

**Analog 2 — page-first CTE with LATERAL aggregates:** `backend/internal/repository/admin_users_queries.go:14-31` (`adminUsersListQuery`, same package, same file family)
```go
var adminUsersListQuery = `
WITH filtered AS (
    SELECT au.*
    FROM app_users au
    WHERE
        ($1 = '' OR au.email ILIKE '%' || $1 || '%' OR au.display_name ILIKE '%' || $1 || '%')
        AND ($2 = '' OR au.status = $2)
        ...
),
page AS (
    SELECT *, COUNT(*) OVER() AS total_count
    FROM filtered
    ORDER BY COALESCE(last_login_at, updated_at, created_at) DESC, id DESC
    LIMIT $5 OFFSET $6
)
SELECT page.total_count, page.id, ...
FROM page
LEFT JOIN LATERAL (...) roles ON true
...
`
```

**Existing query this file's `ListUserContributions` MUST replace** (`admin_users_tab_repository.go:149-253`, unbounded flat fetch, no filter/pagination — this is the exact query to delete/rewrite):
```go
rows, err := r.db.Query(ctx, `
	SELECT
		ac.id, ac.fansub_group_id, fg.name AS fansub_group_name,
		ac.anime_id, a.title AS anime_title, ac.release_version_id,
		CASE WHEN ac.release_version_id IS NULL THEN 'project_default' ELSE 'release_override' END,
		COALESCE(ac.dispute_state, ''),
		COALESCE(ARRAY_AGG(acr.role_code ORDER BY acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]),
		(ac.member_id IS NULL) AS is_legacy_historical,
		rv.version, ep.episode_number
	FROM anime_contributions ac
	JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
	JOIN anime a ON a.id = ac.anime_id
	LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
	LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
	LEFT JOIN release_versions rv ON rv.id = ac.release_version_id
	LEFT JOIN fansub_releases fr ON fr.id = rv.release_id
	LEFT JOIN episodes ep ON ep.id = fr.episode_id
	WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
	GROUP BY ac.id, ac.member_id, fg.name, a.title, rv.version, ep.episode_number
	ORDER BY a.title, ac.release_version_id NULLS FIRST, ac.id
`, memberID)
```
This existing JOIN chain (`anime_contributions` → `fansub_groups`/`anime` → `release_versions` → `fansub_releases` → `episodes`) is the correct base to extend with `episodes.sort_index` ordering, a `release_crew_snapshots` join for override-diff, and window-function range-collapse — it already has every table Phase 139 needs joined, it just lacks grouping/pagination.

**Existing broken media fields that must be actually implemented** (`admin_users_tab_repository.go:260-275`, `GetUserMedia`):
```go
rows, err := r.db.Query(ctx, `
    SELECT
        rvm.media_asset_id,
        COALESCE(mt.name, ma.mime_type, 'media'),
        COALESCE(ma.file_path, ''),
        ''::text,          -- PublicURL: hardcoded empty, never derived
        0::bigint,          -- FileSizeBytes: hardcoded zero, never joined from media_files
        rvm.created_at::text,
        'release_version:' || rvm.release_version_id::text   -- OwnerContext (D19: remove this raw form)
    FROM release_version_media rvm
    JOIN media_assets ma ON ma.id = rvm.media_asset_id
    LEFT JOIN media_types mt ON mt.id = ma.media_type_id
    WHERE rvm.uploaded_by_user_id = $1 AND rvm.deleted_at IS NULL
    ORDER BY rvm.created_at DESC
`, appUserID)
```

**F-03 write-path context (why `snapshot_mode='independent'` alone is not proof of override), `release_crew_snapshot_repository.go:238-302`:**
```go
if _, err := tx.Exec(ctx, `
	INSERT INTO release_crew_snapshots (
		release_version_id, fansub_group_id, snapshot_mode, created_at, updated_at
	) VALUES ($1, $2, $3, NOW(), NOW())
	ON CONFLICT (release_version_id, fansub_group_id)
	DO UPDATE SET snapshot_mode = EXCLUDED.snapshot_mode, updated_at = NOW()
`, releaseVersionID, fansubGroupID, mode); err != nil { ... }
// ...
// ReplaceInTx stores a complete manually edited snapshot and permanently marks it independent.
func (r *ReleaseCrewSnapshotRepository) ReplaceInTx(...) (*ReleaseCrewSnapshotChange, error) {
	return replaceReleaseCrewInTx(ctx, tx, releaseVersionID, fansubGroupID, SnapshotModeIndependent, rows)
}
```
`ReplaceInTx` unconditionally writes `independent` — confirms the new override-diff query must compute the semantic (member_id + role_codes set) diff between `release_version_id = X` rows and `release_version_id IS NULL` (project-standard) rows AT READ TIME, not trust `snapshot_mode`.

**No existing SQL implementation of range-collapse exists** — the only reference is the client-side algorithm in `AnimeGroupCard.tsx` (see below, "No Analog Found").

---

### `backend/internal/handlers/admin_users_handler.go` (controller, request-response)

**Analog:** itself, `ListUsers` (`admin_users_handler.go:80-114`)
```go
func (h *AdminUsersHandler) ListUsers(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}
	_ = identity

	params := models.AdminUserListParams{
		Q:          c.Query("q"),
		Status:     c.Query("status"),
		GlobalRole: c.Query("global_role"),
		Sort:       c.Query("sort"),
	}
	if v := c.Query("has_conflicts"); v == "true" {
		params.HasConflicts = true
	}
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			params.Limit = n
		}
	}
	if v := c.Query("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			params.Offset = n
		}
	}

	result, err := h.repo.ListAdminUsersPage(c.Request.Context(), params)
	if err != nil {
		log.Printf("admin users: ListUsers error: %v", err)
		internalError(c, "Benutzerliste konnte nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, result)
}
```
**Auth gate pattern (identical on all 9 existing entry points, e.g. `GetUserContributions`, lines 239-258):**
```go
func (h *AdminUsersHandler) GetUserContributions(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}
	_ = identity

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	result, err := h.repo.ListUserContributions(c.Request.Context(), userID)
	if err != nil {
		log.Printf("admin users: GetUserContributions error: %v", err)
		internalError(c, "Beiträge konnten nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, result)
}
```
Every new/changed filter param (anime id, group id, role code, `nur_abweichungen` bool, `from`/`to` date range) must be parsed the same way (`c.Query(...)` + `strconv`), never string-concatenated into SQL, and passed through a filter struct into the repository (mirrors `ClaimListFilter`).

---

### `backend/cmd/server/admin_routes.go` (route registration)

**Analog:** itself, existing `/admin/users/*` block (`admin_routes.go:177-188`) and the single-group effective-rights route (`admin_routes.go:298`):
```go
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
...
v1.GET("/admin/fansubs/:id/app-members/:appUserId/effective-rights", auth, deps.adminEffectiveRightsHandler.GetEffectiveRights)
```
No new route method signature is needed — `GetUserContributions`/`GetUserMedia` stay `GET` on the same paths (only query params/response shape change); a new F-01 batched rights-summary route, if chosen as a dedicated endpoint, follows the exact same one-line `v1.GET(path, auth, handler.Method)` registration convention, e.g. `v1.GET("/admin/users/:userId/rights-summary", auth, deps.adminUsersHandler.GetUserRightsSummary)`.

---

### `backend/internal/repository/query_counter.go` + NEW `admin_users_query_budget_test.go` (test-support, event-driven query counting)

**Analog:** itself, reused verbatim (`query_counter.go:1-59`, package-private, zero changes needed):
```go
type queryCounter struct {
	queries atomic.Int64
}
func (c *queryCounter) TraceQueryStart(ctx context.Context, _ *pgx.Conn, _ pgx.TraceQueryStartData) context.Context {
	c.queries.Add(1)
	return ctx
}
func (c *queryCounter) TraceQueryEnd(_ context.Context, _ *pgx.Conn, _ pgx.TraceQueryEndData) {}
func (c *queryCounter) reset() { c.queries.Store(0) }
func (c *queryCounter) count() int { return int(c.queries.Load()) }
var _ pgx.QueryTracer = (*queryCounter)(nil)
```

**Constant-query-budget gate pattern to copy:** `member_profile_query_budget_test.go:176-213` (`TestPhase131PublicProfileQueryBudgetIsConstant`)
```go
func TestPhase131PublicProfileQueryBudgetIsConstant(t *testing.T) {
	pool, counter := openPhase131Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	const fewMember int64 = 1310010
	const manyMember int64 = 1310020
	const fewProjects = 2
	const manyProjects = 6
	seedPhase131MemberWithCurrentProjects(t, pool, fewMember, "phase131-few", fewProjects)
	seedPhase131MemberWithCurrentProjects(t, pool, manyMember, "phase131-many", manyProjects)

	counter.reset()
	fewProfile, err := repo.GetPublicMemberProfileByID(context.Background(), fewMember)
	require.NoError(t, err)
	fewCount := counter.count()

	counter.reset()
	manyProfile, err := repo.GetPublicMemberProfileByID(context.Background(), manyMember)
	require.NoError(t, err)
	manyCount := counter.count()

	require.Equalf(t, fewCount, manyCount,
		"constant query budget violated: %d-project load issued %d queries but %d-project load issued %d",
		fewProjects, fewCount, manyProjects, manyCount)
	require.Equalf(t, phase131ConstantQueryBudget, manyCount, "... update phase131ConstantQueryBudget only with an intentional, documented loader change")
}
```
Phase 139's version asserts the same-count invariant for e.g. 3-vs-30 anime+project blocks per user, replacing `phase131ConstantQueryBudget` with a new `phase139ConstantQueryBudget`-style constant per endpoint (contributions, media).

**Wiring the counter into the pool** (`member_profile_query_budget_test.go:55-72`):
```go
func openPhase131Postgres(t *testing.T) (*pgxpool.Pool, *queryCounter) {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(phase131DSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping ...", phase131DSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", phase131DSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, phase131DatabasePattern.MatchString(dbName), "unsafe %s: ...", phase131DSNEnv)

	counter := &queryCounter{}
	config.ConnConfig.Tracer = counter

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", phase131DSNEnv)
	t.Cleanup(pool.Close)
	// ...
	return pool, counter
}
```

---

### NEW `backend/internal/testsupport/phase139_postgres.go` (test-support, disposable-DB harness)

**Analog:** `backend/internal/testsupport/phase137_postgres.go` (full file, mirror exactly — 191 lines)
```go
const phase137DSNEnv = "TEAM4S_PHASE137_TEST_DSN"

var (
	phase137DatabasePattern = regexp.MustCompile(`^team4s_phase137_test_[a-z0-9]+$`)
	phase137SchemaPattern   = regexp.MustCompile(`^phase137_[a-z0-9_]+$`)
)

func OpenPhase137Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase137DSNEnv,
		phase137DatabasePattern,
		"phase137_",
		phase137SchemaPattern,
		createPhase137Prerequisites,
	)
}

func createPhase137Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	const sql = `
CREATE TABLE members ( id BIGINT PRIMARY KEY );
CREATE TABLE app_users ( id BIGINT PRIMARY KEY, status VARCHAR(20) NOT NULL DEFAULT 'pending', ... );
CREATE TABLE fansub_groups ( id BIGINT PRIMARY KEY );
CREATE TABLE fansub_group_members ( ... );
-- Minimal stand-in required before migration 0085's FK...
CREATE TABLE hist_group_member_roles (role_code TEXT);`
	if err := validatePhase106SQL(sql); err != nil { t.Fatal(err) }
	if _, err := pool.Exec(context.Background(), sql); err != nil { t.Fatalf("create Phase-137 prerequisites: %v", err) }
	for _, migration := range []string{
		"0085_role_definitions_seed.up.sql",
		"0100_role_definitions_fansub_lead.up.sql",
		"0108_capability_registry.up.sql",
		"0112_role_model_cleanup.up.sql",
		"0146_capability_policy_catalog.up.sql",
		"0150_effective_rights_overrides.up.sql",
	} {
		ApplySQLFile(t, pool, phase137MigrationPath(t, migration))
	}
	// post-migration ALTER TABLE / CREATE TABLE IF NOT EXISTS additions...
}
```
Phase 139's `phase139_postgres.go` must define `phase139DSNEnv = "TEAM4S_PHASE139_TEST_DSN"`, `phase139DatabasePattern`/`phase139SchemaPattern` regexes (fail-closed, never `team4s_v2`), and `createPhase139Prerequisites` hand-assembling (per RESEARCH.md Assumption A2, the safer default) `anime_contributions`/`anime_contribution_roles`/`release_crew_snapshots`/`release_versions`/`fansub_releases`/`episodes`/`release_version_groups`/`release_version_media`/`media_assets`/`media_files`.

---

### `frontend/src/types/admin-users.ts` (model, TS DTO mirror)

**Analog:** itself — existing paginated-list envelope shape (`admin-users.ts:238-275`, `AdminClaimListRow`/`AdminClaimsListParams`/`AdminClaimsListResponse`):
```ts
export interface AdminClaimListRow {
  claim_id: number
  app_user_id: number
  // ...
  created_at: string
  verified_at: string | null
}

export interface AdminClaimsListParams {
  status?: string
  claim_type?: string
  fansub_group_id?: number
  app_user_id?: number
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export interface AdminClaimsListResponse {
  data: AdminClaimListRow[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}
```
**Existing DTOs to extend, not delete** (`admin-users.ts:169-213`, current flat shapes the new paginated/grouped types must supersede for the tab components while models stay 1:1 mirrors of the Go structs):
```ts
export interface AdminContributionItem {
  contribution_id: number
  fansub_group_id: number
  fansub_group_name: string
  anime_id: number
  anime_title: string
  release_version_id: number | null
  contribution_type: 'project_default' | 'release_override'
  dispute_state: string
  role_codes: string[]
  release_version_label: string | null
  episode_number: string | null
}

export interface AdminUserContributionsResponse {
  project_defaults: AdminContributionItem[]
  release_overrides: AdminContributionItem[]
  open_disputes: AdminContributionItem[]
  legacy_historical: AdminContributionItem[]
}
```

---

### `frontend/src/lib/api.ts` (service, request-response)

**Analog 1 — query-param-building + typed envelope fetch:** `listClaims` (`api.ts:3868-3892`)
```ts
export async function listClaims(
  params: AdminClaimsListParams = {},
): Promise<AdminClaimsListResponse> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.claim_type) query.set("claim_type", params.claim_type);
  if (params.fansub_group_id != null) query.set("fansub_group_id", String(params.fansub_group_id));
  if (params.app_user_id != null) query.set("app_user_id", String(params.app_user_id));
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  const response = await apiClientFetch(
    `/api/v1/admin/claims?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminClaimsListResponse>;
}
```

**Analog 2 — existing unbounded functions to replace with the paginated shape above:** `getAdminUserContributions`/`getAdminUserMedia` (`api.ts:3811-3844`)
```ts
export async function getAdminUserContributions(
  userId: number,
): Promise<AdminUserContributionsResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/contributions`,
    { cache: "no-store" },
  );
  // ... error handling identical to listClaims above
  return response.json() as Promise<AdminUserContributionsResponse>;
}
```
Phase 139's replacement signature should be `getAdminUserContributions(userId: number, params: AdminUserContributionsParams = {})` following `listClaims`'s query-building convention exactly.

**Unchanged single-group endpoint the Rights-tab lazy-fetch fix reuses as-is** (`api.ts:10053-10070`):
```ts
export async function getEffectiveRights(
  fansubGroupId: number,
  appUserId: number,
): Promise<EffectiveRightState[]> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/effective-rights`,
    { cache: "no-store" },
  )
  // ...
}
```

---

### `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` (full rewrite) + NEW `useUserContributionsFilters.ts`

**Analog 1 — URL-synced filter hook to copy exactly:** `frontend/src/app/admin/claims/useClaimsListFilters.ts` (full file, 144 lines)
```ts
export function useClaimsListFilters(limit = DEFAULT_LIMIT): UseClaimsListFiltersResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const status = searchParams.get('status') ?? ''
  // ... one searchParams.get() per filter field
  const offset = Number(searchParams.get('offset') ?? '0') || 0

  const writeParams = useCallback(
    (patch: FilterPatch, resetOffset = true) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      // ... merge patch over current values, delete empty keys, set non-empty
      const nextOffset = resetOffset ? 0 : (patch.offset ?? offset)
      if (nextOffset > 0) nextSearchParams.set('offset', String(nextOffset))
      else nextSearchParams.delete('offset')
      const query = nextSearchParams.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [/* deps */],
  )

  const handlePageChange = useCallback(
    (page: number) => { writeParams({ offset: (page - 1) * limit }, false) },
    [limit, writeParams],
  )

  const params: AdminClaimsListParams = useMemo(() => ({ /* assemble from URL state */ }), [/* deps */])

  return { params, handleStatusChange, handleGroupChange, handleUserChange, handleDateRangeChange, handlePageChange }
}
```
Never `router.push` — always `router.replace(..., { scroll: false })`; `useMemo` on the returned `params` object is load-bearing (prevents infinite refetch loop, per the hook's own inline comment).

**Analog 2 — grouped-card shape (title, role chips, single-project action button):** `frontend/src/components/contributions/AnimeGroupCard.tsx:180-222`
```tsx
<Card variant="nestedFlat" className={styles.roleCard}>
  <div className={styles.roleCardTop}>
    <div>
      <span className={styles.roleCardTitle}>{animeTitle}</span>
      {uniqueRoles.length > 0 ? (
        <div className={styles.roleChips}>
          {uniqueRoles.map(({ code, label }) => (
            <Badge
              key={code}
              variant="neutral"
              className={ROLE_CATALOG_CHIP_CLASS}
              data-color-key={presentationForRole(contributionRoles, code).colorKey}
            >
              {label}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
    <div className={styles.roleCardActions}>
      {projectGroups.length === 1 ? (
        <Button size="sm" variant="primary" href={`/me/projects/${animeId}/group/${projectGroups[0].fansubGroupId}`}>
          Projekt öffnen
        </Button>
      ) : null}
    </div>
  </div>
</Card>
```
**Reference-only range-collapse algorithm to PORT to server-side SQL, NOT reuse as frontend code** (D23 forbids client-side grouping) — `AnimeGroupCard.tsx:57-139` (`buildEpisodeRanges`):
```tsx
for (const [roleCode, roleContribs] of byRole.entries()) {
  let rangeStart = roleContribs[0]
  let rangeEnd = roleContribs[0]
  for (let i = 1; i <= roleContribs.length; i++) {
    const current = roleContribs[i]
    const prevSortIndex = rangeEnd.episode_sort_index
    const currSortIndex = current?.episode_sort_index
    const isConsecutive =
      current !== undefined &&
      prevSortIndex !== null && prevSortIndex !== undefined &&
      currSortIndex !== null && currSortIndex !== undefined &&
      currSortIndex === prevSortIndex + 1
    if (isConsecutive) {
      rangeEnd = current
    } else {
      // emit a range entry [rangeStart, rangeEnd], then reset rangeStart/rangeEnd = current
    }
  }
}
```

**Existing table-based component being replaced** (`UserContributionsTab.tsx`, full file, 242 lines) — the `ContributionSection`/`Table`/`TableRow` structure (lines 42-149) must be deleted; the fetch/loading/error-state skeleton (lines 151-176) is the one part to KEEP:
```tsx
const loadData = useCallback(async () => {
  try {
    setIsLoading(true)
    setError(null)
    const resp = await getAdminUserContributions(userId)
    setData(resp)
  } catch (err) {
    setError(err instanceof ApiError ? err.message : 'Daten konnten nicht geladen werden. Erneut versuchen.')
  } finally {
    setIsLoading(false)
  }
}, [userId])
```

---

### `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` (F-01 fan-out fix)

**Analog:** itself — `GroupSummaryCard`/`GroupRightsSummarySection` (`UserOverviewTab.tsx:90-212`), visual shape LOCKED (Phase 138 D-05), only `loadSummary`'s data source changes:
```tsx
// CURRENT (byte-identical fan-out to UserGroupRightsTab.tsx, must be replaced):
const loadSummary = useCallback(async () => {
  try {
    setIsLoading(true)
    setError(null)
    const [membershipsResp, matrixResult] = await Promise.all([
      getAdminUserGroupMemberships(userId),
      listRoleCapabilities().catch(() => null),
    ])
    const rightsList = await Promise.all(
      membershipsResp.memberships.map((membership) => getEffectiveRights(membership.fansub_group_id, userId)),
    )
    const byGroup: Record<number, EffectiveRightState[]> = {}
    membershipsResp.memberships.forEach((membership, index) => {
      byGroup[membership.fansub_group_id] = rightsList[index]
    })
    setMemberships(membershipsResp.memberships)
    setRightsByGroup(byGroup)
    setMatrix(matrixResult)
  } catch (err) { /* ... */ }
}, [userId])
```
This is the exact block to replace with ONE call to the new batched rights-summary endpoint. `GroupSummaryCard`'s render body (lines 90-125) — role label join, `headlineStates.slice(0, HEADLINE_CAPABILITY_LIMIT)`, `hasDeviation` — stays visually/textually unchanged; only the data source it's fed from changes.

---

### `frontend/src/app/admin/users/tabs/UserMediaTab.tsx` (rewrite) + NEW `useUserMediaFilters.ts`

**Analog 1 — existing card/action-button shape to keep and extend:** `UserMediaTab.tsx:66-105` (`MediaCard`)
```tsx
function MediaCard({ item }: { item: AdminMediaItemSummary }) {
  const versionId = parseReleaseVersionId(item.owner_context)
  return (
    <Card variant="nested" style={{ marginBottom: 'var(--space-3)' }}>
      <div style={{ padding: 'var(--space-3)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
            {item.original_filename || item.media_type}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
            Hochgeladen: {formatDate(item.uploaded_at)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
          {versionId != null && (
            <Button variant="ghost" size="sm" onClick={() => window.open(`/me/releases/${versionId}/workspace`, '_blank')}>
              Arbeitsfläche öffnen
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
```
**Must be deleted per D19/D23, not extended:**
```tsx
// hasScopePermission — fake permission signal, deleted outright, no replacement:
function hasScopePermission(ownerContext: string): boolean {
  return ownerContext.startsWith('release_version:') && ownerContext.trim().length > 'release_version:'.length
}
// groupByReleaseVersion — client-side Map grouping over the FULL unbounded response,
// the exact anti-pattern D23 forbids once the backend groups server-side:
function groupByReleaseVersion(items: AdminMediaItemSummary[]): Map<string, AdminMediaItemSummary[]> {
  const groups = new Map<string, AdminMediaItemSummary[]>()
  for (const item of items) {
    const key = item.owner_context || 'ohne-scope'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return groups
}
```
Copy replaces "Arbeitsfläche öffnen" with the D16-locked "Release-Medien öffnen" (`Button variant="primary"`, not `ghost`).

**Public URL derivation to copy the CONVENTION from (not the code — different repo/handler):** `backend/internal/handlers/admin_content_release_version_media.go:532-541`
```go
// buildRVMPublicURL converts a storage path to a /media/... public URL.
// Storage path example: /app/media/release-version/3/uuid/original.png
// Public URL example:   /media/release-version/3/uuid/original.png
func (h *AdminContentHandler) buildRVMPublicURL(storagePath string) string {
	rel := strings.TrimPrefix(storagePath, h.mediaStorageDir)
	rel = strings.TrimPrefix(rel, "/")
	rel = strings.TrimPrefix(rel, "\\")
	rel = strings.ReplaceAll(rel, "\\", "/")
	return "/media/" + rel
}
```

---

### `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` (D22 lazy-fetch fix)

**Analog:** itself — `loadData` (`UserGroupRightsTab.tsx:71-124`), only lines 82-84 (the eager fan-out) change:
```tsx
const loadData = useCallback(async () => {
  try {
    setIsLoading(true)
    setError(null)
    const [membershipsResp, matrixResult] = await Promise.all([
      getAdminUserGroupMemberships(userId),
      listRoleCapabilities().catch(() => null),
    ])
    const memberships = membershipsResp.memberships
    // THIS is the eager Promise.all fan-out D22 forbids — replace with a lazy,
    // single-group fetch triggered on selection/expand instead:
    const rightsList = await Promise.all(
      memberships.map((membership) => getEffectiveRights(membership.fansub_group_id, userId)),
    )
    const rightsByGroup: Record<number, EffectiveRightState[]> = {}
    memberships.forEach((membership, index) => {
      rightsByGroup[membership.fansub_group_id] = rightsList[index]
    })
    // ...
  } catch (err) { /* ... */ }
}, [userId])
```
The `?tab=roles-rights&group={fansubGroupId}` deep-link handling (component reads `group` search param, per UI-SPEC) must pre-select and eagerly fetch exactly that ONE group — reuse the unchanged `getEffectiveRights(groupId, userId)` call, just moved out of the `Promise.all`.

---

### `.module.css` for grouped-card + container-query layout (NEW file per tab)

**Analog 1 — `container-type`/`container-name` declaration:** `frontend/src/app/members/[slug]/page.module.css:90-97`
```css
.ownerPreviewNotice {
  container-name: owner-preview-notice;
  container-type: inline-size;
}
```

**Analog 2 — `@container` at-rule syntax already shipped in this codebase:** `frontend/src/components/profile/RoleBadgeCard.module.css:241-245`
```css
@container member-badge-carousel (max-width: 480px) {
  .roleBadgeRow {
    padding-inline: 8px;
  }
}
```
Phase 139's new CSS declares `container-type: inline-size; container-name: admin-user-projection;` on each tab's root list container, then `@container admin-user-projection (max-width: 760px) { ... }` and `@container admin-user-projection (max-width: 600px) { ... }` per the UI-SPEC's locked breakpoints — same mechanism, new container name.

---

### `shared/contracts/admin-content.yaml` (contract, config)

**Analog:** itself — existing entries to extend in place (`admin-content.yaml:1801-1822`):
```yaml
  - name: admin-user-contributions
    method: GET
    path: /api/v1/admin/users/:userId/contributions
    auth:
      required: true
      role: platform_admin
    response:
      status: 200
      type: AdminUserContributionsResult
    description: >
      Contributions-Tab (D-12/D-13). member_id als kanonischer Anker (Migration 0105).
      Vier Gruppen: project_defaults, release_overrides, open_disputes, legacy_historical.

  - name: admin-user-media
    method: GET
    path: /api/v1/admin/users/:userId/media
    auth:
      required: true
      role: platform_admin
    response:
      status: 200
      type: AdminUserMediaResult
```
Phase 139 changes `query_params`/`response.type` on these two existing entries in place (add pagination/filter params, new grouped DTO type names) and updates `description`. No new file needed for Option A.

**Alternate analog for Option B (new F-01 batched-summary endpoint only), real OpenAPI shape:** `shared/contracts/admin-capabilities.yaml:1-40` (`openapi: 3.0.3`, `paths./api/v1/admin/fansubs/{id}/capabilities.get`, contract-tested by `admin_capability_contract_test.go`) — see RESEARCH.md F-02 for the full planner decision matrix (hybrid recommended: contributions/media stay in `admin-content.yaml`, new rights-summary endpoint goes in `admin-capabilities.yaml`).

---

### `scripts/seed-member-profile-fixtures.mjs` (extend or sibling script, F-03 demo-data path)

**Analog:** itself — header/conventions (`seed-member-profile-fixtures.mjs:1-90`):
```js
#!/usr/bin/env node
// Reusable, idempotent, API-driven seed fixture ... Safe to re-run
// (check-existence-then-create; 409/duplicate treated as success).
// Requires Node 18+ (global fetch, FormData, Blob). No external npm dependencies.

const API = (process.env.SEED_API_BASE || 'http://192.168.235.196:18092').replace(/\/+$/, '')
const KC = (process.env.SEED_KC_BASE || 'http://192.168.235.196:18081').replace(/\/+$/, '')
const ADMIN_USER = process.env.SEED_ADMIN_USER || 'csubs-leader@team4s.local'
const ADMIN_PW = process.env.SEED_ADMIN_PW || '123'

async function kcToken(username, password) {
  const body = new URLSearchParams({ grant_type: 'password', client_id: KC_CLIENT, username, password })
  const res = await fetch(`${KC}/realms/${REALM}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}
```
The exact API call the F-03 demo-data path needs (per RESEARCH.md): `PUT /api/v1/admin/release-versions/:versionId/contributions/effective` with a crew payload that differs from the anime+group's project-standard rows (produces genuine `independent`+different), then a second call with a set-equal payload (produces `independent`+identical) — both callable via this script's existing `fetch`-with-bearer-token helper pattern, run via `docker exec team4sv30-frontend node /tmp/seed.mjs` per `scripts/README-seed.md:34-41`.

---

## Shared Patterns

### Platform-admin auth gate (every new/changed handler entry point)
**Source:** `backend/internal/handlers/admin_users_handler.go` (all 9 existing methods, e.g. lines 80-84, 239-244)
**Apply to:** every method on `AdminUsersHandler`, including any new F-01 rights-summary handler
```go
identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
if !ok {
	return
}
_ = identity
```

### Pagination clamp
**Source:** `backend/internal/repository/member_claims_list_repository.go:58-69` (`ClampAdminListPage`, exported, shared by `ListClaims`/`ListChanges`)
**Apply to:** every new paginated repository method (contributions, media, and the rights-summary/membership list if paginated)
```go
func ClampAdminListPage(limit, offset int) (int, int) {
	if limit <= 0 { limit = adminListDefaultLimit }   // 25
	if limit > adminListMaxLimit { limit = adminListMaxLimit } // 100
	if offset < 0 { offset = 0 }
	return limit, offset
}
```

### Query-count instrumentation
**Source:** `backend/internal/repository/query_counter.go` (package-private, reuse as-is, zero changes)
**Apply to:** all QUAL-06 query-budget tests for the new contributions/media/rights-summary endpoints

### Disposable per-phase Postgres test harness
**Source:** `backend/internal/testsupport/phase137_postgres.go` (`OpenPhase137Postgres` + `createPhase137Prerequisites`)
**Apply to:** new `testsupport/phase139_postgres.go`, `TEAM4S_PHASE139_TEST_DSN`, fail-closed database-name regex guard

### URL-synced list filters (never client-only)
**Source:** `frontend/src/app/admin/claims/useClaimsListFilters.ts` (full file)
**Apply to:** new `useUserContributionsFilters.ts` / `useUserMediaFilters.ts` — debounced-free-text/immediate-select fields written to `URLSearchParams`, `offset` reset on filter change, `router.replace(..., { scroll: false })`, never `router.push`

### Grouped `Card` block shape
**Source:** `frontend/src/components/contributions/AnimeGroupCard.tsx:180-222` (`Card variant="nestedFlat"`, title + role chips + single-project primary action button)
**Apply to:** every new Contributions/Media project-block and release/episode-block card

### Container-query responsive degradation (deliberate D26 deviation from admin's `useIsMobile()` convention)
**Source:** `frontend/src/components/profile/RoleBadgeCard.module.css:241-245` + `frontend/src/app/members/[slug]/page.module.css:90-97`
**Apply to:** the new grouped-card/toolbar `.module.css` files for Contributions and Media tabs only — NOT existing `admin/` `useIsMobile()` call sites (out of scope)

### Public media URL derivation
**Source:** `backend/internal/handlers/admin_content_release_version_media.go:535-541` (`buildRVMPublicURL`)
**Apply to:** the new `GetUserMedia` SQL/Go code that must actually derive `PublicURL`/`FileSizeBytes` instead of hardcoding `''`/`0`

### Batch-load-then-evaluate-in-memory (avoids moving N+1 from HTTP to SQL)
**Source:** `backend/internal/permissions/effective_rights_capability_impact_preview.go:63-103` (`PreviewGroupRightsCapabilityChange`, Phase 138-07)
**Apply to:** the new F-01 batched rights-summary endpoint — load membership/roles/overrides for ALL groups in one (or few) SQL round-trips, then run the already-in-memory `evaluateGroupRights`-equivalent logic once per group over already-loaded data, never a per-group SQL call inside a Go loop

## No Analog Found

Files/logic with no close match anywhere in the codebase (planner should treat these as genuinely new engineering, budgeted accordingly — RESEARCH.md's Open Question 2 flags this as the most likely source of underestimated plan count):

| File / Logic | Role | Data Flow | Reason |
|---|---|---|---|
| NEW server-side range-collapse + override-diff SQL (inside `admin_users_tab_repository.go` or a new sibling query file) | repository | transform (gap-and-island window function) | No SQL implementation of "collapse consecutive episode ranges" exists anywhere in this codebase — the only reference is `AnimeGroupCard.tsx`'s client-side `buildEpisodeRanges` (JS loop over already-fetched rows), explicitly flagged in `139-CONTEXT.md` as visual reference only, not the Phase-139 implementation. The semantic override-diff (member_id + role_codes set comparison between `release_version_id = X` rows and `release_version_id IS NULL` project-standard rows) also has zero existing precedent — no code in this repo currently compares two `anime_contributions` row-sets for equality. |
| NEW F-01 batched rights-summary endpoint (handler + repository method + DTO) | controller + repository | batch (single-request, multi-group capability summary) | No existing endpoint returns a per-group capability summary for ALL of a user's group memberships in one call — the only existing rights endpoint (`GET .../effective-rights`) is single-group-scoped by design. `PreviewGroupRightsCapabilityChange` is the closest structural analog (batch-load-then-evaluate-in-memory) but solves a different problem (hypothetical role-change impact across role HOLDERS, not a real per-group summary for one user) — role-match only, not a copy-paste source. |

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`, `backend/internal/models/`, `backend/internal/testsupport/`, `backend/internal/permissions/`, `backend/cmd/server/`, `frontend/src/app/admin/`, `frontend/src/components/contributions/`, `frontend/src/components/profile/`, `frontend/src/lib/api.ts`, `frontend/src/types/`, `shared/contracts/`, `scripts/`
**Files scanned (full or targeted read):** 24
**Pattern extraction date:** 2026-08-24
