---
phase: 165-library-discovery-assisted-anime-creation
plan: 17
subsystem: api
tags: [go, gin, pgx, postgres, jellyfin, anime-source-links, next.js, react]

requires:
  - phase: 165-07
    provides: connectJellyfinFolderAdditively / RemoveAnimeJellyfinFolder (D-05/D-16/D-18/D-21)
  - phase: 165-13
    provides: AniSearchDuplicateDecision / ForceNew duplicate-decision UI (D-02/D-23), later superseded by D-30
provides:
  - connect-flag-driven connectJellyfinFolderAdditively (GAP-05: additive-vs-force-write no longer
    sniffs the "anisearch:" source prefix)
  - audit write gated on connect (GAP-13: routine edit-page resync writes zero jellyfin_discovery.connected entries)
  - ownership-conflict-aware LinkAdditionalJellyfinSource (GAP-10: repository.ErrConflict instead of a
    silent ON CONFLICT DO NOTHING no-op), mapped to HTTP 409 with existing_anime_id/existing_title
  - testsupport.OpenPhase165Postgres real-Postgres fixture (anime/anime_source_links stand-ins,
    TEAM4S_PHASE165_TEST_DSN-gated) — reused by the downstream 165-18 plan
  - AniSearchDuplicateDecision sends connect:true and navigates away from the stale create draft after
    a successful "Verbinden" (GAP-12), preserving a validated ?return= discovery link
affects: [165-18, jellyfin-source-folder-management, admin-anime-create]

tech-stack:
  added: []
  patterns:
    - "explicit boolean intent signal (connect) replacing string-prefix sniffing as an additive-vs-force-write decision input"
    - "RowsAffected()==0 follow-up SELECT inside the same tx to disambiguate idempotent retry from a real ownership conflict"
    - "phaseNNN_postgres.go real-Postgres fixture pattern (DSN-gated, isolated schema, minimal stand-in tables) applied to Phase 165"

key-files:
  created:
    - backend/internal/testsupport/phase165_postgres.go
    - backend/internal/testsupport/phase165_postgres_test.go
    - backend/internal/handlers/jellyfin_source_folder_management_integration_test.go
  modified:
    - backend/internal/handlers/jellyfin_source_folder_management.go
    - backend/internal/handlers/jellyfin_source_folder_management_test.go
    - backend/internal/handlers/jellyfin_metadata_resync.go
    - backend/internal/handlers/admin_content_handler_deps.go
    - backend/internal/repository/anime_source_links.go
    - frontend/src/types/admin.ts
    - frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.tsx
    - frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.test.tsx

key-decisions:
  - "additive := connect && currentSource != \"\" replaces strings.HasPrefix(currentSource, \"anisearch:\") entirely -- the connect flag, set only by the discovery-duplicate 'Verbinden' caller, is now the sole signal for both additive-vs-force-write AND audit-vs-no-audit."
  - "linkAdditionalJellyfinSource's zero-RowsAffected case is resolved via a same-anime-vs-different-anime follow-up SELECT inside the same transaction, not a second round-trip -- idempotent re-link stays a no-op success, a genuine different-anime conflict becomes repository.ErrConflict."
  - "writeJellyfinFolderOwnershipConflict was placed in jellyfin_source_folder_management.go, not jellyfin_metadata_resync.go, to avoid growing an already-over-450-line file further (see Deviations)."

patterns-established:
  - "nil-means-false boolean request fields for explicit-intent signals (Connect *bool, matching the existing Apply* field convention)"

requirements-completed: [REQ-165-05, REQ-165-20, REQ-165-11]

duration: 70min
completed: 2026-09-22
---

# Phase 165 Plan 17: Harden the additive-connect code path Summary

**connect-flag-driven `connectJellyfinFolderAdditively` replaces "anisearch:"-prefix sniffing, closing GAP-05 (silent source overwrite), GAP-13 (spurious audit writes), GAP-10 (silent ownership-conflict no-op → now HTTP 409), and GAP-12 (no post-connect navigation) — proven against real Postgres, not just fakes.**

## Performance

- **Duration:** ~70 min
- **Completed:** 2026-09-22T11:36:45Z
- **Tasks:** 3 (all `type="auto" tdd="true"`)
- **Files modified:** 11 (8 modified, 3 created)

## Accomplishments

- `connectJellyfinFolderAdditively` takes an explicit `connect bool` parameter; `additive := connect && currentSource != ""` fully replaces the old `strings.HasPrefix(currentSource, "anisearch:")` heuristic that silently force-overwrote `anime.source`/`folder_name` whenever an anime's existing source was `jellyfin:<A>` (the normal shape for Jellyfin-originated anime) — the literal GAP-05 bug.
- The `jellyfin_discovery.connected` audit write is now gated on `connect`, so the routine edit-page "Jellyfin-Metadaten anwenden" resync (which never sends `connect`) writes zero audit entries (GAP-13).
- `linkAdditionalJellyfinSource` checks `RowsAffected()` after the `ON CONFLICT (source) DO NOTHING` insert; on zero rows it runs a same-transaction follow-up `SELECT anime_id` to distinguish an idempotent same-anime retry (still a no-op success) from a genuine different-anime ownership conflict, which now returns `repository.ErrConflict` instead of silently reporting success (GAP-10).
- `ApplyAnimeMetadataFromJellyfin` maps a propagated `ErrConflict` to HTTP 409 with `existing_anime_id`/`existing_title` sourced from a fresh `FindAnimeBySource` lookup on the same `jellyfin:<id>` tag, with a generic-message fallback if that lookup itself fails or returns nil — never a false 200, never an unrelated 500.
- `AniSearchDuplicateDecision.handleConnect` now sends `connect: true` and, on success, navigates the admin off the stale create draft to `conflict.redirectPath`, appending a `?return=` suffix only when `isValidDiscoveryReturnURL` (reused verbatim from `DiscoveryReturnLink.tsx`) accepts the current `return` query param (GAP-12).
- New `testsupport.OpenPhase165Postgres` real-Postgres fixture (minimal `anime`/`anime_source_links` stand-ins matching the real `0047` migration, including the global `UNIQUE(source)` constraint) proves GAP-05 and GAP-10 against actual Postgres `ON CONFLICT`/`RowsAffected` semantics — closing the exact blind spot ("fake-repo-only tests hid both bugs") the plan's own objective called out. Verified passing against a real isolated `team4s_phase165_test_1` database on the `team4s_default` docker network, including a full-HTTP-chain proof (real repo + mocked Jellyfin upstream, routed through the actual `ApplyAnimeMetadataFromJellyfin` handler via `httptest`) asserting the real 409 response body.

## Task Commits

Each task was committed atomically:

1. **Task 1: connect-flag-driven additive decision, gated audit, ownership-conflict propagation (fake-repo tests)** - `2db32bb9` (fix)
2. **Task 2: real-Postgres integration tests for GAP-05 and GAP-10** - `07e349d5` (test)
3. **Task 3: frontend — send connect:true, navigate away after a successful "Verbinden" (GAP-12)** - `fdb62f25` (fix)

## Files Created/Modified

- `backend/internal/handlers/jellyfin_source_folder_management.go` - `connectJellyfinFolderAdditively` connect-flag rewrite; new `writeJellyfinFolderOwnershipConflict` 409-response helper (GAP-10 HTTP surface)
- `backend/internal/handlers/jellyfin_source_folder_management_test.go` - renamed/rewritten Tests A/B for the connect-driven decision; new Tests E/F/G for GAP-13/GAP-10 (fake-repo)
- `backend/internal/handlers/jellyfin_metadata_resync.go` - `Connect *bool` request field; call-site now passes `connect` and branches to 409 on `ErrConflict`
- `backend/internal/handlers/admin_content_handler_deps.go` - `jellyfinFolderManagementRepository` gains `FindAnimeBySource`
- `backend/internal/repository/anime_source_links.go` - `linkAdditionalJellyfinSource` RowsAffected/ownership-conflict logic
- `backend/internal/testsupport/phase165_postgres.go` - new real-Postgres fixture (`OpenPhase165Postgres`)
- `backend/internal/testsupport/phase165_postgres_test.go` - DSN/schema/database-name guard tests
- `backend/internal/handlers/jellyfin_source_folder_management_integration_test.go` - the two real-Postgres GAP-05/GAP-10 proofs, including the full-HTTP-chain 409 test
- `frontend/src/types/admin.ts` - `AdminAnimeJellyfinMetadataApplyRequest.connect?: boolean`
- `frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.tsx` - `handleConnect` sends `connect: true` and navigates on success
- `frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.test.tsx` - updated connect-payload assertion; 3 new navigation tests (absent/valid/invalid `return`)

## Decisions Made

- Placed the new ownership-conflict HTTP-response helper (`writeJellyfinFolderOwnershipConflict`) in `jellyfin_source_folder_management.go` rather than `jellyfin_metadata_resync.go`, to avoid growing an already-over-the-450-line-limit file (`jellyfin_metadata_resync.go` was already 620 lines before this plan, a pre-existing violation from before 165-17 — see Deviations).
- Task 1's "Test G" (handler-level GAP-10 HTTP proof, originally specified as routed through the fake-repo-backed `ApplyAnimeMetadataFromJellyfin`) targets the new `writeJellyfinFolderOwnershipConflict` response-writing code directly via a real `httptest` recorder + gin context, rather than the full HTTP handler chain: `AdminContentHandler.repo` is a concrete `*repository.AdminContentRepository` (not an interface), so `GetAnimeSyncSource` cannot be faked without a live database — the literal full-chain proof through `ApplyAnimeMetadataFromJellyfin` is Task 2's real-Postgres `...OwnershipConflictReturns409NoAudit` test instead (real repo, mocked Jellyfin upstream, real `httptest` request/response).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — pre-existing CLAUDE.md 450-line violation, minimized rather than expanded] `jellyfin_metadata_resync.go` growth kept to the minimum unavoidable for this plan's mandated call-site change**
- **Found during:** Task 1
- **Issue:** `jellyfin_metadata_resync.go` was already 620 lines before this plan (over CLAUDE.md's 450-line production-file limit), a pre-existing condition from before 165-17 (165-07's own header comment in the sibling file already documents this file was "already 627 lines" at that point). The plan's own interfaces section mandates editing this exact file's request struct and call site.
- **Fix:** Added only the minimum necessary lines here (the `Connect *bool` field, the `connect := ...` line, and the `ErrConflict` branch calling out to a helper) and placed the larger new `writeJellyfinFolderOwnershipConflict` response-building function in the sibling `jellyfin_source_folder_management.go` (212 lines, well under the limit) instead of growing the already-over-limit file further. Net growth: 620 → 629 lines.
- **Files modified:** `backend/internal/handlers/jellyfin_metadata_resync.go`, `backend/internal/handlers/jellyfin_source_folder_management.go`
- **Verification:** `go build`/`go vet` clean; full handler test suite passes.
- **Committed in:** `2db32bb9`
- **Not fixed (out of scope):** A full split/refactor of `jellyfin_metadata_resync.go` back under 450 lines was not attempted — that is a pre-existing debt unrelated to this plan's narrow GAP-05/GAP-10/GAP-12/GAP-13 scope, and restructuring an unrelated 600+ line file risks destabilizing passing tests outside this plan's review. Flagging for a future dedicated cleanup plan.

---

**Total deviations:** 1 auto-fixed (Rule 2, scope-minimized rather than scope-expanded)
**Impact on plan:** No scope creep; the one deviation is a deliberate minimization of an unavoidable pre-existing-file-limit interaction, not new functionality.

## Issues Encountered

- `frontend`/`backend` containers do not live-mount source from the host (`docker-compose.yml` has no source volumes for either service) — `go build`/`go test` were run via a scratch `golang:1.25-alpine` container with the repo bind-mounted (module/build caches persisted under `/tmp/gomodcache`/`/tmp/gocache` for speed), and real-Postgres integration tests were run on the `team4s_default` docker network against a dedicated `team4s_phase165_test_1` database (created via `docker exec team4sv30-db psql ... CREATE DATABASE`) rather than `team4s_v2`. Frontend tests/typecheck/lint were run inside the already-running `team4sv30-frontend` container per the operational constraints (that container IS the dev server with live-reloading source, confirmed by the edited test file's new test count showing up immediately).
- `npx tsc --noEmit` initially failed on a stale Next.js dev-server-generated `.next/dev/types/app/admin/anime/create/page.ts` artifact (unrelated to any file this plan touches — it re-typechecks `page.tsx`'s pre-existing named test-only export `buildCreateSuccessMessage` against Next's App Router route-export allowlist, the same recurring artifact class documented in STATE.md's 164-07 entry). Removed the stale generated file (regenerates automatically on next dev-server request) and reran; typecheck was clean.
- Backend rebuild (`docker compose up -d --build team4sv30-backend`) and `docker restart team4sv30-frontend` both completed successfully; `curl http://192.168.235.196:18092/health` → `{"status":"ok"}`, `curl http://192.168.235.196:3000/` → `200`.

## Tests Run (exact names/packages, PASS/FAIL)

All runs used `golang:1.25-alpine` (backend, repo bind-mounted, module cache warmed) or the live `team4sv30-frontend` container (frontend, per operational constraints). Real-Postgres runs used `TEAM4S_PHASE165_TEST_DSN=postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase165_test_1?sslmode=disable` on the `team4s_default` network.

### Backend — Go, package `team4s.v3/backend/internal/handlers`

| Test | Result |
|---|---|
| `TestConnectJellyfinFolderAdditively_AlwaysAdditiveWhenConnecting` (2 subtests) | PASS |
| `TestConnectJellyfinFolderAdditively_UsesForceWritePathWhenNotConnecting` (2 subtests) | PASS |
| `TestConnectJellyfinFolderAdditively_HandlesFolderRenameAsPlainSecondInsert` | PASS |
| `TestConnectJellyfinFolderAdditively_WritesAuditEntry` | PASS |
| `TestConnectJellyfinFolderAdditively_NoAuditWhenNotConnecting` | PASS |
| `TestConnectJellyfinFolderAdditively_OwnershipConflictReturnsErrorNoAudit` | PASS |
| `TestApplyAnimeMetadataFromJellyfin_OwnershipConflictReturns409NotInternalError` | PASS |
| `TestApplyAnimeMetadataFromJellyfin_OwnershipConflictFallsBackWhenLookupFails` | PASS |
| `TestBuildAnimeJellyfinContext_ListsAllConnectedFoldersWithMainFlag` | PASS |
| `TestRemoveAnimeJellyfinFolder_*` (5 tests, pre-existing, unmodified) | PASS |
| `TestPhase165Postgres_ConnectJellyfinFolderAdditively_JellyfinMainSourceStaysAdditive` | PASS (real Postgres) |
| `TestPhase165Postgres_ConnectJellyfinFolderAdditively_OwnershipConflictReturns409NoAudit` | PASS (real Postgres, incl. full HTTP chain) |
| `TestPhase165Postgres_ConnectJellyfinFolderAdditively_*` (both, `TEAM4S_PHASE165_TEST_DSN=""`) | SKIP (clean skip verified) |
| Full `./internal/handlers/...` suite (`go test ./internal/handlers/...`) | PASS (ok) |

### Backend — Go, package `team4s.v3/backend/internal/testsupport`

| Test | Result |
|---|---|
| `TestPhase165DatabaseGuard` | PASS |
| `TestPhase165SchemaValidation` | PASS |
| `TestPhase165DSNEnvironmentNameIsDedicated` | PASS |
| `TestPhase165DSNSelectionIgnoresDatabaseURL` | PASS (subtest correctly SKIPs without opening a connection) |

### Backend — build/vet

- `go build ./...` — clean (no errors)
- `go vet ./...` — clean (no errors)
- `grep -n "HasPrefix(currentSource" backend/internal/handlers/jellyfin_source_folder_management.go` — no matches (old heuristic fully removed)

### Backend — pre-existing, unrelated failures (baseline noise, NOT caused by this plan)

`go test ./internal/repository/...` (full package) has ~48 pre-existing failures unrelated to this plan's files (`TestPhase134Matrix*`, `TestGetOwnDashboardPostgres*`, `TestLoadContributionBadges*`, `TestArchive*`, `TestMemberClaims*`, `TestMemberPointTotals*`, `TestRoleCapabilityDefaultsSnapshotMigration*`, `TestV12StatusFoundation*`, etc.) — all require either a live Keycloak/backend network endpoint (`192.168.235.196:18093`, connection refused in the scratch container) or dedicated per-phase `TEAM4S_PHASE*_TEST_DSN` env vars not set in this ad-hoc run. None touch `anime_source_links.go`, the jellyfin handlers, or any file this plan modifies. `TestAnimeSourceLinks_DatabaseNameGuardRejectsTeam4sV2` and the `anime_source_links_test.go` Postgres tests (gated on the pre-existing `TEAM4S_ANIME_SOURCE_LINKS_TEST_DSN`) pass/skip cleanly, confirming this plan's own `anime_source_links.go` change is not implicated.

### Frontend — Vitest, inside `team4sv30-frontend`

| Test file | Result |
|---|---|
| `src/app/admin/anime/create/AniSearchDuplicateDecision.test.tsx` (8 tests) | PASS |
| Full `src/app/admin/anime/create` suite (14 files, 162 tests) | PASS |

### Frontend — typecheck/lint

- `npx tsc --noEmit` — clean (after removing one stale, unrelated `.next/dev/types` artifact — see Issues Encountered)
- `npx eslint` on the 3 touched frontend files — clean (0 errors, 0 warnings)

## User Setup Required

None - no external service configuration required. `TEAM4S_PHASE165_TEST_DSN` is a Postgres integration-test-only env var (not needed for normal dev/runtime); the dedicated `team4s_phase165_test_1` database created for this session's verification lives outside `team4s_v2` and is safe to reuse by the downstream 165-18 plan (which reuses `testsupport.OpenPhase165Postgres` per its own plan).

## Next Phase Readiness

- `connectJellyfinFolderAdditively`, `LinkAdditionalJellyfinSource`, `anime_source_links.go`, `admin_content_handler_deps.go`/`admin_content_handler.go` family, `AniSearchDuplicateDecision.tsx`, and `frontend/src/types/admin.ts` are all in a clean, fully-committed, build/test-passing state for 165-18 to build on top of.
- 165-18 explicitly reuses `testsupport.OpenPhase165Postgres` (created here) unmodified — confirmed the fixture's `anime`/`anime_source_links` stand-in tables are sufficient for 165-18's own save-time-duplicate-guard tests per its own plan text.
- No blockers. The backend container was rebuilt (`docker compose up -d --build team4sv30-backend`) and the frontend container restarted (`docker restart team4sv30-frontend`); both respond 200/`{"status":"ok"}`.

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-22*

## Self-Check: PASSED

All 11 created/modified files found on disk; all 3 task commit hashes (`2db32bb9`, `07e349d5`, `fdb62f25`) found in `git log`.
