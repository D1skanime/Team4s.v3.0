# Phase 167: Fansub-Gruppenerkennung beim Episoden-Import - Pattern Map

**Mapped:** 2026-09-23
**Files analyzed:** 22 (14 backend, 8 frontend)
**Analogs found:** 22 / 22

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/importutil/fansub_group.go` | utility | transform | itself (rewrite of existing branches) | exact (own file, hardened in place) |
| `backend/internal/importutil/fansub_group_test.go` | test | transform | `backend/internal/repository/anime_test.go` (`TestBuildAnimeListWhere_FansubFilter*`) | role-match (table-driven idiom) |
| `backend/internal/importutil/fansub_release_version.go` (or same file) | utility | transform | `backend/internal/importutil/fansub_group.go` | exact (same package/style) |
| `backend/internal/handlers/admin_episode_import_fansub_match.go` | handler (new file, called from existing handler) | request-response | `backend/internal/handlers/admin_episode_import.go` (`buildEpisodeImportPreview`, call-site only) + `fansub_project_resolver_handler_test.go` (narrow-interface seam) | role-match |
| `backend/internal/repository/fansub_group_match.go` (batch matching query, new file) | repository | batch | `backend/internal/repository/search_fansub.go` (`buildSearchFansubQuery`/`buildSearchFansubOrder`) | exact (same WHERE-expression, adapted to array input) |
| `backend/internal/repository/phase167_fansub_match_test.go` | test | batch / CRUD | `backend/internal/repository/segment_origin_query_budget_test.go` (query-budget) + `backend/internal/repository/fansub_story_preview_postgres_test.go` (real-DB fixture) | role-match |
| `backend/internal/testsupport/phase167_postgres.go` | test-support | file-I/O (DB fixture) | `backend/internal/testsupport/phase165_postgres.go` | exact (template) |
| `backend/internal/repository/episode_import_repository_fansub_helpers.go` | repository | CRUD | itself (gate/remove `upsertImportFansubGroup` fallback path) | exact |
| `backend/internal/repository/episode_import_repository_release_helpers.go` | repository | CRUD | itself (`resolveImportFansubSelection`) | exact |
| `backend/internal/repository/fansub_repository.go` (add `ReassignAlias`) | repository | CRUD | itself (`CreateAlias`/`DeleteAlias`, lines 993-1040) | exact |
| `backend/internal/handlers/fansub_group_aliases.go` (add reassign endpoint + import-time learn call) | handler | request-response | itself (`CreateFansubAlias`/`DeleteFansubAlias`) | exact |
| `backend/internal/handlers/phase167_fansub_learn_test.go` | test | request-response | `backend/internal/handlers/fansub_project_resolver_handler_test.go` | exact (explicit compliant precedent) |
| `backend/internal/models/episode_import.go` (add origin/suggestion/conflict/version-source fields) | model | transform | itself (`EpisodeImportMappingRow` struct, lines 72-85) | exact |
| `shared/contracts/admin-content.yaml` (`EpisodeImportMappingRow` schema, ~lines 1772-1783) | config/contract | transform | itself | exact |
| `frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx` | component | request-response (display + confirm action) | `ClaimManagementPanel.tsx` (`useConfirmDialog`) + `GroupRolesTab.tsx` (`Badge`) + `page.tsx`'s `styles.existingBadge`/`styles.fillerBadge` span idiom (non-interactive hint) | role-match (composite) |
| `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` | component | request-response | itself (existing group-chip block + release-version `<input>`) | exact (minimal additive edit) |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx` | component | CRUD | `GroupRolesTab.tsx` (Card/Table/LoadingState/ErrorState/EmptyState shell) + `ClaimManagementPanel.tsx` (`useConfirmDialog` for destructive actions) + `FansubCommunityLinksList.tsx` (FormField+Input+Select add/edit row) | role-match (composite) |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx` | component | request-response | itself (sibling-render pattern already used for `FansubBasicInfoTab`) | exact (minimal additive edit) |
| `frontend/src/lib/api.ts` (add `reassignFansubAlias`) | service | request-response | itself (`createFansubAlias`/`deleteFansubAlias`, lines 2090-2141) | exact |
| `frontend/src/types/fansub.ts` (reassign request/response types) | model/types | transform | itself (`FansubAlias`, `FansubAliasCreateRequest`) | exact |
| `frontend/src/types/episodeImport.ts` (origin/suggestions/conflict/version-source fields) | model/types | transform | itself (`EpisodeImportMappingRow`, lines 63-81) | exact |
| `frontend/src/app/admin/changes/ChangeEntryTranslator.ts` (new `fansub_group_alias.*` cases) | transform | transform | itself (`translateChangeEntry` switch, lines 47-100) | exact |

---

## Pattern Assignments

### `backend/internal/importutil/fansub_group.go` (utility, transform)

**Analog:** itself — the existing two-branch parser is the baseline to harden, not replace wholesale.

**Current implementation in full** (verbatim, no tests exist today):
```go
// Source: backend/internal/importutil/fansub_group.go (full file)
var (
	bracketedFansubGroupPattern = regexp.MustCompile(`\[(?P<group>[^\[\]]+)\]`)
	suffixedFansubGroupPattern  = regexp.MustCompile(`(?i)(?:^|[._\-\s])s\d{1,2}e\d{1,4}(?:-\d{1,4})?[-._\s]+(?P<group>[^.]+)$`)
)

func DeriveFansubGroupName(fileName string, fullPath string) string {
	evidence := strings.TrimSpace(fileName + " " + fullPath)
	if match := bracketedFansubGroupPattern.FindStringSubmatch(evidence); len(match) >= 2 {
		return strings.TrimSpace(match[1])
	}
	baseName := strings.TrimSpace(fileName)
	if baseName == "" {
		normalizedPath := strings.ReplaceAll(strings.TrimSpace(fullPath), "\\", "/")
		if normalizedPath != "" { baseName = path.Base(normalizedPath) }
	}
	if baseName == "" { return "" }
	baseName = strings.TrimSpace(strings.TrimSuffix(baseName, filepath.Ext(baseName)))
	if baseName == "" { return "" }
	if match := suffixedFansubGroupPattern.FindStringSubmatch(baseName); len(match) >= 2 {
		return strings.TrimSpace(strings.Trim(match[1], "-._ "))
	}
	return ""
}
```

**What must change (per D-05/D-06/D-07, traced in 167-RESEARCH.md Section 1.1/2):**
1. `evidence := fileName + " " + fullPath` must become filename-only, with `fullPath` used **only** when `fileName == ""` (D-05). Do not concatenate-and-search both.
2. Every candidate bracket/suffix match must run through a denylist check (8-hex-char CRC, resolutions, codecs, container, language/source tags, pure digits) **before** being accepted — apply uniformly to every bracket position, not only the fallback branch (Pitfall 4 in RESEARCH.md).
3. Add a new scene-schema pattern for `gruppe-titel.sXXeYY…` (prefix-before-hyphen, D-07) — this is a **new** pattern, not a fix to `suffixedFansubGroupPattern` (which only ever matches the Jellyfin-rename suffix shape).
4. No match anywhere ⇒ return `""` (never guess, D-06).

**Test fixtures (D-10) — copy verbatim from `167-RESEARCH.md` Section 2's 13-row table** (all traced/verified, zero corrections needed):
`[SHFS]07-Ghost_01_...`, `[GFE]Hand_Maid_May_01_...`, `[FH-Subs]Needless EP01...`, `[BDnP]NIGHT.HEAD.2041.S01E01...`, `[BnP]NIGHT.HEAD.2041.S01E09...`, `[GK]No Game, No Life...v4.mkv`, `[Pure-Ani-me] Macross Delta 01...`, `[L-S] Natsume Yuujinchou...`, `Naruto Ger Sub 012.avi` (→ `""`), `Naruto_026-027_ger_Sub_Uncut(1920).mkv` (→ `""`), `Naruto.S01E01-AnimeOwnage.avi` (→ `AnimeOwnage`), `dmpd-mashle.magic.and.muscles.s01e17...` (→ `dmpd`, currently `""`), `Serie_01_[AEC71BC3].mkv` (→ `""`, currently `AEC71BC3`).

---

### `backend/internal/importutil/fansub_group_test.go` (test, table-driven)

**Analog:** `backend/internal/repository/anime_test.go`

**Table-driven idiom to copy** (lines 67-99):
```go
// Source: backend/internal/repository/anime_test.go:67-76
func TestBuildAnimeListWhere_FansubFilter(t *testing.T) {
	whereSQL, args := buildAnimeListWhere(models.AnimeFilter{FansubGroupID: int64Ptr(42)})
	wantWhere := " WHERE status <> 'disabled' AND EXISTS (SELECT 1 FROM anime_fansub_groups afg WHERE afg.anime_id = anime.id AND afg.fansub_group_id = $1)"
	if whereSQL != wantWhere {
		t.Fatalf("expected where %q, got %q", wantWhere, whereSQL)
	}
	if !reflect.DeepEqual(args, []any{int64(42)}) {
		t.Fatalf("expected args %#v, got %#v", []any{int64(42)}, args)
	}
}
```
For Phase 167, use the `tests := []struct{ name string; fileName string; fullPath string; want string }{...}` + `t.Run(tt.name, func(t *testing.T) {...})` shape (standard Go idiom used across this repo), seeded with the 13-row table above. This satisfies both D-10 and CLAUDE.md's Teststil rule (real execution, not source-inspection) trivially since `DeriveFansubGroupName` is a pure function.

---

### `backend/internal/repository/fansub_group_match.go` (new, repository, batch)

**Analog:** `backend/internal/repository/search_fansub.go`

**Imports pattern** (lines 1-9):
```go
package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"
)
```

**Core batch-matching WHERE-expression to adapt** (lines 23-68, the single-term version — mirror this byte-for-byte, just swap `$1`/`$2` scalar binds for `= ANY($1::text[])`/`unnest`):
```go
// Source: backend/internal/repository/search_fansub.go:37-52
conditions = append(conditions, fmt.Sprintf(`(
	f_unaccent(fansub_groups.name) %% f_unaccent($%[1]d)
	OR lower(fansub_groups.slug) LIKE lower($%[1]d) || '%%'
	OR regexp_replace(lower(f_unaccent(fansub_groups.name)), '[^a-z0-9]+', '', 'g') = $%[2]d
	OR regexp_replace(lower(f_unaccent(fansub_groups.name)), '[^a-z0-9]+', '', 'g') LIKE $%[2]d || '%%'
	OR regexp_replace(lower(f_unaccent(fansub_groups.slug)), '[^a-z0-9]+', '', 'g') = $%[2]d
	OR EXISTS (
		SELECT 1 FROM fansub_group_aliases fga
		WHERE fga.fansub_group_id = fansub_groups.id
		  AND (
			fga.normalized_alias = $%[2]d
			OR f_unaccent(fga.normalized_alias) %% f_unaccent($%[1]d)
		  )
	)
	OR fansub_groups.search_tsv @@ plainto_tsquery('simple', f_unaccent($%[1]d))
)`, qPos, qNormPos))
```

**Rank order to reuse for the origin-hint's "matched_via" classification** (`buildSearchFansubOrder`, lines 76-92): alias/name-normalized exact match (0) → exact name (1) → exact slug (2) → alias trigram (3) → name trigram (4) → rest (5). D-08's "eindeutiger Treffer" should map to ranks 0-2 only (exact); ranks 3-4 (trigram) feed the "Meinten Sie...?" suggestion list (D-03), never an auto-selection.

**Batch shape sketch (illustrative, from `167-RESEARCH.md` Section 4.1 — verify columns before copy-paste):**
```sql
WITH candidates AS (
  SELECT * FROM unnest($1::text[]) WITH ORDINALITY AS c(raw_group, row_ord)
)
SELECT c.row_ord, fg.id, fg.name, fg.slug, fga.alias AS matched_alias
FROM candidates c
LEFT JOIN fansub_group_aliases fga
  ON fga.normalized_alias = regexp_replace(lower(f_unaccent(c.raw_group)), '[^a-z0-9]+', '', 'g')
LEFT JOIN fansub_groups fg
  ON fg.id = fga.fansub_group_id
  OR regexp_replace(lower(f_unaccent(fg.name)), '[^a-z0-9]+', '', 'g')
     = regexp_replace(lower(f_unaccent(c.raw_group)), '[^a-z0-9]+', '', 'g')
  OR regexp_replace(lower(f_unaccent(fg.slug)), '[^a-z0-9]+', '', 'g')
     = regexp_replace(lower(f_unaccent(c.raw_group)), '[^a-z0-9]+', '', 'g');
```
**Critical:** the `regexp_replace(lower(f_unaccent(col)), '[^a-z0-9]+', '', 'g')` expression must be copied **verbatim** (not re-derived) — it must byte-match the functional index expression in `0140_search_foundation.up.sql` or Postgres silently falls back to a sequential scan (Pitfall 3).

**Error handling pattern** (from `search_fansub.go` lines 100-146 — `searchFansub` function): every query wraps its error with `fmt.Errorf("<verb> <noun>: %w", err)`, no panics, no swallowed errors — follow this exactly for the new batch function.

---

### `backend/internal/testsupport/phase167_postgres.go` (new, test-support)

**Analog:** `backend/internal/testsupport/phase165_postgres.go` (full file read, template to copy structurally)

```go
// Source: backend/internal/testsupport/phase165_postgres.go:1-48 (structure to mirror)
package testsupport

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

const phase165DSNEnv = "TEAM4S_PHASE165_TEST_DSN"

var (
	phase165DatabasePattern = regexp.MustCompile(`^team4s_phase165_test_[a-z0-9]+$`)
	phase165SchemaPattern   = regexp.MustCompile(`^phase165_[a-z0-9_]+$`)
)

func OpenPhase165Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase165DSNEnv,
		phase165DatabasePattern,
		"phase165_",
		phase165SchemaPattern,
		createPhase165Prerequisites,
	)
}
```
For Phase 167: rename every `165`→`167`, env var becomes `TEAM4S_PHASE167_TEST_DSN`, database pattern `^team4s_phase167_test_[a-z0-9]+$`, schema pattern `^phase167_[a-z0-9_]+$`. `createPhase167Prerequisites` should create **minimal stand-in** `fansub_groups`/`fansub_group_aliases` tables mirroring only the real columns exercised (see migrations `0009_fansub_groups.up.sql`/`0014_fansub_group_aliases.up.sql` below for the exact columns/constraints to copy), not the full migration chain — same minimal-fixture philosophy as `createPhase165Prerequisites`.

**Real table columns to mirror exactly** (`database/migrations/0014_fansub_group_aliases.up.sql`):
```sql
CREATE TABLE fansub_group_aliases (
    id BIGSERIAL PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    alias VARCHAR(120) NOT NULL,
    normalized_alias VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fansub_group_aliases_normalized_alias UNIQUE (normalized_alias),
    CONSTRAINT uq_fansub_group_aliases_group_normalized UNIQUE (fansub_group_id, normalized_alias)
);
```

---

### `backend/internal/repository/phase167_fansub_match_test.go` (new, test)

**Analog 1 (query-budget):** `backend/internal/repository/query_counter.go`
```go
// Source: backend/internal/repository/query_counter.go:17-24 (usage doc comment)
// counter := &queryCounter{}
// config, _ := pgxpool.ParseConfig(dsn)
// config.ConnConfig.Tracer = counter
// pool, _ := pgxpool.NewWithConfig(ctx, config)
// counter.reset()
// _, _ = repo.GetPublicMemberProfileByID(ctx, memberID)
// got := counter.count() // number of queries issued by that single call
```
Use this exactly (swap in the new batch-match repository call) to prove D-08/D-20's "constant query count regardless of file count" — call once with N=1 filename and once with N=50, assert `counter.count()` is identical both times.

**Analog 2 (real-DB fixture):** `backend/internal/repository/fansub_story_preview_postgres_test.go`
```go
// Source: backend/internal/repository/fansub_story_preview_postgres_test.go:34-50
func openFansubStoryPreviewPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(fansubStoryPreviewDSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping fansub story preview Postgres test", fansubStoryPreviewDSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", fansubStoryPreviewDSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, fansubStoryPreviewDatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", fansubStoryPreviewDSNEnv, dbName, fansubStoryPreviewDatabasePattern)

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", fansubStoryPreviewDSNEnv)
	t.Cleanup(pool.Close)
	return pool
}
```
Skip-if-unset + fail-closed database-name regex + `t.Cleanup` — copy this shape exactly (via the new `testsupport.OpenPhase167Postgres`), and pair with a `seedFixture`/`cleanup` pair like `seedFansubStoryPreviewFixture` (lines 52-69: `cleanup()` deletes then re-inserts, `t.Cleanup(cleanup)` registered before insert).

---

### `backend/internal/repository/episode_import_repository_fansub_helpers.go` (modify, repository, CRUD)

**Analog:** itself — this is the file whose auto-create behavior D-03/D-10 requires gating.

**Current auto-upsert path to remove/gate** (full file, 138 lines, verbatim):
```go
// Source: backend/internal/repository/episode_import_repository_fansub_helpers.go:61-74
func resolveImportSelectedFansubGroup(
	ctx context.Context,
	tx pgx.Tx,
	input models.SelectedFansubGroupInput,
) (*resolvedImportFansubGroup, error) {
	if input.ID != nil && *input.ID > 0 {
		group, err := lookupImportFansubGroupByID(ctx, tx, *input.ID)
		if err != nil {
			return nil, err
		}
		return group, nil
	}
	return upsertImportFansubGroup(ctx, tx, derefString(input.Name), input.Slug, models.FansubGroupTypeGroup)
}

// Source: episode_import_repository_fansub_helpers.go:99-110
func upsertImportFansubGroup(
	ctx context.Context, tx pgx.Tx, name string, preferredSlug *string, _ models.FansubGroupType,
) (*resolvedImportFansubGroup, error) {
	...
	if err := tx.QueryRow(ctx, `
		INSERT INTO fansub_groups (slug, name, status)
		VALUES ($1, $2, 'active')
		ON CONFLICT (slug) DO UPDATE
		SET name = COALESCE(NULLIF(BTRIM(fansub_groups.name), ''), EXCLUDED.name), updated_at = NOW()
		RETURNING id, slug, COALESCE(NULLIF(BTRIM(name), ''), $2)
	`, slug, name).Scan(&group.ID, &group.Slug, &group.Name); err != nil {
		return nil, fmt.Errorf("upsert import fansub group %q: %w", name, err)
	}
	return &group, nil
}
```
**Required change (D-03/REQ-167-10):** `resolveImportSelectedFansubGroup`'s free-text branch must stop calling `upsertImportFansubGroup` implicitly. Either (a) require an explicit `input.ID` for all paths reached without an admin's ausdrückliche "neu anlegen" action, returning an error/no-op otherwise, or (b) keep `upsertImportFansubGroup` but gate its call behind a new explicit flag on the input (e.g. `input.ExplicitCreate bool`) set only when the admin used a dedicated "neue Gruppe anlegen" UI action — never from the filename-derived fallback in `release_helpers.go`.

**Error-wrapping convention to preserve:** `fmt.Errorf("<verb+context>: %w", err)` — every function in this file uses this exact idiom (e.g. `lookup selected fansub group %d`, `upsert import fansub group %q`).

---

### `backend/internal/repository/episode_import_repository_release_helpers.go` (modify, repository)

**Analog:** itself — `resolveImportFansubSelection`.

**Current apply-time fallback that re-derives from the filename (the real trigger path for the D-03 bug):**
```go
// Source: backend/internal/repository/episode_import_repository_release_helpers.go:265-298
if mapping.FansubGroups != nil {
    return resolveImportFansubSelectionFromInputs(ctx, tx, mapping.FansubGroups)
}
if mapping.FansubGroupID != nil && *mapping.FansubGroupID > 0 {
    group, err := lookupImportFansubGroupByID(ctx, tx, *mapping.FansubGroupID)
    ...
}
name := strings.TrimSpace(derefString(mapping.FansubGroupName))
if name == "" {
    name = deriveFansubGroupName(media)   // <-- filename re-parsed AT APPLY TIME
}
parsedNames := parseImportFansubGroupNames(name) // splits on "&"/"+"/" und "
// each parsedName -> SelectedFansubGroupInput{Name: &parsedName} (no ID!)
return resolveImportFansubSelectionFromInputs(ctx, tx, selectedGroups)
```
**Required change:** this fallback must stop feeding `Name`-only inputs into `resolveImportFansubSelectionFromInputs` for filenames the admin never explicitly resolved (that's what turns into a silent `upsertImportFansubGroup` create). If preview-time batch matching (new `fansub_group_match.go`) already resolved an ID, the frontend should submit that `fansub_group_id` explicitly; if nothing resolved, `mapping.FansubGroups`/`FansubGroupID` should stay empty and this function should leave the row unassigned rather than deriving+upserting a name.

**Display-only precedent to follow for new UI-only fields** (`167-RESEARCH.md` Open Question 4 / UI-SPEC's data contract): `episodeImportReleaseTitle` at lines 417-424 is preview-only, never persisted — the new `fansub_group_match_origin`/`fansub_group_suggestions`/`fansub_alias_conflict`/`release_version_source` fields must follow the identical "populate once at preview build, never written back" discipline.

---

### `backend/internal/repository/fansub_repository.go` (add `ReassignAlias`, repository, CRUD)

**Analog:** itself — `CreateAlias`/`DeleteAlias` (lines 993-1040), `normalizeAliasKey` (lines 1727-1735).

```go
// Source: backend/internal/repository/fansub_repository.go:993-1028
func (r *FansubRepository) CreateAlias(
	ctx context.Context,
	fansubID int64,
	input models.FansubAliasCreateInput,
) (*models.FansubAlias, error) {
	query := `
		INSERT INTO fansub_group_aliases (fansub_group_id, alias, normalized_alias)
		VALUES ($1, $2, $3)
		RETURNING id, fansub_group_id, alias, created_at, updated_at
	`
	var item models.FansubAlias
	if err := r.db.QueryRow(ctx, query, fansubID, input.Alias, input.NormalizedAlias).Scan(
		&item.ID, &item.FansubGroupID, &item.Alias, &item.CreatedAt, &item.UpdatedAt,
	); err != nil {
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("create fansub alias for group %d: %w", fansubID, err)
	}
	return &item, nil
}

func (r *FansubRepository) DeleteAlias(ctx context.Context, fansubID, aliasID int64) error {
	commandTag, err := r.db.Exec(ctx,
		`DELETE FROM fansub_group_aliases WHERE id = $1 AND fansub_group_id = $2`,
		aliasID, fansubID,
	)
	if err != nil {
		return fmt.Errorf("delete fansub alias %d: %w", aliasID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
```
**New `ReassignAlias` (RESEARCH.md recommendation, Claude's Discretion):** follow the exact same `isForeignKeyViolation`/`isUniqueViolation` → `ErrNotFound`/`ErrConflict` mapping, as a single atomic:
```sql
UPDATE fansub_group_aliases
SET fansub_group_id = $1, updated_at = NOW()
WHERE id = $2 AND fansub_group_id = $3
RETURNING id, fansub_group_id, alias, created_at, updated_at
```
(one query, one audit event `fansub_group_alias.reassigned`, no delete+create moment where the alias doesn't exist — per RESEARCH.md Open Question 1's recommendation).

**`normalizeAliasKey` (existing, reuse — do NOT write a third normalization function):**
```go
// Source: backend/internal/repository/fansub_repository.go:1727-1735
func normalizeAliasKey(raw string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(raw) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	...
}
```
Note the Go/SQL asymmetry flagged in RESEARCH.md Pitfall 5: this does NOT call `f_unaccent`. For the new batch-matching query, always compare through the SQL-side `f_unaccent(...)` expression for `fansub_groups.name`/`.slug`, and reserve this Go function only for computing `normalized_alias` at write time (its existing, correct use).

---

### `backend/internal/handlers/fansub_group_aliases.go` (modify, handler, request-response)

**Analog:** itself — `CreateFansubAlias`/`DeleteFansubAlias` (full file, 189 lines).

**Full CRUD + audit + permission pattern to extend (not reinvent) for the new reassign endpoint and the import-time "learn alias" call:**
```go
// Source: backend/internal/handlers/fansub_group_aliases.go:48-114 (CreateFansubAlias, permission+audit shape)
func (h *FansubHandler) CreateFansubAlias(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}
	identity, ok := h.requireFansubAliasWriteAccess(c, fansubID, "fansub_group_alias.create.denied", "fansub_group", &fansubID)
	if !ok {
		return
	}

	var req fansubAliasCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	input, validationMessage := validateFansubAliasCreateRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.CreateAlias(c.Request.Context(), fansubID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansubgruppe nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "alias bereits vorhanden"}})
		return
	}
	if err != nil {
		log.Printf("fansub alias create: repo error (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_alias.created",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "fansub_group_alias",
		TargetID:       &item.ID,
		Action:         string(permissions.ActionFansubGroupEdit),
		Outcome:        "allowed",
		Payload:        map[string]any{"alias": item.Alias},
	})

	c.JSON(http.StatusCreated, gin.H{"data": item})
}
```

**Permission gate to reuse for every new mutation (reassign, learn-from-import):**
```go
// Source: backend/internal/handlers/fansub_group_aliases.go:165-189
func (h *FansubHandler) requireFansubAliasWriteAccess(
	c *gin.Context, fansubID int64, deniedEvent string, targetType string, targetID *int64,
) (middleware.AuthIdentity, bool) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return middleware.AuthIdentity{}, false
	}
	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupEdit, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Alias-Berechtigung konnte nicht geprüft werden.")
		return middleware.AuthIdentity{}, false
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, deniedEvent, &fansubID, targetType, targetID, permissions.ActionFansubGroupEdit, result)
		writePermissionDenied(c, result)
		return middleware.AuthIdentity{}, false
	}
	return identity, true
}
```
**Security note (ASVS V4, RESEARCH.md Security Domain):** a new `ReassignAlias` handler must check `CanForFansubGroup` against **both** the source and destination `fansub_group_id`, not just one, before moving an alias.

**Event names to add, matching the existing dot-namespaced convention:** `fansub_group_alias.reassigned`, `fansub_group_alias.learned` (import-time auto-learn, D-01) — same `Payload: map[string]any{"alias": ...}` shape, add `"source": "episode_import"` for the learned variant.

---

### `backend/internal/handlers/phase167_fansub_learn_test.go` (new, test, httptest+fake)

**Analog:** `backend/internal/handlers/fansub_project_resolver_handler_test.go` — the **explicit compliant precedent** in this exact package (written specifically because `fansub_group_history_handler_test.go` uses the forbidden source-inspection pattern — do NOT copy that file).

**Narrow-interface + fake + httptest shape to copy exactly:**
```go
// Source: backend/internal/handlers/fansub_project_resolver_handler_test.go:25-59
type fakeProjectResolverRepo struct {
	resolveErr      error
	resolved        *repository.ResolvedFansubProject
	navigationItems []repository.ProjectNavigationItem
	navigationErr   error
	resolveCalls    int
	navigationCalls int
}

func (f *fakeProjectResolverRepo) ResolveProject(_ context.Context, _ string, _ string) (*repository.ResolvedFansubProject, error) {
	f.resolveCalls++
	if f.resolveErr != nil {
		return nil, f.resolveErr
	}
	return f.resolved, nil
}

func resolveFansubProjectTestContext(groupSlug, animeSlug string) (*httptest.ResponseRecorder, *gin.Context) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/fansub-slugs/"+groupSlug+"/projects/"+animeSlug+"/resolve", nil)
	c.Params = gin.Params{{Key: "slug", Value: groupSlug}, {Key: "animeSlug", Value: animeSlug}}
	return recorder, c
}

func TestResolveFansubProject_SuccessReturnsIdentityAndProjects(t *testing.T) {
	gin.SetMode(gin.TestMode)
	fake := &fakeProjectResolverRepo{resolved: &repository.ResolvedFansubProject{GroupID: 42, AnimeID: 7, AnimeSlug: "known-anime"}}
	handler := &FansubHandler{projectResolverRepo: fake}
	recorder, c := resolveFansubProjectTestContext("known-group", "known-anime")

	handler.ResolveFansubProject(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Equal(t, 1, fake.resolveCalls)
	body := recorder.Body.String()
	require.Contains(t, body, `"group_id":42`)
}
```
**Because `FansubHandler.fansubRepo` is a concrete `*repository.FansubRepository`, not an interface** (RESEARCH.md Section 4.4), new endpoint(s) this phase adds (batch match, learn-alias, reassign) need a **new narrow interface field** on `FansubHandler` (e.g. `fansubMatchRepo fansubGroupMatchRepo`), exactly like `projectResolverRepo fansubProjectResolverRepo` was added for the resolve-project feature — do not retrofit the existing concrete-repo alias handlers.

---

### `backend/internal/models/episode_import.go` (modify, model, transform)

**Analog:** itself.

**Struct to extend additively** (lines 60-85):
```go
// Source: backend/internal/models/episode_import.go:60-85
type SelectedFansubGroupInput struct {
	ID   *int64  `json:"id,omitempty"`
	Name *string `json:"name,omitempty"`
	Slug *string `json:"slug,omitempty"`
}

type EpisodeImportMappingRow struct {
	MediaItemID string `json:"media_item_id"`
	MediaSourceID           string                     `json:"media_source_id,omitempty"`
	FileName                string                     `json:"file_name,omitempty"`
	DisplayPath             string                     `json:"display_path,omitempty"`
	TargetEpisodeNumbers    []int32                    `json:"target_episode_numbers"`
	SuggestedEpisodeNumbers []int32                    `json:"suggested_episode_numbers"`
	Status                  EpisodeImportMappingStatus `json:"status"`
	FansubGroups            []SelectedFansubGroupInput `json:"fansub_groups,omitempty"`
	FansubGroupID           *int64                     `json:"fansub_group_id,omitempty"`
	FansubGroupName         *string                    `json:"fansub_group_name,omitempty"`
	ReleaseVersion          *string                    `json:"release_version,omitempty"`
}
```
**New additive fields to add** (per UI-SPEC's "Datenvertrag für Planner/Executor"), display-only/never-persisted per the `episodeImportReleaseTitle` precedent:
```go
FansubGroupMatchOrigin *FansubGroupMatchOrigin `json:"fansub_group_match_origin,omitempty"`
FansubGroupSuggestions []FansubGroupSuggestion `json:"fansub_group_suggestions,omitempty"`
FansubAliasConflict    *FansubAliasConflict    `json:"fansub_alias_conflict,omitempty"`
ReleaseVersionSource   *string                 `json:"release_version_source,omitempty"` // "detected" | "manual"
```
Keep the four-way sync convention this repo already follows (QUAL-01-style): Go DTO + `shared/contracts/admin-content.yaml` (grep `EpisodeImportMappingRow`, ~lines 1772-1783) + `frontend/src/types/episodeImport.ts` + any `frontend/src/lib/api.ts` mapping — all four must move together.

---

### `frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx` (new component)

**Analogs:**
1. `ClaimManagementPanel.tsx` for the `useConfirmDialog` reassign/conflict confirmation pattern.
2. `GroupRolesTab.tsx` for `Badge` usage.
3. Existing `page.tsx` `styles.existingBadge`/`styles.fillerBadge` idiom for the **non-interactive** origin-hint `<span>` (no primitive violation — ESLint's `no-restricted-syntax` targets interactive `<select>/<input>/<textarea>`/native `<button>`, not static text).

**Imports pattern (compliant primitives barrel):**
```tsx
// Source: frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx:6-19
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
```

**Confirm-dialog pattern for the "Trotzdem umhängen" danger action (D-02, Design-Entscheidung 6):**
```tsx
// Source: frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx:20, 103, 184
import { useConfirmDialog } from '@/components/ui'
...
const { confirm, confirmDialog } = useConfirmDialog()
...
async function handleCancelInvitation(rowId: number, memberId: number, invitationId: number) {
  if (!(await confirm({ title: 'Aktive Einladung zurückziehen? ...', confirmLabel: 'Zurückziehen', tone: 'danger' }))) return
  ...
}
```
Adapt title/confirmLabel to the UI-SPEC's exact copy: title "Alias umhängen?", body per Copywriting Contract, `confirmLabel: 'Trotzdem umhängen'`, `tone: 'danger'`. Remember to render `{confirmDialog}` once near the component root (same as `ClaimManagementPanel` does — verify exact render call site if copying further).

**Suggestion chip pattern (subtle button, D-03):** use `Button variant="subtle" size="sm"` (no existing exact analog for `subtle` variant chips in this domain — construct directly from the `@/components/ui` `Button` primitive per the UI-SPEC's explicit copy: `"Meinten Sie: {Gruppenname}?"`).

**Conflict badge (D-02):**
```tsx
// Pattern source: GroupRolesTab.tsx:165-167 (Badge variant usage)
<Badge variant={row.status === 'active' ? 'success' : 'danger'}>{statusLabel(row.status)}</Badge>
```
Adapt to `<Badge variant="warning">Kürzel „{kürzel}" gehört bereits zu {AndereGruppe}.</Badge>` per UI-SPEC.

---

### `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` (modify, minimal)

**Analog:** itself — this file's existing native-control group-chip block (lines 166-282) is **legacy, not a pattern to copy for new code** (CLAUDE.md's closest-analog clause explicitly forbids continuing it). The edit here is additive-only:

```tsx
// Source: frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx:270-280
<label className={styles.releaseMeta}>
  <span className={styles.releaseMetaLabel}>Version</span>
  <input
    className={styles.releaseMetaInput}
    value={row.release_version ?? ''}
    disabled={isSkipped}
    placeholder="z.B. v2"
    aria-label={`Release-Version für ${label}`}
    onChange={(event) => onSetRelease(sourceKey, { releaseVersion: event.target.value })}
  />
</label>
```
Per UI-SPEC: render `<FansubGroupOriginHint .../>` directly below the existing `styles.groupSelector` block (after line ~243, before `releaseMetaActions`), and add a new `<span>` "Aus Dateiname übernommen" below the existing version `<input>` (leave the `<input>` itself untouched — it is legacy per the UI-SPEC's explicit Design Boundary). Both insertions are pure JSX additions with props passed through, no new native controls added directly in this file.

---

### `frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx` (new component, CRUD)

**Analog 1 (Card/Table/state shell):** `GroupRolesTab.tsx`
```tsx
// Source: frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx:122-178 (loading/error/empty/table pattern)
if (isLoading) {
  return <LoadingState title="Rollen werden geladen" description="..." />
}
if (loadError) {
  return <ErrorState title="Rollen konnten nicht geladen werden" description={loadError} />
}
if (holderRows.length === 0) {
  return <EmptyState title="Keine Rolleninhaber in dieser Gruppe" description="..." />
}
return (
  <Card variant="section">
    <Table variant="default" caption="Rollen dieser Gruppe">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Rolle</TableHeaderCell>
          ...
        </TableRow>
      </TableHead>
      <TableBody>
        {holderRows.map((row) => (
          <TableRow key={row.key}>
            <TableCell>{...}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Card>
)
```
For `FansubAliasSection`, per UI-SPEC: `EmptyState` replaces only the table (the "Neuer Alias" form stays visible below even when empty) — this differs slightly from `GroupRolesTab`'s full-replace; structure the early-return so the add-form renders unconditionally after the loading/error checks, and only the table portion branches on empty/populated.

**Analog 2 (destructive confirm for delete/reassign):** `ClaimManagementPanel.tsx`'s `useConfirmDialog` (see excerpt above) — use `tone: 'danger'` for both "Alias löschen?" and "Alias umhängen?" per UI-SPEC Design-Entscheidung 11.

**Analog 3 (add-row form: FormField + Input + Select):** `FansubCommunityLinksList.tsx`
```tsx
// Source: frontend/src/app/admin/fansubs/[id]/edit/FansubCommunityLinksList.tsx:1-11, 50-101
import { Button, FormField, Input, Select } from "@/components/ui";
...
<FormField label="Typ" htmlFor={`community-link-type-${link.key}`}>
  <Select id={...} value={link.link_type} disabled={...} onChange={(event) => { ... }}>
    {LINK_TYPE_OPTIONS.map((option) => (
      <option key={option} value={option}>{option}</option>
    ))}
  </Select>
</FormField>
<FormField label="Name" htmlFor={...}>
  <Input id={...} value={link.name} disabled={...} onChange={...} placeholder="Optionaler Anzeigename" />
</FormField>
<Button type="button" variant="danger" size="sm" iconOnly aria-label="Link entfernen" onClick={...} leftIcon={<Trash2 size={14} />} />
```
Map directly: "Neuer Alias" `FormField` + `Input` (placeholder "z. B. BDnP", maxLength 120) + `Button variant="primary" size="sm" leftIcon={<Plus size={14}/>}` "Alias hinzufügen"; per-row reassign `Select` (`aria-label="Neue Gruppe für Alias {alias}"`) + `Button variant="secondary" size="sm"` "Umhängen" + `Button variant="danger" size="sm" iconOnly leftIcon={<Trash2 size={14}/>}` delete — exactly per UI-SPEC's Copywriting Contract.

**Data loading:** call `getFansubAliases(fansubID)` (existing `frontend/src/lib/api.ts` function, see below) once on mount/section-open; reload after create/delete/reassign (UI-SPEC: "kein optimistisches Update nötig").

---

### `frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx` (modify, minimal)

**Analog:** itself — the existing sibling-render pattern already used for `FansubBasicInfoTab` inside the `activeMainTab === "basic"` branch:
```tsx
// Source: frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx:94-109
{tabUsesLeftWorkspace ? (
  <div className={styles.fansubEditLeftColumn}>
    {activeMainTab === "basic" ? (
      <FansubBasicInfoTab
        styles={styles}
        details={details}
        fansubID={fansubID}
        group={group}
        capabilities={capabilities}
        isPlatformAdmin={isPlatformAdmin}
        hasAuthSession={hasAuthSession}
        onToast={onToast}
        communityLinksList={communityLinksList}
      />
    ) : null}
  </div>
) : null}
```
Per UI-SPEC Design-Entscheidung 8: add `<FansubAliasSection fansubID={fansubID} .../>` as a **sibling** JSX element directly after `<FansubBasicInfoTab .../>` inside the same `activeMainTab === "basic"` conditional block — do NOT add it inside `FansubBasicInfoTab.tsx` itself (already 440 lines, ~10 lines of headroom to the 450-line limit).

---

### `frontend/src/lib/api.ts` (modify, add `reassignFansubAlias`)

**Analog:** itself — `createFansubAlias`/`deleteFansubAlias` (lines 2090-2141).
```ts
// Source: frontend/src/lib/api.ts:2090-2119
export async function createFansubAlias(
  fansubID: number,
  payload: FansubAliasCreateRequest,
  authToken?: string,
): Promise<FansubAliasResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/aliases`,
    {
      method: "POST",
      headers: withAuthHeader({ "Content-Type": "application/json" }, authToken),
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<FansubAliasResponse>;
}

export async function deleteFansubAlias(
  fansubID: number,
  aliasID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/aliases/${aliasID}`,
    { method: "DELETE", headers: withAuthHeader({}, authToken) },
  );
  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, message);
  }
}
```
New `reassignFansubAlias(fansubID, aliasID, payload: { target_fansub_group_id: number }, authToken?)` should mirror this exactly: `PATCH` (or `PUT`) to `${API_BASE_URL}/api/v1/fansubs/${fansubID}/aliases/${aliasID}/reassign`, same `withAuthHeader`/`ApiError`/`parseApiError` idiom, returning `Promise<FansubAliasResponse>`.

**Existing read function to reuse as-is (no changes needed) for `FansubAliasSection`'s initial load:**
```ts
// Source: frontend/src/lib/api.ts:1934-1954
export async function getFansubAliases(fansubID: number): Promise<FansubAliasListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/fansubs/${fansubID}/aliases`, { cache: "no-store" });
  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<FansubAliasListResponse>;
}
```

---

### `frontend/src/types/fansub.ts` (modify, add reassign types)

**Analog:** itself.
```ts
// Source: frontend/src/types/fansub.ts:124-130, 455-457
export interface FansubAlias {
  id: number;
  fansub_group_id: number;
  alias: string;
  created_at: string;
  updated_at: string;
}

export interface FansubAliasCreateRequest {
  alias: string;
}
```
Add: `FansubAliasReassignRequest { target_fansub_group_id: number }` and reuse `FansubAliasResponse { data: FansubAlias }` (already exists, line 301-302) as the reassign endpoint's response shape.

---

### `frontend/src/types/episodeImport.ts` (modify, add origin/suggestion/conflict fields)

**Analog:** itself.
```ts
// Source: frontend/src/types/episodeImport.ts:55-81
export interface EpisodeImportSelectedFansubGroup {
  id?: number | null
  name?: string | null
  slug?: string | null
}

export interface EpisodeImportMappingRow {
  media_item_id: string
  media_source_id?: string | null
  file_name?: string
  display_path?: string
  target_episode_numbers: number[]
  suggested_episode_numbers: number[]
  status: EpisodeImportMappingStatus
  fansub_groups?: EpisodeImportSelectedFansubGroup[]
  fansub_group_id?: number | null
  fansub_group_name?: string | null
  release_version?: string | null
}
```
Add additively, per UI-SPEC's Datenvertrag table:
```ts
fansub_group_match_origin?: { raw: string; matched_via: 'alias' | 'name' | 'slug'; group_name: string } | null
fansub_group_suggestions?: Array<{ id: number; name: string; slug: string }>
fansub_alias_conflict?: { raw: string; existing_group_id: number; existing_group_name: string } | null
release_version_source?: 'detected' | 'manual'
```

---

### `frontend/src/app/admin/changes/ChangeEntryTranslator.ts` (modify, add fansub alias cases)

**Analog:** itself — `translateChangeEntry`'s existing `switch` cases.
```ts
// Source: frontend/src/app/admin/changes/ChangeEntryTranslator.ts:51-63
switch (entry.event_type) {
  case 'role_capability.granted':
  case 'role_capability.revoked': {
    const roleCode = payloadString(entry.payload, 'role_code') ?? 'unbekannte Rolle'
    const actionCode = payloadString(entry.payload, 'action_code') ?? 'unbekannte Berechtigung'
    const roleLabel = roleCode === 'unbekannte Rolle' ? roleCode : roleLabelFor(roleCode, matrix)
    const actionLabel = actionCode === 'unbekannte Berechtigung' ? actionCode : actionLabelFor(actionCode, matrix)
    const verb = entry.event_type === 'role_capability.granted' ? 'gewährt' : 'entzogen'
    return { sentence: `Admin hat der Rolle ${roleLabel} die Berechtigung ${actionLabel} ${verb}.` }
  }
  ...
}
```
**Fallback for unmapped types (already present, DO NOT rely on this alone — D-09 requires real sentences):**
```ts
// Source: frontend/src/app/admin/changes/ChangeEntryTranslator.ts:88-99
default: {
  if (entry.event_type.endsWith('.denied')) {
    return { sentence: `Zugriff verweigert: ${entry.action || entry.event_type} für ${targetLabel(entry)}.` }
  }
  return { sentence: `${entry.action || entry.event_type} (${entry.event_type}) — Ergebnis: ${entry.outcome || 'unbekannt'}.` }
}
```
Add explicit `case 'fansub_group_alias.created':`, `'.deleted'`, `'.reassigned'`, `'.learned'` cases (reading `payload.alias` via the existing `payloadString(entry.payload, 'alias')` helper, lines 38-41) with real German sentences, e.g. `"Admin hat den Alias \"${alias}\" angelegt."` — without these cases, D-09's audit-visibility requirement is not actually satisfied even though the raw event is written (falls through to the generic fallback sentence).

---

## Shared Patterns

### Audit logging for every alias mutation (D-09)
**Source:** `backend/internal/handlers/fansub_group_aliases.go` (`CreateFansubAlias`/`DeleteFansubAlias`, lines 99-109, 150-160)
**Apply to:** every new/modified alias-mutating handler (`ReassignAlias`, import-time "learn" call)
```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "fansub_group_alias.created", // .deleted / .reassigned / .learned
    ScopeType:      permissions.ScopeTypeGroup,
    ScopeID:        &fansubID,
    TargetType:     "fansub_group_alias",
    TargetID:       &item.ID,
    Action:         string(permissions.ActionFansubGroupEdit),
    Outcome:        "allowed",
    Payload:        map[string]any{"alias": item.Alias},
})
```

### Permission gate for group-scoped writes
**Source:** `backend/internal/handlers/fansub_group_aliases.go:165-189` (`requireFansubAliasWriteAccess`)
**Apply to:** all new alias-mutating handlers; `ReassignAlias` specifically must check `CanForFansubGroup` against BOTH source and destination `fansub_group_id`
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupEdit, fansubID)
```

### Normalized-string matching expression (must be byte-identical everywhere)
**Source:** `database/migrations/0140_search_foundation.up.sql` / `backend/internal/repository/search_fansub.go`
**Apply to:** the new batch-matching query, any future exact-match comparison against `fansub_groups.name`/`.slug`
```sql
regexp_replace(lower(f_unaccent(<col>)), '[^a-z0-9]+', '', 'g')
```
Never re-derive this expression independently — Postgres only uses the functional index when the expression is byte-identical (Pitfall 3).

### Query-count regression guard
**Source:** `backend/internal/repository/query_counter.go`
**Apply to:** the new batch-matching repository test (D-08/D-20 constant-query-budget proof)
```go
counter := &queryCounter{}
config.ConnConfig.Tracer = counter
counter.reset()
_, _ = repo.<NewBatchMatchCall>(ctx, ...)
got := counter.count()
```

### Isolated real-Postgres test fixture template
**Source:** `backend/internal/testsupport/phase165_postgres.go`
**Apply to:** new `backend/internal/testsupport/phase167_postgres.go` (env `TEAM4S_PHASE167_TEST_DSN`, db pattern `team4s_phase167_test_[a-z0-9]+`, schema pattern `phase167_[a-z0-9_]+`)

### Handler behavior test style (CLAUDE.md Teststil, mandatory)
**Source:** `backend/internal/handlers/fansub_project_resolver_handler_test.go`
**Apply to:** every new handler test this phase adds
**Never copy:** `backend/internal/handlers/fansub_group_history_handler_test.go` (reads its own source via `os.ReadFile` + `strings.Contains` — explicitly documented Altlast in CLAUDE.md, not a template)

### Global UI primitives (D-11, mandatory for every new interactive element)
**Source:** `@/components/ui` barrel, compliant usages in `GroupRolesTab.tsx`, `ClaimManagementPanel.tsx`, `FansubCommunityLinksList.tsx`
**Apply to:** `FansubGroupOriginHint.tsx`, `FansubAliasSection.tsx`, and any new interactive element added to `EpisodeImportMappingRow.tsx`
**Never copy:** the pre-existing native `<input>`/`<button>` group-chip/search UI already in `EpisodeImportMappingRow.tsx` (lines 181-268) — explicitly flagged Altlast in both `167-RESEARCH.md` and `167-UI-SPEC.md`; the "closest-analog" rule does not override the global-primitives mandate.

---

## No Analog Found

None — every file in scope for Phase 167 has at least a role-match analog in the existing codebase (this phase is explicitly a "wire up mostly-existing infrastructure" phase per RESEARCH.md's "Key insight").

---

## Metadata

**Analog search scope:** `backend/internal/importutil/`, `backend/internal/repository/` (fansub/search/episode-import/testsupport-adjacent files), `backend/internal/handlers/` (fansub/episode-import/project-resolver), `backend/internal/testsupport/`, `backend/internal/models/episode_import.go`, `database/migrations/0009*.sql`/`0014*.sql`, `frontend/src/app/admin/anime/[id]/episodes/import/`, `frontend/src/app/admin/fansubs/[id]/edit/`, `frontend/src/lib/api.ts`, `frontend/src/types/fansub.ts`, `frontend/src/types/episodeImport.ts`, `frontend/src/app/admin/changes/ChangeEntryTranslator.ts`.
**Files scanned:** 22 target files + 15 analog source files read in full or targeted ranges.
**Pattern extraction date:** 2026-09-23
