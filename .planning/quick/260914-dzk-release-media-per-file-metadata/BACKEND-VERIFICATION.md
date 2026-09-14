# Backend verification — quick 260914-dzk

## Delivered

Nullable title on release_version_media through additive migration0163 (maximum200 Unicode characters), independent from caption. Missing PATCH leaves unchanged; null/trimmed empty clears. Shared nullable-string parser, German type/length errors. Admin list/PATCH/replace, public release initial/cursor images, group release media, project-member media, member recent media and existing latest-contribution JSON title all preserve separate title/caption semantics. No filename-derived titles or caption backfill.

Existing preview clear+set now serializes on the release_versions row. Both PATCH and replacement call this seam before media-row writes, preserving a consistent version-before-media lock order. No unique-index/data-reconciliation side effects.

## Passing focused gate

Ran against final canonical host backend read-only bind-mounted at /app in the disposable Docker Go runner team4s-quick-dzk-final-go. A distinct PostgreSQL16 container team4s-quick-dzk-final-db used tmpfs, no published ports and dedicated database team4s_phase107_test_dzk; each test additionally received a random isolated schema through existing testsupport.OpenPhase107Postgres. No application DB, rows or media files were used.

Final canonical-state command (2026-09-14, exit0; Go container memory1400MiB, GOMEMLIMIT800MiB, GOMAXPROCS2, PostgreSQL384MiB; no concurrent build/test):

```sh
docker exec -e 'TEAM4S_PHASE107_TEST_DSN=postgres://postgres@team4s-quick-dzk-final-db:5432/team4s_phase107_test_dzk?sslmode=disable' team4s-quick-dzk-final-go go test -p 1 ./internal/handlers ./internal/repository -run 'RVMTitle|ReleaseVersionMediaTitle|PreviewSerializes' -count=1 -json
```

6 top-level tests plus13 subcases passed:
- TestRVMTitleParser:9 cases (missing/null/empty, number/bool/object,200/201 Unicodecharacters, trimming and independent caption).
- TestRVMTitlePatchPersistsIndependentMetadata: real upload+PATCH+reload; null/empty/absent semantics, invalid types/length, separate caption, stale-revision409 rollback.
- TestRVMTitleReplacePreservesAndEditsMetadata:4 real multipart cases (missing preserves, changed, overlong400 unchanged, empty clears).
- TestReleaseVersionMediaTitleMigrationRoundTrip: actual0163 up/down/up within isolated schema,200char accepted/201rejected, caption remains, no backfill.
- TestReleaseVersionMediaPreviewSerializesConcurrentChoices: two overlapping transactions must serialize and end with exactly one explicitly chosen preview.
- TestReleaseVersionMediaTitlePublicProjections: real queries prove title and description independently through all6 direct public read paths with existing visibility gates.

Final result against all final canonical changes:19 test/subtest PASS,0FAIL,0SKIP;13.26seconds including compilation. Actual migration up/down/up, final INSERT ordering, metadata PATCH/replace and public projections are covered. Reproducible resource-bounded runner: run_backend_focused.py. Machine-readable evidence: backend-focused-final.json and backend-focused-final.jsonl. Both final test containers were removed by verified exact IDs in the runner cleanup.

## Broader gate and environment limitation

Broad command selected RVM|ReleaseVersionMedia|PublicRelease|ProjectMember|MemberProfile across handlers/repository/models with dedicated phase107+phase128 DSNs. The VM exhausted available memory/swap under concurrent frontend/browser/Go work and SSH temporarily stopped responding. Parent stopped the owned Go runner; subprocess exited137 without test events. This is an interrupted broad check, not a passing broad suite. The final focused gate was subsequently rerun successfully with strict memory/concurrency limits as documented above. The earlier exploratory broad log contained a now-fixed replacement-test fixture mistake and an unset mandatory phase128DSN; it is not final evidence. The empty final JSONL was removed.

Both exact owned containers were checked by recorded IDs then removed after SSH recovered. No application service restart, live migration application, persisted application rows or media originals were modified by this executor. Docker Compose watch syncs canonical backend into runtime /app automatically; container edits are not authoritative and canonical gofmt ran through the mounted disposable runner.

## Activation handoff (parent only)

Current dev wiring: docker-compose.override.yml uses develop.watch sync ./backend->/app plus Air; database/migrations bind at /app/database/migrations and /database/migrations. Verify canonical/runtime source hashes before trusting Air results.

```sh
cd /home/d1sk/team4s
docker compose exec -T team4sv30-backend go run ./cmd/migrate status -dir /app/database/migrations
# Only after confirming0163 is the sole pending migration and reviewing the diff:
docker compose exec -T team4sv30-backend go run ./cmd/migrate up -dir /app/database/migrations
```

Do not restart blindly: startup applies every pending migration. No .env edit, credential output, DB reset/reseed or backfill needed. HumanUAT remains open.

## Preserved pre-existing limitation

member_profile_recent_repository.go uses its existing app-user comparison against release_version_media.uploaded_by_user_id, whereas newer project-member/latest-contribution readers resolve legacy IDs. This ownership difference predates this task and is unchanged; the focused public-projection test explicitly documents the overlapping synthetic IDs needed to exercise that existing recent-media scan. No ownership correction was mixed into the title task.
