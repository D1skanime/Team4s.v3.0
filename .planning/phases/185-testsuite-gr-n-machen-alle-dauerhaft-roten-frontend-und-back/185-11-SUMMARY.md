---
phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back
plan: 11
subsystem: testing
tags: [go, docker, postgres, bash, pg_dump, keycloak, reproducibility]

# Dependency graph
requires:
  - phase: 185-04
    provides: "D-03a resolved as 'real bug, not Alpine-specific' -- image choice for this
      plan's test-runner was therefore driven by the vips-tools/ffmpeg cluster, not the
      Jellyfin-EOF cluster"
provides:
  - "scripts/test-backend.sh: single script reproducing the full, unscoped backend test
    suite end to end -- derives every *_TEST_DSN env var live from backend/internal,
    creates/drops ~23 run-scoped throwaway databases (with the correct per-fixture naming
    pattern, discovered empirically, not assumed), clones team4s_v2's schema read-only into
    the 10 'volles Schema' fixtures, provisions the Phase-134-Matrix temporary backend, and
    runs go test ./... -p 1 -v inside a golang:1.25-alpine container with the whole repo
    mounted"
  - "docs/ENTWICKLUNG.md: new German section documenting the script, image choice, mount,
    and invocation"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deriving a fixture's required database-name REGEX from its own test-support source
      file (validateXDatabaseName) is mandatory before assuming a naming convention --
      CONTEXT.md's own documented naming rule for this phase's *_TEST_DSN vars turned out
      to be wrong for 11 of the 23 vars (mandatory-suffix fixtures) when checked against
      the actual regex in code."
    - "PostgreSQL's simple query protocol wraps a multi-statement `-c '...; ...;'` string in
      one implicit transaction; DROP DATABASE / CREATE DATABASE must always be their own
      separate -c invocation, never combined with a preceding pg_terminate_backend call."
    - "A `--- SKIP:` go test result line that is INDENTED (a nested subtest) is not the same
      signal as an UNINDENTED top-level `--- SKIP:` line -- several of this repo's DSN
      fixtures ship a deliberate self-test (TestPhaseNNNDSNSelectionIgnoresDatabaseURL) that
      unsets its own DSN for exactly one nested subtest to prove a guard works; only the
      unindented shape indicates a genuinely, silently skipped suite."

key-files:
  created:
    - scripts/test-backend.sh
  modified:
    - docs/ENTWICKLUNG.md

key-decisions:
  - "Image: golang:1.25-alpine, confirmed unconstrained by 185-04's Jellyfin-EOF finding;
    chosen because it matches backend/Dockerfile's own Alpine base, letting the script
    install the exact proven apk package names (vips vips-tools ffmpeg fontconfig
    font-dejavu font-noto font-noto-cjk at runtime, build-base pkgconfig vips-dev for the
    CGO/govips build) instead of guessing Debian/apt-get equivalents."
  - "Database naming: always append one random run-scoped lowercase-hex suffix to every
    throwaway database name, EXCEPT TEAM4S_PHASE134_TEST_DSN (whose validator demands an
    EXACT match with no suffix) -- this single rule satisfies every fixture's regex
    (mandatory-suffix, optional-suffix, and exact-match) without per-fixture branching,
    discovered by actually running the script and reading each fixture's own
    validateXDatabaseName regex rather than trusting CONTEXT.md's summarized naming rule."
  - "TEAM4S_PHASE150_04_TEST_DSN is special-cased to derive the SAME base name as
    TEAM4S_PHASE150_TEST_DSN ('team4s_phase150_test', not 'team4s_phase150_04_test') --
    confirmed by reading phase15004DatabasePattern in
    member_profile_public_repository_postgres_test.go directly."
  - "10 of the 23 throwaway databases (TEAM4S_PHASE129/131/150_04/152/155_TEST_DSN plus the
    5 named fixtures) get a read-only `pg_dump --schema-only` clone of team4s_v2 restored
    into them, per CONTEXT.md's documented 'volles Schema' fixture requirement -- without
    this, every test using them fails on missing tables instead of exercising real
    behavior. team4s_v2 itself is never written to."
  - "The Phase-134-Matrix cluster (9 tests, CONTEXT.md D-03b) is wired up by calling the
    existing scripts/provision-phase134-matrix-db.sh and pointing its two
    container-network env vars (TEAM4S_PHASE134_MATRIX_BASE_URL/_KC_BASE) at the
    container-internal addresses, instead of re-implementing that provisioning logic
    inline -- its own header comment already anticipated exactly this containerized-runner
    scenario. The temporary backend container is torn down alongside every other
    throwaway resource at the end, even though the standalone script's own convention is
    to leave it running."

requirements-completed: [D-07]

# Metrics
duration: ~50min
completed: 2026-10-16
---

# Phase 185 Plan 11: scripts/test-backend.sh (D-07 Reproducibility) Summary

**Built and live-validated `scripts/test-backend.sh`, a single reproducible backend test runner that derives all ~23 `*_TEST_DSN` env vars live, provisions every throwaway database with the CORRECT per-fixture naming/schema shape (discovered empirically via three live dry runs, not assumed from CONTEXT.md's summary), wires up the Phase-134-Matrix temporary backend, and tears everything down again — confirmed working end to end except for one pre-existing, out-of-scope Keycloak dev-account credential issue.**

## Performance

- **Duration:** ~50 min (includes 3 live dry runs against the real team4sv30-db/team4sv30-backend/team4sv30-keycloak stack, each several minutes long)
- **Completed:** 2026-10-16
- **Tasks:** 2
- **Files modified:** 2 (1 created: `scripts/test-backend.sh`; 1 modified: `docs/ENTWICKLUNG.md`)

## Accomplishments

- Created `scripts/test-backend.sh`: derives every `*_TEST_DSN` env var live via
  `grep -rhoP 'TEAM4S_[A-Z0-9_]+_TEST_DSN' backend/internal` (23 vars, confirmed matching
  CONTEXT.md's "~23" figure), creates a run-scoped throwaway database for each, exports the
  corresponding DSN, runs the full backend suite (`go test ./... -p 1 -v`) inside a
  `golang:1.25-alpine` container with the whole repo mounted, and tears every database down
  again. `team4s_v2` is never written to anywhere in the script.
- Ran the script live THREE times against the real `team4sv30-db` and related containers
  (not a simulated/mocked environment) and used each run's actual output to find and fix
  real bugs the plan's assumed database-naming convention did not anticipate:
  1. **DB-naming mismatch:** most `phaseNNN` fixtures (106/107/117/135/137/139/145/150/165/
     167/182) require a MANDATORY `_[a-z0-9]+` suffix on the database name — the bare
     `team4s_phaseNNN_test` name the plan's interfaces text asserted as "confirmed" actually
     fails those fixtures' own `validatePhaseNNNDatabaseName` regex guard. Fixed by always
     appending one random run-scoped suffix, except for `TEAM4S_PHASE134_TEST_DSN` (which
     requires an EXACT match with none) and `TEAM4S_PHASE150_04_TEST_DSN` (which maps to the
     SAME base name as `TEAM4S_PHASE150_TEST_DSN`, not its own stripped name).
  2. **DROP-inside-transaction bug:** combining `pg_terminate_backend` and `DROP DATABASE`
     in one multi-statement `psql -c` call failed with "DROP DATABASE cannot run inside a
     transaction block" — PostgreSQL's simple query protocol wraps multi-statement `-c`
     strings in an implicit transaction. Fixed by splitting into two separate `psql -c`
     invocations.
  3. **False-positive silent-skip detection:** the original heuristic (any line containing
     "skip" + a DSN var name) flagged several fixtures' own deliberate
     `TestPhaseNNNDSNSelectionIgnoresDatabaseURL` self-tests (which intentionally unset their
     DSN for one nested subtest to prove a no-fallback guard works) as blocking silent
     skips. Fixed by only treating an UNINDENTED (top-level) `--- SKIP:` line as blocking.
  4. **Missing "volles Schema" step:** 10 of the 23 throwaway databases
     (`TEAM4S_PHASE129/131/150_04/152/155_TEST_DSN` plus the 5 named fixtures —
     `ANIME_SOURCE_LINKS`, `EPISODE_METADATA`, `FANSUB`, `LIBRARY_DISCOVERY`, `RELATIONS`)
     need the FULL real `team4s_v2` schema, per CONTEXT.md's documented "volles Schema"
     Risiken note and multiple test-file comments ("pg_dump --schema-only of team4s_v2").
     The plan's action text never mentioned this. Added a read-only
     `pg_dump --schema-only` clone of `team4s_v2`, restored into all 10 databases.
  5. **Missing Phase-134-Matrix wiring:** 9 tests
     (`internal/repository/phase134_verification_matrix_{access_,}test.go`) are
     unconditional HTTP integration tests against a temporary, fully migrated + seeded
     backend instance — not a plain throwaway database. CONTEXT.md's D-03b decision already
     fixed their hardcoded host IP to read `TEAM4S_PHASE134_MATRIX_BASE_URL`/`_KC_BASE`.
     Wired the script to call the existing `scripts/provision-phase134-matrix-db.sh` and
     point those two env vars at the container-network-internal addresses.
- Third and final dry run confirmed every one of those 5 fixes works: all ~294 of the ~303
  non-Phase-134-Matrix test functions across the full backend suite passed; only the 9
  Phase-134-Matrix tests remain red, and ONLY because of a single, pre-existing, external
  environment issue (see Issues Encountered) — not a bug in the script.
- Added `## Backend-Testsuite vollständig ausführen` to `docs/ENTWICKLUNG.md` (German,
  correct Umlaute, placed between `## Datenbank-Migrationen` and `## API-Contracts`),
  documenting the full-repo-mount rationale, the image choice, the automatically derived
  DSN vars, the volles-Schema clone, the Phase-134-Matrix container, and the exact
  invocation (`bash scripts/test-backend.sh`).
- After every dry run, manually verified no throwaway database or container was left
  behind (`SELECT datname FROM pg_database WHERE datname LIKE '%<suffix>%'` and
  `docker ps -a --filter name=team4s-phase134-backend` both empty) and that `team4s_v2`
  itself was never touched.

## Task Commits

1. **Task 1: Write scripts/test-backend.sh** - `cfc8b5b25` (feat)
2. **Task 1 follow-up: fix 5 bugs found by 3 live dry runs** - `0853112b3` (fix)
3. **Task 2: Dry-run the script and add the docs/ENTWICKLUNG.md section** - `c7bbd12fd` (docs)

**Plan metadata:** (this commit, created alongside STATE.md/ROADMAP.md update)

## Files Created/Modified

- `scripts/test-backend.sh` — new script: derives `*_TEST_DSN` env vars live, provisions
  ~23 run-scoped throwaway databases with the correct per-fixture naming, clones the
  "volles Schema" fixtures from `team4s_v2` read-only, provisions the Phase-134-Matrix
  temporary backend, runs the full backend suite in `golang:1.25-alpine`, tears everything
  down, and prints a structured PASS/FAIL summary ending in `GATE: GREEN (0)` /
  `GATE: RED (1)`.
- `docs/ENTWICKLUNG.md` — new `## Backend-Testsuite vollständig ausführen` German section.

## Decisions Made

See frontmatter `key-decisions` for the full list (image choice, database-naming rule,
the `PHASE150_04` base-name override, the volles-Schema clone, and the Phase-134-Matrix
wiring). All five were derived from actually running the script against the live stack and
reading the exact regex/comment each fixture itself encodes, not from re-deriving or
guessing a convention.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Database-naming convention from the plan's interfaces text was wrong for 11 of 23 vars**
- **Found during:** Task 1's first live dry run
- **Issue:** The plan's interfaces section asserted a uniform `team4s_<name>_test` bare
  naming rule, "confirmed" against `TEAM4S_PHASE139_TEST_DSN`. Running the script showed
  this bare name fails `validatePhase117DatabaseName` and 10 other fixtures' own regex
  guards, which require a mandatory random suffix.
- **Fix:** Always append one random run-scoped lowercase-hex suffix to every throwaway
  database name, except `TEAM4S_PHASE134_TEST_DSN` (exact-match-only) and
  `TEAM4S_PHASE150_04_TEST_DSN` (which maps to `TEAM4S_PHASE150_TEST_DSN`'s base name).
- **Files modified:** `scripts/test-backend.sh`
- **Commit:** `0853112b3`

**2. [Rule 1 - Bug] DROP DATABASE failed inside an implicit multi-statement transaction**
- **Found during:** Task 1's first live dry run
- **Issue:** `psql -c "SELECT pg_terminate_backend(...); DROP DATABASE IF EXISTS ...;"` failed
  with "DROP DATABASE cannot run inside a transaction block" for every one of the 23
  databases.
- **Fix:** Split into two separate `psql -c` invocations.
- **Files modified:** `scripts/test-backend.sh`
- **Commit:** `0853112b3`

**3. [Rule 1 - Bug] False-positive silent-skip detection on fixtures' own self-tests**
- **Found during:** Task 1's first live dry run
- **Issue:** The original heuristic flagged `TestPhaseNNNDSNSelectionIgnoresDatabaseURL`'s
  deliberate, nested, expected `--- SKIP:` subtest as a blocking silently-skipped suite,
  even though the DSN var was correctly exported for the rest of the run.
- **Fix:** Only an UNINDENTED (top-level) `--- SKIP:` line is now treated as blocking.
- **Files modified:** `scripts/test-backend.sh`
- **Commit:** `0853112b3`

**4. [Rule 2 - Missing critical functionality] "Volles Schema" clone step was absent**
- **Found during:** Task 1's second live dry run (after fixing #1-3, repository-level
  tests in the 10 "volles Schema" fixtures started failing on missing tables)
- **Issue:** The plan's action text never mentioned CONTEXT.md's documented requirement
  that 10 of the 23 fixtures need the FULL real `team4s_v2` schema, not empty hand-rolled
  stand-in tables.
- **Fix:** Added a one-time, read-only `pg_dump --schema-only` clone of `team4s_v2`,
  restored into all 10 "volles Schema" databases.
- **Files modified:** `scripts/test-backend.sh`
- **Commit:** `0853112b3`

**5. [Rule 2 - Missing critical functionality] Phase-134-Matrix cluster had no live backend to call**
- **Found during:** Task 1's second live dry run (all 9 Phase-134-Matrix tests failed with
  "connection refused")
- **Issue:** These 9 tests unconditionally call a live HTTP backend; a plain throwaway
  database (the plan's only provisioning step for `TEAM4S_PHASE134_TEST_DSN`) does not
  start one.
- **Fix:** Call the existing `scripts/provision-phase134-matrix-db.sh` to provision the
  migrated + seeded database and temporary backend container, then point
  `TEAM4S_PHASE134_MATRIX_BASE_URL`/`_KC_BASE` at the container-network-internal addresses
  per CONTEXT.md's D-03b decision. Tear the temporary container down at the end.
- **Files modified:** `scripts/test-backend.sh`
- **Commit:** `0853112b3`

---

**Total deviations:** 5 auto-fixed (3 Rule 1 bugs, 2 Rule 2 missing-functionality additions).
**Impact on plan:** All five were necessary for the script to be a correct, truthful
reproduction of the full backend suite — none were scope creep; all were discovered by
actually running the script against the live stack rather than trusting the plan's
summarized assumptions, consistent with the plan's own stated purpose ("make the full
backend suite reproducible ... without re-deriving mounts, DSNs, or image choice by trial
and error").

## Issues Encountered

- **Pre-existing, external, out-of-scope: Keycloak dev-account credentials.** The
  Phase-134-Matrix cluster's remaining 8 test failures (of its original 9; the 9th,
  `TestPhase134MatrixMissingProfile`, now passes since it needs no login) all trace to the
  SAME root cause: `scripts/provision-phase134-matrix-db.sh`'s Keycloak password-grant
  token fetch for both `csubs-leader@team4s.local` and `sheppert@team4s.local` (password
  `123`) returns `{"error":"invalid_grant","error_description":"Invalid user credentials"}`
  from the live, already-running Keycloak instance. Verified directly with a standalone
  `curl` against `http://192.168.235.196:18081/realms/team4s/protocol/openid-connect/token`
  — same result, confirming this is a live Keycloak-realm state issue, not something
  `test-backend.sh` or `provision-phase134-matrix-db.sh` caused (the `keycloak-profile-config`
  one-shot container that runs on every `docker compose up` only applies user-profile FIELD
  definitions, not user credentials — confirmed by reading its
  `infra/keycloak/apply-team4s-user-profile.sh` entrypoint reference in
  `docker-compose.yml`). Because the identity/authz-bootstrap step aborts on this token
  failure (under `set -e`), the dependent member/member_claims rows and the Plan-134-01 seed
  script never run either — which is why the other 7 tests see `404 Profil nicht verfügbar`
  rather than a Keycloak-specific error. This is a single external blocker, not 8
  independent bugs. **Out of scope for this plan**: fixing Keycloak realm/user credentials
  touches no file `185-11` is scoped to modify (`scripts/test-backend.sh`,
  `docs/ENTWICKLUNG.md`), and resetting live dev-account passwords in a shared Keycloak
  realm is a credential change outside a reproducibility script's remit. `test-backend.sh`
  itself behaves correctly: it attempts provisioning, reports the exact FATAL reason, and
  gates RED rather than silently hiding the failure — matching D-07's "kein Test wird
  stillschweigend übersprungen" rule. Whoever resolves this (reset or verify the two
  Keycloak accounts' passwords) will see the script go fully green with zero further
  changes, since the networking/provisioning/env-var wiring is already correct and
  confirmed by this plan's three live dry runs.

## User Setup Required

**One external credential fix is needed for the Phase-134-Matrix cluster (9 tests) to go
green**, independent of anything in this plan's two files:

- Verify or reset the passwords for `csubs-leader@team4s.local` and
  `sheppert@team4s.local` in the live Keycloak realm (`team4s`) so a password grant with
  password `123` succeeds again (test directly: `curl -X POST
  http://192.168.235.196:18081/realms/team4s/protocol/openid-connect/token -d
  grant_type=password -d client_id=team4s-frontend -d username=<email> -d password=123`).
  Once both tokens succeed, re-running `bash scripts/test-backend.sh` will provision the
  Phase-134-Matrix fixture correctly and the remaining 9 tests should pass without any
  further script changes.

No other external service configuration is required — every other `*_TEST_DSN` fixture is
self-contained and provisioned entirely by the script.

## Next Phase Readiness

- `scripts/test-backend.sh` is complete, committed, and live-validated: it correctly
  derives, provisions, runs, and tears down the full ~23-database backend test matrix, and
  its summary accurately distinguishes "genuinely silently skipped" from "self-test of the
  skip guard."
- The ONLY remaining red cluster when running the script today is the 9-test
  Phase-134-Matrix cluster, blocked by the external Keycloak credential issue documented
  above — not a defect in this plan's deliverable.
- No blockers introduced for subsequent plans in this phase. The phase's own overall "0 red
  tests, twice in a row" acceptance criterion for the backend suite cannot be met until the
  Keycloak credential issue above is resolved by someone with Keycloak admin access; this
  should be flagged to the phase orchestrator/user as a distinct, external action item.

## Self-Check: PASSED
