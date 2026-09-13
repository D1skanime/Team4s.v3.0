# Plan 159-01 verification evidence

The repository RED/GREEN tests used an isolated `postgres:16` tmpfs container (`team4s-phase15901-test`), no host ports, database `team4s_phase117_test_p159`. The tests call `testsupport.OpenPhase117Postgres`, which validates the explicit `TEAM4S_PHASE117_TEST_DSN`, creates a unique schema/search_path and cleans only that schema. No application `DATABASE_URL` was read or used. Extra fixture schema/identity defaults exist only inside each isolated schema.

Backend source was copied from canonical Linux `backend/` to the running backend container's `/app/tmp/phase15901/backend`, excluding `.env`, `media` and `tmp`. Canonical `database/migrations` was copied to `/app/tmp/phase15901/database/migrations`, the existing helper's expected relative location. Air excludes `tmp`; incomplete source did not affect the live API. The initial missing parent migrations directory was corrected before `red-repository.log`; the initial aggregate log is retained as evidence, not treated as a successful SQL run.

Executed in that scratch workdir, with the isolated DSN:

```text
go test ./internal/repository ./internal/handlers -run 'Test.*(EpisodeVersionPublic|ScanEpisodeVersion|ListReleaseVariants)' -count=1 -v
go vet ./internal/repository ./internal/handlers ./internal/models
go build ./...
```

The final backend log includes all eight top-level tests, strict malformed/scope/duplicate-option cases, real group/stream/collision/assignment fixtures, full Get/Create/Update hydration and counts-only arrays. PgX traces report actual returned rows for both statements. These are returned-row budgets, not claims that PostgreSQL scans only 101 storage rows internally. Complete per-episode counts are computed before LIMIT. Payload bytes describe these fixtures only, not a universal size cap or the pre-existing AnimeDetail fallback list.

Frontend commands ran in `docker compose exec -T team4sv30-frontend`: targeted Vitest files shown in the logs, `npm run typecheck`, and `npx --no-install eslint` on the six changed TypeScript files. `js-yaml` (already installed) parses the canonical OpenAPI. No Node or dependencies were installed on Ubuntu. ANSI escapes and whitespace (tab indentation/trailing blank lines) were normalized in saved transcripts; test output content is otherwise retained.

The owned test container (exact ID in `verification.json`) was stopped and auto-removed; `/app/tmp/phase15901` was removed after verifying its resolved exact path. A subsequent check found neither. Root owns `../root-runtime-sync-15901.json`: one finished tarstream, five matching source hashes, one current Air child, and HTTP 200/610 bytes for the real public request. No container restart, startup migration, live DB edit or push occurred.
