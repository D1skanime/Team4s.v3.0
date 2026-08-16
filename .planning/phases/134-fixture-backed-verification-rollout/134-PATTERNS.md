# Phase 134: Fixture-Backed Verification & Rollout - Pattern Map

**Mapped:** 2026-08-16
**Files analyzed:** 10
**Analogs found:** 10 / 10 (all have at least a role-match or better; 2 are genuinely-new-tooling with only partial analogs — flagged below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/seed-member-profile-fixtures.mjs` (EXTEND) | utility (seed script) | request-response (HTTP API calls) | itself (Phase-129 version, existing) + `backend/internal/handlers/app_profile_story_image.go` for the media step | exact (self) / role-match (media insert target) |
| `scripts/member-profile-fixture.manifest.json` | config (data contract) | batch (static JSON, read by 3 consumers) | none checked in yet; derive from seed's own constants (`GROUP_A`, `CONFIRMED_ANIME_COUNT`, `runAssertions()` checks) | no analog (new artifact type) |
| `scripts/README-manifest.md` | config (doc) | — | `scripts/README-seed.md` | exact |
| `scripts/reset-member-profile-fixture.mjs` | utility (reset script) | batch (targeted TRUNCATE/DELETE) | `scripts/reset-local-schema-cutover-data.ps1` (structural analog, wrong language) + `resetPhase129Fixtures()` in `backend/internal/repository/member_profile_public_repository_postgres_test.go` (DELETE-order analog, wrong runtime) | role-match |
| `scripts/verify-protected-assets.mjs` | utility (hash guard) | file-I/O | `sha256()` helper in `frontend/scripts/verify-profile-image-delivery.mjs` | role-match (helper-level exact) |
| `backend/cmd/migrate/main.go` (+ possible `fresh` subcommand) | route/CLI (migration commands) | request-response (CLI flags -> Runner calls) | itself (existing `runUp`/`runDown`/`runStatus` functions) | exact (self-extend) |
| `backend/internal/migrations/fresh_proof_test.go` | test (integration) | event-driven (DROP/CREATE/Up/Down sequence, asserted once) | `backend/internal/migrations/runner_test.go` (unit-level, no DSN) — weak match; no existing DROP-DATABASE tooling anywhere in repo (confirmed via grep) | no strong analog — build from `Runner.Up`/`Runner.Down` primitives directly |
| `backend/internal/repository/phase134_verification_matrix_test.go` (or `backend/internal/migrations/`) | test (integration, Postgres-backed matrix) | CRUD + request-response (seeds once, asserts many cases) | `backend/internal/repository/member_profile_public_repository_postgres_test.go` (`TestPhase129...`/`TestPhase131...`/`TestPhase132...` in the SAME file) | exact |
| `backend/internal/testsupport/phase134_postgres.go` (DSN helper) | utility (test fixture) | request-response (opens a guarded pgxpool) | `backend/internal/testsupport/phase128_postgres.go` (mandatory-DSN wrapper) + `backend/internal/testsupport/phase106_postgres.go` (`openPhasePostgres` shared engine) — **but also see the inline `openPhase129Postgres()` in the repository test file, which is the closer full-schema-throwaway-DB precedent** | exact (two competing precedents, see note below) |
| `.planning/phases/134-fixture-backed-verification-rollout/uat-checklist.md` | config (doc, human checklist) | — | no in-repo UAT checklist doc precedent found; nearest is `frontend/scripts/collect-member-profile-evidence.mjs`'s `EXPECTED_VIEWPORTS`/mode dispatch as the *data* the checklist should reference | no analog — new artifact type |

**Important disambiguation on the DSN-helper analog:** `backend/internal/testsupport/phase128_postgres.go` (schema-isolated, tiny hand-built prerequisite tables) is the pattern RESEARCH.md pointed at, but it is the **wrong shape** for Phase 134's matrix suite. The matrix needs the **full real schema** (dozens of tables touched by `GetPublicMemberProfileByID`), exactly like Phase 129 needed it. The actually-closest precedent is the **inline** `openPhase129Postgres()` / `resetPhase129Fixtures()` pair already living in `backend/internal/repository/member_profile_public_repository_postgres_test.go` (lines 35-101) — it points a dedicated env var (`TEAM4S_PHASE129_TEST_DSN`) at a **dedicated throwaway database carrying the full `pg_dump --schema-only` schema**, not an isolated empty schema. Phase 134's `TEAM4S_PHASE134_TEST_DSN` helper (Wave 2/3) should copy **that** shape (full-schema throwaway DB + DELETE-in-FK-order reset), either inlined in the new test file (matching the 129 precedent) or factored into `backend/internal/testsupport/phase134_postgres.go` using `phase106_postgres.go`'s `openPhasePostgres()` engine if a schema-isolated variant is preferred instead. This decision is one plan-time judgment call the planner must make explicitly (both are defensible; the full-schema one is closer to what the matrix suite actually needs).

## Pattern Assignments

### `scripts/seed-member-profile-fixtures.mjs` (utility, request-response) — EXTEND

**Analog:** itself (`scripts/seed-member-profile-fixtures.mjs`, existing, 487 lines) + `backend/internal/handlers/app_profile_story_image.go` for the media-seeding target endpoint.

**Imports/header pattern** (lines 1-28):
```javascript
#!/usr/bin/env node
// scripts/seed-member-profile-fixtures.mjs
//
// Phase 129-01 (Wave 1) — reusable, idempotent, API-driven seed fixture ...
// Requires Node 18+ (global fetch). No external npm dependencies.
//
// Env (all optional; defaults target the live Linux VM):
//   SEED_API_BASE       default http://192.168.235.196:18092
//   ...
const API = (process.env.SEED_API_BASE || 'http://192.168.235.196:18092').replace(/\/+$/, '')
```

**Idempotent check-then-create pattern** (lines 111-129, `ensureGroup`):
```javascript
async function ensureGroup(token, spec) {
  const create = await api('POST', '/api/v1/fansubs', { token, body: { ... } })
  if (create.status === 201) { /* created */ return id }
  if (create.status === 409) { /* list + find existing */ return found.id }
  throw new Error(`ensureGroup(${spec.slug}): unexpected status ...`)
}
```
**For Phase 134:** the new media step must follow this SAME shape — POST to the upload endpoint, treat "already has an asset" as success (check-existence via a GET/list first), never assume a clean slate.

**Self-verification / assertion pattern** (lines 313-405, `runAssertions`):
```javascript
const results = []
function check(name, source, pass, detail) {
  results.push({ name, source, pass, detail })
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] (${source}) ${name}${detail ? ' — ' + detail : ''}`)
}
async function runAssertions(ctx) {
  // ... GET public profile, compare against expected constants
  check('>=10 confirmed distinct-anime projects', 'public', (adm.current_projects_count || 0) >= 10, ...)
}
```
**For Phase 134 (D-02):** add a manifest-write-or-compare step right after `runAssertions()` (line 470) so the seed's checks and the checked-in manifest cannot silently diverge — either write the manifest FROM these same constants at run-end, or read expectations FROM the manifest into `check(...)` calls, per Pitfall 1 in RESEARCH.md.

**Main-flow orchestration pattern** (lines 409-482, `main()`):
```javascript
async function main() {
  const tokenA = await getToken('Token A (admin)', ADMIN_USER, ADMIN_PW)
  const tokenB = await getToken('Token B (sheppert)', SHEP_USER, SHEP_PW)
  // Step 1: groups ... Step 2+3: anime ... Step 5: memberships ... Step 9: /me/profile
  await runAssertions({ ... })
  const failed = results.filter((r) => !r.pass)
  if (failed.length > 0) { console.log('\nRESULT: FAIL'); process.exit(1) }
  console.log('\nRESULT: PASS')
}
main().catch((err) => { console.error('\n[seed129][FATAL]', err.message); process.exit(1) })
```
**For Phase 134:** insert a new "Step N: media" block in this same numbered-step style, calling the real upload endpoint (see below) once per profile, before `runAssertions`.

**Media-seeding target (the actual API to call — answers RESEARCH.md Open Question 3):**
`backend/internal/handlers/app_profile_story_image.go` implements `POST /api/v1/me/profile/story-images` (`UploadOwnProfileStoryImage`, line 38) which does a `media_assets` INSERT `mit owner_member_id` (line 166, comment: "media_assets INSERT mit owner_member_id (D-08, D-03)") and a companion `ResolveStoryImageByID` (line 216) that gates delivery on `owner_member_id IS NOT NULL`. This is a real, already-productionized, member-owned media upload surface distinct from anime-cover upload — it is the correct endpoint for the seed's new media step, not a new upload surface and not the anime-cover path. Multipart-upload construction pattern to mirror is in `backend/internal/handlers/media_upload_test.go` (`multipart.NewWriter`, lines ~553-566) for understanding the wire shape the seed's `fetch(...)` call must produce (the seed can build `FormData` directly since Node 18's global `fetch` supports it — no need to hand-roll multipart boundary strings).

---

### `scripts/member-profile-fixture.manifest.json` (config, batch) — NEW

**No direct analog** (first machine-readable manifest of this kind in the repo). Derive its shape from the seed's own hardcoded expectation constants and `runAssertions()` checks:
```javascript
// Source: scripts/seed-member-profile-fixtures.mjs lines 33-37
const GROUP_A = { slug: 'seed129-group-a', name: 'Seed129 Gruppe A', status: 'active' }
const GROUP_B = { slug: 'seed129-group-b', name: 'Seed129 Gruppe B', status: 'dissolved' }
const CONFIRMED_ANIME_COUNT = 10
```
and the assertion targets (lines 333-404): `profile_status`, membership current/historical `left_date`, distinct role codes, `current_projects_count`, `total_points`, `is_currently_active`, pagination (`total`, page 2 non-empty), plus the new media fields Wave 1 adds. Fields per PMQA-02: identity, visibility, roles, memberships, projects, badges, media, content-lengths.

---

### `scripts/README-manifest.md` (config/doc) — NEW

**Analog:** `scripts/README-seed.md` (122 lines) — same document shape: Requirements / How to run / Environment variables / Scenario matrix covered / Idempotency / Notes. Reuse its table format for enumerating manifest fields instead of env vars, and its "How to run"-style section for "How to regenerate/validate the manifest."

---

### `scripts/reset-member-profile-fixture.mjs` (utility, batch) — NEW

**Analog 1 (structural/safety-guard shape, wrong language):** `scripts/reset-local-schema-cutover-data.ps1` (129 lines).

**Safety-guard pattern to port to Node** (lines 1-30):
```powershell
param([switch]$ConfirmLocal)
if (-not $ConfirmLocal) {
    throw "Refusing to reset data without -ConfirmLocal. This script is destructive and local-dev only."
}
$identity = Invoke-LocalPsql "SELECT current_database(), current_user;"
if ($identityValue -ne "team4s_v2`tteam4s") {
    throw "Refusing to reset unexpected database identity: $($identity -join '; ')"
}
$runtimeProfile = docker compose exec -T team4sv30-backend printenv RUNTIME_PROFILE 2>$null
if ($LASTEXITCODE -eq 0 -and $runtimeProfile.Trim() -notin @("local", "development", "dev", "")) {
    throw "Refusing to reset while backend RUNTIME_PROFILE is '$($runtimeProfile.Trim())'"
}
```
**For Phase 134:** the new script MUST reproduce this three-part guard (explicit confirm flag, `current_database()`/`current_user` identity check, `RUNTIME_PROFILE` check) before any DELETE — this is the established "don't nuke the wrong DB" convention in this repo, and it directly maps to the Security Domain threat ("A destructive reset script accidentally run against the wrong database/environment") RESEARCH.md flags.

**Table-list + TRUNCATE-with-existence-check pattern** (lines 32-83) — **do NOT copy the TRUNCATE-everything shape**; D-05 explicitly forbids broad TRUNCATE (even of `anime`/`media_assets` broadly) for the Phase-134 case — the PS1 script's table list is a valid PATTERN for "build an existence-checked, quoted table list" but the Phase-134 reset must instead be scoped to only the seed's own synthetic rows.

**Analog 2 (narrower DELETE-in-FK-order shape, correct scope, wrong runtime):** `resetPhase129Fixtures()` in `backend/internal/repository/member_profile_public_repository_postgres_test.go` (lines 66-95):
```go
func resetPhase129Fixtures(t *testing.T, pool *pgxpool.Pool) {
	_, err := pool.Exec(context.Background(), `
		DELETE FROM anime_contribution_roles;
		DELETE FROM anime_contributions;
		DELETE FROM release_version_media;
		DELETE FROM media_files;
		DELETE FROM media_assets;
		DELETE FROM hist_group_member_roles;
		DELETE FROM fansub_group_member_roles;
		DELETE FROM fansub_group_members;
		DELETE FROM hist_fansub_group_members;
		DELETE FROM member_claims;
		DELETE FROM release_versions;
		DELETE FROM fansub_releases;
		DELETE FROM episodes;
		DELETE FROM anime;
		DELETE FROM fansub_groups;
		DELETE FROM members;
		DELETE FROM app_users;
		DELETE FROM users;
		DELETE FROM role_definitions;
		DELETE FROM review_statuses;
		DELETE FROM visibilities;
	`)
	require.NoError(t, err, "reset Phase-129 fixtures")
}
```
**For Phase 134:** this is a full-wipe list appropriate for a THROWAWAY database (safe there because it's not the shared DB). The shared-DB reset script must instead target ONLY the seed's own synthetic rows by identifying key — e.g. `DELETE FROM hist_fansub_group_members WHERE hist_fansub_group_id IN (SELECT id FROM fansub_groups WHERE slug IN ('seed129-group-a','seed129-group-b'))`, `DELETE FROM fansub_groups WHERE slug LIKE 'seed129-%'`, `DELETE FROM anime WHERE title LIKE 'Seed129 Anime%'` — never a bare `DELETE FROM members` or `DELETE FROM media_assets` (that would remove the tracked-asset media too, violating D-06). Compose the **guard structure of Analog 1** with the **FK-ordering discipline of Analog 2**, scoped by slug/title prefix rather than full-table.

**Never do this (Anti-Pattern, RESEARCH.md):**
```sql
-- FORBIDDEN on the shared DB — structurally reaches ~50 tables and is trigger-blocked anyway
TRUNCATE members CASCADE;
```

---

### `scripts/verify-protected-assets.mjs` (utility, file-I/O) — NEW

**Analog:** `sha256()` helper + hashing usage pattern in `frontend/scripts/verify-profile-image-delivery.mjs` (213 lines).

**Imports pattern** (lines 1-7):
```javascript
#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
```

**Hash helper + comparison pattern** (lines 44-46, 105):
```javascript
function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}
// usage:
assert(sha256(first.body) === sha256(second.body), `${label} repeated bytes differ`)
```

**Fail-loud assertion pattern** (lines 12-18):
```javascript
function fail(message) {
  throw new Error(`phase120 image verifier: ${message}`)
}
function assert(condition, message) {
  if (!condition) fail(message)
}
```

**For Phase 134 (D-06):** walk `frontend/public/history-event-badges/`, `frontend/public/history-event-badges-transparent/`, `frontend/public/member-achievement-badges/` recursively (`node:fs` `readdirSync`/`readFileSync`), compute `sha256()` per file into a before-snapshot JSON, then re-run after reset and diff — any mismatched hash or missing/added file is a hard failure via the same `fail()`/`assert()` pattern (non-zero exit), per the Security Domain guidance ("fail loudly on any missing/malformed expectation, not default-and-continue").

---

### `backend/cmd/migrate/main.go` (route/CLI) — possibly extend with `fresh` subcommand

**Analog:** itself, existing `up`/`down`/`status` command dispatch (226 lines).

**Command-dispatch pattern** (lines 18-39):
```go
func main() {
	if len(os.Args) < 2 { printUsageAndExit(1) }
	command := os.Args[1]
	switch command {
	case "up": runUp(os.Args[2:])
	case "down": runDown(os.Args[2:])
	case "status": runStatus(os.Args[2:])
	case "backfill-phase-a-metadata": runBackfillPhaseAMetadata(os.Args[2:])
	case "backfill-badges": runBackfillBadges(os.Args[2:])
	default: log.Printf("unknown command: %s", command); printUsageAndExit(1)
	}
}
```

**Individual command + shared setup pattern** (lines 41-58, 155-178):
```go
func runUp(args []string) {
	fs := flag.NewFlagSet("up", flag.ExitOnError)
	migrationsDir := fs.String("dir", "", "Path to migrations directory")
	databaseURL := fs.String("database-url", os.Getenv("DATABASE_URL"), "PostgreSQL connection URL")
	_ = fs.Parse(args)
	runner, cleanup := setupRunner(*databaseURL, *migrationsDir)
	defer cleanup()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	applied, err := runner.Up(ctx)
	if err != nil { log.Fatalf("apply migrations failed: %v", err) }
	log.Printf("migrations applied: %d", applied)
}

func setupRunner(databaseURL string, migrationsDirFlag string) (*migrations.Runner, func()) {
	cfg := config.Load()
	if databaseURL == "" { databaseURL = cfg.DatabaseURL }
	if databaseURL == "" { log.Fatal("DATABASE_URL is required. Set env var or pass -database-url.") }
	migrationsDir, err := migrations.ResolveMigrationsDir(migrationsDirFlag)
	// ...
	return migrations.NewRunner(dbPool, migrationsDir), dbPool.Close
}
```
**For Phase 134 (D-04, if the `fresh` subcommand route is chosen over a standalone `_test.go`):** a `case "fresh":` branch following this exact shape, but `setupRunner`'s `database/sql`-via-`pgxpool` connection must instead connect to the Postgres server's `postgres` maintenance DB first to run `DROP DATABASE IF EXISTS ...` + `CREATE DATABASE ...`, THEN open a new pool against the freshly created target DB before calling `runner.Up(ctx)` — `setupRunner` as written always assumes the target DB already exists, so it cannot be reused verbatim; only the flag-parsing and dispatch shape transfers directly.

---

### `backend/internal/migrations/fresh_proof_test.go` (test, event-driven) — NEW, no strong analog

**Primitives to drive directly** (from `backend/internal/migrations/runner.go`, lines 40-50, and its `Up`/`Down`/`Status` signatures):
```go
type Runner struct { db *pgxpool.Pool; migrationsDir string }
func NewRunner(db *pgxpool.Pool, migrationsDir string) *Runner
func (r *Runner) Up(ctx context.Context) (int, error)
func (r *Runner) Down(ctx context.Context, steps int) (int, error)
func (r *Runner) Status(ctx context.Context) (Status, error)
```
**Confirmed via grep: no `DROP DATABASE`/`CREATE DATABASE` string exists anywhere in `backend/` or `scripts/` today** — this is genuinely new tooling. Structure it as: (1) connect to Postgres's `postgres` maintenance DB via a plain `pgxpool` (mirroring the connection-opening style in `backend/internal/testsupport/phase106_postgres.go` lines 55-67, i.e. `pgxpool.ParseConfig` + `pgxpool.NewWithConfig` + a `current_database()` sanity check), (2) `DROP DATABASE IF EXISTS team4s_phase134_migration_fresh` + `CREATE DATABASE team4s_phase134_migration_fresh`, (3) open a fresh pool against that DB, (4) call `runner.Up(ctx)` and assert `applied == totalMigrationCount`, (5) call `runner.Down(ctx, appliedCount)` and assert `rolledBack == appliedCount` AND assert zero residual application tables (query `information_schema.tables`), (6) `t.Cleanup` to `DROP DATABASE` again. Use `require` from `stretchr/testify` per repo convention (seen throughout `member_profile_public_repository_postgres_test.go`).

---

### `backend/internal/repository/phase134_verification_matrix_test.go` (test, CRUD/request-response) — NEW

**Analog:** `backend/internal/repository/member_profile_public_repository_postgres_test.go` (558 lines) — the exact established location and naming convention for `TestPhase1XX...` public-projection integration tests; Phase 134's matrix should live in the SAME file or a sibling file in the same package, not a new top-level location.

**DSN-helper + fixture-reset pattern to mirror (full-schema throwaway DB variant)** (lines 35-64):
```go
const phase129DSNEnv = "TEAM4S_PHASE129_TEST_DSN"
var phase129DatabasePattern = regexp.MustCompile(`^team4s_phase129_test(?:_[a-z0-9]+)?$`)

func openPhase129Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(phase129DSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping Phase-129 public projection integration test", phase129DSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", phase129DSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, phase129DatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", phase129DSNEnv, dbName, phase129DatabasePattern)
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", phase129DSNEnv)
	t.Cleanup(pool.Close)
	var runtimeDB string
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT current_database()`).Scan(&runtimeDB))
	require.Equalf(t, dbName, runtimeDB, "runtime database %q differs from guarded DSN database %q", runtimeDB, dbName)
	resetPhase129Fixtures(t, pool)
	return pool
}
```
**For Phase 134:** copy this shape verbatim with `phase134` names (`TEAM4S_PHASE134_TEST_DSN`, `team4s_phase134_test(?:_[a-z0-9]+)?`). Per D-07, this pool should be opened ONCE (`TestMain` or a package-level `sync.Once`-guarded helper) and the versioned manifest fixture seeded once, then every sub-test (`TestPhase134Anonymous...`, `TestPhase134Owner...`, `TestPhase134Pagination...`) reads against that single seeded state rather than reseeding per test — this differs from the `resetPhase129Fixtures`-per-open pattern (129's tests each seed their OWN isolated rows) and is a deliberate Phase-134 divergence the planner should call out (D-07: "seeds the versioned fixture once").

**Individual test body pattern** (lines 103-120, `TestPhase129PublicProfileExposesYearOnlyActivePeriod`):
```go
func TestPhase129PublicProfileExposesYearOnlyActivePeriod(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")
	mustExecPhase129(t, pool, `INSERT INTO members (...) VALUES (...);`)
	// ... call repo method, assert against expected DTO shape
}
```
**For Phase 134:** each matrix case (`anonymous public`, `hidden`, `owner`, `refresh-only`, `missing`, `sparse`, `dense`, `error`, `pagination`) follows this call-repo-assert-DTO shape, but reads its input scenario from the checked-in manifest JSON (D-02/D-07) instead of ad hoc inline `INSERT`s, since the fixture is externally seeded via the extended `seed-member-profile-fixtures.mjs` against this same throwaway DB, not built row-by-row in Go.

---

### `backend/internal/testsupport/phase134_postgres.go` (DSN helper) — optional, if factored out of the test file

**Analog A (mandatory-DSN wrapper shape):** `backend/internal/testsupport/phase128_postgres.go` (77 lines) — see full content already reproduced under "Important disambiguation" above; reuse its `t.Fatalf` (not `t.Skipf`) mandatory-opt-in style if Phase 134's matrix should hard-fail (not skip) when the DSN is unset (this differs from 129/106's skip-if-unset style — planner's discretion, matches D-04/D-07 "always required for this gate" framing).

**Analog B (shared engine, if a schema-isolated variant is preferred over full-schema):** `openPhasePostgres()` in `backend/internal/testsupport/phase106_postgres.go` (lines 41-127) — already handles schema creation, `search_path` isolation, safe cleanup via `t.Cleanup`, and public-schema-DDL rejection (`validatePhase106SQL`). Only worth reusing if Phase 134 chooses the schema-isolated shape for the MATRIX suite (unlikely, given it needs the full real schema like 129 did) — more likely useful for the `fresh_proof_test.go` DB-creation guard logic (the `current_database()` sanity-check pattern at lines 68-76).

---

## Shared Patterns

### Mandatory-DSN, fail-closed database-name guard
**Source:** `backend/internal/testsupport/phase128_postgres.go` lines 24-37 + inline `openPhase129Postgres()` lines 42-64 (member_profile_public_repository_postgres_test.go)
**Apply to:** `fresh_proof_test.go`, `phase134_verification_matrix_test.go`, and (if factored out) `phase134_postgres.go`. Every ephemeral/throwaway DB connection in this phase must (1) require an explicit phase-scoped env var with NO fallback to `DATABASE_URL`, (2) regex-validate the database name before connecting, (3) re-verify `SELECT current_database()` matches the DSN's declared database as a second, redundant guard against accidental live-DB connection.

### Idempotent check-existence-then-create HTTP writes
**Source:** `scripts/seed-member-profile-fixtures.mjs` `ensureGroup`/`ensureAnimeAttached`/`ensureHistMember`/`ensureRoles` (lines 111-241)
**Apply to:** the seed script's new media-seeding step. Never assume a clean slate; always 409-tolerant or list-then-check.

### Fail-loud, non-zero-exit verification scripts
**Source:** `scripts/seed-member-profile-fixtures.mjs`'s `check()`/`RESULT: PASS`/`RESULT: FAIL` (lines 313-320, 472-481) and `frontend/scripts/verify-profile-image-delivery.mjs`'s `fail()`/`assert()` (lines 12-18)
**Apply to:** `verify-protected-assets.mjs`, `reset-member-profile-fixture.mjs`'s post-reset verification step, and any manifest-vs-seed drift check. Silent defaulting on a missing/malformed value is explicitly forbidden per the Security Domain section of RESEARCH.md — always throw/exit non-zero.

### Destructive-script triple guard (identity + confirm-flag + runtime-profile)
**Source:** `scripts/reset-local-schema-cutover-data.ps1` lines 1-30
**Apply to:** `scripts/reset-member-profile-fixture.mjs`. Port the three checks (explicit `--confirm-local`-style flag, `current_database()`/`current_user` identity check, `RUNTIME_PROFILE` env check via `docker compose exec team4sv30-backend printenv RUNTIME_PROFILE`) into Node before any DELETE statement executes.

### sha256-based content hashing
**Source:** `frontend/scripts/verify-profile-image-delivery.mjs` lines 3, 44-46
**Apply to:** `verify-protected-assets.mjs`. `createHash('sha256').update(buffer).digest('hex')` is the established hashing primitive in this repo's Node tooling — do not hand-roll a weaker checksum (explicitly called out in RESEARCH.md's V6 Cryptography row).

### Locked-budget evidence re-measurement
**Source:** `frontend/scripts/collect-member-profile-evidence.mjs` `LOCKED_BUDGETS` object (lines 727-765) + `evaluateBudget()` (lines 769-863) + its `--mode budget-check` dispatch (lines 865+, 978-991)
**Apply to:** Wave 6 (D-09 live UAT). Invoke `docker exec team4sv30-frontend node scripts/collect-member-profile-evidence.mjs --mode budget-check` and `verify-profile-image-delivery.mjs` as-is — do not write a new metrics collector; both already encode the Phase-131/133 budgets this phase must check against.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `scripts/member-profile-fixture.manifest.json` | config | batch | First machine-readable versioned manifest of this kind in the repo; derive its field list from the seed's existing constants + `runAssertions()` targets (see Pattern Assignment above), not from an existing JSON analog. |
| `backend/internal/migrations/fresh_proof_test.go` | test | event-driven | No `DROP DATABASE`/`CREATE DATABASE` tooling exists anywhere in the codebase (confirmed via `grep -rl "DROP DATABASE\|CREATE DATABASE" backend/ scripts/` → zero results). Build directly from `Runner.Up`/`Runner.Down` primitives plus a hand-written maintenance-DB connection step; use `phase106_postgres.go`'s connection-opening style as a partial template only. |
| `.planning/phases/134-fixture-backed-verification-rollout/uat-checklist.md` | config/doc | — | No prior phase in this milestone produced a standalone checklist doc; format is Claude's Discretion per CONTEXT.md. Reference `frontend/scripts/collect-member-profile-evidence.mjs`'s `EXPECTED_VIEWPORTS = ['390x844', '768x1024', '1440x900']` (line 8) for the narrow/intermediate/widescreen breakpoints the checklist must enumerate, and the existing `evidence/` directory shape from Phase 131 (`.planning/phases/131-.../evidence/BUDGETS.md`, `baseline-*.json`) for the sibling `evidence/` directory this phase also creates. |

## Metadata

**Analog search scope:** `scripts/`, `backend/internal/migrations/`, `backend/internal/testsupport/`, `backend/internal/repository/`, `backend/cmd/migrate/`, `backend/internal/handlers/` (media-upload surfaces), `frontend/scripts/`
**Files scanned:** 9 read in full or targeted sections (`seed-member-profile-fixtures.mjs`, `README-seed.md`, `phase128_postgres.go`, `phase106_postgres.go`, `member_profile_public_repository_postgres_test.go` (partial), `reset-local-schema-cutover-data.ps1`, `runner.go` (partial), `cmd/migrate/main.go`, `collect-member-profile-evidence.mjs` (partial), `verify-profile-image-delivery.mjs` (partial)) + `app_profile_story_image.go` located via grep (answers RESEARCH.md Open Question 3 on the media-seeding endpoint)
**Pattern extraction date:** 2026-08-16
