# Deferred Items — Phase 182

Items discovered during 182-01 verification that are pre-existing and unrelated to
this phase's scope (legacy `hasV2AssetSchema` removal in `anime_assets*.go`). Not
fixed here per the Scope Boundary rule.

## 182-01 (`go test ./internal/repository/...` full-suite run)

Confirmed via a throwaway baseline worktree (commit `957daf57a`, pre-182-01) that the
following full-suite failures are byte-for-byte identical before and after this
plan's changes — i.e. they are pre-existing environment gaps, not regressions:

- ~40 tests across `member_archive_repository_test.go`, `member_point_totals_repository_test.go`,
  `member_profile_contribution_badges_repository_test.go`, `member_profile_own_dashboard_*`,
  `member_profile_public_access_repository_test.go`, `phase128_*`,
  `phase134_verification_matrix_*`, `release_review_query_repository_test.go`
  (`TestPhase141RevokedDelegationImmediateEffect`) — all require additional
  `TEAM4S_PHASE128_TEST_DSN`/live-network/fixture inputs not available in this
  session's sandboxed `docker compose exec` environment, and most `t.Fatalf`
  instead of `t.Skipf` when their specific env var is unset (a pre-existing test
  design inconsistency, not introduced by 182-01).
- `go test ./internal/handlers/...`: `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`,
  `Test11eyesSourceSelection_AllActualItemsAndPermutations`,
  `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery` fail on
  `open ../../../docs/audits/2026-09-15-jellyfin12/fixtures/*.json: no such file or
  directory` — a missing fixture-file path unrelated to `anime_assets*.go`.

None of the above reference `anime_assets*.go`, `hasV2AssetSchema`,
`hasAnimeMediaTable`, or `ensureAnimeMediaAsset`. The plan's actual required
verification command (`go build ./... && go vet ./internal/repository/... && go test
./internal/repository/... -run 'TestGetResolvedAssetsV2|TestGetByIDV2' -v`) passes
cleanly, and both named tests additionally pass against a real Postgres fixture
(`team4s_phase106_test_173`), not just a clean skip.
