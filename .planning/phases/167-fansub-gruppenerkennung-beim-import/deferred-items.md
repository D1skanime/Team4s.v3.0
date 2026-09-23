# Deferred Items — Phase 167

Out-of-scope findings discovered during execution, not fixed per the SCOPE BOUNDARY rule
(only auto-fix issues directly caused by the current task's changes).

## Plan 167-02

- `TestFansubRepository_PublicProfileSourceInvariants`
  (`backend/internal/repository/fansub_repository_test.go`) fails on `main` independent
  of any Plan 167-02 change: it is a source-inspection test (`os.ReadFile` +
  `strings.Contains`, the CLAUDE.md-documented legacy pattern) asserting the literal
  substring `"FROM anime_media am"` is present in `fansub_repository.go`. That substring
  is no longer present (last touched by Phase 163's `c3109294`, unrelated to Phase 167).
  Pre-existing, unrelated to fansub-group matching — not fixed here.
- A block of Postgres-DSN-gated tests outside the `repository` package's Phase-167 files
  (`TestLoadRoleVolumeBadgesPostgresProgressBoundaries` and siblings, `TEAM4S_PHASE128_TEST_DSN`)
  hard-fail (`t.Fatalf`) instead of skipping cleanly when their DSN env var is unset — a
  pre-existing convention inconsistency in an unrelated phase's test file, not touched by
  Plan 167-02.
- `TestPhase134Matrix*` tests require a live backend reachable at
  `http://192.168.235.196:18093` and a working Keycloak password grant for
  `sheppert@team4s.local`; both are unavailable in the scratch `golang:1.25-alpine`
  build container used for this headless run (no live services, no network route to the
  LAN backend port). Pre-existing environment dependency, unrelated to Phase 167.
