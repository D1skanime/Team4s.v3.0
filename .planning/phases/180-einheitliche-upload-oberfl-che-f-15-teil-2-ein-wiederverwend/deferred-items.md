# Deferred Items — Phase 180

Out-of-scope findings discovered while verifying Plan 180-12 Task 1's `go test ./backend/...`
and `npm --prefix frontend run lint` full-gate acceptance criteria. None of these are caused by
any of Phase 180's eleven plans (180-01 through 180-11) — all are already documented as
pre-existing and independently verified unrelated in Phase 179's own
`deferred-items.md` (`.planning/phases/179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht/deferred-items.md`),
the immediately preceding phase. Re-confirmed here because Plan 180-12 Task 1 is the first
full-suite gate run since Phase 179 closed, and the acceptance criterion's "all exit 0" wording
would otherwise be misread as newly broken by this phase.

## 1. `TestPhase141RevokedDelegationImmediateEffect` / `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes`

- **Symptom:** `permission cache: Action "release_version_media.reorder" fehlt in
  role_capabilities und ist keine standalone-Action — Startup abgebrochen`
- **Root cause:** Both fixtures' hardcoded capability-catalog maps are missing
  `permissions.ActionReleaseVersionMediaReorder` (migration 0172, an older action unrelated to
  this phase's upload-primitive work). Documented and verified pre-existing in Phase 179's
  deferred-items.md item 1; none of Phase 180's plans touch the permissions package, the
  capability registry, or either fixture file.
- **Action:** Still not fixed — carried forward, same as Phase 179 left it.

## 2. Missing `TEAM4S_PHASE128_TEST_DSN` / `TEAM4S_PHASE134_TEST_DSN` / `TEAM4S_PHASE134_MIGRATION_DSN`

- **Symptom:** `TEAM4S_PHASE128_TEST_DSN is required for Phase-128 PostgreSQL tests` and the
  equivalent Phase-134 migration-DSN messages, across `internal/migrations` and
  `internal/repository` (member archive, point totals, role volume, public access/slug,
  Phase-134 verification matrix, Phase-143 role-capability-defaults-reset).
- **Root cause:** These tests require dedicated ephemeral Postgres DSNs passed via mandatory
  env vars that are not set when running a plain `go test ./...`. Documented pre-existing in
  Phase 179's deferred-items.md item 2. No Phase 180 plan touches any of these packages.
- **Action:** Not fixed — pre-existing environment/tooling gap.

## 3. Keycloak/network-dependent `TestPhase134Matrix*` tests

- **Symptom:** `dial tcp 192.168.235.196:18093: connect: connection refused` and
  `keycloak password grant for sheppert@team4s.local: {"error":"invalid_grant",...}`.
- **Root cause:** These tests expect a live backend listening on port 18093 and valid Keycloak
  credentials for the `sheppert` fixture user, both external to any phase's normal `go test`
  run. Documented pre-existing in Phase 179's deferred-items.md item 3.
- **Action:** Not fixed — pre-existing environment dependency.

## 4. Missing Jellyfin audit fixture files

- **Symptom:** `open ../../../docs/audits/2026-09-15-jellyfin12/fixtures/11eyes-series.json: no
  such file or directory` in `admin_episode_import_test.go`, `jellyfin_media_source_test.go`,
  `jellyfin_source_batch_test.go`.
- **Root cause:** The backend Docker service only mounts `./backend` as `/app` — the repo-root
  `docs/` directory referenced by these tests via a relative `../../../docs/...` path is not
  present inside the container filesystem (confirmed via `find / -maxdepth 3 -iname docs` inside
  `team4sv30-backend`: no match). Documented pre-existing in Phase 179's deferred-items.md
  item 4; unrelated to any upload/primitive work in Phase 180.
- **Action:** Not fixed — pre-existing container-mount limitation, unrelated to permissions or
  media-upload handlers.

## Resolution for Plan 180-12 Task 1

All four items above were present, unchanged, and independently verified unrelated before this
plan began (no Phase 180 plan modifies the permissions package, the migrations package, the
Phase-128/134 repository test fixtures, or the Jellyfin-audit fixture tests). The remaining
backend packages (`internal/handlers` minus the three pre-existing Jellyfin-fixture tests above,
`internal/services` minus the one pre-existing permission-cache item above,
`internal/testquality`, `internal/testsupport`, `internal/auth`, `internal/badges`,
`internal/config`, `internal/jellyfin`, `internal/middleware`, `internal/models`,
`internal/observability`, `internal/permissions`) all pass. `go build ./...` is clean.
`npm --prefix frontend run lint` has 4 pre-existing errors (two `no-require-imports` errors in
`frontend/capture-responsive.cjs`, predating Phase 180 since August 2026; one React Compiler
"Compilation Skipped" diagnostic in `useReleaseVersionMedia.ts`; one
`react/no-unescaped-entities` in `CapabilityDetailRow.tsx`) — none newly introduced by this
phase, all already called out in this plan's execution context.
