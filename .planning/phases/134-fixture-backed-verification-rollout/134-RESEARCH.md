# Phase 134: Fixture-Backed Verification & Rollout - Research

**Researched:** 2026-08-16
**Domain:** Test-fixture engineering, PostgreSQL migration lifecycle proof, integration/regression test authoring, browser-based UAT evidence collection
**Confidence:** HIGH

## Summary

Phase 134 does not build new product behavior. It builds **verification infrastructure**: a
versioned manifest + reusable seed, a migration fresh/up/down proof harness that does not yet
exist, a dedicated behavioral matrix test suite, a green-gate script, and a bundled live-UAT
protocol — all wired against artifacts that Phases 128-133 already produced. The single most
important research finding is that **Phases 129, 130, and 131 are already fully executed,
committed, and gate-green in git history**, even though two separate tracking surfaces in this
repo (`ROADMAP.md`'s "Progress" table and a stale window in `STATE.md`) currently misreport them
as "0/TBD Not started" / miscounted. This is a documentation-drift bug, not a ground-truth gap —
see "Ground Truth: Phase 129/130/131 Execution Status" below. Phase 134 can be planned as fully
ready to execute now; no upstream blocker exists.

The second key finding is a real (not documentary) gap: the Phase-129 seed script
(`scripts/seed-member-profile-fixtures.mjs`) that Phase 134 must reuse per CONTEXT.md D-01
currently seeds identity, visibility, groups, memberships, roles, contributions, release
versions, and badge/point thresholds — but **it does not seed any `media_assets` rows or avatar
images**. The live DB confirms `media_assets` count = 0 right now. PMQA-02's manifest must
document "media," and PMQA-05's live UAT must observe "images" — so Phase 134's Wave 1 must
extend the seed (in-place, per D-01, not fork it) to add at least one owned media asset per
profile before the manifest and matrix can assert against it.

The third finding is architectural: no `Fresh`/`DROP DATABASE`-style capability exists anywhere
in the codebase today (`backend/internal/migrations/runner.go` only has `Up`/`Down`/`Status`,
and `backend/cmd/migrate/main.go` only exposes `up`/`down`/`status`/two backfill commands). D-04's
"fresh" proof (DROP DATABASE + recreate + migrate) must be built from scratch as new,
purpose-built tooling for this phase — there is no existing helper to reuse, only the
`Runner.Up(ctx)` / `Runner.Down(ctx, steps)` primitives to drive against a database the tooling
itself provisions and tears down.

**Primary recommendation:** Treat Phase 134 as five largely independent deliverables that share
one fixture (the manifest): (1) extend the Phase-129 seed + write the versioned JSON manifest
+ README, (2) build new fresh/up/down migration-proof tooling against an ephemeral DB using the
existing `Runner`, (3) write a dedicated `TestPhase134...` Postgres-backed matrix suite that
seeds once and asserts every case against the manifest, (4) write a targeted reset script for the
shared DB that never touches `members`/`media_assets` via CASCADE, and (5) run the bundled live
UAT against `127.0.0.1:3300` using the existing evidence harnesses, checked against Phase 131/133's
already-locked budgets.

## Ground Truth: Phase 129/130/131 Execution Status

**Verdict: All three phases ARE executed, committed, and automated-gate GREEN.** The
cross-phase note's concern is valid to raise but the underlying work is done. Evidence:

| Phase | Git evidence | Code evidence |
|---|---|---|
| 129 | `33f5a1ae docs(129): close Phase 129 - automated gate PASS, all requirements green` (2026-08-14); 10 prior `fix(129-0X)`/`refactor(129-03)` commits | `.planning/phases/129-.../129-VERIFICATION.md` exists with a full PASS report; `member_profile_*.go` split into ≤450-line files (largest 366); `scripts/seed-member-profile-fixtures.mjs` + `scripts/README-seed.md` exist, dated 2026-08-14; `TestPhase129...` tests exist in `backend/internal/repository/member_profile_public_repository_postgres_test.go` |
| 130 | `5b5d9f34 docs(130): mark phase 130 executed (contract gate green; live UAT deferred to 134)`; `ade3107f test(130-07): lock public DTO contract...`; 4 more `feat/refactor(130-0X)` commits | `shared/contracts/openapi.yaml` has dedicated public-member schemas (`PublicMemberBadge`, allow-listed profile response, etc.); no separate `130-VERIFICATION.md`/`SUMMARY.md` file exists (a real doc-completeness gap in that phase, not a code gap) |
| 131 | `5ead3902 chore(131): mark Phase 131 executed in STATE`; `2c929348 test(131-08): lock performance budgets...`; 6 more `feat/test/perf(131-0X)` commits | `.planning/phases/131-.../evidence/` contains real captured `baseline-*.json`, `post-change-*.json`, `explain-analyze-*.txt`, and `BUDGETS.md` with concrete locked numbers; `frontend/scripts/collect-member-profile-evidence.mjs` contains the `LOCKED_BUDGETS` object (query ceiling 19, per-endpoint byte/latency budgets, image-waterfall budgets) that Phase 133 (2026-08-16, one day before this research) actively extended — i.e. downstream phases already depend on Phase 131's locked artifact |

**Root cause of the stale "0/TBD Not started" rows:** `ROADMAP.md` maintains TWO separate
tracking surfaces — a `## Phases` checklist (`- [x]`/`- [ ]`, correctly shows 128/129/130/132 as
`[x]` and 131/133 as `[ ]` even though 131 is done, itself inconsistent) and a separate
`## Progress` table with "Plans Complete" counts that was **never updated** past its initial
`0/TBD` scaffolding for 129, 130, 131 (confirmed via `git log -p -- .planning/ROADMAP.md`: no
commit ever edited those three table rows). Separately, `STATE.md`'s `completed_phases` counter
was reset from `3` to `1` in commit `71918eb2` ("docs(132): create phase plan") when Phase 132
planning started — the counter regressed and the `## Accumulated Context` section's
Phase-129/130/131-specific decision entries were dropped at that point and never backfilled
(Phase 132/133 entries were appended fresh afterward, which is why current `STATE.md` shows
decisions only for 128/132/133). This is a **tracking/bookkeeping bug** in the GSD state files,
not a signal that the underlying implementation is unfinished.

**Implication for Phase 134 planning:** Do not add a dependency/blocker task for 129/130/131.
Phase 134 plans can assume their deliverables (extended seed script hooks, the public DTO/contract
in `shared/contracts/openapi.yaml`, and the locked `LOCKED_BUDGETS` in
`collect-member-profile-evidence.mjs`) exist and are stable today. **Do** consider a small
Phase-134 documentation task (or a note to the user) to correct `ROADMAP.md`'s Progress table and
reconcile `STATE.md`'s `completed_phases` counter — this is cheap, prevents future confusion, and
is squarely inside this phase's "rollout" framing, though it is not one of PMQA-01..07 and should
not consume plan budget disproportionately.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Versioned fixture manifest (JSON) | Repo tooling (scripts/) | — | Static, checked-in data; not served by any runtime tier |
| Seed/reseed execution | API / Backend (via HTTP calls) | Database | `seed-member-profile-fixtures.mjs` drives the real creation/admin API and Keycloak — it never writes SQL directly; the backend + DB are the tiers actually mutated |
| Migration fresh/up/down proof | Database / Backend tooling | — | New Go tooling or shell script driving `migrations.Runner` against a throwaway Postgres database; no HTTP surface involved |
| Targeted shared-DB reset | Database | Backend (trigger enforcement) | Reset is pure SQL (TRUNCATE of the seed's own rows only); the `reject_truncate` triggers are DB-tier invariants that constrain what SQL is even legal |
| Verification matrix (viewer/data/error/pagination) | API / Backend (Postgres-backed integration tests) | — | Asserts against repository/handler layer output, mirroring the existing `TestPhase12X/13X...` pattern in `backend/internal/repository/` |
| Green gate (typecheck/lint/tests/build/git diff --check) | Repo tooling (CI-style script) | Frontend + Backend | Orchestrates existing `npm run typecheck/lint/test/build` and `go build/vet/test` — does not add new product code |
| Live UAT evidence collection | Browser / Client (via Frontend Server SSR) | Frontend tooling | `collect-member-profile-evidence.mjs`/`verify-profile-image-delivery.mjs` are Node scripts driving a real browser/HTTP client against the SSR'd Next.js pages at `192.168.235.196:3000` / tunneled `127.0.0.1:3300` |
| Protected asset hash guard | Repo tooling (scripts/) | Static / CDN (frontend/public) | Hashing `frontend/public/history-event-badges*` etc. is filesystem-level, independent of any served tier |

## Standard Stack

This phase adds **no new external dependencies**. Every deliverable is built from tools already
present in the repo. `## Package Legitimacy Audit` is N/A — see that section below.

### Core (existing, reused)
| Tool | Version (verified in repo) | Purpose | Why it's the standard here |
|------|---------|---------|--------------|
| Node.js (global `fetch`, no npm deps) | v20.20.2 inside `team4sv30-frontend` container [VERIFIED: `docker exec team4sv30-frontend node --version`] | Runs `seed-member-profile-fixtures.mjs`, `collect-member-profile-evidence.mjs`, `verify-profile-image-delivery.mjs` | Established Phase-128/129/131/133 pattern; VM has no host Node, container is the only runtime |
| Go | 1.25.0 [VERIFIED: `backend/go.mod`] | Migration runner, matrix test suite | Existing backend language; `migrations.Runner` already implements Up/Down/Status |
| `github.com/jackc/pgx/v5` (`pgxpool`) | per `backend/go.mod` [VERIFIED: import in `runner.go`] | DB connections for migration proof + matrix suite | Already the sole Postgres driver in the backend |
| Vitest | ^3.2.4 [VERIFIED: `frontend/package.json`] | Any frontend-side assertions the matrix needs (unlikely; matrix is backend-heavy per D-07) | Existing frontend test runner |
| Postgres 16 | per `docker-compose.yml` (`postgres:16` image) | Ephemeral migration-proof DB + shared reference DB | Matches production/dev Postgres major version exactly |

### Supporting (existing, reused)
| Tool | Purpose | When to use |
|------|---------|-------------|
| `stretchr/testify` | Assertions in the new `TestPhase134...` matrix suite | Standard for all `_test.go` files in this repo |
| Keycloak direct-grant token flow | Auth for the seed's API-driven writes | Already wired into `seed-member-profile-fixtures.mjs`; do not add a new auth path |
| `docker compose exec` | Running Node scripts / psql / go test inside containers | The only way to execute anything against the live stack; no host tooling is installed |

### Alternatives Considered
| Instead of | Could use | Tradeoff |
|------------|-----------|----------|
| New Go tooling for fresh/up/down proof | A raw bash script calling `psql`/`dropdb`/`createdb` + `go run ./cmd/migrate up` | Bash is simpler but loses type-safety and can't easily assert "0 rows after down" programmatically inside the same process; a Go test (or `cmd/migrate fresh` subcommand) can call `Runner` directly and assert in the same execution — prefer Go given the existing `phase12X_test.go` precedent, but either satisfies D-04 |
| Extending `cmd/migrate/main.go` with a `fresh` subcommand | A standalone `_test.go` file that never touches `cmd/migrate` | Adding a `fresh` subcommand is more reusable (future phases benefit) but touches shared CLI code under a phase whose CLAUDE.md caps files at 450 lines — `cmd/migrate/main.go` is currently small; either approach is viable, planner's discretion per CONTEXT.md |

**Installation:** None required — everything is already present in the repo/containers.

## Package Legitimacy Audit

**N/A for this phase.** No new external package is introduced by any of the five deliverables
(manifest/seed extension, migration-proof tooling, matrix suite, reset script, UAT evidence
run) — every tool used (`pgx`, `testify`, Vitest, Node's built-in `fetch`) is an existing,
already-installed dependency. `slopcheck`/registry verification was not run because there is
nothing new to verify. If a plan later discovers it needs a new package (e.g. a JSON-schema
validator for the manifest), the planner must re-run the Package Legitimacy Gate at that time.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌───────────────────────────────────────────┐
                    │  Wave 1: Fixture Contract (D-01/D-02)       │
                    │  scripts/seed-member-profile-fixtures.mjs   │
                    │  (extend: + media_assets, + manifest write) │
                    └───────────────┬─────────────────────────────┘
                                    │ writes/verifies against
                                    ▼
                    ┌───────────────────────────────────────────┐
                    │  scripts/member-profile-fixture.manifest    │
                    │  .json  (NEW, versioned, checked in)        │
                    │  + scripts/README-manifest.md (NEW)         │
                    └───────┬──────────────────┬──────────────────┘
                            │ read by           │ read by
                            ▼                   ▼
        ┌──────────────────────────┐  ┌──────────────────────────────┐
        │ Wave 2: Migration Proof   │  │ Wave 3: Verification Matrix   │
        │  (D-04) NEW tooling        │  │  (D-07) NEW TestPhase134...   │
        │  ephemeral DB:             │  │  backend/internal/repository  │
        │  DROP+CREATE DATABASE      │  │  seeds via manifest fixture,  │
        │  -> Runner.Up(ctx)         │  │  asserts anon/hidden/owner/   │
        │  -> Runner.Down(ctx,N)     │  │  refresh/missing/sparse/dense │
        │  -> assert 0 app rows      │  │  /error/pagination cases      │
        └──────────────────────────┘  └──────────────────────────────┘
                            │                   │
                            └─────────┬─────────┘
                                      ▼
                    ┌───────────────────────────────────────────┐
                    │  Wave 4: Green Gate (D-08)                  │
                    │  typecheck + lint + focused backend/        │
                    │  frontend tests + build + git diff --check  │
                    └───────────────┬─────────────────────────────┘
                                    ▼
                    ┌───────────────────────────────────────────┐
                    │  Wave 5: Shared-DB Rollout Reset (D-03/D-05)│
                    │  reset-local-schema-cutover-data.ps1-style  │
                    │  targeted TRUNCATE (NEVER members CASCADE)  │
                    │  + protected-asset hash guard (D-06)        │
                    │  + re-run extended seed against shared DB   │
                    └───────────────┬─────────────────────────────┘
                                    ▼
                    ┌───────────────────────────────────────────┐
                    │  Wave 6: Live UAT (D-09, PMQA-05)           │
                    │  browser @ 127.0.0.1:3300 (tunnel)          │
                    │  collect-member-profile-evidence.mjs +      │
                    │  verify-profile-image-delivery.mjs checked  │
                    │  against Phase-131/133 LOCKED_BUDGETS       │
                    │  -> human sign-off (V-02, milestone close)  │
                    └───────────────────────────────────────────┘
```

### Recommended Project Structure
```
scripts/
├── seed-member-profile-fixtures.mjs        # EXTEND (media_assets + manifest write), not fork
├── README-seed.md                          # update if seed behavior changes
├── member-profile-fixture.manifest.json    # NEW - versioned, machine-readable, single source
├── README-manifest.md                      # NEW - human-readable explainer for the manifest
├── reset-member-profile-fixture.mjs        # NEW (or .sh) - targeted, trigger-respecting reset
└── verify-protected-assets.mjs             # NEW - hash guard for D-06 (or fold into reset script)

backend/
├── cmd/migrate/
│   └── main.go                             # possibly + `fresh` subcommand (discretion)
└── internal/migrations/
    ├── runner.go                           # reused as-is (Up/Down primitives)
    ├── fresh_proof_test.go                 # NEW - D-04 ephemeral DROP/CREATE/up/down proof
    └── phase134_verification_matrix_test.go # NEW (or under internal/repository/) - D-07 matrix

frontend/scripts/
├── collect-member-profile-evidence.mjs     # reused as-is; already has LOCKED_BUDGETS
└── verify-profile-image-delivery.mjs       # reused as-is

.planning/phases/134-fixture-backed-verification-rollout/
├── evidence/                               # NEW - screenshots, hash records, gate output logs
└── uat-checklist.md                        # NEW - D-09 checklist protocol
```

### Pattern 1: Idempotent API-driven seed with inline scenario assertions
**What:** The existing seed authenticates via Keycloak direct-grant, then performs
check-existence-then-create HTTP calls against the real admin/creation API (never raw SQL),
finishing with `runAssertions()` and a `RESULT: PASS`/`FAIL` exit code.
**When to use:** This IS the mechanism Phase 134 must extend (D-01) — do not introduce a
parallel direct-SQL seeder.
**Example:**
```javascript
// Source: scripts/seed-member-profile-fixtures.mjs (existing, Phase 129)
function check(name, source, condition, detail) {
  results.push({ name, source, pass: !!condition, detail })
  console.log(`  [${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ' - ' + detail : ''}`)
}
// ... at the end:
const failed = results.filter((r) => !r.pass)
if (failed.length > 0) { console.log('\nRESULT: FAIL'); process.exit(1) }
console.log('\nRESULT: PASS')
```
**For Phase 134:** Add a manifest-write step (or manifest-compare step) right after
`runAssertions()` so the seed's own scenario checks AND the manifest stay the single source of
truth per D-02 — do not let the manifest silently drift from what the seed actually asserts.

### Pattern 2: Dedicated per-phase PostgreSQL contract tests (`TestPhase1XX...`)
**What:** Every prior phase (129, 131, 132) added narrowly-scoped Postgres-backed tests named
`TestPhase<N><Description>` living in `backend/internal/repository/*_postgres_test.go`.
**When to use:** D-07's matrix suite should follow this exact naming/location convention —
`TestPhase134Anonymous...`, `TestPhase134OwnerAccess...`, `TestPhase134Pagination...`, etc. — so
it composes naturally alongside `member_profile_public_repository_postgres_test.go`'s existing
`TestPhase129.../TestPhase131.../TestPhase132...` tests rather than introducing a new pattern.
**Example:**
```go
// Source: backend/internal/repository/member_profile_public_repository_postgres_test.go (existing)
func TestPhase131CurrentProjectsPagingIsStableAndTotalHonest(t *testing.T) {
    pool := testsupport.OpenPhase128Postgres(t) // or equivalent Phase-134 DSN helper
    // ... seed via manifest fixture, assert against manifest-declared expectations
}
```

### Pattern 3: Locked-budget evidence harness with `--mode budget-check`
**What:** `collect-member-profile-evidence.mjs` already supports a `budget-check` mode that
re-measures both seed profiles live and exits non-zero on any breach of `LOCKED_BUDGETS`.
**When to use:** D-09's live evidence step should invoke this exact harness (plus
`verify-profile-image-delivery.mjs`) rather than writing a new metrics collector.
**Example:**
```javascript
// Source: frontend/scripts/collect-member-profile-evidence.mjs (existing, Phase 131/133)
const budget = LOCKED_BUDGETS.profiles[slug]
for (const [endpoint, limits] of Object.entries(budget)) {
  if (endpoint === 'imageWaterfall') continue // checked separately, page-level metric
  // ... statusOk / maxBytes / maxMedianMs checks, push to breaches[]
}
```

### Pattern 4: Targeted TRUNCATE that explicitly excludes `members`
**What:** `scripts/reset-local-schema-cutover-data.ps1` already demonstrates the exact shape
D-05 requires: an explicit allow-list of disposable tables (`anime`, `media_assets`,
`episodes`, `release_*`, …) that is TRUNCATEd with `RESTART IDENTITY CASCADE`, while `members`
and `member_claims` are never in the list.
**When to use:** Base the new Phase-134 reset script on this pattern, but scope it further to
ONLY the seed's own synthetic rows (member 1/2's memberships, contributions, groups
`seed129-group-a/b`, etc.) — the PS1 script's table list is broader (it resets ALL anime/media,
not just the fixture's rows) and is Windows/PowerShell-only; Phase 134 needs a
Linux/container-runnable equivalent (Node or bash) with a narrower blast radius.
**Example:**
```powershell
# Source: scripts/reset-local-schema-cutover-data.ps1 (existing analog, NOT member-profile specific)
$tablesToClear = @("release_member_roles", ..., "media_assets", ..., "anime")
$truncateSql = "TRUNCATE TABLE $($quotedTables -join ', ') RESTART IDENTITY CASCADE;"
```

### Anti-Patterns to Avoid
- **`TRUNCATE members CASCADE`:** Structurally reaches ~50 tables via
  `media_assets.owner_member_id` -> `anime.cover_asset_id`/`banner_asset_id`, and is blocked
  anyway by `reject_truncate` triggers on append-only tables (`point_ledger_entries`,
  `review_*`). Never attempt this on the shared DB, even as a "reset everything" convenience.
- **Forking a second seed script:** CONTEXT.md D-01 is explicit — Phase 134 extends
  `seed-member-profile-fixtures.mjs` in place. A parallel seed would immediately desynchronize
  from the manifest (violates D-02's single-source guarantee).
- **Running migration fresh/up/down proof against the shared DB:** D-04 mandates an ephemeral,
  throwaway DB. The shared DB reset (D-05) and the migration proof (D-04) are two different
  databases/steps — do not conflate them even though "one DB reused in sequence" is an allowed
  implementation detail per CONTEXT.md (that still means DROP/recreate between the two uses, not
  reusing live data).
- **Trusting `ROADMAP.md`'s "Progress" table or `STATE.md`'s `completed_phases` counter as
  ground truth for 129/130/131:** Both are stale/buggy for those three phases (see "Ground Truth"
  section above) — verify via git log and `*-VERIFICATION.md`/evidence files instead when in doubt.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Re-measuring API payload/latency/Web-Vitals/image-waterfall | A new metrics collector | `frontend/scripts/collect-member-profile-evidence.mjs` (`--mode budget-check`) | Already has `LOCKED_BUDGETS` wired for both `sheppert` and `csubs-leader`; a new collector would need its own budget re-derivation and risks drifting from Phase 131/133's numbers |
| Verifying image delivery format/headers/cache behavior | Manual curl/DevTools inspection scripts | `frontend/scripts/verify-profile-image-delivery.mjs` | Already parses WEBP dimensions, checks cache-hit/alpha/original-fallback flags per `EXPECTED_CLASSES`/`EXPECTED_CORE_WIDTHS` |
| Applying/rolling back the full 145-pair migration chain | A hand-written sequence of raw `psql -f` calls | `migrations.Runner.Up(ctx)` / `Runner.Down(ctx, steps)` | Already handles version tracking, ordering, and up/down pairing correctly; reinventing it risks silently skipping the `schema_migrations` bookkeeping the real app depends on |
| Detecting whether a table still has the append-only guard | Grepping SQL for trigger keywords ad hoc | Query `information_schema.triggers` / `pg_trigger` for `%_reject_truncate` at DB level, or attempt the TRUNCATE in a transaction and catch the exception | The trigger function name pattern (`reject_point_ledger_truncate`, etc.) is consistent but not guaranteed exhaustive by convention alone — a DB-level check is authoritative |

**Key insight:** Every hard sub-problem in this phase (metrics, image verification, migration
apply/rollback) already has a purpose-built, phase-tested tool in this repo. The genuinely new
work is glue: the manifest, the ephemeral-DB fresh-proof driver, the matrix test file, and the
green-gate orchestration script — none of which have existing analogs to reuse wholesale, but all
of which compose cleanly from existing primitives (`Runner`, the seed's HTTP helpers, the evidence
harness's `LOCKED_BUDGETS`).

## Common Pitfalls

### Pitfall 1: Manifest drifts from the seed's own inline assertions
**What goes wrong:** The seed's `runAssertions()` (13 checks) and a newly-written manifest
JSON both encode "expected end state" independently, and over time someone edits one without the
other.
**Why it happens:** D-02 explicitly requires the manifest to be the single source, but the seed
currently has its OWN hardcoded expectations (e.g. `CONFIRMED_ANIME_COUNT = 10`,
`current_projects_count === CONFIRMED_ANIME_COUNT`) baked into constants at the top of the file,
not read from any external file.
**How to avoid:** Either (a) generate the manifest FROM the seed's constants at seed-run time (the
manifest becomes an output artifact, machine-derived, then checked in and diffed in CI), or (b)
invert it — move the constants into the manifest and have the seed READ them, so there is
exactly one place the numbers live. CONTEXT.md leaves the mechanism to Claude's discretion; either
satisfies D-02 as long as it is genuinely single-source (a manual "keep them in sync by hand" is
not acceptable — it is a certain future drift).
**Warning signs:** Any PR that edits `CONFIRMED_ANIME_COUNT` (or similar) in the seed script
without a corresponding manifest diff.

### Pitfall 2: Ephemeral migration-proof DB name collides with a real Phase-1XX test DB
**What goes wrong:** Existing Postgres test fixtures use naming conventions like
`team4s_phase128_test` (validated by regex `^team4s_phase128_test(?:_[a-z0-9]+)?$` in
`backend/internal/testsupport/phase128_postgres.go`). A hastily-chosen ephemeral DB name for the
Phase-134 fresh-proof could collide with, or be confused for, one of these.
**Why it happens:** No central registry of "which DB names are taken" exists; each phase invents
its own DSN env var and naming pattern.
**How to avoid:** Use a distinct, clearly-scoped name (e.g. `team4s_phase134_migration_fresh` /
`team4s_phase134_matrix`) and a dedicated env var (e.g. `TEAM4S_PHASE134_TEST_DSN`), following
the `phase128DSNEnv`-style mandatory-DSN pattern (fail fast if unset, never fall back to
`DATABASE_URL`) that `openPhasePostgres` already establishes.
**Warning signs:** Test runs unexpectedly wiping data in an already-existing throwaway DB from
an earlier phase.

### Pitfall 3: "Down" proof for 145 migration pairs may not be a clean no-op
**What goes wrong:** Rolling all 145 migrations down is significantly more surface area than any
prior phase has exercised (Phase 128's dedicated fixture only creates a 2-table prerequisite
subset, not the full chain). A down-migration written months ago for an unrelated feature could
have a bug (e.g. a `DROP COLUMN` that fails if a later migration added a `NOT NULL` constraint
depending on it) that has simply never been executed in sequence before.
**Why it happens:** Down migrations are rarely run in normal development (this repo's workflow is
described as append-only forward migrations followed by reset/reseed, not routine rollback).
**How to avoid:** Run the full down chain FIRST as an exploratory step before wiring it into the
gate, and budget time to fix any surfaced down-migration bug — this is likely, not hypothetical,
given 145 migrations have accumulated since 2026-04 with no evidence any of them has been
down-tested as a full chain.
**Warning signs:** `Runner.Down(ctx, 145)` erroring partway through, or exit-testing showing
residual tables/columns after a claimed-complete rollback.

### Pitfall 4: Confusing the "focused" tests in D-08's green gate with the full unscoped suite
**What goes wrong:** Phase 133's Plan 133-11 ran the FIRST-EVER full unscoped `npm test` sweep in
this milestone and found 12 failures, 11 of which are confirmed pre-existing and unrelated to any
member-profile work (stale DOM-text assertions in admin/release-gallery domains, a moved-doc-path
assertion, an outdated OpenAPI enum assertion). If Phase 134's green gate (PMQA-07, D-08) is
interpreted as "the entire unscoped suite must be green," it will immediately fail on this
pre-existing, out-of-scope debt that Phase 133 explicitly deferred.
**Why it happens:** D-08's wording is "focused backend + frontend tests" — ambiguous between
"the tests focused on this phase's own changes" and "a full but focused-in-time run."
**How to avoid:** Scope the green gate's test invocation to the member-profile surface
(`src/components/profile/`, `src/app/members/`, the new `TestPhase134...` Go tests, plus whatever
prior `TestPhase12[89]/13[0-3]...` tests already exist) rather than the fully unscoped suite,
consistent with how every prior phase in this milestone (128 excepted, which is the whole-feature
foundation phase) has scoped its own test runs. If the full unscoped suite genuinely must be
green for milestone closure, that is a larger, separate cleanup effort (9 known stale-assertion
failures per `.planning/phases/133-.../deferred-items.md`) that should be called out explicitly
to the user as a scope decision, not silently assumed.
**Warning signs:** A Phase-134 plan whose acceptance criteria references `npm test` (unscoped)
rather than a scoped invocation, or that silently tries to "fix" `MembershipsSection.test.tsx` /
`ResponsiveImage.config.test.ts` / the 5 admin/release-gallery failures as if they were newly
introduced.

### Pitfall 5: `media_assets` gap breaks the manifest's "media" and PMQA-05's "images" expectations
**What goes wrong:** Building the manifest and matrix against the CURRENT seed output (which has
zero media rows) would produce a manifest that under-documents PMQA-02 and a live UAT that has no
real avatar/cover images to visually inspect at PMQA-05's mobile/intermediate/widescreen/zoom
checkpoints.
**Why it happens:** The Phase-129 seed was scoped to projections/data-correctness (PMDA-*), not
media delivery (that was Phase 131/133's job, but neither phase extended the SEED itself with
new media rows — they measured against whatever pre-existed, which was already 0).
**How to avoid:** Phase 134's Wave 1 plan must explicitly add a media-seeding step (e.g. upload
a small fixture image as each member's avatar/cover via the real upload API, matching the "cover
upload is the only productionized upload surface" constraint from CLAUDE.md) before the manifest
can honestly claim to document "media" per PMQA-02.
**Warning signs:** A manifest with an empty or placeholder `media` section, or a live-UAT
checklist item for "images" that has nothing real to screenshot.

## Code Examples

### Existing evidence-harness budget-check invocation
```bash
# Source: frontend/scripts/collect-member-profile-evidence.mjs usage pattern (Phase 131/133)
docker exec team4sv30-frontend node scripts/collect-member-profile-evidence.mjs --mode budget-check
```

### Existing image-delivery verification invocation pattern
```javascript
// Source: frontend/scripts/verify-profile-image-delivery.mjs (existing)
// Checks: exact CSV class list (EXPECTED_CLASSES), exact core-width list
// (EXPECTED_CORE_WIDTHS), WEBP RIFF/WEBP signature + dimension parsing, sha256
// hashing for delivered-vs-source comparison.
```

### Existing Phase-128 mandatory-DSN Postgres test-fixture pattern (to mirror for Phase 134)
```go
// Source: backend/internal/testsupport/phase128_postgres.go (existing)
const phase128DSNEnv = "TEAM4S_PHASE128_TEST_DSN"

func OpenPhase128Postgres(t *testing.T) *pgxpool.Pool {
    t.Helper()
    if strings.TrimSpace(os.Getenv(phase128DSNEnv)) == "" {
        t.Fatalf("%s is required for Phase-128 PostgreSQL tests", phase128DSNEnv)
    }
    return openPhasePostgres(t, phase128DSNEnv, phase128DatabasePattern, "phase128_", ...)
}
```

### Existing migration Runner primitives (to drive, not reimplement)
```go
// Source: backend/internal/migrations/runner.go (existing)
func (r *Runner) Up(ctx context.Context) (int, error)          // applies all pending, in order
func (r *Runner) Down(ctx context.Context, steps int) (int, error) // rolls back N most-recent
func (r *Runner) Status(ctx context.Context) (Status, error)   // applied/pending/missing report
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Live UAT run per-phase, ad hoc | Bundled, deferred milestone-closing live UAT (V-02) | Decided 2026-08-14 (DECISIONS.md), applied through 129/130/131/132/133 | Phases 129-133 all explicitly defer live UAT to Phase 134; Phase 134 is the FIRST and ONLY point where the whole profile is verified end-to-end live |
| `STATE.md`'s `completed_phases` as an authoritative progress signal | Git commit history + phase `*-VERIFICATION.md`/evidence directories as ground truth | Discovered during this research (2026-08-16) | Planner/verifier agents should not trust `ROADMAP.md`'s "Progress" table or `STATE.md`'s counters at face value for 129-131 in this milestone; cross-check git log |

**Deprecated/outdated:**
- N/A — no library/framework deprecations apply; this is entirely first-party tooling.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The manifest's "single source" requirement (D-02) is best satisfied by generating it FROM the seed's constants (or inverting to have the seed read it) rather than maintaining two independently-authored files | Common Pitfalls #1, Architecture Patterns | Low — this is explicitly Claude's Discretion per CONTEXT.md; either mechanism is acceptable as long as genuinely single-source, and the planner is free to choose differently |
| A2 | A `fresh` migrate subcommand vs. a standalone `_test.go` file are equally valid implementations of D-04 | Alternatives Considered | Low — CONTEXT.md explicitly defers this to Claude's Discretion |
| A3 | The 145 up/down migration pairs will mostly apply cleanly in a full down-chain run, with at most a small number of latent bugs to fix | Common Pitfalls #3 | Medium — if many down migrations are broken, this could expand Phase 134's scope significantly beyond "verification"; recommend budgeting an exploratory task early in the phase to surface this risk before committing to a wave plan |
| A4 | "Focused backend + frontend tests" in D-08 means member-profile-scoped tests, not the full unscoped suite | Common Pitfalls #4 | Medium — if the user actually intends the FULL suite to be green before milestone close, Phase 134's scope must grow to include reconciling ~9 pre-existing stale-assertion failures documented in `133-.../deferred-items.md`; this should be confirmed with the user during planning/discuss, not silently assumed either way |

## Open Questions (RESOLVED)

1. **RESOLVED (2026-08-16, plan-phase orchestration, user-confirmed).** Does D-08's "focused
   backend + frontend tests" include the ~9 pre-existing stale-assertion failures documented in
   Phase 133's `deferred-items.md`?
   - Resolution: NO — scoped to member-profile-relevant tests only (matches prior-phase
     precedent). The ~9 known failures are surfaced as an explicit `KNOWN_DEFERRED` note in the
     gate output, not silently fixed or silently ignored. See `134-VALIDATION.md`'s
     "User-Confirmed Scope Decisions (2026-08-16)" section and `134-04-PLAN.md` Task 1/3 for the
     implementation.
   - What we know: Every prior phase in this milestone scoped its test runs narrowly and
     explicitly deferred these as out-of-scope; PMQA-07's requirement text says "focused."

2. **RESOLVED (2026-08-16, plan-phase orchestration, user-confirmed).** Should the ROADMAP.md
   "Progress" table / STATE.md counter drift be corrected as part of Phase 134, or left for a
   separate housekeeping pass?
   - Resolution: YES — corrected as part of Phase 134. A small, cheap doc-fix task is included.
     See `134-VALIDATION.md`'s "User-Confirmed Scope Decisions (2026-08-16)" section and
     `134-04-PLAN.md` Task 3 for the implementation.
   - What we know: The drift is real, documented above, and does not block execution.

3. **RESOLVED (2026-08-16, pattern-mapper research).** Exact media-fixture shape for the seed
   extension (Pitfall 5).
   - Resolution: The seed extension calls the existing, already-productionized
     `POST /api/v1/me/profile/story-images` endpoint (`backend/internal/handlers/app_profile_story_image.go`),
     a real member-owned `media_assets` upload path distinct from anime-cover upload — not a new
     upload surface. See `134-PATTERNS.md`'s Open Question 3 answer and `134-01-PLAN.md` Task 1
     for the implementation.
   - What we know: `media_assets` has `owner_member_id`, `visibility_id`, `review_status_id`
     columns; CLAUDE.md states "only cover upload is currently productionized" (referring to
     anime cover art, not member-profile media — the story-image endpoint is the correct,
     separate, already-shipped surface for the latter).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Compose stack (`team4sv30-*`) | All waves | Yes [VERIFIED: `docker compose ps`] | services healthy/up, `team4sv30-backend`/`-db`/`-frontend`/`-keycloak` all running | — |
| Node.js (in `team4sv30-frontend` container) | Seed, evidence, image-verify scripts | Yes [VERIFIED] | v20.20.2 | — (no host Node; must run via `docker exec`) |
| Go 1.25 (backend build context) | Migration proof, matrix suite | Yes (via backend container's `go run`) | 1.25.0 per go.mod | Host has no `go` binary [VERIFIED: `go: command not found`] — must build/test inside the backend container |
| PostgreSQL 16 | Ephemeral migration DB, shared reset | Yes [VERIFIED] | `postgres:16` image, live DB confirmed reachable via `team4s`/`team4s_v2` creds | — |
| Disk space on VM | Ephemeral DB creation/teardown | Yes, improved since context-gathering | 6.2 GB free / 83% used [VERIFIED: `df -h /`, 2026-08-16] (CONTEXT.md's 2026-08-14 note of "~1.6 GB free / 96%" is stale — situation has eased, likely after a Docker prune) | Still conservative: avoid leaving throwaway DBs/dumps around; `docker system df` shows 3.3 GB reclaimable in images if space gets tight again |
| SSH tunnel to `127.0.0.1:3300` | Live UAT (D-09) | Not independently verifiable from this research session (requires the Windows-side tunnel to be active) | — | Per CLAUDE.md, this is the canonical login/UAT path; the executing agent must confirm tunnel liveness at UAT time, not during research/planning |

**Missing dependencies with no fallback:** None identified — the phase's tooling needs are fully
satisfiable with what's already installed/running.

**Missing dependencies with fallback:** Host `go`/`node` binaries are absent, but the established
fallback (run everything inside the relevant container via `docker exec`/`docker compose exec`)
is already the standard workflow for every prior phase in this milestone.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend framework | Go `testing` + `stretchr/testify`, Postgres-backed via mandatory-DSN pattern |
| Frontend framework | Vitest ^3.2.4 + `@testing-library/react` ^16.3.0 |
| Config file | `backend/internal/migrations/runner_test.go` (unit-level, no DSN needed); `frontend/vitest.config.ts` |
| Quick run command | `docker exec team4sv30-backend go test ./internal/repository/ -run Phase134` (once written); `docker exec team4sv30-frontend npm run typecheck` |
| Full suite command | `docker exec team4sv30-backend go build ./... && go vet ./...`; `docker exec team4sv30-frontend npm run lint && npm test && npm run build` (SCOPED to member-profile files per Open Question 1, not blindly unscoped) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PMQA-01 | Fixture/seed contract is versioned + idempotent | integration (seed script self-check) | `docker exec team4sv30-frontend node scripts/seed-member-profile-fixtures.mjs` (run twice, expect `RESULT: PASS` both times) | Extend existing ✅ |
| PMQA-02 | Manifest documents identity/visibility/roles/memberships/projects/badges/media/content-lengths | new manifest + a test asserting seed output matches manifest | New `scripts/member-profile-fixture.manifest.json` + a `TestPhase134ManifestMatchesSeedOutput`-style check | ❌ Wave 1 |
| PMQA-03 | Migration fresh/up/down proof, no synthetic-row preservation | integration (new Go tooling) | `docker exec team4sv30-backend go test ./internal/migrations/ -run Phase134Fresh` (new) | ❌ Wave 2 |
| PMQA-04 | anonymous/hidden/owner/refresh-only/missing/sparse/dense/error/pagination matrix | integration (Postgres-backed) | `docker exec team4sv30-backend go test ./internal/repository/ -run Phase134` (new) | ❌ Wave 3 |
| PMQA-05 | Live UAT: mobile/intermediate/widescreen, keyboard, 400% zoom, images, loading, real route | manual-only (browser), semi-automated evidence capture | `docker exec team4sv30-frontend node scripts/collect-member-profile-evidence.mjs --mode budget-check` + `verify-profile-image-delivery.mjs` + human checklist walkthrough via `127.0.0.1:3300` | Harnesses exist ✅; checklist doc ❌ Wave 6 |
| PMQA-06 | Reset/seed/media leave canonical ownership + tracked badges unchanged | integration (hash comparison) | New script comparing sha256 of `frontend/public/history-event-badges*`/`member-achievement-badges` before/after reset | ❌ Wave 5 |
| PMQA-07 | typecheck/lint/focused tests/build/git diff --check all green | CI-style gate script | `npm run typecheck && npm run lint && npm test -- <scoped paths> && npm run build && git diff --check`; `go build ./... && go vet ./... && go test ./internal/repository/... -run 'Phase12|Phase13'` (scoped) | Commands exist individually ✅; orchestration script ❌ Wave 4 |

### Sampling Rate
- **Per task commit:** run the specific new test file/command the task introduced (e.g. just the
  new manifest check, or just the new fresh-proof test) — mirrors every prior phase's pattern of
  task-scoped verification.
- **Per wave merge:** re-run that wave's full command set (e.g. all of Wave 3's `TestPhase134...`
  matrix tests together).
- **Phase gate:** the full D-08 green-gate script (scoped per Open Question 1) must be green
  before the bundled live UAT (Wave 6) begins, and again before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `scripts/member-profile-fixture.manifest.json` — does not exist yet; blocks PMQA-02 and is
      a read-dependency for Wave 3's matrix tests.
- [ ] `backend/internal/migrations/fresh_proof_test.go` (or equivalent) — no fresh/DROP-DATABASE
      tooling exists anywhere in the codebase today; blocks PMQA-03.
- [ ] A `TEAM4S_PHASE134_TEST_DSN`-style env var + a `testsupport` helper mirroring
      `phase128_postgres.go`'s mandatory-DSN pattern — needed by both Wave 2 and Wave 3 for their
      ephemeral/matrix databases.
- [ ] `scripts/reset-member-profile-fixture.mjs` (or `.sh`) — the closest existing analog
      (`reset-local-schema-cutover-data.ps1`) is PowerShell-only and broader-scoped than what
      D-05 requires; needs a Linux/container-runnable, narrowly-scoped rewrite.
- [ ] Media-seeding step inside the seed script (Pitfall 5) — `media_assets` is currently 0 rows
      for both fixture profiles; must exist before PMQA-02's manifest can honestly document
      "media" or PMQA-05's live UAT can inspect real images.

## Security Domain

### Applicable ASVS Categories

This phase adds no new user-facing endpoint, auth path, or input-handling surface — it is
verification/rollout tooling operating against an already-hardened Phase 128 access-control
foundation. Most ASVS categories are therefore N/A; the few applicable ones are about not
regressing what Phase 128 already locked down.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (new surface) | Reuses existing Keycloak direct-grant flow already in the seed script; no new auth code |
| V3 Session Management | No | No new session handling introduced |
| V4 Access Control | Yes (verification only) | The matrix suite (D-07) is EXACTLY an access-control regression test — it must continue asserting the Phase-128 deny-first/neutral-404 behavior (`TestGetPublicMemberProfileDenialDoesNotLoadDetails`-style pattern) for the "hidden"/"missing" cases, not weaken it |
| V5 Input Validation | Minimal | Manifest JSON parsing (new) should fail closed on malformed/missing fields rather than silently defaulting, since a silently-wrong manifest would produce a false-green matrix |
| V6 Cryptography | Minimal | Protected-asset hash guard (D-06) should use `sha256` (already the pattern in `verify-profile-image-delivery.mjs`'s `sha256()` helper) — do not hand-roll a weaker checksum |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A destructive reset script accidentally run against the wrong database/environment | Tampering | Mirror `reset-local-schema-cutover-data.ps1`'s existing guard pattern: verify `current_database()`/`current_user` identity AND `RUNTIME_PROFILE` before any TRUNCATE; require an explicit `--confirm-local`-style flag |
| A silently-passing verification matrix (e.g. manifest defaults masking a missing field as "ok") producing false confidence at milestone close | Repudiation / Tampering (of the evidence itself) | Manifest parsing and matrix assertions must fail loudly (non-zero exit, explicit error) on any missing/malformed expectation, not default-and-continue |
| Reusing a live-DB credential/token inside the ephemeral migration-proof DB tooling, risking accidental cross-connection | Tampering / Elevation of Privilege | Use a fully separate DSN/env var (`TEAM4S_PHASE134_TEST_DSN`, mandatory, no fallback to `DATABASE_URL`) per the existing Phase-128 pattern |

## Sources

### Primary (HIGH confidence)
- Local repository ground truth (git log, file reads) — `backend/internal/migrations/runner.go`,
  `backend/cmd/migrate/main.go`, `backend/internal/testsupport/phase128_postgres.go`,
  `scripts/seed-member-profile-fixtures.mjs`, `scripts/README-seed.md`,
  `scripts/reset-local-schema-cutover-data.ps1`, `frontend/scripts/collect-member-profile-evidence.mjs`,
  `frontend/scripts/verify-profile-image-delivery.mjs`, `database/migrations/*.sql` (290 files,
  145 up/down pairs verified matched), `.planning/phases/129-.../129-VERIFICATION.md`,
  `.planning/phases/131-.../evidence/BUDGETS.md`, `.planning/phases/133-.../deferred-items.md`,
  `.planning/config.json`, `backend/go.mod`, `frontend/package.json`
- Live environment probes — `docker compose ps`, `docker exec team4sv30-db psql ...` (member/anime/
  media_assets row counts), `docker exec team4sv30-frontend node --version`, `df -h /`,
  `docker system df`

### Secondary (MEDIUM confidence)
- None — no external web sources were needed; this research is entirely codebase/git-history
  driven per the phase's brownfield, no-new-dependency nature.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - fully verified via direct file reads and container probes, zero new
  dependencies
- Architecture: HIGH - directly inspected existing `Runner`, seed script, evidence harnesses, and
  reset-script analog
- Ground-truth phase status (129/130/131): HIGH - cross-verified via `git log -p`, `*-VERIFICATION.md`,
  locked-budget code artifacts actively depended on by Phase 133
- Pitfalls: HIGH for #1/#2/#4/#5 (directly observed in code/docs); MEDIUM for #3 (the 145-pair
  down-chain has not actually been run in this research session — it is a documented risk, not a
  confirmed failure)

**Research date:** 2026-08-16
**Valid until:** 2026-08-30 (14 days — this research is tightly coupled to the exact current state
of an actively-executing milestone; re-verify git log / row counts / evidence files if planning
is delayed past that window)
