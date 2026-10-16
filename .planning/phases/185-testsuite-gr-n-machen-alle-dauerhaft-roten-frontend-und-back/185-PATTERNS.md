# Phase 185: Testsuite grün machen — Pattern Map

**Mapped:** 2026-10-16
**Files analyzed:** 20 (1 frontend test, 15 backend test/fixture files, 2 backend non-test files,
1 new script, 1 doc)
**Analogs found:** 19 / 20 (near-exact, mostly in-file or in-package)

This phase is almost entirely "fix an existing file to match an already-established sibling
pattern" — not "create a new architectural file". For nearly every finding the closest analog is
either (a) the **same file**, where a sibling test in the same fixture family already does the
fix correctly, or (b) a **sibling fixture file** in the same Phase-NNN family that already carries
the missing column/table/stub entry. Only `scripts/test-backend.sh` and the `docs/ENTWICKLUNG.md`
addition are genuinely new artifacts without a same-shape precedent.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/types/__tests__/anime-detail-contract.test.ts` | test (contract) | transform | same file, `detailSchema`'s `required`-exclusion style (lines 31-39) | exact (in-file) |
| `backend/internal/repository/member_claims_repository_test.go` | test (repository) | CRUD | same file, `TestMemberClaimsRepositoryListPendingClaimAttentionCandidates` (lines 78-107) | exact (in-file) |
| `backend/internal/repository/episode_import_source_integration_test.go` (`openEpisodeImportSourceFixture`) | test fixture | CRUD | same file, existing `ALTER TABLE episodes ADD COLUMN ...` list (line 20) | exact (in-file) |
| `backend/internal/repository/fansub_public_group_display_url_test.go` | test (repository) | CRUD | `backend/internal/repository/fansub_public_media_display_url_test.go` (lines 41-42) | exact (sibling, same Phase-152 fixture family) |
| `backend/internal/repository/group_release_version_count_test.go` + `fansub_project_resolver_query_budget_test.go` (shared Phase-155 seed helpers) | test fixture | CRUD | each other (both consume the same non-isolated `openPhase155Postgres`) | role-match (structural collision between two files) |
| `backend/internal/testsupport/phase135_postgres.go` (`createPhase135Prerequisites`) | test fixture / service | CRUD | same file, existing `hist_group_member_roles` minimal stand-in (line 56) | exact (in-file) |
| `backend/internal/repository/membership_baseline_registry_test.go` (gap-filler stub list) | test fixture | CRUD | same file's existing action list (lines 100-121) | exact (in-file, missing one entry) |
| `backend/internal/repository/phase134_verification_matrix_test.go` + `phase134_verification_matrix_access_test.go` | test (integration/HTTP) | request-response | `backend/internal/testsupport/phase106_postgres.go`'s `os.Getenv(dsnEnv)`-with-skip pattern (lines 50-53) | role-match (env-var pattern, not identical shape) |
| `backend/internal/testsupport/phase139_postgres.go` + `phase167_postgres.go` (`public.unaccent` conflict) | test fixture / migration runner | CRUD | `backend/internal/testsupport/phase106_postgres.go`'s `openPhasePostgres`/`AfterConnect` search_path setter (lines 89-92) | exact (shared root cause/location) |
| `backend/internal/repository/anime_relations_public_postgres_test.go` | test (repository) | CRUD | same file, lines 19-36 (poster-slot insert already used for the OTHER anime in the same test) | exact (in-file) |
| `backend/internal/repository/release_version_media_repository_test.go` (`openReleaseVersionMediaReplaceFixture`) | test fixture | CRUD | `backend/internal/repository/release_version_media_title_test.go` (lines 79-80, 152-153) | exact (sibling, same bug already fixed there) |
| `backend/internal/repository/hist_group_member_roles_fansub_group_test.go` (consumes Phase-135 fixture) | test (repository) | CRUD | `backend/internal/testsupport/phase135_postgres.go` (`createPhase135Prerequisites`) | exact (fixture lives one layer down) |
| `backend/internal/repository/episode_version_dates_integration_test.go` (`openDateNeighborsFixture`/underlying episode fixture) | test fixture | CRUD | `backend/internal/repository/episode_import_source_integration_test.go`'s `ALTER TABLE episodes ADD COLUMN episode_type_source` fix (same family of gap) | role-match |
| `backend/internal/repository/release_version_media_cross_package_test.go` | test (handler/integration) | request-response | `backend/internal/handlers/admin_capability_handler_test.go`'s `captureAuditLogRepo` (lines 88-96) | exact (reusable fake shape) |
| `backend/internal/services/effective_rights_service_test.go` (`openPhase137EffectiveRightsPostgres` + `effectiveRightsCacheLoaderStub`) | test fixture / service | CRUD | `backend/internal/repository/release_review_query_repository_test.go`'s `releaseReviewDelegationCacheLoader` (same missing action, line ~667-671) | exact (same bug, sibling file) |
| `backend/internal/repository/release_review_query_repository_test.go` (permission stub list) | test fixture | CRUD | `backend/internal/repository/membership_baseline_registry_test.go`'s gap-filler list (same missing action) | exact (same bug, sibling file) |
| `backend/internal/testquality/source_substring_guard_test.go` (`LegacyAllowedSubstringTestFiles`) | test (meta/ratchet) | transform | same file (the array itself — only a one-entry removal) | exact (in-file) |
| `backend/internal/migrations/runner.go` (`ResolveMigrationsDir`) | utility/config | CRUD (filesystem resolution) | same file's existing `candidates` slice (lines 57-62) | exact (in-file, reorder) |
| `backend/database/migrations/` (to remove) | migration (legacy) | file-I/O | `database/migrations/` (the real, correct location) | n/a — deletion target, not a pattern source |
| `scripts/test-backend.sh` (new) | config/utility (shell script) | batch | `scripts/phase134-green-gate.sh` + `scripts/provision-phase134-matrix-db.sh` | role-match, **not a perfect match** (see note below) |
| `docs/ENTWICKLUNG.md` (new section) | documentation | n/a | same file's `## Datenbank-Migrationen` / `## Smoke-Checks` sections (lines 72-87, 144-161) | exact (structural heading + code-block style) |

## Pattern Assignments

### `frontend/src/types/__tests__/anime-detail-contract.test.ts` (test, transform)

**Analog:** same file, the `detailSchema`'s slug-optionality test (lines 31-39) shows the
project's convention for asserting a field is intentionally excluded from `required:` while still
checking its `nullable`/`type` properties.

**Current failing assertion** (lines 41-53):
```typescript
it('preserves the complete relation payload including nullable cover and year', () => {
  const relation: AnimeRelation = {
    anime_id: 4, title: 'Related Anime', relation_type: 'sequel',
    cover_image: null, year: null, type: 'tv',
  }
  const response: AnimeRelationsResponse = { data: [relation] }
  expect(response.data[0]).toEqual(relation)
  expectTypeOf<AnimeRelation['cover_image']>().toEqualTypeOf<string | null>()
  expectTypeOf<AnimeRelation['year']>().toEqualTypeOf<number | null>()
  for (const key of Object.keys(relation)) {
    expect(relationSchema).toContain('        ' + key + ':')
    expect(relationSchema.split('      properties:')[0]).toContain('- ' + key)
  }
  expect(relationSchema.match(/nullable: true/g)).toHaveLength(2)
  ...
})
```

**Contract reality** (`shared/contracts/openapi.yaml` lines 11517-11542): `cover_image` is
`nullable: true` but intentionally NOT in `required:` (only `anime_id`, `title`, `relation_type`,
`year`, `type` are required); `year` IS still required-and-nullable (both flags stand). The loop
at line 52 currently asserts every key in `relation` — including `cover_image` — must appear in
the `required:` block, which is now false by design (Commit `fa5165fb3`/`a2848ae31`, 182-03).

**Fix pattern:** exclude `cover_image` from the per-key `required` sub-check (keep the
`relationSchema` presence check for the property itself, and keep the `nullable: true` count at
2, since `cover_image` and `year` are both still nullable). Concretely, special-case the loop
(e.g. `if (key === 'cover_image') { expect(requiredBlock).not.toContain('- cover_image'); continue }`)
rather than removing the general-purpose loop — `year` and the other 4 keys must remain in both
checks.

---

### `backend/internal/repository/member_claims_repository_test.go` (test, CRUD) — D-02

**Analog:** same file, `TestMemberClaimsRepositoryListPendingClaimAttentionCandidates` (lines
78-107), which is the one real-Postgres, real-call test already in this file.

**Current violating test** (lines 56-71):
```go
func TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers(t *testing.T) {
	repoSrc, err := os.ReadFile("member_claims_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	searchStart := strings.Index(content, "func (r *MemberClaimsRepository) SearchHistoricalMembers")
	submitStart := strings.Index(content, "func (r *MemberClaimsRepository) SubmitClaim")
	require.NotEqual(t, -1, searchStart)
	require.NotEqual(t, -1, submitStart)

	searchBody := content[searchStart:submitStart]
	submitBody := content[submitStart:]
	assert.Contains(t, searchBody, "AND m.user_id IS NULL")
	assert.Contains(t, submitBody, "Code:       \"member_already_assigned\"")
	assert.Contains(t, submitBody, "AND mc.claim_status = 'verified'")
}
```
This fails because `SubmitClaim` was moved out of `member_claims_repository.go` into
`member_claims_submit_repository.go` (confirmed: `grep -n "func.*SubmitClaim"` → only
`member_claims_submit_repository.go:16`). The CLAUDE.md Teststil-Regel forbids this
source-substring pattern anyway; D-02 requires a real behavioral rewrite, not just a path fix.

**Real behavior analog to copy** (lines 78-107, same file):
```go
func TestMemberClaimsRepositoryListPendingClaimAttentionCandidates(t *testing.T) {
	pool := openPhase138ClaimsListPool(t)
	ctx := context.Background()
	repo := NewMemberClaimsRepository(pool)

	seedPhase138Claim(t, pool, 611, 711, 811, 911, "Pending Person", "Chocolate Subs", "pending")
	seedPhase138Claim(t, pool, 612, 712, 811, 912, "Verified Person", "Chocolate Subs", "verified")
	...
	candidates, err := repo.ListPendingClaimAttentionCandidates(ctx)
	require.NoError(t, err)
	...
}
```

**Target production shape** (`backend/internal/repository/member_claims_submit_repository.go`
lines 16-45): `SubmitClaim(ctx, SubmitClaimInput{MemberID, AppUserID, Note})` returns
`*ClaimMutationError{Code: "member_already_assigned", HTTPStatus: 409}` when
`linkedUserID.Valid || hasVerifiedClaim` is true (a verified claim already exists for the
member). `SearchHistoricalMembers` (in `member_claims_repository.go`) filters with
`AND m.user_id IS NULL`.

**Fix pattern:** rewrite `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers` to open
`testsupport.OpenPhase137Postgres(t)` (or reuse `openPhase138ClaimsListPool`), seed a member with
an existing verified claim via `seedPhase138Claim(..., "verified")`, then call
`repo.SubmitClaim(ctx, SubmitClaimInput{...})` for a second claimant and assert the real returned
error is a `*ClaimMutationError` with `Code == "member_already_assigned"` — and separately call
`repo.SearchHistoricalMembers(ctx, query)` to assert the already-linked member is excluded from
results. After the rewrite, remove this filename from `LegacyAllowedSubstringTestFiles` (see
below).

---

### `backend/internal/repository/episode_import_source_integration_test.go` (test fixture, CRUD) — D-02

**Analog:** same file, the existing `ALTER TABLE episodes ADD COLUMN ...` list.

**Current fixture** (`openEpisodeImportSourceFixture`, lines 15-20):
```go
func openEpisodeImportSourceFixture(t *testing.T) *pgxpool.Pool {
	...
	ALTER TABLE episodes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
	ALTER TABLE episodes ADD COLUMN status TEXT, ADD COLUMN episode_type_id BIGINT, ADD COLUMN number INT,
	...
```

**Fix pattern:** append `ADD COLUMN episode_type_source TEXT` (matching migration 0167's real
column, Commit `267fd3764`) to this same `ADD COLUMN` list, in the same comma-separated style as
the other columns already there.

---

### `backend/internal/repository/episode_version_dates_integration_test.go` (test fixture, CRUD) — D-02

Same family/same root cause as the `episode_type_source` fix above (a different missing
`episodes` column, `filler_source`, on the underlying fixture `openDateNeighborsFixture` /
`openEpisodeVersionPublicFixture` builds on, lines 180-204). Apply the identical
`ALTER TABLE episodes ADD COLUMN filler_source TEXT` pattern wherever that base fixture's
`ALTER TABLE episodes ADD COLUMN ...` list lives (same file family as
`episode_import_source_integration_test.go`'s fix above — use that as the concrete style
reference).

---

### `backend/internal/repository/fansub_public_group_display_url_test.go` (test, CRUD) — D-05

**Analog:** `backend/internal/repository/fansub_public_media_display_url_test.go` (lines 38-42),
same Phase-152 "full schema" fixture family (`openPhase152Postgres`), which already seeds the
lookup rows this file's tests are missing:
```go
mustExecPhase152(t, pool, fmt.Sprintf(`
    INSERT INTO fansub_groups (id, slug, name, status)
        VALUES (%d, '%s', 'Phase152 Display-URL Group', 'active');
    INSERT INTO visibilities (id, name) VALUES (1, 'public') ON CONFLICT (id) DO NOTHING;
    INSERT INTO review_statuses (id, code, label_de) VALUES (2, 'approved', 'Phase152 Approved') ON CONFLICT (id) DO NOTHING;
    ...
```

**Failing code** (`fansub_public_group_display_url_test.go` lines 33-37, 89-91) hard-codes
`visibility_id = 1, review_status_id = 2` on `media_assets` INSERTs but never seeds those two
lookup rows itself — on a throwaway schema-only dump this FK violates.

**Fix pattern:** add the identical two `INSERT ... ON CONFLICT (id) DO NOTHING` lines (visibility
id 1 / review_status id 2) immediately before each of this file's two `media_assets` INSERT
blocks, exactly mirroring the sibling file above.

---

### `backend/internal/repository/group_release_version_count_test.go` + `fansub_project_resolver_query_budget_test.go` (test fixture, CRUD) — D-02

**Analog:** the two files are each other's analog — both call `mustExecPhase155`/insert directly
into `fansub_groups` with a caller-supplied literal `id`/`groupID`, against the SAME
non-schema-isolated `openPhase155Postgres` database (defined once, in
`fansub_project_resolver_query_budget_test.go` lines 25-66):
```go
func seedPhase155ProjectResolverGroup(t *testing.T, pool *pgxpool.Pool, groupID int64, slug string, projectCount int) string {
	...
	mustExecPhase155(t, pool, fmt.Sprintf(`
		INSERT INTO fansub_groups (id, slug, name, status)
			VALUES (%d, '%s', 'Phase155 Resolver Group %d', 'active');
	`, groupID, slug, groupID))
	...
```
```go
func seedPhase155ReleaseCountFixture(t *testing.T, pool *pgxpool.Pool, groupID int64, slug string) (animeID int64) {
	...
	mustExecPhase155(t, pool, fmt.Sprintf(`
		INSERT INTO fansub_groups (id, slug, name, status)
			VALUES (%d, '%s', 'Phase155 Release Count Group %d', 'active');
	...
```

**Fix pattern:** neither function cleans up before inserting or coordinates id ranges across the
two files, so a literal `groupID` collision between the two call sites (different test functions,
same shared physical DB, no schema isolation) produces `duplicate key value violates unique
constraint "fansub_groups_pkey"`. Fix by giving each file a disjoint id range/prefix (e.g.
`group_release_version_count_test.go` continues to use whatever range it already uses, and
`seedPhase155ProjectResolverGroup`'s callers are checked/adjusted so no literal id used by one
file is ever reused by the other) — or add a defensive `DELETE FROM fansub_groups WHERE id = ...`
before insert in both, mirroring the defensive-cleanup style already used in
`fansub_public_group_display_url_test.go` (lines 26-31) and
`fansub_public_media_display_url_test.go` (lines 27-36).

---

### `backend/internal/testsupport/phase135_postgres.go` (test fixture, CRUD) — D-02

**Analog:** same file, the existing minimal FK stand-in for `hist_group_member_roles` (lines
51-62):
```go
func createPhase135Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	// Minimal FK stand-in required before migration 0085's Step 4 ALTER TABLE
	// hist_group_member_roles ADD CONSTRAINT fk_hist_group_member_roles_role_code
	// FOREIGN KEY (role_code) REFERENCES role_definitions(code).
	const sql = `CREATE TABLE hist_group_member_roles (role_code TEXT);`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Phase-135 prerequisites: %v", err)
	}
	for _, migration := range []string{
		"0085_role_definitions_seed.up.sql",
		...
```

**Fix pattern (consumed by `backend/internal/repository/hist_group_member_roles_fansub_group_test.go`,
which calls `testsupport.OpenPhase135Postgres(t)` at line 29):** add a second minimal
`CREATE TABLE role_capabilities (...)` stand-in to the same `const sql` block (or a second
`pool.Exec` call right after it), with only the columns `ListFansubGroupRoleDefinitionsGroupContextRoles`
actually selects — copy the "minimal FK stand-in, comment citing exactly which migration/query
needs it" documentation style from the existing `hist_group_member_roles` stand-in above.

---

### `backend/internal/repository/membership_baseline_registry_test.go` + `release_review_query_repository_test.go` + `backend/internal/services/effective_rights_service_test.go` (test fixtures, CRUD) — D-02, three sibling occurrences of the same bug

**Analog:** all three files independently define a `permissions.CacheLoader` gap-filler stub that
lists every "unused in this file" `permissions.Action` so `LoadCache`'s whole-catalog
completeness gate passes. All three lists are missing `permissions.ActionReleaseVersionMediaReorder`
(confirmed present as a real action in `internal/permissions/capability_registry_test.go` lines
140-173, alongside the `View`/`Upload`/`Update`/`Delete`/`Reorder`/`Highlight` sibling actions —
every list below has `View`/`Upload`/`Update`/`Delete` but stops short of `Reorder`).

`membership_baseline_registry_test.go` (lines 100-121, excerpt):
```go
for _, action := range []permissions.Action{
	permissions.ActionFansubGroupHistoricalMembersManage,
	...
	permissions.ActionFansubGroupMediaReorder,       // <- this is the FANSUB group media reorder, a different action
	permissions.ActionFansubGroupMediaDelete,
	...
	permissions.ActionReleaseVersionSegmentsManage,
	permissions.ActionReleaseVersionMetadataUpdate,
	permissions.ActionReleaseThemeAssetUpload,
	permissions.ActionReviewTextDecide,
	permissions.ActionReviewImageDecide,
	permissions.ActionReviewContributionDecide,
	permissions.ActionUserGroupCapabilityOverrideManage,
} {
```

`effective_rights_service_test.go` (`effectiveRightsCacheLoaderStub.LoadRoleCapabilities`, lines
51-94, excerpt around the release-version-media actions):
```go
permissions.ActionReleaseVersionMediaView,
permissions.ActionReleaseVersionMediaUpload,
permissions.ActionReleaseVersionMediaUpdate,
permissions.ActionReleaseVersionMediaDelete,
permissions.ActionReleaseVersionMediaDeleteOwn,
permissions.ActionReleaseThemeAssetUpload,
```

`release_review_query_repository_test.go` (`releaseReviewDelegationCacheLoader`, lines 667-671):
```go
permissions.ActionReleaseVersionMediaView,
permissions.ActionReleaseVersionMediaUpload,
permissions.ActionReleaseVersionMediaUpdate,
permissions.ActionReleaseVersionMediaDelete,
permissions.ActionReleaseVersionMediaDeleteOwn,
```

**Fix pattern:** add `permissions.ActionReleaseVersionMediaReorder` to all three lists, in the
same position (immediately after `...Update` / before `...Delete`, matching
`capability_registry_test.go`'s canonical ordering).

---

### `backend/internal/services/effective_rights_service_test.go` (`openPhase137EffectiveRightsPostgres`) (test fixture, CRUD) — D-02, second layer

**Analog:** same function's own doc comment, one paragraph above the bug (lines 121-126), which
already documents the exact fix that needs to be applied again:
```go
// openPhase137EffectiveRightsPostgres builds the real Phase-137 schema (via
// testsupport.OpenPhase137Postgres, which as of Plan 138-01 already provides
// the real fansub_group_member_roles table FK'd to role_definitions(code) --
// the ad-hoc local table this function used to create here was removed to
// avoid a "relation already exists" collision with that shared table) and
// ...
func openPhase137EffectiveRightsPostgres(t *testing.T) *effectiveRightsPostgresFixture {
	t.Helper()
	ensureEffectiveRightsPermissionsCacheLoaded(t)
	pool := testsupport.OpenPhase137Postgres(t)
	ctx := context.Background()
	if _, err := pool.Exec(ctx, `
		-- Minimal stand-ins so permissions.ResolveGroupRights' unconditional Review
		-- Delegation SpecializedGrantProvider lookup (ResolveActorReviewGrantContext)
		-- has real, empty tables to query against instead of erroring; no row is ever
		-- seeded here, so it always contributes zero specialized grants.
		CREATE TABLE member_claims (
			id BIGSERIAL PRIMARY KEY,
			member_id BIGINT NOT NULL,
			app_user_id BIGINT NOT NULL,
			claim_status TEXT NOT NULL,
			verified_at TIMESTAMPTZ
		);
		CREATE TABLE fansub_group_member_review_capabilities (
		...
```

**Fix pattern:** remove the local `CREATE TABLE member_claims (...)` block (4 lines) from this SQL
string — `testsupport.OpenPhase137Postgres` (Plan 138-05) already creates this table as part of
the shared fixture, exactly the same class of collision the comment above already describes and
fixed once for `fansub_group_member_roles`. Keep the `fansub_group_member_review_capabilities`
stand-in (still genuinely local-only).

---

### `backend/internal/testsupport/phase139_postgres.go` + `phase167_postgres.go` (`public.unaccent` conflict) (test fixture / migration runner, CRUD) — D-02

**Analog:** `backend/internal/testsupport/phase106_postgres.go`'s `openPhasePostgres` (lines
41-127), the shared schema-isolation helper both `phase139_postgres.go` and `phase167_postgres.go`
build on:
```go
scopedConfig.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
	_, err := conn.Exec(ctx, "SET search_path TO "+pgx.Identifier{schema}.Sanitize())
	return err
}
...
var schemas []string
if err := scopedPool.QueryRow(context.Background(), `SELECT current_schemas(false)`).Scan(&schemas); err != nil {
	t.Fatalf("read effective schemas: %v", err)
}
if len(schemas) != 1 || schemas[0] != schema || containsString(schemas, "public") {
	t.Fatalf("unsafe search_path schemas: %v", schemas)
}
```
`search_path` is deliberately set to ONLY the isolated schema (the `containsString(schemas,
"public")` check above actively FAILS the test if `public` is present) — so when Phase-139's real
migration chain runs `CREATE EXTENSION IF NOT EXISTS unaccent` (migration 0140) inside this
isolated schema, the dictionary objects land in the isolated schema, not `public`. Migration 0152
(`f_unaccent_search_path_fix`) then hard-codes a lookup against `public.unaccent`, which doesn't
exist there → `ERROR: text search dictionary "public.unaccent" does not exist`.

**Fix pattern (per D-02, must NOT touch migration 0152 itself):** inside
`createPhase139Prerequisites` (`phase139_postgres.go` lines 48-60) and
`createPhase167Prerequisites` (`phase167_postgres.go` lines 57-61), before running
`runner.Up(...)` / the hand-rolled fixture SQL, execute
`CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public` explicitly against the pool (this works
even with a restrictive `search_path`, since `SCHEMA public` is fully qualified) — this must
happen exactly once per guarded database, so guard it the same way `openPhasePostgres`'s
`CREATE SCHEMA` call is guarded (idempotent per-test, safe to call every time since `IF NOT
EXISTS` is on the extension, not the schema). Do not relax the `containsString(schemas, "public")`
safety check in `openPhasePostgres` itself — that guard is intentional and protects every OTHER
Phase-NNN fixture from accidentally touching `public`.

---

### `backend/internal/repository/anime_relations_public_postgres_test.go` (test, CRUD) — D-02

**Analog:** same file, lines 19-36, which ALREADY uses the correct cover-resolver pattern for
`relationsTestMainAnimeID` — the fix is to apply the identical pattern to
`relationsTestOVAAnimeID` instead of the old direct-column write:
```go
_, err := pool.Exec(ctx, `
    INSERT INTO media_types (name) VALUES ('poster') ON CONFLICT (name) DO NOTHING;
`)
require.NoError(t, err)
var mediaID int64
require.NoError(t, pool.QueryRow(ctx, `
    INSERT INTO media_assets (media_type_id, file_path, mime_type)
    SELECT id, $1, 'image/jpeg' FROM media_types WHERE name = 'poster'
    RETURNING id
`, posterPath).Scan(&mediaID))
...
_, err = pool.Exec(ctx, `
    INSERT INTO anime_media (anime_id, media_id, sort_order) VALUES ($1, $2, 0);
    `, relationsTestMainAnimeID, mediaID)
```

**Failing line** (37): `UPDATE anime SET cover_image = '/media/anime/ova/cover.jpg' WHERE id = $1`
— the `anime.cover_image` column no longer exists (dropped by migration 0184, Phase 182-03,
Commit `44d84ae04`).

**Fix pattern:** replace line 37 with a second `media_types`/`media_assets`/`anime_media` insert
triple for `relationsTestOVAAnimeID`, using a distinct `file_path` (e.g.
`/media/anime/ova/cover.jpg`) and its own `t.Cleanup`, following the exact same three-step shape
already used for the main anime 15 lines above in the same test function. Test assertions at
lines 55-56 (`byID[relationsTestOVAAnimeID].CoverImage`) stay unchanged — only the seeding
mechanism changes.

---

### `backend/internal/repository/release_version_media_repository_test.go` (`openReleaseVersionMediaReplaceFixture`) (test fixture, CRUD) — D-02

**Analog:** `backend/internal/repository/release_version_media_title_test.go`, which already
carries the identical fix TWICE (two separate fixtures in that file, lines 79-80 and 152-153):
```go
ALTER TABLE app_users ADD COLUMN display_name TEXT, ADD COLUMN preferred_username TEXT;
ALTER TABLE members ADD COLUMN display_name TEXT, ADD COLUMN nickname TEXT, ADD COLUMN user_id BIGINT;
```

**Failing fixture:** `openReleaseVersionMediaReplaceFixture`
(`release_version_media_replace_repository_test.go` lines 30-70+), consumed by
`release_version_media_repository_test.go`'s `TestReleaseVersionMedia_ListIncludesOwnReviewLifecycle`
et al. (the file being fixed has no `func open...` of its own — all four red tests call
`openReleaseVersionMediaReplaceFixture`, defined in the sibling `..._replace_repository_test.go`).
Its `pool.Exec` block (starting line 40) creates/alters `app_users` (`legacy_user_id` only) but
never adds `display_name`/`preferred_username`, so `SELECT au.display_name ...` in
`ListReleaseVersionMedia` fails with `column au.display_name does not exist`.

**Fix pattern:** add the identical `ALTER TABLE app_users ADD COLUMN display_name TEXT, ADD COLUMN
preferred_username TEXT;` line to `openReleaseVersionMediaReplaceFixture`'s SQL block (right after
its existing `ALTER TABLE app_users ADD COLUMN legacy_user_id ...` statement), copied verbatim
from `release_version_media_title_test.go`.

---

### `backend/internal/repository/release_version_media_cross_package_test.go` (test, request-response) — D-02

**Analog:** `backend/internal/handlers/admin_capability_handler_test.go`'s `captureAuditLogRepo`
fake (lines 88-96):
```go
// captureAuditLogRepo fängt alle geschriebenen Audit-Einträge.
type captureAuditLogRepo struct {
	entries []repository.AuditLogEntry
}

func (r *captureAuditLogRepo) Write(_ context.Context, entry repository.AuditLogEntry) error {
	r.entries = append(r.entries, entry)
	return nil
}
```
This implements the exact interface the handler needs
(`backend/internal/handlers/app_auth.go` lines 42-44):
```go
type auditLogWriter interface {
	Write(ctx context.Context, entry repository.AuditLogEntry) error
}
```

**Failing call sites** (`release_version_media_cross_package_test.go` lines 285, 344):
```go
.WithPermissionDeps(permissions.NewService(noopPermissionResolver{}), nil)
```
`TestRVMHandler_ProzessmedienDefaults` panics with a nil-pointer when
`AdminContentHandler.UploadReleaseVersionMedia`'s success path calls
`h.auditLogRepo.Write(...)` against this `nil`.

**Fix pattern:** define a minimal no-op fake in this file (or reuse `captureAuditLogRepo`'s shape
if importable) and pass `&captureAuditLogRepo{}` (or an equivalent no-op) instead of literal
`nil` at line 344 (the line local to `TestRVMHandler_ProzessmedienDefaults`; line 285's
`TestFansubMediaUploadHandler_BrandingDefaults` is not in the red list and can stay as-is unless
it hits the same code path). CONTEXT.md's optional robustness hardening (nil-guard inside the
handler before `h.auditLogRepo.Write(...)`) is additive, not required by the fixture fix alone.

---

### `backend/internal/repository/phase134_verification_matrix_test.go` + `phase134_verification_matrix_access_test.go` (test, request-response) — D-03b

**No exact analog for "env-var with fallback default" exists in this codebase's Go test suite**
(checked `internal/repository/*.go` and `internal/testsupport/*.go` — none use an
`os.Getenv(...)`-with-non-empty-default pattern for a base URL; every existing DSN pattern instead
`t.Skipf`s outright when the env var is unset). The closest structural analog is
`backend/internal/testsupport/phase106_postgres.go`'s env-read-and-validate shape (lines 50-53):
```go
dsn := os.Getenv(dsnEnv)
if strings.TrimSpace(dsn) == "" {
	t.Skipf("%s is not set; skipping PostgreSQL integration test", dsnEnv)
}
```

**Failing constants** (`phase134_verification_matrix_access_test.go` lines 29-39):
```go
const (
	phase134MatrixBaseURL = "http://192.168.235.196:18093"
	phase134MatrixKCBase  = "http://192.168.235.196:18081"
	...
)
```
used directly at lines 85, 102, 125, 148 and referenced from `phase134_verification_matrix_test.go`.

**Fix pattern (D-03b):** convert the two `const` string literals to `var`s initialized from
`os.Getenv("TEAM4S_PHASE134_MATRIX_BASE_URL")` / `os.Getenv("TEAM4S_PHASE134_MATRIX_KC_BASE")`
with the current hard-coded values kept ONLY as the fallback default (so existing local/manual
runs keep working unmodified), following the "read env, fall back to a documented default"
shape used by `scripts/provision-phase134-matrix-db.sh`'s `MATRIX_HOST_PORT`/`HEALTH_URL`
constants (which are also currently hard-coded host-IP strings — if this script is touched in the
same pass, applying the identical env-override there keeps both in sync). In Docker-network mode
the override should point at the Compose service name (e.g.
`http://team4sv30-backend:8092`) instead of the LAN host IP.

---

### `backend/internal/testquality/source_substring_guard_test.go` (test, meta/ratchet) — D-02

**Analog:** the array itself; this is a pure one-line removal, not a new pattern.

**Current list** (lines 29-65) contains, among 34 entries:
```go
"internal/repository/member_claims_repository_test.go",
```

**Fix pattern:** once `member_claims_repository_test.go` is rewritten to the real-behavior shape
above, delete this one line from `LegacyAllowedSubstringTestFiles`. The ratchet guard
(`TestNoNewSourceSubstringTests`) will then correctly treat this file as fully remediated. Do not
touch any of the other 33 entries (D-06 — explicitly out of scope).

---

### `backend/internal/migrations/runner.go` (`ResolveMigrationsDir`) (utility/config, CRUD) — D-04

**Analog:** the function's own existing `candidates` slice — this is a reorder, not a new
mechanism.

**Current code** (lines 52-76):
```go
func ResolveMigrationsDir(customDir string) (string, error) {
	if customDir != "" {
		return validateMigrationDir(customDir)
	}

	candidates := []string{
		filepath.Join("database", "migrations"),
		filepath.Join("..", "database", "migrations"),
		filepath.Join("..", "..", "database", "migrations"),
		filepath.Join("..", "..", "..", "database", "migrations"),
	}

	for _, candidate := range candidates {
		absPath, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}

		if isDir(absPath) {
			return absPath, nil
		}
	}

	return "", errors.New("could not locate migrations directory; pass -dir explicitly")
}
```
All four candidates are CWD-relative. When `go test` runs with CWD =
`backend/internal/migrations`, candidate 3 (`../../database/migrations`) resolves to
`backend/database/migrations/` (2 stale files from July 30) BEFORE candidate 4
(`../../../database/migrations`, the real 368-file repo-root directory) is ever tried — `isDir`
returns true on the first match and the loop returns immediately.

**Fix pattern (D-04):** delete `backend/database/migrations/` (2 files + README, confirmed via
`grep -rn "backend/database/migrations"` across `.go`/`.yml`/`.sh`/`Dockerfile*` → zero other
consumers) AND, independently, re-order `candidates` so the repo-root depth (today's 4th entry) is
tried before any `backend/`-local depth, so this landmine cannot resurface if a similar stray
directory appears again. Both parts of D-04 are small, same-file/same-directory edits — no new
pattern needed.

---

### `scripts/test-backend.sh` (new) — D-07

**Closest analogs (neither is a perfect match — explicitly noted per the task brief):**
`scripts/phase134-green-gate.sh` and `scripts/provision-phase134-matrix-db.sh`. Both are the only
`scripts/smoke-*`-adjacent Bash scripts in this repo that orchestrate Docker-based backend test
runs with DSN/env handling; neither runs the FULL unscoped backend suite against a raw
`golang:1.25` container with the whole repo mounted (`phase134-green-gate.sh` runs a SCOPED
`go test` via `docker compose exec` into the ALREADY-RUNNING `team4sv30-backend` container;
`provision-phase134-matrix-db.sh` provisions ONE throwaway database + a temporary backend
instance, not 23 throwaway databases run through a bare Go toolchain image). `test-backend.sh`
needs a shape closer to what the Ist-Zustand narrative describes by hand (a bare
`docker run --rm -v $(pwd):/repo golang:1.25[-alpine] ...` invocation against the already-running
`team4sv30-db` container, with `vips-tools`+`ffmpeg` installed on the fly, `-p 1`, and 23
create/drop throwaway databases) — there is no existing script that does exactly this; the two
analogs below supply the surrounding conventions (shebang, strict mode, DSN handling, docker
invocation idioms, structured summary) to build it from.

**Shebang + strict-mode + repo-root convention** (`scripts/phase134-green-gate.sh` lines 33-36):
```bash
set -uo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}" || exit 1
```
(Note: `phase134-green-gate.sh` deliberately uses `-uo pipefail`, NOT `-e`, so every section runs
to completion and failures are collected rather than aborting early — explicitly documented in its
own header comment. `provision-phase134-matrix-db.sh` and `verify-anime-detail-phase.sh` instead
use `set -euo pipefail` because they are linear provisioning scripts where any failed step must
abort immediately. `test-backend.sh` should default to the `-uo pipefail` style for the actual
test-running phase (so a failure in one of the 10 "full schema" DB setups doesn't hide failures in
the other 22), but may use `-euo pipefail` for the preceding DB-provisioning steps if structured
that way.)

**Required-env-var validation pattern** (`scripts/phase134-green-gate.sh` lines 101-114):
```bash
require_env() {
  local missing=0
  local var
  for var in TEAM4S_PHASE128_TEST_DSN TEAM4S_PHASE129_TEST_DSN TEAM4S_PHASE134_MIGRATION_DSN TEAM4S_PHASE134_TEST_DSN; do
    if [ -z "${!var:-}" ]; then
      echo "FATAL: required env var ${var} is not set" >&2
      missing=1
    fi
  done
  if [ "${missing}" -eq 1 ]; then
    echo "FATAL: export all four DSNs before running this script (see header comment)." >&2
    exit 1
  fi
}
```
`test-backend.sh` has a much longer DSN list (every `*_TEST_DSN` fixture family named in the
185-CONTEXT.md cluster table — Phase 106/107/117/128/134/135/137/139/145/150/152/155/165/167/182,
etc.) — this exact loop-over-array-of-var-names shape scales to that list directly.

**Idempotent throwaway-database create/drop pattern**
(`scripts/provision-phase134-matrix-db.sh` lines 18-32):
```bash
echo "[provision-phase134-matrix-db] Step 1/5: idempotently create ${MATRIX_DB} if absent"
docker compose exec -T team4sv30-db sh -eu -c "
  exists=\"\$(psql -U team4s -d postgres -X -tAc \"SELECT 1 FROM pg_database WHERE datname = '${MATRIX_DB}'\")\"
  if [ \"\$exists\" != \"1\" ]; then
    createdb -U team4s -O team4s ${MATRIX_DB}
    echo 'created ${MATRIX_DB}'
  else
    echo '${MATRIX_DB} already exists'
  fi
"
```
`test-backend.sh` needs the DROP-side counterpart of this (not present in
`provision-phase134-matrix-db.sh`, which never tears its DB down) — base it on the same
`docker compose exec -T team4sv30-db psql ...` idiom, using `DROP DATABASE IF EXISTS` for each of
the 23 throwaway databases at the end of the run (matching the Ist-Zustand narrative: "Alle 23
Wegwerf-Datenbanken wurden danach wieder gelöscht").

**Structured collect-all-results summary pattern** (`scripts/phase134-green-gate.sh`, `section()`
helper + the final `SUMMARY`/`GATE: GREEN|RED` block, lines 95-98 and ~290-345): use the same
`section "..."` banner convention and a final PASS/FAIL-per-stage summary ending in a single exit
code, so `test-backend.sh` is "two full runs, 0 red" machine-checkable per D-07's acceptance
criterion, not just human-readable scrollback.

**Image choice (D-03a dependency):** `backend/Dockerfile` (lines 1-20) shows production uses
`golang:1.25-alpine` + `apk add vips-tools ffmpeg fontconfig ...`. The Ist-Zustand narrative's own
three manual runs used `golang:1.25-alpine` with `vips-tools` added by hand. If D-03a's Debian
probe (run the Jellyfin-EOF cluster once under plain `golang:1.25`, Debian-based) confirms
Alpine/musl-specificity, `test-backend.sh` must hard-code `golang:1.25` (Debian) as its test-runner
image instead of `-alpine`, and install `vips`/`libvips-dev`/`ffmpeg` via `apt-get` instead of
`apk` — neither analog script needs this today since both assume the already-built, already-apk-based
production image.

---

### `docs/ENTWICKLUNG.md` (new section) — D-07

**Analog:** this file's own `## Datenbank-Migrationen` (lines 72-87) and `## Smoke-Checks` (lines
144-161) sections — identical heading level, identical "one short paragraph + one fenced code
block of copy-pasteable commands" shape:
```markdown
## Datenbank-Migrationen

Migrationsdateien liegen unter `database/migrations/` (fortlaufend
nummeriert, `*.up.sql` / `*.down.sql`). Der Stand lässt sich jederzeit mit
`./migrate status` prüfen; ...

Außerhalb des Containers (lokaler Go-Toolchain-Zugriff auf die DB):

```bash
cd backend
export DATABASE_URL="postgres://team4s:<passwort>@localhost:<POSTGRES_PORT>/team4s_v2?sslmode=disable"
go run ./cmd/migrate status
...
```
```

**Fix pattern:** add a new `## Backend-Testsuite vollständig ausführen` section (placed after
`## Datenbank-Migrationen`, before `## API-Contracts`, since it is conceptually adjacent — both
concern the DB/migration-aware backend surface), written in German matching the file's existing
voice, documenting: (1) the image choice resulting from D-03a, (2) the full `*_TEST_DSN` list and
where each one's throwaway database comes from, (3) the exact mount (whole repo, not just
`backend/`) that the Ist-Zustand section identifies as the Lauf-1 root cause, (4) the
`scripts/test-backend.sh` invocation itself, one fenced `bash` block, mirroring the
`## Datenbank-Migrationen` section's code-block style exactly.

## Shared Patterns

### Phase-NNN Postgres fixture family (schema-isolated vs. full-schema)
**Source:** `backend/internal/testsupport/phase106_postgres.go` (`openPhasePostgres`, the shared
constructor every `OpenPhaseNNNPostgres` in `internal/testsupport/` delegates to) vs.
`openPhase152Postgres`/`openPhase155Postgres` (file-local, NOT schema-isolated, defined directly
inside `internal/repository/*_test.go` files).
**Apply to:** every fixture-touching fix in this phase. Before editing a fixture, first determine
which family it belongs to — schema-isolated fixtures (`testsupport.OpenPhaseNNNPostgres`) are
test-local and never collide across files; full-schema fixtures
(`openPhase152Postgres`/`openPhase155Postgres`) share one physical database across ALL test files
in the package and require explicit defensive `DELETE`/unique-id-namespacing to avoid
cross-test/cross-file collisions (the exact root cause of the Phase-155 `fansub_groups_pkey`
cluster above).

### Dedicated-test-DSN skip-if-unset guard
**Source:** `backend/internal/testsupport/phase106_postgres.go` lines 50-53 (also duplicated,
file-local, in `openPhase152Postgres`/`openPhase155Postgres`).
**Apply to:** `scripts/test-backend.sh` must export every `*_TEST_DSN` env var these guards check
for, or the corresponding tests silently skip (not fail) — silently skipping is explicitly
forbidden by this phase's own Ziel section ("Kein Test wird gelöscht oder stillschweigend
übersprungen"), so the script's own summary step must positively assert every expected
Phase-NNN-suite actually RAN (not skipped) as part of its "0 red" proof, not just that nothing
failed.

### `permissions.CacheLoader` whole-catalog completeness gate stub lists
**Source:** `backend/internal/repository/membership_baseline_registry_test.go` (lines 85-127),
`backend/internal/services/effective_rights_service_test.go` (lines 43-100),
`backend/internal/repository/release_review_query_repository_test.go` (lines ~635-680).
**Apply to:** any future action added to `internal/permissions`'s canonical action list will need
the SAME one-line addition repeated across all three (plus any other) local gap-filler stubs found
in the backend test suite — this phase's fix is the concrete three-file precedent for that pattern
going forward.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `scripts/test-backend.sh` | config/utility (shell script) | batch | No existing script runs the full unscoped backend suite against a bare `golang:1.25[-alpine]` container with the whole repo mounted and N throwaway databases cycled; closest are `phase134-green-gate.sh` (scoped suite, already-running container) and `provision-phase134-matrix-db.sh` (single throwaway DB, no teardown) — both contribute idioms, neither is the shape |
| `phase134_verification_matrix_access_test.go`'s env-var-with-default constants | test (integration/HTTP) | request-response | No existing Go test in this repo uses an env-var-with-non-empty-fallback-default pattern for a base URL; every existing analog instead skips outright on an unset/empty env var (see `phase106_postgres.go` lines 50-53) |

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/services/`,
`backend/internal/testsupport/`, `backend/internal/migrations/`, `backend/internal/handlers/`,
`backend/internal/testquality/`, `backend/internal/permissions/`, `frontend/src/types/__tests__/`,
`shared/contracts/openapi.yaml`, `scripts/`, `docs/ENTWICKLUNG.md`, `backend/Dockerfile`.
**Files scanned:** ~35 (via targeted `grep`/`Read`, no full-repo scan — every analog found by
following the concrete fixture/function names already named in 185-CONTEXT.md's cluster table).
**Pattern extraction date:** 2026-10-16.
