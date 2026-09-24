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

## Quick task 260924-ksv (GAP-13)

- `frontend/src/lib/cssCustomProperties.guard.test.ts` fails on `main` independent of any
  260924-ksv change: its `KNOWN_NON_CSS_TEXTUAL_MENTIONS` allow-list hardcodes
  `roleCatalog.accessibility.test.ts:282` for the `--surface-muted` textual mention
  (Phase 148, commit `281182d1`), but that file's matching `it(...)` description has since
  drifted to line 268 (unrelated prior edits shifted the line count). Neither
  `EpisodeImportEpisodeGroup.tsx`/`.test.tsx`, `EpisodeImportMappingRow.tsx`, `page.tsx`, nor
  `page.module.css` touch CSS custom properties (`var(--...)`) or
  `roleCatalog.accessibility.test.ts` — pre-existing line-number drift, not caused by this
  task. `npx tsc --noEmit` and `npm run lint` were run standalone (not chained after `npm
  test`) to confirm this task's own changes are clean.
- `npm run lint` reports 3 pre-existing errors unrelated to this task, both predating
  260924-ksv (last touched commit `10e6d216`, 2026-08-25): two `no-require-imports` errors in
  `/app/capture-responsive.cjs` and one `react/no-unescaped-entities` error in
  `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx`. Not fixed here (out of scope).
